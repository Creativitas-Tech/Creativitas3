export const paramDefinitions = (synth) => [
    {
      name:'time', min:0.01, max:1, curve:2,
      type: 'param',
      callback: function(value) {}
    },{
      name: "mix",
      type: "output",
      min: 0, max: 1, curve:2,
      callback: (value) => {
        synth.dryGain.gain.value = 1 - value;
        synth.wetGain.gain.value = value;
    }
  }
  ]
