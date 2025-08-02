class Noise extends Oscillator {
    static typeDisplayName = "Noise"
    static typeId = "noise"

    constructor(objectIDManager) {
        super(objectIDManager)

        this.setParametersAndSetup({
            amplitude: new NumericalParameter(
                objectIDManager,
                "Amplitude",
                0,
                1,
                0.5,
                0
            ),
            rate: new NumericalParameter(
                objectIDManager,
                "Rate",
                20,
                20000,
                0,
                0
            )
        })
    }

    calculateOutput() {
        const amplitude = this.parameters.amplitude.getModulatedValue()
        const rate = this.parameters.rate.getModulatedValue()
        const time = this.timedSignals["mainTime"].x
        const periodInSamples = this.sampleRate / rate

        let output = this.lastOutput
        if (time - this.lastSamplePoint >= periodInSamples) {
            output = (Math.random() * 2 - 1) * amplitude
            this.lastSamplePoint = time
        }

        return output
    }

    resetForCalculations() {
        super.resetForCalculations()
        this.lastSamplePoint = -1
    }
}