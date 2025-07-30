class OscillatorProper extends Oscillator {
    static typeId = "oscillator_proper"
    static typeDisplayName = "Oscillator"

    constructor(sampleRate) {
        super(sampleRate)

        this.setParametersAndSetup({
            frequency: new NumericalParameter(
                "frequency",
                "Frequency",
                0,
                2000,
                440,
                0
            ),
            amplitude: new NumericalParameter(
                "amplitude",
                "Amplitude",
                0,
                1,
                0.75,
                0
            ),
            phase: new NumericalParameter(
                "phase",
                "Phase",
                0,
                360,
                0,
                0
            ),
            shape: new SelectionParameter(
                "shape",
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
                "partials",
                "Partials",
                1,
                35,
                35,
                0
            ),
            sync: new NumericalParameter(
                "sync",
                "Sync",
                1,
                16,
                1,
                0
            ),
            syncPhase: new NumericalParameter(
                "syncPhase",
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

    calculateOutput() {
        var output = 0
        
        const phasedX = this.timedSignals["syncTime"].x * 2 * Math.PI
            + this.parameters["syncPhase"].getModulatedValue() * Math.PI / 180

        if (this.parameters["shape"].getModulatedValue() == 0) {
            output = Math.sin(phasedX)
        } else {
            for (let i = 1; i <= this.parameters["partials"].getModulatedValue(); i++) {
                
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
                
                const partialX = phasedX * partialFrequency
                const partialOutput = Math.sin(partialX) * partialAmplitude
                output += partialOutput
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
            this.timedSignals["mainTime"].x = -phaseScaled
            this.timedSignals["syncTime"].x = 0
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