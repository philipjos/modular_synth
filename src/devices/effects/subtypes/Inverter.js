class Inverter extends Effect {
    static typeDisplayName = "Inverter"
    static typeId = "inverter"

    constructor(objectIDManager) {
        super(objectIDManager)

        this.setParametersAndSetup({
            polarity: new NumericalParameter(
                objectIDManager,
                "Polarity",
                -1,
                1,
                1,
                0
            )
        })
    }

    calculateOutputFromInput(input) {
        const polarity = this.parameters.polarity.getModulatedValue()
        return input * polarity
    }
}