function fft(input) {
    const prepared = prepare(input);
    return fft_recursive(prepared);
}

function prepare(input) {
    let N = input.length;
    let biggestExponent = Math.floor(Math.log2(N));
    let prepared = input.slice(0, 2 ** biggestExponent);
    return prepared;
}

function fft_recursive(input) {
    let N = input.length;
    if (N <= 1) return [ComplexNumber.fromReal(input[0])];

    if ((N & (N - 1)) !== 0) {
        throw new Error("Input length must be a power of 2");
    }

    // Divide: Even and Odd indices
    let even = fft(input.filter((_, i) => i % 2 === 0));
    let odd = fft(input.filter((_, i) => i % 2 !== 0));

    let result = new Array(N).fill(ComplexNumber.fromReal(0));
    for (let k = 0; k < N / 2; k++) {
        
        let angle = -2 * Math.PI * k / N
        let real_factor = Math.cos(angle);
        let imaginary_factor = Math.sin(angle);

        twiddle = new ComplexNumber(real_factor, imaginary_factor);
        twiddle = ComplexNumber.multiply(twiddle, odd[k]);

        result[k] = even[k].add(twiddle);
        result[k + N / 2] = even[k].subtract(twiddle);
    }

    return result;
}

function magnitudes(_fft) {
    return _fft.map(c => Math.sqrt(c.real * c.real + c.imaginary * c.imaginary) / _fft.length);
}

function phases(_fft) {
    return _fft.map(c => Math.atan2(c.imaginary, c.real));
}

function toHarmonicObject(_fft, sampleRate) {
    let _magnitudes = magnitudes(_fft)
    let _phases = phases(_fft)

    let harmonics = [];
    for (let i = 0; i < _magnitudes.length; i++) {
        let frequency = i * sampleRate / _magnitudes.length;
        let magnitude = _magnitudes[i];
        let phase = _phases[i];

        harmonics.push({ frequency, magnitude, phase });
    }

    return harmonics;
}

function harmonicArray(_fft, sampleRate) {
    return toHarmonicObject(_fft, sampleRate).map(h => h.magnitude);
}

function loudestHarmonics(harmonics, count) {
    return harmonics
        .sort((a, b) => b.magnitude - a.magnitude)
        .slice(0, count);
}

function loudestHarmonicsOfFFT(_fft, sampleRate, count) {
    return loudestHarmonics(toHarmonicObject(_fft, sampleRate), count);
}

function getHarmonicsFromAudioData(audioData, sampleRate) {
    const _fft = fft(audioData)
    const firstHalfOfFft = _fft.slice(0, _fft.length / 2)
    return toHarmonicObject(firstHalfOfFft, sampleRate);
}

function getLoudestHarmonicsFromAudioData(audioData, sampleRate, count) {
    const _fft = fft(audioData)
    const relevant = _fft.slice(1, _fft.length / 2)
    const output = loudestHarmonicsOfFFT(relevant, sampleRate, count);

    return output
}