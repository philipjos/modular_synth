class Connection extends Device {
    static typeDisplayName = "Connection"
    static typeId = "connection"

    constructor(objectIDManager) {
        super(objectIDManager)

        this.setParametersAndSetup({
            from: new ObjectSelectionParameter(objectIDManager, "From"),
            to: new ObjectSelectionParameter(objectIDManager, "To"),
            parameter: new ObjectSelectionParameter(objectIDManager, "Parameter"),
            amount: new NumericalParameter(objectIDManager, "Amount", 0, 1, 1, 0)
        })

        this.parameters["to"].onChange = this.updateParameterSelector.bind(this)
        
    }

    updateParameterSelector() {
        const toSelector = this.parameters["to"]
        const destinationComponent = toSelector.getSelectedObject()
        const parameters = destinationComponent ? Object.values(destinationComponent.getModulatableParameters()) : []
        const parameterSelector = this.parameters["parameter"]

        parameterSelector.setOptionsFromObjectsAndUpdateDropdown(parameters)
    }
}