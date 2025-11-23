/*
Daisies
Polyphonic Subtractive Synthesizer

Daisy:
* 2 OmniOscillators(vco_1, vco_2)->shape->waveShapers->mixer->vcf->hpf->panner->vca
* frequency->frequency_scalar->(detuneSig for vco_2)->vco_1.frequency
* frequencyCV->frequency_scalar.factor
* cutoff control: cutoff, cutoff_vc, keyTracking, vcf_env_depth
* lfo->vca_lfo_depth-<output.factor, pitch_lfo_depth->
* lfo->pitch_lfo_depth->frequency_scalar.factor
* env->velocity_depth(Multiply)->vca.factor
* velocity(Signal)->velocity_depth.factor
Daisies:
* daisy->hpf->output
*/

import { sketch } from '../p5Library.js'
import p5 from 'p5';
import * as Tone from 'tone';
import { MonophonicTemplate } from './MonophonicTemplate.js';
import {Parameter} from './ParameterModule.js'
import DaisiesPresets from './synthPresets/DaisiesPresets.json';
import { paramDefinitions } from './params/daisiesParams.js';
import daisyLayout from './layouts/daisyLayout.json';
import {Theory} from '../TheoryModule.js'

export class Daisy extends MonophonicTemplate{
	constructor(){
		super()
		this.presets = DaisiesPresets
		this.synthPresetName = "DaisiesPresets"
		//this.accessPreset()
		this.name = "Daisy"
		this.layout = daisyLayout

		this.frequency = new Tone.Signal(100)
		this.frequencyCV = new Tone.Signal()
		this.frequency_scalar = new Tone.Multiply(1)
		this.detune_scalar = new Tone.Multiply(1)
		this.vco_1 = new Tone.Oscillator({type:"square"}).start()
		this.vco_2 = new Tone.Oscillator({type:"square"}).start()
		this.frequency.connect(this.frequency_scalar)
		this.frequencyCV.connect(this.frequency_scalar.factor)
		this.frequency_scalar.connect(this.vco_1.frequency)
		this.frequency_scalar.connect(this.detune_scalar)
		this.detune_scalar.connect(this.vco_2.frequency)

		this.crossfade = new Tone.CrossFade()
		this.crossfade_lfo_depth = new Tone.Multiply()
		this.vco_1.connect( this.crossfade.a)
		this.vco_2.connect( this.crossfade.b)

		this.vcf = new Tone.Filter({type:'lowpass', rolloff:-24, Q:0, cutoff:3000})
		this.crossfade.connect(this.vcf)
		this.crossfade_constant = new Tone.Signal(0)
		this.crossfade_lfo_depth.connect(this.crossfade.fade)
		this.crossfade_constant.connect(this.crossfade.fade)

		this.vca = new Tone.Multiply()
		this.lfo_vca = new Tone.Multiply(1)
		this.lfo_vca_constant = new Tone.Signal(1)
		this.panner = new Tone.Panner(0)
		this.hpf = new Tone.Filter({type:'highpass', rolloff:-12, Q:0, cutoff:20})
		this.output = new Tone.Multiply(1)
		this.vcf.connect(this.lfo_vca)
		this.lfo_vca.connect(this.vca)
		this.lfo_vca_constant.connect(this.lfo_vca.factor)
		this.vca.connect(this.panner)
		this.panner.connect(this.hpf)
		this.hpf.connect(this.output)

		//envelopes
		this.env = new Tone.Envelope()
		this.velocitySig = new Tone.Signal(1)
		this.velocity_depth = new Tone.Multiply(1)
		this.env.connect(this.velocity_depth)
		this.velocity_depth.connect(this.vca.factor)
		this.velocitySig.connect(this.velocity_depth.factor)

		//vcf
		this.cutoffSig = new Tone.Signal(1000)
		this.cutoffSig.connect(this.vcf.frequency)
		this.cutoffCV = new Tone.Signal()
		this.cutoffCV.connect(this.vcf.frequency)
		this.keyTracker = new Tone.Multiply(.1)
		this.frequency.connect(this.keyTracker)
		this.keyTracker.connect(this.vcf.frequency)
		this.vcf_env = new Tone.Envelope()
		this.vcf_env_depth = new Tone.Multiply()
		this.vcf_env.connect(this.vcf_env_depth)
		this.vcf_env_depth.connect(this.vcf.frequency)

		this.lfoModule = new Tone.Oscillator(.5).start()
		this.vca_constant = new Tone.Signal(1)
		this.amp_lfo_depth = new Tone.Multiply(0)
		this.lfoModule.connect(this.amp_lfo_depth)
		this.amp_lfo_depth.connect(this.lfo_vca.factor)
		this.pitch_lfo_depth = new Tone.Multiply(0)
		this.lfoModule.connect(this.pitch_lfo_depth)
		this.lfoModule.connect(this.crossfade_lfo_depth)
		this.frequency_constant = new Tone.Signal(1)
		this.pitch_lfo_depth.connect(this.frequency_scalar.factor)
		this.frequency_constant.connect(this.frequency_scalar.factor)

		//no PWM to prevent errors when vco is not set to pulse
		this.pwm_lfo_depth = new Tone.Multiply()
		this.lfoModule.connect(this.pwm_lfo_depth)

		//this.pwm_lfo_depth.connect(this.vco_1.width)
		//this.pwm_lfo_depth.connect(this.vco_2.width)

		//for autocomplete
		this.autocompleteList = ["test", "triggerAttack"];

		this.paramDefinitions = paramDefinitions(this)
		this.param = this.generateParameters(this.paramDefinitions)
		this.createAccessors(this, this.param);
  }

  //TRIGGER METHODS
  triggerAttack = function(val, vel=100, time=null){
  	let freq = Theory.mtof(val)
  	vel = vel/127
    if(time){
      this.frequency.setValueAtTime(freq,time)
      this.env.triggerAttack(time)
      this.vcf_env.triggerAttack(time)
      this.velocitySig.setValueAtTime(Math.pow(vel,2),time)
    } else{
      this.frequency.value = freq
      this.env.triggerAttack()
      this.vcf_env.triggerAttack()
      this.velocitySig.value =Math.pow(vel,2) 
    }
  }
  triggerRelease = function(val, time=null){
    if(time){
      this.env.triggerRelease(time)
      this.vcf_env.triggerRelease(time)
    } else{
      this.env.triggerRelease()
      this.vcf_env.triggerRelease()
    }
  }
  triggerAttackRelease = function(val, vel=100, dur=0.01, time=null){
    //val = Tone.Midi(val).toFrequency()
    val = Theory.mtof(val)
    
    vel = vel/127
    if(time){
      this.frequency.setValueAtTime(val,time)
      this.env.triggerAttackRelease(dur,time)
      this.vcf_env.triggerAttackRelease(dur,time)
      this.velocitySig.setValueAtTime(Math.pow(vel,2),time)
    } else{
      this.frequency.value = val
      this.env.triggerAttackRelease(dur)
      this.vcf_env.triggerAttackRelease(dur)
      this.velocitySig.value =Math.pow(vel,2) 
    }
  }//attackRelease

  triggerRawAttack (freq, vel=1, time=null){
  	if(vel > 1) vel = 1
    if(time){
      this.frequency.setValueAtTime(freq,time)
      this.env.triggerAttack(time)
      this.vcf_env.triggerAttack(time)
      this.velocitySig.setValueAtTime(Math.pow(vel,2),time)
    } else{
      this.frequency.value = freq
      this.env.triggerAttack()
      this.vcf_env.triggerAttack()
      this.velocitySig.value =Math.pow(vel,2) 
    }
  }
  triggerRawRelease (time=null){
    if(time){
      this.env.triggerRelease(time)
      this.vcf_env.triggerRelease(time)
    } else{
      this.env.triggerRelease()
      this.vcf_env.triggerRelease()
    }
  }
  triggerRawAttackRelease (val, vel=1, dur=0.01, time=null){
    if(vel > 1) vel = 1
    if(time){
      this.frequency.setValueAtTime(val,time)
      this.env.triggerAttackRelease(dur,time)
      this.vcf_env.triggerAttackRelease(dur,time)
      this.velocitySig.setValueAtTime(Math.pow(vel,2),time)
    } else{
      this.frequency.value = val
      this.env.triggerAttackRelease(dur)
      this.vcf_env.triggerAttackRelease(dur)
      this.velocitySig.value =Math.pow(vel,2) 
    }
  }//attackRelease

  shapeVco(vcoNum, shape, amp=2, curve=1, isEven=1 ){
  	//console.log(vcoNum,shape, this.vco_1)
		let partials = []
	  for(let i=0;i<64;i++){
	    partials.push(1/Math.pow(i+1,curve)*16*(i%2<(2-isEven))*Math.abs(1-Math.sin(i*Math.PI*shape+Math.PI/2)*amp))
	  }
	  if(vcoNum === 0) {
	  	//console.log(shape, this.vco_1.partials)
	  	this.vco_1.partials = partials
	  	//console.log('post ', this.vco_1.partials)
	  }
	  else this.vco_2.partials = partials 
  }

  setHighpass(val){
  		this.hpf.frequency.value = val
  }
}

/********************
 * polyphony
 ********************/

export class Daisies extends MonophonicTemplate{
  constructor(gui = null, num = 8){
  	console.log('Daisies is obsolete: use Polyphony(Daisy) instead')
		}
}
