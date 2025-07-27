class Volume extends Effect {
    static typeDisplayName = "Volume"
    static typeId = "volume"

    constructor() {
        super()

        this.setParametersAndSetup({
            volume: new NumericalParameter(
                "volume",
                "Volume",
                0,
                1,
                1,
                0
            )
        })
    }

    calculateOutputFromInput(input) {
        const volume = this.parameters.volume.getModulatedValue()
        return input * volume
    }
}