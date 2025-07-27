class Effect extends OutputDevice {
    static typeDisplayName = "Effect"
    static typeId = "effect"

    constructor() {
        super()

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
        const input = this.input.getModulatedValue()
        return this.calculateOutputFromInput(input)
    }

    calculateOutputFromInput(input) {
        return input
    }
    
}