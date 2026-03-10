import { NexusElement } from './parentNexus.js';

//https://nexus-js.github.io/ui/api/#Piano

export class NexusPiano extends NexusElement {
    constructor(x = 0, y = 0, width = 150, height = 300) {
        // Pass the type "Dial" to the parent constructor
        super('Piano', x, y, width, height);
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