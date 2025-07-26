class ModulatableParameter extends Parameter {
    constructor(
        id, 
        displayName, 
        min = 0, 
        max = 100, 
        defaultValue = null) {
        super(id, displayName)

        this.modulationDelta = 0
        this.min = min
        this.max = max
        this.updateRangeDerivedValue()
        this.updateMiddleDerivedValue()

        this.defaultValue = defaultValue ?? this.middleDerivedValue 
        
        this.value = this.defaultValue
    }

    getModulatedValue() {
        const scaledModulationDelta = this.modulationDelta * this.rangeDerivedValue / 2
        let output = parseFloat(this.value) + scaledModulationDelta
        output = Math.max(this.min, Math.min(this.max, output))

        return output
    }

    updateRangeDerivedValue() {
        this.rangeDerivedValue = parseFloat(this.max) - parseFloat(this.min)
    }

    updateMiddleDerivedValue() {
        this.middleDerivedValue = this.rangeDerivedValue / 2 + this.min
    }
}