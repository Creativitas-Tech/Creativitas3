import { NexusElement } from './parentNexus.js';

export class NexusSlider extends NexusElement {
    constructor(x = 0, y = 0, width = 200, height = 50) {
        super('Slider', x, y, width, height);
    }

    // ccSet is called by Parameter.set() to update the GUI without triggering callback
    ccSet(value) {
        // Validate value to prevent NaN errors
        if (this.element && typeof value === 'number' && !isNaN(value) && isFinite(value)) {
            // Clamp value to min/max range
            const clampedValue = Math.max(this._min || 0, Math.min(this._max || 1, value));
            this.element.value = clampedValue;
        }
    }

  
    // setMode(mode) {
    //     this.element.mode = mode; // "relative" or "absolute"
    // }

    get mode() {
        return this._mode;
    }

    set mode(type){
        this._mode = type;
        this.element.mode = type
    }

    get value() {
        return this.element.value;
    }
    set value(value) {
        this.element.value = value;
    }

    get step(){
        return this._step
    }

    set step(increment){
        this._step = increment;
        this.element.step = increment
    }

    get max() {
        return this._max;
    }
    set max(value) {
        this._max = value;
        this.element.max = value
    }

    get min() {
        return this._min;
    }
    set min(value) {
        this._min = value;
        this.element.min = value
    }

}