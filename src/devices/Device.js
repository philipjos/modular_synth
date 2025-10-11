class Device extends ViewWithID {
    static typeDisplayName = "Device"
    static typeId = "device"

    onDeletePressed = undefined

    constructor(objectIDManager) {
        super(objectIDManager)

        this.displayName = ""
        this.timedSignals = {}
        this.onDeviceChanged = () => {}

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
        this.view.style.width = "100%"
        this.view.style.boxSizing = "border-box"

        const deleteButton = document.createElement("div");
        deleteButton.innerHTML = "x";
        deleteButton.classList.add("delete-button");
        deleteButton.addEventListener("click", () => {
            if (this.onDeletePressed) {
                this.onDeletePressed()
            }
        })
        this.view.appendChild(deleteButton)
    
        this.nonDisplayedParameters = {}
    }

    setDeviceTitle(title) {
        this.titleView.innerHTML = title
        this.displayName = title
    }

    setParametersAndSetup(parameters) {
        this.parameters = parameters
        this.updateParametersWithOnDeviceChanged()
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

    updateParametersWithOnDeviceChanged() {
        for (let parameterKey in this.parameters) {
            let parameter = this.parameters[parameterKey]
            parameter.setOnChange(this.onDeviceChanged)
        }
    }

    setOnDeviceChanged(value) {
        this.onDeviceChanged = value
        this.updateParametersWithOnDeviceChanged()
    }
    

    resetForCalculations() {
        this.resetModulationDeltas()
        this.resetTimedSignals()
    }

    resetTimedSignals() {
        for (let key in this.timedSignals) {
            const timedSignal = this.timedSignals[key]
            timedSignal.reset()
        }
    }

    resetModulationDeltas() {
        const parameters = this.parameters
        for (let parametersDict of [parameters, this.nonDisplayedParameters]) {
            for (let key in parametersDict) {
                parametersDict[key].modulationDelta = 0
            }
        }
    }

    advanceTime(sampleRate) {
        for (let key in this.timedSignals) {
            const timedSignal = this.timedSignals[key]
            timedSignal.advanceTime()
        }
    }

    getModulatableParameters() {
        return Object.values(this.parameters)
            .filter((e) => {return e.modulatable})
            .concat(Object.values(this.nonDisplayedParameters))
    }

    removeFromSuperview() {
        this.view.remove()
    }

    getPresetObject() {
        var object = {
            typeId: this.constructor.typeId,
            parameters: this.getParametersPresetObject()
        }

        return object
    }

    getParametersPresetObject() {
        var parameters = {}
        for (let parameterKey in this.parameters) {
            let parameter = this.parameters[parameterKey]
            parameters[parameterKey] = parameter.getPresetValue()
        }

        return parameters
    }
}