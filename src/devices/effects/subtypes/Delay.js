class Delay extends Effect {
    static typeDisplayName = "Delay"
    static typeId = "delay"

    constructor(sampleRate) {      
        super()  
        this.sampleRate = sampleRate
        this.memory = []
        this.setParametersAndSetup({
            time: new Parameter(
                "time",
                "Time",
                0,
                2000,
                100,
                0
            ),
            feedback: new Parameter(
                "feedback",
                "Feedback",
                0,
                100,
                25,
                0
            )
        })
    }
    
    process(input) {
        const timeInSamples = this.getTimeInSamples()
        if (this.memory.length >= timeInSamples) {
            var oneDelayBack = this.memory.shift()
            var output = input + oneDelayBack
        }

        const feedback = this.parameters.feedback.value / 100
        const nonFeedbackAmplitude = 1 - feedback
        const toPushToMemory = input * nonFeedbackAmplitude + output * feedback
        this.memory.push(toPushToMemory)

        return output
    }

    getTimeInSamples() {
        return this.parameters.time.value * this.sampleRate
    }
}