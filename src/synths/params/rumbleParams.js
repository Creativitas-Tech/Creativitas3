const paramDefinitions = (synth) => [
  // VCO Detune
  {
    name: 'detune1', type: 'vco', min: 0, max: 1, curve: 1,
    value: 0,
    callback(x) { 
        synth.vco_freq_1.factor.value = 1+synth.detuneFocusCurve(x); 
    }
  },
  {
    name: 'detune2', type: 'vco', min: 0, max: 1, curve: 1,
    value: 0.1,
    callback(x) { 
        synth.vco_freq_2.factor.value = 1+synth.detuneFocusCurve(x); 
    }
  },
  {
    name: 'detune3', type: 'vco', min: 0, max: 1, curve: 1,
    value: 0.95,
    callback(x) { 
        synth.vco_freq_3.factor.value = 1+synth.detuneFocusCurve(x);  
    }
  },

  // VCO Octave
  {
    name: 'octave1', type: 'vco', min: 0, max: 4, curve: 1,
    value: 1,
    callback(x) { 
        x = Math.floor(x-2)
        synth.vco_octave_1.factor.value = Math.pow(2, x); }
  },
  {
    name: 'octave2', type: 'vco', min: 0, max: 4, curve: 1,
    value: 1,
    callback(x) {
        x = Math.floor(x-2)
        synth.vco_octave_2.factor.value = Math.pow(2, x); }
  },
  {
    name: 'octave3', type: 'vco', min: 0, max: 4, curve: 1,
    value: 2,
    callback(x) { 
        x = Math.floor(x-2)
        synth.vco_octave_3.factor.value = Math.pow(2, x); }
  },

  // VCO Gain
  {
    name: 'gain1', type: 'vco', min: 0, max: 1, curve: 2,
    value: 1,
    callback(x) { synth.vco_gain_1.factor.value = x; }
  },
  {
    name: 'gain2', type: 'vco', min: 0, max: 1, curve: 2,
    value: 0,
    callback(x) { synth.vco_gain_2.factor.value = x; }
  },
  {
    name: 'gain3', type: 'vco', min: 0, max: 1, curve: 2,
    value: .5,
    callback(x) { synth.vco_gain_3.factor.value = x; }
  },

  // Filter
  {
    name: 'cutoff', type: 'vcf', min: 20, max: 20000, curve: 2,
    value: 100,
    callback(x) { synth.cutoffSig.value = x; }
  },
  {
    name: 'Q', type: 'vcf', min: 0, max: 30, curve: 2,
    value: 0.5,
    callback(x) { synth.vcf.Q.value = x; }
  },
  {
    name: 'keyTrack', type: 'vcf', min: 0, max: 2, curve: 1,
    value: 0.3,
    callback(x) { synth.keyTracking.factor.value = x; }
  },
  {
    name: 'vcfEnvDepth', type: 'vcf', min: 0, max: 1000, curve: 2,
    value: 300,
    callback(x) { synth.vcf_env_depth.factor.value = x; }
  },

  // ADSR Envelope
  {
    name: 'a', type: 'env', min: 0, max: 1, curve: 1,
    value: 0.005,
    callback(x) { synth.env.attack = x; }
  },
  {
    name: 'd', type: 'env', min: 0, max: 10, curve: 2,
    value: 0.2,
    callback(x) { synth.env.decay = x; }
  },
  {
    name: 's', type: 'env', min: 0, max: 1, curve: 2,
    value: 0.6,
    callback(x) { synth.env.sustain = x; }
  },
  {
    name: 'r', type: 'env', min: 0, max: 10, curve: 2,
    value: 3,
    callback(x) { synth.env.release = x; }
  },

  // Filter ADSR
  {
    name: 'vcf_a', type: 'vcf', min: 0, max: 1, curve: 1,
    value: 0.002,
    callback(x) { synth.vcf_env.attack = x; }
  },
  {
    name: 'vcf_d', type: 'vcf', min: 0, max: 10, curve: 2,
    value: 0.8,
    callback(x) { synth.vcf_env.decay = x; }
  },
  {
    name: 'vcf_s', type: 'vcf', min: 0, max: 1, curve: 2,
    value: 0.2,
    callback(x) { synth.vcf_env.sustain = x; }
  },
  {
    name: 'vcf_r', type: 'vcf', min: 0, max: 10, curve: 2,
    value: 1,
    callback(x) { synth.vcf_env.release = x; }
  },

  // PWM
  {
    name: 'pwm1', type: 'vca', min: 0, max: 1, curve: 1,
    value: 0,
    callback(x) { synth.lfo_pwm_1.factor.value = x; }
  },
  {
    name: 'pwm2', type: 'vca', min: 0, max: 1, curve: 1,
    value: 0,
    callback(x) { synth.lfo_pwm_2.factor.value = x; }
  },
  {
    name: 'pwm3', type: 'vca', min: 0, max: 1, curve: 1,
    value: 0,
    callback(x) { synth.lfo_pwm_3.factor.value = x; }
  },

  // LFO, Distortion, Mix
  {
    name: 'lfoRate', type: 'vca', min: 0, max: 50, curve: 3,
    value: 3,
    callback(x) { synth.lfo.frequency.value = x; }
  },
  {
    name: 'distortion', type: 'vca', min: 0, max: 1, curve: 3,
    value: 0,
    callback(x) { synth.clip.factor.value = x; }
  },
  {
    name: 'mix', type: 'vca', min: 0, max: 1, curve: 1,
    value: 1,
    callback(x) { synth.direct_level.factor.value = x; }
  }
];

export default paramDefinitions;