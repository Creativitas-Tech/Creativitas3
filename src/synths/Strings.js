/*
Twinkle

Single vco monosynth
* vco->vcf->vca->output

*/

import * as Tone from 'tone';
import presets from './synthPresets/StringsPresets.json';
import { MonophonicTemplate } from './MonophonicTemplate.js';
import {Parameter} from './ParameterModule.js'
import basicLayout from './layouts/halfLayout.json';
import paramDefinitions from './params/stringsParams.js';
import {Theory} from '../TheoryModule.js'
 
export class Strings extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
		this.presets = presets
		this.synthPresetName = "StringsPresets"
		//this.accessPreset()
    this.isGlide = false
    this.name = "Strings"
    this.guiHeight = 0.5
    this.layout = basicLayout
    //console.log(this.name, " loaded, available preset: ", this.presets)

    // Initialize the main frequency control
    this.frequency = new Tone.Signal(200);

    // VCOs
    this.vco = new Tone.Oscillator({ type:'triangle'}).start();
    this.frequency.connect(this.vco.frequency)
    this._vcoMain = new Tone.Oscillator().start();
    this.frequency.connect(this._vcoMain.frequency)

    //WAVESHAPER
    this._waveShaper = new Tone.WaveShaper()
    this.vco.connect(this._waveShaper);
    this._waveShaperMain = new Tone.WaveShaper()
    this._vcoMain.connect(this._waveShaperMain);
    this._waveShaper.setMap( x=> Math.tanh(x*15))
    this._waveShaperMain.setMap( x=> Math.tanh(x*15))

    //PWM
    this._lfo = new Tone.LFO({type:'triangle'}).start()
    this._lfo.connect(this._waveShaper)
    this._lfo.amplitude.value = 0.2
    this._pulseWidthMain = new Tone.Signal()
    this._pulseWidthMod = new Tone.Signal()
    this._pulseWidthMain.connect(this._waveShaperMain)
    this._pulseWidthMod.connect(this._waveShaper)

    // VCF
    this.vcf = new Tone.Filter({type:"lowpass", rolloff:-12});
    this._waveShaper.connect(this.vcf);
    this._waveShaperMain.connect(this.vcf)

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
    this.env.attackCurve = 'linear'
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
    this.keyTracker = new Tone.Multiply(0)
    this.env.connect(this.vcf_env_depth)
    this.vcf_env_depth.connect(this.vcf.frequency)
    this.cutoffSig.connect(this.vcf.frequency)
    this.cutoff_cv.connect(this.vcf.frequency)
    this.frequency.connect(this.keyTracker)
    this.keyTracker.connect(this.vcf.frequency)

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
    //console.log('f', freq, amp, dur, time)
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