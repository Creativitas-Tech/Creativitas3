/*
Rumble

Three oscillator monosynth
* 3 vcos->mixer->gain->waveShaper->vcf->vca->output
* main pitch input is .frequency.value

methods:
- connect
setADSR(a,d,s,r)
setFilterADSR(a,d,s,r)
setDetune(a,b,c)
setPwmDepth(a,b,c)
setGain(a,b,c)

properties set directly:
frequency.value
velocitySig.value
cutoff_cv.value
clip.factor (into waveShaper)
vca_lvl.value
cutoffSig.value
vcf_env_depth.factor
keyTracking.factor
lfo.frequency

properties set using methods:
vco_freq_1, vco_freq_2, vco_freq_3
vco_gain_1, vco_gain_2, vco_gain_3
env and vcf_env ADSR
lfo_pwm_1, lfo_pwm_2, lfo_pwm_3
gain (into waveShaper)

 
*/
import p5 from 'p5';
import * as Tone from 'tone';
import RumblePresets from './synthPresets/RumblePresets.json';
import { MonophonicTemplate } from './MonophonicTemplate.js';
import {Parameter} from './ParameterModule.js'
import tightLayout from './layouts/tightLayout.json';
import paramDefinitions from './params/rumbleParams.js';
import {Theory} from '../TheoryModule.js'

export class Rumble extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
		this.presets = RumblePresets
		this.synthPresetName = "RumblePresets"
		//this.accessPreset()
    this.isGlide = false
    this.name = "Rumble"
    this.layout = tightLayout

    // Initialize the main frequency control
    this.frequency = new Tone.Signal();

    // Frequency ratios for VCOs
    this.vco_freq_1 = new Tone.Multiply(1);
    this.vco_freq_2 = new Tone.Multiply(1);
    this.vco_freq_3 = new Tone.Multiply(1);
    this.vco_octave_1 = new Tone.Multiply(1);
    this.vco_octave_2 = new Tone.Multiply(1);
    this.vco_octave_3 = new Tone.Multiply(1);
    this.frequency.connect(this.vco_freq_1);
    this.frequency.connect(this.vco_freq_2);
    this.frequency.connect(this.vco_freq_3);

    // VCOs
    this.vco_1 = new Tone.OmniOscillator({type:'pulse'}).start();
    this.vco_2 = new Tone.OmniOscillator({type:'pulse'}).start();
    this.vco_3 = new Tone.OmniOscillator({type:'pulse'}).start();
    this.vco_freq_1.connect(this.vco_octave_1);
    this.vco_freq_2.connect(this.vco_octave_2);
    this.vco_freq_3.connect(this.vco_octave_3);
    this.vco_octave_1.connect(this.vco_1.frequency);
    this.vco_octave_2.connect(this.vco_2.frequency);
    this.vco_octave_3.connect(this.vco_3.frequency);

    // Mixer
    this.vco_gain_1 = new Tone.Multiply(.25);
    this.vco_gain_2 = new Tone.Multiply(.25);
    this.vco_gain_3 = new Tone.Multiply(.25);
    this.vco_1.connect(this.vco_gain_1);
    this.vco_2.connect(this.vco_gain_2);
    this.vco_3.connect(this.vco_gain_3);

    this.vcf = new Tone.Filter({type:"lowpass", rolloff:-24});
    this.vco_gain_1.connect(this.vcf);
    this.vco_gain_2.connect(this.vcf);
    this.vco_gain_3.connect(this.vcf);

    //waveShaper
    this.clip = new Tone.Multiply(0.125)
    this.direct_level = new Tone.Multiply(.5)
    this.waveShaper = new Tone.WaveShaper((x)=>{
      return Math.sin(x*Math.PI*2)
    	//return Math.tanh(x*8)
    })
    this.waveShaper.oversample = "4x"
    this.vcf.connect(this.clip)
    this.vcf.connect(this.direct_level)
    this.clip.connect(this.waveShaper)

    // VCF, VCA, output
    this.vca = new Tone.Multiply()
    this.direct_level.connect(this.vca)
    this.output = new Tone.Multiply(.5)
    this.waveShaper.connect(this.vca)
    this.vca.connect(this.output)

    // VCA control
    this.vca_lvl = new Tone.Signal();
    this.vca_lvl.connect(this.vca.factor)
    this.env = new Tone.Envelope();
    this.env_depth = new Tone.Multiply()
    this.env.connect(this.env_depth)
    this.env_depth.connect(this.vca.factor)
    this.velocitySig = new Tone.Signal(1)
    this.velocitySig.connect(this.env_depth.factor)

    //vcf control
    this.vcf_env = new Tone.Envelope();
    this.cutoffSig = new Tone.Signal(1000);
    this.cutoff_cv = new Tone.Signal(0);
    this.vcf_env_depth = new Tone.Multiply(500);
    this.keyTracking = new Tone.Multiply(.1)
    this.vcf_env.connect(this.vcf_env_depth)
    this.vcf_env_depth.connect(this.vcf.frequency)
    this.cutoffSig.connect(this.vcf.frequency)
    this.cutoff_cv.connect(this.vcf.frequency)
    this.frequency.connect(this.keyTracking)
    this.keyTracking.connect(this.vcf.frequency)

    //LFO
    this.lfo = new Tone.Oscillator(1).start()
    this.lfo_pwm_1 = new Tone.Multiply()
    this.lfo_pwm_2 = new Tone.Multiply()
    this.lfo_pwm_3 = new Tone.Multiply()
    this.lfo.connect(this.lfo_pwm_1)
    this.lfo_pwm_1.connect(this.vco_1.width)
    this.lfo.connect(this.lfo_pwm_2)
    this.lfo_pwm_2.connect(this.vco_2.width)
    this.lfo.connect(this.lfo_pwm_3)
    this.lfo_pwm_3.connect(this.vco_3.width)

    // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    //console.log(this.paramDefinitions)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
    //setTimeout(()=>{this.loadPreset('default')}, 500);//for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
  }//constructor

  //envelopes
  triggerAttack (freq, amp, time=null){
    freq = Theory.mtof(freq)
    amp = amp/127
    if(time){
      this.env.triggerAttack(time)
      this.vcf_env.triggerAttack(time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.setValueAtTime(amp,time)
    } else {
      this.env.triggerAttack()
      this.vcf_env.triggerAttack()
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }
  triggerRelease (time=null){
    if(time) {
    	this.env.triggerRelease(time)
    	this.vcf_env.triggerRelease(time)
    }
    else {
      this.env.triggerRelease()
    	this.vcf_env.triggerRelease()
    }
  }
  triggerAttackRelease (freq, amp, dur=0.01, time=null){
    //console.log('AR ',freq,amp,dur,time)
    //freq = Tone.Midi(freq).toFrequency()
    freq = Theory.mtof(freq)
    amp = amp/127
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.vcf_env.triggerAttackRelease(dur, time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.setValueAtTime(amp,time)
    } else{
      this.env.triggerAttackRelease(dur)
      this.vcf_env.triggerAttackRelease(dur)
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }//attackRelease

  triggerRawAttack (freq, amp=1, time=null){
    if(amp > 1) amp = 1
    if(time){
      this.env.triggerAttack(time)
      this.vcf_env.triggerAttack(time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.setValueAtTime(amp,time)
    } else {
      this.env.triggerAttack()
      this.vcf_env.triggerAttack()
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }
  triggerRawRelease (time=null){
    if(time) {
      this.env.triggerRelease(time)
      this.vcf_env.triggerRelease(time)
    }
    else {
      this.env.triggerRelease()
      this.vcf_env.triggerRelease()
    }
  }
  triggerRawAttackRelease (freq, amp=1, dur=0.01, time=null){
    if(amp > 1) amp = 1
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.vcf_env.triggerAttackRelease(dur, time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.setValueAtTime(amp,time)
    } else{
      this.env.triggerAttackRelease(dur)
      this.vcf_env.triggerAttackRelease(dur)
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }//attackRelease

  setDetune(a,b,c){
  	this.vco_freq_1.factor.value = a
  	this.vco_freq_2.factor.value = b
  	this.vco_freq_3.factor.value = c
  }
  setPwmDepth(a,b,c){
  	this.lfo_pwm_1.factor.value = a
  	this.lfo_pwm_2.factor.value = b
  	this.lfo_pwm_3.factor.value = c
  }
  setGain(a,b,c){
  	this.vco_gain_1.factor.value = a
  	this.vco_gain_2.factor.value = b
  	this.vco_gain_3.factor.value = c
  }

  connect(destination) {
    if (destination.input) {
      this.output.connect(destination.input);
    } else {
      this.output.connect(destination);
    }
  }

  detuneFocusCurve(x) {
    // Center at 1, 1.5, 2 with slight flattening using tanh or logistic smoothing
    // Use a weighted sum of bumps
    const centerVals = [0, 0.5, 1];
    const numDivisions = centerVals.length - 1;
    const divisionSize = 1 / numDivisions;

    const sigmoid = (x) => 1 / (1 + Math.exp(-x * 10)); // steeper sigmoid

      for (let i = 0; i < numDivisions; i++) {
        const start = i * divisionSize;
        const end = (i + 1) * divisionSize;
        const center = centerVals[i + 1];

        if (x >= start && x < end) {
          const normalized = (x - start) / divisionSize; // maps to 0–1
          const curved = sigmoid(normalized * 2 - 1);     // sigmoid centered at 0
          return start + curved * divisionSize;          // remap to original range
        }
      }
      return x; // fallback
    
  }
}
