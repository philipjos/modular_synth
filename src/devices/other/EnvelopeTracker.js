class EnvelopeTracker extends OtherDevice {
    static typeDisplayName = "Envelope tracker"
    static typeId = "envelope_tracker"

    constructor(sampleRate) {
        super();
        this.sampleRate = sampleRate;
        this.memory = [];

        this.setParametersAndSetup({
            bias: new SelectionParameter(
                "bias",
                "Bias",
                [
                    {
                        label: "Up",
                        value: "up"
                    },
                    {
                        label: "None",
                        value: "none"
                    },
                    {
                        label: "Down",
                        value: "down"
                    }
                ]
            ),
            attack: new NumericalParameter(
                "attack",
                "Attack",
                0,
                2000,
                0.1,
                0
            ),
            release: new NumericalParameter(
                "release",
                "Release",
                0,
                2000,
                0.1,
                0
            )
        })

        this.input = new NumericalParameter(
            "input",
            "Input",
            -1,
            1,
            0,
            0
        )

        this.nonDisplayedParameters = {
            "input": this.input
        }
    }

    calculateOutput() {
        const input = this.nonDisplayedParameters.input.getModulatedValue();
        let output = input;

        return output;
    }

    resetForCalculations() {
        this.memory = [];
    }
}