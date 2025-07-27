const audioProcessingUI = new AudioProcessingUI();

audioProcessingUI.process = function (audioBuffer) {
    return truncated_dct(audioBuffer, 5);
}

audioProcessingUI.appendToView(document.body);