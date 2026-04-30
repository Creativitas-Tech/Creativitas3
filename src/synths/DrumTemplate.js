// MonophonicTemplate.js
/*

Base class for drum synths. Inherits from MonophonicTemplate and includes:
*/

import * as Tone from 'tone';
import { MonophonicTemplate } from './MonophonicTemplate';

/**
 * Base class for drum synths.
 * extends MonophonicTemplate
 */
export class DrumTemplate extends MonophonicTemplate {

    constructor() {
      super()
      this.type = 'Drum'
  }

    /**
     * Function to trigger the drum sound.
     */
    trigger() {
      this.env.triggerAttackRelease(0.001);
    }

    play(arr, subdivision = '8n', num = 0, phraseLength = 1) {
        
            this.seq[num]._offset = 0//there is a time delay between this and where the index is, but i can set it such as this so that I know that is started
            this.seq[num].drumSequence(arr, subdivision, phraseLength);
        
        this.start(num);

        // if (this.seq[num]) {
        //     this.seq[num].play(length);
        // }
    }

}
