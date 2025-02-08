function onLoadSoundPressed() {
    const virtualInput = document.createElement('input');
    virtualInput.type = 'file';
    virtualInput.accept = '.wav';
    virtualInput.onchange = function (e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function (e) {
            const buffer = e.target.result;
            const audioContext = new AudioContext();
            audioContext.decodeAudioData(buffer, function (audioBuffer) {
                const channelData = audioBuffer.getChannelData(0);
                oscilloscope.updateFromBuffer(channelData);
            });
        };
        reader.readAsArrayBuffer(file);
    };
    virtualInput.click();
}

const oscilloscope = new Oscilloscope(400, 100);
const oscilloscopeContainer = document.getElementById('oscilloscope-container');
oscilloscope.appendToView(oscilloscopeContainer);
