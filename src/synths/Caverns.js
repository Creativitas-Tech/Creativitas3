/*
Caverns

Cascaded Delays
* input-> all DelayOps -> output
* delays are cascaded to all following delays
* DelayOp: input->hpf->feedbackDelay->drive->waveShaper->lpf->output

methods:
- connect
- setDelayTime
- setFeedback: sets internal fb & feedforward to following delays
- setLowpass
- setHighpass
- setDrive: input into soft clipper in delayOp
- setPanning: uses sine wave by default

properties:
- 
*/
import p5 from 'p5';
import * as Tone from 'tone';
import { DelayOp } from './DelayOp.js';

export class Caverns{
  constructor(color = [200,200,200]){
      this.input = new Tone.Multiply(1)
      this.delay = []
      for(let i=0;i<8;i++) this.delay.push(new DelayOp())
      this.cross = []
      for(let i=0;i<8;i++) this.cross.push(new Tone.Multiply())
      this.output = new Tone.Multiply(0.125)
      //connections
      for(let i=0;i<8;i++) {
        this.input.connect(this.delay[i].input)
        this.delay[i].connect(this.output)
        for(let j=i+1;j<8;j++) this.delay[i].connect(this.cross[j])
        //this.delay[i].connect(this.cross[i])
        this.cross[i].connect(this.delay[i].input)
      }
  }
  connect(destination) {
    if (destination.input) {
      this.output.connect(destination.input);
    } else {
      this.output.connect(destination);
    }
  }
  setDelayTime = function(val){
    for(let i=0;i<8;i++) this.delay[i].delayTime.value = val*(1.25**i)
  }
  setFeedback = function(val){
    for(let i=0;i<8;i++) {
      this.delay[i].delay.feedback.value = val
      //this.cross[i].factor.value = val
    }
  }
  setCross = function(val){
    for(let i=0;i<8;i++) {
      //this.delay[i].delay.feedback.value = val
      this.cross[i].factor.value = val
    }
  }
  setLowpass = function(val){
    for(let i=0;i<8;i++) {
      this.delay[i].lpf.frequency.value = val
    }
  }
  setHighpass = function(val){
    for(let i=0;i<8;i++) {
      this.delay[i].hpf.frequency = val
    }
  }
  setDrive = function(val){
    for(let i=0;i<8;i++) {
      this.delay[i].drive.factor.value = val
    }
  }
  setPanning = function(val){
    for(let i=0;i<8;i++) {
      this.delay[i].panner.pan.rampTo( Math.sin(i*val),.1)
    }
  }
}

