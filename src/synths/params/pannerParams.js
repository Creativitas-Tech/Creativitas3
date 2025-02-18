const paramDefinitions = (synth) => [
    { 
        name: 'angle', type: 'vco', value: 0, 
        min:0, max:359, curve:1,
        isSignal: 'false', connectTo: null,
        callback: function(x, time = null) {synth.setAngle(x,1,time);}
    },
    { 
        name: 'gain', type: 'vca', 
        min: 0, max: 1, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.input.factor, 
        callback: function(x, time = null) {
            if (time) {
                synth.input.setValueAtTime(x, time);
            } else {
                synth.input.rampTo( x, .1 );
            }
        }
    },
];

export default paramDefinitions;