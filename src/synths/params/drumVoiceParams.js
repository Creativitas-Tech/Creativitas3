const paramDefinitions = (synth) => [
  {
    name:'rate',type: 'input',
    value:1, min:-10,max:10,curve:1,callback:x=>{
      synth.voice.playbackRate = Math.abs(x)
      if(x<0) synth.voice.reverse = true
    }
  },

  {
    name: 'volume', type: 'output', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.output.factor.value = x
  },
  {
    name:'amp',type: 'hidden',
    min:0,max:1,curve:2,callback:x=>synth.output.factor.value = x
  },
  {
    name:'ghost',type: 'hidden',
    min:0,max:1,curve:2,callback:x=>synth.ghost = x
  },
  {
    name:'accent',type: 'hidden',
    min:0,max:4,curve:2,callback:x=>synth.accent = x
  },

  {
    name:'decay',type: 'param',value:1,
    min:0.0,max:1,curve:3,callback:x=> {
      synth.decayTime = x * synth.duration
      synth.setDecayTime()
    }
  },
  {
    name:'choke',type: 'param',value:1,
    min:0.,max:1,curve:2,callback:x=> {
      synth.chokeRatio = x
      synth.setDecayTime()
    }
  },
  
  {
    name:'dry',type: 'output',value:0,
    min:0,max:1,curve:2,callback:x=>synth._dry.factor.value = x
  },
];

export default paramDefinitions;