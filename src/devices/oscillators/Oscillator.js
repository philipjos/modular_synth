class Oscillator extends OutputDevice {
    constructor(objectIDManager) {
        super(objectIDManager)

        this.timedSignals["mainTime"] = new TimedSignal()
    }

    advanceTime(sampleRate) {
        this.setStepSizes(sampleRate)
        super.advanceTime(sampleRate)
    }

    setStepSizes(sampleRate) {
        this.timedSignals["mainTime"].stepSize = this.getMainTimeFrequency() / sampleRate
    }

    getMainTimeFrequency() {
        return this.sampleRate
    }
}