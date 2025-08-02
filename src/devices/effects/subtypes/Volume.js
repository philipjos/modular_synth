class Volume extends Effect {
    static typeDisplayName = "Volume"
    static typeId = "volume"

    constructor(objectIDManager) {
        super(objectIDManager)

        this.setParametersAndSetup({
            volume: new NumericalParameter(
                objectIDManager,
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