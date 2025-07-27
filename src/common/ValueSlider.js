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

        this.slider.oninput = this._onInput.bind(this)
        this.updateViewFromValue()
    }

    _onInput(e) {
        this.value = e.target.value;
        this.updateTextFromValue()
        if (this.onInput) {
            this.onInput(this.value)
        }
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