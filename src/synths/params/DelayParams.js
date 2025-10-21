export const paramDefinitions = (synth) => [
  {
    name: "name",
    type: "input",
    value: 'Delay',
    max: 'Delay', default: 'Delay'
  },
  {
    name: "hicut",
    type: "none",
    min: 20,
    max: 10000,
    default: 100,
    curve: 2,
    callback: (value) => {
      synth.highpass.frequency.rampTo(value, .1);
    }
  },
  {
    name: "time",
    type: "param",
    min: 0.05,
    max: 1,
    default: 0.3,
    curve: 2,
    callback: (value) => {
      synth.setTime(value); // function should set delayL/R times based on width
    }
  },
  {
    name: "feedback",
    type: "param",
    min: 0,
    max: 1,
    default: 0.2,
    curve: 2,
    callback: (value) => {
      value = value/3
      synth.feedbackAmount = value
      if(synth.feedbackPath === 'pre') synth.feedbackGainPre.gain.rampTo( value,.1);
      if(synth.feedbackPath === 'post') synth.feedbackGainPost.gain.rampTo( value,.1);
    }
  },
  {
    name: "drive",
    type: "none",
    min: 0,
    max: 1,
    default: 0.5,
    curve: 2,
    callback: (value) => {
      synth.input.gain.rampTo( value,.1);
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
    name: "type",
    type: "param", // assuming a discrete selector for 'clean' / 'dirty'
    radioOptions: ["clean", "BBD", "tape", "fold", "tube"],
    default: "clean",
    callback: (value) => {
      synth.setType(value); // swap feedback routing or add coloration
    }
  },
  {
    name: "distortionType",
    type: "none",
    default: "tanh",
    callback: (value) => {
      if (value == 0.5) { return }
      synth.shaper.curve = synth.transferFunctions[value];
    }
  },
  {
    name: "width",
    type: "output",
    min: 0,
    max: 1,
    default: 0.1,
    curve: 3,
    callback: (value) => {
      synth.setWidth(value/2); // function adjusts L/R delay spread
    }
  },
  {
  name: "level",
  type: "output",
  min: 0,
  max: 1,
  default: .2,
  curve: 2,
  callback: (value) => {
    synth.shaperGain.gain.rampTo(value*1.5, .1);
  }
}
]
