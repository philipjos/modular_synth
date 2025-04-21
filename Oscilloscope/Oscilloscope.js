class Oscilloscope {
    constructor(oscilloscopeWidth, oscilloscopeHeight) {
        this.oscilloscopeWidth = oscilloscopeWidth
        this.oscilloscopeHeight = oscilloscopeHeight
        this.color = "19F1FF"
        this.element = document.createElement("div")

        this.element.style.width = oscilloscopeWidth + 'px'
        this.element.style.height = oscilloscopeHeight + 'px'
        this.element.style.backgroundColor = "#333340"
        this.element.style.display = "flex"
        this.element.style.position = "relative"
    }

    appendToView(view) {
        view.appendChild(this.element)
    }

    updateFromBuffer(buffer) {
        console.log("Updating oscilloscope from buffer", buffer)
        this.buffer = buffer
        this.element.innerHTML = ""
        
        let xShrink = buffer.length / this.oscilloscopeWidth

        for (let i = 0; i < this.oscilloscopeWidth; i++) {
            let line = document.createElement("div")
            let shrinkedX = Math.floor(i * xShrink)
            let shrinkedY = buffer[shrinkedX]
            let height = ((shrinkedY + 1) / 2) * this.oscilloscopeHeight
            let clippedHeight = Math.min(this.oscilloscopeHeight, Math.max(0, height))
            line.style.height = clippedHeight + 'px'
            line.style.position = "absolute"
            line.style.bottom = "0px"
            line.style.left = i.toString() + 'px'
            line.style.width = "1px"
            line.style.backgroundColor = this.color
        
            this.element.appendChild(line)
        }
    }
    
    setColor(color) {
        this.color = color
        if (this.buffer) {
            this.updateFromBuffer(this.buffer)
        }
    }

    setBackgroundColor(backgroundColor) {
        this.element.style.backgroundColor = backgroundColor
    }
}
