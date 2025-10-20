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
// import DelayPresets from './synthPresets/DelayPresets.json';
import layout from './layouts/EffectLayout.json';
import {paramDefinitions} from './params/DelayParams.js';

export class Delay extends EffectTemplate {
  constructor(gui = null) {
    super();
    this.gui = gui;
    this.presets = {};
		this.synthPresetName = "DelayPresets"
		this.accessPreset()
    this.name = "Delay"
    this.layout = layout;
    this.backgroundColor = [0,0,50]
    this.transferFunctions = this.generateCurves()
    this.widthValue = 0
    this.centerDelayTime = .1
    this.feedbackPath = 'post'
    this.feedbackAmount = 0
    this.timeSmoothing = .1 

    this.types = {
      "clean": {
        "distortionType": "soft",
        "feedbackPath": "post",
        "hicut": "100",
        "timeSmoothing": 0.0
      },
      "BBD": {
        "distortionType": "diode",
        "feedbackPath": "pre",
        "hicut": "200",
        "timeSmoothing": 0.1
      },
      "tape": {
        "distortionType": "tube",
        "feedbackPath": "pre",
        "hicut": "150",
        "timeSmoothing": 0.5
      },
      "fold": {
        "distortionType": "triangleFold",
        "feedbackPath": "post",
        "hicut": "200",
        "timeSmoothing": 0.001
      },
      "ambient": {
        "distortionType": "tanh",
        "feedbackPath": "post",
        "hicut": "400",
        "timeSmoothing": 1
      },
      "tube": {
        "distortionType": "sigmoid",
        "feedbackPath": "pre",
        "hicut": "20",
        "timeSmoothing": 0.5
      }
    }

    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);

    // Controls
    this.shaperGain = new Tone.Gain(0.5);
    this.shaper = new Tone.WaveShaper(this.transferFunctions['tanh']);
    this.highpass = new Tone.Filter({type:'highpass', rolloff:-12,Q:0,frequency:100})
    this.feedbackGainPre = new Tone.Gain(0);
    this.feedbackGainPost = new Tone.Gain(0);
    this.dampingFilter = new Tone.Filter(1000, 'lowpass');

    // Delay times
    const baseTime = .1; // in seconds
    const width = 0;
    const offset = baseTime * width * 0.3; // 30% offset for stereo spread

    this.delayL = new Tone.Delay(.1,1.5);
    this.delayR = new Tone.Delay(.1,1.5);

    this.input.connect(this.highpass)
    this.highpass.connect(this.shaper)
    this.shaper.connect(this.shaperGain)
    this.shaperGain.connect(this.dampingFilter)
    // Feedback path
    this.feedbackGainPre.connect(this.dampingFilter);
    this.feedbackGainPost.connect(this.dampingFilter);
    this.dampingFilter.fan(this.delayL, this.delayR); // feedback returns to both delays

    this.delayL.connect(this.feedbackGainPre);
    this.delayR.connect(this.feedbackGainPre);
    this.delayL.connect(this.feedbackGainPost);
    this.delayR.connect(this.feedbackGainPost);

    // Routing
    this.splitter = new Tone.Split();
    this.merger = new Tone.Merge();

    this.dampingFilter.connect(this.splitter);
    this.splitter.connect(this.delayL,0,0);
    this.splitter.connect(this.delayR,1,0);

    this.delayL.connect(this.merger,0,0);
    this.delayR.connect(this.merger,0,1);

    this.merger.connect(this.output);

    // Parameter definitions
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    this.createAccessors(this, this.param);
    this.autocompleteList = this.paramDefinitions.map(def => def.name);
    this.presetList = Object.keys(this.presets)
  }

  generateCurves(resolution = 1024) {
    const curves = {};

    // Helper
    const makeCurve = (fn) => {
      const curve = new Float32Array(resolution);
      for (let i = 0; i < resolution; i++) {
        const x = (i / (resolution - 1)) * 2 - 1; // from -1 to +1
        curve[i] = fn(x);
      }
      return curve;
    };

    curves.soft = makeCurve(x => x / (1 + Math.abs(x)));
    curves.tanh = makeCurve(x => Math.tanh(x));
    curves.hard = makeCurve(x => Math.max(-0.6, Math.min(0.6, x)));
    curves.fold = makeCurve(x => Math.sin(8 * x));
    curves.tube = makeCurve(x => (x < 0 ? Math.tanh(3 * x) : Math.pow(x, 0.6)));
    curves.arctangent = makeCurve(x => Math.atan(x * 3) / Math.atan(3));
    curves.sigmoid = makeCurve(x => 2 / (1 + Math.exp(-3 * x)) - 1);
    curves.triangleFold = makeCurve(x => 1 - 2 * Math.abs(Math.round(x) - x));
    curves.wrap = makeCurve(x => ((x * 2 + 1) % 2) - 1);
    curves.diode = makeCurve(x => x < 0 ? 0.3 * x : x);
    curves.parabias = makeCurve(x => x < 0 ? x : x - x * x);
    curves.step8 = makeCurve(x => Math.round(x * 8) / 8);
    curves.cubic = makeCurve(x => x - (1 / 3) * Math.pow(x, 3));
    curves.supersine = makeCurve(x => Math.sin(x * Math.PI * 0.5));
    curves.root = makeCurve(x => Math.sign(x) * Math.sqrt(Math.abs(x)));

    return curves;
  }

  setTime(seconds) {
    this.centerDelayTime = seconds
    let timeL = this.centerDelayTime * (1+this.widthValue);
    let timeR = this.centerDelayTime * (1-this.widthValue);
    if(timeL < 0 )timeL = 0
    if(timeR < 0 )timeR = 0
    this.delayL.delayTime.rampTo( timeL, this.timeSmoothing)
    this.delayR.delayTime.rampTo( timeR, this.timeSmoothing)
  }

  setWidth(value) {
    this.widthValue = value
    this.setTime(this.centerDelayTime)
  }

  setType = function(typeName) {
    const typeDef = this.types[typeName];
    if (!typeDef) return;

    // Set distortion curve
    if (typeDef.distortionType && this.transferFunctions[typeDef.distortionType]) {
      this.shaper.curve = this.transferFunctions[typeDef.distortionType];
    }

    // Set feedback path routing (if implemented)
    if (typeDef.feedbackPath) {
      this.feedbackPatch = typeDef.feedbackPath; // You must define this function
      this.feedbackGainPre.gain.value = 0
      this.feedbackGainPost.gain.value = 0
      this.feedback = this.feedbackAmount*3
    }

    // Set highpass (hicut) filter
    if (typeDef.hicut) {
      this.highpass.frequency.rampTo(parseFloat(typeDef.hicut), 0.1);
    }

    // Set smoothing when changing delay times
    if (typeDef.timeSmoothing) {
      this.timeSmoothing = parseFloat(typeDef.timeSmoothing)
    }

    // Optional: store current type
    this.currentType = typeName;
  };
}