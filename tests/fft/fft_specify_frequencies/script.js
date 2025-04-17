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
        }
    }
}


oscilloscope.appendToView(document.body)
fftOscilloscope.appendToView(document.body)
