let oscilloscopeWidth = 300
let oscilloscopeHeight = 100
let displayOffset = 0

let oscillatorWidthsPerSecond = 50
let pixelsPerSecond = oscillatorWidthsPerSecond * oscilloscopeWidth

let sliderResolution = 1000

let playingVolume = 0
let playingEnvelopeAttack = 0.02
let playingEnvelopeRelease = 0.1
let playingEnvelopeState = "steady"
const defaultDuration = 2
let durationScalableParameterType = new ScalableParameter(defaultDuration, 0.2, 10)
let duration = defaultDuration
let bounceSampleRate = 44100

const defaultMainVolume = 0.75
var mainVolume = defaultMainVolume;
var mainVolumeScalableParameterType = new ScalableParameter(defaultMainVolume, 0, 1)

var oscillators = []
var connections = []
var effects = []
var otherDevices = []


const oscilloscope = new Oscilloscope(oscilloscopeWidth, oscilloscopeHeight)
const oscilloscopeContainer = document.getElementById("oscilloscope-container")
const effectsView = document.getElementById("effects");
const connectionsView = document.getElementById("connections");
const oscillatorsView = document.getElementById("oscillators")
const otherDevicesView = document.getElementById("other-devices")

var dropdownStates = {}

var availablePinnedDevices = [Connection]
var availableOscillatos = [OscillatorProper, Noise]
var availableEffects = [Distortion, Delay, Volume, Syncifier, BitCrusher, PulseWidth, FrequencyFade, DeepDistortion]
var availableOtherDevices = [Envelope, EnvelopeFollower]

const objectIDManager = new ObjectIDManager()

function getUnscaledSliderValue(value) {
	return value / sliderResolution
}

function getScaledDurationValue(value) {
	return value 
			* 
			(durationScalableParameterType.max 
			- durationScalableParameterType.min
			)
			+ durationScalableParameterType.min
}

function getDurationSliderViewValue(scaledValue) {
	return (scaledValue - durationScalableParameterType.min) / (durationScalableParameterType.max - durationScalableParameterType.min) * sliderResolution
}

function updateDurationSliderFromModel() {
	const durationSlider = document.getElementById("duration-slider")
	durationSlider.value = getDurationSliderViewValue(duration)
}

function calculateBuffer(length, scale) {
	resetDevicesForBufferCalculation(scale)

	let outputBuffer_new = []

	const nonConnectionDevices = getNonConnectionDevices()
	for (let device of nonConnectionDevices) {
		device.resetTimedSignals()
		device.lastOutput = 0
	}

	for (let i = 0; i < length; i++) {
		let output_new = 0

		for (let device of nonConnectionDevices) {
			device.resetModulationDeltas()
		}
 
		for (let connection of connections) {
			if (connection.parameters["from"].getSelectedObject() != undefined
				&& connection.parameters["parameter"].getSelectedObject() != undefined) {
					
				const parameter = connection.parameters["parameter"].getSelectedObject()
				const lastValue = connection.parameters["from"].getSelectedObject().lastOutput
				const amount = parseFloat(connection.parameters["amount"].value)
				parameter.modulationDelta = parseFloat(parameter.modulationDelta) + lastValue * amount
			}
		}

        for (let device of nonConnectionDevices) {
			device.advanceTime(scale)

			if (device instanceof OutputDevice) {
				const deviceOutput = device.calculateOutput()
				const clippedDeviceOutput = Math.max(-1, Math.min(1, deviceOutput))
				device.lastOutput = clippedDeviceOutput

				if (device.goesToMainOutput) {
					output_new += clippedDeviceOutput
				}
			}

        }
        outputBuffer_new.push(output_new)
	}

	return outputBuffer_new
}

function updateDisplayOffset() {
	displayOffset = 0
	for (let device of getNonConnectionDevices()) {
		if (device.outputConnections > 0) {
			displayOffset = Math.max(displayOffset, device.getDisplayOffset())
		}
	}
}

function updateOscilloscope() {
	updateDisplayOffset()
	let outputBuffer = calculateBuffer(oscilloscopeWidth + displayOffset, pixelsPerSecond)
	outputBuffer = outputBuffer.slice(displayOffset)

	oscilloscope.updateFromBuffer(outputBuffer)
}

function onKeyDown(event) {
	if (!this.isPlaying) {
		this.isPlaying = true
		triggerPlay()
	}
}

function onKeyUp(event) {
	if (this.isPlaying) {
		this.source.stop()
		this.isPlaying = false
	}
}

function triggerPlay() {
	playingEnvelopeState = "attack"
	play()
}

function play() {
	const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

	const volume = 1;
	const safetyHardClip = 1;
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
				calculatedBuffer[i] * volume * playingVolume * mainVolume
			)
		);
	}

	const source = audioCtx.createBufferSource();
	this.source = source
	source.buffer = buffer;

	source.connect(audioCtx.destination);

	source.start(audioCtx.currentTime);
}

function resetDevicesForBufferCalculation(scale) {

	let nonConnectionDevices = getNonConnectionDevices()

	for (let i = 0; i < nonConnectionDevices.length; i++) {
		nonConnectionDevices[i].sampleRate = scale
		nonConnectionDevices[i].resetForCalculations()
	}
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
	} else if (tabIndex == 3) {
		tab = document.getElementById("other-devices");
	}

	tab.style.display = "flex"
}

function onTabClicked(tabIndex) {
	setTab(tabIndex)
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

function onSavePresetClicked() {
	const presetObject = {
		oscillators: oscillators.map((e) => {return e.getPresetObject()}),
		connections: connections.map((e) => {return e.getPresetObject()}),
		effects: effects.map((e) => {return e.getPresetObject()}),
		otherDevices: otherDevices.map((e) => {return e.getPresetObject()})
	}

	const presetString = JSON.stringify(presetObject)

	saveFile('modular_synth_preset.json', presetString);
}

function onLoadPresetClicked() {
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

function onRandomPresetClicked () {
	clearPreset()

	const safeLimit = 100

	var addDevicesDone = false
	var i = 0
	while (!addDevicesDone && i < safeLimit) {
		let deviceType = availableDeviceTypes[Math.floor(Math.random() * availableDeviceTypes.length)]
		addDevice(deviceType)

		addDevicesDone = Math.random() >= 0.95
		i += 1
	}

	for (let device of getNonConnectionDevices()) {
		if (device instanceof OutputDevice) {
			let goesToMainOutput = Math.random() >= 0.5
			device.setGoesToMainOutput(goesToMainOutput)
			device.updateMainOutputLED()
		}

		for (let parameterKey in device.parameters) {
			let parameter = device.parameters[parameterKey]
			if (parameter.modulatable) {
				device.parameters[parameterKey].value = parameter.min + Math.random() * parameter.rangeDerivedValue
				device.parameters[parameterKey].updateView()
			}
		}
	}

	for (let connection of connections) {
		connection.parameters.from.randomize()
		connection.parameters.to.randomize()
		connection.updateParameterSelector()
		connection.parameters.parameter.randomize()
	}

	updateOscilloscope()
}

const loadPreset = (presetFile) => {
	const reader = new FileReader()
	reader.onload = (event) => {
		const presetObject = JSON.parse(event.target.result)
		setSynthFromPresetObject(presetObject)
	}
	reader.readAsText(presetFile)
}

function clearPreset() {
	oscillators = []
	effects = []
	connections = []
	otherDevices = []
	oscillatorsView.innerHTML = ""
	effectsView.innerHTML = ""
	connectionsView.innerHTML = ""
	otherDevicesView.innerHTML = ""
}

const setSynthFromPresetObject = (presetObject) => {
	clearPreset()

	let devices = presetObject.oscillators
		.concat(presetObject.effects)
		.concat(presetObject.otherDevices)
		.concat(presetObject.connections)

	for (let presetDevice of devices) {
		let deviceType = findDeviceTypeWithId(presetDevice.typeId)
		let device = addDevice(deviceType)

		if (device instanceof OutputDevice) {
			device.setGoesToMainOutput(presetDevice.goesToMainOutput)
			device.updateMainOutputLED()
		}

		for (let parameterKey in device.parameters) {
				let parameter = device.parameters[parameterKey]
				parameter.value = presetDevice.parameters[parameterKey]
				parameter.updateView()
			}

		if (device instanceof Connection) {
			device.parameters.from.setValueFromIndex(presetDevice.parameters.from)
			device.parameters.to.setValueFromIndex(presetDevice.parameters.to)
			device.updateParameterSelector()
			device.parameters.parameter.setValueFromIndex(presetDevice.parameters.parameter)
		}
	}

	updateOscilloscope()
}

function findDeviceTypeWithId(id) {
	for (let type of availableDeviceTypes) {
		if (type.typeId == id) {
			return type
		}
	}
}

function updateMainVolumeSliderFromModel() {
	const mainVolumeSlider = document.getElementById("main-volume-slider")
	mainVolumeSlider.value = mainVolumeScalableParameterType.getSliderForUnscaledValue(mainVolume)
}

const onMainVolumeChanged = (event) => {
	mainVolume = getUnscaledSliderValue(event.target.value)
}

function onDurationChanged(event) {
	duration = getScaledDurationValue(getUnscaledSliderValue(event.target.value))
}

function dropdownClicked(event, dropdown_id) {
	Object.keys(dropdownStates).forEach((key) => {
		if (key != dropdown_id) {
			dropdownStates[key] = false
			const dropdown = document.getElementsByClassName("dropdown")[key]
			const dropdownContent = dropdown.getElementsByClassName("dropdown-content")[0]
			dropdownContent.style.display = "none"
		}
	})
	if (dropdownStates[dropdown_id] === undefined) {
		dropdownStates[dropdown_id] = true
	} else {
		dropdownStates[dropdown_id] = !dropdownStates[dropdown_id]
	}

	const dropdown = document.getElementsByClassName("dropdown")[dropdown_id]
	const dropdownContent = dropdown.getElementsByClassName("dropdown-content")[0]
	dropdownContent.style.display = dropdownStates[dropdown_id] ? "block" : "none"
}

function addTapOutHandler() {
	document.addEventListener("click", (event) => {
		const dropdowns = document.getElementsByClassName("dropdown")
		for (let i = 0; i < dropdowns.length; i++) {
			const dropdown = dropdowns[i]
			const dropdownButton = dropdown.getElementsByClassName("dropdown-expander")[0]
			const dropdownContent = dropdown.getElementsByClassName("dropdown-content")[0]
			if (!dropdownButton.contains(event.target)) {
				dropdownContent.style.display = "none"
				dropdownStates[i] = false
			}
		}
	})
}

function onAddDeviceClicked(deviceType) {
	addDevice(deviceType)
	updateOscilloscope()
}

function addDevice(deviceType) {
	const device = new deviceType(objectIDManager)
	device.setOnDeviceChanged(onDeviceChanged)

	let deviceArray = getDeviceArrayForDevice(device)

	if (deviceArray && !(device instanceof Connection)) {
		let nameNumber = deviceArray.filter((device) => device.constructor.typeId === deviceType.typeId).length + 1;
		const deviceTitle = deviceType.typeDisplayName + " " + nameNumber
		device.setDeviceTitle(deviceTitle)
	}

	if (device instanceof Oscillator) {
        oscillators.push(device)
		device.appendToView(oscillatorsView)
	} else if (device instanceof Connection) {
        connections.push(device)
        device.appendToView(connectionsView)
    } else if (device instanceof Effect) {
        effects.push(device)
        device.appendToView(effectsView)
    } else if (device instanceof OtherDevice) {
        otherDevices.push(device)
        device.appendToView(otherDevicesView)
    }

	device.onDeletePressed = () => {onDeletePressed(device)}

	updateOptionsOfAllConnections()

	return device
}

function getDeviceArrayForDevice(device) {
	if (device instanceof Oscillator) {
		return oscillators
	} else if (device instanceof Connection) {
		return connections
	} else if (device instanceof Effect) {
		return effects
	} else if (device instanceof OtherDevice) {
		return otherDevices
	}
}

function onDeletePressed(device) {
	if (device instanceof Oscillator) {
		oscillators.splice(oscillators.indexOf(device), 1)
	} else if (device instanceof Connection) {
        let connection = connections.splice(connections.indexOf(device), 1)[0]
		let sourceObject = connection.parameters["from"].getSelectedObject()
		sourceObject.outputConnections -= 1
    } else if (device instanceof Effect) {
		effects.splice(effects.indexOf(device), 1)
    } else if (device instanceof OtherDevice) {
		otherDevices.splice(otherDevices.indexOf(device), 1)
	}

	device.removeFromSuperview()
	updateOptionsOfAllConnections()
	updateOscilloscope()
}

function updateOptionsOfAllConnections() {
	for (let connection of connections) {
		updateOptionsOfConnection(connection)
	}
}

function updateOptionsOfConnection(connection) {
	const fromSelector = connection.parameters["from"]
	const toSelector = connection.parameters["to"]

	const outputDevices = getOutputDevices()

	fromSelector.setOptionsFromObjectsAndUpdateDropdown(outputDevices)
	toSelector.setOptionsFromObjectsAndUpdateDropdown(outputDevices)
}

function getAvailableDeviceTypes() {
	return availablePinnedDevices.concat(availableOscillatos).concat(availableEffects).concat(availableOtherDevices)
}

function getOutputDevices() {
    return oscillators.concat(effects).concat(otherDevices)
}

function getNonConnectionDevices() {
	return oscillators.concat(effects).concat(otherDevices)
}

function onDeviceChanged() {
	updateOscilloscope();
}

function floatTo16BitPCM(output, offset, input) {
	for (let i = 0; i < input.length; i++, offset += 2) {
		let s = Math.max(-1, Math.min(1, input[i]))
		s = s < 0 ? s * 0x8000 : s * 0x7FFF
		output.setInt16(offset, s, true)
	}
}

function writeWAV(buffer, sampleRate) {
	const numFrames = buffer.length
	const numChannels = 1
	const bytesPerSample = 2
	const blockAlign = numChannels * bytesPerSample
	const byteRate = sampleRate * blockAlign
	const dataSize = numFrames * numChannels * bytesPerSample

	const bufferSize = 44 + dataSize
	const arrayBuffer = new ArrayBuffer(bufferSize)
	const view = new DataView(arrayBuffer)

	// "RIFF" chunk descriptor
	view.setUint32(0, 0x52494646, false) // "RIFF"
	view.setUint32(4, 36 + dataSize, true)
	view.setUint32(8, 0x57415645, false) // "WAVE"

	// "fmt " sub-chunk
	view.setUint32(12, 0x666d7420, false) // "fmt "
	view.setUint32(16, 16, true) // PCM chunk size
	view.setUint16(20, 1, true) // PCM format
	view.setUint16(22, numChannels, true)
	view.setUint32(24, sampleRate, true)
	view.setUint32(28, byteRate, true)
	view.setUint16(32, blockAlign, true)
	view.setUint16(34, bytesPerSample * 8, true)

	// "data" sub-chunk
	view.setUint32(36, 0x64617461, false) // "data"
	view.setUint32(40, dataSize, true)

	// Write PCM samples
	floatTo16BitPCM(view, 44, buffer)

	return arrayBuffer
}

function onBounceAudioClicked() {
	const  calculatedBuffer = calculateBuffer(duration * bounceSampleRate, bounceSampleRate)
	
	// Apply the same volume scaling as the play() function
	const volume = 1;
	const safetyHardClip = 1;
	const scaledBuffer = calculatedBuffer.map(sample => 
		Math.max(
			-safetyHardClip, 
			Math.min(
				safetyHardClip, 
				sample * volume * mainVolume
			)
		)
	);

	const wavBuffer = writeWAV(scaledBuffer, bounceSampleRate)

	// Initiate download
	const blob = new Blob([wavBuffer], { type: "audio/wav" })
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.style.display = "none"
	a.href = url
	a.download = "Synth_bounce.wav"
	document.body.appendChild(a)
	a.click()
	setTimeout(() => {
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	}, 100)
}

const availableDeviceTypes = getAvailableDeviceTypes()
const devicesDropdown = document.getElementsByClassName("dropdown-content")[0]

for (let i = 0; i < availableDeviceTypes.length; i++) {
	const device = availableDeviceTypes[i]
	const deviceDropdownItem = document.createElement("div")
	deviceDropdownItem.classList.add("dropdown-item")
	deviceDropdownItem.innerHTML = device.typeDisplayName

	deviceDropdownItem.addEventListener("click", (e) => {
		this.onAddDeviceClicked(device)
	})
	devicesDropdown.appendChild(deviceDropdownItem)
}

updateDurationSliderFromModel()

addTapOutHandler()
oscilloscope.appendToView(oscilloscopeContainer);
updateMainVolumeSliderFromModel();
addDevice(OscillatorProper)

setTab(0);
updateOscilloscope();

// Test
addDevice(DeepDistortion)
addDevice(Envelope)
addDevice(Connection)
addDevice(Connection)

oscillators[0].setGoesToMainOutput(false)
oscillators[0].updateMainOutputLED()
oscillators[0].parameters.frequency.value = 220
oscillators[0].parameters.partials.value = 4
oscillators[0].parameters.shape.setValueFromIndex(3)

otherDevices[0].parameters.attack.value = 1
otherDevices[0].setGoesToMainOutput(false)
otherDevices[0].updateMainOutputLED()

connections[0].parameters.from.setValueFromIndex(0)
connections[0].parameters.to.setValueFromIndex(1)
connections[0].updateParameterSelector()
connections[0].parameters.parameter.setValueFromIndex(4)
connections[0].parameters.amount.value = 1

connections[1].parameters.from.setValueFromIndex(2)
connections[1].parameters.to.setValueFromIndex(0)
connections[1].updateParameterSelector()
connections[1].parameters.parameter.setValueFromIndex(0)
connections[1].parameters.amount.value = 0.1

effects[0].parameters.transition.value = 0.5


setTab(2)
updateOscilloscope()

// const offset = 2048
// var oscilloscopeBuffer = calculateBuffer(oscilloscopeWidth + offset, pixelsPerSecond)
// oscilloscopeBuffer = oscilloscopeBuffer.slice(offset)
// oscilloscope.updateFromBuffer(oscilloscopeBuffer)