import { NexusElement } from './parentNexus.js';

export class NexusText extends NexusElement {
    constructor(options) {
        // Pass the type "Dial" to the parent constructor
        super('TextButton', options);

        //colors:
        this.element.colorize('fill', '#00000000') //transparent background
        this.element.colorize('dark', this.colors.text)

        this.elementContainer.style.pointerEvents = "none";

    }

    set text(value) {
        this.element.text = value
    }

}