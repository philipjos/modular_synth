let oscilloscopeWidth = 500
let oscilloscopeHeight = 100

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

var frequencyScalableParameterType = new ScalableParameter(0.5, 0, 500)
var amplitudeScalableParameterType = new ScalableParameter(0.5, 0, 1)
var phaseScalableParameterType = new ScalableParameter(0.5, 0, 1)
var shapeScalableParameterType = new ScalableParameter(0.5, 0, 2)
var partialsScalableParameterType = new ScalableParameter(0.5, 1, 31)
var syncScalableParameterType = new ScalableParameter(0.5, 1, 16)

const phaseSliderDefaultViewValue = 0
const partialsSliderDefaultViewValue = 1000
const syncSliderDefaultValue = 0
const shapeSliderDefaultValue = 0

const rateSliderDefaultValue = 1000
const sliderDefaultViewValue = 500 

var mainVolume = 0.25;
var mainVolumeScalableParameterType = new ScalableParameter(0.25, 0, 1)

// Noise oscillator
var rateScalableParameterType = new ScalableParameter(0.5, 0, 1)

// Connection
var connectionAmountScalableParameterType = new ScalableParameter(0.5, 0, 1)

// Distortion
var distortionAmountScalableParameterType = new ScalableParameter(0.5, 0, 1)

const oscilloscope = new Oscilloscope(oscilloscopeWidth, oscilloscopeHeight)
const oscilloscopeContainer = document.getElementById("oscilloscope-container")

function getUnscaledSliderValue(value) {
	return value / 1000
}

function getScaledFrequency(value) {
	const top = 500
	const bottom = 0
	return value * (top - bottom) + bottom
}

function getScaledShape(value) {
	const top = 2
	const bottom = 0
	const bottomAndOne = bottom - 1
	var ceiled = Math.ceil(value * (top - bottomAndOne) + bottomAndOne)
	return Math.max(ceiled, bottom)
}

function getScaledPartials(value) {
	const top = 31
	const bottom = 1
	return Math.floor(value * (top - bottom) + bottom)
}

function getScaledSync(value) {
	const top = 16
	const bottom = 1
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

const modulatableParametersForType = (type) => {
	if (type == "oscillator") {
		return [
			{
				name: "frequency",
				title: "Frequency",
			},
			{
				name: "amplitude",
				title: "Amplitude",
			},
			{
				name: "phase",
				title: "Phase",
			},
			{
				name: "shape",
				title: "Shape",
			},
			{
				name: "partials",
				title: "Partials",
			},
			{
				name: "sync",
				title: "Sync",
			}
		]
	} else if (type == "noise") {
		return [
			{
				name: "rate",
				title: "Rate",
			},
			{
				name: "amplitude",
				title: "Amplitude",
			}
		]
	} else if (type == "distortion") {
		return [
			{
				name: "amount",
				title: "Amount",
			}
		]
	}
}
				

function calculateBuffer(length, scale) {
	let outputBuffer = []

	for (let i = 0; i < oscillators.length; i++) {
		oscillators[i].timedSignalX = 0
		oscillators[i].syncTimedSignalX = 0
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
				const syncX = modulatedDevices[deviceIndex].syncTimedSignalX
				const amplitude = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].amplitude));
				const frequency = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].frequency));
				const frequencyScaled = getScaledFrequency(frequency)
				const phase = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].phase))
				const shape = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].shape))
				const scaledShape = getScaledShape(shape)
				const partials = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].partials))
				const partialsScaled = getScaledPartials(partials)
				const sync = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].sync))
				const scaledSync = getScaledSync(sync)

				var signal = 0

				for (let partial = 1; partial <= partialsScaled; partial++) {
					var partialFrequency = 0;
					var partialAmplitude = 0;

					if (scaledShape == 0) {
						partialFrequency = partial
						partialAmplitude = 2 / (Math.PI * partial)
					} else if (scaledShape == 1) {
						partialFrequency = partial * 2 - 1
						partialAmplitude = 4 / (Math.PI * partialFrequency)
					} else if (scaledShape == 2) {
						partialFrequency = partial * 2 - 1
						partialAmplitude = -8 * Math.pow(-1, partial) / (Math.pow(Math.PI, 2) * Math.pow(partialFrequency, 2))
					}

					signal += Math.sin((syncX + phase) * Math.PI * 2 * partialFrequency) * partialAmplitude * amplitude
				}

				setPropertyOfConnectionPartyDeviceWithId(connectionePartyDeviceIdsCache[deviceIndex], "previousValue", signal)

				if (device.mainOutput) {
					output += signal
					mainBusNewSignal += signal
				}

				var timedSignalXNewValue = device.timedSignalX + frequencyScaled / scale
				const syncFrequency = frequencyScaled * scaledSync
				var syncTimedSignalXNewValue = device.syncTimedSignalX + syncFrequency / scale

				
				if (timedSignalXNewValue >= 1) {
					timedSignalXNewValue = 0
					syncTimedSignalXNewValue = 0
				}

				setPropertyOfConnectionPartyDeviceWithId(connectionePartyDeviceIdsCache[deviceIndex], "timedSignalX", timedSignalXNewValue)
				setPropertyOfConnectionPartyDeviceWithId(connectionePartyDeviceIdsCache[deviceIndex], "syncTimedSignalX", syncTimedSignalXNewValue)
			} else if (device.type == "noise") {
				var timedSignalX = modulatedDevices[deviceIndex].timedSignalX
				const rate = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].rate))
				const scaledRate = rate * 20000
				const amplitude = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].amplitude))

				var signal = modulatedDevices[deviceIndex].previousValue

				
				if (timedSignalX >= 1) {
					timedSignalX = 0
					signal = (Math.random() * 2 - 1) * amplitude
				}
				
				var timedSignalXNewValue = timedSignalX + scaledRate / scale
				setPropertyOfConnectionPartyDeviceWithId(connectionePartyDeviceIdsCache[deviceIndex], "timedSignalX", timedSignalXNewValue)
				setPropertyOfConnectionPartyDeviceWithId(connectionePartyDeviceIdsCache[deviceIndex], "previousValue", signal)

				if (device.mainOutput) {
					output += signal
				}

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
	let oscillatorWidthsPerSecond = 50
	let pixelsPerSecond = oscillatorWidthsPerSecond * oscilloscopeWidth
	let outputBuffer = calculateBuffer(oscilloscopeWidth, pixelsPerSecond)

	oscilloscope.updateFromBuffer(outputBuffer)
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

		data[i] = Math.max(
			-safetyHardClip, 
			Math.min(
				safetyHardClip, 
				calculatedBuffer[i] * volume * playingVolume * volumeSafeScale * mainVolume
			)
		);
	}

	const source = audioCtx.createBufferSource();
	source.buffer = buffer;

	source.connect(audioCtx.destination);

	source.start(audioCtx.currentTime);
}

function addOscillatorViewFromModel(model) {
	const id = model.id
	const name = model.name
	const oscillatorsView = document.getElementById("oscillators");
	
	const oscillator = document.createElement("div");
	oscillator.classList.add("oscillator");

	const oscillatorTitle = document.createElement("div");
	oscillatorTitle.innerHTML = name;
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
	frequencyInput.style.marginBottom = "20px";
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
	amplitudeInput.style.marginBottom = "20px";
	oscillator.appendChild(amplitudeText);
	oscillator.appendChild(amplitudeInput);

	const phaseText = document.createElement("div");
	phaseText.innerHTML = "Phase";
	phaseText.classList.add("text");
	const phaseInput = document.createElement("input");
	phaseInput.type = "range";
	phaseInput.min = 0;
	phaseInput.max = 1000;
	phaseInput.value = phaseSliderDefaultViewValue;
	phaseInput.style.marginBottom = "20px";
	oscillator.appendChild(phaseText);
	oscillator.appendChild(phaseInput);

	const shapeText = document.createElement("div");
	shapeText.innerHTML = "Shape";
	shapeText.classList.add("text");
	const shapeInput = document.createElement("input");
	shapeInput.type = "range";
	shapeInput.min = 0;
	shapeInput.max = 1000;
	shapeInput.value = shapeSliderDefaultValue;
	shapeInput.style.marginBottom = "20px";
	oscillator.appendChild(shapeText);
	oscillator.appendChild(shapeInput);

	const partialsText = document.createElement("div");
	partialsText.innerHTML = "Partials";
	partialsText.classList.add("text");
	const partialsInput = document.createElement("input");
	partialsInput.type = "range";
	partialsInput.min = 0;
	partialsInput.max = 1000;
	partialsInput.value = partialsSliderDefaultViewValue;
	partialsInput.style.marginBottom = "20px";
	oscillator.appendChild(partialsText);
	oscillator.appendChild(partialsInput);

	const syncText = document.createElement("div");
	syncText.innerHTML = "Sync";
	syncText.classList.add("text");
	const syncInput = document.createElement("input");
	syncInput.type = "range";
	syncInput.min = 0;
	syncInput.max = 1000;
	syncInput.value = syncSliderDefaultValue;
	syncInput.style.marginBottom = "20px";
	oscillator.appendChild(syncText);
	oscillator.appendChild(syncInput);

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
	
	phaseInput.addEventListener("input", (event) => {
		const index = findOscillatorIndexById(id)
		oscillators[index].phase = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})

	shapeInput.addEventListener("input", (event) => {
		const index = findOscillatorIndexById(id)
		oscillators[index].shape = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})

	partialsInput.addEventListener("input", (event) => {
		const index = findOscillatorIndexById(id)
		oscillators[index].partials = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})

	syncInput.addEventListener("input", (event) => {
		const index = findOscillatorIndexById(id)
		oscillators[index].sync = getUnscaledSliderValue(event.target.value)
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
		ledView.style.backgroundColor = oscillators[index].mainOutput ? "#19F1FF" : "#aaaaaa"
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
	})
	oscillator.appendChild(deleteButton)

	updateConnectionPartyCaches()
	updateDropDowns()
}

function addOscillator() {
	const oscillatorNumber = oscillators.filter((oscillator) => oscillator.type == "oscillator").length + 1
	const name = "Oscillator " + oscillatorNumber
	const id = generateNewDeviceId()

	const oscillatorModel = {
		id: id,
		name: name,
		type: "oscillator",
		frequency: getUnscaledSliderValue(sliderDefaultViewValue),
		amplitude: getUnscaledSliderValue(sliderDefaultViewValue),
		phase: getUnscaledSliderValue(phaseSliderDefaultViewValue),
		shape: getUnscaledSliderValue(shapeSliderDefaultValue),
		partials: getUnscaledSliderValue(partialsSliderDefaultViewValue),
		sync: getUnscaledSliderValue(syncSliderDefaultValue),
		mainOutput: true,
		timedSignalX: 0,
		syncTimedSignalX: 0,
		previousValue: 0
	}

	oscillators.push(oscillatorModel)
	addOscillatorViewFromModel(oscillatorModel)
}

function findOscillatorIndexById(id) {
	return oscillators.findIndex((oscillator) => oscillator.id === id)
}

function addConnectionViewFromModel(model) {
	const id = model.id
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

	const index = findConnectionIndexById(id)
	updateDropDown(index)
	
	sourceSelector.value = 0
	destinationSelector.value = 0
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
	addConnectionViewFromModel(connectionModel)
}

const addNoiseViewFromModel = (model) => {
	const id = model.id
	const name = model.name

	const oscillatorsView = document.getElementById("oscillators");
	
	const noiseOscillator = document.createElement("div");
	noiseOscillator.classList.add("oscillator");

	const noiseOscillatorTitle = document.createElement("div");
	noiseOscillatorTitle.innerHTML = name;
	noiseOscillatorTitle.classList.add("device-title");
	noiseOscillatorTitle.classList.add("oscillator-title");
	noiseOscillatorTitle.classList.add("text");
	noiseOscillator.appendChild(noiseOscillatorTitle);

	const rateText = document.createElement("div");
	rateText.innerHTML = "Rate";
	rateText.classList.add("text");
	const rateInput = document.createElement("input");
	rateInput.type = "range";
	rateInput.min = 0;
	rateInput.max = 1000;
	rateInput.value = rateSliderDefaultValue;
	rateInput.style.marginBottom = "20px";
	noiseOscillator.appendChild(rateText);
	noiseOscillator.appendChild(rateInput);

	const amplitudeText = document.createElement("div");
	amplitudeText.innerHTML = "Amplitude";
	amplitudeText.classList.add("text");
	const amplitudeInput = document.createElement("input");
	amplitudeInput.type = "range";
	amplitudeInput.min = 0;
	amplitudeInput.max = 1000;
	amplitudeInput.value = sliderDefaultViewValue;
	amplitudeInput.style.marginBottom = "20px";
	noiseOscillator.appendChild(amplitudeText);
	noiseOscillator.appendChild(amplitudeInput);

	oscillatorsView.appendChild(noiseOscillator);

	rateInput.addEventListener("input", (event) => {
		const index = findOscillatorIndexById(id)
		oscillators[index].rate = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})

	amplitudeInput.addEventListener("input", (event) => {
		const index = findOscillatorIndexById(id)
		oscillators[index].amplitude = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})

	const mainOutputSection = document.createElement("div");
	mainOutputSection.classList.add("main-output-section");
	noiseOscillator.appendChild(mainOutputSection)

	const mainOutputButton = document.createElement("div");
	mainOutputButton.innerHTML = "Main Output";
	mainOutputButton.classList.add("main-output-button");
	mainOutputButton.classList.add("text");
	mainOutputButton.addEventListener("click", () => {
		const index = findOscillatorIndexById(id)
		oscillators[index].mainOutput = !oscillators[index].mainOutput;
		const ledViews = document.getElementsByClassName("main-output-led")
		const ledView = ledViews[index]
		ledView.style.backgroundColor = oscillators[index].mainOutput ? "#19F1FF" : "#aaaaaa"
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
		oscillatorsView.removeChild(noiseOscillator)
		updateConnectionsFromRemovingDeviceWithId(id)
		updateDropDowns()
		updateOscilloscope()
	})
	noiseOscillator.appendChild(deleteButton)

	updateConnectionPartyCaches()
	updateDropDowns()
}

function addNoise() {
	const noiseOscillatorNumber = oscillators.filter((oscillator) => oscillator.type === "noise").length + 1
	const name = "Noise oscillator " + noiseOscillatorNumber

	const id = generateNewDeviceId()

	const noiseModel = {
		id: id,
		name: name,
		type: "noise",
		rate: getUnscaledSliderValue(rateSliderDefaultValue),
		amplitude: getUnscaledSliderValue(sliderDefaultViewValue),
		mainOutput: true,
		timedSignalX: 0,
		previousValue: 0
	}

	oscillators.push(noiseModel)
	addNoiseViewFromModel(noiseModel)
}

function addDistortionViewFromModel(model) {
	const id = model.id;
	const name = model.name;
	const effectsView = document.getElementById("effects");
	const effectView = document.createElement("div");
	effectView.classList.add("effect");
	
	const effectTitle = document.createElement("div");
	effectTitle.innerHTML = name;
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
		ledView.style.backgroundColor = effects[index].mainBus ? "#19F1FF" : "#aaaaaa"
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
		ledView.style.backgroundColor = effects[index].mainOutput ? "#19F1FF" : "#aaaaaa"
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

function addDistortion() {
	let id = generateNewDeviceId();
	let nameNumber = effects.filter((effect) => effect.type === "distortion").length + 1;
	let name = "Distortion " + nameNumber;
	let sliderDefaultViewValue = 500
	let effectModel = {
		id: id,
		type: "distortion",
		name: name,
		amount: getUnscaledSliderValue(sliderDefaultViewValue),
		mainBus: false,
		mainOutput: true,
		inputValue: 0,
		previousValue: 0
	}
	effects.push(effectModel)

	addDistortionViewFromModel(effectModel)
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
		modulatableParameters = [
			"frequency",
			"amplitude",
			"phase",
			"shape",
			"partials",
			"sync"
		]

		titles = [
			"Frequency", 
			"Amplitude",
			"Phase",
			"Shape",
			"Partials",
			"Sync"
		]
	} else if (destination.type == "noise") {
		modulatableParameters = ["rate", "amplitude"]
		titles = ["Rate", "Amplitude"]
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

function onAddNoiseClicked() {
	addNoise();
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
	connectionPartyNamesCache = oscillators.map((oscillator) => oscillator.name)
		.concat(effects.map((_, index) => "Effect " + (index + 1)))
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

const updateControlViews = () => {
	for (let i = 0; i < oscillators.length; i++) {
		const oscillator = oscillators[i]
		const oscillatorView = document.getElementsByClassName("oscillator")[i]

		if (oscillator.type == "oscillator") {
			const frequencyInput = oscillatorView.getElementsByTagName("input")[0]
			const amplitudeInput = oscillatorView.getElementsByTagName("input")[1]
			const phaseInput = oscillatorView.getElementsByTagName("input")[2]
			const shapeInput = oscillatorView.getElementsByTagName("input")[3]
			const partialsInput = oscillatorView.getElementsByTagName("input")[4]
			const syncInput = oscillatorView.getElementsByTagName("input")[5]
			const mainOutputLED = oscillatorView.getElementsByClassName("main-output-led")[0]

			frequencyInput.value = frequencyScalableParameterType.getSliderForUnscaledValue(oscillator.frequency)
			amplitudeInput.value = amplitudeScalableParameterType.getSliderForUnscaledValue(oscillator.amplitude)
			phaseInput.value = phaseScalableParameterType.getSliderForUnscaledValue(oscillator.phase)
			shapeInput.value = shapeScalableParameterType.getSliderForUnscaledValue(oscillator.shape)
			partialsInput.value = partialsScalableParameterType.getSliderForUnscaledValue(oscillator.partials)
			syncInput.value = syncScalableParameterType.getSliderForUnscaledValue(oscillator.sync)

			// TODO: Make DRY
			mainOutputLED.style.backgroundColor = oscillator.mainOutput ? "#19F1FF" : "#aaaaaa"
		} else if (oscillator.type == "noise") {
			const rateInput = oscillatorView.getElementsByTagName("input")[0]
			const amplitudeInput = oscillatorView.getElementsByTagName("input")[1]
			const mainOutputLED = oscillatorView.getElementsByClassName("main-output-led")[0]

			rateInput.value = rateScalableParameterType.getSliderForUnscaledValue(oscillator.rate)
			amplitudeInput.value = amplitudeScalableParameterType.getSliderForUnscaledValue(oscillator.amplitude)
			mainOutputLED.style.backgroundColor = oscillator.mainOutput ? "#19F1FF" : "#aaaaaa"
		}
	}
	
	for (let i = 0; i < connections.length; i++) {
		const connection = connections[i]
		const connectionView = document.getElementsByClassName("connection")[i]
		const amountInput = connectionView.getElementsByTagName("input")[0]
		
		amountInput.value = connectionAmountScalableParameterType.getSliderForUnscaledValue(connection.amount)
	}

	for (let i = 0; i < effects.length; i++) {
		const effect = effects[i]

		if (effect.type == "distortion") {
			const effectView = document.getElementsByClassName("effect")[i]
			const amountInput = effectView.getElementsByTagName("input")[0]
			
			amountInput.value = distortionAmountScalableParameterType.getSliderForUnscaledValue(effect.amount)

			const mainOutputLED = effectView.getElementsByClassName("effects-main-output-led")[0]
			mainOutputLED.style.backgroundColor = effect.mainOutput ? "#19F1FF" : "#aaaaaa"
		}
	}
}

async function saveFile(suggestedName, content) {
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: suggestedName,
            types: [
                {
                    description: 'JSON file',
                    accept: { 'application/json': ['.json'] }
                }
            ]
        });

        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
    } catch (err) {
        console.error('File save canceled or failed', err);
    }
}

const onSavePresetClicked = () => {
	const presetObject = {
		oscillators: oscillators,
		connections: connections,
		effects: effects
	}

	const presetString = JSON.stringify(presetObject)

	saveFile('modular_synth_preset.json', presetString);
}

const onLoadPresetClicked = () => {
	// Open file dialog
	const fileInput = document.createElement("input")
	fileInput.type = "file"
	fileInput.accept = ".json"
	fileInput.addEventListener("change", (event) => {
		const file = event.target.files[0]
		loadPreset(file)
	})

	// Trigger file dialog
	fileInput.click()
}

const onRandomPresetClicked = () => {
	var presetObject = {}

	var nextDeviceId = 1
	const safeLimit = 100
	var presetOscillators = []
	var oscillatorsDone = false
	var oscillatorCountForType = {}
	while (!oscillatorsDone && presetOscillators.length < safeLimit) {
		const types = ["oscillator", "noise"]
		const typeTitles = ["Oscillator", "Noise oscillator"]
		const typeIndex = Math.min(types.length - 1, Math.floor((Math.random() * types.length)))
		const type = types[typeIndex]
		const typeTitle = typeTitles[typeIndex]
		if (!oscillatorCountForType[type]) {
			oscillatorCountForType[type] = 0
		}
		const count = oscillatorCountForType[type]
		const nameNumber = count + 1
		const name = typeTitle + " " + nameNumber
		var oscillator = {}

		if (type == "oscillator") {
			oscillator = {
				id: nextDeviceId,
				name: name,
				type: type,
				frequency: Math.random(),
				amplitude: Math.random(),
				phase: Math.random(),
				shape: Math.random(),
				partials: Math.random(),
				sync: Math.random(),
				mainOutput: Math.random() >= 0.5,
				timedSignalX: 0,
				syncTimedSignalX: 0,
				previousValue: 0
			}
		} else if (type == "noise") {
			oscillator = {
				id: nextDeviceId,
				name: name,
				type: type,
				rate: Math.random(),
				amplitude: Math.random(),
				mainOutput: Math.random() >= 0.5,
				timedSignalX: 0,
				previousValue: 0
			}
		}
		
			
		presetOscillators.push(oscillator)
		oscillatorCountForType[type] += 1
		nextDeviceId += 1

		oscillatorsDone = (Math.random() <= 0.5)
	}

	var presetEffects = []
	var effectsDone = false
	var effectTypes = ["distortion"]
	var effectTypeTitles = ["Distortion"]
	var effectCountForType = {}
	while (!effectsDone && presetEffects.length < safeLimit) {
		const typeIndex = Math.min(effectTypes.length - 1, Math.floor((Math.random() * effectTypes.length)))
		const type = effectTypes[typeIndex]
		const typeTitle = effectTypeTitles[typeIndex]
		if (!effectCountForType[type]) {
			effectCountForType[type] = 0
		}
		const count = effectCountForType[type]
		const nameNumber = count + 1
		const name = typeTitle + " " + nameNumber

		var effect = {
			id: nextDeviceId,
			type: type,
			name: name,
			amount: Math.random(),
			mainBus: Math.random() >= 0.5,
			mainOutput: Math.random() >= 0.5,
			inputValue: 0,
			previousValue: 0
		}
		presetEffects.push(effect)
		effectCountForType[type] += 1
		nextDeviceId += 1

		effectsDone = Math.random() <= 0.5
	}

	var presetConnections = []
	var connectionsDone = false
	const deviceCount = presetOscillators.length + presetEffects.length
	while (!connectionsDone && presetConnections.length < safeLimit) {
		var sourceId = 0
		const sourceIdRandomVariable = Math.min(deviceCount - 1, Math.floor(Math.random() * deviceCount))
		if (sourceIdRandomVariable < presetOscillators.length) {
			sourceId = presetOscillators[sourceIdRandomVariable].id
		} else if (sourceIdRandomVariable <= deviceCount) {
			const index = sourceIdRandomVariable - presetOscillators.length
			sourceId = presetEffects[index].id
		}

		var destinationId = 0
		const destinationIdRandomVariable = Math.min(deviceCount - 1, Math.floor(Math.random() * deviceCount))
		if (destinationIdRandomVariable < presetOscillators.length) {
			destinationId = presetOscillators[destinationIdRandomVariable].id
		} else if (destinationIdRandomVariable <= deviceCount) {
			const index = destinationIdRandomVariable - presetOscillators.length
			destinationId = presetEffects[index].id
		}

		const presetDevices = presetOscillators.concat(presetEffects)
		const destinationType = presetDevices.find((device) => device.id === destinationId).type

		const amount = Math.random()
		const parameters = modulatableParametersForType(destinationType)
		const parameterIndex = Math.min(parameters.length - 1, Math.floor(Math.random() * parameters.length))
		const parameter = parameterIndex.toString()

		const connection = {
			id: nextDeviceId,
			source: sourceId,
			destination: destinationId,
			amount: amount,
			destinationParameter: parameter
		}
		presetConnections.push(connection)
		nextDeviceId += 1

		connectionsDone = Math.random() <= 0.5
	}

	presetObject.oscillators = presetOscillators
	presetObject.connections = presetConnections
	presetObject.effects = presetEffects

	setSynthFromPresetObject(presetObject)
}

const loadPreset = (presetFile) => {
	const reader = new FileReader()
	reader.onload = (event) => {
		const presetObject = JSON.parse(event.target.result)
		setSynthFromPresetObject(presetObject)
	}
	reader.readAsText(presetFile)
}

const setSynthFromPresetObject = (presetObject) => {
	oscillators = presetObject.oscillators

	const oscillatorsView = document.getElementById("oscillators")
	oscillatorsView.innerHTML = ""

	const effectsView = document.getElementById("effects")
	effectsView.innerHTML = ""

	const connectionsView = document.getElementById("connections")
	connectionsView.innerHTML = ""

	for (let i = 0; i < oscillators.length; i++) {
		const oscillator = oscillators[i]
		const type = oscillator.type
		if (type == "oscillator") {
			addOscillatorViewFromModel(oscillator)
		} else if (type == "noise") {
			addNoiseViewFromModel(oscillator)
		}
	}

	effects = presetObject.effects

	for (let i = 0; i < effects.length; i++) {
		if (effects[i].type == "distortion") {
			addDistortionViewFromModel(effects[i])
		}
	}

	connections = presetObject.connections
	for (let i = 0; i < connections.length; i++) {
		addConnectionViewFromModel(connections[i])
	}
	
	
	updateConnectionPartyCaches()
	updateDropDowns()
	updateConnectionDropdownSelectionsFromModel()
	updateOscilloscope()
	updateControlViews()
}

const updateConnectionDropdownSelectionsFromModel = () => {
	const sourceSelectors = document.getElementsByClassName("source-selector")
	const destinationSelectors = document.getElementsByClassName("destination-selector")
	const destinationParameterSelectors = document.getElementsByClassName("destination-parameter-selector")

	for (let i = 0; i < connections.length; i++) {
		const connection = connections[i]
		const sourceSelector = sourceSelectors[i]
		const destinationSelector = destinationSelectors[i]
		const destinationParameterSelector = destinationParameterSelectors[i]

		sourceSelector.value = connection.source
		destinationSelector.value = connection.destination
		destinationParameterSelector.value = connection.destinationParameter
	}
}

const updateMainVolumeSliderFromModel = () => {
	const mainVolumeSlider = document.getElementById("main-volume-slider")
	mainVolumeSlider.value = mainVolumeScalableParameterType.getSliderForUnscaledValue(mainVolume)
}

const onMainVolumeChanged = (event) => {
	mainVolume = getUnscaledSliderValue(event.target.value)
}

function main() {
	oscilloscope.appendToView(oscilloscopeContainer);
	updateMainVolumeSliderFromModel();
	addOscillator();
	addConnection();
	setTab(1);
	updateOscilloscope();
}

main()