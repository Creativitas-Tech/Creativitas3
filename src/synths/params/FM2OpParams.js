const paramDefinitions = (synth) => [
    {
        name: 'harmonicity', type: 'vco', min: 1, max: 10, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.harmonicityRatio, 
        value: 2,
        callback: function(x,time) {
            x = Math.floor(x)
            if(time) synth.harmonicityRatio.setValueAtTime(x,time)
            else synth.harmonicityRatio.rampTo( x, .005)
        }
    },
    {
        name: 'modIndex', type: 'vco', min: 0, max: 10, curve: 3,
        value: .3,
        callback: function(x,time) {
            if(time) synth.indexOfModulation.setValueAtTime(x,time)
            else synth.indexOfModulation.rampTo( x, .005)}
    },
    {
        name: 'indexEnv', type: 'vcf', min: 0, max: 10, curve: 3,
        value: .3,
        callback: function(x, time) {
            if(time) synth.indexEnvDepth.setValueAtTime(x,time)
            else synth.indexEnvDepth.rampTo( x, .005)
        }
    },
    {
        //TODO: Should this be hidden?
        name: 'keyTracking', type: 'hidden', min: 0, max: 1, curve: 1,
        value: .1,
        callback: function(x,time) {
            if(time) synth.keyTrackingAmount.setValueAtTime(x,time)
            else synth.keyTrackingAmount.rampTo( x, .005)
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
        value: 0.1,
        callback: function(x) {
            synth.env.decay = x
        }
    },
    {
        name: 'sustain', type: 'env', min: 0, max: 1, curve: 1,
        value: 0.3,
        callback: function(x) {
            synth.env.sustain = x
        }
    },
    {
        name: 'release', type: 'env', min: 0.01, max: 20, curve: 2,
        value: 0.5,
        callback: function(x) {
            synth.env.release = x
        }
    },
    {
        name: 'vcfAttack', type: 'env', min: 0.005, max: 0.5, curve: 2,
        value: 0.01,
        callback: function(x) {
            synth.modulator.env.attack = x
        }
    },
    {
        name: 'vcfDecay', type: 'env', min: 0.01, max: 10, curve: 2,
        value: 0.1,
        callback: function(x) {
            synth.modulator.env.decay = x
        }
    },
    {
        name: 'vcfSustain', type: 'env', min: 0., max: 1, curve: 2,
        value: 0.1,
        callback: function(x) {
            synth.modulator.env.sustain = x
        }
    },
    {
        name: 'vcfRelease', type: 'env', min: 0.01, max: 20, curve: 2,
        value: 0.1,
        callback: function(x) {
            synth.modulator.env.release = x
        }
    }
    // Fix pan in polyphony template
    // {
    //     name: 'pan', type: 'vca', min: 0, max: 1, curve: .5,
    //     callback: function(x) {
    //         {synth.super.pan(x)}
    //     }
    // },
]

export default paramDefinitions;