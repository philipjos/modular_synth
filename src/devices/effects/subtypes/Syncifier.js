class Syncifier extends Effect {
    static typeDisplayName = "Syncifier"
    static typeId = "syncifier"

    constructor(sampleRate) {
        super()

        this.sampleRate = sampleRate

        this.setParametersAndSetup({
            origin: new NumericalParameter(
                "origin",
                "Origin",
                0.1,
                2000,
                440,
                0
            ),
            sync: new NumericalParameter(
                "sync",
                "Sync",
                0.1,
                4,
                1.5,
                0
            )
        })
    }

    resetForCalculations() {
        super.resetForCalculations()
        this.memory = []
    }

    calculateOutputFromInput(input) {
        var output = 0
        const originPeriod = this.getOriginPeriodInSamples()
        if (this.memory.length > originPeriod) {
            if (this.memory.length > originPeriod * 2) {
                this.memory.splice(0, originPeriod)
            }

            let x = this.memory.length - originPeriod
            
            let syncedX = x * this.parameters.sync.getModulatedValue() % originPeriod
            if (syncedX == undefined) {
                console.log("syncedX")
            }
            output = this.memory[Math.floor(syncedX)]
            if (output == undefined) {
                console.log("output")
                console.log(syncedX)
            }
        }

        this.memory.push(input)

        return output
    }

    getOriginPeriodInSamples() {
        return (1 / this.parameters.origin.value) * this.sampleRate
    }

}