class Delay extends Effect {
    static typeDisplayName = "Delay"
    static typeId = "delay"

    constructor(sampleRate) {      
        super()  
        this.sampleRate = sampleRate
        this.memory = []
        this.setParametersAndSetup({
            time: new NumericalParameter(
                "time",
                "Time",
                0,
                2000,
                100,
                0
            ),
            feedback: new NumericalParameter(
                "feedback",
                "Feedback",
                0,
                100,
                25,
                0
            )
        })
        this.input = new NumericalParameter(
            "input",
            "Input",
            0,
            1,
            0,
            0
        )
        this.nonDisplayedParameters = [
            this.input
        ]
    }
    
    calculateOutput() {
        const input = this.input.value
        const timeInSamples = this.getTimeInSamples()
        if (this.memory.length >= timeInSamples) {
            var oneDelayBack = this.memory.shift()
            var output = input + oneDelayBack
        }

        const feedback = this.parameters.feedback.value / 100
        const nonFeedbackAmplitude = 1 - feedback
        const toPushToMemory = input * nonFeedbackAmplitude + output * feedback
        this.memory.push(toPushToMemory)

        // console.log("input", input)
        // console.log("output", output)
        // console.log("memory", this.memory)
        // console.log("timeInSamples", timeInSamples)
        // console.log("feedback", feedback)
        // console.log("nonFeedbackAmplitude", nonFeedbackAmplitude)
        // console.log("toPushToMemory", toPushToMemory)

        return input
    }

    getTimeInSamples() {
        console.log("time", this.parameters.time.value)
        console.log("sampleRate", this.sampleRate)
        return this.parameters.time.value * this.sampleRate
    }
}