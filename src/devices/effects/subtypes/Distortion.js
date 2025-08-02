class Distortion extends Effect {
    static typeDisplayName = "Distortion"
    static typeId = "distortion"

    constructor(objectIDManager) {
        super(objectIDManager)

        this.setParametersAndSetup({
            gain: new NumericalParameter(
                objectIDManager,
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