class FrequencyFade extends Effect {
    static typeDisplayName = "Frequency fade"
    static typeId = "frequency_fade"

    constructor(objectIDManager) {
        super(objectIDManager)

        this.setParametersAndSetup({
            partials: new NumericalParameter(
                objectIDManager,
                "Partials",
                1,
                500,
                4,
                0
            ),
            balance: new NumericalParameter(
                objectIDManager,
                "Balance",
                0,
                1,
                0.5,
                0
            ),
            mode: new SelectionParameter(
                objectIDManager,
                "Mode",
                [{
                    value: "nearestFrequency",
                    label: "Nearest frequency"
                }, 
                {
                    value: "frequencyRank",
                    label: "Frequency rank"
                }, 
                {
                    value: "nearestAmplitude",
                    label: "Nearest amplitude"
                }, 
                {
                    value: "amplitudeRank",
                    label: "Amplitude rank"
                }]
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

        this.inputB = new NumericalParameter(
            objectIDManager,
            "Input B",
            -1,
            1,
            0,
            0
        )

        this.nonDisplayedParameters["inputB"] = this.inputB

        this.partialTimedSignals = []
    }

    resetForCalculations() {
        super.resetForCalculations()
        this.window = []
        this.windowB = []
        this.fftResult = []
        this.fftResultB = []
        this.partialTimedSignals = []
        this.transitions = []
        this.debug = 0
    }

    prepareForCalculations() {
        super.prepareForCalculations()
        
        this.mode = Math.floor(this.parameters.mode.getModulatedValue())
        this.unmodulatedPartialsCount = Math.floor(this.parameters.partials.getValue())
        this.frequencyAnalyzerA = new FrequencyAnalyzer(this.sampleRate, this.unmodulatedPartialsCount, this.mode)
        this.frequencyAnalyzerB = new FrequencyAnalyzer(this.sampleRate, this.unmodulatedPartialsCount, this.mode)
        this.momentaryFrecuencyFader = new MomentaryFrecuencyFader(this.mode)
    }

    getFadedPartialOutput(partialA, partialB, inverseBalance, balance, angle) {
        const fadedAmplitude = partialA.magnitude * inverseBalance + partialB.magnitude * balance
        const fadedPhase = partialA.phase * inverseBalance + partialB.phase * balance
        
        const output = Math.sin(
            angle
            * 2 * Math.PI
            + fadedPhase
        ) * fadedAmplitude

        return output
    }

    advanceTime(sampleRate) {
        let balance = this.parameters.balance.getModulatedValue()
        let inverseBalance = 1 - balance

        for (let i = 0; i < this.partialTimedSignals.length; i++) {
            let transition = this.transitions[i]
            let timedSignal = this.partialTimedSignals[i]
            // if (this.debug < 100) {
            //     console.log("timedSignal", timedSignal)
            //     console.log("transition", transition)
            //     this.debug += 1
            // }
            // if (transition == undefined) {
            //     console.log("transition is undefined")
            //     console.log("this.partialTimedSignals.length", this.partialTimedSignals.length)
            //     console.log("this.transitions.length", this.transitions.length)
            // }

            timedSignal.stepSize = (transition.source.frequency * inverseBalance + transition.target.frequency * balance) / sampleRate
            timedSignal.advanceTime()
        }

        super.advanceTime(sampleRate)
    }

    calculateOutputFromInput(input) {
        let inputB = this.inputB.getModulatedValue()
        let balance = this.parameters.balance.getModulatedValue()
        let inverseBalance = 1 - balance
        let transition = this.parameters.transition.getModulatedValue()

        let partialsA = this.frequencyAnalyzerA.calculatePartials(input, transition)
        let partialsB = this.frequencyAnalyzerB.calculatePartials(inputB, transition)

        this.transitions = this.momentaryFrecuencyFader.calculateTransitions(partialsA, partialsB)

        let i = this.partialTimedSignals.length
        while (i < this.transitions.length) {
            let transition = this.transitions[i]
            let stepSize = (transition.source.frequency * inverseBalance + transition.target.frequency * balance) / this.sampleRate
            
            this.partialTimedSignals.push(new TimedSignal(stepSize))

            i += 1
        }

        this.partialTimedSignals = this.partialTimedSignals.slice(0, this.transitions.length)
        
        const partialsCount = this.parameters.partials.getModulatedValue()
        let partialsModulatedRatio = partialsCount / this.unmodulatedPartialsCount
        let adjustedTransitionsLength = partialsModulatedRatio < 1 ? Math.floor(transitions.length * partialsModulatedRatio) : this.transitions.length
        
        let output = 0

        i = 0
        while (i < adjustedTransitionsLength) {
            let transition = this.transitions[i]
            
            output += this.getFadedPartialOutput(
                transition.source, 
                transition.target,
                inverseBalance,
                balance,
                this.partialTimedSignals[i].x
            )

            i += 1
        }

        return output
    }
}