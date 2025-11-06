const paramDefinitions = (synth) => [
    {
        name: 'volume',
        type: 'output',
        value: 0.5,
        min: 0,
        max: 1,
        curve: 0.75,
        callback: function(x) {
          synth.output.factor.value = x*3;
        }
      },
      {
        name: 'playbackrate', type: 'input',
        value: 1, 
        min: -2,
        max: 2,
        curve: 1,
        callback: function(x, time = null) {
            if(x<0) synth.player.reverse = true
            else synth.player.reverse = false
          if(time){
            synth._playbackRate = Math.abs(x);
            synth.player.playbackRate = Math.abs(x);
          }
          else{
              synth._playbackRate = Math.abs(x);
              synth.player.playbackRate = Math.abs(x);
          }
        }
      },
      {
        name: 'startTime', type: 'hidden',
        value: 0,
        min: 0,
        max: 1000,
        curve: 1,
        callback: function(x) {
          synth._start = x;
        }
      },
       {
        name: 'endTime', type: 'hidden',
        value: 10,
        min: 0,
        max: 2000,
        curve: 1,
        callback: function(x) {
          synth._end = x;
        }
      },
    {
        name: 'cutoff',
        type: 'param',
        value: 20000,
        min: 20,
        max: 10000,
        curve: 2,
        callback: function(value, time=null) {
            //if(time) synth.cutoffSig.linearRampToValueAtTime(value,time+0.002)
            if(time) synth.cutoffSig.setValueAtTime(value)
          else synth.cutoffSig.rampTo(value, .1)
        }
      },
      {
        name: 'fadein', type: 'param',
        value: 0.001,
        min: 0,
        max: 1,
        curve: 3,
        callback: function(x) {
          synth.player.fadeIn = x;
        }
      },
    {
        name: 'fadeout', type: 'param',
        value: 0.001,
        min: 0,
        max: 1,
        curve: 3,
        callback: function(x) {
          synth.player.fadeOut = x;
        }
      },
    {
        name: 'highpass', type: 'param',
        value: 10,
        min: 10,
        max: 10000,
        curve: 2,
        callback: function(value) {
          synth.hpf.frequency.rampTo(  value, 0.01);
        }
      },
    {
        name: 'Q', type: 'hidden',
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
        callback: function(value) {
          synth.vcf.type = value;
        }
      },
    {
        name: 'filterEnvDepth', type: 'hidden',
        value: 0,
        min: 0.0,
        max: 5000,
        curve: 2,
        callback: function(value) {
          synth.vcfEnvDepth.factor.value = value;
        }
      },
    {
        name: 'loopstart',type: 'hidden',
        value: 0,
        min: 0,
        max: 1,
        curve: 1,
        callback: function(x) {
          synth.player.loopStart = x;
        }
      },
    {
        name: 'loopend',type: 'hidden',
        value: 2,
        min: 0,
        max: 2,
        curve: 1,
        callback: function(x) {
          synth.player.loopEnd = x;
        }
      },
    {
        name: 'loop',type: 'hidden',
        value: false,
        callback: function(x) {
          synth.player.loop = x > 0;
        }
      },
    {
        name: 'divisions', type: 'input',
        value: 16,
        min: 0,
        max: 64,
        curve: 1,
        callback: function(x) {
          synth._baseUnit = Math.floor(x);
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
        name: 'baseNote', type: 'hidden',
        min: 0,
        max: 127,
        curve: 1,
        callback: function(x) {
          synth._baseNote = x;
        }
      },
       {
        name: 'Reverse', type: 'hidden',
        value: false,
        min: 0,
        max: 1,
        curve: 1,
        callback: function(x) {
          synth.player.reverse = x > 0 ? true : false;
        }
      }

];

export default paramDefinitions;