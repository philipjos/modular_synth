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

        this.setupSubClassView()
    }

    setupSubClassView() {

        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = (this.min ?? 0).toString();
        slider.max = (this.max ?? 1).toString();
        if(this.step == 0) {
            const range = slider.max - slider.min
            this.step = range / 1000
        } else {
            slider.step = this.step
        }
        slider.value = this.defaultValue;
        slider.classList.add("parameter-slider");
        slider.addEventListener("input", (event) => {
            const sliderValue = event.target.value;
            this.value = sliderValue /// 100 * this.
            console.log("Setting value to:", this.value)
            this.externalOnChange()
        })

        this.view.appendChild(slider)
    }

}