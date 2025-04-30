class NumericalParameter extends ModulatableParameter {
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

        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = (this.min ?? 0).toString();
        slider.max = (this.max ?? 1).toString();
        if(this.step == 0) {
            slider.step = this.rangeDerivedValue / 1000
        } else {
            slider.step = this.step
        }
        slider.value = this.defaultValue;
        slider.classList.add("parameter-slider");
        slider.addEventListener("input", (event) => {
            this.value = event.target.value;
            this.externalOnChange()
        })

        this.view.appendChild(slider)
    }

}