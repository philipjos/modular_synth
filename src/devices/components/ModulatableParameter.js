class ModulatableParameter extends Parameter {
    constructor(id, displayName) {
        super(id, displayName)

        this.modulationDelta = 0
    }

    getModulatedValue() {
        return parseFloat(this.value) + this.modulationDelta
    }
}