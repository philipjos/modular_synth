class Connection extends Device {
    static typeDisplayName = "Connection"
    static typeId = "connection"

    constructor() {
        super()

        this.setParametersAndSetup({
            from: new ObjectSelectionParameter("from", "From"),
            to: new ObjectSelectionParameter("to", "To"),
            parameter: new ObjectSelectionParameter("parameter", "Parameter"),
            amount: new NumericalParameter("amount", "Amount", 0, 1, 0.5, 0)
        })

        this.parameters["to"].onChange = this.updateParameterSelector.bind(this)
        
    }

    updateParameterSelector() {
        const toSelector = this.parameters["to"]
        const destinationComponent = toSelector.getSelectedObject()
        const parameters = Object.values(destinationComponent.getModulatableParameters())
        const parameterSelector = this.parameters["parameter"]
        parameterSelector.setOptionsFromObjectsAndUpdateDropdown(parameters)
    }
}