class Distortion extends Effect {
    static typeDisplayName = "Distortion"
    static typeId = "distortion"

    constructor() {
        super()

        this.setParametersAndSetup({
            gain: new NumericalParameter(
                "gain",
                "Gain",
                1,
                10,
                1.5,
                0
            )
        })
    }

    calculateOutputFromInput(input) {
        const gain = this.parameters.gain.getModulatedValue()
        return Math.max(-1, Math.min(1, input * gain))
    }
}