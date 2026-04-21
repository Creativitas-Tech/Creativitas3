import { NexusElement } from './parentNexus.js';

export class NexusButton extends NexusElement {
    constructor(options = {}) {
        super('Button', options);
    }

    flip(){
        this.element.flip()
    }

    //button functions
    turnOn(){
        this.element.turnOn()
    }

    turnOff(){
        this.element.turnOff()
    }

    get mode() {
        return this._mode;
    }

    set mode(type){
        this._mode = type;
        this.element.mode = type
    }

    get state(){
        return this._state
    }

    set state(pressed){
        this._state = pressed;
        this.element.state = pressed
    }

}