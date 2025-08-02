class Parameter extends ViewWithID {
    
    constructor(
        objectIDManager,
        displayName,
        min = 0, 
        max = 100, 
        defaultValue = null,
        modulatable = true
    ) {
        super(objectIDManager)
        
        this.displayName = displayName
        this.modulatable = modulatable
        this.externalOnChange = () => {}

        this.setupView()

        this.modulationDelta = 0
        this.min = min      
        this.max = max
        this.updateRangeDerivedValue()
        this.updateMiddleDerivedValue()

        this.defaultValue = defaultValue ?? this.middleDerivedValue 
        
        this.value = this.defaultValue
    }

    setupView() {
        this.titleView = document.createElement("div")
        this.titleView.innerHTML = this.displayName
        this.view.appendChild(this.titleView)
    }

    setBottomMargin(margin) {
        this.view.style.marginBottom = margin + "px"
    }

    setOnChange(value) {
        this.externalOnChange = value
    }

    updateView() {
    }

    getPresetValue() {
        return this.getValue()
    }

    getModulatedValue() {
        const scaledModulationDelta = this.modulationDelta * this.rangeDerivedValue / 2
        let output = parseFloat(this.getValue()) + scaledModulationDelta
        output = Math.max(this.min, Math.min(this.max, output))

        return output
    }

    updateRangeDerivedValue() {
        this.rangeDerivedValue = parseFloat(this.max) - parseFloat(this.min)
    }

    updateMiddleDerivedValue() {
        this.middleDerivedValue = this.rangeDerivedValue / 2 + this.min
    }

    getValue() {
        return this.value
    }
}