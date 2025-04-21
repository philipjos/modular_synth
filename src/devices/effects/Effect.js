class Effect {
    static typeDisplayName = "Effect"
    static typeId = "effect"

    constructor() {
        this.view = new View()

        this.view.view.style.backgroundColor = "#CCDDDF"
        this.view.view.style.height = "100px"
        this.view.view.style.borderRadius = "4px"
        
        this.titleView = document.createElement("div")
        this.view.view.appendChild(this.titleView)

        this.parametersView = document.createElement("div")
        this.view.view.appendChild(this.parametersView)
    }

    appendToView(view) {
        this.view.appendToView(view)
    }

    setDeviceTitle(title) {
        this.titleView.innerHTML = title
    }

    setParametersAndSetup(parameters) {
        this.parameters = parameters
        this.setupViewFromParameters()
    }

    setupViewFromParameters() {
        this.parametersView.innerHTML = ""

        for (let parameterKey in this.parameters) {
            let parameter = this.parameters[parameterKey]
            parameter.appendToView(this.parametersView)
        }
    }
}