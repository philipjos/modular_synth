class BitCrusher extends Effect {
    static typeDisplayName = "Bit crusher"
    static typeId = "bitCrusher"

    constructor() {
        super()

        this.setParametersAndSetup({
            bitDepth: new NumericalParameter(
                "bitDepth",
                "Bit depth",
                0,
                8,
                4,
                0
            ),
            targetSampleRate: new NumericalParameter(
                "targetSampleRate",
                "Sample rate",
                20,
                20000,
                5000,
                0
            ),
            bitCrushBias: new NumericalParameter(
                "bitCrushBias",
                "Bit crush bias",
                -2,
                2,
                0,
                0
            )
        })

        this.timedSignals["mainTime"] = new TimedSignal(1)
    }

    calculateOutputFromInput(input) {
        const bitDepth = this.parameters.bitDepth.getModulatedValue()
        const bias = this.parameters.bitCrushBias.getModulatedValue()
        const targetSampleRate = this.parameters.targetSampleRate.getModulatedValue()
        
        const fullRange = 2
        const resolution = Math.pow(2, bitDepth)
        const quantum = fullRange / (resolution - 1)
        const unipolar = input + 1
        const biased = unipolar + bias
        const rounded = Math.round(biased / quantum) * quantum
        const debiased = rounded - bias
        const bipolar = debiased - 1
        const bitCrushed = Math.min(1, Math.max(-1, bipolar))

        var output = 0
        const timeQuantum = this.sampleRate / targetSampleRate
        var time = this.timedSignals["mainTime"].x
        if (time - this.lastSamplePoint >= timeQuantum) {
            this.lastSamplePoint = time
            output = bitCrushed
        } else {
            output = this.lastOutput
        }

        return output
    }

    resetForCalculations() {
        super.resetForCalculations()
        this.lastSamplePoint = -1
    }
}