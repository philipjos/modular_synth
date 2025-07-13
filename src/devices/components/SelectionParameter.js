class SelectionParameter extends Parameter {
    constructor(typeId, typeDisplayName) {
        super(typeId, typeDisplayName)

        this.options = []
        this.onChange = () => {}
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

    setOptionsAndUpdateDropdown(options) {
        this.options = options
        this.updateFromOptionsChanged()
    }

    updateFromOptionsChanged() {
        this.updateDropdown()
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
    
}