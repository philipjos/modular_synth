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
        const titleView = document.createElement("div")
        titleView.innerHTML = this.displayName
        this.view.appendChild(titleView)
    }

    setBottomMargin(margin) {
        this.view.style.marginBottom = margin + "px"
    }

    setOnChange(value) {
        this.externalOnChange = value
    }

}