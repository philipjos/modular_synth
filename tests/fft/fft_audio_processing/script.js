const audioProcessingUI = new AudioProcessingUI()
audioProcessingUI.process = (sound) => {
    console.log("Process sound")
    const _fft = fft(sound)
    const result = harmonicArray(_fft, 44100)
    return result
}
audioProcessingUI.appendToView(document.body)