var inputSampleRate = 1
var fourierSampleRate = 1
var windowLength = 1

const oscilloscope = new Oscilloscope(400, 100)
const resampledOscilloscope = new OscilloscopeWithGrid(400, 100, 10)
const fftOscilloscope = new OscilloscopeWithGrid(400, 100, 10)

function handleKeyUp(event) {
    if (event.key === "Enter") {
        const partialsInput = document.getElementById("partialsInput")
        const partials = partialsInput.value.split(",").map(Number)
        
        const lowestFrequency = Math.min(...partials)
        const highestFrequency = Math.max(...partials)
        const sampleRate = highestFrequency * 2
        this.signalLength = 1 / lowestFrequency
        this.minimumSampleRate = sampleRate
        this.signal = []
        const signalLengthSamples = this.signalLength * sampleRate
        for (let i = 0; i < signalLengthSamples; i++) {
            let value = 0
            partials.forEach(partial => {
                value += Math.cos(2 * Math.PI * partial * i / sampleRate) / partials.length
            })
            this.signal.push(value)
        }
 
        oscilloscope.updateFromBuffer(this.signal)

        performFFTAndUpdateOscilloscope()

        updateInfo()
    }
}

function performFFTAndUpdateOscilloscope() {
    var signal
    var sampleRate
    if (this.resampledBuffer) {
        signal = this.resampledBuffer
        sampleRate = this.fourierSampleRate
    } else {
        signal = this.signal
        sampleRate = this.minimumSampleRate
    }
    const _fft = fft(signal)
    const result = harmonicArray(_fft, sampleRate)
    fftOscilloscope.updateFromBuffer(result)
}

function updateInfo() {
    const info = document.getElementById("info")
    info.innerHTML = `
        <p>Signal length: ${this.signalLength}</p>
        <p>Minimum sample rate: ${this.minimumSampleRate}</p>
    `
}

function fourierSampleRateSliderOnInput(value) {
    this.fourierSampleRate = parseInt(value)
    if (this.signal) {
        this.resampledBuffer = []
        for (let i = 0; i < this.fourierSampleRate; i++) {
            const originalIndex = Math.floor(i / value * this.signal.length)
            const sample = this.signal[originalIndex]
            this.resampledBuffer.push(sample)
        }
        resampledOscilloscope.updateFromBuffer(this.resampledBuffer)
    }
    fftOscilloscope.gridCount = this.fourierSampleRate
    fftOscilloscope.updateGridFromCount()

    resampledOscilloscope.gridCount = this.fourierSampleRate
    resampledOscilloscope.updateGridFromCount()

    performFFTAndUpdateOscilloscope()
}
const meters_section = document.getElementById("meters-section")
oscilloscope.appendToView(meters_section)
resampledOscilloscope.appendToView(meters_section)
fftOscilloscope.appendToView(meters_section)

const inputSampleRateSlider = new ValueSlider("Input sample rate")
inputSampleRateSlider.appendToView(document.body)

const fourierSampleRateSlider = new ValueSlider("Fourier transform sample rate")
fourierSampleRateSlider.onInput = fourierSampleRateSliderOnInput.bind(this)
fourierSampleRateSlider.appendToView(document.body)

const windowLengthSlider = new ValueSlider("Window length")
windowLengthSlider.appendToView(document.body)