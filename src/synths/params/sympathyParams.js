export const paramDefinitions = (synth) => [
  {
    name: "name",
    type: "input",
    value: 'Sympathy',
    max: 'Sympathy', default: 'Sympathy'
  },
  {
    name: "level",
    type: "input",
    min: 0,
    max: 1,
    default: .2,
    curve: 2,
    callback: (value) => {
      synth.input.gain.rampTo(value*1, .1);
    }
  },
  {
    name: "hipass",
    type: "param",
    min: 20,
    max: 10000,
    default: 100,
    curve: 2,
    callback: (value) => {
      synth.hpf.frequency.rampTo(value, .1);
    }
  },
  {
    name: "damping",
    type: "param",
    min: 20,
    max: 10000,
    default: 5000,
    curve: 2,
    callback: (value) => {
      synth.setDamping(value)
    }
  },
  {
    name: "freq", type: 'param', min: 10, max: 1000, curve: 2,
    callback(x) { 
        synth.setFrequencies(x); 
    }
  },
  {
    name: "detune", type: 'param', min: 0, max: 1, curve: 1,
    callback(x) { 
        synth.setDetune(x); 
    }
  },
  {
    name: "feedback",
    type: "param",
    min: 0,
    max: 1,
    default: 0.95,
    curve: 0.5,
    callback: (val, time = null) => {
      if(val<0.2) val = (val/0.2)*0.9
      else if (val < 0.5) val = (val-0.2)/0.3 *0.08 + 0.9
      else val = (val-0.5)/0.5*0.01 + 0.99
      val = val<0 ? 0 : val>0.9999 ? 0.9999 : val
      console.log('fb', val)
      if(time){
        for(let i=0;i<synth.numStrings;i++) synth.strings[i].setFeedback(val, time)
      } else {
        for(let i=0;i<synth.numStrings;i++) synth.strings[i].setFeedback(val)
      
      }
    }
  },

  {
    name: "gain",
    type: "hidden",
    min: 0,
    max: 1,
    default: 1,
    curve: 1,
    callback: (vals,time=null)=>{
      synth.gainAmount = vals
      synth.setGains(time)
    }
  },
  {
    name: "tilt",
    type: "hidden",
    min: -1,
    max: 1,
    default: 0.,
    curve: 1,
    callback: (vals,time=null)=>{
      synth.tiltAmount = vals
      synth.setGains(time)
    }
  }

]