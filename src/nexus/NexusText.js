import { NexusTextElement } from './parentNexus.js';

export class NexusText extends NexusTextElement {
    constructor(options) {
        // Pass the type "Dial" to the parent constructor
        super('TextButton', options);

        // Apply initial position (already set, but ensures consistency)
        setTimeout(()=>{
            this.updatePositionAndSize()
            this.updateColors()
        },200)

    }

    set accentColor(color){
        this.colors['accent'] = color
        this.updateColors()
    }
    set borderColor(color){
        this.colors['border'] = color
        this.updateColors()
    }
    set textColor(color){
        this.colors['text'] = color
        this.updateColors()
    }

        /* --- Visuals & Orientation --- */
        set orientation(value) {
            // 'horizontal' or 'vertical'
            this._orientation = value;
        }
        get orientation() { return this._orientation;}

        /* --- Cosmetics (Colors & Borders) --- */

        set border(value) {
            // Usually a boolean in NexusUI or a pixel width
            // this.element.borderWidth = value;
        }
        // get border() {
        //     return this.element.borderWidth;
        // }

        /* --- Visibility Flags --- */

        set showLabel(value) {
            this._showLabel = !!value;
        }
        get showLabel() {
            return this._showLabel;
        }

        set text(value) {
            this.label = value
        }
        get text() {
            return this.label
        }
}