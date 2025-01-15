/*
Resonator

Tuned delay line for Karplus-Strong style synthesis
* input->delay_1&2->hpf->lpf->vca->output
* one envelope for cutoff and vca control
* env_depth, hpf_env_depth, lpf_env_depth
* direct control of vca level (default:1)

methods:
- setFrequency(Hz): sets frequnecy of delay line in Hz
- setCutoff(freq, time) sets freq of lpf
- connect(destination)
- setADSR()

properties:
- env_depth.factor.value (env controls vca)
- direct.value - direct output level
*/

import p5 from 'p5';
import * as Tone from 'tone';

export class Resonator{
	constructor(gui = null, color = [200,200,200]){
      this.gui = gui

      this.input = new Tone.Multiply(1)
      this.delay_1 = new Tone.LowpassCombFilter({resonance:.95,dampening:10000})
      this.delay_2 = new Tone.LowpassCombFilter({resonance:.95,dampening:10000})
      this.hpf = new Tone.Filter({frequency: 20, type:'highpass', Q: 0})
      this.lpf = new Tone.Filter({frequency: 10000, type:'lowpass', Q: 0})
      this.vca = new Tone.Multiply()
      this.output = new Tone.Multiply(1)
      //control
      this.env = new Tone.Envelope()
      this.hpf_cutoff = new Tone.Signal(20)
      this.lpf_cutoff = new Tone.Signal(20000)
      this.hpf_env_depth = new Tone.Multiply()
      this.lpf_env_depth = new Tone.Multiply()
      this.delayTime = new Tone.Signal(.1)
      this.delayTimeScalar = new Tone.Multiply(1)
      this.detune = new Tone.Multiply(1)
      this.env_depth = new Tone.Multiply(1)
      this.direct = new Tone.Signal(1)
      //audio connections
      this.input.connect(this.delay_1)
      this.input.connect(this.delay_2)
      this.delay_1.connect(this.hpf)
      this.delay_2.connect(this.hpf)
      this.hpf.connect(this.lpf)
      this.lpf.connect(this.vca)
      this.vca.connect(this.output)
      //delay
      this.delayTime.connect( this.delayTimeScalar)
      this.delayTimeScalar.connect( this.delay_1.delayTime)
      this.delayTimeScalar.connect( this.detune)
      this.detune.connect( this.delay_2.delayTime)
      //filter cutoffs
      this.hpf_cutoff.connect( this.hpf.frequency)
      this.lpf_cutoff.connect( this.lpf.frequency)
      this.env.connect(this.hpf_env_depth.factor)
      this.env.connect(this.hpf_env_depth.factor)
      this.hpf_env_depth.connect( this.hpf.frequency)
      this.lpf_env_depth.connect( this.lpf.frequency)
      //vca
      this.env.connect(this.env_depth)
      this.env_depth.connect(this.vca.factor)
      this.direct.connect(this.vca.factor)
	}
  setCutoff = function(val,time=null){
    if(time){
      this.lpf_cutoff.setValueAtTime(val, time)
      //this.lpf.frequency.setValueAtTime(val + (this.bandwidth*val)/2, time)
      //this.hpf.frequency.setValueAtTime(val - (this.bandwidth*val)/2, time)
    } else {
      this.lpf_cutoff.value = val
      //this.lpf.frequency.value = val + (this.bandwidth*val)/2
      //this.lpf.frequency.value = val - (this.bandwidth*val)/2
    }
  }
  setFrequency = function(val,time=null){
    if(time){
      this.delayTime.setValueAtTime(1/val, time)
    } else this.delayTime.value = 1/val
  }
  setFeedback = function(val,time=null){
    val = val<0 ? 0 : val>0.9999 ? 0.9999 : val
    if(time){
      this.delay_1.resonance.setValueAtTime(val, time)
      this.delay_2.resonance.setValueAtTime(val, time)
    } else {
      this.delay_1.resonance.value = val
      this.delay_2.resonance.value = val
    }
  }
  setADSR(a,d,s,r){
    this.env.attack = a>0.001 ? a : 0.001
    this.env.decay = d>0.01 ? d : 0.01
    this.env.sustain = Math.abs(s)<1 ? s : 1
    this.env.release = r>0.01 ? r : 0.01
  }
  connect(destination) {
    this.output.connect(destination);
  }
}

  