const oscilloscope = new Oscilloscope(400, 100)

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
        console.log(result)
    }
}

oscilloscope.appendToView(document.body)