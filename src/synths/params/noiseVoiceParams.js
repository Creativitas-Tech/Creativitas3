const paramDefinitions = (synth) => [
    // { 
    //     name: 'type', type: 'vco', value: 'white', 
    //     radioOptions: ['white','pink'], 
    //     callback: function(x) {
    //         switch (x) {
    //             case 'white': synth.source.type = 'white'; break;
    //             case 'pink': synth.source.type = 'pink'; break;
    //             case 'tri': synth.source.type = 'white'; break;
    //             case 'sine': synth.source.type = 'white'; break;
    //         }
    //     }
    // },
    { 
        name: 'rolloff', type: 'vco', value: '-24', 
        radioOptions: [-12,-24,-48], 
        callback: function(x) {
            synth.vcf.rolloff = x
            // switch (x) {
            //     case '-12': synth.vcf.rolloff = -12; break;
            //     case 'pink': synth.source.type = 'pink'; break;
            //     case 'tri': synth.source.type = 'white'; break;
            //     case 'sine': synth.source.type = 'white'; break;
            // }
        }
    },
    { 
        name: 'cutoff', type: 'vcf', 
        min: 20, max: 10000, curve: 2,value: 1000,
        isSignal: 'true', connectTo: synth=>synth.vcf.frequency 
    
    },
    { 
        name: 'Q', type: 'vcf', 
        min: 0, max: 30, curve: 2, value: 0,
        callback: function(x) { synth.vcf.Q.value = x; } 
    },
    // { 
    //     name: 'bandwidth', type: 'vcf', 
    //     min: 0, max: 1, curve: 2, value:1,
    //     callback: function(x) { synth.setBandwidth(x); } 
    // },
    /*
    { 
        name: 'keyTrack', type: 'hidden', 
        min: 0, max: 2, curve: 1, 
        callback: function(x) { synth.keyTracker.factor.value = x; } },
        */
    { 
        name: 'envDepth', type: 'vcf', 
        min: -1000, max: 5000, curve: 2, 
        callback: function(x) { 
            synth.vcf_env_depth.factor.value = x; 
        } },
    { 
        name: 'level', type: 'vca', 
        min: 0, max: 1, curve: 2, value: 0, 
        callback: function(x) { synth.direct.factor.rampTo(x, 0.01) } },
    { 
        name: 'attack', type: 'env', 
        min: 0, max: 1, curve: 2, value: 0.01, 
        callback: function(x) { synth.env.attack = x; } },
    { 
        name: 'decay', type: 'env', 
        min: 0, max: 1, curve: 2, value: 0.1, 
        callback: function(x) { synth.env.decay = x; } },
    { 
        name: 'sustain', type: 'env', 
        min: 0, max: 1, curve: 2, value: 0.5, 
        callback: function(x) { synth.env.sustain = x; } },
    { 
        name: 'release', type: 'env', 
        min: 0, max: 1, curve: 2, value: 0.5, 
        callback: function(x) { synth.env.release = x; } }
];

export default paramDefinitions;