/*
 *
 * Class to define a multiVCO which can produce multiple waves in series
 * Parameters are frequency, types of waves, and scalars to shift the pitch (0.5 for down an octave, 2 for up an octave)
 * 
*/

import p5 from 'p5';
import * as Tone from 'tone';

export class MultiVCO{
    constructor(vcos = [], pitchshift = []){
        this.numInputs = vcos.length
        this.frequency = new Tone.Signal(1)
        this.output = this.numInputs === 0 ? new Tone.Multiply(1) : new Tone.Multiply(1/this.numInputs)

        this.freqScalars= []
        this.gainStages = []
        this.vco = []

        for(this.i=0;this.i<this.numInputs;this.i++) {
            this.freqScalars.push(new Tone.Multiply(pitchshift[this.i]))
            if (vcos[this.i] === 'noise') {
                this.vco.push(new Tone.Noise("white").start())
            }
            else {
                this.vco.push(new Tone.Oscillator({type:vcos[this.i]}).start())
            }
            this.gainStages.push(new Tone.Multiply(1))
            this.frequency.connect(this.freqScalars[this.i])
            if (vcos[this.i] !== 'noise') {
                this.freqScalars[this.i].connect(this.vco[this.i].frequency)
            }
            this.vco[this.i].connect(this.gainStages[this.i])
            this.gainStages[this.i].connect(this.output)
        }
    }

    addVoice = (vcoType)=> {
        this.freqScalars.push(new Tone.Multiply(1))
        if (vcoType === 'noise') {
            this.vco.push(new Tone.Noise("white").start())
        }
        else {
            this.vco.push(new Tone.Oscillator({type:vcoType}).start())
        }
        this.gainStages.push(new Tone.Multiply(1))
        this.frequency.connect(this.freqScalars[this.numInputs])
        if (vcoType !== 'noise') {
            this.freqScalars[this.numInputs].connect(this.vco[this.numInputs].frequency)
        }
        this.vco[this.numInputs].connect(this.gainStages[this.numInputs])
        this.gainStages[this.numInputs].connect(this.output)
        this.numInputs++
        this.output.factor.value = 1/this.numInputs
    }

    removeVoice = (index = 0)=> {
        this.vco[index].stop()
        this.frequency.disconnect(this.freqScalars[index])
        if (this.vco[index].type !== 'noise') {
            this.freqScalars[index].disconnect(this.vco[index].frequency)
        }
        this.vco[index].disconnect(this.gainStages[index])
        this.gainStages[index].disconnect(this.output)
        if (index < this.numInputs - 1) {
            for (let i = index; i < this.numInputs ; i++) {
                this.freqScalars[i] = this.freqScalars[i+1]
                this.gainStages[i] = this.gainStages[i+1]
                this.vco[i] = this.vco[i+1]
            }
        }
        this.freqScalars.pop()
        this.gainStages.pop()
        this.vco.pop()

        this.numInputs--
        this.output.factor.value = this.numInputs === 0 ? 1 : 1/this.numInputs
    }

    setPitchshift= (index, shift) =>{
        if (index >= this.numInputs || index < 0) {
            console.log("Index out of range")
        }
        else {
            this.freqScalars[index].factor.value = shift
        }
    }

    setGain = (index, level)=> {
        if (index >= this.numInputs || index < 0) {
            console.log("Index out of range")
        }
        else {
            this.gainStages[index].factor.value = level
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