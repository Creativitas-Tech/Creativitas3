const paramDefinitions = (synth) => [

    { 
        name: 'type', type: 'vco', value: 'square', 
        radioOptions: ['square', 'saw'], 
        callback: function(x) {
            try{
                if( x === 'saw'){
                    synth.vco_pulse.volume.rampTo(-96,.1)
                    synth.vco_sawtooth.volume.rampTo(-0,.1)
                } else{
                    synth.vco_pulse.volume.rampTo(-0,.1)
                    synth.vco_sawtooth.volume.rampTo(-96,.1)
                }
            } catch(e){}
        }
    },

    { 
        name: 'mix', type: 'vco', 
        min: 0, max: 1, curve: 1, value: 0, 
        callback: function(x) { synth.vco_mixer.fade.rampTo(x, .1) } 
    },

    { 
        name: 'vcoModDest', type: 'vco', value:'width',
        radioOptions: ['frequency', 'width'], 
        callback: function(x) {
            if(x === 'frequency'){
                synth.lfo_vco_frequency.factor.rampTo(1000,0.1)
                synth.lfo_vco_width.factor.rampTo(0,.1)
            } else if(x === 'width'){
                synth.lfo_vco_frequency.factor.rampTo(0,0.1)
                synth.lfo_vco_width.factor.rampTo(1,.1)
            }
            
        }
    },

    { 
        name: 'vcoMod', type: 'vco', 
        min: 0, max: 1, curve: 1.3, value: 0.0, 
        callback: function(x) { synth.vco_mod_depth.factor.rampTo(x, .1) }
    },

    { 
        name: 'cutoff', type: 'vcf', 
        min: 20, max: 10000, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.cutoffSig, 
        callback: function(x, time = null) {
            if (time) {
                synth.cutoffSig.setValueAtTime(x, time);
            } else {
                synth.cutoffSig.value = x;
            }
        }
    },
    { 
        name: 'Q', type: 'vcf', 
        min: 0, max: 30, curve: 2, 
        callback: function(x, time = null) {
            if (time) {
                synth.vcf.Q.setValueAtTime(x, time);
            } else  synth.vcf.Q.value = x; } 
    },
    { 
        name: 'keyTrack', type: 'hidden', 
        min: 0, max: 2, curve: 1, 
        callback: function(x, time = null) {
            if (time) {
                synth.keyTracker.factor.setValueAtTime(x, time);
            } else  synth.keyTracker.factor.value = x; } },
    { 
        name: 'vcfMod', type: 'vcf', 
        min: -0, max: 5000, curve: 2, 
        callback: function(x, time = null) {
            if (time) {
                synth.vcf_env_depth.factor.setValueAtTime(x, time);
            } else synth.vcf_env_depth.factor.value = x; } },
    { 
        name: 'level', type: 'vca', 
        min: 0, max: 1, curve: 2, value: 1, 
        callback: function(x, time = null) {
            if (time) {
                synth.output.factor.setValueAtTime(x, time);
            } else  synth.output.factor.value = x; } },

    //env      
    { 
        name: 'attack', type: 'env', 
        min: 0.002, max: 1, curve: 2, value: 0.01, 
        callback: function(x) { synth.env.attack = x; } },
    { 
        name: 'decay', type: 'env', 
        min: 0, max: 1, curve: 2, value: 0.1, 
        callback: function(x) { 
            synth.env.decay = x; 
            synth.env.release = x;
        } 
    },
    { 
        name: 'sustain', type: 'hidden', 
        min: 0, max: 1, curve: 2, value: 0.5, 
        callback: function(x) { synth.env.sustain = x; } },
    { 
        name: 'release', type: 'hidden', 
        min: 0, max: 1, curve: 2, value: 0.5, 
        callback: function(x) { synth.env.release = x; } },

    //LFO
    
    { 
        name: 'lfoRate', type: 'lfo', 
        min: 0, max: 100, curve: 2, value: 0.5, 
        callback: function(x) { synth.lfo.frequency.value = x; } 
    },
    { 
        name: 'lfoType', type: 'lfo', value:'triangle',
        radioOptions: ['square', 'triangle'], 
        callback: function(x) {
            synth.lfo.type = x
        }
    }
];

export default paramDefinitions;