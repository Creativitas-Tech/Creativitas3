import { NexusElement } from './parentNexus.js';

export class Dial extends NexusElement {
    constructor(x = 0, y = 0, width = 100, height = 100) {
        // Pass the type "Dial" to the parent constructor
        super('Dial', x, y, width, height);
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