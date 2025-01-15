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
//import { DelayOp } from './DelayOp.js';
import {Parameter} from './ParameterModule.js'
//import './userInterface.css';


export class Feedback {
  /**
   * Uses a Tone.Delay() to allow for feedback loops.
   * @constructor
   * @param {number} [initialLevel=0.] - Initial feedback level.
   * @param {number} [initialTime=0.1] - Initial delay time in seconds.
   * @param {number} [initialFB=0] - Initial feedback amount.
   */
  constructor(initialLevel = 0, initialTime = 0.1, initialFB = 0) {
    this.input = new Tone.Multiply(initialLevel);
    this.delay = new Tone.Delay(initialTime);
    this._feedback = new Tone.Multiply(initialFB);
    this._output = new Tone.Multiply(1);

    // Connecting signal path
    this.input.connect(this.delay);
    this.delay.connect(this._feedback);
    this._feedback.connect(this.delay);
    this.delay.connect(this._output);

    let paramDefinitions = [
      {name:'inputGain',min:0.0,max:1,curve:2,callback:x=>this.input.factor.value = x},
      {name:'time',min:0.01,max:1,curve:2,callback:x=>this.delay.delayTime.value = x},
      {name:'feedback',min:0.0,max:1,curve:1,callback:x=>this._feedback.factor.value = x},
      {name:'outputGain',min:0,max:1,curve:2,callback:x=> this._output.factor.value = x},
      ]


    this.param = this.generateParameters(paramDefinitions)
    this.createAccessors(this, this.param);

    
  }

  generateParameters(paramDefinitions) {
    const params = {};
    paramDefinitions.forEach((def) => {
      const param = new Parameter(def);
      params[def.name] = param;
    });
    return params;
  }

  createAccessors(parent, params) {
    Object.keys(params).forEach((key) => {
      Object.defineProperty(parent, key, {
        get: () => params[key].value,
        set: (newValue) => {
          params[key].value = newValue;
        },
      });
    });
  }

  get() {
  let output = 'Parameters:\n';
  for (let key in this.param) {
    const param = this.param[key];
    output += `${param.name}: ${param.value}\n`;
  }
  //console.log(output);
}


  /**
   * Connect the output to a destination.
   * @param {Tone.Signal | AudioNode} destination - The destination to connect to.
   */
  connect(destination) {
    if (destination.input) {
      this._output.connect(destination.input);
    } else {
      this._output.connect(destination);
    }
  }

  /**
   * Disconnect the output from a destination.
   * @param {Tone.Signal | AudioNode} destination - The destination to disconnect from.
   */
  disconnect(destination) {
    if (destination.input) {
      this._output.disconnect(destination.input);
    } else {
      this._output.disconnect(destination);
    }
  }
}
