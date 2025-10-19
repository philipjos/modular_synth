class ObjectSelectionParameter extends SelectionParameter {
    constructor(objectIDManager, typeDisplayName, modulatable = true) {
        super(objectIDManager, typeDisplayName, undefined, null, modulatable)
        
        this.objectsForOptions = []
    }
    addOptionFromObject(object) {
        const option = this.addObjectAndGenerateOption(object)
        this.addOptionAndUpdateDropdown(option)
    }

    setOptionsFromObjectsAndUpdateDropdown(objects) {
        this.objectsForOptions = []
        const options = objects.map((e) => {
            return this.addObjectAndGenerateOption(e)
        })
        this.setOptionsAndUpdate(options)
    }

    addObjectAndGenerateOption(object) {
        this.objectsForOptions.push(object)

        const option = {
            label: object.displayName,
            value: object.id
        }

        return option
    }

    getObjectOptionWithId(id) {
        return this.objectsForOptions.find((e) => e.id === id)
    }

    getSelectedObject() {
        const selectedValue = this.dropdown.value
        
        const selectedObject = this.getObjectOptionWithId(parseInt(selectedValue))
        return selectedObject
    }

    setSelectedObject(object) {
        this.dropdown.value = object.id
    }
}