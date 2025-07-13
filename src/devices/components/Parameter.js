class Parameter extends View {
    
    constructor(
        id,
        displayName
    ) {
        super()
        this.id = id
        this.displayName = displayName
        this.externalOnChange = () => {}

        this.setupView()
    }

    setupView() {
        this.titleView = document.createElement("div")
        this.titleView.innerHTML = this.displayName
        this.view.appendChild(this.titleView)
    }

    setBottomMargin(margin) {
        this.view.style.marginBottom = margin + "px"
    }

    setOnChange(value) {
        this.externalOnChange = value
    }

    updateView() {
    }

    getPresetvalue() {
        return this.value
    }
}