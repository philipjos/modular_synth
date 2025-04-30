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

    calculateOutput() {
        //console.log()
        //console.log(this.timedSignals["mainTime"].x * 2 * Math.PI, this.timedSignals["mainTime"].x)
        return Math.sin(this.timedSignals["mainTime"].x * 2 * Math.PI)
    }

    getMainTimeFrequency() {
        return this.parameters["frequency"].getModulatedValue()
    }
}