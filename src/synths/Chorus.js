import * as Tone from 'tone';
import { EffectTemplate } from './EffectTemplate';
import { Parameter } from './ParameterModule.js';
// import ChorusPresets from './synthPresets/ChorusPresets.json';
import layout from './layouts/EffectLayout.json';
import {paramDefinitions} from './params/ChorusParams.js';

export class Chorus extends EffectTemplate {
  constructor(gui = null) {
    super();
    this.gui = gui;
    this.presets = {};
		this.synthPresetName = "ChorusPresets"
		this.accessPreset()
    this.name = "Chorus"
    this.layout = layout;
    this.backgroundColor = [100,0,100]

    this.input = new Tone.Gain();
    this.output = new Tone.Gain();
    this.wet = new Tone.Gain(0.5); // wet level control

    this.numVoices = 3;
    this.delays = [];
    this.lfos = [];
    this.depths = [];
    this.voiceGains = [];

    const baseDelay = 0.01; // 10ms
    const depth = 0.004;    // ±4ms
    const rate = 0.3;       // Hz

    for (let i = 0; i < this.numVoices; i++) {
      const delay = new Tone.Delay(baseDelay, 0.05);
      const lfo = new Tone.LFO({
        frequency: rate,
        min: -1,
        max: 1,
        phase: (360 / this.numVoices) * i
      }).start();

      const depthControl = new Tone.Gain(depth);
      lfo.connect(depthControl);
      depthControl.connect(delay.delayTime);

      this.delays.push(delay);
      this.lfos.push(lfo);
      this.depths.push(depthControl);
    }

    this.dryGain = new Tone.Gain(0.5); // starts at 50% mix
    this.wetGain = new Tone.Gain(0.5);

    this.input.fan(this.dryGain, ...this.delays.map(d => d)); // connect to dry and each delay

    this.dryGain.connect(this.output);
    this.wetGain.connect(this.output);

    // connect each delay to wet gain
    for (let i = 0; i < this.numVoices; i++) {
      const gain = new Tone.Gain(1 / this.numVoices);
      this.delays[i].connect(gain);
      gain.connect(this.wetGain);
    }

    // Parameter definitions
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    this.createAccessors(this, this.param);
    this.autocompleteList = this.paramDefinitions.map(def => def.name);

    setTimeout(() => {
      this.loadPreset('default');
    }, 500);
  }
}