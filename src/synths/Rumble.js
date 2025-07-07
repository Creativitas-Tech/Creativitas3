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
import { MonophonicTemplate } from './MonophonicTemplate';
import {Parameter} from './ParameterModule.js'
import tightLayout from './layouts/tightLayout.json';
import paramDefinitions from './params/rumbleParams.js';

export class Rumble extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
    this.presets = RumblePresets
    this.isGlide = false
    this.name = "Rumble"
    console.log(this.name, " loaded, available preset: ", RumblePresets)
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
    setTimeout(()=>{this.loadPreset('default')}, 500);//for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
  }//constructor

  //envelopes
  triggerAttack (freq, amp, time=null){
    freq = Tone.Midi(freq).toFrequency()
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
    freq = Tone.Midi(freq).toFrequency()
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

  // //GUI
  // initGui(gui = this.gui) {
  //   this.gui = gui
  //   let ccolor = [200,200,0]
  //   this.x = 0
  //   this.y = 0

  //    // VCO Labels
  //   const vco_knob_x = [5, 15, 25];
  //   this.vco1_label = this.createLabel('vco1', vco_knob_x[0], 5);
  //   this.vco2_label = this.createLabel('vco2', vco_knob_x[1], 5);
  //   this.vco3_label = this.createLabel('vco3', vco_knob_x[2], 5);

  //   // Additional Labels
  //   // this.oct_label = this.createLabel('octave', 6, 20, 1.5);
  //   // this.detune_label = this.createLabel('detune', 6, 50, 1.5);
  //   // this.gain_label = this.createLabel('gain', 6, 80, 1.5);

  //   // VCO Knobs
  //   // Note: You'll need to adjust callback functions to fit your class methods for setting values
  //   this.vco1_oct_knob = this.gui.Knob({label:'octave', 
  //     x:vco_knob_x[0], y:20, min:-2, max:1, size:0.75, accentColor:[200,50,0], border:2,
  //     callback:(x)=> {this.vco_freq_1.value = calcFreq(x,this.vco1_detune_knob.value)}})
  //   this.vco1_detune_knob = this.gui.Knob({label:'detune', 
  //     x:vco_knob_x[0], y:50, min:-.5, max:.5, size:0.75, accentColor:[200,50,0], border:2,
  //     callback:(x)=>this.vco_freq_1.value = calcFreq(this.vco1_oct_knob.value,x)});
  //   this.vco1_gain_knob = this.gui.Knob({label:'gain', 
  //     x:vco_knob_x[0], y:80, min:0, max:1, size:0.75, accentColor:[200,50,0], border:2,
  //     mapto: this.vco_gain_1.factor });

  //   const calcFreq = function(oct,detune){
  //     return Math.pow(2,Math.floor(oct)) + Math.pow(detune,2)*Math.sign(detune)
  //   }
    

  //   this.vco2_oct_knob = this.createKnob('octave', vco_knob_x[1], 20, -2, 1, 0.75, [200,50,0], (x)=>{this.vco_freq_2.value = calcFreq(x,this.vco2_detune_knob.value)});
  //   this.vco2_detune_knob = this.createKnob('detune', vco_knob_x[1], 50, -.5, .5, 0.75, [50,150,100],(x)=>this.vco_freq_2.value = calcFreq(this.vco2_oct_knob.value,x));
  //   this.vco2_gain_knob = this.createKnob('gain', vco_knob_x[1], 80, 0, 1, 0.75, [200,50,0], (x)=>this.vco_gain_2.factor.value = x );

  //   this.vco3_oct_knob = this.createKnob('octave', vco_knob_x[2], 20, -2, 1, 0.75, [200,50,0], (x)=>this.vco_freq_3.value = calcFreq(x,this.vco3_detune_knob.value));
  //   this.vco3_detune_knob = this.createKnob('detune', vco_knob_x[2], 50, -.5, .5, 0.75, [50,150,100],(x)=>this.vco_freq_3.value = calcFreq(this.vco3_oct_knob.value,x));
  //   this.vco3_gain_knob = this.createKnob('gain', vco_knob_x[2], 80, 0, 1, 0.75, [200,50,0], (x)=>this.vco_gain_3.factor.value = x );


  //   // VCF and VCA Knobs
  //   this.vcf_cutoff_knob = this.createKnob('cutoff', 45, 28, 2, 10000, 1.75, [200,0,200], (x)=>this.cutoffSig.value = x);
  //   this.keytracking_knob = this.createKnob('keyTracking', 45, 75, 0, 1, .75, [200,0,200], (x)=>this.keyTracking.factor.value = x);
  //   this.vcf_env_depth_knob = this.createKnob('vcf env', 55, 75, 0, 5000, .75, [200,0,200], (x)=>this.vcf_env_depth.factor.value = x);
  //   this.vcf_res_knob = this.createKnob('Q', 35, 75, 0, 20, 0.75, [200,0,200], (x)=>this.vcf.Q.value = x);
    
  //   this.attack_knob = this.createKnob('a', 68, 55, 0.000001, .5, .35, [0,0,200], x=>this.env.attack = x);
  //   this.decay_knob = this.createKnob('d', 76, 55, 0, 10, .35, [0,0,200], x=>this.env.decay = x);
  //   this.sustain_knob = this.createKnob('s', 84, 55, 0, 1, .35, [0,0,200], x=>this.env.sustain = x);
  //   this.release_knob = this.createKnob('r', 92, 55, 0, 20, .35, [0,0,200], x=>this.env.release = x);

  //   this.vcf_attack_knob = this.createKnob('vcf a', 68, 80, 0.001, .5, .35, [0,0,200], x=>this.vcf_env.attack = x);
  //   this.vcf_decay_knob = this.createKnob('vcf d', 76, 80, 0, 10, .35, [0,0,200], x=>this.vcf_env.decay = x);
  //   this.vcf_sustain_knob = this.createKnob('vcf s', 84, 80, 0, 1, .35, [0,0,200], x=>this.vcf_env.sustain = x);
  //   this.vcf_release_knob = this.createKnob('vcf r', 92, 80, 0, 20, .35, [0,0,200], x=>this.vcf_env.release = x);
    
  //   this.lfo_knob = this.createKnob('lfo', 60, 25, 0, 20, .35, [0,0,200], x=>this.lfo.frequency.value = x);
  //   this.pwm_knob = this.createKnob('pwm', 68, 25, 0, .9, .35, [0,0,200], x=>{this.setPwmDepth(x, x*.8,x*.6)});
  //   this.clip_knob = this.createKnob('distortion', 82, 25, 0, 1, .35, [0,0,200], x=>{this.clip.factor.value = x});
  //   this.clip_mix = this.createKnob('mix', 90, 25, 0, 1, .35, [0,0,200], x=>{this.direct_level.factor.value = x});
  //   // Repeat for other knobs...
  //   this.gui_elements = [this.vco1_label, this.vco2_label, this.vco3_label, 
  //      //this.oct_label, this.detune_label, this.gain_label, 
  //     this.vco1_oct_knob, this.vco1_detune_knob, this.vco1_gain_knob,
  //     this.vco2_oct_knob, this.vco2_detune_knob, this.vco2_gain_knob,
  //     this.vco3_oct_knob, this.vco3_detune_knob, this.vco3_gain_knob, 
  //     this.vcf_cutoff_knob, this.vcf_res_knob, this.keytracking_knob, this.vcf_env_depth_knob ,
  //     this.attack_knob,this.decay_knob,this.sustain_knob,this.release_knob,
  //     this.vcf_attack_knob,this.vcf_decay_knob,this.vcf_sustain_knob,this.vcf_release_knob,
  //     this.lfo_knob, this.pwm_knob, this.clip_knob, this.clip_mix
  //     ]
	// }//gui

	// createLabel(label, x, y, size = 1, border = 1, borderRadius = 0.01) {
  //   return this.gui.Text({
  //     label, x: x + this.x, y: y + this.y,
  //     size, border, borderRadius
  //   });
  // }



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
