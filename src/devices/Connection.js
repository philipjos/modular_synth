class Connection extends Device {
    constructor() {
        super()

        this.setParametersAndSetup({
            from: new ObjectSelectionParameter("from", "From"),
            to: new ObjectSelectionParameter("to", "To"),
            parameter: new ObjectSelectionParameter("parameter", "Parameter")
        })

        this.parameters["to"].onChange = this.updateParameterSelector.bind(this)
        
    }

    updateParameterSelector() {
        const toSelector = this.parameters["to"]
        const destinationComponent = toSelector.getSelectedObject()
        const parameters = Object.values(destinationComponent.parameters)
        const parameterSelector = this.parameters["parameter"]
        parameterSelector.setOptionsFromObjectsAndUpdateDropdown(parameters)
    }
}