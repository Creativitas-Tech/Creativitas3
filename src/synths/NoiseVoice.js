/*
NoiseVoice

noise->gain->waveshaper->hpf->lpf->vca->output

basic noise oscillator with:
* integrated HPF and LPF
* VCA w/ env
* direct output level
* gui

methods:
- gui(x=2,y=2,ccolor=[200,200,0])
- setCutoff(freq, 'both', time) sets freq of both filters based on bandwidth
- setResonance(val, 'both', time) sets Q of both filters of 'hpf' 'lpf'
- setbandwidth(factor, 'both', time) sets a factor to scale the cutoff
- setADSR()
- triggerAttack(val, time=null) val sets cutoff
- triggerRelease (time=null)
- triggerAttackRelease (val, dur=0.01, time=null)

properties:
- env_depth.factor.value (env controls vca)
- hpf.frequency, Q
- lpf.frequency, Q
- gain.factor (into waveshaper)
- env ADSR

*/

import p5 from 'p5';
import * as Tone from 'tone';

export class NoiseVoice{
	constructor(gui = null){
      this.gui = gui

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
      //control
      this.env = new Tone.Envelope({
        attack:0.01, decay:.1, sustain:0,release:.1
      })
      this.velocity = new Tone.Signal(1)
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
      this.env.connect(this.velocity_depth)
      this.velocity.connect(this.velocity_depth.factor)
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
      this.setCutoff(val, time)
    } else{
      this.env.triggerAttack()
      this.setCutoff(val)
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
      this.setCutoff(val, time)
    } else{
      this.env.triggerAttackRelease(dur)
      this.setCutoff(val)
    }
  }//attackRelease
  //GUI
  initGui (x=2,y=2,ccolor=[200,200,0], gui = null){
    if(gui) this.gui = gui
    this.x = x
    this.y = y
    this.cutoff_knob = this.gui.Knob({
      label:'cutoff', mapto: this.baseCutoff,
      min:10, max:15000, curve:2,
      x:0+this.x, y:0+this.y, size:.25, accentColor: ccolor
    })
    this.resonance_knob = this.gui.Knob({
      label:'Q', callback: (x)=> this.setResonance(x),
      min:0, max:30, curve:1.5,
      x:0+this.x, y:15+this.y, size:.25, accentColor: ccolor
    })
    this.bandwidth_knob = this.gui.Knob({
      label:'width', callback: (x)=>this.setBandwidth(x),
      min:-10, max:10, curve:2,
      x:0+this.x, y:30+this.y, size:.25, accentColor: ccolor
    })
    this.hpf_env_knob = this.gui.Knob({
      label:'hpf env', mapto: this.hpf_env_depth.factor,
      min:0, max:5000, curve:2,
      x:0+this.x, y:45+this.y, size:.2, accentColor: ccolor
    })
    this.lpf_env_knob = this.gui.Knob({
      label:'lpf env', mapto: this.lpf_env_depth.factor,
      min:0, max:5000, curve:2,
      x:0+this.x, y:60+this.y, size:.2, accentColor: ccolor
    })
  }
  setADSR(a,d,s,r){
    this.env.attack = a>0.001 ? a : 0.001
    this.env.decay = d>0.01 ? d : 0.01
    this.env.sustain = Math.abs(s)<1 ? s : 1
    this.env.release = r>0.01 ? r : 0.01
  }
  position(x, y) {
    // Update the positions of GUI elements
    this.cutoff_knob.x = 0 + x;
    this.cutoff_knob.y = 0 + y;

    this.resonance_knob.x = 0 + x;
    this.resonance_knob.y = 15 + y;

    this.bandwidth_knob.x = 0 + x;
    this.bandwidth_knob.y = 30 + y;

    this.hpf_env_knob.x = 0 + x;
    this.hpf_env_knob.y = 45 + y;

    this.lpf_env_knob.x = 0 + x;
    this.lpf_env_knob.y = 60 + y;
  }
  connect(destination) {
    this.vca.connect(destination);
  }
}