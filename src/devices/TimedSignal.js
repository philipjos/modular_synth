class TimedSignal {
    constructor(stepSize = 0) {
        this.x = 0
        this.stepSize = stepSize
        this.initialStepSize = stepSize
    }

    reset() {
        this.x = 0
        this.stepSize = this.initialStepSize
    }

    advanceTime() {
        this.x += this.stepSize
    }
}