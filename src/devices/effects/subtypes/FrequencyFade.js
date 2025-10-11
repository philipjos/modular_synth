class FrequencyFade extends Effect {
    static typeDisplayName = "Frequency fade"
    static typeId = "frequency_fade"

    constructor(objectIDManager) {
        super(objectIDManager)

        this.windowSize = 512

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
                },
                {
                    value: "static",
                    label: "Static"
                }]
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

    resetPhase() {
        for (let i = 0; i < this.partialTimedSignals.length; i++) {
            this.partialTimedSignals[i].x = 0
        }
    }

    resetForCalculations() {
        // console.log("resetForCalculations")
        super.resetForCalculations()
        this.window = []
        this.windowB = []
        this.fftResult = []
        this.fftResultB = []
        this.countForFrequency = {}
        this.countForFrequencyB = {}
        this.transitions = []
        this.debug = true
        this.debug2 = true
        this.debug_3 = true
        this.debug_4 = 0

        this.resetPhase()
    }

    getFadedPartialOutput(partialA, partialB, inverseBalance, balance, angle) {
        
        let sourceCount = this.countForFrequency[Math.floor(partialA.frequency)]
        let targetCount = this.countForFrequencyB[Math.floor(partialB.frequency)]
        
        let fadedAmplitude = partialA.magnitude / sourceCount * inverseBalance + partialB.magnitude / targetCount * balance
        let fadedPhase = partialA.phase * inverseBalance + partialB.phase * balance
        
        
        const output = Math.sin(
            angle
            * 2 * Math.PI
            + fadedPhase
        ) * fadedAmplitude / 200
        
        if (this.debug_4 < 600) {
            console.log("partialB", partialB )
            console.log("balance", balance)
            console.log("angle", angle)
            console.log("Output", output)
        }

        return output
    }

    advanceTime(sampleRate) {
        while (this.partialTimedSignals.length < Math.floor(this.parameters.partials.getModulatedValue())) {
            this.partialTimedSignals.push(new TimedSignal())
        }

        this.transitions = []

        const mode = this.parameters.mode.getModulatedValue()
        const balance = this.parameters.balance.getModulatedValue()
        const inverseBalance = 1 - balance
        const partials = Math.floor(this.parameters.partials.getModulatedValue())

        if (this.fftResult.length >= partials) {
            if (mode == 0) {
                this.countForFrequency = {}
                this.countForFrequencyB = {}

                let i = 0
                while (i < partials) {
                    let partialA = this.fftResult[i]
                    let partialAFrequencyFloored = Math.floor(partialA.frequency)
                    
                    let smallestDifference = undefined
                    let smallestDifferenceIndex = undefined

                    let matchHasBeenFound = false
                    let j = 0
                    while (!matchHasBeenFound && j < this.fftResultB.length) {
                        let partialB = this.fftResultB[j]
                        let difference = Math.abs(partialB.frequency - partialA.frequency)
                        if (smallestDifference === undefined || difference < smallestDifference) {
                            if (difference == 0) {
                                matchHasBeenFound = true
                            }
                            smallestDifference = difference
                            smallestDifferenceIndex = j
                        }

                        j += 1
                    }

                    let partialB = this.fftResultB[smallestDifferenceIndex]
                    let partialBFrequencyFloored = Math.floor(partialB.frequency)

                    const transition = {
                        source: partialA,
                        target: partialB
                    }
                    if (this.debug) {
                        // console.log("transition (loop 1)")
                        // console.log(transition)
                    }
                    this.transitions.push (transition)

                    if (this.countForFrequency[partialAFrequencyFloored] === undefined) {
                        this.countForFrequency[partialAFrequencyFloored] = 1
                    } else {
                        this.countForFrequency[partialAFrequencyFloored] += 1
                    }

                    if (this.countForFrequencyB[partialBFrequencyFloored] === undefined) {
                        this.countForFrequencyB[partialBFrequencyFloored] = 1
                    } else {
                        this.countForFrequencyB[partialBFrequencyFloored] += 1
                    }

                    i += 1
                }

                i = 0
                while (i < partials && Object.keys(this.countForFrequencyB).length < partials) {
                    let partialB = this.fftResultB[i]
                    let partialBFrequencyFloored = Math.floor(partialB.frequency)

                    if (!this.countForFrequencyB[partialBFrequencyFloored]) {
                        
                        let smallestDifference = undefined
                        let smallestDifferenceIndex = undefined
                        
                        let j = 0
                        while (j < partials) {
                            let difference = Math.abs(this.fftResult[j].frequency - partialB.frequency)

                            if (smallestDifference === undefined || difference < smallestDifference) {
                                smallestDifference = difference
                                smallestDifferenceIndex = j
                            }

                            j += 1
                        }
                        let partialA = this.fftResult[smallestDifferenceIndex]
                        let partialAFrequencyFloored = Math.floor(partialA.frequency)

                        const transition = {
                            source: partialA,
                            target: partialB
                        }
                        if (this.debug) {
                            // console.log("transition")
                            // console.log(transition)
                        }
                        this.transitions.push (transition)

                        if (this.debug) {
                            // console.log("countForFrequency[partialAFrequencyFloored]", this.countForFrequency[partialAFrequencyFloored])
                            // console.log("partialAFrequencyFloored", partialAFrequencyFloored)
                        }
                        this.countForFrequency[partialAFrequencyFloored] += 1
                        this.countForFrequencyB[partialBFrequencyFloored] = 1
                    }

                    i += 1
                }

                if (this.debug_3) {
                    // console.log("this.partialTimedSignals.length", this.partialTimedSignals.length)
                    // console.log("this.transitions.length", this.transitions.length)
                    // console.log("partials", partials)
                    this.debug_3 = false
                }
                
                for (i = 0; i < this.transitions.length; i++) {
                    
                    let frequency = this.transitions[i].source.frequency
                                    * inverseBalance
                                    + this.transitions[i].target.frequency
                                    * balance
                    
                    let stepSize = frequency / this.sampleRate
                    if (i < this.partialTimedSignals.length) {
                        this.partialTimedSignals[i].stepSize = stepSize 
                    } else {
                        this.partialTimedSignals.push(new TimedSignal(stepSize))
                    }
                }

                if (this.debug) {
                    // console.log(this.countForFrequency)
                    // console.log(this.countForFrequencyB)
                    // console.log("transitions")
                    // console.log(this.transitions)
                    this.debug = false
                }

            }
        }

        for (let i = 0; i < this.partialTimedSignals.length; i++) {
            this.partialTimedSignals[i].advanceTime()
        }

        super.advanceTime(sampleRate)
    }

    calculateOutputFromInput(input) {
        let output = 0

        const inputB = this.inputB.getModulatedValue()
        const mode = this.parameters.mode.getModulatedValue()
        const partials = Math.floor(this.parameters.partials.getModulatedValue())
        const balance = this.parameters.balance.getModulatedValue()
        const inverseBalance = 1 - balance

        this.window.push(input)
        this.windowB.push(inputB)

        if (this.fftResult.length == 0 && this.window.length >= this.windowSize) {
            if (mode == 4) {
                this.fftResult = getHarmonicsFromAudioData(this.window, this.sampleRate)
                this.fftResultB = getHarmonicsFromAudioData(this.windowB, this.sampleRate)
            } else {
                this.fftResult = getLoudestHarmonicsFromAudioData(this.window, this.sampleRate, partials)
                this.fftResultB = getLoudestHarmonicsFromAudioData(this.windowB, this.sampleRate, partials)

                if (this.debug_4 == 0) {
                    console.log("this.fftResult", this.fftResult)
                    console.log("this.fftResultB", this.fftResultB)
                }
            }

            this.window = []
            this.windowB = []
            this.debug = true
        }
        if (this.fftResult.length >= partials) {
            for (let i = 0; i < this.transitions.length; i++) {

                if (this.debug_4 < 600) {
                    console.log("i", i)
                    console.log("this.transitions[i].source", this.transitions[i].source)
                    console.log("this.transitions[i].target", this.transitions[i].target)
                    console.log("inverseBalance", inverseBalance)
                    console.log("balance", balance)
                    console.log("this.partialTimedSignals[i].x", this.partialTimedSignals[i].x)
                }

                const partialOutput = this.getFadedPartialOutput(
                    this.transitions[i].source,
                    this.transitions[i].target,
                    inverseBalance,
                    balance,
                    this.partialTimedSignals[i].x
                )

                if (this.debug_4 < 100) {
                    //console.log("partialOutput", partialOutput)
                }

                output += partialOutput
            }
            
            if (this.debug_4 < 100 || (this.debug_4 < 1000 && output > 0.01)) {
                //console.log("final output", output)
            }
        }

        this.debug_4 += 1


        return output
    }
}