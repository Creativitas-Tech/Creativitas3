/*
Delay.js

[Input] 
  ├──▶ [Level Gain]
  │
  └──▶ [Stereo Split]        │
         ├─▶ [Delay L]       │
         │     └─▶ [FB Gain]─┤
         │            ▲      │
         │         [LPF]     │
         │            ▲      │
         │         (Feedback from Delay L)
         │
         └─▶ [Delay R]
               └─▶ [FB Gain]
                      ▲
                   [LPF]
                      ▲
               (Feedback from Delay R)
  ▼
[Width Control]
  └───▶ [Output]
  */


import * as Tone from 'tone';
import { EffectTemplate } from './EffectTemplate';
import { Parameter } from './ParameterModule.js';
import DelayPresets from './synthPresets/Delay2Presets.json';
import layout from './layouts/EffectLayout.json';
import {paramDefinitions} from './params/Delay2Params.js';

export class Delay2 extends EffectTemplate {
  constructor(gui = null) {
    super();
    this.gui = gui;
    this.presets = {};
		this.synthPresetName = "Delay2Presets"
		this.accessPreset()
    this.name = "Delay2"
    this.layout = layout;
    this.backgroundColor = [0,0,50]
    this.feedbackAmount = 0
    this.timeSmoothing = .1 


    this.input = new Tone.Gain(1);
    this.highpass = new Tone.Filter({type:'highpass', frequency: 50, Q:0, rolloff:'-24'})
    this.output = new Tone.Gain(1);

    // Controls
    this.feedbackGain = new Tone.Gain()
    this.dampingFilter = new Tone.Filter({frequency:1000, type:'lowpass', Q:0, rolloff:"-24"});

    // Delay times
    const baseTime = .1; // in seconds

    this.delay = new Tone.Delay(.1,1.5);
    this.lfo = new Tone.LFO().start()

    this.input.connect(this.highpass)
    this.highpass.connect(this.dampingFilter)
    // Feedback path
    this.feedbackGain.connect(this.dampingFilter);
    this.dampingFilter.connect(this.delay); // feedback returns to both delays

    this.delay.connect(this.feedbackGain);

    this.delay.connect(this.output);
    this.lfo.connect(this.delay.delayTime)

    // Parameter definitions
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    this.createAccessors(this, this.param);
    this.autocompleteList = this.paramDefinitions.map(def => def.name);
    this.presetList = Object.keys(this.presets)
  }

  setTime(seconds) {
    this.delay.delayTime.rampTo( seconds, this.timeSmoothing)
  }
}