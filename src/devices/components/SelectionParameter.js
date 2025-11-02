class SelectionParameter extends Parameter {
    constructor(
        objectIDManager, 
        typeDisplayName, 
        options = undefined,
        defaultValue = null,
        modulatable = true
    ) {
        let maxValue = 0
        if (options && options.length > 0) {
            maxValue = options.length - 0.01
        }
        super(objectIDManager, typeDisplayName, 0, maxValue, defaultValue, modulatable)

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
            const previousValue = this.value;
            this.value = event.target.value;
            this.onChange(previousValue);
            this.externalOnChange();
        });
        this.dropdown.addEventListener("keydown", (event) => {
            if (this.dropdown.matches(":focus-visible")) {
                event.preventDefault()
            }
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
        let wasPreviousValueSet = false
        this.options.forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            this.dropdown.appendChild(optionElement);

            if (previousValue == option.value) {
                this.dropdown.value = option.value
                wasPreviousValueSet = true
            }
        });

        if (!wasPreviousValueSet && this.options.length > 0) {
            this.setValueFromIndex(0)
        }
        
    }

    randomize() {
        if (this.options.length > 0) {
            this.setValueFromIndex(Math.floor(Math.random() * this.options.length))
        }
    }

    getModulatedValue() {
        return Math.floor(super.getModulatedValue())
    }
    
    getValue() {
        return this.options.findIndex((e) => {return e.value == this.dropdown.value})
    }

    getMaxValueFromOptions(options) {
        
        return this.closestNumberBelow(options.length)
    }

    setValueFromIndex(index) {
        this.dropdown.value = this.options[index].value
    }

    closestNumberBelow(x) {
        if (Number.isNaN(x) || x === -Infinity) return x;
        if (x === 0) return -Number.MIN_VALUE;
        const buf = new DataView(new ArrayBuffer(8));
        buf.setFloat64(0, x);
        let bits = buf.getBigUint64(0);
        if (x > 0n) bits -= 1n;
        else bits += 1n;
        buf.setBigUint64(0, bits);
        return buf.getFloat64(0);
      }
}