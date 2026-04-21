import { NexusElement } from './parentNexus.js';

export class NexusBackground extends NexusElement {
    constructor(options) {
        // Pass the type "Dial" to the parent constructor
        super('NexusBackground', options);

        // this.label = options.label ?? "myElement";
        // this.baseSize = 50
        // this.size = options.size ?? 1;
        // this.x = options.x ?? .5;
        // this.y = options.y ?? .5;
        // this.width = options.width ?? 1;
        // this.height = options.height ?? 1;

        this.style = options.style ?? "default"
        this.accentColor = options.accentColor ?? this.colors.accent
        this.borderColor = options.borderColor ?? this.colors.border
        this.textColor = options.textColor ?? this.colors.text

        this.elementContainer.style.pointerEvents = "none";

    }

    set text(value) {
        this.element.text = value
    }

}