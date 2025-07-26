class ObjectSelectionParameter extends SelectionParameter {
    constructor(typeId, typeDisplayName, modulatable = true) {
        super(typeId, typeDisplayName, modulatable)
        
        this.objectsForOptions = []
    }
    addOptionFromObject(object) {
        const option = this.addObjectAndGenerateOption(object, newIndex)
        this.addOptionAndUpdateDropdown(option)
    }

    setOptionsFromObjectsAndUpdateDropdown(objects) {
        this.objectsForOptions = []
        const options = objects.map((e) => this.addObjectAndGenerateOption(e))
        this.setOptionsAndUpdate(options)
    }

    addObjectAndGenerateOption(object) {
        const newIndex = this.objectsForOptions.length
        this.objectsForOptions.push(object)
        const option = this.getOptionFromObject(object, newIndex)

        return option
    }

    getOptionFromObject(object, index) {
        return {
            label: object.displayName,
            value: index
        }
    }

    getSelectedObject() {
        const selectedValue = this.dropdown.value
        return this.objectsForOptions[selectedValue]
    }
}