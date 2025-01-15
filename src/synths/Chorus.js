/*
Chorus

Delays
* input->hpf->lpf->wavshapeGain->waveshaper->
    3 chorus stages->output
*   delayTime -> lfoDepthScalar -> lfoDepth.factor
* 

methods:


properties:

- 
*/

import p5 from 'p5';
import * as Tone from 'tone';

export class ModDelay{
    constructor(){
        this.input = new Tone.Multiply(1)
        this.lfoRate = new Tone.Signal(.5)
        this.delay = new Tone.Delay({delayTime:.0})
        this.delayTime= new Tone.Signal(.1)
        this.delayTimeAdd = new Tone.Add()
        this.feedback = new Tone.Multiply(0)
        this.lfo = new Tone.Oscillator().start()
        this.lfoDepthScalar = new Tone.Multiply(.01)
        this.lfoDepth = new Tone.Multiply(.1)
        this.panner = new Tone.Panner(0)
        this.output = new Tone.Multiply(1)
        //
        this.input.connect(this.delay)
        this.delay.connect(this.feedback)
        this.feedback.connect(this.delay)
        this.delay.connect(this.panner)
        this.panner.connect(this.output)
        //
        this.delayTime.connect(this.delayTimeAdd)
        this.delayTimeAdd.connect(this.delay.delayTime)
        this.lfoRate.connect(this.lfo.frequency)
        //this.lfoRate.connect(this.lfoDepthScalar.factor)
        this.lfo.connect(this.lfoDepthScalar)
        this.lfoDepthScalar.connect(this.lfoDepth)
        this.lfoDepth.connect(this.delayTimeAdd.addend)
        this.setDelayTime(0.01)
    }
    setDelayTime(val){
        this.delayTime.value = val
        this.lfoDepthScalar.factor.value = val
    }
}

// export class Chorus{
//     constructor(){
//         //signal
//         this.input = new Tone.Multiply(1)
//         this.hpf = new Tone.OnePoleFilter({type:'highpass',frequency:100})
//         this.lpf = new Tone.Filter({frequency:2000})
//         this.frequency = new Tone.Signal(.5)
//         this.stage = []
//         this.rateScale = []
//         for(let i=0;i<3;i++){
//             this.stage.push( new ModDelay())
//             this.rateScale.push( new Tone.Multiply(1+i))
//         }
//         this.drive = new Tone.Multiply(0.8)
//         this. waveShaper = new Tone.WaveShaper((x)=>{
//           return Math.tanh(x*16) *.9
//         })
//         this.output = new Tone.Multiply(1)
//         //mod
//         this.delayTime = new Tone.Signal(.1)
//         this.rate = new Tone.Signal()
//         this.depth = new Tone.Signal()
//         //connections
//         this.input.connect(this.hpf)
//         this.hpf.connect(this.lpf)
//         this.lpf.connect(this.drive)
//         this.drive.connect(this.waveShaper)
//         for(let i=0;i<3;i++){
//             this.waveShaper.connect(this.stage[i].input)
//             this.stage[i].output.connect(this.output)
//             this.rate.connect(this.rateScale[i])
//             this.rateScale.connect(this.stage[i].rate)
//             // this.st
//         }
//     }
//     connect(destination) {
//         if (destination.input) {
//             this.output.connect(destination.input);
//         } else {
//             this.output.connect(destination);
//         }
//     }
// }