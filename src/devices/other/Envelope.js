class Envelope extends OtherDevice {
    static typeDisplayName = "Envelope"
    static typeId = "envelope"

    constructor(objectIDManager) {
        super(objectIDManager)

        this.setParametersAndSetup({
            attack: new NumericalParameter(
                objectIDManager,
                "Attack",
                0,
                2,
                0.1,
                0
            ),
            decay: new NumericalParameter(
                objectIDManager,
                "Decay",
                0,
                2,
                0.1,
                0
            ),
            sustain: new NumericalParameter(
                objectIDManager,
                "Sustain",
                0,
                1,
                1,
                0
            )
        })

        this.input = new NumericalParameter(
            objectIDManager,
            "Input",
            -1,
            1,
            0,
            0
        )

        this.nonDisplayedParameters = {
            "input": this.input
        }

        this.timedSignals["mainTime"] = new TimedSignal(1)
    }

    calculateOutput() {
        let timeInSeconds = this.timedSignals["mainTime"].x / this.sampleRate
        let attack = this.parameters.attack.getModulatedValue()
        let decay = this.parameters.decay.getModulatedValue()
        let sustain = this.parameters.sustain.getModulatedValue()
        let unipolar = 0
        if (timeInSeconds < attack) {
            unipolar = (timeInSeconds / attack)
        } else if (timeInSeconds < attack + decay) {
            unipolar = (1 - (timeInSeconds - attack) / decay) * (1 - sustain) + sustain
        } else {
            unipolar = sustain
        }
        let output = unipolar * 2 - 1

        return output
    }
}