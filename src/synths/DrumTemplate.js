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

}
