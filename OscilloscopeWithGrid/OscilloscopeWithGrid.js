class OscilloscopeWithGrid extends View {
    constructor(width, height, totalGridPartitions) {
        super()
        this.grid = document.createElement("div")
        const oscilloscopeContainer = document.createElement("div")
        oscilloscopeContainer.style.position = "relative"
        this.view.style.backgroundColor = "#333340"
        this.view.style.width = 400
        oscilloscopeContainer.style.width = 400
        oscilloscopeContainer.style.top = 0
        this.oscilloscope = new Oscilloscope(width, height)
        this.oscilloscope.setBackgroundColor("rgba(0,0,0,0)")
        this.gridCount = totalGridPartitions
        this.view.appendChild(this.grid)
        this.view.appendChild(oscilloscopeContainer)
        this.oscilloscope.appendToView(oscilloscopeContainer)
        this.updateGridFromCount(totalGridPartitions)
        this.width = width
        this.height = height
        this.view.style.position = "relative"
        this.view.style.top = "0"
    }

    updateFromBuffer(buffer) {
        this.oscilloscope.updateFromBuffer(buffer)
        this.updateGridFromCount(this.gridCount)
    }

    updateGridFromCount() {
        this.grid.innerHTML = ""
        this.grid.style.display = "flex"
        this.grid.style.justifyContent = "space-between"
        this.grid.style.position = "absolute"
        this.grid.style.top = "0"
        this.grid.style.width = this.width
        this.grid.style.height = this.height
        const gridCountIncludingEnd = this.gridCount + 1

        const gridLineWidth = 1
        for (let i = 0; i < gridCountIncludingEnd; i++) {
            const partition = document.createElement("div")
            partition.style.width = `${gridLineWidth}px`
            partition.style.height = "100%"
            partition.style.backgroundColor = "#555555"
            this.grid.appendChild(partition)
        }
    }
}