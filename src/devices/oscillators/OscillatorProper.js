class OscillatorProper extends Oscillator {
    static typeId = "oscillator_proper"
    static typeDisplayName = "Oscillator"

    constructor(sampleRate) {
        super(sampleRate)

        this.setParametersAndSetup({
            frequency: new NumericalParameter(
                "frequency",
                "Frequency",
                0,
                2000,
                440,
                0
            )
        })
    }

    calculateOutput(t) {
        const frequency = this.parameters["frequency"].getModulatedValue()
        return Math.sin(t * 2 * Math.PI * frequency * 1.5)
    }
}