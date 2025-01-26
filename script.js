let oscilloscopeWidth = 400
let oscilloscopeHeight = 100

let oscilloscope = document.getElementsByClassName("oscilloscope")[0]

let playingVolume = 0
let playingEnvelopeAttack = 0.02
let playingEnvelopeRelease = 0.1
let playingEnvelopeState = "steady"

var oscillators = []
var connections = [] 
var effects = []

var connectionePartyDeviceIdsCache = []
var connectionPartyNamesCache = []

var lastDeviceId = 0

function getUnscaledSliderValue(value) {
	return value / 1000
}

function getScaledFrequency(value) {
	const top = 500
	const bottom = 0
	return value * (top - bottom) + bottom
}

const onFrequencySliderChange = (event) => {
	frequency = getUnscaledSliderValue(event.target.value)
	updateOscilloscope()
}

const onAmplitudeSliderChange = (event) => {
	amplitude = getUnscaledSliderValue(event.target.value)
	updateOscilloscope()
}

function calculateBuffer(length, scale) {
	let outputBuffer = []

	for (let i = 0; i < oscillators.length; i++) {
		oscillators[i].timedSignalX = 0
	}

	var connectionsIndexMapped = []
	for (let i = 0; i < connections.length; i++) {
		const source = connections[i].source
		const destination = connections[i].destination
		if (source == 0 || destination == 0) {
			continue
		}

		// TODO: get rid of this (It should be 0 as above)
		if (source == "-" || destination == "-") {
			continue
		}

		if (connections[i].destinationParameter == "-") {
			continue
		}

		const sourceIndex = connectionePartyDeviceIdsCache.findIndex((id) => id === source)
		const destinationIndex = connectionePartyDeviceIdsCache.findIndex((id) => id === destination)
		connectionsIndexMapped.push({
			source: sourceIndex,
			destination: destinationIndex,
			amount: connections[i].amount,
			destinationParameter: connections[i].destinationParameter
		})
	}

	var mainBusLastSignal = 0

	for (let i = 0; i < length; i++) {
		let output = 0
		let mainBusNewSignal = 0

		var modulatedDevices = []
		for (let deviceIndex = 0; deviceIndex < connectionePartyDeviceIdsCache.length; deviceIndex++) {
			const device = getConnectionPartyDeviceWithId(connectionePartyDeviceIdsCache[deviceIndex])
			const copiedDevice = {
				...device
			}

			if (device["inputValue"]) {
				copiedDevice["inputValue"] = 0
			}

			if (device["mainBus"] == true && outputBuffer.length > 0) {
				copiedDevice["inputValue"] = mainBusLastSignal
			}

			modulatedDevices.push(copiedDevice)
		}

		for (let connectionIndex = 0; connectionIndex < connectionsIndexMapped.length; connectionIndex++) {
			const source = connections[connectionIndex].source
			const destination = connections[connectionIndex].destination
			const destinationIndex = modulatedDevices.findIndex((device) => {

				// TODO: (Along with other places) make this able to work with a ===.
				return device.id == destination
			})
			const amount = connections[connectionIndex].amount
			const destinationParameter = connections[connectionIndex].destinationParameter

			const sourceDevice = getConnectionPartyDeviceWithId(source)
			const previousValue = sourceDevice.previousValue 

			const parameterValue = modulatedDevices[destinationIndex][destinationParameter]
			modulatedDevices[destinationIndex][destinationParameter] += previousValue * amount

			const newValue = modulatedDevices[destinationIndex][destinationParameter]
		}
		
		for (let deviceIndex = 0; deviceIndex < modulatedDevices.length; deviceIndex++) {
			const device = getConnectionPartyDeviceWithId(connectionePartyDeviceIdsCache[deviceIndex])
			
			if (device.type == "oscillator") {
				const x = modulatedDevices[deviceIndex].timedSignalX
				const amplitude = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].amplitude));
				const frequency = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].frequency));
				const frequencyScaled = getScaledFrequency(frequency)

				const signal = Math.sin(x * Math.PI * 2) * amplitude
				setPropertyOfConnectionPartyDeviceWithId(connectionePartyDeviceIdsCache[deviceIndex], "previousValue", signal)

				if (device.mainOutput) {
					output += signal
					mainBusNewSignal += signal
				}

				setPropertyOfConnectionPartyDeviceWithId(connectionePartyDeviceIdsCache[deviceIndex], "timedSignalX", device.timedSignalX + frequencyScaled / scale)
			} else if (device.type == "distortion") {
				const amount = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].amount))
				const scaledAmount = amount * 20

				const inputValue = modulatedDevices[deviceIndex]["inputValue"]

				const clip = 0.8
				const signal = Math.max(-clip, Math.min(clip, inputValue * scaledAmount))
				setPropertyOfConnectionPartyDeviceWithId(connectionePartyDeviceIdsCache[deviceIndex], "previousValue", signal)

				if (device.mainOutput) {
					output += signal
				}
			}
		}

		mainBusLastSignal = mainBusNewSignal

		outputBuffer.push(output)
	}

	return outputBuffer
}

function updateOscilloscope() {
	oscilloscope.innerHTML = ""

	let oscillatorWidthsPerSecond = 50
	let pixelsPerSecond = oscillatorWidthsPerSecond * oscilloscopeWidth
	let outputBuffer = calculateBuffer(oscilloscopeWidth, pixelsPerSecond)

	for (let i = 0; i < oscilloscopeWidth; i++) {
		let line = document.createElement("div")
		let height = ((outputBuffer[i] + 1) / 2) * oscilloscopeHeight
		let clippedHeight = Math.min(oscilloscopeHeight, Math.max(0, height))
		line.style.height = clippedHeight + 'px'
		line.style.position = "absolute"
		line.style.bottom = "0px"
		line.style.left = i.toString() + 'px'
		line.style.width = "1px"
		line.style.backgroundColor = "green"
	
		oscilloscope.appendChild(line)
	}
}

function onKeyDown(event) {
	playingEnvelopeState = "attack"
	play()
}

function play() {
	const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

	const volume = 1;
	const volumeSafeScale = 0.1;
	const safetyHardClip = 1;
	const duration = 1;
	const sampleRate = audioCtx.sampleRate;
	const length = sampleRate * duration;

	const buffer = audioCtx.createBuffer(1, length, sampleRate);

	const data = buffer.getChannelData(0);

	const calculatedBuffer = calculateBuffer(length, sampleRate)

	for (let i = 0; i < length; i++) {
		let releaseScaled = playingEnvelopeRelease * sampleRate
		if (i >= length - releaseScaled) {
			playingEnvelopeState = "release"
		}

		if (playingEnvelopeState === "attack") {
			playingVolume += 1 / (sampleRate * playingEnvelopeAttack)
		} else if (playingEnvelopeState === "release") {
			playingVolume -= 1 / (sampleRate * playingEnvelopeRelease)
		}
		if (playingVolume <= 0) {
			playingVolume = 0
			playingEnvelopeState = "steady"
		} else if (playingVolume >= 1) {
			playingVolume = 1
			playingEnvelopeState = "steady"
		}

		data[i] = Math.max(-safetyHardClip, Math.min(safetyHardClip, calculatedBuffer[i] * volume * playingVolume * volumeSafeScale));
	}

	const source = audioCtx.createBufferSource();
	source.buffer = buffer;

	source.connect(audioCtx.destination);

	source.start(audioCtx.currentTime);
}

function addOscillator() {
	const oscillatorNumber = oscillators.length + 1
	const sliderDefaultViewValue = 500
	const id = generateNewDeviceId()

	const oscillatorModel = {
		id: id,
		type: "oscillator",
		frequency: getUnscaledSliderValue(sliderDefaultViewValue),
		amplitude: getUnscaledSliderValue(sliderDefaultViewValue),
		mainOutput: true,
		timedSignalX: 0,
		previousValue: 0
	}

	oscillators.push(oscillatorModel)

	const oscillatorsView = document.getElementById("oscillators");
	
	const oscillator = document.createElement("div");
	oscillator.classList.add("oscillator");

	const oscillatorTitle = document.createElement("div");
	oscillatorTitle.innerHTML = "Oscillator " + oscillatorNumber;
	oscillatorTitle.classList.add("device-title");
	oscillatorTitle.classList.add("oscillator-title");
	oscillatorTitle.classList.add("text");
	oscillator.appendChild(oscillatorTitle);

	const frequencyText = document.createElement("div");
	frequencyText.innerHTML = "Frequency";
	frequencyText.classList.add("text");
	const frequencyInput = document.createElement("input");
	frequencyInput.type = "range";
	frequencyInput.min = 0;
	frequencyInput.max = 1000;
	frequencyInput.value = sliderDefaultViewValue;
	oscillator.appendChild(frequencyText);
	oscillator.appendChild(frequencyInput);

	const amplitudeText = document.createElement("div");
	amplitudeText.innerHTML = "Amplitude";
	amplitudeText.classList.add("text");
	const amplitudeInput = document.createElement("input");
	amplitudeInput.type = "range";
	amplitudeInput.min = 0;
	amplitudeInput.max = 1000;
	amplitudeInput.value = sliderDefaultViewValue;
	oscillator.appendChild(amplitudeText);
	oscillator.appendChild(amplitudeInput);

	oscillatorsView.appendChild(oscillator);

	frequencyInput.addEventListener("input", (event) => {
		const index = findOscillatorIndexById(id)
		oscillators[index].frequency = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})

	amplitudeInput.addEventListener("input", (event) => {
		const index = findOscillatorIndexById(id)
		oscillators[index].amplitude = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})

	const mainOutputSection = document.createElement("div");
	mainOutputSection.classList.add("main-output-section");
	oscillator.appendChild(mainOutputSection)

	const mainOutputButton = document.createElement("div");
	mainOutputButton.innerHTML = "Main Output";
	mainOutputButton.classList.add("main-output-button");
	mainOutputButton.classList.add("text");
	mainOutputButton.addEventListener("click", () => {
		const index = findOscillatorIndexById(id)
		oscillators[index].mainOutput = !oscillators[index].mainOutput;
		const ledViews = document.getElementsByClassName("main-output-led")
		const ledView = ledViews[index]
		ledView.style.backgroundColor = oscillators[index].mainOutput ? "#1aff3d" : "#aaaaaa"
		updateOscilloscope()
	})
	mainOutputSection.appendChild(mainOutputButton)

	const mainOutputLED = document.createElement("div");
	mainOutputLED.classList.add("main-output-led");
	mainOutputSection.appendChild(mainOutputLED)

	const deleteButton = document.createElement("div");
	deleteButton.innerHTML = "x";
	deleteButton.classList.add("delete-button");
	deleteButton.addEventListener("click", () => {
		const index = findOscillatorIndexById(id)
		oscillators.splice(index, 1)
		updateConnectionPartyCaches()
		oscillatorsView.removeChild(oscillator)
		updateConnectionsFromRemovingDeviceWithId(id)
		updateDropDowns()
		updateOscilloscope()
		updateOscillatorTitles()
	})
	oscillator.appendChild(deleteButton)

	updateConnectionPartyCaches()
	updateDropDowns()
}

function updateOscillatorTitles() {
	const oscillatorTitles = document.getElementsByClassName("oscillator-title")
	for (let i = 0; i < oscillatorTitles.length; i++) {
		oscillatorTitles[i].innerHTML = "Oscillator " + (i + 1)
	}
}

function findOscillatorIndexById(id) {
	return oscillators.findIndex((oscillator) => oscillator.id === id)
}

function addConnection() {
	const id = generateNewDeviceId()
	const sliderDefaultViewValue = 500
	var connectionModel = {
		id: id,
		source: "-",
		destination: "-",
		amount: getUnscaledSliderValue(sliderDefaultViewValue),
		destinationParameter: "-"
	}

	connections.push(connectionModel)

	const connctionsView = document.getElementById("connections");

	const connection = document.createElement("div");
	connection.classList.add("connection");

	const connectionText = document.createElement("div");
	connectionText.innerHTML = "Connection";
	connectionText.classList.add("device-title");
	connectionText.classList.add("text");
	connection.appendChild(connectionText);

	const pairRow = document.createElement("div");
	pairRow.classList.add("pair-row");
	connection.appendChild(pairRow);

	const sourceSection = document.createElement("div");
	sourceSection.classList.add("source-section");
	pairRow.appendChild(sourceSection);

	const sourceTitle = document.createElement("div");
	sourceTitle.innerHTML = "From:";
	sourceTitle.classList.add("text");
	sourceSection.appendChild(sourceTitle);

	const sourceSelector = document.createElement("select");
	sourceSelector.classList.add("source-selector");
	sourceSection.appendChild(sourceSelector);

	const destinationSection = document.createElement("div");
	destinationSection.classList.add("destination-section");
	pairRow.appendChild(destinationSection);

	const destinationOscillatorSection = document.createElement("div");
	destinationOscillatorSection.classList.add("destination-oscillator-section");
	destinationSection.appendChild(destinationOscillatorSection);

	const destinationTitle = document.createElement("div");
	destinationTitle.innerHTML = "To:";
	destinationTitle.classList.add("text");
	destinationOscillatorSection.appendChild(destinationTitle);
	const destinationSelector = document.createElement("select");
	destinationSelector.classList.add("destination-selector");
	destinationOscillatorSection.appendChild(destinationSelector);

	const destinationParameterSection = document.createElement("div");
	destinationParameterSection.classList.add("destination-parameter-section");
	destinationSection.appendChild(destinationParameterSection);

	const destinationParameterTitle = document.createElement("div");
	destinationParameterTitle.innerHTML = "Param:";
	destinationParameterTitle.classList.add("text");
	destinationParameterSection.appendChild(destinationParameterTitle);
	const destinationParameterSelector = document.createElement("select");
	destinationParameterSelector.classList.add("destination-parameter-selector");
	destinationParameterSection.appendChild(destinationParameterSelector);

	const amountControl = document.createElement("input");
	amountControl.type = "range";
	amountControl.min = 0;
	amountControl.max = 1000;
	amountControl.value = sliderDefaultViewValue;

	connection.appendChild(amountControl);

	const deleteButton = document.createElement("div");
	deleteButton.innerHTML = "x";
	deleteButton.classList.add("delete-button");
	deleteButton.addEventListener("click", () => {
		connections.splice(findConnectionIndexById(id), 1)
		connctionsView.removeChild(connection)
		updateOscilloscope()
	})
	connection.appendChild(deleteButton)

	sourceSelector.addEventListener("input", (event) => {
		const index = findConnectionIndexById(id)
		connections[index].source = event.target.value
		updateOscilloscope()
	})

	destinationSelector.addEventListener("input", (event) => {
		const index = findConnectionIndexById(id)
		connections[index].destination = event.target.value
		updateParameterDropDown(index)
		updateOscilloscope()
	})

	destinationParameterSelector.addEventListener("input", (event) => {
		const index = findConnectionIndexById(id)
		connections[index].destinationParameter = event.target.value
		updateOscilloscope()
	})

	amountControl.addEventListener("input", (event) => {
		const index = findConnectionIndexById(id)
		connections[index].amount = getUnscaledSliderValue(event.target.value);
		updateOscilloscope()
	})

	connctionsView.appendChild(connection);

	updateConnectionPartyCaches()

	const index = connections.length - 1
	updateDropDown(index)
	
	sourceSelector.value = 0
	destinationSelector.value = 0
}

function addDistortion() {
	let id = generateNewDeviceId();
	let sliderDefaultViewValue = 500
	let effectModel = {
		id: id,
		type: "distortion",
		amount: getUnscaledSliderValue(sliderDefaultViewValue),
		mainBus: false,
		mainOutput: true,
		inputValue: 0,
		previousValue: 0
	}
	effects.push(effectModel)

	const effectsView = document.getElementById("effects");
	const effectView = document.createElement("div");
	effectView.classList.add("effect");
	
	const effectTitle = document.createElement("div");
	effectTitle.innerHTML = "Distortion";
	effectTitle.classList.add("device-title");
	effectTitle.classList.add("text");
	effectView.appendChild(effectTitle);

	const amountSection = document.createElement("div");
	amountSection.classList.add("amount-section");
	effectView.appendChild(amountSection);

	const amountControl = document.createElement("input");
	amountControl.type = "range";
	amountControl.min = 0;
	amountControl.max = 1000;
	amountControl.value = sliderDefaultViewValue;
	amountControl.classList.add("distortion-amount-control");
	amountControl.addEventListener("input", (event) => {
		const index = findEffectIndexById(id)
		effects[index].amount = getUnscaledSliderValue(event.target.value);
		updateOscilloscope()
	})

	amountSection.appendChild(amountControl);

	const routingSection = document.createElement("div");
	routingSection.classList.add("routing-section");
	effectView.appendChild(routingSection);

	const mainBusSection = document.createElement("div");
	mainBusSection.classList.add("main-bus-section");
	/* 
	 * Disabled for now. For this to be useful, it should disable the ordinary (bypassed) signal
	 * and allow for reordering of effects.
	 */
	//routingSection.appendChild(mainBusSection);

	const mainBusButton = document.createElement("div");
	mainBusButton.innerHTML = "Main Bus";
	mainBusButton.classList.add("main-bus-button");
	mainBusButton.classList.add("text");
	mainBusButton.addEventListener("click", () => {
		const index = findEffectIndexById(id)
		effects[index].mainBus = !effects[index].mainBus;
		const ledViews = document.getElementsByClassName("main-bus-led")
		const ledView = ledViews[index]
		ledView.style.backgroundColor = effects[index].mainBus ? "#1aff3d" : "#aaaaaa"
		updateConnectionPartyCaches()
		updateDropDowns()
		updateOscilloscope()
	})
	mainBusSection.appendChild(mainBusButton)

	const mainBusLED = document.createElement("div");
	mainBusLED.classList.add("main-bus-led");
	mainBusSection.appendChild(mainBusLED)

	const mainOutputSection = document.createElement("div");
	mainOutputSection.classList.add("main-output-section");

	const mainOutputButton = document.createElement("div");
	mainOutputButton.innerHTML = "Main Output";
	mainOutputButton.classList.add("main-output-button");
	mainOutputButton.classList.add("text");
	mainOutputButton.addEventListener("click", () => {
		const index = findEffectIndexById(id)
		effects[index].mainOutput = !effects[index].mainOutput;
		const ledViews = document.getElementsByClassName("effects-main-output-led")
		const ledView = ledViews[index]
		ledView.style.backgroundColor = effects[index].mainOutput ? "#1aff3d" : "#aaaaaa"
		updateOscilloscope()
	})
	mainOutputSection.appendChild(mainOutputButton)

	const mainOutputLED = document.createElement("div");
	mainOutputLED.classList.add("effects-main-output-led");
	mainOutputSection.appendChild(mainOutputLED)

	routingSection.appendChild(mainOutputSection)

	const deleteButton = document.createElement("div");
	deleteButton.innerHTML = "x";
	deleteButton.classList.add("delete-button");
	deleteButton.addEventListener("click", () => {
		const index = findEffectIndexById(id)
		effectsView.removeChild(effectView)
		effects.splice(index, 1)
		updateConnectionPartyCaches()
		updateConnectionsFromRemovingDeviceWithId(id)
		updateDropDowns()
		updateOscilloscope()
	})
	effectView.appendChild(deleteButton)

	effectsView.appendChild(effectView);

	updateConnectionPartyCaches()
	updateDropDowns()
}

function findConnectionIndexById(id) {
	return connections.findIndex((connection) => connection.id === id)
}

function findEffectIndexById(id) {
	return effects.findIndex((effect) => effect.id === id)
}

function setTab(tabIndex) {
	const tabs = document.getElementsByClassName("tab");
	for (let i = 0; i < tabs.length; i++) {
		tabs[i].style.display = "none"
	}

	let tab = null
	if (tabIndex == 0) {
		tab = document.getElementById("oscillators");
	} else if (tabIndex == 1) {
		tab = document.getElementById("connections");
	} else if (tabIndex == 2) {
		tab = document.getElementById("effects");
	}

	tab.style.display = "flex"
}

function updateConnectionsFromRemovingDeviceWithId(id) {
	/* Update the source and destination selectors such that their 
	* new number corresponds to the new oscillator number */
	
	const sourceSelectors = document.getElementsByClassName("source-selector")
	const destinationSelectors = document.getElementsByClassName("destination-selector")

	for (let i = 0; i < sourceSelectors.length; i++) {
		const sourceSelector = sourceSelectors[i]
		const destinationSelector = destinationSelectors[i]

		if (sourceSelector.value == id) {
			sourceSelector.value = 0
			connections[i].source = 0
		}

		if (destinationSelector.value == id) {
			destinationSelector.value = 0
			connections[i].destination = 0
		}
	}
}

function updateDropDown(i) {
	const sourceSelectors = document.getElementsByClassName("source-selector")
	const destinationSelectors = document.getElementsByClassName("destination-selector")

	const sourceSelector = sourceSelectors[i]
	const destinationSelector = destinationSelectors[i]

	// Remember selected value
	const sourceSelectedValue = sourceSelector.value
	const destinationSelectedValue = destinationSelector.value

	sourceSelector.innerHTML = ""
	destinationSelector.innerHTML = ""

	// Add default no-selection value
	const sourceOption = document.createElement("option");
	sourceOption.text = "-";
	sourceOption.value = 0;
	sourceSelector.appendChild(sourceOption);

	const destinationOption = document.createElement("option");
	destinationOption.text = "-";
	destinationOption.value = 0;
	destinationSelector.appendChild(destinationOption);

	connectionPartyNamesCache.forEach((name, i) => {
		const id = connectionePartyDeviceIdsCache[i]
		const sourceOption = document.createElement("option");
		sourceOption.text = name;
		sourceOption.value = id;
		sourceSelector.appendChild(sourceOption);

		const destinationOption = document.createElement("option");
		destinationOption.text = name;
		destinationOption.value = id;
		destinationSelector.appendChild(destinationOption);
	})


	// Restore selected value
	sourceSelector.value = sourceSelectedValue
	destinationSelector.value = destinationSelectedValue

	updateParameterDropDown(i)
}

function updateDropDowns() {
	const sourceSelectors = document.getElementsByClassName("source-selector")

	for (let i = 0; i < sourceSelectors.length; i++) {
		updateDropDown(i)
	}
}

function updateParameterDropDown(i) {
	const destinationParameterSelectors = document.getElementsByClassName("destination-parameter-selector")
	const destinationParameterSelector = destinationParameterSelectors[i]
		
	destinationParameterSelector.innerHTML = ""
	const connection = connections[i]
	const destinationId = connection.destination

	// TODO: it shouldn't be "-", it should be 0
	if (destinationId === 0 || destinationId === "-") {
		return
	}

	const destinationIndex = connectionePartyDeviceIdsCache.findIndex((id) => id === destinationId)
	const destination = getConnectionPartyDeviceWithId(destinationId)
	
	var modulatableParameters = []
	var titles = []
	if (destination.type == "oscillator") {
		modulatableParameters = ["frequency", "amplitude"]
		titles = ["Frequency", "Amplitude"]
	} else if (destination.type == "distortion") {
		modulatableParameters = ["inputValue", "amount"]
		titles = ["Input", "Amount"]
	}

	for (let i = 0; i < modulatableParameters.length; i++) {
		const destinationParameterOption = document.createElement("option");
		destinationParameterOption.text = titles[i];
		destinationParameterOption.value = modulatableParameters[i];
		destinationParameterSelector.appendChild(destinationParameterOption);
	}

	if (modulatableParameters.includes(connections[i].destinationParameter)) {
		destinationParameterSelector.value = connections[i].destinationParameter
	} else {
		connections[i].destinationParameter = destinationParameterSelector.value
	}
}

function onAddOscillatorClicked() {
	addOscillator()
	updateOscilloscope()
}

function onAddConnectionClicked() {
	addConnection()
	updateOscilloscope()
}

function onAddDistortionClicked() {
	addDistortion()
	updateOscilloscope()
}

function onTabClicked(tabIndex) {
	setTab(tabIndex)
}

function generateNewDeviceId() {
	var newDeviceId = lastDeviceId + 1
	lastDeviceId = newDeviceId
	return newDeviceId
}

function updateConnectionPartyCaches() {
	const oscillatorIds = oscillators.map((oscillator) => oscillator.id)
	const effectIds = effects.map((effect) => effect.id)
	connectionePartyDeviceIdsCache = oscillatorIds.concat(effectIds)
	connectionPartyNamesCache = oscillators.map((_, index) => "Oscillator " + (index + 1)).concat(effects.map((_, index) => "Effect " + (index + 1)))
}

function getConnectionPartyDeviceWithId(id) {
	const oscillator = oscillators.find((oscillator) =>  {
			let idMatch = oscillator.id == id
			return idMatch
	})
	if (oscillator) {
		return oscillator
	}

	const effect = effects.find((effect) => effect.id == id)
	if (effect) {
		return effect
	}

	return null
}

function setPropertyOfConnectionPartyDeviceWithId(id, property, value) {
	const oscillator = oscillators.find((oscillator) => oscillator.id === id)
	if (oscillator) {
		oscillator[property] = value
		return
	}

	const effect = effects.find((effect) => effect.id === id)
	if (effect) {
		effect[property] = value
		return
	}
}

addOscillator()
addConnection()
setTab(0)
updateOscilloscope()