class Parameter extends View {
    constructor(
        id,
        displayName
    ) {
        super()
        this.id = id
        this.displayName = displayName

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

}