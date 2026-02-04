import { NexusElement } from './parentNexus.js';

export class NexusSwitch extends NexusElement {
    constructor(x = 0, y = 0, width = 75, height = 25) {
        // Pass the type "Dial" to the parent constructor
        super('Toggle', x, y, width, height);
    }

    flip(){
        this.element.flip()
    }

    get state(){
        return this._state
    }

    set state(flipped){
        this._state = flipped;
        this.element.state = flipped
    }
}