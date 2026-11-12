// Steampipe.js
import * as Tone from 'tone';
import presets from './presets.json';
import { MonophonicTemplate } from '../MonophonicTemplate.js';
import basicLayout from '../layouts/basicLayout.json';
import paramDefinitions from './params.js';
import { loadWaveguideWorklet } from './waveguideWorklet.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// Worklet params that are set directly (not audio-rate modulated)
const PIPE_DEFAULTS = {
  frequency: 100, loss: 0.5
};


/* =====================================================================
   SteampipeVoice: one voice (THE STEAM in Tone.js + THE PIPE worklet)
   ===================================================================== */
export class Waveguide extends MonophonicTemplate {
  constructor(color = [200, 200, 200]) {
    super();
    this.presets = presets;
    this.synthPresetName = '';
    this.isGlide = false;
    this.backgroundColor = [60, 60, 70];
    this.name = 'Waveguide';
    this.guiHeight = 2;
    this.layout = basicLayout;

    // ---- note-on state
    // NB: createAccessors() defines this.<paramName> for every entry in WaveguideParams.js,
    // so internal state must never reuse those names.
    this.note = 60;
    this.glideTime = 0;
    this.envSettings = { attack: 0.08, decay: 0.4, sustain: 0.85, release: 0.4 };
    this.velAmount = 0.5;
    this.unisonDetune = 0;
    this._state = { envKeytrack: 0, noiseCutoff: 96, noiseKeytrack: 0.5, fine: 0 };
    this.pipeValues = { ...PIPE_DEFAULTS };
    this.pipe = null;

    // ---- modulation buses (Tone.Add: base value = addend, mods connect to input)
    // Connecting a Signal/LFO straight to a Param zeroes its value in Tone; Add buses avoid that.
    this.mod = {
      frequency: new Tone.Add(220),
      delayMod:  new Tone.Add(0),
      push:      new Tone.Add(0.6),
      lpf:       new Tone.Add(36),
      hpf:       new Tone.Add(-12),
      genAmount: new Tone.Add(0.5),
      dcNoise:   new Tone.Add(0.15),
    };

    // ================= THE STEAM =================
    this.noise = new Tone.Noise('white').start();
    this.dcSig = new Tone.Signal(1);               // air pressure
    this.noiseLPF = new Tone.Filter({ type: 'lowpass', rolloff: -12, frequency: 2000, Q: 0 });
    this.dcNoiseMix = new Tone.CrossFade(0);       // a: DC, b: noise
    this.envVca = new Tone.Multiply(0);
    this.genGain = new Tone.Multiply(0);           // "output gain of the generator"

    this.env = new Tone.Envelope(this.envSettings);
    this.velScale = new Tone.Multiply(1);
    this.noiseEnvDepth = new Tone.Multiply(0);     // cents

    this.noise.connect(this.noiseLPF);
    this.dcSig.connect(this.dcNoiseMix.a);
    this.noiseLPF.connect(this.dcNoiseMix.b);
    this.dcNoiseMix.connect(this.envVca);
    this.envVca.connect(this.genGain);

    this.env.connect(this.velScale);
    this.velScale.connect(this.envVca.factor);
    this.env.connect(this.noiseEnvDepth);
    this.noiseEnvDepth.connect(this.noiseLPF.detune); // NB: env->cutoff only in 2-pole mode
    this.mod.genAmount.connect(this.genGain.factor);
    this.mod.dcNoise.connect(this.dcNoiseMix.fade);

    this.output = new Tone.Multiply(0.25);

    // ---- parameter setters (used by paramDefinitions callbacks)
    this.setters = {
      attack:  v => { this.envSettings.attack = v; },
      decay:   v => { this.envSettings.decay = v; },
      sustain: v => { this.envSettings.sustain = v; this.env.sustain = v; },
      release: v => { this.envSettings.release = v; },
      loss: (v) => this._bus('push', v),
    //   envKeytrack: v => { this._state.envKeytrack = v; },
    //   velocity: v => { this.velAmount = v; },
    //   dcNoise: (v, t) => this._bus('dcNoise', v, t),
    //   noiseCutoff: (v, t) => { this._state.noiseCutoff = v; this._updateNoiseFilter(t); },
    //   noiseQ: (v, t) => this.noiseLPF.Q.rampTo(v, 0.02, t ?? undefined),
    //   noiseKeytrack: (v, t) => { this._state.noiseKeytrack = v; this._updateNoiseFilter(t); },
    //   noiseEnv: v => { this.noiseEnvDepth.factor.value = v * 100; },
    //   genAmount: (v, t) => this._bus('genAmount', v, t),
    //   push: (v, t) => this._bus('push', v, t),
    //   lpf: (v, t) => this._bus('lpf', v, t),
    //   hpf: (v, t) => this._bus('hpf', v, t),
    //   delayMod: (v, t) => this._bus('delayMod', v, t),
    //   fbDecay: (v, t) => this.setPipe('decay', v, t),
    //   fbRelease: (v, t) => this.setPipe('release', v, t),
      
    //   fine:          (v, t) => { this._state.fine = v; this.setPipe('fine', v + this.unisonDetune, t); },
    //   unisonDetune:  (v, t) => { this.unisonDetune = v; this.setPipe('fine', this._state.fine + v, t); },
    };

    // ---- template boilerplate
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    this.createAccessors(this, this.param);
    this.autocompleteList = this.paramDefinitions.map(def => def.name);

    this.ready = loadWaveguideWorklet().then(() => this._buildPipe());
  }

  /** Waveguide **/
  _buildPipe() {
    const ctx = Tone.getContext();
    this.pipe = ctx.createAudioWorkletNode('waveguide', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
      channelCount: 1, channelCountMode: 'explicit',
    });
    for (const [k, v] of Object.entries(this.pipeValues)) this.pipe.parameters.get(k).value = v;
    // ['frequency', 'loss'].forEach(k => this.mod[k].connect(this.pipe.parameters.get(k)));
    this.genGain.connect(this.pipe);
    Tone.connect(this.pipe, this.output);
  }

  // ---------------- parameter plumbing
  applyParam(name, value, time = null) {
    const f = this.setters[name];
    if (f) f(value, time); else console.warn('Waveguide: unknown param', name);
  }
  setPipe(name, value, time = null) {
    this.pipeValues[name] = value;
    if (this.pipe) this.pipe.parameters.get(name).setValueAtTime(value, time ?? Tone.immediate());
  }
  _bus(name, value, time = null) {
    this.mod[name].addend.rampTo(value, 0.02, time ?? undefined);
  }
  _updateNoiseFilter(time = null) {
    const { noiseCutoff, noiseKeytrack } = this._state;
    const hz = clamp(mtof(noiseCutoff + noiseKeytrack * (this.note - 60)), 20, 20000);
    this.noiseLPF.frequency.setValueAtTime(hz, time ?? Tone.now());
  }
  _setPitch(note, t, glide) {
    this.setPipe('frequency', mtof(note))
    const f = this.mod.frequency.addend;
    const hz = mtof(note);
    f.cancelScheduledValues(t);
    if (glide > 0) f.exponentialRampTo(hz, glide, t);
    else f.setValueAtTime(hz, t);
  }
  _noteOnSettings(note, vel, t) {
    const k = Math.pow(2, -this._state.envKeytrack * (note - 60) / 12); // ENV keytrack
    const e = this.envSettings;
    this.env.attack = Math.max(0.001, e.attack * k);
    this.env.decay = Math.max(0.001, e.decay * k);
    this.env.sustain = e.sustain;
    this.env.release = Math.max(0.001, e.release * k);
    const v = vel / 127;
    this.velScale.factor.setValueAtTime(1 - this.velAmount + this.velAmount * v, t);
    this._updateNoiseFilter(t);
  }

  // ---------------- triggers
  triggerAttack(val, vel = 100, time = null) {
    const t = time ?? Tone.now();
    this.note = val;
    this._setPitch(val, t, this.glideTime);
    // this._noteOnSettings(val, vel, t);
    // this.setPipe('gate', 1, t);
    this.env.triggerAttack(t);
  }
  legatoTo(val, time = null) {                 // pitch change without retrigger
    const t = time ?? Tone.now();
    this.note = val;
    this._setPitch(val, t, this.glideTime);
    this._updateNoiseFilter(t);
  }
  triggerRelease(val, time = null) {
    const t = time ?? Tone.now();
    this.env.triggerRelease(t);
    // this.setPipe('gate', 0, t);
  }
  triggerAttackRelease(val, vel = 100, dur = 0.01, time = null) {
    const t = time ?? Tone.now();
    this.triggerAttack(val, vel, t);
    this.triggerRelease(val, t + Tone.Time(dur).toSeconds());
  }

  dispose() {
    if (this.pipe) this.pipe.disconnect();
    [this.noise, 
     this.noiseLPF, this.dcNoiseMix, this.envVca, this.genGain,
     this.env, this.velScale, this.noiseEnvDepth, this.output, ...Object.values(this.mod)]
      .forEach(n => n.dispose());
  }
}