/*
FM.js

Note: due to the way we handle poly voice allocation,
the top level .env of a patch must be the main envelope
┌──────────────────────────┐
│        FMOperator        │
└──────────────────────────┘
Inputs:
- frequency (signal)
- modInput (signal)
- ratio (signal)
- index (signal)
- indexEnvDepth (signal)

Outputs:
- vca (audio)
- modVca (FM)
                           
                (Fundamental frequency input)
                             │
                             ▼
                     ┌────────────┐
                     │  Multiply  │◄── ratio
                     │ (f₀ * r)   │
                     └────────────┘
                             │
            base frequency ──┘
                             │
                             ▼
           ┌────────────────────────────────────┐
           │          Frequency Sum             │
           │                                    │
modInput──►┘                                    │
           │                                    │
           │                                    │
           ▼                                    ▼
      ┌──────────────────────────────┐ ┌─────────────────┐
      │   Add (base + modulated)     │ │   Mod Depth     │
      │   → final oscillator freq    │ │        (*)      │
      └──────────────────────────────┘ └─────────────────┘
                             │                  │
                             ▼                  ▼
                  ┌─────────────────┐ ┌─────────────────┐
                  │   Oscillator    │ │   Mod Depth     │
                  │   (sine wave)   │ │        (*)      │
                  └─────────────────┘ └─────────────────┘
                             │                   │
                             ▼                   ▼ to vca.factor
                  ┌─────────────────┐
                  │       VCA       │
                  │   (Multiply)    │
                  └─────────────────┘
                             │
                             ▼──► (to audio or next mod input)

*/

import * as Tone from 'tone';
import TwinklePresets from './synthPresets/TwinklePresets.json';
import { MonophonicTemplate } from './MonophonicTemplate.js';
import {Parameter} from './ParameterModule.js'
import basicLayout from './layouts/halfLayout.json';
import paramDefinitions from './params/FM2OpParams.js';
import {Theory} from '../TheoryModule.js'
 
export class FMOperator {
  constructor({
    ratio = 1,
    modDepth = 0,
    envDepth = 1,
    waveform = "sine"
  } = {}) {
    // === Core Parameters ===
    this.ratio = new Tone.Signal(ratio); //harmonicity
    this.index = new Tone.Signal(modDepth); //index when used as modulator
    this.envDepth = new Tone.Signal(envDepth); //amplitude when used as carrier
    this.indexEnvDepth = new Tone.Signal(0); //amplitude when used as carrier

    // === Input signals ===
    this.frequency = new Tone.Signal(440); // fundamental, in Hz
    this.modInput = new Tone.Signal(0);    // modulation from other ops

    // === Frequency computation ===
    // operator frequency = fundamental * ratio
    this.operatorFreq = new Tone.Multiply();
    this.frequency.connect(this.operatorFreq);
    this.ratio.connect(this.operatorFreq.factor);

    // sum: base frequency + modulation
    this.freqSum = new Tone.Signal();
    this.operatorFreq.connect(this.freqSum);
    this.modInput.connect(this.freqSum);

    // === Oscillator ===
    this.carrier = new Tone.Oscillator().start();

    // set oscillator frequency dynamically
    this.freqSum.connect(this.carrier.frequency);

    // === Amplitude Envelope ===
    this.env = new Tone.Envelope({
      attack: 0.01,
      decay: 0.1,
      sustain: 0.8,
      release: 0.3
    });

    // scale envelope by envDepth
    this.envScale = new Tone.Multiply();
    this.env.connect(this.envScale);
    this.envDepth.connect(this.envScale.factor);

    // === VCA (output stage) ===
    this.vca = new Tone.Multiply();
    this.carrier.connect(this.vca);
    this.envScale.connect(this.vca.factor);

    // === Freq Modulation ===
    //modEnvDepth = operatorFreq * modDepth
    this.envIndex = new Tone.Multiply();
    this.operatorFreq.connect(this.envIndex.factor);
    this.env.connect(this.envIndex);
    this.indexEnvDepthScalar = new Tone.Multiply()
    this.envIndex.connect(this.indexEnvDepthScalar)
    this.indexEnvDepth.connect(this.indexEnvDepthScalar.factor)

    //indexAmount = operatorFreq * index 
    this.indexAmount = new Tone.Multiply();
    this.index.connect(this.indexAmount)
    this.operatorFreq.connect(this.indexAmount.factor)

    // === Mod VCA (modulation output stage) ===
    //modVcaFactor = modEnvDepth + indexAmount
    this.modVca = new Tone.Multiply();
    this.indexAmount.connect(this.modVca.factor);
    this.indexEnvDepthScalar.connect(this.modVca.factor);
    this.carrier.connect(this.modVca);

    // === Feedback ===
    this.feedback = new Tone.Multiply()
    this.feedbackDelay = new Tone.Delay(0,0.001)
    this.feedbackMult = new Tone.Multiply()
    this.vca.connect(this.feedbackDelay)
    this.feedbackDelay.connect(this.feedback)
    this.feedback.connect(this.feedbackMult)
    this.frequency.connect(this.feedbackMult.factor)
    this.feedbackMult.connect(this.carrier.frequency)

    // === Public outputs ===
    this.output = this.vca;      // audio out
    this.modOut = this.modVca;      // modulation out (same as audio)
  }

  connect(destination) {
        if (destination.input) {
            this.output.connect(destination.input);
        } else {
            this.output.connect(destination);
        }
    }

    /**
     * Disconnects from Tone.js destination
     * @param {object} destination - Tone.js destination object
     * @returns {void}
     * @example
     * const amp = new Tone.Gain(0.5).toDestination();
     * synth.connect(amp)
     * synth.disconnect(amp)
     */
    disconnect(destination) {
        if (destination.input) {
            this.output.disconnect(destination.input);
        } else {
            this.output.disconnect(destination);
        }
    }
}

export class FM extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
		this.presets = TwinklePresets
		this.synthPresetName = "TwinklePresets"
		//this.accessPreset()
    this.isGlide = false
    this.name = "FM"
    this.guiHeight = 0.5
    this.layout = basicLayout
    //console.log(this.name, " loaded, available preset: ", this.presets)

    // Initialize the main frequency control
    this.frequency = new Tone.Signal(200);

    // VCOs
    this.carrier = new FMOperator()
    this.modulator = new FMOperator()
    this.frequency.connect(this.carrier.frequency)
    this.frequency.connect(this.modulator.frequency)

    //FM
    this.modulator.modVca.connect(this.carrier.modInput)

    // VCF, VCA, output
    this.env = new Tone.Envelope()
    this.env.connect(this.carrier.vca.factor)
    this.vca = new Tone.Multiply(1)
    this.output = new Tone.Multiply(1)
    this.carrier.connect(this.output)

    //FM control
    this.indexOfModulation = new Tone.Signal()
    this.indexOfModulation.connect(this.modulator.index)
    this.harmonicityRatio = new Tone.Signal()
    this.harmonicityRatio.connect(this.modulator.ratio)
    this.indexEnvDepth = new Tone.Signal()
    this.indexEnvDepth.connect(this.modulator.indexEnvDepth)
    this.keyTrackingAmount = new Tone.Signal()
    this.keyTracker = new Tone.Multiply(.1)
    this.frequency.connect(this.keyTracker)
    this.keyTrackingAmount.connect(this.modulator.indexAmount)
    //this.keyTracker.connect(this.modulator.indexAmount)
    this.velocitySig = new Tone.Signal()

    // // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    //console.log(this.paramDefinitions)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
   this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    //setTimeout(()=>{this.loadPreset('default')}, 500);
  }//constructor

  //envelopes
  triggerAttack (freq, amp, time=null){
    freq = Tone.Midi(freq).toFrequency()
    amp = amp/127
    if(time){
      this.env.triggerAttack(time)
      this.modulator.env.triggerAttack(time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.linearRampToValueAtTime(amp, time + 0.01);
    } else {
      this.env.triggerAttack()
      this.modulator.env.triggerAttack()
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }
  triggerRelease (time=null){
    if(time) {
    	this.env.triggerRelease(time)
      this.modulator.env.triggerRelease(time)
    }
    else {
      this.env.triggerRelease()
      this.modulator.env.triggerRelease()
    }
  }
  triggerAttackRelease (freq, amp, dur=0.01, time=null){
    //console.log('AR ',freq,amp,dur,time)
    //freq = Tone.Midi(freq).toFrequency()
    freq = Theory.mtof(freq)
    
    amp = amp/127
    if(time){
      this.env.triggerAttackRelease(dur,time)
      this.modulator.env.triggerAttackRelease(dur,time)
      this.frequency.setValueAtTime(freq, time)
      //this.velocitySig.cancelScheduledValues(time);
      this.velocitySig.setTargetAtTime(amp, time, 0.005); // 0.03s time constant for smoother fade
      //this.velocitySig.linearRampToValueAtTime(amp, time + 0.005);
    } else{
      this.env.triggerAttackRelease(dur)
      this.modulator.env.triggerAttackRelease(dur)
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }//attackRelease
}