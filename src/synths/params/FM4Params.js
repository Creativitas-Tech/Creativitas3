const paramDefinitions = (synth) => [
    {
        name: 'transient', type: 'vco', min: 0, max: 1, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.transientAmount, 
        value: .4,
        callback: function(x,time) {
            if (time) {
                synth.transientAmount.setValueAtTime(x, time);
            } else  synth.transientAmount.value = x; 
            synth.updateMacroMapping()
        }
    },
    {
        name: 'voicing', type: 'vco', min: 0, max: synth.operatorSets.length-1, curve: 1,
        value: 0.1,
        callback: function(x,time) {
            if( Math.floor(x) != synth.currentSet){
                synth.currentSet = Math.floor(x)
                synth.updateMacroMapping()
                console.log('FM Voicing: ', synth.operatorSets[synth.currentSet].name)
            }
        }
    },
    {
        name: 'modIndex', type: 'vco', min: 0, max: 10, curve: 3,
        value: 1.2,
        callback: function(x,time) {
            if(time) synth.indexOfModulation.setValueAtTime(x,time)
            else synth.indexOfModulation.rampTo( x, .005)
            synth.updateMacroMapping()
        }
    },
    {
        name: 'damping', type: 'vca', min: 0, max: 1, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.dampingAmount, 
        value: 1,
        callback: function(x,time) {
            if (time) {
                synth.dampingAmount.setValueAtTime(x, time);
            } else  synth.dampingAmount.value = x;
            synth.updateMacroMapping()
        }
    },
    {
        name: 'detune', type: 'vco', min: 0, max: 1, curve: 1,
        isSignal: 'true', connectTo: synth=>synth.detuneAmount, 
        value: 0,
        callback: function(x,time) {
            if (time) {
                synth.detuneAmount.setValueAtTime(x, time);
            } else  synth.detuneAmount.value = x;
            synth.updateMacroMapping()
        }
    },
    {
        name: 'indexEnv', type: 'vca', min: 0, max: 3, curve: 3,
        value: .3,
        callback: function(x, time) {
            synth.indexEnvDepthAmount.value = x
            synth.updateMacroMapping()
        }
    },
    // {
    //     //TODO: Should this be hidden?
    //     name: 'keyTracking', type: 'hidden', min: 0, max: 1, curve: 1,
    //     value: .1,
    //     callback: function(x,time) {
    //         if(time) synth.keyTrackingAmount.setValueAtTime(x,time)
    //         else synth.keyTrackingAmount.rampTo( x, .005)
    //     }
    // },
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
        value: 0.43,
        callback: function(x) {
            synth.env.sustain = x
        }
    },
    {
        name: 'release', type: 'env', min: 0.01, max: 20, curve: 2,
        value: 12,
        callback: function(x) {
            synth.env.release = x
            synth.updateMacroMapping()
        }
    },
    {
        name: 'ratios', type: 'hidden',value:[1,1,2,4],
        callback: function(x) {
            //console.log(x)
            //synth.ratios = x
            synth.updateMacroMapping()
        }
    },
    // {
    //     name: 'vcfAttack', type: 'env', min: 0.005, max: 0.5, curve: 2,
    //     value: 0.01,
    //     callback: function(x) {
    //         synth.modulator.env.attack = x
    //     }
    // },
    // {
    //     name: 'vcfDecay', type: 'env', min: 0.01, max: 10, curve: 2,
    //     value: 0.1,
    //     callback: function(x) {
    //         synth.modulator.env.decay = x
    //     }
    // },
    // {
    //     name: 'vcfSustain', type: 'env', min: 0., max: 1, curve: 2,
    //     value: 0.1,
    //     callback: function(x) {
    //         synth.modulator.env.sustain = x
    //     }
    // },
    // {
    //     name: 'vcfRelease', type: 'env', min: 0.01, max: 20, curve: 2,
    //     value: 0.1,
    //     callback: function(x) {
    //         synth.modulator.env.release = x
    //     }
    // }
    // Fix pan in polyphony template
    // {
    //     name: 'pan', type: 'vca', min: 0, max: 1, curve: .5,
    //     callback: function(x) {
    //         {synth.super.pan(x)}
    //     }
    // },
]

export default paramDefinitions;