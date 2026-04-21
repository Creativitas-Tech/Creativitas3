import { NexusElement } from './parentNexus.js';

export class NexusTextButton extends NexusElement {
    constructor(options) {
        // Pass the type "Dial" to the parent constructor
        super('TextButton', options);
        this.text = this.label
        if(this.mode == 'toggle') this.altText =this.label
    }

    set text(value) {
        console.log('text', value)
        this.element.text = value
    }

    set altText(value) {
        this.element.alternateText = value
    }

}