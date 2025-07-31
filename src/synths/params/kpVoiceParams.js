const paramDefinitions = (synth) => [
    { 
        name: 'resonance', type: 'vco', 
        min: 0, max: 1, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.resonance, 
        callback: (val, time = null) => {
          if(val<0.2) val = (val/0.2)*0.9
          else if (val < 0.5) val = (val-0.2)/0.3 *0.08 + 0.9
          else val = (val-0.5)/0.5*0.01 + 0.99
          val = val<0 ? 0 : val>0.9999 ? 0.9999 : val
          //console.log('fb', val)
          if(time){
            synth.resonanceAmount.setValueAtTime(val, time)
          } else {
            synth.resonanceAmount.rampTo(val, .1)
          }
        }
    },
    { 
        name: 'damping', type: 'vca', 
        min: 20, max: 10000, curve: 2,
        isSignal: 'false', 
        callback: function(x, time = null) {

            synth.setDamping(x)

        }
    },
    { 
        name: 'detune', type: 'vco', 
        min: 0, max: 1, curve: 1,
        isSignal: 'false', 
        callback: function(x, time = null) {
            synth.setDetune(x)

        }
    },
    { 
        name: 'cutoff', type: 'vcf', 
        min: 20, max: 10000, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.lowpassCutoffSignal, 
        callback: function(x, time = null) {
            if (time) {
                synth.lowpassCutoffSignal.setValueAtTime(x, time);
            } else {
                synth.lowpassCutoffSignal.value = x;
            }
        }
    },
    { 
        name: 'highpass', type: 'vcf', 
        min: 20, max: 10000, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.highpassCutoffSignal, 
        callback: function(x, time = null) {
            if (time) {
                synth.highpassCutoffSignal.setValueAtTime(x, time);
            } else {
                synth.highpassCutoffSignal.rampTo(  x, .1);
            }
        }
    },
    { 
        name: 'Q', type: 'vcf', 
        min: 0, max: 30, curve: 2, 
        callback: function(x) { synth.lpf.Q.value = x; } 
    },
    /*
    { 
        name: 'keyTrack', type: 'hidden', 
        min: 0, max: 2, curve: 1, 
        callback: function(x) { synth.keyTracker.factor.value = x; } },
        */
    { 
        name: 'envDepth', type: 'vcf', 
        min: -1000, max: 5000, curve: 2, value:0,
        callback: function(x) { synth.lpf_env_depth.factor.value = x; } },
    { 
        name: 'level', type: 'vca', 
        min: 0, max: 1, curve: 1, default: 1, 
        callback: function(x) { synth.output.factor.rampTo(x, 0.01) } },
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
        min: 0, max: 1, curve: 2, value: 0., 
        callback: function(x) { synth.env.sustain = x; } },
    { 
        name: 'release', type: 'env', 
        min: 0, max: 1, curve: 2, value: 0.5, 
        callback: function(x) { synth.env.release = x; } }
];

export default paramDefinitions;