import { NexusElement } from './parentNexus.js';

export class NexusTextButton extends NexusElement {
    constructor(options) {
        // Pass the type "Dial" to the parent constructor
        super('TextButton', options);
        this.text = this.label ?? 'text'
        if(this.mode == 'toggle') this.altText =this.label

        if(this.value ) this.turnOn()

        this.showLabel = false
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

    set altText(value) {
        this.element.alternateText = value
    }

    set label(value){
        this._label = value
        this.element.text = this._label
    }
    get label(){ return this._label}

}