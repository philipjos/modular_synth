const testCompressor = false
const testEnvelopeFollower = true

let oscilloscopeWidth = 300
let oscilloscopeHeight = 100

let oscillatorWidthsPerSecond = 50
let pixelsPerSecond = oscillatorWidthsPerSecond * oscilloscopeWidth

let playingVolume = 0
let playingEnvelopeAttack = 0.02
let playingEnvelopeRelease = 0.1
let playingEnvelopeState = "steady"

var oscillators_old = []
var connections_old = [] 
var effects_old = []

var oscillators = []
var connections = []
var effects = []
var otherDevices = []

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

var bitCrusherBitDepthScalableParameterType = new ScalableParameter(8, 1, 16)
var bitCrusherSampleRateScalableParameterType = new ScalableParameter(1000, 1, 44100)

var delayTimeScalableParameterType = new ScalableParameter(0.5, 1, 1000)
var delayFeedbackScalableParameterType = new ScalableParameter(0.5, 0, 1)

var compressorThresholdScalableParameterType = new ScalableParameter(0.5, 0, 1)
var compressorRatioScalableParameterType = new ScalableParameter(2, 1, 10)
var compressorAttackScalableParameterType = new ScalableParameter(50, 0, 500)
var compressorReleaseScalableParameterType = new ScalableParameter(50, 0, 2000)

const compressorMinimumFrequency = 20

const oscilloscope = new Oscilloscope(oscilloscopeWidth, oscilloscopeHeight)
const oscilloscopeContainer = document.getElementById("oscilloscope-container")
const effectsView = document.getElementById("effects");
const connectionsView = document.getElementById("connections");
const oscillatorsView = document.getElementById("oscillators")
const otherDevicesView = document.getElementById("other-devices")

var dropdownStates = {}

var availablePinnedDevices = [Connection]
var availableOscillatos = [OscillatorProper]
var availableEffects = [Delay, Syncifier, Compressor]
var availableOtherDevices = [EnvelopeFollower]

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
	} else if (type == "delay") {
		return [
			{
				name: "time",
				title: "Time",
			},
			{
				name: "feedback",
				title: "Feedback",
			}
		]
	} else if (type == "compressor") {
		return [
			{
				name: "threshold",
				title: "Threshold",
			},
			{
				name: "ratio",
				title: "Ratio",
			},
			{
				name: "attack",
				title: "Attack",
			},
			{
				name: "release",
				title: "Release",
			}
		]
	} else if (type == "bitCrusher") {
		return [
			{
				name: "bitDepth",
				title: "Bit depth",
			},
			{
				name: "sampleRate",
				title: "Sample rate",
			}
		]
	}
}
				

function calculateBuffer(length, scale) {
	let outputBuffer = []

	for (let i = 0; i < oscillators_old.length; i++) {
		oscillators_old[i].timedSignalX = 0
		oscillators_old[i].syncTimedSignalX = 0
	}

	for (let i = 0; i < effects_old.length; i++) {
		effects_old[i].history = []
	}

	resetDevicesForBufferCalculation(scale)

	var connectionsIndexMapped = []
	for (let i = 0; i < connections_old.length; i++) {
		const source = connections_old[i].source
		const destination = connections_old[i].destination
		if (source == 0 || destination == 0) {
			continue
		}

		// TODO: get rid of this (It should be 0 as above)
		if (source == "-" || destination == "-") {
			continue
		}

		if (connections_old[i].destinationParameter == "-") {
			continue
		}

		const sourceIndex = connectionePartyDeviceIdsCache.findIndex((id) => id === source)
		const destinationIndex = connectionePartyDeviceIdsCache.findIndex((id) => id === destination)
		connectionsIndexMapped.push({
			source: sourceIndex,
			destination: destinationIndex,
			amount: connections_old[i].amount,
			destinationParameter: connections_old[i].destinationParameter
		})
	}

	var mainBusLastSignal = 0
	let outputBuffer_new = []

	const nonConnectionDevices = getNonConnectionDevices()
	for (let device of nonConnectionDevices) {
		device.resetTimedSignals()
		device.lastOutput = 0
	}

	for (let i = 0; i < length; i++) {
		//console.log("calculate step")
		let output = 0
		let output_new = 0

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
			const source = connections_old[connectionIndex].source
			const destination = connections_old[connectionIndex].destination
			const destinationIndex = modulatedDevices.findIndex((device) => {

				// TODO: (Along with other places) make this able to work with a ===.
				return device.id == destination
			})
			const amount = connections_old[connectionIndex].amount
			const destinationParameter = connections_old[connectionIndex].destinationParameter

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
			} else if (device.type == "delay") {
				const time = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].time))
				const feedback = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].feedback))
				
				const timeScaled = delayTimeScalableParameterType.getScaledValueForValue(time)
				const timeInSamples = timeScaled / 1000 * scale

				const inputValue = modulatedDevices[deviceIndex]["inputValue"]

				var signal = 0

				var signalForHistory
				if (device.history.length >= timeInSamples) {
					const delaySignal = device.history.splice(0, 1)[0]
					signalForHistory = inputValue + delaySignal * feedback
					signal = delaySignal
				} else {
					signalForHistory = inputValue
				}

				device.history.push(signalForHistory)
				setPropertyOfConnectionPartyDeviceWithId(connectionePartyDeviceIdsCache[deviceIndex], "previousValue", signal)
				
				if (device.mainOutput) {
					output += signal
				}
			} else if (device.type == "compressor") {
				const threshold = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].threshold))
				const ratio = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].ratio))
				const attack = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].attack))
				const release = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].release))

				const thresholdScaled = compressorThresholdScalableParameterType.getScaledValueForValue(threshold)
				const ratioScaled = compressorRatioScalableParameterType.getScaledValueForValue(ratio)
				const attackScaled = compressorAttackScalableParameterType.getScaledValueForValue(attack)
				const releaseScaled = compressorReleaseScalableParameterType.getScaledValueForValue(release)
				const attackInSeconds = attackScaled / 1000
				const releaseInSeconds = releaseScaled / 1000
				const attackInSamples = attackInSeconds * scale
				const releaseInSamples = releaseInSeconds * scale
				const envelopeInSamples = attackInSamples + releaseInSamples

				const inputValue = modulatedDevices[deviceIndex]["inputValue"]
				
				var maxValue = 0
				var maxValueIndex = 0
				var minValue = 0
				var minValueIndex = 0

				const maxPeriodInSamples = scale / compressorMinimumFrequency

				for (let j = 0; j < device.history.length; j++) {
					if (device.history[j] > maxValue) {
						maxValue = device.history[j]
						maxValueIndex = j
					}	
					if (device.history[j] < minValue) {
						minValue = device.history[j]
						minValueIndex = j
					}
				}


				const amplitude = Math.abs(maxValue - minValue) / 2
				
				var signal = inputValue
				if (amplitude > 0) {
					if (amplitude > thresholdScaled) {
						const historyIndexOfTriggeringPeriodEnd = Math.max(maxValueIndex, minValueIndex)
						const samplesSinceTriggeringPeriodEnd = device.history.length - historyIndexOfTriggeringPeriodEnd

						const sampleIndex = i - samplesSinceTriggeringPeriodEnd
						if (!device.triggered) {
							device.firstConsecutiveTriggerSampleIndex = sampleIndex
							device.triggered = true
						}

						device.triggeredSampleIndex = sampleIndex
					}

					if (device.triggered) {
						const samplesSinceTrigger = i - device.triggeredSampleIndex
						const sampleSinceFirstConsecutiveTrigger = i - device.firstConsecutiveTriggerSampleIndex
						
						if (samplesSinceTrigger >= envelopeInSamples) {
							device.triggered = false
						} else {
							var envelopeValuePercentage
							if (sampleSinceFirstConsecutiveTrigger < attackInSamples) {
								envelopeValuePercentage = sampleSinceFirstConsecutiveTrigger / attackInSamples
							} else {
								envelopeValuePercentage = 1 - Math.max(0, (samplesSinceTrigger - attackInSamples)) / releaseInSamples
							}

							const ratioWithEnvelope = 1 + (ratioScaled - 1) * envelopeValuePercentage
							const gainToAddAboveThreshold = (amplitude - thresholdScaled) / ratioWithEnvelope
							const newAmplitude = thresholdScaled + gainToAddAboveThreshold
							const gain = newAmplitude / amplitude
							signal *= gain
						}
					}
				}
				
				device.history.push(signal)
				if (device.history.length > maxPeriodInSamples) {
					device.history.splice(0, 1)
				}

				setPropertyOfConnectionPartyDeviceWithId(connectionePartyDeviceIdsCache[deviceIndex], "previousValue", signal)

				if (device.mainOutput) {
					output += signal
				}
			} else if (device.type == "bitCrusher") {
				const bitDepth = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].bitDepth))
				const sampleRate = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].sampleRate))

				const bitDepthScaled = bitCrusherBitDepthScalableParameterType.getScaledValueForValue(bitDepth)
				const sampleRateScaled = bitCrusherSampleRateScalableParameterType.getScaledValueForValue(sampleRate)

				const inputValue = modulatedDevices[deviceIndex]["inputValue"]

				const fullRange = 2
				const resolution = Math.pow(2, bitDepthScaled)
				const quantum = fullRange / (resolution - 1)
				const rounded = Math.round(inputValue / quantum) * quantum
				const bitCrushed = Math.min(1, Math.max(-1, rounded))

				var signal = 0
				const timeQuantum = scale / sampleRateScaled
				var timedSignalX = device.timedSignalX
				if (timedSignalX >= timeQuantum) {
					timedSignalX = 0
					signal = bitCrushed
				} else {
					signal = device.previousValue
				}

				timedSignalX += 1
				setPropertyOfConnectionPartyDeviceWithId(connectionePartyDeviceIdsCache[deviceIndex], "timedSignalX", timedSignalX)

				setPropertyOfConnectionPartyDeviceWithId(connectionePartyDeviceIdsCache[deviceIndex], "previousValue", signal)

				if (device.mainOutput) {
					output += signal
				}
			}
		}

		mainBusLastSignal = mainBusNewSignal

		outputBuffer.push(output)

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
	let outputBuffer = calculateBuffer(oscilloscopeWidth, pixelsPerSecond)

	oscilloscope.updateFromBuffer(outputBuffer)
}

function onKeyDown(event) {
	triggerPlay()
}

function triggerPlay() {
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

function resetDevicesForBufferCalculation(scale) {
	for (let i = 0; i < effects_old.length; i++) {
		if (effects_old[i].type == "compressor") {
			effects_old[i].triggered = false
			effects_old[i].triggeredSampleIndex = 0
			effects_old[i].firstConsecutiveTriggerSampleIndex = 0
		}
	}

	let nonConnectionDevices = getNonConnectionDevices()

	for (let i = 0; i < nonConnectionDevices.length; i++) {
		nonConnectionDevices[i].sampleRate = scale
		nonConnectionDevices[i].resetForCalculations()
	}
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
		oscillators_old[index].frequency = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})

	amplitudeInput.addEventListener("input", (event) => {
		const index = findOscillatorIndexById(id)
		oscillators_old[index].amplitude = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})
	
	phaseInput.addEventListener("input", (event) => {
		const index = findOscillatorIndexById(id)
		oscillators_old[index].phase = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})

	shapeInput.addEventListener("input", (event) => {
		const index = findOscillatorIndexById(id)
		oscillators_old[index].shape = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})

	partialsInput.addEventListener("input", (event) => {
		const index = findOscillatorIndexById(id)
		oscillators_old[index].partials = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})

	syncInput.addEventListener("input", (event) => {
		const index = findOscillatorIndexById(id)
		oscillators_old[index].sync = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})

	const mainOutputSection = document.createElement("div");
	mainOutputSection.classList.add("main-output-section");
	oscillator.appendChild(mainOutputSection)

	const mainOutputButton = document.createElement("div");
	mainOutputButton.innerHTML = "Main out";
	mainOutputButton.classList.add("main-output-button");
	mainOutputButton.classList.add("text");
	mainOutputButton.addEventListener("click", () => {
		const index = findOscillatorIndexById(id)
		oscillators_old[index].mainOutput = !oscillators_old[index].mainOutput;
		const ledViews = document.getElementsByClassName("main-output-led")
		const ledView = ledViews[index]
		ledView.style.backgroundColor = oscillators_old[index].mainOutput ? "#19F1FF" : "#aaaaaa"
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
		removeOscillator(id)
	})
	oscillator.appendChild(deleteButton)

	updateConnectionPartyCaches()
	updateDropDowns()
}

function removeOscillator(id) {
    const index = findOscillatorIndexById(id)
    const oscillator = document.getElementsByClassName("oscillator")[index]
    oscillators_old.splice(index, 1)
    updateConnectionPartyCaches()
    oscillatorsView.removeChild(oscillator)
    updateConnectionsFromRemovingDeviceWithId(id)
    updateDropDowns()
    updateOscilloscope()
}

function addOscillator() {
	const oscillatorNumber = oscillators_old.filter((oscillator) => oscillator.type == "oscillator").length + 1
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

	oscillators_old.push(oscillatorModel)
	addOscillatorViewFromModel(oscillatorModel)
}

function findOscillatorIndexById(id) {
	return oscillators_old.findIndex((oscillator) => oscillator.id === id)
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
		connections_old.splice(findConnectionIndexById(id), 1)
		connctionsView.removeChild(connection)
		updateOscilloscope()
	})
	connection.appendChild(deleteButton)

	sourceSelector.addEventListener("input", (event) => {
		const index = findConnectionIndexById(id)
		connections_old[index].source = event.target.value
		updateOscilloscope()
	})

	destinationSelector.addEventListener("input", (event) => {
		const index = findConnectionIndexById(id)
		connections_old[index].destination = event.target.value
		updateParameterDropDown(index)
		updateOscilloscope()
	})

	destinationParameterSelector.addEventListener("input", (event) => {
		const index = findConnectionIndexById(id)
		connections_old[index].destinationParameter = event.target.value
		updateOscilloscope()
	})

	amountControl.addEventListener("input", (event) => {
		const index = findConnectionIndexById(id)
		connections_old[index].amount = getUnscaledSliderValue(event.target.value);
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

	connections_old.push(connectionModel)
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
		oscillators_old[index].rate = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})

	amplitudeInput.addEventListener("input", (event) => {
		const index = findOscillatorIndexById(id)
		oscillators_old[index].amplitude = getUnscaledSliderValue(event.target.value)
		updateOscilloscope()
	})

	const mainOutputSection = document.createElement("div");
	mainOutputSection.classList.add("main-output-section");
	noiseOscillator.appendChild(mainOutputSection)

	const mainOutputButton = document.createElement("div");
	mainOutputButton.innerHTML = "Main out";
	mainOutputButton.classList.add("main-output-button");
	mainOutputButton.classList.add("text");
	mainOutputButton.addEventListener("click", () => {
		const index = findOscillatorIndexById(id)
		oscillators_old[index].mainOutput = !oscillators_old[index].mainOutput;
		const ledViews = document.getElementsByClassName("main-output-led")
		const ledView = ledViews[index]
		ledView.style.backgroundColor = oscillators_old[index].mainOutput ? "#19F1FF" : "#aaaaaa"
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
		oscillators_old.splice(index, 1)
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
	const noiseOscillatorNumber = oscillators_old.filter((oscillator) => oscillator.type === "noise").length + 1
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

	oscillators_old.push(noiseModel)
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
		effects_old[index].amount = getUnscaledSliderValue(event.target.value);
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
		effects_old[index].mainBus = !effects_old[index].mainBus;
		const ledViews = document.getElementsByClassName("main-bus-led")
		const ledView = ledViews[index]
		ledView.style.backgroundColor = effects_old[index].mainBus ? "#19F1FF" : "#aaaaaa"
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
	mainOutputButton.innerHTML = "Main out";
	mainOutputButton.classList.add("main-output-button");
	mainOutputButton.classList.add("text");
	mainOutputButton.addEventListener("click", () => {
		const index = findEffectIndexById(id)
		effects_old[index].mainOutput = !effects_old[index].mainOutput;
		const ledViews = document.getElementsByClassName("effects-main-output-led")
		const ledView = ledViews[index]
		ledView.style.backgroundColor = effects_old[index].mainOutput ? "#19F1FF" : "#aaaaaa"
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
		effects_old.splice(index, 1)
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

function addDelayViewFromModel(model) {
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

	const timeSection = document.createElement("div");
	timeSection.classList.add("time-section");
	effectView.appendChild(timeSection);

	const timeLabel = document.createElement("div");
	timeLabel.innerHTML = "Time";
	timeLabel.classList.add("time-label");
	timeLabel.classList.add("text");
	timeSection.appendChild(timeLabel);

	const timeControl = document.createElement("input");
	timeControl.type = "range";
	timeControl.min = 0;
	timeControl.max = 1000;
	timeControl.value = sliderDefaultViewValue;
	timeControl.classList.add("delay-time-control");
	timeControl.addEventListener("input", (event) => {
		const index = findEffectIndexById(id)
		effects[index].time = getUnscaledSliderValue(event.target.value);
		updateOscilloscope()
	})

	timeSection.appendChild(timeControl);

	const feedbackSection = document.createElement("div");
	feedbackSection.classList.add("feedback-section");
	effectView.appendChild(feedbackSection);

	const feedbackLabel = document.createElement("div");
	feedbackLabel.innerHTML = "Feedback";
	feedbackLabel.classList.add("feedback-label");
	feedbackLabel.classList.add("text");
	feedbackSection.appendChild(feedbackLabel);

	const feedbackControl = document.createElement("input");
	feedbackControl.type = "range";
	feedbackControl.min = 0;
	feedbackControl.max = 1000;
	feedbackControl.value = sliderDefaultViewValue;
	feedbackControl.classList.add("delay-feedback-control");
	feedbackControl.addEventListener("input", (event) => {
		const index = findEffectIndexById(id)
		effects[index].feedback = getUnscaledSliderValue(event.target.value);
		updateOscilloscope()
	})

	feedbackSection.appendChild(feedbackControl);

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
		effects_old.splice(index, 1)
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

function addCompressorViewFromModel(model) {
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
	
	const thresholdSection = document.createElement("div");
	thresholdSection.classList.add("threshold-section");
	effectView.appendChild(thresholdSection);

	const thresholdLabel = document.createElement("div");
	thresholdLabel.innerHTML = "Threshold";
	thresholdLabel.classList.add("threshold-label");
	thresholdLabel.classList.add("text");
	thresholdSection.appendChild(thresholdLabel);

	const thresholdControl = document.createElement("input");
	thresholdControl.type = "range";
	thresholdControl.min = 0;
	thresholdControl.max = 1000;
	thresholdControl.value = sliderDefaultViewValue;
	thresholdControl.classList.add("compressor-threshold-control");
	thresholdControl.addEventListener("input", (event) => {
		const index = findEffectIndexById(id)
		effects[index].threshold = getUnscaledSliderValue(event.target.value);
		updateOscilloscope()
	})

	thresholdSection.appendChild(thresholdControl);

	const ratioSection = document.createElement("div");
	ratioSection.classList.add("ratio-section");
	effectView.appendChild(ratioSection);

	const ratioLabel = document.createElement("div");
	ratioLabel.innerHTML = "Ratio";
	ratioLabel.classList.add("ratio-label");
	ratioLabel.classList.add("text");
	ratioSection.appendChild(ratioLabel);

	const ratioControl = document.createElement("input");
	ratioControl.type = "range";
	ratioControl.min = 0;
	ratioControl.max = 1000;
	ratioControl.value = sliderDefaultViewValue;
	ratioControl.classList.add("compressor-ratio-control");
	ratioControl.addEventListener("input", (event) => {
		const index = findEffectIndexById(id)
		effects[index].ratio = getUnscaledSliderValue(event.target.value);
		updateOscilloscope()
	})
	ratioSection.appendChild(ratioControl);

	const attackSection = document.createElement("div");
	attackSection.classList.add("attack-section");
	effectView.appendChild(attackSection);

	const attackLabel = document.createElement("div");
	attackLabel.innerHTML = "Attack";
	attackLabel.classList.add("attack-label");
	attackLabel.classList.add("text");
	attackSection.appendChild(attackLabel);

	const attackControl = document.createElement("input");
	attackControl.type = "range";
	attackControl.min = 0;
	attackControl.max = 1000;
	attackControl.value = sliderDefaultViewValue;
	attackControl.classList.add("compressor-attack-control");
	attackControl.addEventListener("input", (event) => {
		const index = findEffectIndexById(id)
		effects[index].attack = getUnscaledSliderValue(event.target.value);
		updateOscilloscope()
	})
	attackSection.appendChild(attackControl);

	const releaseSection = document.createElement("div");
	releaseSection.classList.add("release-section");
	effectView.appendChild(releaseSection);

	const releaseLabel = document.createElement("div");
	releaseLabel.innerHTML = "Release";
	releaseLabel.classList.add("release-label");
	releaseLabel.classList.add("text");
	releaseSection.appendChild(releaseLabel);

	const releaseControl = document.createElement("input");
	releaseControl.type = "range";
	releaseControl.min = 0;
	releaseControl.max = 1000;
	releaseControl.value = sliderDefaultViewValue;
	releaseControl.classList.add("compressor-release-control");
	releaseControl.addEventListener("input", (event) => {
		const index = findEffectIndexById(id)
		effects[index].release = getUnscaledSliderValue(event.target.value);
		updateOscilloscope()
	})
	releaseSection.appendChild(releaseControl);

	const routingSection = document.createElement("div");
	routingSection.classList.add("routing-section");
	effectView.appendChild(routingSection);

	const mainBusSection = document.createElement("div");
	mainBusSection.classList.add("main-bus-section");
	/* 
	 * Disabled for now. For this to be useful, it should disable the ordinary (bypassed) signal
	 * and allow for reordering of effects.
	 */

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
	effectView.appendChild(mainOutputSection);

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
		effects_old.splice(index, 1)
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

function addBitCrusherViewFromModel(model) {
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

	const bitDepthSection = document.createElement("div");
	bitDepthSection.classList.add("bit-depth-section");
	effectView.appendChild(bitDepthSection);

	const bitDepthLabel = document.createElement("div");
	bitDepthLabel.innerHTML = "Bit depth";
	bitDepthLabel.classList.add("bit-depth-label");
	bitDepthLabel.classList.add("text");
	bitDepthSection.appendChild(bitDepthLabel);

	const bitDepthControl = document.createElement("input");
	bitDepthControl.type = "range";
	bitDepthControl.min = 0;
	bitDepthControl.max = 1000;
	bitDepthControl.value = sliderDefaultViewValue;
	bitDepthControl.classList.add("bit-depth-control");
	bitDepthControl.addEventListener("input", (event) => {
		const index = findEffectIndexById(id)
		effects[index].bitDepth = getUnscaledSliderValue(event.target.value);
		updateOscilloscope()
	})
	bitDepthSection.appendChild(bitDepthControl);

	const sampleRateSection = document.createElement("div");
	sampleRateSection.classList.add("sample-rate-section");
	effectView.appendChild(sampleRateSection);
	
	const sampleRateLabel = document.createElement("div");
	sampleRateLabel.innerHTML = "Sample rate";
	sampleRateLabel.classList.add("sample-rate-label");
	sampleRateLabel.classList.add("text");
	sampleRateSection.appendChild(sampleRateLabel);
	
	const sampleRateControl = document.createElement("input");
	sampleRateControl.type = "range";
	sampleRateControl.min = 0;
	sampleRateControl.max = 1000;
	sampleRateControl.value = sliderDefaultViewValue;
	sampleRateControl.classList.add("bit-crusher-sample-rate-control");
	sampleRateControl.addEventListener("input", (event) => {
		const index = findEffectIndexById(id)
		effects[index].sampleRate = getUnscaledSliderValue(event.target.value);
		updateOscilloscope()
	})
	sampleRateSection.appendChild(sampleRateControl);

	const routingSection = document.createElement("div");
	routingSection.classList.add("routing-section");
	effectView.appendChild(routingSection);

	const mainBusSection = document.createElement("div");
	mainBusSection.classList.add("main-bus-section");
	
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
	effectView.appendChild(mainOutputSection);

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
		effects_old.splice(index, 1)
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
	let nameNumber = effects_old.filter((effect) => effect.type === "distortion").length + 1;
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
	effects_old.push(effectModel)

	addDistortionViewFromModel(effectModel)
}


function addDelay() {
	let id = generateNewDeviceId();
	let nameNumber = effects_old.filter((effect) => effect.type === "delay").length + 1;
	let name = "Delay " + nameNumber;
	let sliderDefaultViewValue = 500
	let effectModel = {
		id: id,
		type: "delay",
		name: name,
		time: getUnscaledSliderValue(sliderDefaultViewValue),
		feedback: getUnscaledSliderValue(sliderDefaultViewValue),
		history: [],
		mainBus: false,
		mainOutput: true,
		inputValue: 0,
		previousValue: 0
	}
	effects_old.push(effectModel)

	addDelayViewFromModel(effectModel)
}

function addCompressor() {
	let id = generateNewDeviceId();
	let nameNumber = effects_old.filter((effect) => effect.type === "compressor").length + 1;
	let name = "Compressor " + nameNumber;
	let sliderDefaultViewValue = 500	
	let effectModel = {
		id: id,
		type: "compressor",
		name: name,
		threshold: getUnscaledSliderValue(sliderDefaultViewValue),
		ratio: getUnscaledSliderValue(sliderDefaultViewValue),
		attack: getUnscaledSliderValue(sliderDefaultViewValue),
		release: getUnscaledSliderValue(sliderDefaultViewValue),
		mainBus: false,
		mainOutput: true,
		inputValue: 0,
		previousValue: 0,
		history: [],
		triggered: false,
		triggeredSampleIndex: 0,
		firstConsecutiveTriggerSampleIndex: 0
	}
	effects_old.push(effectModel)

	addCompressorViewFromModel(effectModel)
}

function addBitCrusher() {
	let id = generateNewDeviceId();
	let nameNumber = effects_old.filter((effect) => effect.type === "bitCrusher").length + 1;
	let name = "Bit Crusher " + nameNumber;
	let sliderDefaultViewValue = 500
	let effectModel = {
		id: id,
		type: "bitCrusher",
		name: name,
		bitDepth: getUnscaledSliderValue(sliderDefaultViewValue),
		sampleRate: getUnscaledSliderValue(sliderDefaultViewValue),
		mainBus: false,
		mainOutput: true,
		timedSignalX: 0,
		inputValue: 0,
		previousValue: 0
	}
	effects_old.push(effectModel)
	addBitCrusherViewFromModel(effectModel)
}

function findConnectionIndexById(id) {
	return connections_old.findIndex((connection) => connection.id === id)
}

function findEffectIndexById(id) {
	return effects_old.findIndex((effect) => effect.id === id)
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
			connections_old[i].source = 0
		}

		if (destinationSelector.value == id) {
			destinationSelector.value = 0
			connections_old[i].destination = 0
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
		console.log("Name: " + name + " ID: " + id)
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
	const connection = connections_old[i]
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
	} else if (destination.type == "delay") {
		modulatableParameters = ["inputValue", "time", "feedback"]
		titles = ["Input", "Time", "Feedback"]
	} else if (destination.type == "compressor") {
		modulatableParameters = ["inputValue", "threshold", "ratio", "attack", "release"]
		titles = ["Input", "Threshold", "Ratio", "Attack", "Release"]
	} else if (destination.type == "bitCrusher") {
		modulatableParameters = ["inputValue", "bitDepth", "sampleRate"]
		titles = ["Input", "Bit depth", "Sample rate"]
	}

	for (let i = 0; i < modulatableParameters.length; i++) {
		const destinationParameterOption = document.createElement("option");
		destinationParameterOption.text = titles[i];
		destinationParameterOption.value = modulatableParameters[i];
		destinationParameterSelector.appendChild(destinationParameterOption);
	}

	if (modulatableParameters.includes(connections_old[i].destinationParameter)) {
		destinationParameterSelector.value = connections_old[i].destinationParameter
	} else {
		connections_old[i].destinationParameter = destinationParameterSelector.value
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

function onAddDelayClicked() {
	addDelay()
	updateOscilloscope()
}

function onAddCompressorClicked() {
	addCompressor()
	updateOscilloscope()
}

function onAddBitCrusherClicked() {
	addBitCrusher()
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
	const oscillatorIds = oscillators_old.map((oscillator) => oscillator.id)
	const effectIds = effects_old.map((effect) => effect.id)
	connectionePartyDeviceIdsCache = oscillatorIds.concat(effectIds)
	connectionPartyNamesCache = oscillators_old.map((oscillator) => oscillator.name)
		.concat(effects_old.map((_, index) => "Effect " + (index + 1)))
}

function getConnectionPartyDeviceWithId(id) {
	const oscillator = oscillators_old.find((oscillator) =>  {
			let idMatch = oscillator.id == id
			return idMatch
	})
	if (oscillator) {
		return oscillator
	}

	const effect = effects_old.find((effect) => effect.id == id)
	if (effect) {
		return effect
	}

	return null
}

function setPropertyOfConnectionPartyDeviceWithId(id, property, value) {
	const oscillator = oscillators_old.find((oscillator) => oscillator.id === id)
	if (oscillator) {
		oscillator[property] = value
		return
	}

	const effect = effects_old.find((effect) => effect.id === id)
	if (effect) {
		effect[property] = value
		return
	}
}

function updateControlViews() {
	for (let i = 0; i < oscillators_old.length; i++) {
		const oscillator = oscillators_old[i]
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
	
	for (let i = 0; i < connections_old.length; i++) {
		const connection = connections_old[i]
		const connectionView = document.getElementsByClassName("connection")[i]
		const amountInput = connectionView.getElementsByTagName("input")[0]
		
		amountInput.value = connectionAmountScalableParameterType.getSliderForUnscaledValue(connection.amount)
	}

	for (let i = 0; i < effects_old.length; i++) {
		const effect = effects_old[i]

		if (effect.type == "distortion") {
			const effectView = document.getElementsByClassName("effect")[i]
			const amountInput = effectView.getElementsByTagName("input")[0]
			
			amountInput.value = distortionAmountScalableParameterType.getSliderForUnscaledValue(effect.amount)

			const mainOutputLED = effectView.getElementsByClassName("effects-main-output-led")[0]
			mainOutputLED.style.backgroundColor = effect.mainOutput ? "#19F1FF" : "#aaaaaa"
		} else if (effect.type == "delay") {
			const effectView = document.getElementsByClassName("effect")[i]
			const timeInput = effectView.getElementsByTagName("input")[0]
			const feedbackInput = effectView.getElementsByTagName("input")[1]
			
			timeInput.value = delayTimeScalableParameterType.getSliderForUnscaledValue(effect.time)
			feedbackInput.value = delayTimeScalableParameterType.getSliderForUnscaledValue(effect.feedback)

			const mainOutputLED = effectView.getElementsByClassName("effects-main-output-led")[0]
			mainOutputLED.style.backgroundColor = effect.mainOutput ? "#19F1FF" : "#aaaaaa"
		} else if (effect.type == "compressor") {
			const effectView = document.getElementsByClassName("effect")[i]
			const thresholdInput = effectView.getElementsByTagName("input")[0]
			const ratioInput = effectView.getElementsByTagName("input")[1]
			const attackInput = effectView.getElementsByTagName("input")[2]
			const releaseInput = effectView.getElementsByTagName("input")[3]	
			
			thresholdInput.value = compressorThresholdScalableParameterType.getSliderForUnscaledValue(effect.threshold)
			ratioInput.value = compressorRatioScalableParameterType.getSliderForUnscaledValue(effect.ratio)
			attackInput.value = compressorAttackScalableParameterType.getSliderForUnscaledValue(effect.attack)
			releaseInput.value = compressorReleaseScalableParameterType.getSliderForUnscaledValue(effect.release)

			const mainOutputLED = effectView.getElementsByClassName("effects-main-output-led")[0]
			mainOutputLED.style.backgroundColor = effect.mainOutput ? "#19F1FF" : "#aaaaaa"
		} else if (effect.type == "bitCrusher") {
			const effectView = document.getElementsByClassName("effect")[i]
			const bitDepthInput = effectView.getElementsByTagName("input")[0]
			const sampleRateInput = effectView.getElementsByTagName("input")[1]
			
			bitDepthInput.value = bitCrusherBitDepthScalableParameterType.getSliderForUnscaledValue(effect.bitDepth)
			sampleRateInput.value = bitCrusherSampleRateScalableParameterType.getSliderForUnscaledValue(effect.sampleRate)

			const mainOutputLED = effectView.getElementsByClassName("effects-main-output-led")[0]
			mainOutputLED.style.backgroundColor = effect.mainOutput ? "#19F1FF" : "#aaaaaa"

			const mainBusLED = effectView.getElementsByClassName("main-bus-led")[0]
			mainBusLED.style.backgroundColor = effect.mainBus ? "#19F1FF" : "#aaaaaa"
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

function onSavePresetClicked() {
	const presetObject = {
		oscillators: oscillators.map((e) => {return e.getPresetObject()}),
		connections: connections.map((e) => {return e.getPresetObject()}),
		effects: effects.map((e) => {return e.getPresetObject()})
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
			if (parameter instanceof ModulatableParameter) {
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
	oscillatorsView.innerHTML = ""
	effectsView.innerHTML = ""
	connectionsView.innerHTML = ""
}

const setSynthFromPresetObject = (presetObject) => {
	clearPreset()

	let devices = presetObject.oscillators.concat(presetObject.effects).concat(presetObject.connections).concat(presetObject.otherDevices)
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
			device.parameters.from.dropdown.value = presetDevice.parameters.from
			device.parameters.to.dropdown.value = presetDevice.parameters.to
			device.updateParameterSelector()
			device.parameters.parameter.dropdown.value = presetDevice.parameters.parameter
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

function updateConnectionDropdownSelectionsFromModel() {
	const sourceSelectors = document.getElementsByClassName("source-selector")
	const destinationSelectors = document.getElementsByClassName("destination-selector")
	const destinationParameterSelectors = document.getElementsByClassName("destination-parameter-selector")

	for (let i = 0; i < connections_old.length; i++) {
		const connection = connections_old[i]
		const sourceSelector = sourceSelectors[i]
		const destinationSelector = destinationSelectors[i]
		const destinationParameterSelector = destinationParameterSelectors[i]

		sourceSelector.value = connection.source
		destinationSelector.value = connection.destination
		destinationParameterSelector.value = connection.destinationParameter
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
	const device = new deviceType()
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

function getOutputDevices() {
    return oscillators.concat(effects).concat(otherDevices)
}

function getNonConnectionDevices() {
	return oscillators.concat(effects).concat(otherDevices)
}

function onDeviceChanged() {
	updateOscilloscope();
}

addTapOutHandler()
oscilloscope.appendToView(oscilloscopeContainer);
updateMainVolumeSliderFromModel();
addOscillator();
//addConnection();
setTab(0);
updateOscilloscope();

// Test setup
if (testCompressor) {
	clearPreset()
	setTab(2)
	addDevice(OscillatorProper)
	addDevice(Compressor)

	addDevice(Connection)
	connections[0].parameters.to.dropdown.value="1"
	connections[0].updateParameterSelector()
	connections[0].parameters.parameter.dropdown.value="4"
	connections[0].parameters.amount.value = 1
	oscillators[0].goesToMainOutput = false
	oscillators[0].parameters.amplitude.value = 1
	let oscilloscopePeriod = 1 / oscillatorWidthsPerSecond
	effects[0].parameters.attack.value = 0.25 * oscilloscopePeriod * 1000
	effects[0].parameters.release.value = 1 * oscilloscopePeriod * 1000
	effects[0].parameters.threshold.value = 0.1

	updateOscilloscope();
}

if (testEnvelopeFollower) {
	clearPreset()
	setTab(3)
	addDevice(OscillatorProper)
	addDevice(EnvelopeFollower)

	addDevice(Connection)
	connections[0].parameters.to.dropdown.value="1"
	connections[0].updateParameterSelector()
	connections[0].parameters.parameter.dropdown.value="4"
	connections[0].parameters.amount.value = 1
	oscillators[0].goesToMainOutput = false
	oscillators[0].parameters.amplitude.value = 1

	updateOscilloscope();
}