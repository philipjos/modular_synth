const sampleRate = 32768
const length = 1
const signalLength = sampleRate * length
const harmonics = [440, 880, 1760, 5000, 7000]

var signal = []

for (let i = 0; i < signalLength; i++) {
    let value = 0

    harmonics.forEach(harmonic => {
        value += Math.sin(2 * Math.PI * harmonic * i / sampleRate) / harmonics.length
    })

    signal.push(value)
}

let _fft = fft(signal)
let _loudestHarmonics = loudestHarmonicsOfFFT(_fft, sampleRate, 10)


