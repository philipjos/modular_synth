class Parameter extends View {
    constructor(
        typeId,
        typeDisplayName,
        min,
        max,
        defaultValue,
        step
    ) {
        super()
        this.typeId = typeId
        this.typeDisplayName = typeDisplayName
        this.min = min
        this.max = max
        this.defaultValue = defaultValue
        this.step = step

        this.setupView()
    }

    setupView() {
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