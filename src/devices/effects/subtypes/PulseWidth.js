class PulseWidth extends Effect {
    static typeDisplayName = "Pulse Width"
    static typeId = "pulseWidth"

    constructor(objectIDManager) {
        super(objectIDManager)

        this.setParametersAndSetup({
            pulseWidth: new NumericalParameter(
                objectIDManager,
                "Pulse Width",
                0,
                1,
                0.5,
                0
            ),
            frequency: new NumericalParameter(
                objectIDManager,
                "Frequency",
                0,
                2000,
                440,
                0
            )
        })

    }

    calculateOutputFromInput(input) {
        let output = 0

        this.nextMemory.push(input)
        const period = this.sampleRate / this.parameters["frequency"].getModulatedValue()  
        if (this.nextMemory.length >= period) {
            this.memory = this.nextMemory.slice(0, Math.floor(period))
            this.nextMemory = []
            this.lockedPulseWidth = this.parameters["pulseWidth"].getModulatedValue()
            this.memoryPosition = 0
        }

        if (this.memory.length >= Math.floor(period)) {
            const memoryIndex = Math.min(Math.floor(this.memoryPosition), this.memory.length - 1)
            output = this.memory[memoryIndex]

            let orignalSegmentWidth = 0.5 * this.memory.length
            let segmentWidth = this.memoryPosition < orignalSegmentWidth
                ? this.lockedPulseWidth 
                : 1 - this.lockedPulseWidth
            const segmentStep = Math.min(orignalSegmentWidth, 1 / (2 * segmentWidth))
            const hasCrossedMiddle = this.memoryPosition >= orignalSegmentWidth
            const nextPosition = this.memoryPosition + segmentStep
            this.memoryPosition = hasCrossedMiddle ? nextPosition : Math.min(orignalSegmentWidth, nextPosition)

        }

        return output
    }

    resetForCalculations() {
        super.resetForCalculations()
        this.memory = []
        this.nextMemory = []
        this.lockedPulseWidth = 0.5
        this.memoryPosition = 0
    }
}