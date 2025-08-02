class Compressor extends Effect {
    static typeDisplayName = "Compressor"
    static typeId = "compressor"

    constructor(objectIDManager, sampleRate) {      
        super(objectIDManager)  
        this.sampleRate = sampleRate
        this.memory = []
        this.setParametersAndSetup({
            threshold: new NumericalParameter(
                objectIDManager,
                "Threshold",
                0,
                2,
                1,
                0
            ),
            ratio: new NumericalParameter(
                objectIDManager,
                "Ratio",
                1,
                10,
                2,
                0
            ),
            attack: new NumericalParameter(
                objectIDManager,
                "Attack",
                0,
                1000,
                50,
                0
            ),
            release: new NumericalParameter(
                objectIDManager,
                "Release",
                1,
                2000,
                50,
                0
            )
        })

        this.goesToMainOutput = true
    }
    
    calculateOutputFromInput(input) {
        const threshold = this.parameters.threshold.getModulatedValue()
        const ratio = this.parameters.ratio.getModulatedValue()
        const attack = this.parameters.attack.getModulatedValue()
        const release = this.parameters.release.getModulatedValue()

        const attackInSeconds = attack / 1000
        const releaseInSeconds = release / 1000
        const attackInSamples = attackInSeconds * this.sampleRate
        const releaseInSamples = releaseInSeconds * this.sampleRate
        const envelopeInSamples = attackInSamples + releaseInSamples
        
        var maxValue = this.memory.length > 0 ? this.memory[this.memory.length - 1] : 0
        var maxValueIndex = this.memory.length > 0 ? this.memory.length - 1 : 0
        var minValue = maxValue
        var minValueIndex = this.memory.length > 0 ? this.memory.length - 1 : 0

        const maxPeriodInSamples = this.sampleRate / compressorMinimumFrequency

        let j = this.memory.length - 1;
        let triggeringWaveFound = false
        let amplitudeCandidate = 0
        let overrideSignal
        while (j >= 0 && !triggeringWaveFound) {
            amplitudeCandidate = Math.abs(this.memory[j] - input) / 2

            if (amplitudeCandidate >= threshold) {
                triggeringWaveFound = true

                if (!this.triggered) {
                    this.amplitude = amplitudeCandidate
                    this.firstConsecutiveTriggerSampleIndex = this.time
                    this.triggered = true
                } else if (this.nextAmplitude > this.amplitude) {
                    this.nextAmplitude = amplitudeCandidate
                }

                this.triggeredSampleIndex = this.time
            }

            j -= 1
        }

        
        var signal = input
        if (this.amplitude > 0) {
            if (this.triggered) {
                const samplesSinceTrigger = this.time - this.triggeredSampleIndex
                const sampleSinceFirstConsecutiveTrigger = this.time - this.firstConsecutiveTriggerSampleIndex
                
                if (samplesSinceTrigger >= envelopeInSamples) {
                    this.triggered = false
                } else {
                    var envelopeValuePercentage
                    if (sampleSinceFirstConsecutiveTrigger < attackInSamples) {
                        envelopeValuePercentage = sampleSinceFirstConsecutiveTrigger / attackInSamples
                    } else {
                        envelopeValuePercentage = 1 - Math.max(0, (samplesSinceTrigger - attackInSamples)) / releaseInSamples
                    }

                    const ratioWithEnvelope = 1 + (ratio - 1) * envelopeValuePercentage
                    const gainToAddAboveThreshold = (this.amplitude - threshold) / ratioWithEnvelope
                    const newAmplitude = threshold + gainToAddAboveThreshold
                    const gain = newAmplitude / this.amplitude
                    signal *= gain
                }
            }
        }

        this.time += 1
        
        this.memory.push(signal)
        if (this.memory.length > maxPeriodInSamples) {
            this.memory.splice(0, 1)
        }

        return overrideSignal ?? signal
    }

    resetForCalculations() {
        super.resetForCalculations()
        this.memory = []
        this.triggered = false
        this.firstConsecutiveTriggerSampleIndex = 0
        this.triggeredSampleIndex = 0
        this.time = 0
        this.amplitude = 0
        this.nextAmplitude = 0
        this.peakAmplitudes = []
        this.peakAmplitudeIndeces = []
    }
}