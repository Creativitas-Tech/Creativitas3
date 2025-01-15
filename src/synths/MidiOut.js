/*
MidiOut
 
 Overrides ParseNoteOut to send Midi messages

*/
import p5 from 'p5';
import * as Tone from 'tone';
//import RumblePresets from './synthPresets/RumblePresets.json';
import { MonophonicTemplate } from './MonophonicTemplate';
import * as Midi from '../Midi.js'
import {Theory, parsePitchStringSequence, parsePitchStringBeat,getChord, pitchNameToMidi, intervalToMidi} from '../TheoryModule'

export class MidiOut extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.isGlide = false
    this.name = "MidiOut"
    console.log(this.name, " loaded")
    this.midiOutput = Midi.midiHandlerInstance
    this.channel = 1

    
  }//constructor

  triggerAttackRelease(val, vel = 100, dur = 0.01, time = null) {
    console.log('AR', val, vel, time);

    // Calculate absolute start and end times
    const startTime = time ? Tone.now() + Tone.Time(time).toSeconds() : Tone.now();
    const endTime = startTime + Tone.Time(dur).toSeconds();

    // Schedule Note On and Note Off messages for MIDI output
    if (this.midiOutput) {
        const channel = this.channel || 1; // Default to channel 1
        const midiNote = val;

        //this.midiOutput.sendNoteOn(midiNote, vel);
        Tone.Draw.schedule(() => {
            this.midiOutput.sendNoteOn( midiNote, vel);
        }, time);

        Tone.Draw.schedule(() => {
            this.midiOutput.sendNoteOff(midiNote, 0);
        }, time+dur);
    }
}

  parseNoteString(val, time, num, index){
        //console.log(val) //[value, time as a fraction of a beat]
        if(val[0] === ".") return
        
        const usesPitchNames = /^[a-ac-zA-Z]$/.test(val[0][0]);

        let note = ''
        //console.log(val[0], usesPitchNames)
        if( usesPitchNames ) note =  pitchNameToMidi(val[0])
        else note = intervalToMidi(val[0], this.min, this.max)
        const div = val[1]
        if(note < 0) return
        //console.log(note, this.velocity[num], this.sustain[num], time)

        //check for velocity,octave,sustain, and roll arrays
        let octave = this.getNoteParam(this.octave[num],index)
        let velocity = this.getNoteParam(this.velocity[num],index)
        let sustain = this.getNoteParam(this.sustain[num],index)
        //let roll = getNoteParam(this.roll[num],this.index[num])
        //console.log(note + octave*12, velocity, sustain)
        try{
            this.triggerAttackRelease(note + octave*12, velocity, sustain, time + div * (Tone.Time(this.subdivision[num])));
        } catch(e){
            console.log('invalid note', note + octave*12, velocity, sustain)
        }
    }

}
