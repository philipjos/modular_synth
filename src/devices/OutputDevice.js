class OutputDevice extends Device {
    constructor(objectIDManager) {
        super(objectIDManager)
        this.lastOutput = 0
        this.goesToMainOutput = true

        const mainOutputSection = document.createElement("div");
        mainOutputSection.classList.add("main-output-section");
        this.view.appendChild(mainOutputSection)

        const mainOutputButton = document.createElement("div");
        mainOutputButton.innerHTML = "Main out";
        mainOutputButton.classList.add("main-output-button");
        mainOutputButton.classList.add("text");
        mainOutputButton.addEventListener("click", (() => {
            this.goesToMainOutput = !this.goesToMainOutput
            this.onDeviceChanged()
            this.updateMainOutputLED()
        }).bind(this))
        mainOutputSection.appendChild(mainOutputButton)

        this.mainOutputLED = document.createElement("div");
        this.mainOutputLED.classList.add("main-output-led");
        mainOutputSection.appendChild(this.mainOutputLED)
    }

    calculateOutput() {
        return 0
    }

    updateMainOutputLED() {
        this.mainOutputLED.style.backgroundColor = this.goesToMainOutput ? "#19F1FF" : "#aaaaaa"
    }

    getPresetObject() {
        var object = super.getPresetObject()

        object.goesToMainOutput = this.goesToMainOutput

        return object
    }
}