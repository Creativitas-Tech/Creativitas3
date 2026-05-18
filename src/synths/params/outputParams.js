const paramDefinitions = (synth) => [
    {
    name: "name",
    type: "input",
    value: 'Output',
    max: 'Output', default: 'OUtput'
  },
    { 
        name: 'level', type: 'output', 
        min: 0, max: 1, curve: 2, 
        callback: function(x, time = null) {
            synth.output.gain.rampTo(x, .1);
        }
    }
];

export default paramDefinitions;