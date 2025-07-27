class ScalableParameter {  
    static SLIDER_MAX = 1000;
    static SLIDER_MIN = 0;
    
    constructor(defaultValue = 0.5, min = 0, max = 1) {
        this.defaultValue = defaultValue;
        this.min = min;
        this.max = max;

        this.value = this.defaultValue;
    }

    getScaledValueForValue(value) {
        const range = this.max - this.min;

        return this.min + value * range;
    }

    getSliderForUnscaledValue(value) {
        const sliderRange = ScalableParameter.SLIDER_MAX - ScalableParameter.SLIDER_MIN;
        const sliderValue = value * sliderRange + ScalableParameter.SLIDER_MIN;

        return sliderValue;
    }

    getSliderValueForValue(value) {
        const range = this.max - this.min;
        const descaledValue = (value - this.min) / range;
        
        const sliderValue = this.getSliderForUnscaledValue(descaledValue);

        return sliderValue;
    }

    getScaledValue() {
        return this.getScaledValueForValue(this.value);
    }

    getSliderValue() {
        return this.getSliderValueForValue(this.value);
    }
}