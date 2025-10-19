class DeepDistortion extends Effect {
    static typeDisplayName = "Deep distortion"
    static typeId = "deepDistortion"
    static FFT_WINDOW_SIZE = Math.pow(2, 11)
    static PARTIALS = 4

    constructor(objectIDManager) {
        super(objectIDManager)

        this.setParametersAndSetup({
            drive: new NumericalParameter(
                objectIDManager,
                "Drive",
                1,
                10,
                1,
                0
            ),
            preVSPostMagnitudeScaling: new NumericalParameter(
                objectIDManager,
                "Pre/post magnitude scaling",
                0,
                1,
                1,
                0
            )
        })
    }

    resetForCalculations() {
        super.resetForCalculations()
        this.memory = []
        this.fftResult = []
        this.time = 0
    }

    calculateOutputFromInput(input) {
        var output = 0
        this.memory.push(input)
        if (this.memory.length > DeepDistortion.FFT_WINDOW_SIZE) {
            this.fftResult = getLoudestHarmonicsFromAudioData(this.memory, this.sampleRate, DeepDistortion.PARTIALS)
            // this.fftResult = [
            //     {frequency: 110, magnitude: 2 / (Math.PI * 1), phase: 0},
            //     {frequency: 220, magnitude: 2 / (Math.PI * 2), phase: 0},
            //     {frequency: 330, magnitude: 2 / (Math.PI * 3), phase: 0},
            //     {frequency: 440, magnitude: 2 / (Math.PI * 4), phase: 0},
            // ]
            this.memory = []
            
        }

        const drive = this.parameters.drive.getModulatedValue()
        const preVSPostMagnitudeScaling = this.parameters.preVSPostMagnitudeScaling.getModulatedValue()

        if (this.fftResult.length > 0) {
            for (const partial of this.fftResult) {
                if (partial.magnitude > 0) {
                    var postMagnitude
                    var preMagnitude
                    if (preVSPostMagnitudeScaling > 0.999) {
                        postMagnitude = partial.magnitude
                        preMagnitude = 1
                    } else if (preVSPostMagnitudeScaling < 0.001) {
                        preMagnitude = partial.magnitude
                        postMagnitude = 1
                    } else {
                        postMagnitude = (partial.magnitude * preVSPostMagnitudeScaling + 1 - preVSPostMagnitudeScaling)
                        preMagnitude = partial.magnitude / postMagnitude
                    }

                    output += postMagnitude
                                * Math.min(1, 
                                Math.max(-1, 
                                    preMagnitude 
                                    * drive
                                    * Math.sin(
                                        2 * Math.PI
                                        * partial.frequency
                                        * this.time
                                        / this.sampleRate
                                        + partial.phase
                                    )
                                ))
                }
            }

            this.time += 1
        }
    
        return output
    }

    getDisplayOffset() {
        return DeepDistortion.FFT_WINDOW_SIZE
    }
}