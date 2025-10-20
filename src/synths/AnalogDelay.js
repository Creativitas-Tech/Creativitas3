/**
 * AnalogDelay.js
 * 
 * Simple approximation of an analog delay
 * 
 * Signal path:
 * input -> hpf -> gain -> waveShaper -> lpf -> delay -> wet -> output
 *                                         <- feedback <-
 * input -> dry -> output
 * 
 * @class
 */
import p5 from 'p5';
import * as Tone from 'tone';
import { DelayOp } from './DelayOp.js';
import {Parameter} from './ParameterModule.js'
import './userInterface.css';
import { paramDefinitions } from './params/analogDelayParams.js';
import { EffectTemplate } from './EffectTemplate';
import layout from './layouts/EffectLayout.json';

export class AnalogDelay extends EffectTemplate {
  /**
   * Creates an instance of AnalogDelay.
   * @constructor
   * @param {number} [initialTime=0.1] - Initial delay time in seconds.
   * @param {number} [initialFB=0] - Initial feedback amount.
   */
  constructor(initialTime = 1, initialFB = 0) {
    super()
    this.name = 'analogDelay'
    this.layout= layout

    this.input = new Tone.Multiply(1);
    this.highpass = new Tone.Filter({ type: 'highpass', frequency: 20, Q: 0 });
    this.ws_input = new Tone.Multiply(0.125);
    this.waveShaper = new Tone.WaveShaper((x) => { return Math.tanh(x*10) });
    this.vcf = new Tone.Filter({ type: 'lowpass', frequency: 5000, Q: 0, slope: '-12' });
    this.vcfR = new Tone.Filter({ type: 'lowpass', frequency: 5000, Q: 0, slope: '-12' });
    this.delay = new Tone.Delay(initialTime, initialTime);
    this.delayR = new Tone.Delay(initialTime, initialTime);
    this._delayRatio = 0.75
    this.feedbackMult = new Tone.Multiply(initialFB);
    this.feedbackMultR = new Tone.Multiply(initialFB);
    this.merge = new Tone.Merge(2)
    this.wetSig = new Tone.Multiply(1);
    this.drySig = new Tone.Multiply(0);
    this.output = new Tone.Multiply(1);

    // Connecting signal path
    this.input.connect(this.drySig);
    this.input.connect(this.highpass);
    this.highpass.connect(this.ws_input);
    this.ws_input.connect(this.waveShaper);
    this.waveShaper.connect(this.vcf);
    this.waveShaper.connect(this.vcfR);
    this.vcf.connect(this.delay);
    this.vcfR.connect(this.delayR);
    this.delay.connect(this.feedbackMult);
    this.delayR.connect(this.feedbackMultR);
    this.feedbackMult.connect(this.waveShaper);
    this.feedbackMultR.connect(this.waveShaper);
    this.delay.connect(this.merge,0,0);
    this.delayR.connect(this.merge,0,1);
    this.merge.connect(this.wetSig);
    this.wetSig.connect(this.output);
    this.drySig.connect(this.output);

    this.lfo = new Tone.Oscillator(2).start()
    this.lfo.type = "triangle"
    this.lfoDepth = new Tone.Multiply()
    this.lfo.connect(this.lfoDepth)
    this.lfoDepth.connect(this.delay.delayTime)
    this.lfoDepth.connect(this.delayR.delayTime)


    this.paramDefinitions = paramDefinitions(this)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    setTimeout( ()=> this.time = .1, .1)
  }

  setTime(seconds, time = null) {
    if(0){
      this.delay.delayTime.linearRampToValueAtTime(seconds, time)
      this.delayR.delayTime.linearRampToValueAtTime(seconds*this._delayRatio, time)
    } else{
      this.delay.delayTime.rampTo(seconds, .2)
      this.delayR.delayTime.rampTo(seconds*this._delayRatio, .2)
      
    }
  }
}