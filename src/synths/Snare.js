import p5 from 'p5';
import * as Tone from 'tone';

/*
Synthesized Snare:

STRUCTURE:
    *
    H  vco1 \
    E        > --------> vca1 ---
    A  vco2 /             |       \
    D               headsEnvelope  \
    S                              out
    *                              /
    S              snareEnvelope  /
    N                     |      /
    A  rattle -> filter -> vca2 -
    R
    E
    *
    
    This snare uses the research done by the webpage/s:
        - https://www.soundonsound.com/techniques/practical-snare-drum-synthesis
        -
*/

export class Snare {
    constructor(frequency, gui = null) {
        this.name = 'Snare'
        this.gui = gui
        this.output = new Tone.Multiply(1)
        //
        // Heads
        this.vco1 = new Tone.Oscillator(frequency).start()
        this.vco2 = new Tone.Oscillator(frequency + 150).start()
        this.vca1 = new Tone.Multiply(.5)
        this.headsEnvelope = new Tone.Envelope({
                        attack: 0.001,
                        decay: 0.1,
                        sustain: 0,
                        release: 0.1
                    })
        this.vco1.connect(this.vca1)
        this.vco2.connect(this.vca1)
        this.headsEnvelope.connect(this.vca1.factor)
        this.vca1.connect(this.output)
        //
        // Snare
        this.rattle = new Tone.Noise('white').start()
        this.ratFilter = new Tone.Filter({
                        type: "bandpass",
                        frequency: 1500, 
                        Q: 1
                    })
        this.vca2 = new Tone.Multiply(0.5)
        this.ratEnvelope = new Tone.Envelope({
                                attack: 0.001,
                                decay: 0.2,
                                sustain: 0,
                                release: 0.1
                                })
        this.rattle.connect(this.ratFilter)
        this.ratFilter.connect(this.vca2)
        this.ratEnvelope.connect(this.vca2.factor)
        this.vca2.connect(this.output)
    }

    trigger(time = null) {
        if (time) {
            this.ratEnvelope.triggerAttackRelease(0.01, time)
            this.headsEnvelope.triggerAttackRelease(0.01,time)
        } else {
            this.ratEnvelope.triggerAttackRelease(0.01)
            this.headsEnvelope.triggerAttackRelease(0.01)
        }
    }


        // this.ratEnvelope.triggerAttackRelease(0.01), this.headsEnvelope.triggerAttackRelease(0.01)
    }
    