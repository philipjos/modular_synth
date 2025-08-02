class ViewWithID extends View {
    constructor(objectIDManager) {
        super()

        this.id = objectIDManager.generateAndOccupyID()
    }
}