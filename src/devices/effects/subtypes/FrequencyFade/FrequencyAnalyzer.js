class FrequencyAnalyzer {
    static FFT_WINDOW_SIZE = Math.pow(2, 11)

    constructor(sampleRate, partialsCount, transitionType) {
        this.sampleRate = sampleRate
        this.partialsCount = partialsCount
        this.transitionType = transitionType
        this.memory = []
        this.hasEnteredFirstFFT = false
        this.hasFinishedFirstFFT = false
        this.nextPotentialFFTResult = []
        this.lastFFTResult = []
        this.destinationFFTResult = []
        this.timeSinceTransitionStart = 0

        this.momentaryFrecuencyFader = new MomentaryFrecuencyFader(transitionType)

        this.transitions = []

        this.debug = 0
    }

    calculatePartials(input, transition) {
        this.memory.push(input)
        
        if (this.memory.length >= FrequencyAnalyzer.FFT_WINDOW_SIZE) {
            let potentialFFTResult = getLoudestHarmonicsFromAudioData(this.memory, this.sampleRate, this.partialsCount)
            if (this.hasEnteredFirstFFT) {
                if (this.hasFinishedFirstFFT) {
                    this.nextPotentialFFTResult = potentialFFTResult
                } else {
                    this.hasFinishedFirstFFT = true
                    this.lastFFTResult = this.destinationFFTResult
                    this.destinationFFTResult = potentialFFTResult
                    this.timeSinceTransitionStart = 0

                    this.transitions = this.momentaryFrecuencyFader.calculateTransitions(this.lastFFTResult, this.destinationFFTResult)
                }
            } else {
                this.destinationFFTResult = potentialFFTResult
                this.hasEnteredFirstFFT = true
            }
            this.memory = []
        }
        
        if (this.hasEnteredFirstFFT) {
            const transitionInSamples = transition * this.sampleRate
            
            if (this.hasFinishedFirstFFT && this.timeSinceTransitionStart >= transitionInSamples) {
                this.lastFFTResult = this.destinationFFTResult
                if (this.nextPotentialFFTResult.length > 0) {
                    this.destinationFFTResult = this.nextPotentialFFTResult

                    this.transitions = this.momentaryFrecuencyFader.calculateTransitions(this.lastFFTResult, this.destinationFFTResult)
                    this.timeSinceTransitionStart = 0
                }
            }
        }
        
        if (this.transitions.length > 0) {
            const transitionInSamples = transition * this.sampleRate
            var outputPartials = []
            for (let transition of this.transitions) {
                let progress = (transitionInSamples > 0) ? Math.min(1, this.timeSinceTransitionStart / transitionInSamples) : 1
                let inverseProgress = 1 - progress
                var outputPartial = {}
                outputPartial.frequency = transition.source.frequency * inverseProgress + transition.target.frequency * progress
                outputPartial.magnitude = transition.source.magnitude * inverseProgress + transition.target.magnitude * progress
                outputPartial.phase = transition.source.phase * inverseProgress + transition.target.phase * progress
                outputPartials.push(outputPartial)
            }
            
            return outputPartials
        } else if (this.hasEnteredFirstFFT) {
            return this.destinationFFTResult
        }

        this.timeSinceTransitionStart += 1

        return []
    }
}