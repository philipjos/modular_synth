class NumericalParameter extends Parameter {
    constructor(
        id,
        displayName,
        min,
        max,
        defaultValue,
        step
    ) {
        super(id, displayName, min, max, defaultValue)
        this.step = step

        this.setupSubClassView()
    }

    setupSubClassView() {

        this.slider = document.createElement("input");
        this.slider.type = "range";
        this.slider.min = (this.min ?? 0).toString();
        this.slider.max = (this.max ?? 1).toString();
        if(this.step == 0) {
            this.slider.step = this.rangeDerivedValue / 1000
        } else {
            this.slider.step = this.step
        }
        this.slider.value = this.defaultValue;
        this.slider.classList.add("parameter-slider");
        this.slider.addEventListener("input", (event) => {
            this.value = event.target.value;
            this.externalOnChange()
        })

        this.view.appendChild(this.slider)
    }

    updateView() {
        this.slider.value = this.value
    }

}