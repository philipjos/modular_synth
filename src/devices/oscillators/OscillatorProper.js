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
            ),
            amplitude: new NumericalParameter(
                "amplitude",
                "Amplitude",
                0,
                1,
                0.75,
                0
            )
        })
    }

    calculateOutput() {
        var output = Math.sin(this.timedSignals["mainTime"].x * 2 * Math.PI) 

        output *= this.parameters["amplitude"].getModulatedValue()

        return output
    }

    getMainTimeFrequency() {
        return this.parameters["frequency"].getModulatedValue()
    }
}