class ValueSlider extends View {
    constructor(title) {
        super();
        this.value = 1
        this.titleView = document.createElement("div")
        const contentRow = document.createElement("div")
        this.slider = document.createElement("input")
        this.textInput = document.createElement("input")
        
        this.titleView.innerHTML = title
        this.slider.type = "range"
        this.textInput.type = "text"
    
        this.view.appendChild(this.titleView)
        this.view.appendChild(contentRow)
        contentRow.appendChild(this.slider);
        contentRow.appendChild(this.textInput)

        this.slider.oninput = this.onInput.bind(this)
        this.updateViewFromValue()
    }

    onInput(e) {
        this.value = e.target.value;
        this.updateTextFromValue()
    }

    updateViewFromValue() {
        this.updateSliderFromValue()
        this.updateTextFromValue()
    }

    updateSliderFromValue() {
        this.slider.value = this.value
    }

    updateTextFromValue() {
        this.textInput.value = this.value.toString()
    }
}