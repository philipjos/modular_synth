class SelectionParameter extends Parameter {
    constructor(
        typeId, 
        typeDisplayName, 
        options = undefined,
        modulatable = true
    ) {
        let maxValue = 0
        if (options && options.length > 0) {
            maxValue = options.length - 0.01
        }
        super(typeId, typeDisplayName, 0, maxValue, modulatable)

        this.options = []
        this.onChange = () => {}

        if (options) {
            this.setOptionsAndUpdate(options)
        }
    }

    setupView() {
        super.setupView()

        this.dropdown = document.createElement("select");
        this.dropdown.classList.add("parameter-dropdown");
        this.dropdown.addEventListener("change", (event) => {
            this.value = event.target.value;
            this.onChange();
            this.externalOnChange();
        });
        this.view.appendChild(this.dropdown)
    }

    addOptionAndUpdateDropdown(option) {
        this.options.push(option)
        this.updateFromOptionsChanged()
    }

    setOptionsAndUpdate(options) {
        this.options = options
        this.updateFromOptionsChanged()
    }

    updateFromOptionsChanged() {
        this.updateDropdown()
        this.max = this.getMaxValueFromOptions(this.options)
        this.updateRangeDerivedValue()
        this.updateMiddleDerivedValue()
        this.onChange()
    }

    updateDropdown() {
        const previousValue = this.dropdown.value
        this.dropdown.innerHTML = ""
        this.options.forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            this.dropdown.appendChild(optionElement);

            if (previousValue == option.value) {
                this.dropdown.value = option.value
            }
        });
    }

    randomize() {
        if (this.options.length > 0) {
            this.dropdown.value = this.options[Math.floor(Math.random() * this.options.length)].value
        }
    }

    getPresetvalue() {
        return this.dropdown.value
    }
    
    getValue() {
        return this.options.findIndex((e) => {return e.value == this.dropdown.value})
    }

    getMaxValueFromOptions(options) {
        return options.length - 0.01
    }
}