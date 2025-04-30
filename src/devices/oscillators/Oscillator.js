class Oscillator extends OutputDevice {
    constructor() {
        super()

        this.timedSignals["mainTime"] = new TimedSignal()
    }
}