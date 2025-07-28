class TimedSignal {
    constructor(stepLength = 0) {
        this.x = 0
        this.stepLength = stepLength
        this.initialstepLength = stepLength
    }

    reset() {
        this.x = 0
        this.stepLength = this.initialstepLength
    }
}