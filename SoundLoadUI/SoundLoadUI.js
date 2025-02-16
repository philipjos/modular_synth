class SoundLoadUI {
    constructor() {
        this.view = document.createElement('div');
        this.view.style.display = 'flex';
        this.view.style.flexDirection = 'column';
        this.view.style.alignItems = 'center';
        this.view.style.justifyContent = 'center';
        this.view.style.margin = '10px';
        this.view.style.padding = '10px';
        this.view.style.border = '1px solid black';
        this.view.style.borderRadius = '5px';
        this.view.style.backgroundColor = 'white';

        this.oscilloscope = new Oscilloscope(400, 100);
        this.oscilloscope.appendToView(this.view);
        
        const loadSoundButton = document.createElement('button');
        loadSoundButton.textContent = 'Load Sound';
        loadSoundButton.onclick = this.onLoadSoundPressed.bind(this);
        loadSoundButton.style.marginTop = '10px';

        this.view.appendChild(loadSoundButton);

        const loadedFileLabel = document.createElement('label');

        this.view.appendChild(loadedFileLabel);

    }
    
    onLoadSoundPressed() {
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
                    this.oscilloscope.updateFromBuffer(channelData);
                    if (this.onSoundLoaded) {
                        this.onSoundLoaded(channelData);
                    }
                });
            };
            reader.readAsArrayBuffer(file);
        };
        virtualInput.click();
    }

    appendToView(container) {
        container.appendChild(this.view);
    }
}