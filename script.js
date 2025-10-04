let oscilloscopeWidth = 300
let oscilloscopeHeight = 100

let oscillatorWidthsPerSecond = 50
let pixelsPerSecond = oscillatorWidthsPerSecond * oscilloscopeWidth

let playingVolume = 0
let playingEnvelopeAttack = 0.02
let playingEnvelopeRelease = 0.1
let playingEnvelopeState = "steady"

// Continuous audio variables
let audioContext = null
let audioWorkletNode = null
let isPlaying = false

var oscillators = []
var connections = []
var effects = []
var otherDevices = []

var mainVolume = 0.25;
var mainVolumeScalableParameterType = new ScalableParameter(0.25, 0, 1)

const oscilloscope = new Oscilloscope(oscilloscopeWidth, oscilloscopeHeight)
const oscilloscopeContainer = document.getElementById("oscilloscope-container")
const effectsView = document.getElementById("effects");
const connectionsView = document.getElementById("connections");
const oscillatorsView = document.getElementById("oscillators")
const otherDevicesView = document.getElementById("other-devices")

var dropdownStates = {}

var availablePinnedDevices = [Connection]
var availableOscillatos = [OscillatorProper, Noise]
var availableEffects = [Distortion, Delay, Volume, Syncifier, BitCrusher, PulseWidth]
var availableOtherDevices = [EnvelopeFollower]

const objectIDManager = new ObjectIDManager()

function getUnscaledSliderValue(value) {
	return value / 1000
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
				device.lastOutput = deviceOutput

				if (device.goesToMainOutput) {
					output_new += deviceOutput
				}
			}

        }
        outputBuffer_new.push(output_new)
	}

	return outputBuffer_new
}

function updateOscilloscope() {
	// For continuous audio, we'll calculate a snapshot buffer for visualization
	let outputBuffer = calculateBuffer(oscilloscopeWidth, pixelsPerSecond)
	oscilloscope.updateFromBuffer(outputBuffer)
}

function onKeyDown(event) {
	triggerPlay()
}

function triggerPlay() {
	play()
}

async function initializeAudioContext() {
	if (!audioContext) {
		audioContext = new (window.AudioContext || window.webkitAudioContext)();
		
		// Load the AudioWorklet module
		await audioContext.audioWorklet.addModule('./audio-processor.js');
	}
	
	// Create worklet node if it doesn't exist
	if (!audioWorkletNode) {
		audioWorkletNode = new AudioWorkletNode(audioContext, 'modular-synth-processor');
	}
}

async function play() {
	if (isPlaying) {
		stopPlayback();
		return;
	}
	
	console.log('Starting audio playback...');
	
	await initializeAudioContext();
	
	// Resume audio context if suspended
	if (audioContext.state === 'suspended') {
		console.log('Resuming suspended audio context...');
		await audioContext.resume();
	}
	
	console.log('Audio context state:', audioContext.state);
	
	// Connect the worklet to destination
	audioWorkletNode.connect(audioContext.destination);
	
	// Update the worklet with current synth data
	updateAudioWorkletData();
	
	// Start playing
	isPlaying = true;
	playingEnvelopeState = "attack";
	
	// Update play button
	updatePlayButton();
	
	// Start periodic oscilloscope updates
	startOscilloscopeUpdates();
	
	console.log('Audio playback started');
}

function stopPlayback() {
	if (audioWorkletNode) {
		audioWorkletNode.disconnect();
		// Don't set to null - keep the worklet node for reuse
	}
	isPlaying = false;
	playingEnvelopeState = "steady";
	playingVolume = 0;
	
	// Update play button
	updatePlayButton();
	
	// Stop oscilloscope updates
	stopOscilloscopeUpdates();
}

let oscilloscopeUpdateInterval = null;

function startOscilloscopeUpdates() {
	// Update oscilloscope every 50ms for smooth visualization
	oscilloscopeUpdateInterval = setInterval(() => {
		if (isPlaying) {
			updateOscilloscope();
		}
	}, 50);
}

function stopOscilloscopeUpdates() {
	if (oscilloscopeUpdateInterval) {
		clearInterval(oscilloscopeUpdateInterval);
		oscilloscopeUpdateInterval = null;
	}
}

function updatePlayButton() {
	const playButton = document.querySelector('button[onClick="triggerPlay()"]');
	if (playButton) {
		playButton.innerHTML = isPlaying ? "⏹️" : "▶️";
	}
}

function updateAudioWorkletData() {
	if (!audioWorkletNode) return;
	
	// Convert devices to serializable format for the worklet
	const serializedOscillators = oscillators.map(device => ({
		id: device.id,
		typeId: device.constructor.typeId,
		parameters: serializeParameters(device.parameters),
		timedSignals: serializeTimedSignals(device.timedSignals),
		goesToMainOutput: device.goesToMainOutput,
		lastOutput: device.lastOutput || 0,
		calculation: serializeDeviceCalculation(device)
	}));
	
	const serializedEffects = effects.map(device => ({
		id: device.id,
		typeId: device.constructor.typeId,
		parameters: serializeParameters(device.parameters),
		timedSignals: serializeTimedSignals(device.timedSignals),
		goesToMainOutput: device.goesToMainOutput,
		lastOutput: device.lastOutput || 0,
		calculation: serializeDeviceCalculation(device)
	}));
	
	const serializedOtherDevices = otherDevices.map(device => ({
		id: device.id,
		typeId: device.constructor.typeId,
		parameters: serializeParameters(device.parameters),
		timedSignals: serializeTimedSignals(device.timedSignals),
		goesToMainOutput: device.goesToMainOutput,
		lastOutput: device.lastOutput || 0,
		calculation: serializeDeviceCalculation(device)
	}));
	
	const serializedConnections = connections.map(connection => ({
		from: connection.parameters.from.getSelectedObject()?.id,
		to: connection.parameters.to.getSelectedObject()?.id,
		parameter: connection.parameters.parameter.getSelectedObject()?.displayName,
		amount: parseFloat(connection.parameters.amount.value)
	}));
	
	const synthData = {
		oscillators: serializedOscillators,
		effects: serializedEffects,
		otherDevices: serializedOtherDevices,
		connections: serializedConnections,
		mainVolume: mainVolume,
		sampleRate: audioContext.sampleRate
	};
	
	audioWorkletNode.port.postMessage({
		type: 'updateSynth',
		data: synthData
	});
}

function serializeParameters(parameters) {
	const serialized = {};
	for (let key in parameters) {
		const param = parameters[key];
		serialized[key] = {
			value: param.value,
			min: param.min,
			max: param.max,
			rangeDerivedValue: param.rangeDerivedValue,
			modulationDelta: param.modulationDelta || 0
		};
	}
	return serialized;
}

// Device calculation registry - maps device types to their calculation functions
// This allows the AudioWorklet to use polymorphic device calculations
const deviceCalculationRegistry = new Map();

function registerDeviceCalculation(deviceType, calculationFunction) {
	deviceCalculationRegistry.set(deviceType, calculationFunction);
}

// To add a new device type for continuous audio:
// 1. Copy the calculateOutput method from your device class
// 2. Replace parameter.getModulatedValue() calls with getModulatedValue(parameter)
// 3. Register it using: registerDeviceCalculation('your_type_id', function(device, getModulatedValue) { ... });

function serializeDeviceCalculation(device) {
	const deviceType = device.constructor.typeId;
	const calculationFunction = deviceCalculationRegistry.get(deviceType);
	
	if (calculationFunction) {
		// Convert function to string and extract just the function body
		const functionString = calculationFunction.toString();
		// Remove the function declaration part and keep only the body
		const bodyStart = functionString.indexOf('{') + 1;
		const bodyEnd = functionString.lastIndexOf('}');
		const functionBody = functionString.substring(bodyStart, bodyEnd).trim();
		
		return {
			type: deviceType,
			calculateOutput: functionBody
		};
	}
	
	// Fallback for unregistered device types
	return {
		type: deviceType,
		calculateOutput: 'return 0;'
	};
}

function serializeTimedSignals(timedSignals) {
	const serialized = {};
	for (let key in timedSignals) {
		const signal = timedSignals[key];
		serialized[key] = {
			x: signal.x,
			stepSize: signal.stepSize
		};
	}
	return serialized;
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
			device.goesToMainOutput = Math.random() >= 0.5
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
		.concat(presetObject.connections)
		.concat(presetObject.otherDevices)

	for (let presetDevice of devices) {
		let deviceType = findDeviceTypeWithId(presetDevice.typeId)
		let device = addDevice(deviceType)

		if (device instanceof OutputDevice) {
			device.goesToMainOutput = presetDevice.goesToMainOutput
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
        connections.splice(connections.indexOf(device), 1)
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
	if (isPlaying) {
		updateAudioWorkletData();
	}
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

// Register device calculation functions for AudioWorklet
// These functions mirror the calculateOutput methods from the device classes
// but are adapted to work with the serialized device data in the AudioWorklet

registerDeviceCalculation('oscillator_proper', function(device, getModulatedValue) {
	// This mirrors the OscillatorProper.calculateOutput() method
	let output = 0;
	
	// Handle phase wrapping for mainTime
	let mainTimeX = device.timedSignals.mainTime.x;
	const phaseScaled = getModulatedValue(device.parameters.phase) / 360;
	
	if (mainTimeX + phaseScaled >= 1) {
		const difference = (mainTimeX + phaseScaled) - 1;
		mainTimeX = difference - phaseScaled;
		device.timedSignals.mainTime.x = mainTimeX;
		device.timedSignals.syncTime.x = difference * getModulatedValue(device.parameters.sync);
	}
	
	const phasedX = device.timedSignals.syncTime.x * 2 * Math.PI + 
				   getModulatedValue(device.parameters.syncPhase) * Math.PI / 180;

	if (getModulatedValue(device.parameters.shape) == 0) {
		output = Math.sin(phasedX);
	} else {
		const partials = Math.floor(getModulatedValue(device.parameters.partials));
		
		for (let i = 1; i <= partials; i++) {
			let partialFrequency = 1;
			let partialAmplitude = 1;

			switch (getModulatedValue(device.parameters.shape)) {
				case 1: // Square
					partialFrequency = 2 * i - 1;
					partialAmplitude = 4 / (Math.PI * partialFrequency);
					break;
				case 2: // Triangle
					partialFrequency = 2 * i - 1;
					partialAmplitude = -8 * Math.pow(-1, i) / (Math.pow(Math.PI, 2) * Math.pow(partialFrequency, 2));
					break;
				case 3: // Sawtooth
					partialFrequency = i;
					partialAmplitude = 2 / (Math.PI * partialFrequency);
			}
			
			const partialX = phasedX * partialFrequency;
			const partialOutput = Math.sin(partialX) * partialAmplitude;
			output += partialOutput;
		}
	}

	return output * getModulatedValue(device.parameters.amplitude);
});

registerDeviceCalculation('noise', function(device, getModulatedValue) {
	// This mirrors the Noise.calculateOutput() method
	const amplitude = getModulatedValue(device.parameters.amplitude);
	const rate = getModulatedValue(device.parameters.rate);
	const time = device.timedSignals.mainTime.x;
	const periodInSamples = device.sampleRate / rate;

	let output = device.lastOutput || 0;
	if (time - (device.lastSamplePoint || -1) >= periodInSamples) {
		output = (Math.random() * 2 - 1) * amplitude;
		device.lastSamplePoint = time;
	}

	return output;
});

addTapOutHandler()
oscilloscope.appendToView(oscilloscopeContainer);
updateMainVolumeSliderFromModel();
addDevice(OscillatorProper)

setTab(0);
updateOscilloscope();