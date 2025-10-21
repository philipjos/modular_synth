class Sampler extends Oscillator {
    static typeDisplayName = "Sampler"
    static typeId = "sampler"

    constructor(objectIDManager) {
        super(objectIDManager)

        this.setParametersAndSetup({
            speed: new NumericalParameter(
                objectIDManager,
                "Speed",
                0,
                16,
                1,
                0
            ),
            start: new NumericalParameter(
                objectIDManager,
                "Start",
                0,
                1,
                0,
                0
            )
        })

        this.sampleData = []
        this.timedSignals["mainTime"] = new TimedSignal(1)

        this.loadSampleButton = document.createElement('button');
        this.loadSampleButton.textContent = 'Load Sample';
        this.loadSampleButton.onclick = this.onLoadSamplePressed.bind(this);
        this.view.appendChild(this.loadSampleButton);
    }

    onLoadSamplePressed() {
        const virtualInput = document.createElement('input');
        virtualInput.type = 'file';
        virtualInput.accept = '.wav';
        virtualInput.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const buffer = e.target.result;
                const audioContext = new AudioContext();
                audioContext.decodeAudioData(buffer, (audioBuffer) => {
                    const channelData = audioBuffer.getChannelData(0);
                    this.sampleData = channelData;
                    this.onDeviceChanged()
                });
            };
            reader.readAsArrayBuffer(file);
        };
        virtualInput.click();
    }

    calculateOutput() {
        const speed = this.parameters.speed.getModulatedValue()
        const start = this.parameters.start.getModulatedValue()
        const startInSamples = start * this.sampleData.length
        const time = this.timedSignals["mainTime"].x
        const sampleIndex = Math.floor(time * speed + startInSamples)
        const sampleValue = this.sampleData[sampleIndex]

        return sampleValue
    }
}