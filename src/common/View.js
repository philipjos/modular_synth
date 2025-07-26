class View {
    constructor() {
        this.view = document.createElement("div")
    }

    appendToView(view) {
        view.appendChild(this.view)
    }
}