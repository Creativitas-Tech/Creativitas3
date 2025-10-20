export const paramDefinitions = (synth) => [
    {
      name:'time', min:0.0001, max:1, curve:2,
      type: 'input',value:.125,
      callback: function(value, time=null) {
        //synth.delay.delayTime.value = value
        //synth.delayR.delayTime.value = value*synth._delayRatio
        //synth.delay.delayTime.rampTo(value, .1)
        //synth.delayR.delayTime.rampTo(value*synth._delayRatio, .1)
        synth.setTime(value, time)
      }
    },
    {
      name:'feedback', min:0.0, max:1.2, curve:.7,
      type: 'input',value:0,
      callback: function(value) {
        synth.feedbackMult.factor.value = value/10; 
        synth.feedbackMultR.factor.value = value/10
      }
    },
    {
      name:'damping', type: 'param',
      min:100, max:10000, curve:2,value:2000,
      callback: function(value) {
        synth.vcf.frequency.value = value; 
        synth.vcf.frequency.value = value*0.9;
      },
    },
    {
      name:'hpf', type: 'param',
      min:10, max:2000, curve:2,value:500,
      callback: function(value) {
        synth.highpass.frequency.value = value
      }
    },
    {
      name:'dry', value:0, min:0.0, max:1.2, curve:2,
      type:'hidden',
      callback: function(value) {
        synth.drySig.factor.value = value
      }
    },
    {
      name:'gain', min:0.1, max:1, curve:0.8, value:.5,
      type:'param',
      callback: function(value) {
        synth.ws_input.factor.rampTo(value, .1)
      }
    },
    {
      name:'rate', min:0.1, max:10, curve:2, value:.3,
      type:'param',
      isSignal: 'true', connectTo: synth=>synth.lfo.frequency,
      callback: function(value) {
        synth.lfo.frequency.rampTo(value, .1)
      }
    },
    {
      name:'depth', min:0., max:.1, curve:3, value:.001,
      type:'param',
      isSignal: 'true', connectTo: synth=>synth.lfoDepth.factor,
      callback: function(value) {
        synth.lfoDepth.factor.rampTo(value, .1)
      }
    },
    {
      name:'amp', min:0.0, max:1.2, curve:2,value:1,
      type:'hidden',
      callback: function(value) {
        synth.output.factor.value = value
      },
    },
    {
      name:'spread', value:1, min:0.5, max:1, curve:1,
      type:'output',
      callback: function(value) {
        synth._delayRatio = value
        synth.time = synth.delay.delayTime.value
      }
    },
    {
      name:'level', min:0.0, max:1.2, curve:2,value:.15,
      type:'output',
      callback: function(value) {
        synth.wetSig.factor.value = value
      }
    }
  ]
