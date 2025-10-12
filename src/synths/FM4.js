/*
FM4.js

Note: due to the way we handle poly voice allocation,
the top level .env of a patch must be the main envelope

*/

import * as Tone from 'tone';
import TwinklePresets from './synthPresets/TwinklePresets.json';
import { MonophonicTemplate } from './MonophonicTemplate';
import {Parameter} from './ParameterModule.js'
import basicLayout from './layouts/daisyLayout.json';
import paramDefinitions from './params/FM4Params.js';
import {Theory} from '../TheoryModule.js'
import { FMOperator} from './FM.js'

export class FM4 extends MonophonicTemplate {
  constructor(gui = null) {
    super();
    this.gui = gui;
    this.name = "FM4";
    this.isGlide = false;
    this.guiHeight = 0.6;
    this.layout = basicLayout;

    // Fundamental frequency
    this.frequency = new Tone.Signal(200);

    // Operators
    this.carrier = new FMOperator();
    this.mod1 = new FMOperator(); // transient
    this.mod2 = new FMOperator(); // medium sustain
    this.mod3 = new FMOperator(); // long sustain

    // Frequency routing (all follow the same base frequency)
    [this.carrier, this.mod1, this.mod2, this.mod3].forEach(op =>
      this.frequency.connect(op.frequency)
    );

    // FM routing
    this.mod1.modVca.connect(this.carrier.modInput);
    this.mod2.modVca.connect(this.carrier.modInput);
    this.mod3.modVca.connect(this.carrier.modInput);

    // === Output path ===
    this.env = new Tone.Envelope();
    this.env.connect(this.carrier.vca.factor);

    this.output = new Tone.Multiply(1);
    this.carrier.connect(this.output);

    // === Macro parameters ===
    this.harmonicityRatio = new Tone.Signal(1); // global harmonic multiplier
    this.transientAmount = new Tone.Signal(0.5); // transient index + release
    this.indexOfModulation = new Tone.Signal(0.5); // overall modulation depth
    this.dampingAmount = new Tone.Signal(0.5); // envelope damping for sustain mods
    this.detuneAmount = new Tone.Signal(0); // Hz or cents
    this.indexEnvDepthAmount = new Tone.Signal(0); // Hz or cents

    // === Velocity and key tracking ===
    this.velocitySig = new Tone.Signal();
    this.keyTrackingAmount = new Tone.Signal();
    this.keyTracker = new Tone.Multiply(0.1);
    this.frequency.connect(this.keyTracker);
    this.keyTrackingAmount.connect(this.mod1.indexAmount); // optional, could patch to all


    // envelope scaling
    this.mod1.env.attack = 0.001
    this.mod1.env.sustain = 0.001
    this.mod2.env.attack = .01
    this.mod2.env.sustain = 0.001
    this.mod3.env.attack = 0.02
    this.mod3.env.sustain = 0.1

    this.ratios = [1,4,2,1]
    this.detunes = [0,.3,.1,.05]

    // === Param registration ===
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    //this.createAccessors(this, this.param);
    //this.autocompleteList = this.paramDefinitions.map(def => def.name);

    // initialize default mapping
    this.updateMacroMapping();
  }

  // === Macro mapping ===
  updateMacroMapping() {
    const h = this.harmonicityRatio.value;
    const tr = this.transientAmount.value;
    const idx = this.indexOfModulation.value;
    const dmp = this.dampingAmount.value;
    const det = this.detuneAmount.value;
    const env = this.indexEnvDepthAmount.value
    const release = this.env.release

    //console.log(this.ratios, this.detunes)

    // frequency ratios
    const ratios = [
      this.ratios[0] + this.detunes[0],
      h * this.ratios[1] + det * this.detunes[1], // transient
      h * this.ratios[2] - det * this.detunes[2], // medium
      h * this.ratios[3] + det * this.detunes[3] // long
    
      ]
    this.carrier.ratio.value = ratios[0]
    this.mod1.ratio.value = ratios[1]
    this.mod2.ratio.value = ratios[2]
    this.mod3.ratio.value = ratios[3]
    //console.log(h * 8.00 + det * 0.4, h * 4.01 - det * 0.2, h * 3 + det * 0.1)
    // FM indices
    this.mod1.index.value = idx * (tr * 1.8) * (.5+1/ratios[1]); // transient emphasis
    this.mod2.index.value = idx * 1.0 * (.5+1/ratios[2]);
    this.mod3.index.value = idx * 0.5 * (.5+1/ratios[3]);

    this.mod1.indexEnvDepth.value = (tr * 1.8 + 0.01); // transient emphasis
    this.mod2.indexEnvDepth.value =  env * 1.0;
    this.mod3.indexEnvDepth.value = env * idx * 0.5;

    // envelope scaling
    this.mod1.env.decay = 0.01 + tr * 0.35;
    this.mod1.env.release = 0.01 + tr * 0.5 ;
    this.mod2.env.decay = 0.3 + dmp * (0.8 + release/2);
    this.mod2.env.sustain = dmp;
    this.mod2.env.release = 0.4 + dmp * (1.8 + release);
    this.mod3.env.sustain = dmp;
    this.mod3.env.decay = 0.5 + dmp * (1.2 + release/2);
    this.mod3.env.release = 0.8 + dmp * (2.2 + release);
  }

  // === Envelope triggering ===
  triggerAttack(freq, amp, time = null) {
    freq = Tone.Midi(freq).toFrequency();
    amp = amp / 127;

    const ops = [this.mod1, this.mod2, this.mod3];
    if (time) {
      this.env.triggerAttack(time);
      ops.forEach(op => op.env.triggerAttack(time));
      this.frequency.setValueAtTime(freq, time);
      this.velocitySig.setTargetAtTime(amp, time, 0.005);
    } else {
      this.env.triggerAttack();
      ops.forEach(op => op.env.triggerAttack());
      this.frequency.value = freq;
      this.velocitySig.rampTo(amp, 0.03);
    }
  }

  triggerRelease(time = null) {
    const ops = [this.mod1, this.mod2, this.mod3];
    if (time) {
      this.env.triggerRelease(time);
      ops.forEach(op => op.env.triggerRelease(time));
    } else {
      this.env.triggerRelease();
      ops.forEach(op => op.env.triggerRelease());
    }
  }

  triggerAttackRelease(freq, amp, dur = 0.01, time = null) {
    freq = Theory.mtof(freq);
    amp = amp / 127;
    const ops = [this.mod1, this.mod2, this.mod3];

    if (time) {
      this.env.triggerAttackRelease(dur, time);
      ops.forEach(op => op.env.triggerAttackRelease(dur, time));
      this.frequency.setValueAtTime(freq, time);
      this.velocitySig.setTargetAtTime(amp, time, 0.005);
    } else {
      this.env.triggerAttackRelease(dur);
      ops.forEach(op => op.env.triggerAttackRelease(dur));
      this.frequency.value = freq;
      this.velocitySig.rampTo(amp, 0.03);
    }
  }
}