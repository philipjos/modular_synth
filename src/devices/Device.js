class Device extends View {
    static typeDisplayName = "Device"
    static typeId = "device"

    constructor() {
        super()

        this.displayName = ""

        this.view.style.backgroundColor = "#CCDDDF"
        this.view.style.borderRadius = "4px"
        
        this.titleView = document.createElement("div")
        this.titleView.style.fontSize = "16px"
        this.titleView.style.fontWeight = "bold"
        this.titleView.style.marginBottom = "10px"
        this.view.appendChild(this.titleView)

        this.parametersView = document.createElement("div")
        this.view.appendChild(this.parametersView)

        this.view.style.padding = "10px"
        this.view.style.position = "relative"
        this.view.style.top = "0px"

        const deleteButton = document.createElement("div");
        deleteButton.innerHTML = "x";
        deleteButton.classList.add("delete-button");
        deleteButton.addEventListener("click", () => {
        })
        this.view.appendChild(deleteButton)
    }

    setDeviceTitle(title) {
        this.titleView.innerHTML = title
        this.displayName = title
    }

    setParametersAndSetup(parameters) {
        this.parameters = parameters
        this.setupViewFromParameters()
    }

    setupViewFromParameters() {
        this.parametersView.innerHTML = ""

        for (let parameterKey in this.parameters) {
            let parameter = this.parameters[parameterKey]
            parameter.setBottomMargin(10)
            parameter.appendToView(this.parametersView)
        }
    }
}