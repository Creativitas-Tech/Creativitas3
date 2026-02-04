import { NexusElement } from './parentNexus.js';

export class NexusDial extends NexusElement {
    constructor(x = 0, y = 0, width = 100, height = 100, showValue = false) {
        // Pass the type "Dial" to the parent constructor
        super('Dial', x, y, width, height);
        
        this._showValue = showValue;
        this._valueDisplay = null;
        
        if (showValue) {
            this._createValueDisplay(width);
        }
    }
    
    _createValueDisplay(width) {
        if (!this.elementContainer) return;
        
        const valueDiv = document.createElement('div');
        valueDiv.style.cssText = `
            position: absolute;
            left: 0;
            bottom: -16px;
            width: ${width}px;
            text-align: center;
            color: #888888;
            font-family: monospace;
            font-size: 10px;
            pointer-events: none;
            user-select: none;
        `;
        valueDiv.textContent = '0.00';
        this.elementContainer.appendChild(valueDiv);
        this._valueDisplay = valueDiv;
        
        // Update value display when dial changes
        this.element.on('change', (v) => {
            this._updateValueDisplay(v);
        });
    }
    
    _updateValueDisplay(value) {
        if (this._valueDisplay && typeof value === 'number') {
            // Format based on value range
            if (Math.abs(value) >= 100) {
                this._valueDisplay.textContent = Math.round(value).toString();
            } else if (Math.abs(value) >= 10) {
                this._valueDisplay.textContent = value.toFixed(1);
            } else {
                this._valueDisplay.textContent = value.toFixed(2);
            }
        }
    }
    
    // Enable or disable value display
    set showValue(show) {
        this._showValue = show;
        if (show && !this._valueDisplay) {
            this._createValueDisplay(this.width);
            this._updateValueDisplay(this.element.value);
        } else if (!show && this._valueDisplay) {
            this._valueDisplay.remove();
            this._valueDisplay = null;
        }
    }
    
    get showValue() {
        return this._showValue;
    }

    // ccSet is called by Parameter.set() to update the GUI without triggering callback
    ccSet(value) {
        // Validate value to prevent NaN errors
        if (this.element && typeof value === 'number' && !isNaN(value) && isFinite(value)) {
            // Clamp value to min/max range
            const clampedValue = Math.max(this._min || 0, Math.min(this._max || 1, value));
            this.element.value = clampedValue;
            this._updateValueDisplay(clampedValue);
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