const paramDefinitions = (synth) => [

    { 
        name: 'shape', type: 'vco', 
        min: 0, max: .95, curve: 1, 
        callback: function(x, time = null) {
            if (time) {
                synth._pulseWidthMain.setValueAtTime(x, time);
            } else  synth._pulseWidthMain.value = x; } 
    },

    { 
        name: 'rate', type: 'vcf', 
        min: 0, max: 20, curve: 2, 
        callback: function(x, time = null) {
            if (time) {
                synth._lfo.frequency.setValueAtTime(x, time);
            } else  synth._lfo.frequency.value = x; } 
    },

    { 
        name: 'depth', type: 'vcf', 
        min: 0, max: .95, curve: 1, 
        callback: function(x, time = null) {
            if (time) {
                synth._lfo.amplitude.setValueAtTime(x, time);
            } else  synth._lfo.amplitude.value = x; } 
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
        name: 'keyTrack', type: 'vcf', 
        min: 0, max: 2, curve: 1, 
        callback: function(x, time = null) {
            if (time) {
                synth.keyTracker.factor.setValueAtTime(x, time);
            } else  synth.keyTracker.factor.value = x; } },
    { 
        name: 'envDepth', type: 'hidden', 
        min: -1000, max: 5000, curve: 2, 
        callback: function(x, time = null) {
            if (time) {
                synth.vcf_env_depth.factor.setValueAtTime(x, time);
            } else synth.vcf_env_depth.factor.value = x; } },
    { 
        name: 'level', type: 'hidden', 
        min: 0, max: 1, curve: 2, value: 1, 
        callback: function(x, time = null) {
            if (time) {
                synth.output.setValueAtTime(x, time);
            } else  synth.output.value = x; } },
    { 
        name: 'attack', type: 'vca', 
        min: 0, max: 4, curve: 2, value: 0.4, 
        callback: function(x) { synth.env.attack = x; } },
    { 
        name: 'decay', type: 'hidden', 
        min: 0, max: 1, curve: 2, value: 0.1, 
        callback: function(x) { synth.env.decay = x; } },
    { 
        name: 'sustainTime', type: 'hidden', 
        min: 0, max: 1, curve: 2, value: 1, 
        callback: function(x) { synth.env.sustain = x; } },
    { 
        name: 'release', type: 'vca', 
        min: 0, max: 10, curve: 2, value: 1, 
        callback: function(x) { synth.env.release = x; } }
];

export default paramDefinitions;