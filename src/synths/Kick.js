/*
Kick

vco->shaper_gain->waveShaper->vca->output
env->pitch_drop->vco.frequency

basic kick drum voice:
methods:
trigger(time)

properties:

*/

import p5 from 'p5';
import * as Tone from 'tone';

export class Kick{
  constructor(freq=60,decay=.4,tone=.2) {
    this.vco = new Tone.Oscillator().start()
    this. shaper_gain = new Tone.Multiply(tone)
    this. waveShaper = new Tone.WaveShaper((x)=>{
      return Math.tanh(x*16) *.9
    })
    this.vca = new Tone.Multiply()
    this.output = new Tone.Multiply(.5)
    //
    this.pitch_env = new Tone.Envelope()
    this.pitch_env_depth = new Tone.Multiply()
    this.frequency = new Tone.Signal(freq)
    this.env = new Tone.Envelope()
    //
    this.vco.connect( this.vca)
    this.vca.connect( this.shaper_gain)
    this.shaper_gain.connect( this.waveShaper)
    this.waveShaper.connect( this.output)
    //
    this.pitch_env.connect( this.pitch_env_depth)
    this.pitch_env_depth.connect( this.vco.frequency)
    this.frequency.connect( this.vco.frequency)
    this.env.connect(this.vca.factor)
    //
    this.env.decay = decay
    this.env.release = decay
    this.env.sustain = 0
    this.env.attack = .03
    //
    this.pitch_env.attack = 0.00
    this.pitch_env.decay = 1
    this.pitch_env.sustain = 0
    this.pitch_env.release = .1
  }
  trigger = function(time){
    if(time){
      this.env.triggerAttackRelease(0.01, time)
      this.pitch_env.triggerAttackRelease(0.01,time)
    }else {
      this.env.triggerAttackRelease(0.01)
      this.pitch_env.triggerAttackRelease(0.01)
    }
  }
  connect(destination) {
    if (destination.input) {
      this.output.connect(destination.input);
    } else {
      this.output.connect(destination);
    }
  }

  disconnect(destination) {
    if (destination.input) {
      this.output.disconnect(destination.input);
    } else {

      this.output.disconnect(destination);
    }
  }
}
