class ObjectSelectionParameter extends SelectionParameter {
    constructor(typeId, typeDisplayName) {
        super(typeId, typeDisplayName)
        
        this.objectsForOptions = []
    }
    addOptionFromObject(object) {
        const option = this.addObjectAndGenerateOption(object, newIndex)
        this.addOptionAndUpdateDropdown(option)
    }

    setOptionsFromObjectsAndUpdateDropdown(objects) {
        const options = objects.map((e) => this.addObjectAndGenerateOption(e))
        console.log("Cast options:")
        console.log(options)
        this.setOptionsAndUpdateDropdown(options)
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