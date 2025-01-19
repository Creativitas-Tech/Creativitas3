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

signal inputs:
- frequency (signal, Hz)
- frequency CV (multiplication factor)
methods:
- connect
- panic()
- setFrequency
- setDetune
-  setResonance
-  setCutoff
-  setCutoffCV
-  setHighpass 
-  setKeyTracking 
-  setFilterEnvDepth = function(val){this.voiceSettings["vcf_env_depth.factor"] =  val }
-  setPanning(val)
-  setPulseWidth (num,val)
-  setVcoGain(num,val)
-  setVcoType(num, type)
-  setLfoFrequency(val)
-  setTremoloDepth(val)
-  setVibratoDepth(val)
- setADSR
- setHighpass(val)

properties:
- 

CC control of:
- setCutoffCV
- setPulseWidth
- setADSR
- setFilterADSR
- setDecayCV
- setHighpass
- setDetune
- setLfoFrequency

Main List of Parameters & how to set them:
- detune: setDetune
- detune_cv_depth.factor: setDetuneCV
- resonance: setResonance
- resonance_cv_depth.factor: setResonanceCV
- cutoff: setCutoff
- cutoff_cv_depth.factor: setCutoffCV
- highpass_freq: setHighpass 
- key_tracking_depth: setKeyTracking 
- vcf_env_depth: setFilterEnvDepth = function(val){this.voiceSettings["vcf_env_depth.factor"] =  val }
- panning: setPanning(val)
- pulse_width[vco_1,vco_2]: setPulseWidth (num,val)
- vco_gain[vco_1,vco_2]: setVcoGain(num,val)
- vco_type[vco_1,vco_2]: setVcoType(num, type)
- lfo_frequency: setLfoFrequency(val)
- lfo_frequency_cv_depth.factor: setLfoFrequencyCV(val)
- lfo_tremolo_cv_depth.factor: setTremoloCV(val)
- lfo_tremolo_depth: setTremoloDepth(val)
- lfo_vibrato_cv_depth.factor: setVibratoCV(val)
- lfo_vibrato_depth: setVibratoDepth(val)
- env

- filter_env: same as env

*/

import p5 from 'p5';
import * as Tone from 'tone';
import DaisiesPresets from './synthPresets/DaisiesPresets.json';
import { MonophonicTemplate } from './MonophonicTemplate';

export class Daisy extends MonophonicTemplate{
	constructor(){
		super()
		this.presets = DaisiesPresets
		this.name = 'Daisy'

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
		this.output = new Tone.Multiply(.25)
		this.vcf.connect(this.lfo_vca)
		this.lfo_vca.connect(this.vca)
		this.lfo_vca_constant.connect(this.lfo_vca.factor)
		this.vca.connect(this.panner)
		this.panner.connect(this.output)

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
		this.keyTracking = new Tone.Multiply(.1)
		this.frequency.connect(this.keyTracking)
		this.keyTracking.connect(this.vcf.frequency)
		this.vcf_env = new Tone.Envelope()
		this.vcf_env_depth = new Tone.Multiply()
		this.vcf_env.connect(this.vcf_env_depth)
		this.vcf_env_depth.connect(this.vcf.frequency)

		this.lfo = new Tone.Oscillator(.5).start()
		this.vca_constant = new Tone.Signal(1)
		this.amp_lfo_depth = new Tone.Multiply(0)
		this.lfo.connect(this.amp_lfo_depth)
		this.amp_lfo_depth.connect(this.lfo_vca.factor)
		this.pitch_lfo_depth = new Tone.Multiply(0)
		this.lfo.connect(this.pitch_lfo_depth)
		this.lfo.connect(this.crossfade_lfo_depth)
		this.frequency_constant = new Tone.Signal(1)
		this.pitch_lfo_depth.connect(this.frequency_scalar.factor)
		this.frequency_constant.connect(this.frequency_scalar.factor)

		//no PWM to prevent errors when vco is not set to pulse
		this.pwm_lfo_depth = new Tone.Multiply()
		this.lfo.connect(this.pwm_lfo_depth)

		//this.pwm_lfo_depth.connect(this.vco_1.width)
		//this.pwm_lfo_depth.connect(this.vco_2.width)

		//for autocomplete
		this.autocompleteList = ["test", "triggerAttack"];
  }

  //TRIGGER METHODS
  triggerAttack = function(val, vel=100, time=null){
  	let freq = Tone.Midi(val).toFrequency()
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
    val = Tone.Midi(val).toFrequency()
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
  	if(this.super !== null){
  		this.super.hpf.frequency.value = val
  	}
  }

  initGui(gui, x=10,	y=10){
  	// if(this.gui_elements.length > 0){
  	// 	console.log("initGui is called when a synth is created.\n Call synth.showGui() to see it.")
  	// 	return;
  	// }
  	this.gui = gui
  	this.x = x
  	this.y = y
  	this.vco_mix = this.createKnob('vco_mix', 0, 5, 0, 1, 0.75, [200,50,0],x=>this.crossfade_constant.value= x);
  	this.detune = this.createKnob('detune', 10, 5, 1, 2, 0.5, [200,50,0],x=>this.detune_scalar.factor.value = x);
  	this.vco1_shape_knob = this.createKnob('shape1', 18, 5, 0,1, 0.5, [200,50,0],x=>this.shapeVco(0, x*2+1));
  	this.vco2_shape_knob = this.createKnob('shape2', 25, 5, 0,1, 0.5, [200,50,0],x=>this.shapeVco(1, x*2+1));
  	
  	this.cutoff = this.createKnob('cutoff', 40, 5, 0, 10000, 1, [200,50,0],x=>this.cutoffSig.value = x);
  	this.vcf_env_knob = this.createKnob('vcf env', 50, 5, 0, 5000, 0.75, [200,50,0],x=>this.vcf_env_depth.factor.value = x);
  	this.vcf_Q_knob = this.createKnob('Q', 60, 5, 0, 20, 0.5, [200,50,0],x=>this.vcf.Q.value = x);
  	this.keyTracking_knob = this.createKnob('key vcf', 70, 5, 0, 1, 0.5, [200,50,0],x=>this.keyTracking.factor.value = x);
  	this.highpass_knob = this.createKnob('hpf', 80, 5, 10, 3000, 0.5, [200,50,0],x=>this.setHighpass(x));
  	this.attack_knob = this.createKnob('a', 5, 70, 0.005, .5, 0.5, [200,50,0],x=>this.env.attack = x);
  	this.decay_knob = this.createKnob('d', 13, 70, 0.01, 10, 0.5, [200,50,0],x=>this.env.decay = x);
  	this.sustain_knob = this.createKnob('s', 21, 70, 0, 1, 0.5, [200,50,0],x=>this.env.sustain = x);
  	this.release_knob = this.createKnob('r', 29, 70, 0, 20, 0.5, [200,50,0],x=>this.env.release = x);
  	this.vcf_attack_knob = this.createKnob('a', 5, 45, 0.005, .5, 0.5, [200,50,0],x=>this.vcf_env.attack = x);
  	this.vcf_decay_knob = this.createKnob('d', 13, 45, 0.01, 10, 0.5, [200,50,0],x=>this.vcf_env.decay = x);
  	this.vcf_sustain_knob = this.createKnob('s', 21, 45, 0, 1, 0.5, [200,50,0],x=>this.vcf_env.sustain = x);
  	this.vcf_release_knob = this.createKnob('r', 29, 45 , 0, 20, 0.5, [200,50,0],x=>this.vcf_env.release = x);
  	this.lfo_freq_knob = this.createKnob('lfo', 45, 65, 0, 20, 1, [200,50,0],x=>this.lfo.frequency.value = x);
  	this.lfo_vibrato = this.createKnob('vibrato', 55, 65, 0, .1, 0.5, [200,50,0],x=>this.pitch_lfo_depth.factor.value = x);
  	this.lfo_tremolo = this.createKnob('tremolo', 63, 65, 0, 1, 0.5, [200,50,0],x=>this.amp_lfo_depth.factor.value = x);
  	this.lfo_blend_knob = this.createKnob('blend', 71, 65, 0, 1, 0.5, [200,50,0],x=>this.crossfade_lfo_depth.factor.value = x);
  	this.vcfEnvText = this.gui.Text({label:'vcf', x:10, y:55, border:0.1})
  	this.vcaEnvText = this.gui.Text({label:'vca', x:10, y:80, border: 0.1})
  	//this.pan_knob = this.createKnob('pan', 85, 65, 0, 1, 0.5, [200,50,0],x=>this.crossfade_lfo_depth.factor.value = x);
  	
  	this.pan_knob = this.createKnob('pan', 80, 65, 0, 1, 0.5, [200,50,0],x=>{this.super.pan(x)});


  	this.gui_elements = [ this.vco_mix, this.detune, this.cutoff, this.vcf_env_knob, this.vcf_Q_knob, this.keyTracking_knob, 
  		this.highpass_knob, 
  		this.attack_knob, this.decay_knob, this.sustain_knob, this.release_knob, this.vcf_attack_knob, this.vcf_decay_knob, this.vcf_sustain_knob, this.vcf_release_knob, this.lfo_freq_knob, this.lfo_vibrato, this.lfo_tremolo, this.lfo_blend_knob
  		, this.pan_knob, this.vco1_shape_knob, this.vco2_shape_knob,
  		this.vcfEnvText,this.vcaEnvText
  		];
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
