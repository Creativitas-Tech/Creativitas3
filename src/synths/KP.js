/*
KP

Karplus-Strong synthesis
* noise->hpf->lpf->dry->gain
* lpf->vca->wet->delay->gain
* gain->waveshaper->output

methods:
- 
setResonance
setDamping
setFilterFreq
setFilterQ 
setADSR

properties:
- gain.factor.value
*/

import p5 from 'p5';
import * as Tone from 'tone';
import { NoiseVoice } from './NoiseVoice.js';
import { Resonator } from './Resonator.js';

class Voice{
	constructor(color = [200,200,200]){
      this.impulse = new Tone.Noise().start()
      this.hpf = new Tone.Filter({frequency: 200, type:'highpass', Q: 0, rolloff:-24})
      this.lpf = new Tone.Filter({frequency: 1000, type:'lowpass', Q: 0, rolloff:-12})
      this.dry = new Tone.Signal(0.)
      this.wet = new Tone.Multiply(1)
      this.vca= new Tone.Multiply(1)
      this.delay_1 = new Tone.LowpassCombFilter({resonance:.95,dampening:10000})
      this.delay_2 = new Tone.LowpassCombFilter({resonance:.95,dampening:10000})
      //control
      this.env = new Tone.Envelope()
      this.env_depth = new Tone.Multiply(1)
      this.velocity = new Tone.Multiply(1)
      this.choke = new Tone.Signal()
      this.resonance = new Tone.Signal(.9)
      this.velocity_depth = new Tone.Multiply(1)
      this.lowpassCutoffSignal = new Tone.Signal(1000)
      this.highpassCutoffSignal = new Tone.Signal(1000)
      this.bandwidthSignal = new Tone.Signal(500)
      this.hpfBandWidthNegate = new Tone.Negate()
      this.hpf_env_depth = new Tone.Multiply()
      this.lpf_env_depth = new Tone.Multiply()
      this.delayTime = new Tone.Signal(.1)
      this.detune = new Tone.Multiply(1)
      this.output = new Tone.Multiply(1)
      //connections
      this.impulse.connect(this.hpf)
      this.hpf.connect(this.lpf)
      this.lpf.connect(this.vca)
      this.dry.connect(this.vca.factor)
      this.vca.connect(this.wet)
      this.wet.connect(this.delay_1)
      this.wet.connect(this.delay_2)
      this.delay_1.connect(this.output)
      this.delay_2.connect(this.output)
      this.resonance.connect(this.delay_1.resonance)
      this.resonance.connect(this.delay_2.resonance)
      this.choke.connect(this.delay_1.resonance)
      this.choke.connect(this.delay_2.resonance)
      this.env.connect(this.env_depth)
      this.env_depth.connect(this.velocity_depth)
      this.velocity_depth.connect(this.vca.factor)
      this.velocity.connect(this.velocity_depth)
      this.delayTime.connect( this.delay_1.delayTime)
      this.delayTime.connect( this.detune)
      this.detune.connect( this.delay_2.delayTime)
      //filter cutoffs
      this.highpassCutoffSignal.connect( this.hpf.frequency)
      this.lowpassCutoffSignal.connect( this.lpf.frequency)
      this.env.connect(this.hpf_env_depth.factor)
      this.env.connect(this.hpf_env_depth.factor)
      this.hpf_env_depth.connect( this.hpf.frequency)
      this.lpf_env_depth.connect( this.lpf.frequency)
      //this.bandwidthSignal.connect( this.lpf.frequency)
      //this.bandwidthSignal.connect(this.hpfBandWidthNegate)
      //this.hpfBandWidthNegate.connect(this.hpf.frequency)
	}
  cutoff = function(val,time=null){
    if(time)this.lowpassCutoffSignal.setValueAtTime(val, time)
    else this.lowpassCutoffSignal.value = val  
  }
  bandwidth = function(val, time){
    if(time) this.bandwidthSignal.setValueAtTime(val, time)
    else this.bandwidthSignal.value = val
  }
  frequency = function(val,time=null){
    if(time){
    	this.delayTime.setValueAtTime(1/val, time)
    }
    else {
    	this.delayTime.rampTo( 1/val, .01)
    }
  }
  triggerAttack = function(val, vel, time=null){
    if(time){
      this.env.triggerAttack(time)
      this.frequency(val, time)
      this.velocity_depth.linearRampToValueAtTime(vel,.01,time)
    } else{
      this.env.triggerAttack()
      this.frequency(val)
      this.velocity_depth.rampTo(vel,0.002)
    }
  }
  triggerRelease = function(val, time=null){
    if(time) this.env.triggerRelease(time)
    else this.env.triggerRelease()
  }
  triggerAttackRelease = function(val, vel, dur=0.01, time=null){
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.frequency(val, time)
      this.velocity_depth.linearRampToValueAtTime(vel,.01,time)
    } else{
      this.env.triggerAttackRelease(dur)
      this.frequency(val)
      this.velocity_depth.rampTo(vel,0.002)
    }
  }//attackRelease
}

export class KP {
  constructor(num = 8, color = [200,200,200]){
    this.numVoices = num
    this.voice = []
    for(let i=0;i<this.numVoices;i++) this.voice.push(new Voice())
    
    //waveShaper
    this.clip = new Tone.Multiply(0.125)
    this.waveShaper = new Tone.WaveShaper((x)=>{
      return Math.sin(x*Math.PI*2)
      //return Math.tanh(x*8)
    })
    this.waveShaper.oversample = "4x"

    //lpf on output
    this.lpf = new Tone.Filter({type:'lowpass', rolloff:-12, Q:0, frequency:5000})
    this.output = new Tone.Multiply(0.15)
    this.clip.connect(this.waveShaper)

    for(let i=0;i<this.numVoices;i++) this.voice[i].output.connect( this.clip)
    this.clip.connect(this.waveShaper)
    this.waveShaper.connect(this.lpf)
    this.lpf.connect(this.output)

    this.prevNote = 0
    this.v = 0
    this.voiceCounter = 0
    this.activeNotes = [-1,-1,-1,-1, -1,-1,-1,-1]
    this.noteOrder = [7,0,1,2,3,4,5,6]
  }
  // //trigger methods
  triggerAttack = function(val, vel=100, time=null){
    this.v = this.getNewVoice(val)
    if(time){
      this.voice[this.v].triggerAttack(val,vel,time)
    } else{
      this.voice[this.v].triggerAttack(val,vel)
    }
  }
  triggerRelease = function(val,  time=null){
    this.v = this.getActiveVoice(val)
    if(this.v < 0) return
    if(time){
      this.voice[this.v].triggerRelease(time)
    } else{
      this.voice[this.v].triggerRelease()
    }
  }
  triggerAttackRelease = function(val,vel=100, dur=0.01, time=null){
    this.v = this.getNewVoice(val)
    if(time){
      this.voice[this.v].triggerAttackRelease(val, vel, dur, time)
    } else{
      this.voice[this.v].triggerAttackRelease(val, vel, dur)
    }
  }//attackRelease
  // //voice management
  getNewVoice(num) {
    if (this.voiceCounter >= this.numVoices) {
      this.voiceCounter = 0; // Reset voice counter if it exceeds the number of voices
    }
    //console.log('new voice ', num, this.voiceCounter);

    //keep track of note order
    this.prevNote = this.noteOrder.shift();
    this.noteOrder.push(num);

    // Look for free notes
    for (let i = 0; i < this.numVoices; i++) {
      //if note is already playing free it
      if(this.activeNotes[i] == num ) this.triggerRelease(num)
      
    }
    for (let i = 0; i < this.numVoices; i++) {
    //look for free voice
      const index = (i + this.voiceCounter) % this.numVoices;
      if (this.activeNotes[index] < 0) {
        this.activeNotes[index] = num;
        this.voiceCounter = (index + 1) % this.numVoices; // Prepare for the next voice
        //console.log('free voice, assigned to voice', index)
        return index;
      }
    }

      this.voiceCounter = (this.voiceCounter + 1) % this.numVoices; // Prepare for the next voice
      return this.voiceCounter
    
    // // If no inactive voice, replace the oldest note
    // if (this.prevNote !== undefined) {
    //   const oldestNoteIndex = this.activeNotes.indexOf(this.prevNote);
    //   if (oldestNoteIndex !== -1) {
    //     this.activeNotes[oldestNoteIndex] = num;
    //     this.voiceCounter = (oldestNoteIndex + 1) % this.numVoices; // Update for the next voice
    //     console.log('steal voice', this.voiceCounter)
    //     return oldestNoteIndex;
    //   }
    // }

    // Fallback if the above logic didn't return
    //console.log('fallback', this.voiceCounter)
    const returnValue = this.voiceCounter;
    this.voiceCounter = (this.voiceCounter + 1) % this.numVoices;
    return returnValue;
  }
  getActiveVoice= function(num){    
    for(let i=0;i<this.numVoices;i++){
      if(this.activeNotes[i]==num){
        this.activeNotes[i] = -1
        //console.log('voice freed ', i)
        return i
      }
    }
    return -1
  }//getActiveVoice
  panic = function(){
    for(let i=0;i<this.numVoices;i++){
      this.voice[i].env.triggerRelease()
      //this.voice[i].vcf_env.triggerRelease()
      this.activeNotes[i]  = -1
    }
  }
  // //setters
  setResonance = function(val){
    for(let i=0;i<this.numVoices;i++) {
      this.voice[i].resonance.value = val
    }
  }
  setDamping = function(val){
    for(let i=0;i<this.numVoices;i++) {
      this.voice[i].delay_1.dampening = val
      this.voice[i].delay_2.dampening = val
    }
  }
  setCutoff = function(val){
    for(let i=0;i<this.numVoices;i++) this.voice[i].lowpassCutoffSignal.value = val
    this.lpf.frequency.value = val*2
  }
  setQ = function(val){
    for(let i=0;i<this.numVoices;i++) this.voice[i].lpf.Q.value = val
  }
  setHighpass = function(val){
    for(let i=0;i<this.numVoices;i++) this.voice[i].highpassCutoffSignal.value = val
  }
  setADSR = function(a,d,s,r){
    for(let i=0;i<this.numVoices;i++) {
      this.voice[i].env.attack = a
      this.voice[i].env.decay = d
      this.voice[i].env.sustain = s
      this.voice[i].env.release = r
    }
  }
  setDecay(val){
    val = val<0 ? 0.001 : val
    for(let i=0;i<this.numVoices;i++) {
      this.voice[i].env.release = val
      this.voice[i].env.decay = val
    }
  }
  setClip(val){
    this.clip.rampTo(val,0.02)
  }
  setChoke(val){
    for(let i=0;i<this.numVoices;i++) {
    this.voice[i].choke.rampTo(-val/2,0.2)
  }
  }
  setDetune(val){
    for(let i=0;i<this.numVoices;i++) {
      this.voice[i].detune.value = val
    }
  }
  setDry(val){
    for(let i=0;i<this.numVoices;i++) {
      this.voice[i].dry.value = val
    }
  }
  setEnvDepth(val){
    for(let i=0;i<this.numVoices;i++) {
      this.voice[i].env_depth.factor.value = val
    }
  }
  connect(destination) {
    if (destination.input) {
      this.output.connect(destination.input);
    } else {
      this.output.connect(destination);
    }
  }
}