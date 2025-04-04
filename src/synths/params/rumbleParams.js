export const paramDefinitions = (synth) => [
    {
        name: 'vco1_octave', type: 'vco', min: -2, max: 1, curve: 0.75,
        callback: function(x) {
            synth.vco_freq_1.value = calcFreq(x,this.vco1_detune_knob.value)
        } 
    },
    {
        name: 'vco1_detune', type: 'vco', min: -.5, max: .5, curve: 0.75,
        callback: function(x) {
            synth.vco_freq_1.value = calcFreq(x,this.vco1_detune_knob.value)
        } 
    },
]