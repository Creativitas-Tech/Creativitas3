export const paramDefinitions = (synth) => [
  {
    name: "name",
    type: "input",
    value: 'Chorus',
    max: 'Chorus', default: 'Chorus'
  },
  {
    name: "rate",
    type: "param",
    min: 0.05, max: 10, curve:2,
    default: 0.3,
    callback: (value) => {
      synth.lfos.forEach(lfo => lfo.frequency.value = value);
    }
  },
  {
    name: "depth",
    type: "param",
    min: 0.00001, max: 0.01, curve:2,
    default: 0.004,
    callback: (value) => {
      synth.depths.forEach(gain => gain.gain.value = value);
    }
  },
  {
    name: "spread",
    type: "param",
    min: 0, max: 360, curve:2,
    default: 180,
    callback: (value) => {
      synth.lfos.forEach((lfo, i) => {
        lfo.phase = (value / synth.numVoices) * i;
      });
    }
  },
  {
    name: "tone",
    type: "param",
    min: 200, max: 8000, curve:2,
    default: 4000,
    callback: (value) => {
      if (synth.toneFilter) synth.toneFilter.frequency.value = value;
    }
  } , 
  {
    name: "mix",
    type: "output",
    min: 0, max: 1, curve: 2,
    default: 0.5,
    callback: (value) => {
      synth.dryGain.gain.value = 1 - value;
      synth.wetGain.gain.value = value;
    }
  },
  {
    name: "level",
    type: "output",
    min: 0, max: 1, curve: 2,
    default: 1.0,
    callback: (value) => {
      synth.output.gain.value = value;
    }
  }
];