/*
DelayOp

Delays
* input->hpf->feedbackDelay->drive->waveShaper->lpf->panner->output
* 
* 

methods:


properties:

- 
*/

import p5 from 'p5';
import * as Tone from 'tone';

export class DelayOp{
  constructor(){
    //signal
    this.input = new Tone.Multiply(1)
    this.hpf = new Tone.OnePoleFilter({type:'highpass',frequency:100})
    this.delay = new Tone.FeedbackDelay()
    this.drive = new Tone.Multiply(0.8)
    this. waveShaper = new Tone.WaveShaper((x)=>{
      return Math.tanh(x*16) *.9
    })
    this.lpf = new Tone.Filter({frequency:2000})
    this.panner = new Tone.Panner(0)
    this.output = new Tone.Multiply(1)
    //mod
    this.delayTime = new Tone.Signal(.1)
    //connections
    this.input.connect(this.hpf)
    this.hpf.connect(this.delay)
    this.delay.connect(this.drive)
    this.drive.connect(this.waveShaper)
    this.waveShaper.connect(this.lpf)
    this.lpf.connect(this.panner)
    this.panner.connect(this.output)
    //mod connections
    this.delayTime.connect(this.delay.delayTime)
  }
  connect(destination) {
    if (destination.input) {
      this.output.connect(destination.input);
    } else {
      this.output.connect(destination);
    }
  }
}