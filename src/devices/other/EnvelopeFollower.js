class EnvelopeFollower extends OtherDevice {
    static typeDisplayName = "Envelope follower"
    static typeId = "envelope_follower"

    constructor() {
        super();
        this.minFrequency = 20
        this.memory = [];

        this.setParametersAndSetup({
            bias: new SelectionParameter(
                "bias",
                "Bias",
                [
                    {
                        label: "Up",
                        value: "up"
                    },
                    {
                        label: "None",
                        value: "none"
                    }
                ]
            ),
            attack: new NumericalParameter(
                "attack",
                "Attack",
                0,
                2000,
                10,
                0
            ),
            slopeMode: new SelectionParameter(
                "slopeMode",
                "Slope mode",
                [
                    {
                        label: "Timed",
                        value: "timed"
                    },
                    {
                        label: "Constant",
                        value: "constant"
                    }
                ]
            ),
            sensitivityThreshold: new NumericalParameter(
                "sensitivityThreshold",
                "Sensitivity threshold",
                0,
                1,
                0.01,
                0
            )
        })

        this.input = new NumericalParameter(
            "input",
            "Input",
            -1,
            1,
            0,
            0
        )

        this.nonDisplayedParameters = {
            "input": this.input
        }
    }

    calculateOutput() {
        const input = this.nonDisplayedParameters.input.getModulatedValue();
        let output = this.hasStarted ? this.lastOutput : -1

        let reached = false
        if (this.envelopeStarted) {
            if (this.isSlopePositive) {
                reached = this.lastOutput >= this.target
            } else {
                reached = this.lastOutput <= this.target
            }
    
            if (reached) {
                this.envelopeStarted = false
            }
        } 

        if (!this.envelopeStarted) {
            let newTarget = 0
            if (this.parameters.bias.getModulatedValue() == 0) {
                let max = 0
                for (let i = 0; i < this.memory.length; i++) {
                    let abs = Math.abs(this.memory[i])
                    if (abs > max) {
                        max = abs
                    }
                }
    
                newTarget = max
            } else {
                let total = 0
                for (let i = 0; i < this.memory.length; i++) {
                    total += Math.pow(this.memory[i], 2)
                }
    
                newTarget = Math.sqrt(total / this.memory.length)
            }

            newTarget = newTarget * 2 - 1
            
            // Multiply by 2 to convert to -1 : 1 scale.
            const sensitivityThreshold = this.parameters.sensitivityThreshold.getModulatedValue() * 2
            if (Math.abs(newTarget - this.target) >= sensitivityThreshold) {
                this.envelopeStarted = true
                this.origin = this.lastOutput
                this.target = newTarget

                const attack = this.parameters.attack.getModulatedValue()
                let attackInSamples = attack / 1000 * this.sampleRate
                
                this.isSlopePositive = newTarget > this.origin

                if (attackInSamples == 0) {
                    this.slope = this.isSlopePositive? 1 : -1
                } else {
                    if (this.parameters.slopeMode.getModulatedValue() == 0) {
                        this.slope = (newTarget - this.origin) / attackInSamples 
                    } else {
                        this.slope = 2 / attackInSamples * (this.isSlopePositive ? 1 : -1)
                    }
                }
            }
        }

        if (this.envelopeStarted) {
            if (this.isSlopePositive) {
                output = Math.min(this.target, this.lastOutput + this.slope)
            } else {
                output = Math.max(this.target, this.lastOutput + this.slope)
            }
        }

        if (this.memory.length >= this.periodFromMinFrequencyInSamples) {
            this.memory.shift()
        }
        this.memory.push(input)
        
        this.hasStarted = true

        return output;
    }

    resetForCalculations() {
        super.resetForCalculations()
        this.memory = [];
        this.envelopeStarted = false
        this.slope = 0
        this.origin = -1
        this.target = -1
        this.isSlopePositive = true
        this.hasStarted = false
        this.periodFromMinFrequencyInSamples = (1 / this.minFrequency) * this.sampleRate
    }
}