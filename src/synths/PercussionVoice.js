/*
Percussion Voice

*/

import p5 from 'p5';
import * as Tone from 'tone';

export class Percussion{
    constructor(type) {
        console.log(type)
    }

    trigger = function(time){
        if(time){
            this.env.triggerAttackRelease(0.01, time)
            this.pitch_env.triggerAttackRelease(0.01,time)
        }else {
            this.env.triggerAttackRelease(0.01)
            this.pitch_env.triggerAttackRelease(0.01)
        }
    }

    connect(destination) {
        if (destination.input) {
            this.output.connect(destination.input);
        } else {
            this.output.connect(destination);
        }
    }

    disconnect(destination) {
        if (destination.input) {
            this.output.disconnect(destination.input);
        } else {
            this.output.disconnect(destination);
        }
    }
}
