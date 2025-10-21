export const paramDefinitions = (synth) => [
    {
        name: 'vcoBlend', type: 'vco', min: 0, max: 1, curve: 0.75,
        value: 0.5,
        callback: function(x,time) {
            if(time) synth.crossfade_constant.setValueAtTime(x,time)
            else synth.crossfade_constant.rampTo( x, .005)
        }
    },
    {
        name: 'detune', type: 'vco', min: 1, max: 2, curve: 0.5,
        value: 0.998,
        callback: function(x,time) {
            if(time) synth.detune_scalar.setValueAtTime(x,time)
            else synth.detune_scalar.rampTo( x, .005)}
    },
    {
        name: 'shape1', type: 'vco', min: .1, max: .5,
        value: 0.4,
        callback: function(x) {
            synth.shapeVco(0, x*2+1)
        }
    },
    {
        name: 'shape2', type: 'vco', min: .1, max: .5,
        value: 0.7,
        callback: function(x) {
            synth.shapeVco(1, x*2+1)
        }
    },
    {
        name: 'cutoff', type: 'vcf', min: 0, max: 10000, curve: 1,
        value: 500,
        callback: function(x,time) {
            if(time) synth.cutoffSig.setValueAtTime(x,time)
            else synth.cutoffSig.rampTo( x, .005)
        }
    },
    {
        name: 'envDepth', type: 'vcf', min: 0, max: 5000, curve: .75,
        value: 500,
        callback: function(x,time) {
            if(time) synth.vcf_env_depth.factor.setValueAtTime(x,time)
            else synth.vcf_env_depth.factor.rampTo( x, .005)
        }
    },
    {
        name: 'Q', type: 'vcf', min: 0, max: 20, curve: .5,
        value: 0,
        callback: function(x,time) {
            if(time) synth.vcf.Q.setValueAtTime(x,time)
            else synth.vcf.Q.rampTo( x, .005)
        }
    },
    {
        //TODO: Should this be hidden?
        name: 'keyTracking', type: 'vcf', min: 0, max: 1, curve: 1,
        value: 0.5,
        callback: function(x,time) {
            if(time) synth.keyTracker.setValueAtTime(x,time)
            else synth.keyTracker.rampTo( x, .005)
        }
    },
    {
        name: 'highPass', type: 'vcf', min: 10, max: 3000, curve: 2,
        value: 100,
        callback: function(x) {
            synth.setHighpass(x)
        }
    },
    {
        name: 'attack', type: 'env', min: 0.005, max: 0.5, curve: 2,
        value: 0.01,
        callback: function(x) {
            synth.env.attack = x
        }
    },
    {
        name: 'decay', type: 'env', min: 0.01, max: 10, curve: 2,
        value: 0.2,
        callback: function(x) {
            synth.env.decay = x
        }
    },
    {
        name: 'sustain', type: 'env', min: 0, max: 1, curve: 1,
        value: 0.5,
        callback: function(x) {
            synth.env.sustain = x
        }
    },
    {
        name: 'release', type: 'env', min: 0, max: 20, curve: 2,
        value: 1,
        callback: function(x) {
            synth.env.release = x
        }
    },
    {
        name: 'vcfAttack', type: 'env', min: 0.005, max: 0.5, curve: 2,
        value: 0.01,
        callback: function(x) {
            synth.vcf_env.attack = x
        }
    },
    {
        name: 'vcfDecay', type: 'env', min: 0.01, max: 10, curve: 2,
        value: 0.5,
        callback: function(x) {
            synth.vcf_env.decay = x
        }
    },
    {
        name: 'vcfSustain', type: 'env', min: 0, max: 1, curve: 2,
        value: 0.2,
        callback: function(x) {
            synth.vcf_env.sustain = x
        }
    },
    {
        name: 'vcfRelease', type: 'env', min: 0, max: 20, curve: 2,
        value: 1,
        callback: function(x) {
            synth.vcf_env.release = x
        }
    },
    {
        name: 'lfoRate', type: 'lfo', min: 0, max: 20, curve: 1,
        value: 3,
        callback: function(x,time) {
            if(time) synth.lfoModule.frequency.setValueAtTime(x,time)
            else synth.lfoModule.frequency.value = x
        }
    },
    {
        name: 'vibrato', type: 'lfo', min: 0, max: .1, curve: .5,
        value: 0,
        callback: function(x,time) {
            if(time) synth.pitch_lfo_depth.factor.setValueAtTime(x,time)
            else synth.pitch_lfo_depth.factor.rampTo( Math.pow(x,3), .01)
        }
    },
    {
        name: 'tremolo', type: 'lfo', min: 0, max: 1, curve: .5,
        value: 0,
        callback: function(x,time) {
            if(time) synth.amp_lfo_depth.factor.setValueAtTime(x,time)
            else synth.amp_lfo_depth.factor.rampTo( x, .005)
        }
    },
    {
        name: 'blend', type: 'lfo', min: 0, max: 1, curve: .5,
        value: 0,
        callback: function(x,time) {
            if(time) synth.crossfade_lfo_depth.factor.setValueAtTime(x,time)
            else synth.crossfade_lfo_depth.factor.rampTo( x, .005)
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
