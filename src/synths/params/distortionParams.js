export const paramDefinitions = (synth) => [
  {
    name: "name",
    type: "input",
    value: 'Dist',
    max: 'Dist', default: 'Dist'
  },
  {
    name: "drive",
    type: "input",
    min: 0,
    max: 1,
    curve: 2,
    default: .2,
    value: 0.1,
    callback: (value) => {
      synth.driveGain.gain.rampTo( (value/5)*100, .1);
      synth.outputCut.value = -Math.sqrt(value)*.1 * synth.outputFactor 
      //console.log(-Math.sqrt(value)*.9 * synth.outputFactor )
      synth.dry.gain.rampTo(value>0.2 ? 0 : (0.2-value)/0.2, .1)
    }
  },
  {
    name: "lowcut",
    type: "none",
    min: 20,
    max: 1000,
    curve: 2,
    default: 80,
      value: 100,
    callback: (value) => {
      //synth.highpassA.frequency.rampTo( value,.1);
    }
  },
  {
    name: "lpf",
    type: "none",
    min: 100,
    max: 16000,
    curve: 2,
    default: 8000,
    value: 8000,
    callback: (value) => {
      //synth.lowpassFilter.frequency.rampTo( value,.1)
    }
  },
  {
    name: "hpf",
    type: "none",
    min: 20,
    max: 2000,
    curve: 2,
    default: 150,
    value: 150,
    callback: (value) => {
      //synth.highpassB.frequency.rampTo( value,.1)
    }
  },
  {
    name: "bias",
    type: "param",
    min: -1,
    max: 1,
    curve: 1,
    default: 0,
    value: 0,
    callback: (value) => {
      synth.biasSignal.value = value;
    }
  },
  {
    name: "shelf",
    type: "param",
    min: 0,
    max: 1,
    curve: 1,
    value: 1000,
    callback: (value) => {
      //console.log('shelf', value) 
      if (typeof value !== 'number' || isNaN(value)) {
        //console.warn("Invalid drive value:", value);
        return;
      }     
      value = Math.pow(value,2)*36-24
      //synth.toneShelf.gain.rampTo( value,.1)
      
    }
  },
  {
    name: "type",
    type: "param",
    radioOptions: ["soft", "tanh", "hard", "fold", "tube"],
    default: "tanh",
    value: "tanh",
    callback: (value) => {
      if (value == 0.5) { return }
      synth.shaper1.curve = synth.transferFunctions[value];
      synth.shaper2.curve = synth.transferFunctions[value];
    }
  },
  {
    name: "feedback",
    type: "output",
    min: 0,
    max: 1,
    default: 0,
    curve: 3,
    value: 0,
    callback: (value) => {
      synth.feedbackGain.gain.value = value;
    }
  },
  {
    name: "level",
    type: "output",
    min: 0,
    max: 1.5,
    curve: 2,
    default: 1,
      value: 1,
    callback: (value) => {
      synth.outputLevel.value = value;
      synth.outputFactor = value
    }
  }
];