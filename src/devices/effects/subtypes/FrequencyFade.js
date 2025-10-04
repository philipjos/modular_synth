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
                0,
                500,
                1,
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

        this.timedSignals["mainTime"] = new TimedSignal(1)
    }

    resetForCalculations() {
        super.resetForCalculations()
        this.window = []
        this.windowB = []
        this.fftResult = []
        this.fftResultB = []
    }

    getFadedPartialOutput(partialA, partialB, inverseBalance, balance) {
        let fadedFrequency = partialA.frequency * inverseBalance + partialB.frequency * balance
        let fadedAmplitude = partialA.magnitude * inverseBalance + partialB.magnitude * balance
        let fadedPhase = partialA.phase * inverseBalance + partialB.phase * balance

        return Math.sin(
            fadedFrequency
            * this.timedSignals["mainTime"].x
            * 2 * Math.PI
            + fadedPhase
        ) * fadedAmplitude
    }

    calculateOutputFromInput(input) {
        let output = 0
        const inputB = this.inputB.getModulatedValue()
        const mode = this.parameters.mode.getModulatedValue()
        const balance = this.parameters.balance.getModulatedValue()
        const inverseBalance = 1 - balance
        const partials = Math.floor(this.parameters.partials.getModulatedValue())

        this.window.push(input)
        this.windowB.push(inputB)

        if (this.window.length >= this.windowSize) {
            this.fftResult = getHarmonicsFromAudioData(this.window, this.sampleRate, partials)
            this.fftResultB = getHarmonicsFromAudioData(this.windowB, this.sampleRate, partials)

            this.window = []
            this.windowB = []
        }

        if (this.fftResult.length >= partials) {
            if (mode == "frequencyRank") {
                const frequencySorted = this.fftResult.sort((a, b) => a.frequency - b.frequency)
            } else if (mode == 0) {
                const frequencySorted = this.fftResult.sort((a, b) => a.frequency - b.frequency)
                const frequencySortedB = this.fftResultB.sort((a, b) => a.frequency - b.frequency)

                let indexOfNearest = 0
                for (let i = 0; i < partials; i++) {
                    let partialA = frequencySorted[i]
                    let partialAFrequency = partialA.frequency
                    let smallestDifference = 0
                    let nearestHasBeenFound = false
                    let j = indexOfNearest
                    let lastIndexOfNearest = indexOfNearest
                    while (!nearestHasBeenFound && j < partials) {
                        let partialB = frequencySortedB[j]
                        let partialBFrequency = partialB.frequency
                        let difference = Math.abs(partialBFrequency - partialAFrequency)
                        if (j == lastIndexOfNearest) {
                            smallestDifference = difference
                            if (j == 0) {
                                output += this.getFadedPartialOutput(
                                    partialA,
                                    partialB, 
                                    inverseBalance,
                                    balance
                                )
                            }
                        } else if (difference > smallestDifference) {
                            nearestHasBeenFound = true
                            break
                        } else if (difference < smallestDifference) {
                            smallestDifference = difference
                            indexOfNearest = j

                            output += this.getFadedPartialOutput(
                                partialA,
                                partialB, 
                                inverseBalance,
                                balance
                            )
                        }
                        j++
                    }
                }

                if (indexOfNearest < (partials - 1)) {
                    for (let i = indexOfNearest + 1; i < partials; i++) {
                        output += this.getFadedPartialOutput(
                            partialA,
                            partialB, 
                            inverseBalance,
                            balance
                        )
                    }
                }
                output = output / partials
            } else if (mode == "nearestAmplitude") {
                const amplitudeSorted = this.fftResult.sort((a, b) => a.magnitude - b.magnitude)
                output = amplitudeSorted[0].magnitude
            } else if (mode == "amplitudeRank") {
                output = this.fftResult.map(harmonic => harmonic * frequency)
            }
        }

        return output
    }
}