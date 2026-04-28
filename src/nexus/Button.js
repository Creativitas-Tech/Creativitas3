import { NexusElement } from './parentNexus.js';

export class NexusButton extends NexusElement {
    constructor(options = {}) {
        super('Button', options);

        this.mode = options.mode ?? 'Button'
    }

    updateColors(){
        // console.log(this.colors)
        this.colorize('fill', this.colors.alt)
        this.colorize('mediumLight', this.colors.border)
        this.colorize('dark', this.colors.text)
        this.colorize('accent', this.colors.accent)
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