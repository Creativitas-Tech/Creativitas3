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

import * as Tone from 'tone';
import TwinklePresets from './synthPresets/TwinklePresets.json';
import { MonophonicTemplate } from './MonophonicTemplate.js';
import {Parameter} from './ParameterModule.js'
import basicLayout from './layouts/halfLayout.json';
import paramDefinitions from './params/kpVoiceParams.js';

export class KP extends MonophonicTemplate{
	constructor(color = [200,200,200]){
      super()
      this.presets = TwinklePresets
      this.synthPresetName = "TwinklePresets"
      //this.accessPreset()
      this.isGlide = false
      this.backgroundColor = [200,50,50]
      this.name = "Twinkle"
      this.guiHeight = 1
      this.layout = basicLayout
      this.detuneVal = 0

      this.frequency = new Tone.Signal(100)

      this.impulse = new Tone.Noise().start()
      this.hpf = new Tone.Filter({frequency: 200, type:'highpass', Q: 0, rolloff:-24})
      this.lpf = new Tone.Filter({frequency: 1000, type:'lowpass', Q: 0, rolloff:-12})
      this.lpf2 = new Tone.Filter({frequency: 1000, type:'lowpass', Q: 0, rolloff:-12})
      this.dry = new Tone.Signal(0.)
      this.wet = new Tone.Multiply(1)
      this.vca= new Tone.Multiply(1)
      this.delay_1 = new Tone.LowpassCombFilter({resonance:.95,dampening:10000})
      this.delay_2 = new Tone.LowpassCombFilter({resonance:.95,dampening:10000})
      //control
      this.env = new Tone.Envelope()
      this.env_depth = new Tone.Multiply(1)
      this.velocitySig = new Tone.Signal(1)
      this.choke = new Tone.Signal()
      this.resonanceAmount = new Tone.Signal(.9)
      this.velocity_depth = new Tone.Multiply(1)
      this.lowpassCutoffSignal = new Tone.Signal(1000)
      this.highpassCutoffSignal = new Tone.Signal(1000)
      this.bandwidthSignal = new Tone.Signal(500)
      this.hpfBandWidthNegate = new Tone.Negate()
      this.hpf_env_depth = new Tone.Multiply()
      this.lpf_env_depth = new Tone.Multiply()
      this.detuneAmount = new Tone.Signal(0)
      this.output = new Tone.Multiply(1)
      //connections
      this.impulse.connect(this.hpf)
      this.hpf.connect(this.lpf)
      this.lpf.connect(this.vca)
      //this.dry.connect(this.vca.factor)
      this.vca.connect(this.wet)
      this.wet.connect(this.delay_1)
      this.wet.connect(this.delay_2)
      this.delay_1.connect(this.lpf2)
      this.delay_2.connect(this.lpf2)
      this.lpf2.connect(this.output)

      this.frequency.connect( this.delay_1.delayTime)
      //this.frequency.connect( this.detuneAmount)
      this.frequency.connect( this.delay_2.delayTime)
      this.detuneAmount.connect(this.delay_2.delayTime)

      this.resonanceAmount.connect(this.delay_1.resonance)
      this.resonanceAmount.connect(this.delay_2.resonance)
      this.choke.connect(this.delay_1.resonance)
      this.choke.connect(this.delay_2.resonance)
      this.env.connect(this.env_depth)
      this.env_depth.connect(this.velocity_depth)
      this.velocity_depth.connect(this.vca.factor)
      this.velocitySig.connect(this.velocity_depth.factor)
      
      //filter cutoffs
      this.highpassCutoffSignal.connect( this.hpf.frequency)
      this.lowpassCutoffSignal.connect( this.lpf.frequency)
      this.lowpassCutoffSignal.connect( this.lpf2.frequency)
      this.env.connect(this.hpf_env_depth)
      this.env.connect(this.lpf_env_depth)
      this.hpf_env_depth.connect( this.hpf.frequency)
      this.lpf_env_depth.connect( this.lpf.frequency)
      this.lpf_env_depth.connect( this.lpf2.frequency)
      // this.bandwidthSignal.connect( this.lpf.frequency)
      // this.bandwidthSignal.connect(this.hpfBandWidthNegate)
      // this.hpfBandWidthNegate.connect(this.hpf.frequency)
	

    // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    //console.log(this.paramDefinitions)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
    setTimeout(()=>{this.loadPreset('default')}, 500);

  }
  cutoff = function(val,time=null){
    if(time){
      this.lowpassCutoffSignal.setValueAtTime(val, time)
      this.highpassCutoffSignal.setValueAtTime(val, time)
    }
    else {
      this.lowpassCutoffSignal.rampTo( val , 0.01) 
      this.highpassCutoffSignal.rampTo( val , 0.01)
    }
  }
  bandwidth = function(val, time){
    if(time) this.bandwidthSignal.setValueAtTime(val, time)
    else this.bandwidthSignal.value = val
  }
  setFrequency = function(val,time=null){
    if(time){
    	this.frequency.setValueAtTime(1/val, time)
    }
    else {
    	this.frequency.rampTo( 1/val, .01)
    }
  }
  setDamping = function(val){
      this.delay_1.dampening = val
      this.delay_2.dampening = val
  }
  
  triggerAttack(val, vel = 100, time = null) {
        vel = vel / 127;
        if (time) {
            this.frequency.setValueAtTime(1 / Tone.Midi(val).toFrequency(), time);
            this.env.triggerAttack(time);
        } else {
            this.frequency.value = 1 / Tone.Midi(val).toFrequency();
            this.env.triggerAttack();
        }
    }
  triggerRelease = function(val, time=null){
    if(time) this.env.triggerRelease(time)
    else this.env.triggerRelease()
  }
  triggerAttackRelease(val, vel = 100, dur = 0.01, time = null) {
        //console.log('AR ',val,vel,dur,time)
        let amp = vel/127
        if (time) {
          this.frequency.setValueAtTime(this.frequency.value,time);
          this.frequency.exponentialRampToValueAtTime(1 / Tone.Midi(val).toFrequency(), time + 0.02);
            //this.frequency.linearRampToValueAtTime(1 / Tone.Midi(val).toFrequency(), time);
            this.velocitySig.setValueAtTime(amp, time); // 0.03s time constant for smoother fade
            this.env.triggerAttackRelease(dur, time);
            this.updateDetune(1 / Tone.Midi(val).toFrequency(), time)
        } else {
            this.frequency.rampTo( 1 / Tone.Midi(val).toFrequency() , .1);
            this.velocitySig.rampTo(amp, 0.005); // 0.03s time constant for smoother fade
            this.env.triggerAttackRelease(dur);
            this.updateDetune( 1 / Tone.Midi(val).toFrequency(), time)
        }
    }

    setDetune(val) {
      let normalizedVal = Math.max(0., Math.min(1, val));
      if( normalizedVal < 0.01) normalizedVal = 0
      this.detuneVal = this.detuneFocusCurve(normalizedVal)
      this.updateDetune(this.frequency.value, null)
    }

    updateDetune(val, time) {
    
      if( time) {
        this.detuneAmount.setValueAtTime (this.frequency.value * this.detuneVal, time)
        this.detuneAmount.exponentialRampToValueAtTime(val * this.detuneVal, time + 0.02);
           
      }
      else this.detuneAmount.value =  val * this.detuneVal
    }

    detuneFocusCurve(x) {
    // Center at 1, 1.5, 2 with slight flattening using tanh or logistic smoothing
    // Use a weighted sum of bumps
    const centerVals = [0, 0.5, 1];
    const numDivisions = centerVals.length - 1;
    const divisionSize = 1 / numDivisions;
    let outputVal = 0

    const sigmoid = (x) => 1 / (1 + Math.exp(-x * 8)); // steeper sigmoid

      for (let i = 0; i < numDivisions; i++) {
        const start = i * divisionSize;
        const end = (i + 1) * divisionSize;
        const center = centerVals[i + 1];

        if (x >= start && x < end) {
          const normalized = (x - start) / divisionSize; // maps to 0–1
          const curved = sigmoid(normalized * 2 - 1);     // sigmoid centered at 0
          let outputVal =  start + curved * divisionSize;          // remap to original range
          //if(outputVal < 0.00001) outputVal = 0
          return outputVal
        }
      }
      return x; // fallback
  }
}

class KP2 {
  constructor(num = 8, color = [200,200,200]){
    this.numVoices = num
    this.voice = []
    for(let i=0;i<this.numVoices;i++) this.voice.push(new KP())
    
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
      this.voice[i].detuneAmount.value = val
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