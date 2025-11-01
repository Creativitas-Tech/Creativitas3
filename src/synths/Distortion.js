/*
Distortion fx

input->highpassA->feedbackReturn->drive->lowpass->shaper1->
->highpassB->biasAdder->shaper2->toneShelf->(output,feedbackSend)
feedbackSend->feedbackDelay->feedbackGain->feedbackReturn

*/



import * as Tone2 from 'tone';
import { EffectTemplate } from './EffectTemplate';
import { Parameter } from './ParameterModule.js';
// import DistortionPresets from './synthPresets/DistortionPresets.json';
import layout from './layouts/EffectLayout.json';
import {paramDefinitions} from './params/distortionParams.js';

export class Distortion extends EffectTemplate {
  constructor(gui = null) {
    super();
    this.gui = gui;
    this.presets = {};
		this.synthPresetName = "DistortionPresets"
		//this.accessPreset()
    this.name = "Distortion";
    this.layout = layout;
    this.backgroundColor = [100,0,0]
    this.transferFunctions = this.generateDistortionCurves()
    this.outputFactor = 1

    this.input = new Tone2.Gain();
    this.dry = new Tone2.Gain()
    this.outputCut = new Tone2.Signal(0)
    this.outputLevel = new Tone2.Signal(1)
    this.output = new Tone2.Gain();

    // --- Filters and gain stages ---
    this.highpassA = new Tone2.Filter(80, "highpass");
    this.driveGain = new Tone2.Gain(5); // drive control
    this.lowpassFilter = new Tone2.Filter(8000, "lowpass");

    this.shaper1 = new Tone2.WaveShaper(this.transferFunctions['tanh']);
    this.highpassB = new Tone2.Filter(150, "highpass");

    this.biasSignal = new Tone2.Signal(0);
    this.biasAdder = new Tone2.Add();

    this.shaper2 = new Tone2.WaveShaper();

    this.toneShelf = new Tone2.Filter(1000, "highshelf");
    this.feedbackSend = new Tone2.Gain();
    this.feedbackDelay = new Tone2.Delay({'delayTime':0,'maxDelay':0.001})
    this.feedbackGain = new Tone2.Gain(0);
    this.feedbackReturn = new Tone2.Add();

    // Signal chain
    this.input.connect(this.highpassA);
    this.input.connect(this.dry)

    this.highpassA.connect(this.feedbackReturn);
    this.feedbackReturn.connect(this.driveGain);
    this.driveGain.connect(this.lowpassFilter);
    this.lowpassFilter.connect(this.shaper1);
    this.shaper1.connect(this.highpassB);

    this.highpassB.connect(this.biasAdder);
    this.biasSignal.connect(this.biasAdder.addend);
    this.biasAdder.connect(this.shaper2);
    this.shaper2.connect(this.toneShelf);
    
    this.outputCut.connect(this.output.gain)
    this.outputLevel.connect(this.output.gain)
    this.toneShelf.connect(this.output);
    this.dry.connect(this.output)

    // Feedback loop
    this.toneShelf.connect(this.feedbackSend);
    this.feedbackSend.connect(this.feedbackDelay);
    this.feedbackDelay.connect(this.feedbackGain);
    this.feedbackGain.connect(this.feedbackReturn.addend);

    // Parameter definitions
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    this.createAccessors(this, this.param);
    this.autocompleteList = this.paramDefinitions.map(def => def.name);
    this.presetList = Object.keys(this.presets)
    // setTimeout(() => {
    //   this.loadPreset('default');
    // }, 500);
  }


  generateDistortionCurves(resolution = 1024) {
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
    curves.fold = makeCurve(x => Math.sin(3 * x));
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
}