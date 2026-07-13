/*
 Mother - approximation of a mother-32

Saw / PWM VCO
VCO mod depth with lfo and env inputs, and freq and pwm outputs
Mixer with Noise
VCF w/cutoff and resonance, and mod_depth either LFO or Env
Env with AD controls
VCA with env/on
LFO with shape and rate controls

*/

import * as Tone from 'tone';
import TwinklePresets from './synthPresets/TwinklePresets.json';
import { MonophonicTemplate } from './MonophonicTemplate.js';
import {Parameter} from './ParameterModule.js'
import basicLayout from './layouts/motherLayout.json';
import paramDefinitions from './params/motherParams.js';
import {Theory} from '../TheoryModule.js'
 
export class Mother extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
		this.presets = TwinklePresets
		this.synthPresetName = "TwinklePresets"
		//this.accessPreset()
    this.isGlide = false
    this.name = "Mother"
    this.guiHeight = 1
    this.layout = basicLayout
    //console.log(this.name, " loaded, available preset: ", this.presets)

    // Initialize the main frequency control
    this.frequency = new Tone.Signal(200);
    this.frequencyMod = new Tone.Multiply(1);
    this.cutoffCV = new Tone.Signal()
    this.frequency.connect(this.frequencyMod)

    // VCOs
    this.vco_pulse = new Tone.PulseOscillator().start();
    this.vco_noise = new Tone.Noise().start();
    this.vco_saw = new Tone.Oscillator({type:'sawtooth'}).start();
    this.frequencyMod.connect(this.vco_pulse.frequency)
    this.frequencyMod.connect(this.vco_saw.frequency)

    //MIXER
    this.vco_mixer = new Tone.CrossFade()
    // this.noise_mixer = new Tone.Gain()
    this.vco_saw.connect(this.vco_mixer.a)
    this.vco_pulse.connect(this.vco_mixer.a)
    this.vco_noise.connect(this.vco_mixer.b)


    // VCF
    this.vcf = new Tone.Filter({type:"lowpass", rolloff:-24});
    this.vco_mixer.connect(this.vcf);
    // this.vco_noise.connect(this.vcf);

    // VCF, VCA, output
    this.vca = new Tone.Multiply()
    this.vcf.connect(this.vca)
    this.output = new Tone.Multiply(1)
    this.vcf.connect(this.vca)
    this.vca.connect(this.output)

    // VCA control
    this.vca_lvl = new Tone.Signal();
    this.vca_lvl.connect(this.vca.factor)
    this.env = new Tone.Envelope();
    this.env.releaseCurve = 'linear'
    this.env.decayCurve = 'exponential'
    this.env_depth = new Tone.Multiply()
    this.env.connect(this.env_depth)
    this.env_depth.connect(this.vca.factor)
    this.velocitySig = new Tone.Signal(1)
    this.velocitySig.connect(this.env_depth.factor)

    //vcf control
    this.cutoffSig = new Tone.Signal(1000);
    this.cutoff_cv = new Tone.Signal(0);
    this.vcf_env_depth = new Tone.Multiply(500);
    this.keyTracker = new Tone.Multiply(.1)
    this.env.connect(this.vcf_env_depth)
    this.vcf_env_depth.connect(this.vcf.frequency)
    this.cutoffSig.connect(this.vcf.frequency)
    this.cutoff_cv.connect(this.vcf.frequency)
    this.frequency.connect(this.keyTracker)
    this.keyTracker.connect(this.vcf.frequency)



    //LFO
    this.lfo = new Tone.LFO(1,-1,1).start()
    this.lfo_vco_frequency = new Tone.Multiply(0)
    this.lfo_vco_width = new Tone.Multiply(0)
    this.vco_mod_depth = new Tone.Multiply(0)
    this.lfo_filter_depth = new Tone.Multiply(0)
    //
    this.lfo.connect( this.vco_mod_depth)
    this.lfo.connect( this.lfo_filter_depth)
    //
    this.vco_mod_depth.connect(this.lfo_vco_width)
    this.vco_mod_depth.connect(this.lfo_vco_frequency)
    this.lfo_vco_frequency.connect(this.vco_pulse.frequency)
    this.lfo_vco_frequency.connect(this.vco_saw.frequency)
    this.lfo_vco_width.connect(this.vco_pulse.width)
    this.frequencyMod.factor.value = 1
    

    this.lfo.connect( this.lfo_filter_depth)
    this.lfo_filter_depth.connect(this.vcf.frequency)

    // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    //console.log(this.paramDefinitions)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
    setTimeout(()=>{this.loadPreset('default')}, 500);
  }//constructor

  //envelopes
  triggerAttack (freq, amp, time=null){
    freq = Theory.mtof(freq)
    amp = amp/127
    if(time){
      this.env.triggerAttack(time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.linearRampToValueAtTime(amp, time + 0.01);
    } else {
      this.env.triggerAttack()
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }
  triggerRelease (time=null){
    if(time) {
    	this.env.triggerRelease(time)
    }
    else {
      this.env.triggerRelease()
    }
  }
  triggerAttackRelease (freq, amp, dur=0.01, time=null){
    freq = Theory.mtof(freq)
    //console.log('f', freq)
    amp = amp/127
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.frequency.setValueAtTime(freq, time)
      //this.velocitySig.cancelScheduledValues(time);
      this.velocitySig.setTargetAtTime(amp, time, 0.005); // 0.03s time constant for smoother fade
      //this.velocitySig.linearRampToValueAtTime(amp, time + 0.005);
    } else{
      this.env.triggerAttackRelease(dur)
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }//attackRelease

  triggerRawAttack (freq, amp=1, time=null){
    if(amp > 1) amp = 1
    if(time){
      this.env.triggerAttack(time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.linearRampToValueAtTime(amp, time + 0.01);
    } else {
      this.env.triggerAttack()
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }
  triggerRawRelease (time=null){
    if(time) {
      this.env.triggerRelease(time)
    }
    else {
      this.env.triggerRelease()
    }
  }
  triggerRawAttackRelease (freq, amp=1, dur=0.01, time=null){
    if(amp > 1) amp = 1
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.frequency.setValueAtTime(freq, time)
      //this.velocitySig.cancelScheduledValues(time);
      this.velocitySig.setTargetAtTime(amp, time, 0.005); // 0.03s time constant for smoother fade
      //this.velocitySig.linearRampToValueAtTime(amp, time + 0.005);
    } else{
      this.env.triggerAttackRelease(dur)
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }//attackRelease
}