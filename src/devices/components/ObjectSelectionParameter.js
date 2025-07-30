class ObjectSelectionParameter extends SelectionParameter {
    constructor(typeId, typeDisplayName, modulatable = true) {
        super(typeId, typeDisplayName, undefined, modulatable)
        
        this.objectsForOptions = []
        this.idObjectMap = {}
        this.lastId = undefined
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
        let id = undefined
        let idFound = false
        let i = 0

        let ids = Object.keys(this.idObjectMap)
        while (!idFound && i < ids.length) {
            let idToCompare = ids[i]
            if (this.idObjectMap[idToCompare] === object) {
                id = i
                idFound = true
            }

            i += 1
        }

        if (id === undefined) {
            if (this.lastId === undefined) {
                id = 0
            } else {
                id = this.lastId + 1
            }

            this.idObjectMap[id] = object
            this.lastId = id
        }

        this.objectsForOptions.push(object)
        const option = this.getOptionFromObject(
            object, 
            id
        )

        return option
    }

    getOptionFromObject(object, id) {
        return {
            label: object.displayName,
            value: id
        }
    }

    getSelectedObject() {
        const selectedValue = this.dropdown.value
        
        return this.idObjectMap[selectedValue]
    }

    setSelectedObject(object) {
        const id = Object.keys(this.idObjectMap).find((key) => this.idObjectMap[key] === object)
        this.dropdown.value = id
    }
}