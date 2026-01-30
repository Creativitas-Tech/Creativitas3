/*
FM4.js

Note: due to the way we handle poly voice allocation,
the top level .env of a patch must be the main envelope

*/

import * as Tone from 'tone';
import TwinklePresets from './synthPresets/TwinklePresets.json';
import { MonophonicTemplate } from './MonophonicTemplate.js';
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
    this.env_depth = new Tone.Multiply(1);
    this.env_depth.connect(this.carrier.vca.factor);
    this.env.connect(this.env_depth);
    this.vca = new Tone.Multiply()
    this.env.connect(this.vca.factor);

    this.output = new Tone.Multiply(1);
    this.vca.connect(this.output)
    this.carrier.connect(this.vca);

    // === Macro parameters ===
    this.harmonicityRatio = new Tone.Signal(1); // global harmonic multiplier
    this.transientAmount = new Tone.Signal(0.5); // transient index + release
    this.indexOfModulation = new Tone.Signal(0.5); // overall modulation depth
    this.dampingAmount = new Tone.Signal(0.5); // envelope damping for sustain mods
    this.detuneAmount = new Tone.Signal(0); // Hz or cents
    this.indexEnvDepthAmount = new Tone.Signal(0); // Hz or cents

    // === Velocity and key tracking ===
    this.velocitySig = new Tone.Signal();
    this.velocitySig.connect(this.env_depth.factor)
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

    // === operator macro sets ===
   this.operatorSets = [
      // 1 ───────────── Classic EP
      {
        name: "Classic EP",
        ratios: [1.0, 3.0, 2.0, 6.0],
        detunes: [0, 0.03, -0.02, 0.015],
        indexScalars: [1.0, 1.2, 0.8, 0.6],
        indexEnvDepths: [1.0, 1.3, 1.0, 0.8],
        envDecays: [1, 1, 1, 1.0].map(x=>x*4),
        attacks: [0., 0., 0.01, 0.02],
        feedbacks: [0.0, 0.0, 0.0, 0.0],
        algorithm: "3>2,1>0" // layered EP tone
      },

      // 2 ───────────── Bell Bright
      {
        name: "Bell Bright",
        ratios: [1.0, 2.5, 6.3, 9.0],
        detunes: [0, 0.1, -0.13, 0.1].map(x=>x*1),
        indexScalars: [1.0, .5,.4,.3].map(x=>x/2),
        indexEnvDepths: [1,.6,.5,.4].map(x=>x/3),
        envDecays: [0.1, 0.5, 0.9, 1.2].map(x=>x*4),
        attacks: [0.0, 0.0, 0.0, 0.02],
        feedbacks: [0.0, 0.03, 0.01, 0.01],
        algorithm: "1>2>3>0" // full chain, rich metallic bell
      },

      // 3 ───────────── Wood Marimba
      {
        name: "Wood Marimba",
        ratios: [1.0, 5.8, 2.9, 2],
        detunes: [0, 0.01, 0.01, -0.02],
        indexScalars: [1.0, 1.6, 1.0, 0.6].map(x=>x/2),
        indexEnvDepths: [1.2, 1.0, 0.8, 0.5].map(x=>x/2),
        envDecays: [0.15, 0.4, 0.8, 1.1],
        attacks: [0.005, 0.01, 0.02, 0.03],
        feedbacks: [0.01, 0.0, 0.0, 0.0],
        algorithm: "1>2>3,0" // pluck body + transient
      },

      // 4 ───────────── Acoustic Piano
      {
        name: "Acoustic Piano",
        ratios: [1.0, 8.0, 3.0, 2.0],
        detunes: [0, 0.015, -0.02, 0.025],
        indexScalars: [1.0, .6, 0.9, 1.2],
        indexEnvDepths: [1.0, 1.5, 1.0, 0.8],
        envDecays: [0.2, 0.35, 0.8, 1.3],
        attacks: [0.01, 0.005, 0.02, 0.04],
        feedbacks: [0.0015, 0.002, 0.0, 0.001],
        algorithm: "1>2>3>0" // deep cascade for hammer brightness
      },

      // 5 ───────────── Harp
      {
        name: "Harp",
        ratios: [1.0, 2.5, 5.0, 10.0],
        detunes: [0, 0.02, -0.015, 0.01],
        indexScalars: [1.0, 1.6, 1.2, 0.9].map(x=>x/2),
        indexEnvDepths: [1.4, 1.2, 0.9, 0.7].map(x=>x/2),
        envDecays: [0.1, 0.25, 0.6, 1.0],
        attacks: [0.001, 0.001, 0.01, 0.03],
        feedbacks: [0.0, .10, 0,0],
        algorithm: "1>3>2,0" // plucked clarity
      },

      // 6 ───────────── Guitar
      {
        name: "Guitar",
        ratios: [1.0, 5.05, 3.01, 2.0],
        detunes: [0, 0.01, 0.02, -0.015],
        indexScalars: [1.0, 1.4, 1.0, 0.7],
        indexEnvDepths: [1.2, 1.1, 0.9, 0.7],
        envDecays: [0.15, 0.3, 0.8, 1.0].map(x=>x*4),
        attacks: [0.008, 0.01, 0.02, 0.04],
        feedbacks: [0.01, .02, 0.0, 0.01],
        algorithm: "1>2>3,0" // 3-op body + clean carrier
      },

      // 7 ───────────── Slap Bass
      {
        name: "Slap Bass",
        ratios: [1.0, 1.0, 2.0, 4.0],
        detunes: [0, 0.005, -0.01, 0.008],
        indexScalars: [1.0, 2.0, 1.5, 0.8],
        indexEnvDepths: [1.8, 1.2, 0.9, 0.7],
        envDecays: [0.05, 0.25, 0.6, 1.0],
        attacks: [0.003, 0.005, 0.02, 0.03],
        feedbacks: [0.0, 0.03, 0.02, 0.01],
        algorithm: "3>2,1>0" // dual 2-op bass stack
      },

      // 8 ───────────── Flute
      {
        name: "Flute",
        ratios: [1.0, 4.0, 3.0, 2.0],
        detunes: [0, 0.003, -0.002, 0.004],
        indexScalars: [1.0, 0.6, 0.4, 0.3],
        indexEnvDepths: [0.8, 0.6, 0.5, 0.4],
        envDecays: [0.3, 0.5, 1.0, 1.5],
        attacks: [0.2, 0.1, 0.8, 0.1],
        feedbacks: [0.0, .0, 0.0, 0.0],
        algorithm: "3,1>2>0" // airy tone with soft harmonics
      },

      // 9 ───────────── Electric Guitar
      {
        name: "Electric Guitar",
        ratios: [1.0, 2.0, 4.0, 7.0],
        detunes: [0, 0.02, -0.015, 0.03],
        indexScalars: [1.0, 1.8, 1.2, 0.9],
        indexEnvDepths: [1.5, 1.2, 1.0, 0.8],
        envDecays: [0.1, 0.25, 0.7, 1.1],
        attacks: [0.006, 0.008, 0.02, 0.03],
        feedbacks: [0.02, 0.02, 0.01, 0.02],
        algorithm: "3>2,1>3,0" // fan-out shimmer
      },

      // 10 ───────────── Ambient Pad
      {
        name: "Ambient Pad",
        ratios: [1.0, 2.5, 2.01, 5.0],
        detunes: [0, 0.04, -0.02, 0.035].map(x=>x*2),
        indexScalars: [1.0, 0.9, 0.7, 0.5],
        indexEnvDepths: [0.8, 0.9, 0.7, 0.6],
        envDecays: [0.4, 0.8, 1.2, 1.6].map(x=>x*8),
        attacks: [0.2, 0.2, 0.5, 1].map(x=>x*2),
        feedbacks: [0.01, 0.002, 0.0, 0.0],
        algorithm: "3>2,1>0" // wide gentle spectrum
      }
    ];

    this.currentSet = 0; // index into operatorSets
    // initialize default mapping

    // === Param registration ===
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    //this.createAccessors(this, this.param);
    //this.autocompleteList = this.paramDefinitions.map(def => def.name);

    this.updateMacroMapping();
  }

  // === Macro mapping ===
  /*
  transientAmount scales the index, indexEnv, and decay of mod1
  ratios is the integer harmonicity of each oscillator
  indexScalars scales the index of each
  envDecays scales the decay of each
  detunes scales the detune of each oscillator
  indexEnvDepths scales the envDepth for each
  attacks scales the attack of each
  feedbacks sets the feedback of each operator
  */
  updateMacroMapping() {
    const h = this.harmonicityRatio.value;
    const tr = this.transientAmount.value;
    const idx = this.indexOfModulation.value;
    const dmp = this.dampingAmount.value;
    const det = this.detuneAmount.value;
    const env = this.indexEnvDepthAmount.value;
    const release = this.env.release;

    const set = this.operatorSets[this.currentSet];

    const { ratios, detunes, indexScalars, indexEnvDepths, envDecays, attacks, feedbacks } = set;

    // frequency ratios
    const r0 = h * ratios[0] + det * detunes[0];
    const r1 = h * ratios[1] + det * detunes[1];
    const r2 = h * ratios[2] + det * detunes[2];
    const r3 = h * ratios[3] + det * detunes[3];

    this.carrier.ratio.value = r0;
    this.mod1.ratio.value = r1;
    this.mod2.ratio.value = r2;
    this.mod3.ratio.value = r3;

    // indices
    this.mod1.index.value = idx * indexScalars[1] * (tr * 1) * (0.5 + 1 / r1);
    this.mod2.index.value = idx * indexScalars[2] * (0.2 + 1 / r2);
    this.mod3.index.value = idx * indexScalars[3] * (0.2 + 1 / r3);

    // index envelope depth
    this.mod1.indexEnvDepth.value = (tr * indexEnvDepths[1]) + 0.01;
    this.mod2.indexEnvDepth.value = env * indexEnvDepths[2] + 0.01;
    this.mod3.indexEnvDepth.value = env * indexEnvDepths[3] + 0.01;
    //console.log('envDepth', env, this.mod1.indexEnvDepth.value,this.mod2.indexEnvDepth.value,this.mod3.indexEnvDepth.value)

    // envelope shaping
    this.mod1.env.decay = envDecays[1] * (0.01 + tr * 0.35);
    this.mod1.env.release = envDecays[1] * (0.01 + tr * 0.5);
    this.mod2.env.decay = envDecays[2] * (0.3 + dmp * (0.8 + release / 2));
    this.mod2.env.sustain = dmp;
    this.mod2.env.release = envDecays[2] * (0.4 + dmp * (1.8 + release));
    this.mod3.env.sustain = dmp;
    this.mod3.env.decay = envDecays[3] * (0.5 + dmp * (1.2 + release / 2));
    this.mod3.env.release = envDecays[3] * (0.8 + dmp * (2.2 + release));
    //console.log('decay', this.mod1.env.decay,this.mod2.env.decay,this.mod3.env.decay)

    this.carrier.env.attack = attacks[0]
    this.mod1.env.attack = attacks[1] * (dmp<0.5 ? 0 : dmp)+0.001
    this.mod2.env.attack = attacks[2] * 1
    this.mod3.env.attack = attacks[3] * 2
    //console.log('attack', this.mod1.env.attack,this.mod2.env.attack,this.mod3.env.attack)

    this.carrier.feedback.factor.value = feedbacks[0]
    this.mod1.feedback.factor.value = feedbacks[1]
    this.mod2.feedback.factor.value = feedbacks[2]
    this.mod3.feedback.factor.value = feedbacks[3]
  }

  setOperatorSet(index) {
    this.currentSet = Math.max(0, Math.min(index, this.operatorSets.length - 1));
    this.updateMacroMapping();
    //console.log(`Operator set: ${this.operatorSets[this.currentSet].name}`);
    this.setAlgorithm()
  }

  setAlgorithm(algorithmString = null) {
    // If not provided, use the current operatorSet's algorithm
    if (!algorithmString) {
      const set = this.operatorSets[this.currentSet];
      if (!set || !set.algorithm) return;
      algorithmString = set.algorithm;
    }

    // --- Step 1: Clear all previous FM connections --- //
    [this.carrier, this.mod1, this.mod2, this.mod3].forEach(op => {
      const node = op?.modVca;
      if (node && node.numberOfOutputs > 0) {
        try {
          node.disconnect();
        } catch (e) {
          console.warn(`Could not disconnect ${op.name || 'operator'}`, e);
        }
      }
    });
    // --- Step 2: Helper mapping ---
    const ops = {
      0: this.carrier,
      1: this.mod1,
      2: this.mod2,
      3: this.mod3
    };

    // --- Step 3: Parse and connect ---
    // Split independent branches by commas
    const branches = algorithmString.split(",").map(str => str.trim());
    console.log(branches)
    for (let branch of branches) {
      // Split "3>2>1" into an array [3,2,1]
      const chain = branch.split(">").map(n => parseInt(n.trim())).filter(n => !isNaN(n));
      console.log(chain)
      // Connect sequentially down the chain
      for (let i = 0; i < chain.length; i++) {
        const source = ops[chain[i]];
        const target = ops[chain[i + 1]];
        //console.log(source, target)
        if (source && target) {
          source.modVca.connect(target.modInput);
          console.log(`Connected ${chain[i]} → ${chain[i+1]}`);
        } else if( source ){
          source.vca.connect(this.vca);
          console.log(`Connected ${chain[i]} → this.output`);
        
        }
      }
    }

    //console.log("Algorithm set to:", algorithmString);
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
  triggerRawAttack(freq, amp=1, time = null) {
    if(amp > 1) amp = 1
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

  triggerRawRelease(time = null) {
    const ops = [this.mod1, this.mod2, this.mod3];
    if (time) {
      this.env.triggerRelease(time);
      ops.forEach(op => op.env.triggerRelease(time));
    } else {
      this.env.triggerRelease();
      ops.forEach(op => op.env.triggerRelease());
    }
  }

  triggerRawAttackRelease(freq, amp=1, dur = 0.01, time = null) {
    const ops = [this.mod1, this.mod2, this.mod3];
    if(amp > 1) amp = 1
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