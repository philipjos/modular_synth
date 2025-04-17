var inputSampleRate = 1
var fourierTransformSampleRate = 1
var windowLength = 1

const oscilloscope = new Oscilloscope(400, 100)
const fftOscilloscope = new Oscilloscope(400, 100)

function handleKeyUp(event) {
    if (event.key === "Enter") {
        const partialsInput = document.getElementById("partialsInput")
        const partials = partialsInput.value.split(",").map(Number)
        
        const lowestFrequency = Math.min(...partials)
        const highestFrequency = Math.max(...partials)
        const sampleRate = highestFrequency * 2
        const signalLength = 1 / lowestFrequency * sampleRate
        
        const signal = []
        for (let i = 0; i < signalLength; i++) {
            let value = 0
            partials.forEach(partial => {
                value += Math.cos(2 * Math.PI * partial * i / sampleRate) / partials.length
            })
            signal.push(value)
        }
 
        oscilloscope.updateFromBuffer(signal)

        const _fft = fft(signal)
        const result = harmonicArray(_fft, sampleRate)
        fftOscilloscope.updateFromBuffer(result)

        const gridSize = 1
        const totalGridPartitions = Math.ceil(signalLength / gridSize)
        for (let i = 0; i < totalGridPartitions; i++) {
            const partition = document.createElement("div")
            partition
            fftOscilloscopeGrid.appendChild(partition)
        }
    }
}


oscilloscope.appendToView(document.body)
fftOscilloscope.appendToView(document.body)

const fftOscilloscopeGrid = document.createElement("div")
fftOscilloscopeGrid.style.display = "flex"
fftOscilloscopeGrid.style.position = "absolute"
fftOscilloscopeGrid.style.top = "0"
fftOscilloscopeGrid.style.width = "100px"
fftOscilloscopeGrid.style.height = "50px"
fftOscilloscopeGrid.style.backgroundColor = "#D0FFA0"
document.body.appendChild(fftOscilloscopeGrid)

const inputSampleRateSlider = new ValueSlider("Input sample rate")
inputSampleRateSlider.appendToView(document.body)

const fourierSampleRateSlider = new ValueSlider("Fourier transform sample rate")
fourierSampleRateSlider.appendToView(document.body)

const windowLengthSlider = new ValueSlider("Window length")
windowLengthSlider.appendToView(document.body)