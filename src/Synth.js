class Synth extends View {
    constructor() {
        super()

        this.main_width = 300

        this.oscilloscopeWidth = this.main_width
        this.oscilloscopeHeight = 100

        this.playingVolume = 0
        this.playingEnvelopeAttack = 0.02
        this.playingEnvelopeRelease = 0.1
        this.playingEnvelopeState = "steady"

        this.tabs = [
            "oscillators",
            "connections",
            "effects"
        ]

        this.oscillators = []
        this.connections = [] 
        this.effects = []

        this.connectionePartyDeviceIdsCache = []
        this.connectionPartyNamesCache = []

        this.lastDeviceId = 0

        var frequencyScalableParameterType = new ScalableParameter(0.5, 0, 500)
        var amplitudeScalableParameterType = new ScalableParameter(0.5, 0, 1)
        var phaseScalableParameterType = new ScalableParameter(0.5, 0, 1)
        var shapeScalableParameterType = new ScalableParameter(0.5, 0, 2)
        var partialsScalableParameterType = new ScalableParameter(0.5, 1, 31)
        var syncScalableParameterType = new ScalableParameter(0.5, 1, 16)

        this.phaseSliderDefaultViewValue = 0
        this.partialsSliderDefaultViewValue = 1000
        this.syncSliderDefaultValue = 0
        this.shapeSliderDefaultValue = 0

        this.rateSliderDefaultValue = 1000
        this.sliderDefaultViewValue = 500 

        this.mainVolume = 0.25;
        this.mainVolumeScalableParameterType = new ScalableParameter(0.25, 0, 1)

        // Noise oscillator
        var rateScalableParameterType = new ScalableParameter(0.5, 0, 1)

        // Connection
        var connectionAmountScalableParameterType = new ScalableParameter(0.5, 0, 1)

        // Distortion
        var distortionAmountScalableParameterType = new ScalableParameter(0.5, 0, 1)

        this.oscilloscope = new Oscilloscope(this.oscilloscopeWidth, this.oscilloscopeHeight)

        this.dropdownStates = {}

        var availableEffects = [Delay]

        this.devices = []

        document.addEventListener("keydown", this.onKeyDown.bind(this))

        this.setupView()

        const effectsView = document.getElementById("effects");
        const oscilloscopeContainer = document.getElementById("oscilloscope-container")

        this.addTapOutHandler()

        this.oscilloscope.appendToView(oscilloscopeContainer);
        this.updateMainVolumeSliderFromModel();
        this.addOscillator();
        this.addConnection();
        this.setTab(0);
        this.updateOscilloscope();

        const devicesDropdown = document.getElementsByClassName("dropdown-content")[0]

        for (let i = 0; i < availableEffects.length; i++) {
            const effect = availableEffects[i]
            const effectDropdownItem = document.createElement("div")
            effectDropdownItem.classList.add("dropdown-item")
            effectDropdownItem.innerHTML = effect.typeDisplayName

            effectDropdownItem.addEventListener("click", (e) => {
                this.onAddDeviceClicked(e, effect)
            })
            devicesDropdown.appendChild(effectDropdownItem)
        }
    }

    setupView() {
        const main_container = document.createElement("div")
        main_container.style.display = "flex"
        main_container.style.flexDirection = "column"
        main_container.style.gap = 16
        main_container.style.width = this.main_width
        main_container.style.padding = "8px 0px 0px 0px"
        main_container.style.boxSizing = "border-box"

        const main_volume_section = document.createElement("div")
        main_volume_section.style.display = "flex"
        main_volume_section.style.alignItems = "center"
        main_volume_section.style.justifyContent = "center"
        main_volume_section.style.padding = "8px 12px 8px 8px"
        main_volume_section.style.whiteSpace = "nowrap"
        main_volume_section.style.borderRadius = 4
        main_volume_section.backgroundColor = "aliceblue"

        const main_volume_title_view = document.createElement("div")

        this.mainVolumeSlider = document.createElement("input")
        this.mainVolumeSlider.id="main-volume-slider"
        this.mainVolumeSlider.type="range"
        this.mainVolumeSlider.min = 0
        this.mainVolumeSlider.max = 0
        this.mainVolumeSlider.step = 1
        this.mainVolumeSlider.value = 250
        this.mainVolumeSlider.onInput = this.onMainVolumeChanged.bind(this)

        document.body.appendChild(main_container)
        main_container.appendChild(main_volume_section)
        main_volume_section.appendChild(main_volume_title_view)

        const oscilloscope_container = document.createElement("div")
        oscilloscope_container.id = "oscilloscope-container"
        main_container.appendChild(oscilloscope_container)

        const devices_section = document.createElement("div")
        document.body.appendChild(devices_section)
        devices_section.id = "devices-section"

        const tabsView = document.createElement("div")

        for (let tab of this.tabs) {
            const tabView = document.createElement("div")
            tabView.id = tab
            tabsView.appendChild(tabView)
        }

        devices_section.appendChild(tabsView)

        this.oscillatorsView = document.getElementById("oscillators")
        this.connectionsView = document.getElementById("connections")
        this.effectsView = document.getElementById("effects")
    }

    getUnscaledSliderValue(value) {
        return value / 1000
    }
    
    getScaledFrequency(value) {
        const top = 500
        const bottom = 0
        return value * (top - bottom) + bottom
    }
    
    getScaledShape(value) {
        const top = 2
        const bottom = 0
        const bottomAndOne = bottom - 1
        var ceiled = Math.ceil(value * (top - bottomAndOne) + bottomAndOne)
        return Math.max(ceiled, bottom)
    }
    
    getScaledPartials(value) {
        const top = 31
        const bottom = 1
        return Math.floor(value * (top - bottom) + bottom)
    }
    
    getScaledSync(value) {
        const top = 16
        const bottom = 1
        return value * (top - bottom) + bottom
    }
    
    onFrequencySliderChange(event) {
        frequency = this.getUnscaledSliderValue(event.target.value)
        updateOscilloscope()
    }
    
    onAmplitudeSliderChange(event) {
        amplitude = this.getUnscaledSliderValue(event.target.value)
        updateOscilloscope()
    }


    modulatableParametersForType(type) {
        if (type == "oscillator") {
            return [
                {
                    name: "frequency",
                    title: "Frequency",
                },
                {
                    name: "amplitude",
                    title: "Amplitude",
                },
                {
                    name: "phase",
                    title: "Phase",
                },
                {
                    name: "shape",
                    title: "Shape",
                },
                {
                    name: "partials",
                    title: "Partials",
                },
                {
                    name: "sync",
                    title: "Sync",
                }
            ]
        } else if (type == "noise") {
            return [
                {
                    name: "rate",
                    title: "Rate",
                },
                {
                    name: "amplitude",
                    title: "Amplitude",
                }
            ]
        } else if (type == "distortion") {
            return [
                {
                    name: "amount",
                    title: "Amount",
                }
            ]
        }
    }

    calculateBuffer(length, scale) {
        let outputBuffer = []
    
        for (let i = 0; i < this.oscillators.length; i++) {
            this.oscillators[i].timedSignalX = 0
            this.oscillators[i].syncTimedSignalX = 0
        }
    
        var connectionsIndexMapped = []
        for (let i = 0; i < this.connections.length; i++) {
            const source = this.connections[i].source
            const destination = this.connections[i].destination
            if (source == 0 || destination == 0) {
                continue
            }
    
            // TODO: get rid of this (It should be 0 as above)
            if (source == "-" || destination == "-") {
                continue
            }
    
            if (connections[i].destinationParameter == "-") {
                continue
            }
    
            const sourceIndex = this.connectionePartyDeviceIdsCache.findIndex((id) => id === source)
            const destinationIndex = this.connectionePartyDeviceIdsCache.findIndex((id) => id === destination)
            connectionsIndexMapped.push({
                source: sourceIndex,
                destination: destinationIndex,
                amount: this.connections[i].amount,
                destinationParameter: this.connections[i].destinationParameter
            })
        }
    
        var mainBusLastSignal = 0
    
        for (let i = 0; i < length; i++) {
            let output = 0
            let mainBusNewSignal = 0
    
            var modulatedDevices = []
            for (let deviceIndex = 0; deviceIndex < this.connectionePartyDeviceIdsCache.length; deviceIndex++) {
                const device = this.getConnectionPartyDeviceWithId(this.connectionePartyDeviceIdsCache[deviceIndex])
                const copiedDevice = {
                    ...device
                }
    
                if (device["inputValue"]) {
                    copiedDevice["inputValue"] = 0
                }
    
                if (device["mainBus"] == true && outputBuffer.length > 0) {
                    copiedDevice["inputValue"] = mainBusLastSignal
                }
    
                modulatedDevices.push(copiedDevice)
            }
    
            for (let connectionIndex = 0; connectionIndex < connectionsIndexMapped.length; connectionIndex++) {
                const source = this.connections[connectionIndex].source
                const destination = this.connections[connectionIndex].destination
                const destinationIndex = modulatedDevices.findIndex((device) => {
    
                    // TODO: (Along with other places) make this able to work with a ===.
                    return device.id == destination
                })
                const amount = this.connections[connectionIndex].amount
                const destinationParameter = this.connections[connectionIndex].destinationParameter
    
                const sourceDevice = this.getConnectionPartyDeviceWithId(source)
                const previousValue = sourceDevice.previousValue 
    
                const parameterValue = modulatedDevices[destinationIndex][destinationParameter]
                modulatedDevices[destinationIndex][destinationParameter] += previousValue * amount
    
                const newValue = modulatedDevices[destinationIndex][destinationParameter]
            }
            
            for (let deviceIndex = 0; deviceIndex < modulatedDevices.length; deviceIndex++) {
                const device = this.getConnectionPartyDeviceWithId(this.connectionePartyDeviceIdsCache[deviceIndex])
                
                if (device.type == "oscillator") {
                    const x = modulatedDevices[deviceIndex].timedSignalX
                    const syncX = modulatedDevices[deviceIndex].syncTimedSignalX
                    const amplitude = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].amplitude));
                    const frequency = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].frequency));
                    const frequencyScaled = this.getScaledFrequency(frequency)
                    const phase = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].phase))
                    const shape = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].shape))
                    const scaledShape = this.getScaledShape(shape)
                    const partials = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].partials))
                    const partialsScaled = this.getScaledPartials(partials)
                    const sync = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].sync))
                    const scaledSync = this.getScaledSync(sync)
    
                    var signal = 0
    
                    for (let partial = 1; partial <= partialsScaled; partial++) {
                        var partialFrequency = 0;
                        var partialAmplitude = 0;
    
                        if (scaledShape == 0) {
                            partialFrequency = partial
                            partialAmplitude = 2 / (Math.PI * partial)
                        } else if (scaledShape == 1) {
                            partialFrequency = partial * 2 - 1
                            partialAmplitude = 4 / (Math.PI * partialFrequency)
                        } else if (scaledShape == 2) {
                            partialFrequency = partial * 2 - 1
                            partialAmplitude = -8 * Math.pow(-1, partial) / (Math.pow(Math.PI, 2) * Math.pow(partialFrequency, 2))
                        }
    
                        signal += Math.sin((syncX + phase) * Math.PI * 2 * partialFrequency) * partialAmplitude * amplitude
                    }
    
                    this.setPropertyOfConnectionPartyDeviceWithId(this.connectionePartyDeviceIdsCache[deviceIndex], "previousValue", signal)
    
                    if (device.mainOutput) {
                        output += signal
                        mainBusNewSignal += signal
                    }
    
                    var timedSignalXNewValue = device.timedSignalX + frequencyScaled / scale
                    const syncFrequency = frequencyScaled * scaledSync
                    var syncTimedSignalXNewValue = device.syncTimedSignalX + syncFrequency / scale
    
                    
                    if (timedSignalXNewValue >= 1) {
                        timedSignalXNewValue = 0
                        syncTimedSignalXNewValue = 0
                    }
    
                    this.setPropertyOfConnectionPartyDeviceWithId(this.connectionePartyDeviceIdsCache[deviceIndex], "timedSignalX", timedSignalXNewValue)
                    this.setPropertyOfConnectionPartyDeviceWithId(this.connectionePartyDeviceIdsCache[deviceIndex], "syncTimedSignalX", syncTimedSignalXNewValue)
                } else if (device.type == "noise") {
                    var timedSignalX = modulatedDevices[deviceIndex].timedSignalX
                    const rate = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].rate))
                    const scaledRate = rate * 20000
                    const amplitude = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].amplitude))
    
                    var signal = modulatedDevices[deviceIndex].previousValue
    
                    
                    if (timedSignalX >= 1) {
                        timedSignalX = 0
                        signal = (Math.random() * 2 - 1) * amplitude
                    }
                    
                    var timedSignalXNewValue = timedSignalX + scaledRate / scale
                    this.setPropertyOfConnectionPartyDeviceWithId(this.connectionePartyDeviceIdsCache[deviceIndex], "timedSignalX", timedSignalXNewValue)
                    this.setPropertyOfConnectionPartyDeviceWithId(this.connectionePartyDeviceIdsCache[deviceIndex], "previousValue", signal)
    
                    if (device.mainOutput) {
                        output += signal
                    }
    
                } else if (device.type == "distortion") {
                    const amount = Math.max(0, Math.min(1, modulatedDevices[deviceIndex].amount))
                    const scaledAmount = amount * 20
    
                    const inputValue = modulatedDevices[deviceIndex]["inputValue"]
    
                    const clip = 0.8
                    const signal = Math.max(-clip, Math.min(clip, inputValue * scaledAmount))
                    this.setPropertyOfConnectionPartyDeviceWithId(this.connectionePartyDeviceIdsCache[deviceIndex], "previousValue", signal)
    
                    if (device.mainOutput) {
                        output += signal
                    }
                }
            }
    
            mainBusLastSignal = mainBusNewSignal
    
            outputBuffer.push(output)
        }
    
        return outputBuffer
    }
    
    updateOscilloscope() {
        let oscillatorWidthsPerSecond = 50
        let pixelsPerSecond = oscillatorWidthsPerSecond * this.oscilloscopeWidth
        let outputBuffer = this.calculateBuffer(this.oscilloscopeWidth, pixelsPerSecond)
    
        this.oscilloscope.updateFromBuffer(outputBuffer)
    }
    
    onKeyDown(event) {
        this.triggerPlay()
    }
    
    triggerPlay() {
        this.playingEnvelopeState = "attack"
        this.play()
    }
    
    play() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
        const volume = 1;
        const volumeSafeScale = 0.1;
        const safetyHardClip = 1;
        const duration = 1;
        const sampleRate = audioCtx.sampleRate;
        const length = sampleRate * duration;
    
        const buffer = audioCtx.createBuffer(1, length, sampleRate);
    
        const data = buffer.getChannelData(0);
    
        const calculatedBuffer = this.calculateBuffer(length, sampleRate)
    
        for (let i = 0; i < length; i++) {
            let releaseScaled = this.playingEnvelopeRelease * sampleRate
            if (i >= length - releaseScaled) {
                this.playingEnvelopeState = "release"
            }
    
            if (this.playingEnvelopeState === "attack") {
                this.playingVolume += 1 / (sampleRate * this.playingEnvelopeAttack)
            } else if (this.playingEnvelopeState === "release") {
                this.playingVolume -= 1 / (sampleRate * this.playingEnvelopeRelease)
            }
            if (this.playingVolume <= 0) {
                this.playingVolume = 0
                this.playingEnvelopeState = "steady"
            } else if (this.playingVolume >= 1) {
                this.playingVolume = 1
                this.playingEnvelopeState = "steady"
            }
    
            data[i] = Math.max(
                -safetyHardClip, 
                Math.min(
                    safetyHardClip, 
                    calculatedBuffer[i] * volume * this.playingVolume * volumeSafeScale * this.mainVolume
                )
            );
        }
    
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
    
        source.connect(audioCtx.destination);
    
        source.start(audioCtx.currentTime);
    }
    
    addOscillatorViewFromModel(model) {
        const id = model.id
        const name = model.name
        
        const oscillator = document.createElement("div");
        oscillator.classList.add("oscillator");
    
        const oscillatorTitle = document.createElement("div");
        oscillatorTitle.innerHTML = name;
        oscillatorTitle.classList.add("device-title");
        oscillatorTitle.classList.add("oscillator-title");
        oscillatorTitle.classList.add("text");
        oscillator.appendChild(oscillatorTitle);
    
        const frequencyText = document.createElement("div");
        frequencyText.innerHTML = "Frequency";
        frequencyText.classList.add("text");
        const frequencyInput = document.createElement("input");
        frequencyInput.type = "range";
        frequencyInput.min = 0;
        frequencyInput.max = 1000;
        frequencyInput.value = this.sliderDefaultViewValue;
        frequencyInput.style.marginBottom = "20px";
        oscillator.appendChild(frequencyText);
        oscillator.appendChild(frequencyInput);
    
        const amplitudeText = document.createElement("div");
        amplitudeText.innerHTML = "Amplitude";
        amplitudeText.classList.add("text");
        const amplitudeInput = document.createElement("input");
        amplitudeInput.type = "range";
        amplitudeInput.min = 0;
        amplitudeInput.max = 1000;
        amplitudeInput.value = this.sliderDefaultViewValue;
        amplitudeInput.style.marginBottom = "20px";
        oscillator.appendChild(amplitudeText);
        oscillator.appendChild(amplitudeInput);
    
        const phaseText = document.createElement("div");
        phaseText.innerHTML = "Phase";
        phaseText.classList.add("text");
        const phaseInput = document.createElement("input");
        phaseInput.type = "range";
        phaseInput.min = 0;
        phaseInput.max = 1000;
        phaseInput.value = this.phaseSliderDefaultViewValue;
        phaseInput.style.marginBottom = "20px";
        oscillator.appendChild(phaseText);
        oscillator.appendChild(phaseInput);
    
        const shapeText = document.createElement("div");
        shapeText.innerHTML = "Shape";
        shapeText.classList.add("text");
        const shapeInput = document.createElement("input");
        shapeInput.type = "range";
        shapeInput.min = 0;
        shapeInput.max = 1000;
        shapeInput.value = this.shapeSliderDefaultValue;
        shapeInput.style.marginBottom = "20px";
        oscillator.appendChild(shapeText);
        oscillator.appendChild(shapeInput);
    
        const partialsText = document.createElement("div");
        partialsText.innerHTML = "Partials";
        partialsText.classList.add("text");
        const partialsInput = document.createElement("input");
        partialsInput.type = "range";
        partialsInput.min = 0;
        partialsInput.max = 1000;
        partialsInput.value = this.partialsSliderDefaultViewValue;
        partialsInput.style.marginBottom = "20px";
        oscillator.appendChild(partialsText);
        oscillator.appendChild(partialsInput);
    
        const syncText = document.createElement("div");
        syncText.innerHTML = "Sync";
        syncText.classList.add("text");
        const syncInput = document.createElement("input");
        syncInput.type = "range";
        syncInput.min = 0;
        syncInput.max = 1000;
        syncInput.value = this.syncSliderDefaultValue;
        syncInput.style.marginBottom = "20px";
        oscillator.appendChild(syncText);
        oscillator.appendChild(syncInput);
    
        this.oscillatorsView.appendChild(oscillator);
    
        frequencyInput.addEventListener("input", (event) => {
            const index = this.findOscillatorIndexById(id)
            this.oscillators[index].frequency = this.getUnscaledSliderValue(event.target.value)
            this.updateOscilloscope()
        })
    
        amplitudeInput.addEventListener("input", (event) => {
            const index = this.findOscillatorIndexById(id)
            this.oscillators[index].amplitude = this.getUnscaledSliderValue(event.target.value)
            this.updateOscilloscope()
        })
        
        phaseInput.addEventListener("input", (event) => {
            const index = this.findOscillatorIndexById(id)
            this.oscillators[index].phase = this.getUnscaledSliderValue(event.target.value)
            this.updateOscilloscope()
        })
    
        shapeInput.addEventListener("input", (event) => {
            const index = this.findOscillatorIndexById(id)
            this.oscillators[index].shape = this.getUnscaledSliderValue(event.target.value)
            this.updateOscilloscope()
        })
    
        partialsInput.addEventListener("input", (event) => {
            const index = this.findOscillatorIndexById(id)
            this.oscillators[index].partials = this.getUnscaledSliderValue(event.target.value)
            this.updateOscilloscope()
        })
    
        syncInput.addEventListener("input", (event) => {
            const index = this.findOscillatorIndexById(id)
            this.oscillators[index].sync = this.getUnscaledSliderValue(event.target.value)
            this.updateOscilloscope()
        })
    
        const mainOutputSection = document.createElement("div");
        mainOutputSection.classList.add("main-output-section");
        oscillator.appendChild(mainOutputSection)
    
        const mainOutputButton = document.createElement("div");
        mainOutputButton.innerHTML = "Main Output";
        mainOutputButton.classList.add("main-output-button");
        mainOutputButton.classList.add("text");
        mainOutputButton.addEventListener("click", () => {
            const index = this.findOscillatorIndexById(id)
            this.oscillators[index].mainOutput = !this.oscillators[index].mainOutput;
            const ledViews = document.getElementsByClassName("main-output-led")
            const ledView = ledViews[index]
            ledView.style.backgroundColor = this.oscillators[index].mainOutput ? "#19F1FF" : "#aaaaaa"
            updateOscilloscope()
        })
        mainOutputSection.appendChild(mainOutputButton)
    
        const mainOutputLED = document.createElement("div");
        mainOutputLED.classList.add("main-output-led");
        mainOutputSection.appendChild(mainOutputLED)
    
        const deleteButton = document.createElement("div");
        deleteButton.innerHTML = "x";
        deleteButton.classList.add("delete-button");
        deleteButton.addEventListener("click", () => {
            const index = this.findOscillatorIndexById(id)
            this.oscillators.splice(index, 1)
            this.updateConnectionPartyCaches()
            this.oscillatorsView.removeChild(oscillator)
            this.updateConnectionsFromRemovingDeviceWithId(id)
            this.updateDropDowns()
            this.updateOscilloscope()
        })
        oscillator.appendChild(deleteButton)
    
        this.updateConnectionPartyCaches()
        this.updateDropDowns()
    }
    
    addOscillator() {
        const oscillatorNumber = this.oscillators.filter((oscillator) => oscillator.type == "oscillator").length + 1
        const name = "Oscillator " + oscillatorNumber
        const id = this.generateNewDeviceId()
    
        const oscillatorModel = {
            id: id,
            name: name,
            type: "oscillator",
            frequency: this.getUnscaledSliderValue(this.sliderDefaultViewValue),
            amplitude: this.getUnscaledSliderValue(this.sliderDefaultViewValue),
            phase: this.getUnscaledSliderValue(this.phaseSliderDefaultViewValue),
            shape: this.getUnscaledSliderValue(this.shapeSliderDefaultValue),
            partials: this.getUnscaledSliderValue(this.partialsSliderDefaultViewValue),
            sync: this.getUnscaledSliderValue(this.syncSliderDefaultValue),
            mainOutput: true,
            timedSignalX: 0,
            syncTimedSignalX: 0,
            previousValue: 0
        }
    
        this.oscillators.push(oscillatorModel)
        this.addOscillatorViewFromModel(oscillatorModel)
    }
    
    findOscillatorIndexById(id) {
        return this.oscillators.findIndex((oscillator) => oscillator.id === id)
    }
    
    addConnectionViewFromModel(model) {
        const id = model.id
        const connctionsView = document.getElementById("connections");
    
        const connection = document.createElement("div");
        connection.classList.add("connection");
    
        const connectionText = document.createElement("div");
        connectionText.innerHTML = "Connection";
        connectionText.classList.add("device-title");
        connectionText.classList.add("text");
        connection.appendChild(connectionText);
    
        const pairRow = document.createElement("div");
        pairRow.classList.add("pair-row");
        connection.appendChild(pairRow);
    
        const sourceSection = document.createElement("div");
        sourceSection.classList.add("source-section");
        pairRow.appendChild(sourceSection);
    
        const sourceTitle = document.createElement("div");
        sourceTitle.innerHTML = "From:";
        sourceTitle.classList.add("text");
        sourceSection.appendChild(sourceTitle);
    
        const sourceSelector = document.createElement("select");
        sourceSelector.classList.add("source-selector");
        sourceSection.appendChild(sourceSelector);
    
        const destinationSection = document.createElement("div");
        destinationSection.classList.add("destination-section");
        pairRow.appendChild(destinationSection);
    
        const destinationOscillatorSection = document.createElement("div");
        destinationOscillatorSection.classList.add("destination-oscillator-section");
        destinationSection.appendChild(destinationOscillatorSection);
    
        const destinationTitle = document.createElement("div");
        destinationTitle.innerHTML = "To:";
        destinationTitle.classList.add("text");
        destinationOscillatorSection.appendChild(destinationTitle);
        const destinationSelector = document.createElement("select");
        destinationSelector.classList.add("destination-selector");
        destinationOscillatorSection.appendChild(destinationSelector);
    
        const destinationParameterSection = document.createElement("div");
        destinationParameterSection.classList.add("destination-parameter-section");
        destinationSection.appendChild(destinationParameterSection);
    
        const destinationParameterTitle = document.createElement("div");
        destinationParameterTitle.innerHTML = "Param:";
        destinationParameterTitle.classList.add("text");
        destinationParameterSection.appendChild(destinationParameterTitle);
        const destinationParameterSelector = document.createElement("select");
        destinationParameterSelector.classList.add("destination-parameter-selector");
        destinationParameterSection.appendChild(destinationParameterSelector);
    
        const amountControl = document.createElement("input");
        amountControl.type = "range";
        amountControl.min = 0;
        amountControl.max = 1000;
        amountControl.value = this.sliderDefaultViewValue;
    
        connection.appendChild(amountControl);
    
        const deleteButton = document.createElement("div");
        deleteButton.innerHTML = "x";
        deleteButton.classList.add("delete-button");
        deleteButton.addEventListener("click", () => {
            this.connections.splice(this.findConnectionIndexById(id), 1)
            connctionsView.removeChild(connection)
            this.updateOscilloscope()
        })
        connection.appendChild(deleteButton)
    
        sourceSelector.addEventListener("input", (event) => {
            const index = this.findConnectionIndexById(id)
            this.connections[index].source = event.target.value
            this.updateOscilloscope()
        })
    
        destinationSelector.addEventListener("input", (event) => {
            const index = this.findConnectionIndexById(id)
            this.connections[index].destination = event.target.value
            this.updateParameterDropDown(index)
            this.updateOscilloscope()
        })
    
        destinationParameterSelector.addEventListener("input", (event) => {
            const index = this.findConnectionIndexById(id)
            this.connections[index].destinationParameter = event.target.value
            this.updateOscilloscope()
        })
    
        amountControl.addEventListener("input", (event) => {
            const index = this.findConnectionIndexById(id)
            this.connections[index].amount = this.getUnscaledSliderValue(event.target.value);
            this.updateOscilloscope()
        })
    
        connctionsView.appendChild(connection);
    
        this.updateConnectionPartyCaches()
    
        const index = this.findConnectionIndexById(id)
        this.updateDropDown(index)
        
        sourceSelector.value = 0
        destinationSelector.value = 0
    }
    
    addConnection() {
        const id = this.generateNewDeviceId()
        const sliderDefaultViewValue = 500
        var connectionModel = {
            id: id,
            source: "-",
            destination: "-",
            amount: this.getUnscaledSliderValue(sliderDefaultViewValue),
            destinationParameter: "-"
        }
    
        this.connections.push(connectionModel)
        this.addConnectionViewFromModel(connectionModel)
    }
    
    addNoiseViewFromModel(model) {
        const id = model.id
        const name = model.name
        
        const noiseOscillator = document.createElement("div");
        noiseOscillator.classList.add("oscillator");
    
        const noiseOscillatorTitle = document.createElement("div");
        noiseOscillatorTitle.innerHTML = name;
        noiseOscillatorTitle.classList.add("device-title");
        noiseOscillatorTitle.classList.add("oscillator-title");
        noiseOscillatorTitle.classList.add("text");
        noiseOscillator.appendChild(noiseOscillatorTitle);
    
        const rateText = document.createElement("div");
        rateText.innerHTML = "Rate";
        rateText.classList.add("text");
        const rateInput = document.createElement("input");
        rateInput.type = "range";
        rateInput.min = 0;
        rateInput.max = 1000;
        rateInput.value = this.rateSliderDefaultValue;
        rateInput.style.marginBottom = "20px";
        noiseOscillator.appendChild(rateText);
        noiseOscillator.appendChild(rateInput);
    
        const amplitudeText = document.createElement("div");
        amplitudeText.innerHTML = "Amplitude";
        amplitudeText.classList.add("text");
        const amplitudeInput = document.createElement("input");
        amplitudeInput.type = "range";
        amplitudeInput.min = 0;
        amplitudeInput.max = 1000;
        amplitudeInput.value = sliderDefaultViewValue;
        amplitudeInput.style.marginBottom = "20px";
        noiseOscillator.appendChild(amplitudeText);
        noiseOscillator.appendChild(amplitudeInput);
    
        this.oscillatorsView.appendChild(noiseOscillator);
    
        rateInput.addEventListener("input", (event) => {
            const index = findOscillatorIndexById(id)
            this.oscillators[index].rate = this.getUnscaledSliderValue(event.target.value)
            updateOscilloscope()
        })
    
        amplitudeInput.addEventListener("input", (event) => {
            const index = findOscillatorIndexById(id)
            this.oscillators[index].amplitude = this.getUnscaledSliderValue(event.target.value)
            updateOscilloscope()
        })
    
        const mainOutputSection = document.createElement("div");
        mainOutputSection.classList.add("main-output-section");
        noiseOscillator.appendChild(mainOutputSection)
    
        const mainOutputButton = document.createElement("div");
        mainOutputButton.innerHTML = "Main Output";
        mainOutputButton.classList.add("main-output-button");
        mainOutputButton.classList.add("text");
        mainOutputButton.addEventListener("click", () => {
            const index = findOscillatorIndexById(id)
            this.oscillators[index].mainOutput = !this.oscillators[index].mainOutput;
            const ledViews = document.getElementsByClassName("main-output-led")
            const ledView = ledViews[index]
            ledView.style.backgroundColor = this.oscillators[index].mainOutput ? "#19F1FF" : "#aaaaaa"
            updateOscilloscope()
        })
        mainOutputSection.appendChild(mainOutputButton)
    
        const mainOutputLED = document.createElement("div");
        mainOutputLED.classList.add("main-output-led");
        mainOutputSection.appendChild(mainOutputLED)
    
        const deleteButton = document.createElement("div");
        deleteButton.innerHTML = "x";
        deleteButton.classList.add("delete-button");
        deleteButton.addEventListener("click", () => {
            const index = findOscillatorIndexById(id)
            this.oscillators.splice(index, 1)
            this.updateConnectionPartyCaches()
            this.oscillatorsView.removeChild(noiseOscillator)
            updateConnectionsFromRemovingDeviceWithId(id)
            updateDropDowns()
            updateOscilloscope()
        })
        noiseOscillator.appendChild(deleteButton)
    
        this.updateConnectionPartyCaches()
        updateDropDowns()
    }
    
    addNoise() {
        const noiseOscillatorNumber = this.oscillators.filter((oscillator) => oscillator.type === "noise").length + 1
        const name = "Noise oscillator " + noiseOscillatorNumber
    
        const id = generateNewDeviceId()
    
        const noiseModel = {
            id: id,
            name: name,
            type: "noise",
            rate: this.getUnscaledSliderValue(this.rateSliderDefaultValue),
            amplitude: this.getUnscaledSliderValue(this.sliderDefaultViewValue),
            mainOutput: true,
            timedSignalX: 0,
            previousValue: 0
        }
    
        this.oscillators.push(noiseModel)
        this.addNoiseViewFromModel(noiseModel)
    }
    
    addDistortionViewFromModel(model) {
        const id = model.id;
        const name = model.name;
        const effectsView = document.getElementById("effects");
        const effectView = document.createElement("div");
        effectView.classList.add("effect");
        
        const effectTitle = document.createElement("div");
        effectTitle.innerHTML = name;
        effectTitle.classList.add("device-title");
        effectTitle.classList.add("text");
        effectView.appendChild(effectTitle);
    
        const amountSection = document.createElement("div");
        amountSection.classList.add("amount-section");
        effectView.appendChild(amountSection);
    
        const amountControl = document.createElement("input");
        amountControl.type = "range";
        amountControl.min = 0;
        amountControl.max = 1000;
        amountControl.value = sliderDefaultViewValue;
        amountControl.classList.add("distortion-amount-control");
        amountControl.addEventListener("input", (event) => {
            const index = findEffectIndexById(id)
            effects[index].amount = this.getUnscaledSliderValue(event.target.value);
            updateOscilloscope()
        })
    
        amountSection.appendChild(amountControl);
    
        const routingSection = document.createElement("div");
        routingSection.classList.add("routing-section");
        effectView.appendChild(routingSection);
    
        const mainBusSection = document.createElement("div");
        mainBusSection.classList.add("main-bus-section");
        /* 
         * Disabled for now. For this to be useful, it should disable the ordinary (bypassed) signal
         * and allow for reordering of effects.
         */
        //routingSection.appendChild(mainBusSection);
    
        const mainBusButton = document.createElement("div");
        mainBusButton.innerHTML = "Main Bus";
        mainBusButton.classList.add("main-bus-button");
        mainBusButton.classList.add("text");
        mainBusButton.addEventListener("click", () => {
            const index = findEffectIndexById(id)
            effects[index].mainBus = !effects[index].mainBus;
            const ledViews = document.getElementsByClassName("main-bus-led")
            const ledView = ledViews[index]
            ledView.style.backgroundColor = effects[index].mainBus ? "#19F1FF" : "#aaaaaa"
            this.updateConnectionPartyCaches()
            updateDropDowns()
            updateOscilloscope()
        })
        mainBusSection.appendChild(mainBusButton)
    
        const mainBusLED = document.createElement("div");
        mainBusLED.classList.add("main-bus-led");
        mainBusSection.appendChild(mainBusLED)
    
        const mainOutputSection = document.createElement("div");
        mainOutputSection.classList.add("main-output-section");
    
        const mainOutputButton = document.createElement("div");
        mainOutputButton.innerHTML = "Main Output";
        mainOutputButton.classList.add("main-output-button");
        mainOutputButton.classList.add("text");
        mainOutputButton.addEventListener("click", () => {
            const index = findEffectIndexById(id)
            effects[index].mainOutput = !effects[index].mainOutput;
            const ledViews = document.getElementsByClassName("effects-main-output-led")
            const ledView = ledViews[index]
            ledView.style.backgroundColor = effects[index].mainOutput ? "#19F1FF" : "#aaaaaa"
            updateOscilloscope()
        })
        mainOutputSection.appendChild(mainOutputButton)
    
        const mainOutputLED = document.createElement("div");
        mainOutputLED.classList.add("effects-main-output-led");
        mainOutputSection.appendChild(mainOutputLED)
    
        routingSection.appendChild(mainOutputSection)
    
        const deleteButton = document.createElement("div");
        deleteButton.innerHTML = "x";
        deleteButton.classList.add("delete-button");
        deleteButton.addEventListener("click", () => {
            const index = findEffectIndexById(id)
            effectsView.removeChild(effectView)
            effects.splice(index, 1)
            this.updateConnectionPartyCaches()
            this.updateConnectionsFromRemovingDeviceWithId(id)
            this.updateDropDowns()
            updateOscilloscope()
        })
        effectView.appendChild(deleteButton)
    
        effectsView.appendChild(effectView);
    
        this.updateConnectionPartyCaches()
        this.updateDropDowns()
    }
    
    addDistortion() {
        let id = generateNewDeviceId();
        let nameNumber = effects.filter((effect) => effect.type === "distortion").length + 1;
        let name = "Distortion " + nameNumber;
        let sliderDefaultViewValue = 500
        let effectModel = {
            id: id,
            type: "distortion",
            name: name,
            amount: this.getUnscaledSliderValue(sliderDefaultViewValue),
            mainBus: false,
            mainOutput: true,
            inputValue: 0,
            previousValue: 0
        }
        effects.push(effectModel)
    
        addDistortionViewFromModel(effectModel)
    }
    
    findConnectionIndexById(id) {
        return this.connections.findIndex((connection) => connection.id === id)
    }
    
    findEffectIndexById(id) {
        return effects.findIndex((effect) => effect.id === id)
    }
    
    setTab(tabIndex) {
        const tabs = document.getElementsByClassName("tab");
        for (let i = 0; i < tabs.length; i++) {
            tabs[i].style.display = "none"
        }
    
        let tab = null
        if (tabIndex == 0) {
            tab = document.getElementById("oscillators");
        } else if (tabIndex == 1) {
            tab = document.getElementById("connections");
        } else if (tabIndex == 2) {
            tab = document.getElementById("effects");
        }
    
        tab.style.display = "flex"
    }
    
    updateConnectionsFromRemovingDeviceWithId(id) {
        /* Update the source and destination selectors such that their 
        * new number corresponds to the new oscillator number */
        
        const sourceSelectors = document.getElementsByClassName("source-selector")
        const destinationSelectors = document.getElementsByClassName("destination-selector")
    
        for (let i = 0; i < sourceSelectors.length; i++) {
            const sourceSelector = sourceSelectors[i]
            const destinationSelector = destinationSelectors[i]
    
            if (sourceSelector.value == id) {
                sourceSelector.value = 0
                this.connections[i].source = 0
            }
    
            if (destinationSelector.value == id) {
                destinationSelector.value = 0
                this.connections[i].destination = 0
            }
        }
    }
    
    updateDropDown(i) {
        const sourceSelectors = document.getElementsByClassName("source-selector")
        const destinationSelectors = document.getElementsByClassName("destination-selector")
    
        const sourceSelector = sourceSelectors[i]
        const destinationSelector = destinationSelectors[i]
    
        // Remember selected value
        const sourceSelectedValue = sourceSelector.value
        const destinationSelectedValue = destinationSelector.value
    
        sourceSelector.innerHTML = ""
        destinationSelector.innerHTML = ""
    
        // Add default no-selection value
        const sourceOption = document.createElement("option");
        sourceOption.text = "-";
        sourceOption.value = 0;
        sourceSelector.appendChild(sourceOption);
    
        const destinationOption = document.createElement("option");
        destinationOption.text = "-";
        destinationOption.value = 0;
        destinationSelector.appendChild(destinationOption);
    
        this.connectionPartyNamesCache.forEach((name, i) => {
            const id = this.connectionePartyDeviceIdsCache[i]
            const sourceOption = document.createElement("option");
            sourceOption.text = name;
            sourceOption.value = id;
            sourceSelector.appendChild(sourceOption);
    
            const destinationOption = document.createElement("option");
            destinationOption.text = name;
            destinationOption.value = id;
            destinationSelector.appendChild(destinationOption);
        })
    
    
        // Restore selected value
        sourceSelector.value = sourceSelectedValue
        destinationSelector.value = destinationSelectedValue
    
        this.updateParameterDropDown(i)
    }
    
    updateDropDowns() {
        const sourceSelectors = document.getElementsByClassName("source-selector")
    
        for (let i = 0; i < sourceSelectors.length; i++) {
            updateDropDown(i)
        }
    }
    
    updateParameterDropDown(i) {
        const destinationParameterSelectors = document.getElementsByClassName("destination-parameter-selector")
        const destinationParameterSelector = destinationParameterSelectors[i]
            
        destinationParameterSelector.innerHTML = ""
        const connection = this.connections[i]
        const destinationId = connection.destination
    
        // TODO: it shouldn't be "-", it should be 0
        if (destinationId === 0 || destinationId === "-") {
            return
        }
    
        const destinationIndex = this.connectionePartyDeviceIdsCache.findIndex((id) => id === destinationId)
        const destination = this.getConnectionPartyDeviceWithId(destinationId)
        
        var modulatableParameters = []
        var titles = []
        if (destination.type == "oscillator") {
            modulatableParameters = [
                "frequency",
                "amplitude",
                "phase",
                "shape",
                "partials",
                "sync"
            ]
    
            titles = [
                "Frequency", 
                "Amplitude",
                "Phase",
                "Shape",
                "Partials",
                "Sync"
            ]
        } else if (destination.type == "noise") {
            modulatableParameters = ["rate", "amplitude"]
            titles = ["Rate", "Amplitude"]
        } else if (destination.type == "distortion") {
            modulatableParameters = ["inputValue", "amount"]
            titles = ["Input", "Amount"]
        }
    
        for (let i = 0; i < modulatableParameters.length; i++) {
            const destinationParameterOption = document.createElement("option");
            destinationParameterOption.text = titles[i];
            destinationParameterOption.value = modulatableParameters[i];
            destinationParameterSelector.appendChild(destinationParameterOption);
        }
    
        if (modulatableParameters.includes(connections[i].destinationParameter)) {
            destinationParameterSelector.value = this.connections[i].destinationParameter
        } else {
            this.connections[i].destinationParameter = destinationParameterSelector.value
        }
    }
    
    onAddOscillatorClicked() {
        addOscillator()
        updateOscilloscope()
    }
    
    onAddConnectionClicked() {
        addConnection()
        updateOscilloscope()
    }
    
    onAddNoiseClicked() {
        addNoise();
        updateOscilloscope()
    }
    
    onAddDistortionClicked() {
        addDistortion()
        updateOscilloscope()
    }
    
    onTabClicked(tabIndex) {
        setTab(tabIndex)
    }
    
    generateNewDeviceId() {
        var newDeviceId = this.lastDeviceId + 1
        this.lastDeviceId = newDeviceId
        return newDeviceId
    }
    
    updateConnectionPartyCaches() {
        const oscillatorIds = this.oscillators.map((oscillator) => oscillator.id)
        const effectIds = this.effects.map((effect) => effect.id)
        this.connectionePartyDeviceIdsCache = oscillatorIds.concat(effectIds)
        this.connectionPartyNamesCache = this.oscillators.map((oscillator) => oscillator.name)
            .concat(this.effects.map((_, index) => "Effect " + (index + 1)))
    }
    
    getConnectionPartyDeviceWithId(id) {
        const oscillator = this.oscillators.find((oscillator) =>  {
                let idMatch = oscillator.id == id
                return idMatch
        })
        if (oscillator) {
            return oscillator
        }
    
        const effect = effects.find((effect) => effect.id == id)
        if (effect) {
            return effect
        }
    
        return null
    }
    
    setPropertyOfConnectionPartyDeviceWithId(id, property, value) {
        const oscillator = this.oscillators.find((oscillator) => oscillator.id === id)
        if (oscillator) {
            oscillator[property] = value
            return
        }
    
        const effect = effects.find((effect) => effect.id === id)
        if (effect) {
            effect[property] = value
            return
        }
    }
    
    updateControlViews() {
        for (let i = 0; i < this.oscillators.length; i++) {
            const oscillator = this.oscillators[i]
            const oscillatorView = document.getElementsByClassName("oscillator")[i]
    
            if (oscillator.type == "oscillator") {
                const frequencyInput = oscillatorView.getElementsByTagName("input")[0]
                const amplitudeInput = oscillatorView.getElementsByTagName("input")[1]
                const phaseInput = oscillatorView.getElementsByTagName("input")[2]
                const shapeInput = oscillatorView.getElementsByTagName("input")[3]
                const partialsInput = oscillatorView.getElementsByTagName("input")[4]
                const syncInput = oscillatorView.getElementsByTagName("input")[5]
                const mainOutputLED = oscillatorView.getElementsByClassName("main-output-led")[0]
    
                frequencyInput.value = frequencyScalableParameterType.getSliderForUnscaledValue(oscillator.frequency)
                amplitudeInput.value = amplitudeScalableParameterType.getSliderForUnscaledValue(oscillator.amplitude)
                phaseInput.value = phaseScalableParameterType.getSliderForUnscaledValue(oscillator.phase)
                shapeInput.value = shapeScalableParameterType.getSliderForUnscaledValue(oscillator.shape)
                partialsInput.value = partialsScalableParameterType.getSliderForUnscaledValue(oscillator.partials)
                syncInput.value = syncScalableParameterType.getSliderForUnscaledValue(oscillator.sync)
    
                // TODO: Make DRY
                mainOutputLED.style.backgroundColor = oscillator.mainOutput ? "#19F1FF" : "#aaaaaa"
            } else if (oscillator.type == "noise") {
                const rateInput = oscillatorView.getElementsByTagName("input")[0]
                const amplitudeInput = oscillatorView.getElementsByTagName("input")[1]
                const mainOutputLED = oscillatorView.getElementsByClassName("main-output-led")[0]
    
                rateInput.value = rateScalableParameterType.getSliderForUnscaledValue(oscillator.rate)
                amplitudeInput.value = amplitudeScalableParameterType.getSliderForUnscaledValue(oscillator.amplitude)
                mainOutputLED.style.backgroundColor = oscillator.mainOutput ? "#19F1FF" : "#aaaaaa"
            }
        }
        
        for (let i = 0; i < this.connections.length; i++) {
            const connection = this.connections[i]
            const connectionView = document.getElementsByClassName("connection")[i]
            const amountInput = connectionView.getElementsByTagName("input")[0]
            
            amountInput.value = connectionAmountScalableParameterType.getSliderForUnscaledValue(connection.amount)
        }
    
        for (let i = 0; i < effects.length; i++) {
            const effect = effects[i]
    
            if (effect.type == "distortion") {
                const effectView = document.getElementsByClassName("effect")[i]
                const amountInput = effectView.getElementsByTagName("input")[0]
                
                amountInput.value = distortionAmountScalableParameterType.getSliderForUnscaledValue(effect.amount)
    
                const mainOutputLED = effectView.getElementsByClassName("effects-main-output-led")[0]
                mainOutputLED.style.backgroundColor = effect.mainOutput ? "#19F1FF" : "#aaaaaa"
            }
        }
    }
    
    async saveFile(suggestedName, content) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: [
                    {
                        description: 'JSON file',
                        accept: { 'application/json': ['.json'] }
                    }
                ]
            });
    
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
        } catch (err) {
            console.error('File save canceled or failed', err);
        }
    }
    
    onSavePresetClicked() {
        const presetObject = {
            oscillators: this.oscillators,
            connections: this.connections,
            effects: effects
        }
    
        const presetString = JSON.stringify(presetObject)
    
        saveFile('modular_synth_preset.json', presetString);
    }
    
    onLoadPresetClicked() {
        // Open file dialog
        const fileInput = document.createElement("input")
        fileInput.type = "file"
        fileInput.accept = ".json"
        fileInput.addEventListener("change", (event) => {
            const file = event.target.files[0]
            loadPreset(file)
        })
    
        // Trigger file dialog
        fileInput.click()
    }
    
    onRandomPresetClicked () {
        var presetObject = {}
    
        var nextDeviceId = 1
        const safeLimit = 100
        var presetOscillators = []
        var oscillatorsDone = false
        var oscillatorCountForType = {}
        while (!oscillatorsDone && presetOscillators.length < safeLimit) {
            const types = ["oscillator", "noise"]
            const typeTitles = ["Oscillator", "Noise oscillator"]
            const typeIndex = Math.min(types.length - 1, Math.floor((Math.random() * types.length)))
            const type = types[typeIndex]
            const typeTitle = typeTitles[typeIndex]
            if (!oscillatorCountForType[type]) {
                oscillatorCountForType[type] = 0
            }
            const count = oscillatorCountForType[type]
            const nameNumber = count + 1
            const name = typeTitle + " " + nameNumber
            var oscillator = {}
    
            if (type == "oscillator") {
                oscillator = {
                    id: nextDeviceId,
                    name: name,
                    type: type,
                    frequency: Math.random(),
                    amplitude: Math.random(),
                    phase: Math.random(),
                    shape: Math.random(),
                    partials: Math.random(),
                    sync: Math.random(),
                    mainOutput: Math.random() >= 0.5,
                    timedSignalX: 0,
                    syncTimedSignalX: 0,
                    previousValue: 0
                }
            } else if (type == "noise") {
                oscillator = {
                    id: nextDeviceId,
                    name: name,
                    type: type,
                    rate: Math.random(),
                    amplitude: Math.random(),
                    mainOutput: Math.random() >= 0.5,
                    timedSignalX: 0,
                    previousValue: 0
                }
            }
            
                
            presetOscillators.push(oscillator)
            oscillatorCountForType[type] += 1
            nextDeviceId += 1
    
            oscillatorsDone = (Math.random() <= 0.5)
        }
    
        var presetEffects = []
        var effectsDone = false
        var effectTypes = ["distortion"]
        var effectTypeTitles = ["Distortion"]
    
        var effectCountForType = {}
        while (!effectsDone && presetEffects.length < safeLimit) {
            const typeIndex = Math.min(effectTypes.length - 1, Math.floor((Math.random() * effectTypes.length)))
            const type = effectTypes[typeIndex]
            const typeTitle = effectTypeTitles[typeIndex]
            if (!effectCountForType[type]) {
                effectCountForType[type] = 0
            }
            const count = effectCountForType[type]
            const nameNumber = count + 1
            const name = typeTitle + " " + nameNumber
    
            var effect = {
                id: nextDeviceId,
                type: type,
                name: name,
                amount: Math.random(),
                mainBus: Math.random() >= 0.5,
                mainOutput: Math.random() >= 0.5,
                inputValue: 0,
                previousValue: 0
            }
            presetEffects.push(effect)
            effectCountForType[type] += 1
            nextDeviceId += 1
    
            effectsDone = Math.random() <= 0.5
        }
    
        var presetConnections = []
        var connectionsDone = false
        const deviceCount = presetOscillators.length + presetEffects.length
        while (!connectionsDone && presetConnections.length < safeLimit) {
            var sourceId = 0
            const sourceIdRandomVariable = Math.min(deviceCount - 1, Math.floor(Math.random() * deviceCount))
            if (sourceIdRandomVariable < presetOscillators.length) {
                sourceId = presetOscillators[sourceIdRandomVariable].id
            } else if (sourceIdRandomVariable <= deviceCount) {
                const index = sourceIdRandomVariable - presetOscillators.length
                sourceId = presetEffects[index].id
            }
    
            var destinationId = 0
            const destinationIdRandomVariable = Math.min(deviceCount - 1, Math.floor(Math.random() * deviceCount))
            if (destinationIdRandomVariable < presetOscillators.length) {
                destinationId = presetOscillators[destinationIdRandomVariable].id
            } else if (destinationIdRandomVariable <= deviceCount) {
                const index = destinationIdRandomVariable - presetOscillators.length
                destinationId = presetEffects[index].id
            }
    
            const presetDevices = presetOscillators.concat(presetEffects)
            const destinationType = presetDevices.find((device) => device.id === destinationId).type
    
            const amount = Math.random()
            const parameters = modulatableParametersForType(destinationType)
            const parameterIndex = Math.min(parameters.length - 1, Math.floor(Math.random() * parameters.length))
            const parameter = parameterIndex.toString()
    
            const connection = {
                id: nextDeviceId,
                source: sourceId,
                destination: destinationId,
                amount: amount,
                destinationParameter: parameter
            }
            presetConnections.push(connection)
            nextDeviceId += 1
    
            connectionsDone = Math.random() <= 0.5
        }
    
        presetObject.oscillators = presetOscillators
        presetObject.connections = presetConnections
        presetObject.effects = presetEffects
    
        setSynthFromPresetObject(presetObject)
    }
    
    loadPreset(presetFile) {
        const reader = new FileReader()
        reader.onload = (event) => {
            const presetObject = JSON.parse(event.target.result)
            setSynthFromPresetObject(presetObject)
        }
        reader.readAsText(presetFile)
    }
    
    setSynthFromPresetObject(presetObject) {
        this.oscillators = presetObject.oscillators
    
        this.oscillatorsView.innerHTML = ""
    
        const effectsView = document.getElementById("effects")
        effectsView.innerHTML = ""
    
        const connectionsView = document.getElementById("connections")
        connectionsView.innerHTML = ""
    
        for (let i = 0; i < this.oscillators.length; i++) {
            const oscillator = this.oscillators[i]
            const type = oscillator.type
            if (type == "oscillator") {
                addOscillatorViewFromModel(oscillator)
            } else if (type == "noise") {
                addNoiseViewFromModel(oscillator)
            }
        }
    
        this.effects = presetObject.effects
    
        for (let i = 0; i < this.effects.length; i++) {
            if (this.effects[i].type == "distortion") {
                this.addDistortionViewFromModel(effects[i])
            }
        }
    
        this.connections = presetObject.connections
        for (let i = 0; i < this.connections.length; i++) {
            this.addConnectionViewFromModel(connections[i])
        }
        
        
        this.updateConnectionPartyCaches()
        this.updateDropDowns()
        this.updateConnectionDropdownSelectionsFromModel()
        this.updateOscilloscope()
        this.updateControlViews()
    }
    
    updateConnectionDropdownSelectionsFromModel() {
        const sourceSelectors = document.getElementsByClassName("source-selector")
        const destinationSelectors = document.getElementsByClassName("destination-selector")
        const destinationParameterSelectors = document.getElementsByClassName("destination-parameter-selector")
    
        for (let i = 0; i < this.connections.length; i++) {
            const connection = this.connections[i]
            const sourceSelector = sourceSelectors[i]
            const destinationSelector = destinationSelectors[i]
            const destinationParameterSelector = destinationParameterSelectors[i]
    
            sourceSelector.value = connection.source
            destinationSelector.value = connection.destination
            destinationParameterSelector.value = connection.destinationParameter
        }
    }
    
    updateMainVolumeSliderFromModel() {
        this.mainVolumeSlider.value = this.mainVolumeScalableParameterType.getSliderForUnscaledValue(this.mainVolume)
    }
    
    onMainVolumeChanged(event) {
        this.mainVolume = this.getUnscaledSliderValue(event.target.value)
    }
    
    dropdownClicked(event, dropdown_id) {
        Object.keys(this.dropdownStates).forEach((key) => {
            if (key != dropdown_id) {
                this.dropdownStates[key] = false
                const dropdown = document.getElementsByClassName("dropdown")[key]
                const dropdownContent = dropdown.getElementsByClassName("dropdown-content")[0]
                dropdownContent.style.display = "none"
            }
        })
        if (this.dropdownStates[dropdown_id] === undefined) {
            this.dropdownStates[dropdown_id] = true
        } else {
            this.dropdownStates[dropdown_id] = !this.dropdownStates[dropdown_id]
        }
    
        const dropdown = document.getElementsByClassName("dropdown")[dropdown_id]
        const dropdownContent = dropdown.getElementsByClassName("dropdown-content")[0]
        dropdownContent.style.display = this.dropdownStates[dropdown_id] ? "block" : "none"
    }
    
    addTapOutHandler() {
        document.addEventListener("click", (event) => {
            const dropdowns = document.getElementsByClassName("dropdown")
            for (let i = 0; i < dropdowns.length; i++) {
                const dropdown = dropdowns[i]
                const dropdownButton = dropdown.getElementsByClassName("dropdown-expander")[0]
                const dropdownContent = dropdown.getElementsByClassName("dropdown-content")[0]
                if (!dropdownButton.contains(event.target)) {
                    dropdownContent.style.display = "none"
                    this.dropdownStates[i] = false
                }
            }
        })
    }
    
    onAddDeviceClicked(event, deviceType) {
        const device = new deviceType()
        device.appendToView(effectsView)
        let nameNumber = effects.filter((effect) => effect.type === deviceType.typeId).length + 1;
        device.setDeviceTitle(deviceType.typeDisplayName + " " + nameNumber)
    }

    addDevice(deviceType) {
        const device = new deviceType()
        this.devices.push(device)
        this.updateDevicesViewFromDevices()
    }

    updateDevicesViewFromDevices() {
    }
}