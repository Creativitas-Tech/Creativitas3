export const paramDefinitions = (synth) => [
  {
    name: "name",
    type: "input",
    value: "Reverb",
    max: "Reverb",
    default: "Reverb"
  },
  {
    name: "lowcut",
    type: "input",
    min: 20,
    max: 1000,
    default: 100,
    curve: 2,
    callback: (value) => {
      synth.highpass.frequency.rampTo(value, 0.1);
    }
  },
  {
    name: "delayTime",
    type: "param",
    min: 0,
    max: 1,
    default: 0.01,
    curve: 2,
    callback: (value) => {
      synth.curDelayTime = value
      synth.delayL.delayTime.rampTo(value*(1+synth.widthValue), .1)
      synth.delayR.delayTime.rampTo(value*(1-synth.widthValue), .1)
    }
  },
  {
    name: "feedback",
    type: "output",
    min: 0,
    max: 1,
    default: 0.3,
    curve: 3,
    callback: (value) => {
      synth.feedbackGain.gain.rampTo(value,.02);
    }
  },
  {
    name: "damping",
    type: "param",
    min: 500,
    max: 10000,
    default: 4000,
    curve: 2,
    callback: (value) => {
      synth.dampingFilter.frequency.rampTo(value,.02);
    }
  },
  {
    name: "type",
    type: "param",
    radioOptions: ["hall", "plate", "spring", "space"],
    default: "room",
    callback: (value) => {
      synth.setType(value); // loads IR buffer and/or sets routing
    }
  },
  {
    name: "level",
    type: "output",
    min: 0,
    max: 1,
    default: 0.2,
    curve: 2,
    callback: (value) => {
      synth.input.gain.rampTo(value*4, 0.1);
    }
  },
  {
    name: "lfoRate",
    type: "none",
    min: 0.01,
    max: 10,
    default: 0.5,
    curve: 2,
    callback: (value) => {
      synth.lfo.frequency.rampTo(value, 0.1); // Tone.LFO.frequency is a Param
    }
  },
  {
    name: "lfoDepth",
    type: "none",
    min: 0,
    max: 0.1,
    default: 0.01,
    curve: 3,
    callback: (value) => {
      synth.lfo.amplitude.rampTo(value, 0.1); // Amplitude modulates delayTime
    }
  },
  {
    name: "width",
    type: "none",
    min: 0,
    max: 1,
    default: 0.01,
    curve: 2,
    callback: (value) => {
      synth.widthValue = value/2
      synth.delayL.delayTime.rampTo(synth.curDelayTime*(1+value/2),.01)
      synth.delayR.delayTime.rampTo(synth.curDelayTime*(1-value/2),.01)
    }
  }
];