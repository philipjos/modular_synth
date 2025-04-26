class Connection extends Device {
    constructor() {
        super()

        console.log("Initially setting parameters in connection")
        this.setParametersAndSetup({
            from: new ObjectSelectionParameter("from", "From"),
            to: new ObjectSelectionParameter("to", "To"),
            parameter: new ObjectSelectionParameter("parameter", "Parameter")
        })
        console.log("Parameters has been set")

        this.parameters["to"].onChange = this.updateParameterSelector.bind(this)
        
    }

    updateParameterSelector() {
        const toSelector = this.parameters["to"]
        const destinationComponent = toSelector.getSelectedObject()
        console.log("toSelector:")
        console.log(toSelector)
        const parameters = Object.values(destinationComponent.parameters)
        console.log("Parameters")
        console.log(this.parameters)
        const parameterSelector = this.parameters["parameter"]
        console.log("parameterSelector:")
        console.log(parameterSelector)
        parameterSelector.setOptionsFromObjectsAndUpdateDropdown(parameters)
    }
}