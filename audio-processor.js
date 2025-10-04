class ModularSynthProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.port.onmessage = (event) => {
            if (event.data.type === 'updateSynth') {
                this.synthData = event.data.data;
                console.log('AudioWorklet received synth data:', this.synthData);
            }
        };
        this.synthData = null;
        this.sampleIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const outputChannel = output[0];
        
        if (!this.synthData) {
            // Fill with silence if no synth data
            outputChannel.fill(0);
            return true;
        }

        const { oscillators, connections, effects, otherDevices, mainVolume, sampleRate } = this.synthData;
        
        // Debug: Log first few samples to see if we're getting data
        if (this.sampleIndex < 10) {
            console.log('AudioWorklet processing, sample:', this.sampleIndex, 'oscillators:', oscillators.length);
        }
        
        // Reset devices for this buffer calculation
        this.resetDevicesForBufferCalculation(oscillators, effects, otherDevices, sampleRate);
        
        for (let i = 0; i < outputChannel.length; i++) {
            let outputValue = 0;
            
            // Reset modulation deltas for all devices
            for (let device of [...oscillators, ...effects, ...otherDevices]) {
                this.resetModulationDeltas(device);
            }
            
            // Apply connections (modulation)
            for (let connection of connections) {
                if (connection.from && connection.parameter && connection.amount !== undefined) {
                    const fromDevice = this.findDeviceById(connection.from, oscillators, effects, otherDevices);
                    const targetDevice = this.findDeviceById(connection.to, oscillators, effects, otherDevices);
                    
                    if (fromDevice && targetDevice && targetDevice.parameters && targetDevice.parameters[connection.parameter]) {
                        const parameter = targetDevice.parameters[connection.parameter];
                        const lastValue = fromDevice.lastOutput || 0;
                        parameter.modulationDelta = (parameter.modulationDelta || 0) + lastValue * connection.amount;
                    }
                }
            }
            
            // Process all devices
            for (let device of [...oscillators, ...effects, ...otherDevices]) {
                this.advanceTime(device, 1);
                
                if (device.goesToMainOutput) {
                    const deviceOutput = this.calculateDeviceOutput(device);
                    device.lastOutput = deviceOutput;
                    outputValue += deviceOutput;
                    
                    // Debug: Log first few device outputs
                    if (this.sampleIndex < 5 && i < 5) {
                        console.log('Device output:', device.typeId, deviceOutput);
                    }
                }
            }
            
            // Apply main volume and safety clipping
            outputChannel[i] = Math.max(-1, Math.min(1, outputValue * mainVolume * 0.1));
            this.sampleIndex++;
        }
        
        return true;
    }
    
    resetDevicesForBufferCalculation(oscillators, effects, otherDevices, sampleRate) {
        for (let device of [...oscillators, ...effects, ...otherDevices]) {
            device.sampleRate = sampleRate;
            this.resetForCalculations(device);
            this.resetTimedSignals(device);
            this.setStepSizes(device, sampleRate);
            device.lastOutput = 0;
        }
    }
    
    resetForCalculations(device) {
        this.resetModulationDeltas(device);
        this.resetTimedSignals(device);
        
        // Reset noise-specific properties
        if (device.typeId === 'noise') {
            device.lastSamplePoint = -1;
        }
    }
    
    resetModulationDeltas(device) {
        if (device.parameters) {
            for (let key in device.parameters) {
                device.parameters[key].modulationDelta = 0;
            }
        }
        if (device.nonDisplayedParameters) {
            for (let key in device.nonDisplayedParameters) {
                device.nonDisplayedParameters[key].modulationDelta = 0;
            }
        }
    }
    
    resetTimedSignals(device) {
        if (device.timedSignals) {
            for (let key in device.timedSignals) {
                device.timedSignals[key].x = 0;
            }
        }
    }
    
    advanceTime(device, scale) {
        if (device.timedSignals) {
            for (let key in device.timedSignals) {
                const timedSignal = device.timedSignals[key];
                timedSignal.x += timedSignal.stepSize;
            }
        }
    }
    
    setStepSizes(device, sampleRate) {
        if (device.typeId === 'oscillator_proper') {
            // Calculate main time frequency based on frequency parameter
            const frequency = this.getModulatedValue(device.parameters.frequency);
            const mainTimeStepSize = frequency / sampleRate;
            device.timedSignals.mainTime.stepSize = mainTimeStepSize;
            
            // Calculate sync time step size
            const sync = this.getModulatedValue(device.parameters.sync);
            device.timedSignals.syncTime.stepSize = mainTimeStepSize * sync;
        } else if (device.typeId === 'noise') {
            // Noise doesn't need timed signals
        }
    }
    
    findDeviceById(id, oscillators, effects, otherDevices) {
        return [...oscillators, ...effects, ...otherDevices].find(device => device.id === id);
    }
    
    calculateDeviceOutput(device) {
        // Use the polymorphic approach - execute the registered calculation function
        if (device.calculation && device.calculation.calculateOutput) {
            try {
                // Create a function that has access to the device and getModulatedValue
                // The calculation.calculateOutput contains just the function body
                const calculateFunction = new Function('device', 'getModulatedValue', device.calculation.calculateOutput);
                return calculateFunction(device, this.getModulatedValue.bind(this));
            } catch (error) {
                console.error('Error executing device calculation:', error);
                return 0;
            }
        }
        return 0;
    }
    
    getModulatedValue(parameter) {
        const scaledModulationDelta = parameter.modulationDelta * parameter.rangeDerivedValue / 2;
        let output = parseFloat(parameter.value) + scaledModulationDelta;
        output = Math.max(parameter.min, Math.min(parameter.max, output));
        return output;
    }
}

registerProcessor('modular-synth-processor', ModularSynthProcessor);
