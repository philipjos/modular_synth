class OscillatorProper extends Oscillator {
    static typeId = "oscillator_proper"
    static typeDisplayName = "Oscillator"

    constructor(objectIDManager, sampleRate) {
        super(objectIDManager, sampleRate)

        this.setParametersAndSetup({
            frequency: new NumericalParameter(
                objectIDManager,
                "Frequency",
                0,
                2000,
                440,
                0
            ),
            amplitude: new NumericalParameter(
                objectIDManager,
                "Amplitude",
                0,
                1,
                0.75,
                0
            ),
            phase: new NumericalParameter(
                objectIDManager,
                "Phase",
                0,
                360,
                0,
                0
            ),
            shape: new SelectionParameter(
                objectIDManager,
                "Shape",
                [
                    {
                        value: "sine",
                        label: "Sine"
                    },
                    {
                        value: "square",
                        label: "Square"
                    },
                    {
                        value: "triangle",
                        label: "Triangle"
                    },
                    {
                        value: "sawtooth",
                        label: "Sawtooth"
                    }
                ]
            ),
            partials: new NumericalParameter(
                objectIDManager,
                "Partials",
                1,
                37,
                37,
                0
            ),
            sync: new NumericalParameter(
                objectIDManager,
                "Sync",
                1,
                16,
                1,
                0
            ),
            syncPhase: new NumericalParameter(
                objectIDManager,
                "Sync phase",
                0,
                360,
                0,
                0
            )
        })

        this.parameters["shape"].setValueFromIndex(0)
        
        this.timedSignals["syncTime"] = new TimedSignal()
    }

    getAngle(x, phase) {
        return x * 2 * Math.PI + phase * Math.PI / 180
    }

    calculateOutput() {
        var output = 0

        const syncTime = this.timedSignals["syncTime"].x
        const syncPhase = this.parameters["syncPhase"].getModulatedValue()
        if (this.parameters["shape"].getModulatedValue() == 0) {
            const angle = this.getAngle(syncTime, syncPhase)
            output = Math.sin(angle)
        } else {
            let partials = this.parameters["partials"].getModulatedValue()
            if (partials > 36) {
                const x = syncTime + syncPhase / 360
                switch (this.parameters["shape"].getModulatedValue()) {
                    case 1:
                        output = ((x - Math.floor(x)) < 0.5)? 1 : -1
                        break
                    case 2:
                        output = 4 * Math.abs(x - Math.floor(x + 0.75) + 0.25) - 1
                        break
                    case 3:
                        output = (x - Math.floor(x)) * (-2) + 1
                        break
                }
            } else {
                const angle = this.getAngle(syncTime, syncPhase)
                let integerPartials = Math.floor(partials)
                for (let i = 1; i <= integerPartials; i++) {
                    
                    var partialFrequency = 1
                    var partialAmplitude = 1
    
                    switch (this.parameters["shape"].getModulatedValue()) {
                        case 1:
                            partialFrequency = 2 * i - 1
                            partialAmplitude = 4 / (Math.PI * partialFrequency)
                            break
                        case 2:
                            partialFrequency = 2 * i - 1
                            partialAmplitude = -8 * Math.pow(-1, i) / (Math.pow(Math.PI, 2) * Math.pow(partialFrequency, 2))
                            break
                        case 3:
                            partialFrequency = i
                            partialAmplitude = 2 / (Math.PI * partialFrequency)
                    }
                    
                    const partialX = angle * partialFrequency
                    const partialOutput = Math.sin(partialX) * partialAmplitude
                    output += partialOutput
                }
            }
        }

        output *= this.parameters["amplitude"].getModulatedValue()

        return output
    }

    setStepSizes(sampleRate) {
        super.setStepSizes(sampleRate)
        this.timedSignals["syncTime"].stepSize = this.timedSignals["mainTime"].stepSize * this.parameters["sync"].getModulatedValue()
    }

    advanceTime(sampleRate) {
        super.advanceTime(sampleRate)

        const phaseScaled = this.parameters["phase"].getModulatedValue() / 360

        
        if (this.timedSignals["mainTime"].x + phaseScaled >= 1) {
            const difference = (this.timedSignals["mainTime"].x + phaseScaled) - 1
            this.timedSignals["mainTime"].x = difference - phaseScaled
            this.timedSignals["syncTime"].x = difference * this.parameters["sync"].getModulatedValue()
        }
    }

    getMainTimeFrequency() {
        return this.parameters["frequency"].getModulatedValue()
    }

    resetTimedSignals() {
        super.resetTimedSignals()
        const phaseScaled = this.parameters["phase"].getModulatedValue() / 360
        const displacement = this.parameters["sync"].getModulatedValue() * phaseScaled
        this.timedSignals["syncTime"].x = displacement
    }
}