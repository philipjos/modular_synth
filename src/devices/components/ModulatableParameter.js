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
        if (defaultValue == null) {
            this.defaultValue = this.rangeDerivedValue / 2 + this.min
        } else {
            this.defaultValue = defaultValue
        }
        
        this.value = this.defaultValue
    }

    getModulatedValue() {
        //console.log("getModulatedValue")
        const scaledModulationDelta = this.modulationDelta * this.rangeDerivedValue
        const output = parseFloat(this.value) + scaledModulationDelta
        //console.log(this.modulationDelta, this.rangeDerivedValue, parseFloat(this.value), scaledModulationDelta, output)
        return output
    }

    updateRangeDerivedValue() {
        this.rangeDerivedValue = parseFloat(this.max) - parseFloat(this.min)
    }
}