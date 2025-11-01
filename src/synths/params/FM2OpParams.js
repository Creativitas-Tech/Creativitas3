const paramDefinitions = (synth) => [
    {
        name: 'harmonicity', type: 'vco', min: 1, max: 10, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.harmonicityRatio, 
        value: 2,
        callback: function(x,time) {
            x = Math.floor(x)
            if(time) synth.harmonicityRatio.setValueAtTime(x,time)
            else synth.harmonicityRatio.value =  x
        }
    },
    {
        name: 'modIndex', type: 'vco', min: 0, max: 10, curve: 2,
        value: .6,
        callback: function(x,time) {
            if(time) synth.indexOfModulation.setValueAtTime(x,time)
            else synth.indexOfModulation.rampTo( x, .005)}
    },
    {
        name: 'indexEnv', type: 'vcf', min: 0, max: 10, curve: 2,
        value: .5,
        callback: function(x, time) {
            if(time) synth.indexEnvDepth.setValueAtTime(x,time)
            else synth.indexEnvDepth.rampTo( x, .005)
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
        value: 0.8,
        callback: function(x) {
            synth.env.release = x
        }
    }
]

export default paramDefinitions;