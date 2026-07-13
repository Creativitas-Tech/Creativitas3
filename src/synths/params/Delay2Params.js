export const paramDefinitions = (synth) => [
  {
    name: "name",
    type: "input",
    value: 'Delay',
    max: 'Delay', default: 'Delay'
  },
  {
    name: "lowcut",
    type: "input",
    min: 20,
    max: 5000,
    default: .0,
    curve: 2,
    callback: (value) => {
      synth.highpass.frequency.rampTo((value), .1);
      // console.log('hpf', synth.highpass.frequency.value)
    }
  },
  {
    name: "time",
    type: "param",
    min: 0.05,
    max: 1,
    default: 0.1,
    curve: 1,
    callback: (value) => {
      synth.setTime(value); // function should set delayL/R times based on width
    }
  },
  {
    name: "feedback",
    type: "param",
    min: 0,
    max: 0.9,
    default: 0.2,
    curve: 3,
    callback: (value) => {
      synth.feedbackAmount = value
      synth.feedbackGain.gain.rampTo( value,.1);    
    }
  },

  {
    name: "damping",
    type: "param",
    min: 100,
    max: 8000,
    default: 1000,
    curve: 2,
    callback: (value) => {
      synth.dampingFilter.frequency.rampTo( value, .1);
    }
  },
  {
  name: "modulation",
  type: "output",
  min: 0,
  max: 1,
  default: .2,
  curve: 1,
  value:0.1,
  callback: (value) => {
    let amplitude = value > 0 ? Math.pow(1-value,2)*.02+0.01 : 0
    synth.lfo.amplitude.rampTo(amplitude, .1);
    synth.lfo.frequency.rampTo(Math.pow(value,2)*1, .1);
    // console.log('amp', Math.pow(1-value,2)*.05+0.001, 'rate', Math.pow(value,2)*3 )
    }
  },

  {
  name: "level",
  type: "output",
  min: 0,
  max: 1,
  default: .2,
  curve: 1,
  callback: (value) => {
    synth.output.gain.rampTo(value, .1);
    }
  }


]
