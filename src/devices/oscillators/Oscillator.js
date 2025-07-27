class Oscillator extends OutputDevice {
    constructor() {
        super()

        this.timedSignals["mainTime"] = new TimedSignal()
    }

    advanceTime(sampleRate) {
        this.timedSignals["mainTime"].stepLength = this.getMainTimeFrequency() / sampleRate
        
        super.advanceTime(sampleRate)
    }

    getMainTimeFrequency() {
        return this.sampleRate
    }
}