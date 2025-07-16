const paramDefinitions = (synth) => [
  {
    name: 'volume',
    type: 'output',
    value: 0.5,
    min: 0,
    max: 1,
    curve: 0.5,
    callback: function(x) {
          synth.sampler.volume.value = -36 + (Math.pow(x,0.5)) * 60;
    }
  },
  {
    name: 'attack',
    type: 'input',
    value: 0.005,
    min: 0.005,
    max: 1,
    curve: 2,
    callback: function(x) {
      synth.sampler.attack = x;
    }
  },
  {
    name: 'sustainTime',
    type: 'input',
    value: 0.5,
    min: 0.005,
    max: 1,
    curve: 2,
    callback: function(x) {
      synth.sustain = x;
    }
  },
  {
    name: 'release',
    type: 'param',
    value: 0.5,
    min: 0.01,
    max: 10,
    curve: 2,
    callback: function(x) {
      synth.sampler.release = x;
    }
  },
  {
    name: 'cutoff',
    type: 'param',
    value: 10000,
    min: 100,
    max: 10000,
    curve: 2,
    callback: function(x) {
      synth.cutoffSig.value = x;
    }
  },
  {
    name: 'Q',
    type: 'param',
    value: 0,
    min: 0.0,
    max: 20,
    curve: 2,
    callback: function(x) {
      synth.vcf.Q.value = x;
    }
  },
  {
    name: 'filterEnvDepth',
    type: 'param',
    value: 0,
    min: 0.0,
    max: 5000,
    curve: 2,
    callback: function(x) {
      synth.vcfEnvDepth.factor.value = x;
    }
  }
];

export default paramDefinitions;