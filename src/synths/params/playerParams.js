const paramDefinitions = (synth) => [
    {
        name: 'volume',
        type: 'input',
        value: -6,
        min: -36,
        max: 0,
        curve: 1,
        callback: function(x) {
          synth.player.volume.value = x;
        }
      },
    {
        name: 'cutoff',
        type: 'param',
        value: 20000,
        min: 100,
        max: 10000,
        curve: 2,
        callback: function(value) {
          synth.cutoffSig.value = value;
        }
      },
    {
        name: 'highpass', type: 'param',
        value: 10,
        min: 10,
        max: 10000,
        curve: 2,
        callback: function(value) {
          synth.hpf.frequency.value = value;
        }
      },
    {
        name: 'Q', type: 'param',
        value: 0,
        min: 0.0,
        max: 20,
        curve: 2,
        callback: function(value) {
          synth.vcf.Q.value = value;
        }
      },
     {
        name: 'filterType', type: 'hidden',
        value: 'lowpass',
        min: 0.0,
        max: 20,
        curve: 2,
        callback: function(value) {
          synth.vcf.type = value;
        }
      },
    {
        name: 'filterEnvDepth', type: 'param',
        value: 0,
        min: 0.0,
        max: 5000,
        curve: 2,
        callback: function(value) {
          synth.vcfEnvDepth.factor.value = value;
        }
      },
    {
        name: 'loopStart',type: 'hidden',
        value: 0,
        min: 0,
        max: 10000,
        curve: 1,
        callback: function(x) {
          synth.player.loopStart = x;
        }
      },
    {
        name: 'loopEnd',type: 'hidden',
        value: 1,
        min: 0,
        max: 10000,
        curve: 1,
        callback: function(x) {
          synth.player.loopEnd = x;
        }
      },
    {
        name: 'loop ',type: 'hidden',
        value: false,
        min: 0,
        max: 1,
        curve: 1,
        callback: function(x) {
          synth.player.loop = x > 0;
        }
      },
    {
        name: 'fadeIn', type: 'hidden',
        value: 0.005,
        min: 0,
        max: 10,
        curve: 3,
        callback: function(x) {
          synth.player.fadeIn = x;
        }
      },
    {
        name: 'fadeOut', type: 'hidden',
        value: 0.1,
        min: 0,
        max: 10,
        curve: 3,
        callback: function(x) {
          synth.player.fadeOut = x;
        }
      },
    {
        name: 'baseUnit', type: 'hidden',
        value: 16,
        min: 0,
        max: 60000,
        curve: 1,
        callback: function(x) {
          synth._baseUnit = x;
        }
      },
    {
        name: 'playbackRate', type: 'input',
        value: 1, 
        min: 0,
        max: 1000,
        curve: 1,
        callback: function(x) {
          if (x < 0) synth.reverse = 1;
          synth._playbackRate = Math.abs(x);
          synth.player.playbackRate = Math.abs(x);
        }
      },
    {
        name: 'sequenceTime', type: 'hidden',
        value: true,
        min: 0,
        max: 1,
        curve: 1,
        callback: function(x) {
          synth.seqControlsPitch = !x;
        }
      },
       {
        name: 'startTime', type: 'hidden',
        value: 0,
        min: 0,
        max: 10000,
        curve: 1,
        callback: function(x) {
          synth._start = x;
        }
      },
       {
        name: 'endTime', type: 'hidden',
        value: 1,
        min: 0,
        max: 10000,
        curve: 1,
        callback: function(x) {
          synth._end = x;
        }
      },
     {
        name: 'baseNote', type: 'hidden',
        min: 0,
        max: 127,
        curve: 1,
        callback: function(x) {
          synth._baseNote = x;
        }
      },
       {
        name: 'reverse', type: 'hidden',
        value: false,
        min: 0,
        max: 1,
        curve: 1,
        callback: function(x) {
          synth.reverse = x > 0 ? 1 : 0;
        }
      }
];

export default paramDefinitions;