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
            ),
            phase: new NumericalParameter(
                "phase",
                "Phase",
                0,
                360,
                0,
                0
            )
        })
    }

    calculateOutput() {
        const phasedX = this.timedSignals["mainTime"].x * 2 * Math.PI
            + this.parameters["phase"].getModulatedValue() * Math.PI / 180
        var output = Math.sin(phasedX) 

        output *= this.parameters["amplitude"].getModulatedValue()

        return output
    }

    getMainTimeFrequency() {
        return this.parameters["frequency"].getModulatedValue()
    }
}