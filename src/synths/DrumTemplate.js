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

    // TODO should we actually reimplement triggerAttack, triggerRelease, and triggerAttackRelease?
    // triggerAttack(val, vel = 100, time = null) {
    //     this.trigger();
    // }

    // triggerRelease(val, time = null) {
    //     // do nothing
    // }

    // triggerAttackRelease(val, vel = 100, dur = 0.01, time = null) {
    //   this.trigger();
    // }
}
