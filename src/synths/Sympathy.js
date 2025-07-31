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
import { EffectTemplate } from './EffectTemplate';
import { Parameter } from './ParameterModule.js';
// import ReverbPresets from './synthPresets/ReverbPresets.json';
import layout from './layouts/EffectLayout.json';
import {paramDefinitions} from './params/sympathyParams.js';


export class SympathyString{
	constructor(frequency = 100, amplitude = 1){

      this.delay = new Tone.LowpassCombFilter({resonance:.95,dampening:10000})
    
      this.output = new Tone.Gain(amplitude)
      //control
      this.delayTime = new Tone.Signal(.1)
      this.delayTimeScalar = new Tone.Multiply(1)
      //audio connections
      this.delay.connect(this.output)
      //delay
      this.delayTime.connect( this.delayTimeScalar)
      this.delayTimeScalar.connect( this.delay.delayTime)
	}
  setFrequency = function(val,time=null){
    //console.log(val,time)
    if(time){
      this.delayTime.linearRampToValueAtTime(1/val, time+0.001)
    } else this.delayTime.rampTo( 1/val, 0.001)
  }
  setFeedback = function(val,time=null){
    val = val<0 ? 0 : val>0.9999 ? 0.9999 : val
    if(time){
      this.delay.resonance.setValueAtTime(val, time)
    } else {
      this.delay.resonance.rampTo( val, 0.02 )
    }
  }
  setDamping = function(val){
    this.delay.dampening = val
  }
  connect(destination) {
    this.output.connect(destination);
  }
}

export class Sympathy extends EffectTemplate{
  constructor(numStrings = 6, frequencies = [100,200,300,400,500,600]){
      super();
      this.presets = {}
      this.synthPresetName = "SympathyPresets"
      this.accessPreset()
      this.name = "Sympathy";
      this.layout = layout;
      this.backgroundColor = [75,0,100]
      this.curDelayTime = .1

      this.numStrings = numStrings
      this.frequencies = frequencies
      this.input = new Tone.Gain(1)
      this.hpf = new Tone.Filter({frequency: 20, type:'highpass', Q: 0})
      //this.eq = new Tone.EQ3()
      //this.vca = new Tone.Multiply(1)
      this.output = new Tone.Multiply(1)
      //control
      this.hpf_cutoff = new Tone.Signal(20)
      //audio connections
      //this.input.connect(this.hpf)
      this.hpf.connect(this.output)
      //this.eq.connect(this.vca)
      //this.vca.connect(this.output)
      //strings
      this.strings = []
      this.detuneAmount = 0
      this.tiltAmount = 0
      this.gainAmount = 1

      //make sure frequencies is long enough
      while(this.frequencies.length<this.numStrings) this.frequencies.push(this.frequencies[0])
      
      for(let i=0;i<this.numStrings;i++) {
        this.strings.push(new SympathyString(frequencies[i],1-(frequencies[i]/5000)))
        this.input.connect(this.strings[i].delay)
        this.strings[i].output.connect(this.hpf)
      }

      // Parameter definitions
      this.paramDefinitions = paramDefinitions(this);
      this.param = this.generateParameters(this.paramDefinitions);
      this.createAccessors(this, this.param);
      this.autocompleteList = this.paramDefinitions.map(def => def.name);
      this.presetList = Object.keys(this.presets)
      setTimeout(() => {
        this.loadPreset('default');
      }, 500);
  }
  setFrequencies = function(vals,time=null){
    // if(vals.length != this.numStrings){
    //   console.log("incorrect freq array size, should be ", this.numStrings)
    //   return
    // }
    if( !Array.isArray(vals)) vals = [vals]
    if(vals.length < this.numStrings){
      let div = Math.floor(this.numStrings/vals.length)
      let freqs = vals
      for(let i=0;i<this.numStrings;i++) {
        let lastVal = vals[vals.length-1]
        if(i>=vals.length) vals.push(lastVal * (i-vals.length+2))
        //vals = vals.concat(freqs.map(x=>x*(2+i)))
      }
    }

    //console.log(vals, this.detuneAmount)
    if(time){
      for(let i=0;i<this.numStrings;i++) {
        this.frequencies[i] = vals[i] //* (1 - (Math.random()-.5)*this.detuneAmount)
        this.strings[i].setFrequency(this.frequencies[i] * (1 + this.detuneAmount), time)
      }
    } else {
      for(let i=0;i<this.numStrings;i++) {
        this.frequencies[i] = vals[i] 
        this.strings[i].setFrequency(this.frequencies[i] * (1 + this.detuneAmount))
      }
    }
  }
  setDetune = function(val){
    this.detuneAmount = this.detuneFocusCurve(val)
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
  setGains = function(time=null){
    let gains = new Array(this.numStrings)
    let vals = this.gainAmount
    if(!Array.isArray(vals)) vals = [vals,vals]

    if(vals.length < this.numStrings){
      let low = vals[0]
      let high = vals[vals.length-1]
      let step = (high-low)/(this.numStrings-1)
      for(let i=0;i<this.numStrings;i++){
        gains[i] = low + step*i
      }
    } else gains = vals

    let tilts = Array.from({length:this.numStrings},(x,i)=>{
      let v = 0
      let t = this.tiltAmount/( this.numStrings-1)
      if(t < 0) v = 1 + t*i
      else v = 1-(this.numStrings-1-i)*t
      return v
    })

    gains = gains.map((x,i)=>x*tilts[i]*gains[0])
    console.log(this.gainAmount, gains.map(x=>x.toFixed(2)), tilts)
    if(time){
      for(let i=0;i<this.numStrings;i++) this.strings[i].output.gain.exponentialRampToValueAtTime(gains[i],.1)
    } else {
      for(let i=0;i<this.numStrings;i++) this.strings[i].output.gain.rampTo( gains[i], 0.01)
    }
  }
  setDamping = function(val){
    for(let i=0;i<this.numStrings;i++) this.strings[i].delay.dampening = val
  }
  setHighpass = function(val){this.hpf.frequency.value = val }
  // setEQ(low,mid,hi){
  //   this.eq.high.value = hi
  //   this.eq.mid.value = mid
  //   this.eq.low.value = low
  // }
  // setEQBands(low,hi){
  //   if(low < 10 || hi < 10){
  //     console.log('EQ bands are in Hz')
  //     return;
  //   }
  //   this.eq.highFrequency.value = hi
  //   this.eq.lowFrequency.value = low
  // }

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