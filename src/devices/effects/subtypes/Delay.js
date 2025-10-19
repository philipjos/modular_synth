class Delay extends Effect {
    static typeDisplayName = "Delay"
    static typeId = "delay"

    constructor(objectIDManager, sampleRate) {      
        super(objectIDManager)  
        this.sampleRate = sampleRate
        this.memory = []
        this.setParametersAndSetup({
            time: new NumericalParameter(
                objectIDManager,
                "Time",
                0,
                0.5,
                0.015,
                0
            ),
            feedback: new NumericalParameter(
                objectIDManager,
                "Feedback",
                0,
                100,
                25,
                0
            )
        })
    }
    
    calculateOutputFromInput(input) {
        const timeInSamples = this.getTimeInSamples()
        var output = input
        if (this.memory.length >= timeInSamples) {
            var oneDelayBack = this.memory.shift()
            output += oneDelayBack
        }

        const feedback = this.parameters.feedback.getModulatedValue() / 100
        const nonFeedbackAmplitude = 1 - feedback
        const toPushToMemory = input * nonFeedbackAmplitude + output * feedback
        this.memory.push(toPushToMemory)

        return output
    }

    getTimeInSamples() {
        return this.parameters.time.getModulatedValue() * this.sampleRate
    }

    resetForCalculations() {
        super.resetForCalculations()
        this.memory = []
    }
}