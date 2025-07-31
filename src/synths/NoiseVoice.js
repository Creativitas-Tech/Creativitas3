/*
NoiseVoice

noise->gain->waveshaper->hpf->lpf->vca->output

basic noise oscillator with:
* integrated HPF and LPF
* VCA w/ env
* direct output level
* gui

*/

import p5 from 'p5';
import { sketch } from '../p5Library.js'
import * as Tone from 'tone';
// import NoiseVoicePresets from './synthPresets/NoiseVoicePresets.json';
import { MonophonicTemplate } from './MonophonicTemplate';
import {Parameter} from './ParameterModule.js'
import basicLayout from './layouts/basicLayout.json';
import paramDefinitions from './params/noiseVoiceParams.js';


export class NoiseVoice extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
		this.presets = {}
		this.synthPresetName = "NoiseVoicePresets"
		this.accessPreset()
    this.isGlide = false
    this.name = "NoiseVoice"

      this.source = new Tone.Noise().start() 
      this.gain = new Tone.Multiply(0.5)
      this.waveshaper = new Tone.WaveShaper((input) => {
        // thresholding
        // if (input < -0.5 || input > 0.5) {
        //     // Apply some shaping outside the range -0.5 to 0.5
        //     return (input);
        // } else return 0;
        return Math.tanh(input*8)
      })  
      this.hpf =  new Tone.Filter({frequency: 200, type:'highpass', Q: 0})
      this.lpf = new Tone.Filter({frequency: 1000, type:'lowpass', Q: 0})
      this.vca= new Tone.Multiply(0)
      this.output= new Tone.Multiply(1)
      //control
      this.env = new Tone.Envelope({
        attack:0.01, decay:.1, sustain:0,release:.1
      })
      this.velocitySig = new Tone.Signal(1)
      this.velocity_depth = new Tone.Multiply(1)
      this.env_depth = new Tone.Multiply(1)
      this.direct = new Tone.Signal(1)
      this.baseCutoff = new Tone.Signal(0)
      this.cutoffSignal = new Tone.Signal(1000)
      this.hpf_band = new Tone.Multiply()
      this.lpf_band = new Tone.Multiply()
      this.hpf_env_depth = new Tone.Multiply()
      this.lpf_env_depth = new Tone.Multiply()
      //audio connections
      this.source.connect(this.gain)
      this.gain.connect(this.waveshaper)
      this.waveshaper.connect(this.hpf)
      this.hpf.connect(this.lpf)
      this.lpf.connect(this.vca)
      this.vca.connect(this.output)
      this.env.connect(this.velocity_depth)
      this.velocitySig.connect(this.velocity_depth.factor)
      this.velocity_depth.connect(this.env_depth)
      this.env_depth.connect( this.vca.factor)
      this.direct.connect(this.vca.factor)
      //filter cutoffs
      this.baseCutoff.connect(this.hpf.frequency)
      this.baseCutoff.connect(this.lpf.frequency)
      this.cutoffSignal.connect( this.hpf.frequency)
      this.cutoffSignal.connect( this.lpf.frequency)
      this.cutoffSignal.connect( this.hpf_band)
      this.cutoffSignal.connect( this.lpf_band)
      this.hpf_band.connect(this.hpf.frequency)
      this.lpf_band.connect(this.lpf.frequency)
      this.env.connect(this.hpf_env_depth)
      this.env.connect(this.lpf_env_depth)
      this.hpf_env_depth.connect( this.hpf.frequency)
      this.lpf_env_depth.connect( this.lpf.frequency)

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
  setCutoff (val,time=null){
    if(time)this.cutoffSignal.setValueAtTime(val, time)
    else this.cutoffSignal.value = val  
  }
  setResonance (val, which = 'both', time=null){
    if(time){
      if(which === 'both' || which === 'lpf') this.lpf.Q.setValueAtTime(val, time)
      if(which === 'both' || which === 'hpf') this.hpf.Q.setValueAtTime(val, time)
    }
    else {
      if(which === 'both' || which === 'lpf') this.lpf.Q.value = val  
      if(which === 'both' || which === 'hpf') this.hpf.Q.value = val  
    }
  }
  setBandwidth (val, which = 'both', time = null){
    if(time) {
      if(which === 'both' || which === 'hpf') this.hpf_band.factor.setValueAtTime(1-Math.pow(2,1/val), time)
      if(which === 'both' || which === 'lpf') this.lpf_band.factor.setValueAtTime(1-Math.pow(2,val), time)
    }
    else {
      if(which === 'both' || which === 'hpf') this.hpf_band.factor.value = 1-Math.pow(2,1/val)
      if(which === 'both' || which === 'lpf') this.lpf_band.factor.value = 1-Math.pow(2,val)
    }
  }
  triggerAttack (val, vel=100, time=null){
    if(time){
      this.env.triggerAttack(time)
      this.setCutoff(Tone.Midi(val).toFrequency(), time)
    } else{
      this.env.triggerAttack()
      this.setCutoff(Tone.Midi(val).toFrequency())
      console.log('att', val)
    }
  }
  triggerRelease (time=null){
    if(time) this.env.triggerRelease(time)
    else this.env.triggerRelease()
  }
  triggerAttackRelease (val, vel=100, dur=0.01, time=null){
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.setCutoff(Tone.Midi(val).toFrequency(), time)
    } else{
      this.env.triggerAttackRelease(dur)
      this.setCutoff(Tone.Midi(val).toFrequency())
    }
  }//attackRelease
}