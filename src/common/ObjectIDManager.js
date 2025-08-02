class ObjectIDManager {
    constructor() {
        this.occupiedIDs = []
    }

    generateAndOccupyID() {
        let id = 0
        while (this.occupiedIDs.includes(id)) {
            id += 1
        }
        this.occupiedIDs.push(id)
        return id
    }
    
}