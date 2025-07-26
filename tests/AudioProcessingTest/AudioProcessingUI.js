class AudioProcessingUI {
    constructor(process) {
        this.process = process;
        this.subviews = [];
        this.volume = 1;

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
        this.view.style.gap = '10px';

        const soundLoadUI = new SoundLoadUI();
        this.subviews.push(soundLoadUI);

        this.resultOscilloscope = new Oscilloscope(400, 100);
        this.subviews.push(this.resultOscilloscope);

        soundLoadUI.onSoundLoaded = this.onSoundLoaded.bind(this);
    }

    onSoundLoaded(sound) {
        this.result = this.process(sound);
        this.updateFromVolumedResult();
    }

    appendToView(container) {
        container.appendChild(this.view);
        this.subviews.forEach(subview => subview.appendToView(this.view));

        const volumeSection = document.createElement('div');
        volumeSection.style.display = 'flex';
        volumeSection.style.alignItems = 'center';
        volumeSection.style.justifyContent = 'center';
        
        const volumeLabel = document.createElement('label');
        volumeLabel.innerText = 'Volume';
        volumeLabel.style.marginRight = '10px';
        volumeLabel.style.fontFamily = 'monospace';
        volumeSection.appendChild(volumeLabel);

        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.min = 0;
        volumeSlider.max = 1;
        volumeSlider.step = 0.01;
        volumeSlider.value = 1;
        volumeSlider.oninput = this.onVolumeSliderInput.bind(this);
        
        volumeSection.appendChild(volumeSlider);

        this.view.appendChild(volumeSection);
    }

    onVolumeSliderInput(event) {
        this.volume = event.target.value;
        this.updateFromVolumedResult();
    }

    bufferWithVolume(buffer, volume) {
        return buffer.map(value => value * volume);
    }

    updateFromVolumedResult() {
        if (this.result) {
            const volumed = this.bufferWithVolume(this.result, this.volume);
            this.resultOscilloscope.updateFromBuffer(volumed);
        }
    }
}