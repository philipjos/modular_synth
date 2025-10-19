class DeepDistortion extends Effect {
    static typeDisplayName = "Deep distortion"
    static typeId = "deepDistortion"
    static FFT_WINDOW_SIZE = Math.pow(2, 11)

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
            partials: new NumericalParameter(
                objectIDManager,
                "Partials",
                1,
                10,
                4,
                0
            ),
            preVSPostMagnitudeScaling: new NumericalParameter(
                objectIDManager,
                "Pre/post magnitude scaling",
                0,
                1,
                1,
                0
            ),
            transition: new NumericalParameter(
                objectIDManager,
                "Transition",
                0,
                1,
                0.05,
                0
            )
        })
    }

    resetForCalculations() {
        super.resetForCalculations()
        this.memory = []
        this.lastFFTResult = []
        this.destinationFFTResult = []
        this.nextPotentialFFTResult = []
        this.time = 0
        this.timeSinceTransitionStart = 0
        this.hasEnteredFirstFFT = false
        this.hasFinishedFirstFFT = false
        this.lastTransitionPeakProgress = 0
    }

    getOutputForPartial(partial, preVSPostMagnitudeScaling, drive, time) {
        let output = 0

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

            output = postMagnitude
                        * Math.min(1, 
                        Math.max(-1, 
                            preMagnitude 
                            * drive
                            * Math.sin(
                                2 * Math.PI
                                * partial.frequency
                                * time
                                / this.sampleRate
                                + partial.phase
                            )
                        ))            
        }

        return output
    }

    calculateOutputFromInput(input) {
        var output = 0
        this.memory.push(input)
        
        if (this.memory.length >= DeepDistortion.FFT_WINDOW_SIZE) {
            const partials = this.parameters.partials.getModulatedValue()
            let potentialFFTResult = getLoudestHarmonicsFromAudioData(this.memory, this.sampleRate, partials)
            if (this.hasEnteredFirstFFT) {
                if (this.hasFinishedFirstFFT) {
                    this.nextPotentialFFTResult = potentialFFTResult
                } else {
                    this.hasFinishedFirstFFT = true
                    this.lastFFTResult = this.destinationFFTResult
                    this.destinationFFTResult = potentialFFTResult
                    this.timeSinceTransitionStart = 0
                }
            } else {
                this.destinationFFTResult = potentialFFTResult
                this.hasEnteredFirstFFT = true
            }
            this.memory = []
        }
        
        if (this.hasEnteredFirstFFT) {
            let destinationOutput = 0
            const drive = this.parameters.drive.getModulatedValue()
            const preVSPostMagnitudeScaling = this.parameters.preVSPostMagnitudeScaling.getModulatedValue()

            for (let partial of this.destinationFFTResult) {
                destinationOutput += this.getOutputForPartial(partial, preVSPostMagnitudeScaling, drive, this.time)
            }
            const transition = this.parameters.transition.getModulatedValue()
            const transitionInSamples = transition * this.sampleRate
            

            if (this.hasFinishedFirstFFT) {
                if (this.timeSinceTransitionStart >= transitionInSamples) {
                    this.lastFFTResult = this.destinationFFTResult
                    if (this.nextPotentialFFTResult.length > 0) {
                        this.destinationFFTResult = this.nextPotentialFFTResult
                    }
                    this.lastTransitionPeakProgress = (transitionInSamples > 0) ? Math.min(1, this.timeSinceTransitionStart / transitionInSamples) : 1
                    this.timeSinceTransitionStart = 0
                }

                let sourceOutput = 0
                for (let partial of this.lastFFTResult) {
                    sourceOutput += this.getOutputForPartial(partial, preVSPostMagnitudeScaling, drive, this.time)
                }
                
                let progress = (transitionInSamples > 0) ? Math.min(1, this.timeSinceTransitionStart / transitionInSamples) : 1

                output = destinationOutput * progress + sourceOutput * (1 - progress) * this.lastTransitionPeakProgress
                
            } else {
                let progress = (transitionInSamples > 0) ? Math.min(1, this.timeSinceTransitionStart / transitionInSamples) : 1

                output = destinationOutput * progress
            }

            this.time += 1
            this.timeSinceTransitionStart += 1
        }


        
    
        return output
    }

    getDisplayOffset() {
        return DeepDistortion.FFT_WINDOW_SIZE - 1
    }
}