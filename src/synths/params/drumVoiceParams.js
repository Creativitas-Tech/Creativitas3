
const paramDefinitions = (synth) => [
    {
        name:'detune',type:'vco',
        min:0.,max:2,curve:1,
        isSignal: 'true', connectTo: synth.tuning.factor,
        callback:(x,time=null)=>{
            if(time) synth.tuning.factor.setValueAtTime(x,time)
            else synth.tuning.factor.value = x
        }
        },
    {
        name:'drive2',type:'vco',
        min:0.,max:2,curve:2,
        isSignal: 'true', connectTo: synth.drive.gain,
        callback:(x,time=null)=>{
            if(time) synth.drive.gain.setValueAtTime(x,time)
            else synth.drive.gain.value = x
         }   
        },
    {
        name:'fm',type:'vcf',
        min:0.,max:10,curve:2,
        isSignal: 'true', connectTo: synth.fmDepth.factor,
        callback:(x,time=null)=>{
            if(time) synth.modIndex.setValueAtTime(x,time)
            else synth.modIndex.value = x
        }
        },
    {
        name:'am',type:'vcf',
        min:0.,max:2,curve:2,
        isSignal: 'true', connectTo: synth.amDepth.factor,
        callback:(x,time=null)=>{
            if(time) synth.amDepth.gain.setValueAtTime(x,time)
            else synth.amDepth.gain.value = x
        }
        },
    {
        name:'harm',type:'vcf',
        min:1.,max:20,curve:1,
        isSignal: 'true', connectTo: synth.harmonicity.factor,
        callback:(x,time=null)=>{
            if(time) synth.harmonicity.factor.setValueAtTime(x,time)
            else synth.harmonicity.factor.value = (x)}
        },
    {
        name:'cutoff',type:'vcf',
        min:50.,max:10000,curve:2,
        isSignal: 'true', connectTo: synth.cutoffSig,
        callback:(x,time=null)=>{
            if(time) synth.cutoffSig.setValueAtTime(x,time)
            else synth.cutoffSig.value = x
            }
        },
    {
        name:'Q',type:'vcf',
        min:0.,max:20,curve:0.7,
        isSignal: 'true', connectTo: synth.finalFilter.Q,
        callback:(x,time=null)=>{
            if(time) synth.finalFilter.Q.setValueAtTime(x,time)
            else synth.finalFilter.Q.value = x
            }
        },
    {
        name:'noiseG',type:'vca',
        min:0.,max:1.5,curve:2,
        isSignal: 'true', connectTo: synth.noiseGain.gain,
        callback:(x,time=null)=>{
            if(time) synth.noiseGain.gain.setValueAtTime(x,time)
            else synth.noiseGain.gain.value = x
            }
        },
    {
        name:'toneG',type:'vca',
        min:0.,max:1.5,curve:2,
        isSignal: 'true', connectTo: synth.drive.gain,
        callback:(x,time=null)=>{
            if(time) synth.toneGain.gain.setValueAtTime(x,time)
            else synth.toneGain.gain.value = x
            }  
        },
    {
        name:'vol',type:'vca',
        min:0.,max:2,curve:2,
        isSignal: 'true', connectTo: synth.output.factor,
        callback:(x,time=null)=>{
            if(time) synth.output.factor.setValueAtTime(x,time)
            else synth.output.factor.value = x
            }
        },
    {
        name:'drop',type:'vco',
        min:0.,max:5000,curve:2,
        isSignal: 'true', connectTo: synth.pitchEnvDepth.factor,
        callback:(x,time=null)=>{
            if(time) synth.pitchEnvDepth.factor.setValueAtTime(x,time)
            else synth.pitchEnvDepth.factor.value = x
            }
        },
    {
        name:'decay',type:'env',
        min:0.,max:5,curve:2,
        isSignal: 'false', connectTo: synth.env.decay,
        callback:(x,time=null)=>{ synth.env.decay = x; synth.env.release = x }
        },
    {
        name:'pDecay',type:'env',
        min:0.,max:1,curve:2,
        isSignal: 'false', connectTo: synth.pitchEnvelope.decay,
        callback:(x,time=null)=>{ synth.pitchEnvelope.decay = x; synth.pitchEnvelope.release = x }
        },
    {
        name:'nDecay',type:'env',
        min:0.,max:5,curve:2,
        isSignal: 'false', connectTo: synth.noiseEnv.decay,
        callback:(x,time=null)=>{ synth.noiseEnv.decay = x; synth.noiseEnv.release = x }
        },
    {
        name:'nFreq',type:'vcf',
        min:100.,max:10000,curve:2,
        isSignal: 'true', connectTo: synth.noiseCutoff,
        callback:(x,time=null)=>{ 
            if(time) synth.noiseCutoff.setValueAtTime(x,time)
            else synth.noiseCutoff.value = x; }
        },
    {
        name:'nEnv',type:'env',
        min:0.,max:5000,curve:3,
        isSignal: 'true', connectTo: synth.noiseVcfEnvDepth.factor,
        callback:(x,time=null)=>{
            if(time) synth.noiseVcfEnvDepth.factor.setValueAtTime(x,time)
            else synth.noiseVcfEnvDepth.factor.value = x
            }
        },
    {
        name:'vcfEnv',type:'vcf',
        min:0.,max:5000,curve:3,
        isSignal: 'true', connectTo: synth.vcfEnvDepth.factor,
        callback:(x,time=null)=>{
            if(time) synth.vcfEnvDepth.factor.setValueAtTime(x,time)
            else synth.vcfEnvDepth.factor.value = x
            }
        },
    // {name:'adsr',type:'env',min:0,max:1,curve:2,value:[.01,.1,.5,.5],
    //     labels:['attack','decay','sustain','release'],
    //     callback:(x,i=null)=>{ synth.setADSR('env',x, i) }
    // },
    // {name:'noise',type:'env',min:0,max:1,curve:2,value:[.01,.1,.5,.5],
    //     labels:['attack','decay','sustain','release'],
    //     callback:(x,i=null)=>{ synth.setADSR('noise',x, i) }
    // },
    // {name:'pitch',type:'env',min:0,max:1,curve:2,value:[.01,.1,.5,.5],
    //     labels:['attack','decay','sustain','release'],
    //     callback:(x,i=null)=>{ synth.setADSR('pitch',x, i) }
    // },
];


export default paramDefinitions;