import { NexusElement } from './parentNexus.js';

export class NexusNumberBox extends NexusElement {
    constructor(x = 0, y = 0, width = 75, height = 25) {
        // Pass the type "Dial" to the parent constructor
        super('Number', x, y, width, height);
    }

    link(source) {
        this.element.link(source.element);
    }

    get value(){
        return this._value
    }

    set value(number){
        this._value = number;
        this.element.value = number
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