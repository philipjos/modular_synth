class NumericalParameter extends ModulatableParameter {
    constructor(
        id,
        displayName,
        min,
        max,
        defaultValue,
        step
    ) {
        super(id, displayName)
        this.min = min
        this.max = max
        this.defaultValue = defaultValue
        this.value = defaultValue
        this.step = step
    }

    setupView() {
        super.setupView()

        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = this.min;
        slider.max = this.max;
        slider.value = this.defaultValue;
        slider.classList.add("parameter-slider");
        slider.addEventListener("input", (event) => {
            this.value = event.target.value;
        })

        this.view.appendChild(slider)
    }

}