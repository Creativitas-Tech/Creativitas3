const paramDefinitions = (synth) => [

    { 
        name: 'type', type: 'vco', value: 'square', 
        radioOptions: ['square', 'saw', 'tri'], 
        callback: function(x) {
            switch (x) {
                case 'square': synth.vco.type = 'pulse'; break;
                case 'saw': synth.vco.type = 'sawtooth'; break;
                case 'tri': synth.vco.type = 'triangle'; break;
            }
        }
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
        name: 'envDepth', type: 'vcf', 
        min: -1000, max: 5000, curve: 2, 
        callback: function(x, time = null) {
            if (time) {
                synth.vcf_env_depth.factor.setValueAtTime(x, time);
            } else synth.vcf_env_depth.factor.value = x; } },
    { 
        name: 'level', type: 'hidden', 
        min: 0, max: 1, curve: 2, value: 0, 
        callback: function(x, time = null) {
            if (time) {
                synth.vca_lvl.setValueAtTime(x, time);
            } else  synth.vca_lvl.value = x; } },
    { 
        name: 'attack', type: 'vca', 
        min: 0, max: 1, curve: 2, value: 0.01, 
        callback: function(x) { synth.env.attack = x; } },
    { 
        name: 'decay', type: 'vca', 
        min: 0, max: 1, curve: 2, value: 0.1, 
        callback: function(x) { synth.env.decay = x; } },
    { 
        name: 'sustain', type: 'vca', 
        min: 0, max: 1, curve: 2, value: 0.5, 
        callback: function(x) { synth.env.sustain = x; } },
    { 
        name: 'release', type: 'vca', 
        min: 0, max: 1, curve: 2, value: 0.5, 
        callback: function(x) { synth.env.release = x; } }
];

export default paramDefinitions;