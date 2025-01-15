/*
Sympathy

Tuned delay lines for Karplus-Strong style sympathetic strings
* Individual string:
  * input->delay->vca->output
* Mixer:
  * input->hpf->EQ->vca->output
* Parameters:
  * numStrings (constructor)
  * frequencies: array
  * gains: array

methods:
- setFrequency(Hz): sets frequencies of delay lines in Hz
- setHighpass(freq, time) sets freq of hpf
- setEQ(low,mid,hi): note gain in dB
- seqEQBands(low,hi) set hi and low crossover
- connect(destination)

properties:
*/

import * as Tone from 'tone';

export class SympathyString{
	constructor(frequency = 100, amplitude = 1){
      this.input = new Tone.Multiply(1)
      this.delay = new Tone.LowpassCombFilter({resonance:.95,dampening:10000})
    
      this.vca = new Tone.Multiply(amplitude)
      this.output = new Tone.Multiply(1)
      //control
      this.delayTime = new Tone.Signal(.1)
      this.delayTimeScalar = new Tone.Multiply(1)
      //audio connections
      this.input.connect(this.delay)
      this.delay.connect(this.vca)
      this.vca.connect(this.output)
      //delay
      this.delayTime.connect( this.delayTimeScalar)
      this.delayTimeScalar.connect( this.delay.delayTime)
	}
  setFrequency = function(val,time=null){
    if(time){
      this.delayTime.setValueAtTime(1/val, time)
    } else this.delayTime.value = 1/val
  }
  setFeedback = function(val,time=null){
    val = val<0 ? 0 : val>0.9999 ? 0.9999 : val
    if(time){
      this.delay.resonance.setValueAtTime(val, time)
    } else {
      this.delay.resonance.value = val
    }
  }
  connect(destination) {
    this.output.connect(destination);
  }
}

export class Sympathy{
  constructor(numStrings = 6, frequencies = [100,200,300,400,500,600]){
      this.numStrings = numStrings
      this.frequencies = frequencies
      this.input = new Tone.Multiply(1)
      this.hpf = new Tone.Filter({frequency: 20, type:'highpass', Q: 0})
      this.eq = new Tone.EQ3()
      this.vca = new Tone.Multiply(1)
      this.output = new Tone.Multiply(1)
      //control
      this.hpf_cutoff = new Tone.Signal(20)
      //audio connections
      //this.input.connect(this.hpf)
      this.hpf.connect(this.eq)
      this.eq.connect(this.vca)
      this.vca.connect(this.output)
      //strings
      this.strings = []
      this.detune = 0

      //make sure frequencies is long enough
      while(this.frequencies.length<this.numStrings) this.frequencies.push(this.frequencies[0])
      
      for(let i=0;i<this.numStrings;i++) {
        this.strings.push(new SympathyString(frequencies[i],1-(frequencies[i]/5000)))
        this.input.connect(this.strings[i].input)
        this.strings[i].output.connect(this.hpf)
      }
  }
  setFrequencies = function(vals,time=null){
    if(vals.length != this.numStrings){
      console.log("incorrect freq array size, should be ", this.numStrings)
      return
    }
    if(time){
      for(let i=0;i<this.numStrings;i++) {
        this.frequencies[i] = vals[i] * (1 - (Math.random()-.5)*this.detune)
        this.strings[i].setFrequency(this.frequencies[i], time)
      }
    } else {
      for(let i=0;i<this.numStrings;i++) {
        this.frequencies[i] = vals[i] * (1 - (Math.random()-.5)*this.detune)
        this.strings[i].setFrequency(this.frequencies[i])
      }
    }
  }
  setDetune = function(val){
    this.detune = val
    this.setFrequencies(this.frequencies)
  }
  setFeedback = function(val,time=null){
    val = val<0 ? 0 : val>0.9999 ? 0.9999 : val
    if(time){
      for(let i=0;i<this.numStrings;i++) this.strings[i].setFeedback(val, time)
    } else {
      for(let i=0;i<this.numStrings;i++) this.strings[i].setFeedback(val)
    }
  }
  setGains = function(vals,time=null){
    if(vals.length != this.numStrings){
      console.log("incorrect gains array size, should be ", this.numStrings)
      return
    }
    if(time){
      for(let i=0;i<this.numStrings;i++) this.strings[i].vca.factor.exponentialRampToValueAtTime(vals[i],.1)
    } else {
      for(let i=0;i<this.numStrings;i++) this.strings[i].vca.factor.value = vals[i]
    }
  }
  setHighpass = function(val){this.hpf.frequency.value = val }
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
  connect(destination) {
    this.output.connect(destination);
  }
}