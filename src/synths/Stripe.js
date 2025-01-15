/*
Stripe.js

output channel strip
input=>eq->gain->output, gain->send

methods:
- setEQ(low,mid,hi): note gain in dB
- seqEQBands(low,hi) set hi and low crossover
- setSendLevel()
- setGain()
- connect()
*/

import p5 from 'p5';
import * as Tone from 'tone';

export class Stripe{
	constructor(){
		this.input = new Tone.Multiply(1)
		this.eq = new Tone.EQ3()
		this.gain = new Tone.Multiply(1)
		this.send = new Tone.Multiply(0)
		this.output = new Tone.Multiply(1)

		this.input.connect(this.eq)
		this.eq.connect(this.gain)
		this.gain.connect(this.send)
		this.gain.connect(this.output)
	}
	setEQ(low,mid,hi){
		this.eq.high.value = hi
		this.eq.mid.value = mid
		this.eq.low.value = low
	}
	setEQBands(low,hi){
		if(low < 10 || hi < 10){
			console.log('EQ bands are in Hz')
			return;
		}
		this.eq.highFrequency.value = hi
		this.eq.lowFrequency.value = low
	}
	setSendLevel(val){
		this.send.factor.value = val
	}
	setGain(val){
		this.gain.factor.value = val
	}
	connect(destination) {
		if (destination.input) {
		  this.output.connect(destination.input);
		} else {
		  this.output.connect(destination);
    }
  }
}