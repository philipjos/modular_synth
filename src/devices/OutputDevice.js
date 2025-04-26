class OutputDevice extends Device {
    constructor() {
        super()
        this.lastOutput = 0
        this.mainOutput = true

        const mainOutputSection = document.createElement("div");
        mainOutputSection.classList.add("main-output-section");
        this.view.appendChild(mainOutputSection)

        const mainOutputButton = document.createElement("div");
        mainOutputButton.innerHTML = "Main out";
        mainOutputButton.classList.add("main-output-button");
        mainOutputButton.classList.add("text");
        mainOutputButton.addEventListener("click", () => {
            this.mainOutput = !this.mainOutput
        })
        mainOutputSection.appendChild(mainOutputButton)

        const mainOutputLED = document.createElement("div");
        mainOutputLED.classList.add("main-output-led");
        mainOutputSection.appendChild(mainOutputLED)
    }

    calculateOutput(t) {
        return 0
    }
}