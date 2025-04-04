export const paramDefinitions = (synth) => [
    {
        name: 'vco_mix', type: 'vco', min: 0, max: 1, curve: 0.75,
        callback: function(x) {
            synth.crossfade_constant.value= x
        } 
    },
    {
        name: 'detune', type: 'vco', min: 1, max: 2, curve: 0.5,
        callback: function(x) {
            synth.detune_scalar.factor.value = x
        } 
    },
    {
        name: 'shape1', type: 'vco', min: .1, max: .5,
        callback: function(x) {
            synth.shapeVco(0, x*2+1)
        } 
    },
    {
        name: 'shape2', type: 'vco', min: .1, max: .5,
        callback: function(x) {
            synth.shapeVco(1, x*2+1)
        } 
    },
    {
        name: 'cutoff', type: 'vcf', min: 0, max: 10000, curve: 1,
        callback: function(x) {
            synth.cutoffSig.value = x
        } 
    },
    {
        name: 'envDepth', type: 'vcf', min: 0, max: 5000, curve: .75,
        callback: function(x) {
            synth.vcf_env_depth.factor.value = x
        } 
    },
    {
        name: 'Q', type: 'vcf', min: 0, max: 20, curve: .5,
        callback: function(x) {
            synth.vcf.Q.value = x
        } 
    },
    {
        //TODO: Should this be hidden?
        name: 'keyTracking', type: 'vcf', min: 0, max: 1, curve: .5,
        callback: function(x) {
            synth.keyTracking.factor.value = x
        } 
    },
    {
        name: 'highPass', type: 'vcf', min: 10, max: 3000, curve: .5,
        callback: function(x) {
            synth.setHighpass(x)
        } 
    },
    {
        name: 'attack', type: 'env', min: 0.005, max: 0.5, curve: .5,
        callback: function(x) {
            synth.env.attack = x
        } 
    },
    {
        name: 'decay', type: 'env', min: 0.01, max: 10, curve: .5,
        callback: function(x) {
            synth.env.decay = x
        } 
    },
    {
        name: 'sustain', type: 'env', min: 0, max: 1, curve: .5,
        callback: function(x) {
            synth.env.sustain = x
        }
    },
    {
        name: 'release', type: 'env', min: 0, max: 20, curve: .5,
        callback: function(x) {
            synth.env.release = x
        } 
    },
    {
        name: 'vcf_attack', type: 'env', min: 0.005, max: 0.5, curve: .5,
        callback: function(x) {
            synth.vcf_env.attack = x
        } 
    },
    {
        name: 'vcf_decay', type: 'env', min: 0.01, max: 10, curve: .5,
        callback: function(x) {
            synth.vcf_env.decay = x
        } 
    },
    {
        name: 'vcf_sustain', type: 'env', min: 0, max: 1, curve: .5,
        callback: function(x) {
            synth.vcf_env.sustain = x
        }
    },
    {
        name: 'vcf_release', type: 'env', min: 0, max: 20, curve: .5,
        callback: function(x) {
            synth.vcf_env.release = x
        } 
    },
    {
        name: 'lfo', type: 'lfo', min: 0, max: 20, curve: 1,
        callback: function(x) {
            synth.lfo.frequency.value = x
        } 
    },
    {
        name: 'vibrato', type: 'lfo', min: 0, max: .1, curve: .5,
        callback: function(x) {
            synth.pitch_lfo_depth.factor.value = x
        } 
    },
    {
        name: 'tremolo', type: 'lfo', min: 0, max: 1, curve: .5,
        callback: function(x) {
            synth.amp_lfo_depth.factor.value = x
        } 
    },
    {
        name: 'blend', type: 'lfo', min: 0, max: 1, curve: .5,
        callback: function(x) {
            synth.crossfade_lfo_depth.factor.value = x
        } 
    },
    // Fix pan in polyphony template
    // {
    //     name: 'pan', type: 'vca', min: 0, max: 1, curve: .5,
    //     callback: function(x) {
    //         {synth.super.pan(x)}
    //     } 
    // },    
]