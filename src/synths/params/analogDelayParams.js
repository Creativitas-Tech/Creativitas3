export const paramDefinitions = (synth) => [
    {
      name:'time', min:0.01, max:1, curve:2,
      type: 'vco',
      callback: function(value) {
        synth.delay.delayTime.value = value
        synth.delayR.delayTime.value = value*synth._delayRatio
      }
    },
    {
      name:'feedback', min:0.0, max:1.2, curve:.7,
      type: 'vco',
      callback: function(value) {
        synth.feedbackMult.factor.value = value; 
        synth.feedbackMultR.factor.value = value
      }
    },
    {
      name:'damping', min:100, max:10000, curve:2,
      callback: function(value) {
        synth.vcf.frequency.value = value; 
        synth.vcf.frequency.value = value*0.9;
      },
    },
    {
      name:'hpf', min:10, max:2000, curve:2,
      callback: function(value) {
        synth.highpass.frequency.value = value
      }
    },
    {
      name:'dry', value:0, min:0.0, max:1.2, curve:2,
      type:'vca',
      callback: function(value) {
        synth.drySig.factor.value = value
      }
    },
    {
      name:'wet', min:0.0, max:1.2, curve:2,
      type:'vca',
      callback: function(value) {
        synth.wetSig.factor.value = value
      }
    },
    {
      name:'gain', min:0.0, max:1, curve:0.2,
      type:'vca',
      callback: function(value) {
        synth.ws_input.factor.value = value
      }
    },
    {
      name:'amp', min:0.0, max:1.2, curve:2,
      type:'vca',
      callback: function(value) {
        synth.output.factor.value = value
      },
    },
    {
      name:'delayRatio', value:0, min:0.5, max:1, curve:1,
      type:'vco',
      callback: function(value) {
        synth._delayRatio = value
        synth.time = synth.delay.delayTime.value
      }
    }
  ]
