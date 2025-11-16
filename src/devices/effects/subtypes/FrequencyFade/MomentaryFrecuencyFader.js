class MomentaryFrecuencyFader {
    constructor(transitionType) {
        this.transitionType = transitionType
        this.countForFrequency = {}
        this.countForFrequencyB = {}
        this.debug = 0
    }

    getTransitionsWithNormalizedDuplicates(transitions, countForFrequency, countForFrequencyB) {
        var normalizedTransitions = []
        for (let transition of transitions) {
            let normalizedTransition = {
                source: transition.source,
                target: transition.target
            }
            normalizedTransition.source.magnitude /= countForFrequency[Math.floor(transition.source.frequency)]
            normalizedTransition.target.magnitude /= countForFrequencyB[Math.floor(transition.target.frequency)]

            normalizedTransitions.push(normalizedTransition)
        }

        return normalizedTransitions
    }

    silentPartialFrom(partial) {
        return {...partial,
            magnitude: 0
        }
    }

    calculateTransitions(sourceFFT, destinationFFT) {
        var transitions = []

        if (this.transitionType == 4) {
            transitions = sourceFFT.map((partial) => {
                return {
                    source: partial,
                    target: silentPartialFrom(partial)
                }
            }).concat(destinationFFT.map((partial) => {
                return {
                    source: silentPartialFrom(partial),
                    target: partial
                }
            }))

            return transitions
        }

        if (sourceFFT.length == 0 || destinationFFT.length == 0) {
            return []
        }


        this.countForFrequency = {}
        this.countForFrequencyB = {}

        let i = 0
        while (i < sourceFFT.length) {
            let partialA = sourceFFT[i]
            let partialAFrequencyFloored = Math.floor(partialA.frequency)
            
            let smallestDifference = undefined
            let smallestDifferenceIndex = undefined

            let matchHasBeenFound = false
            let j = 0
            while (!matchHasBeenFound && j < destinationFFT.length) {
                let partialB = destinationFFT[j]

                var difference
                if (this.transitionType == 0) {
                    difference = Math.abs(partialB.frequency - partialA.frequency)
                } else if (this.transitionType == 2) {
                    difference = Math.abs(partialB.magnitude - partialA.magnitude)
                }
                
                if (smallestDifference === undefined || difference < smallestDifference) {
                    if (difference == 0) {
                        matchHasBeenFound = true
                    }
                    smallestDifference = difference
                    smallestDifferenceIndex = j
                }

                j += 1
            }

            let partialB = destinationFFT[smallestDifferenceIndex]
            let partialBFrequencyFloored = Math.floor(partialB.frequency)

            const transition = {
                source: partialA,
                target: partialB
            }
            transitions.push(transition)

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
        while (i < destinationFFT.length && Object.keys(this.countForFrequencyB).length < destinationFFT.length) {
            let partialB = destinationFFT[i]
            let partialBFrequencyFloored = Math.floor(partialB.frequency)

            if (!this.countForFrequencyB[partialBFrequencyFloored]) {
                
                let smallestDifference = undefined
                let smallestDifferenceIndex = undefined
                
                let j = 0
                while (j < sourceFFT.length) {

                    var difference
                    if (this.transitionType == 0) {
                        difference = Math.abs(sourceFFT[j].frequency - partialB.frequency)
                    } else if (this.transitionType == 2) {
                        difference = Math.abs(sourceFFT[j].magnitude - partialB.magnitude)
                    }

                    if (smallestDifference === undefined || difference < smallestDifference) {
                        smallestDifference = difference
                        smallestDifferenceIndex = j
                    }

                    j += 1
                }
                let partialA = sourceFFT[smallestDifferenceIndex]
                let partialAFrequencyFloored = Math.floor(partialA.frequency)

                const transition = {
                    source: partialA,
                    target: partialB
                }
                transitions.push(transition)

                this.countForFrequency[partialAFrequencyFloored] += 1
                this.countForFrequencyB[partialBFrequencyFloored] = 1
            }

            i += 1
        }

        transitions = this.getTransitionsWithNormalizedDuplicates(transitions, this.countForFrequency, this.countForFrequencyB)

        return transitions
    }
}