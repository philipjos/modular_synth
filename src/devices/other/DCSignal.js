class DCSignal extends OtherDevice {
    static typeDisplayName = "DC signal"
    static typeId = "dc_signal"

    constructor(objectIDManager) {
        super(objectIDManager)

        this.setParametersAndSetup({
            value: new NumericalParameter(
                objectIDManager,
                "Value",
                -1,
                1,
                0,
                0
            )
        })
    }

    calculateOutput() {
        return this.parameters.value.getModulatedValue()
    }
}