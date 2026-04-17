import { NexusElement } from './parentNexus.js';

export class NexusText extends NexusElement {
    constructor(text = 'text', x = 0, y = 0) {
        // Pass the type "Dial" to the parent constructor
        super('text', x, y);
        this.curText = text

        this.elementContainer.textContent = this.curText
    }

    set text(value) {
        this.text = value
        this.elementContainer.textContent = this.curText
    }

}