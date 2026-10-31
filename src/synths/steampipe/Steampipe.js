// Steampipe.js
import * as Tone from 'tone';
import SteampipePresets from '../synthPresets/TwinklePresets.json';
import { MonophonicTemplate } from '../MonophonicTemplate.js';
import basicLayout from '../layouts/basicLayout.json';
import paramDefinitions from './params.js';
import { loadSteampipeWorklets } from './steampipeWorklets.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// Worklet params that are set directly (not audio-rate modulated)
const PIPE_DEFAULTS = {
  gate: 0, tune: 0, fine: 0, decay: 4, release: 0.3, polarity: 0, saturation: 0.3,
  symmetry: 0, symMode: 0, stiffness: 0, split: 0, splitPoint: 0.5,
  filterKeytrack: 1, hpComp: 1, lpComp: 1,
};
const PIPE_PASSTHRU = ['tune', 'polarity', 'saturation', 'symmetry', 'symMode', 'stiffness',
  'split', 'splitPoint', 'filterKeytrack', 'hpComp', 'lpComp'];

/* =====================================================================
   SteampipeVoice: one voice (THE STEAM in Tone.js + THE PIPE worklet)
   ===================================================================== */
export class SteampipeVoice extends MonophonicTemplate {
  constructor(color = [200, 200, 200]) {
    super();
    this.presets = SteampipePresets;
    this.synthPresetName = 'SteampipePresets';
    this.isGlide = false;
    this.backgroundColor = [60, 60, 70];
    this.name = 'Steampipe';
    this.guiHeight = 2;
    this.layout = basicLayout;

    // ---- note-on state
    // NB: createAccessors() defines this.<paramName> for every entry in steampipeParams.js,
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
      envKeytrack: v => { this._state.envKeytrack = v; },
      velocity: v => { this.velAmount = v; },
      dcNoise: (v, t) => this._bus('dcNoise', v, t),
      noiseCutoff: (v, t) => { this._state.noiseCutoff = v; this._updateNoiseFilter(t); },
      noiseQ: (v, t) => this.noiseLPF.Q.rampTo(v, 0.02, t ?? undefined),
      noiseKeytrack: (v, t) => { this._state.noiseKeytrack = v; this._updateNoiseFilter(t); },
      noiseEnv: v => { this.noiseEnvDepth.factor.value = v * 100; },
      genAmount: (v, t) => this._bus('genAmount', v, t),
      push: (v, t) => this._bus('push', v, t),
      lpf: (v, t) => this._bus('lpf', v, t),
      hpf: (v, t) => this._bus('hpf', v, t),
      delayMod: (v, t) => this._bus('delayMod', v, t),
      fbDecay: (v, t) => this.setPipe('decay', v, t),
      fbRelease: (v, t) => this.setPipe('release', v, t),
      
      fine:          (v, t) => { this._state.fine = v; this.setPipe('fine', v + this.unisonDetune, t); },
      unisonDetune:  (v, t) => { this.unisonDetune = v; this.setPipe('fine', this._state.fine + v, t); },
    };
    PIPE_PASSTHRU.forEach(k => { this.setters[k] = (v, t) => this.setPipe(k, v, t); });

    // ---- template boilerplate
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    this.createAccessors(this, this.param);
    this.autocompleteList = this.paramDefinitions.map(def => def.name);

    this.ready = loadSteampipeWorklets().then(() => this._buildPipe());
  }

  /** steampipe **/
  _buildPipe() {
    const ctx = Tone.getContext();
    this.pipe = ctx.createAudioWorkletNode('steampipe-pipe', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
      channelCount: 1, channelCountMode: 'explicit',
    });
    for (const [k, v] of Object.entries(this.pipeValues)) this.pipe.parameters.get(k).value = v;
    ['frequency', 'delayMod', 'push', 'lpf', 'hpf']
      .forEach(k => this.mod[k].connect(this.pipe.parameters.get(k)));
    this.genGain.connect(this.pipe);
    Tone.connect(this.pipe, this.output);
  }

  /** waveguide **/
  // _buildPipe() {
  //   const ctx = Tone.getContext();
  //   this.pipe = ctx.createAudioWorkletNode('waveguide', {
  //     numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
  //     channelCount: 1, channelCountMode: 'explicit',
  //   });
  //   // for (const [k, v] of Object.entries(this.pipeValues)) this.pipe.parameters.get(k).value = v;
  //   ['frequency'].forEach(k => this.mod[k].connect(this.pipe.parameters.get(k)));
  //   this.genGain.connect(this.pipe);
  //   Tone.connect(this.pipe, this.output);
  // }

  // ---------------- parameter plumbing
  applyParam(name, value, time = null) {
    const f = this.setters[name];
    if (f) f(value, time); else console.warn('Steampipe: unknown param', name);
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
    this._noteOnSettings(val, vel, t);
    this.setPipe('gate', 1, t);
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
    this.setPipe('gate', 0, t);
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

/* =====================================================================
   THE MODULATOR: morphing LFO with delay & sync
   ===================================================================== */
const SYNC_DIVISIONS = ['4m', '2m', '1m', '2n', '4n', '4t', '8n', '8t', '16n', '16t', '32n'];

class SteampipeLFO {
  constructor() {
    this.types = ['sine', 'triangle', 'sawtooth', 'square'];
    this.oscs = this.types.map(type => new Tone.LFO({ type, frequency: 1, min: -1, max: 1 }));
    this.weights = this.types.map((_, i) => new Tone.Gain(i === 0 ? 1 : 0));
    this.fade = new Tone.Gain(1);           // DELAY (fade-in)
    this.amount = new Tone.Multiply(0);
    this.amountBus = new Tone.Add(0);       // panel AMOUNT + mod matrix
    this.amountBus.connect(this.amount.factor);
    this.output = new Tone.Multiply(0);     // destination scaling
    this.oscs.forEach((o, i) => { o.connect(this.weights[i]); this.weights[i].connect(this.fade); });
    this.fade.connect(this.amount);
    this.amount.connect(this.output);
    const t = Tone.now();
    this.oscs.forEach(o => o.start(t));
    this.speed = 0.5; this.sync = false; this.delayTime = 0;
  }
  setShape(x) { // 0 sine, 1 tri, 2 saw, 3 square; in-between values morph
    this.weights.forEach((w, i) => w.gain.rampTo(Math.max(0, 1 - Math.abs(x - i)), 0.02));
  }
  setSpeed(v) { // normalized 0..1
    this.speed = v;
    const hz = this.sync
      ? Tone.Time(SYNC_DIVISIONS[Math.round(v * (SYNC_DIVISIONS.length - 1))]).toFrequency()
      : 0.02 * Math.pow(1000, v); // 0.02–20 Hz
    this.oscs.forEach(o => { o.frequency.value = hz; });
  }
  setSync(on) { this.sync = !!on; this.setSpeed(this.speed); }
  setAmount(v) { this.amountBus.addend.rampTo(v, 0.02); }
  trigger(t) {
    if (this.delayTime <= 0) return;
    const g = this.fade.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(1, t + this.delayTime);
  }
  route(targets, scale) {
    this.output.disconnect();
    this.output.factor.value = scale;
    targets.forEach(tg => this.output.connect(tg));
  }
}

const LFO_DESTINATIONS = {
  none: null,
  pitch:     { bus: 'delayMod',  scale: 2 },   // ±2 st at amount 1 (vibrato)
  lpf:       { bus: 'lpf',       scale: 24 },
  hpf:       { bus: 'hpf',       scale: 24 },
  push:      { bus: 'push',      scale: 1 },
  generator: { bus: 'genAmount', scale: 0.5 },
  dcNoise:   { bus: 'dcNoise',   scale: 0.5 },
  reverbMix: { global: 'reverbMix', scale: 0.5 },
};
// manual: Generator Amount, Delay Mod, LPF Mod, HPF Mod, Reverb Mix, LFO1–5 amount
const MOD_DESTINATIONS = {
  generator: { bus: 'genAmount', scale: 1 },
  delay:     { bus: 'delayMod',  scale: 2 },
  lpf:       { bus: 'lpf',       scale: 36 },
  hpf:       { bus: 'hpf',       scale: 36 },
  reverbMix: { global: 'reverbMix', scale: 1 },
  lfo1: { lfo: 0, scale: 1 }, lfo2: { lfo: 1, scale: 1 }, lfo3: { lfo: 2, scale: 1 },
  lfo4: { lfo: 3, scale: 1 }, lfo5: { lfo: 4, scale: 1 },
};

/* =====================================================================
   Steampipe: 8-voice wrapper (voice modes, reverb, LFOs, mod matrix)
   ===================================================================== */
export class Steampipe {
  constructor(numVoices = 8) {
    this.name = 'Steampipe';
    this.numVoices = numVoices;
    this.voices = Array.from({ length: numVoices }, () => new SteampipeVoice());

    // voices -> panners (VOICE SPREAD) -> PATCH VOLUME -> REVERBERATOR -> VOLUME
    this.panners = this.voices.map(() => new Tone.Panner(0));
    this.patchVolume = new Tone.Gain(0.7);
    this.voices.forEach((v, i) => { v.output.connect(this.panners[i]); this.panners[i].connect(this.patchVolume); });

    this.reverbIn = new Tone.Gain(1);
    this.reverbOut = new Tone.Gain(1);
    this.reverbMix = new Tone.Add(0.3);
    this.reverbValues = { size: 0.5, low: 0.6, high: 0.5, spin: 0.3, spread: 1 };
    this.reverbBypassed = false;
    this.reverb = null;
    this.patchVolume.connect(this.reverbIn);
    this.reverbIn.connect(this.reverbOut); // dry until the worklet loads
    this.output = new Tone.Gain(0.8);
    this.reverbOut.connect(this.output);
    this.scope = new Tone.Waveform(1024);  // SCOPE menu
    this.output.connect(this.scope);
    this.globalBus = { reverbMix: this.reverbMix };

    // LFOs + mod matrix sources A–D
    this.lfos = Array.from({ length: 5 }, () => new SteampipeLFO());
    this.modSources = { A: new Tone.Signal(0), B: new Tone.Signal(0), C: new Tone.Signal(0), D: new Tone.Signal(0) };
    this.ccToSource = { 1: 'A', 2: 'B', 11: 'C', 4: 'D' }; // mod wheel, breath, expression, foot
    this.modRoutes = {};

    this.bendRange = 2;
    this.pitchBend = new Tone.Signal(0);
    this.voices.forEach(v => this.pitchBend.connect(v.mod.delayMod));

    // voice management
    this.voiceMode = 'poly';
    this.legato = false; this.portamento = false; this.glide = 0.1;
    this.voiceNotes = new Array(numVoices).fill(-1);
    this.voiceAge = new Array(numVoices).fill(0);
    this.busyUntil = new Array(numVoices).fill(0);
    this.age = 0; this.rr = 0;
    this.held = []; this.lastVel = 100;
    this.sustainOn = false; this.sustained = new Set();

    this.globalSetters = {
      patchVolume: v => this.patchVolume.gain.rampTo(v, 0.02),
      volume: v => this.output.gain.rampTo(v, 0.02),
      voiceMode: v => { this.panic(); this.voiceMode = typeof v === 'number' ? ['poly', 'mono', 'unison'][v] : v; },
      glide: v => { this.glide = v; this._applyGlide(); },
      portamento: v => { this.portamento = !!v; this._applyGlide(); },
      legato: v => { this.legato = !!v; },
      detune: v => this.voices.forEach((voice, i) => voice.applyParam('unisonDetune', v * this._spreadPos(i))), // cents
      voiceSpread: v => this.panners.forEach((p, i) => p.pan.rampTo(v * this._spreadPos(i), 0.05)),
      reverbSize: v => this._setReverb('size', v),
      reverbLow: v => this._setReverb('low', v),
      reverbHigh: v => this._setReverb('high', v),
      reverbSpin: v => this._setReverb('spin', v),
      reverbSpread: v => this._setReverb('spread', v),
      reverbMix: v => this.reverbMix.addend.rampTo(v, 0.02),
      reverbBypass: v => { this.reverbBypassed = !!v; this._routeReverb(); },
      bendRange: v => { this.bendRange = v; },
    };

    this.ready = Promise.all(this.voices.map(v => v.ready)).then(() => this._buildReverb());
  }

  // ---------------- params
  applyParam(name, value, time = null) {
    if (name in this.globalSetters) this.globalSetters[name](value, time);
    else this.voices.forEach(v => v.applyParam(name, value, time));
  }
  set(name, value, time = null) { this.applyParam(name, value, time); }
  loadSettings(obj) { Object.entries(obj).forEach(([k, v]) => this.applyParam(k, v)); }

  _spreadPos(i) { // alternate L/R: ±1/4, ±2/4 … for 8 voices
    return ((i % 2) ? 1 : -1) * (Math.floor(i / 2) + 1) / Math.ceil(this.numVoices / 2);
  }
  _applyGlide() { this.voices.forEach(v => { v.glideTime = this.portamento ? this.glide : 0; }); }

  // ---------------- reverb
  _buildReverb() {
    this.reverb = Tone.getContext().createAudioWorkletNode('steampipe-reverb', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2],
      channelCount: 2, channelCountMode: 'explicit',
    });
    for (const [k, v] of Object.entries(this.reverbValues)) this.reverb.parameters.get(k).value = v;
    this.reverbMix.connect(this.reverb.parameters.get('mix'));
    Tone.connect(this.reverb, this.reverbOut);
    this._routeReverb();
  }
  _setReverb(name, v) {
    this.reverbValues[name] = v;
    if (this.reverb) this.reverb.parameters.get(name).setValueAtTime(v, Tone.immediate());
  }
  _routeReverb() {
    this.reverbIn.disconnect();
    if (this.reverb && !this.reverbBypassed) this.reverbIn.connect(this.reverb);
    else this.reverbIn.connect(this.reverbOut);
  }

  // ---------------- modulation
  _targets(spec) {
    if (!spec) return [];
    if (spec.bus) return this.voices.map(v => v.mod[spec.bus]);
    if (spec.global) return [this.globalBus[spec.global]];
    if (spec.lfo !== undefined) return [this.lfos[spec.lfo].amountBus];
    return [];
  }
  setLFO(i, { destination, speed, amount, delay, shape, sync } = {}) {
    const l = this.lfos[i];
    if (shape !== undefined) l.setShape(shape);
    if (sync !== undefined) l.setSync(sync);
    if (speed !== undefined) l.setSpeed(speed);
    if (amount !== undefined) l.setAmount(amount);
    if (delay !== undefined) l.delayTime = delay;
    if (destination !== undefined) {
      const spec = LFO_DESTINATIONS[destination];
      l.route(this._targets(spec), spec ? spec.scale : 0);
    }
  }
  setModRoute(destination, source, depth = 1) { // one source per destination, like the MIDI MOD menu
    const spec = MOD_DESTINATIONS[destination];
    if (!spec) return console.warn('Steampipe: unknown mod destination', destination);
    if (this.modRoutes[destination]) { this.modRoutes[destination].dispose(); delete this.modRoutes[destination]; }
    if (!source) return;
    const m = new Tone.Multiply(depth * spec.scale);
    this.modSources[source].connect(m);
    this._targets(spec).forEach(t => m.connect(t));
    this.modRoutes[destination] = m;
  }
  assignCC(source, cc) {
    for (const k of Object.keys(this.ccToSource)) if (this.ccToSource[k] === source) delete this.ccToSource[k];
    this.ccToSource[cc] = source;
  }
  handleCC(cc, value) {
    const s = this.ccToSource[cc];
    if (s) this.modSources[s].rampTo(value / 127, 0.01);
    if (cc === 64) this.setSustain(value >= 64);
  }
  setPitchBend(v) { this.pitchBend.rampTo(v * this.bendRange, 0.01); } // v in -1..1

  // ---------------- voice allocation
  _allocVoice(note, t) {
    let idx = this.voiceNotes.indexOf(note);
    if (idx < 0) {
      for (let k = 0; k < this.numVoices; k++) {
        const i = (this.rr + k) % this.numVoices;
        if (this.voiceNotes[i] < 0 && this.busyUntil[i] <= t) { idx = i; break; }
      }
    }
    if (idx < 0) idx = this.voiceAge.indexOf(Math.min(...this.voiceAge)); // steal oldest
    this.rr = (idx + 1) % this.numVoices;
    this.voiceNotes[idx] = note;
    this.voiceAge[idx] = ++this.age;
    return idx;
  }
  _monoTargets() { return this.voiceMode === 'unison' ? this.voices : [this.voices[0]]; }

  triggerAttack(note, vel = 100, time = null) {
    const t = time ?? Tone.now();
    if (this.held.length === 0) this.lfos.forEach(l => l.trigger(t));
    this.held = this.held.filter(n => n !== note);
    this.held.push(note);
    this.sustained.delete(note);
    this.lastVel = vel;
    if (this.voiceMode === 'poly') {
      this.voices[this._allocVoice(note, t)].triggerAttack(note, vel, t);
    } else {
      const legato = this.legato && this.held.length > 1;
      this._monoTargets().forEach(v => legato ? v.legatoTo(note, t) : v.triggerAttack(note, vel, t));
    }
  }
  triggerRelease(note, time = null) {
    const t = time ?? Tone.now();
    this.held = this.held.filter(n => n !== note);
    if (this.sustainOn) { this.sustained.add(note); return; }
    this._release(note, t);
  }
  _release(note, t) {
    if (this.voiceMode === 'poly') {
      const i = this.voiceNotes.indexOf(note);
      if (i >= 0) { this.voices[i].triggerRelease(note, t); this.voiceNotes[i] = -1; }
    } else if (this.held.length > 0) {           // fall back to the last held note
      const prev = this.held[this.held.length - 1];
      this._monoTargets().forEach(v => this.legato ? v.legatoTo(prev, t) : v.triggerAttack(prev, this.lastVel, t));
    } else {
      this._monoTargets().forEach(v => v.triggerRelease(note, t));
    }
  }
  triggerAttackRelease(note, vel = 100, dur = 0.01, time = null) {
    const t = time ?? Tone.now();
    const d = Tone.Time(dur).toSeconds();
    if (this.held.length === 0) this.lfos.forEach(l => l.trigger(t));
    if (this.voiceMode === 'poly') {
      const i = this._allocVoice(note, t);
      this.voiceNotes[i] = -1;
      this.busyUntil[i] = t + d;
      this.voices[i].triggerAttackRelease(note, vel, d, t);
    } else {
      this._monoTargets().forEach(v => v.triggerAttackRelease(note, vel, d, t));
    }
  }
  setSustain(on, time = null) {
    this.sustainOn = on;
    if (!on) {
      const t = time ?? Tone.now();
      this.sustained.forEach(n => { if (!this.held.includes(n)) this._release(n, t); });
      this.sustained.clear();
    }
  }
  panic() {
    const t = Tone.now();
    this.voices.forEach(v => v.triggerRelease(0, t));
    this.voiceNotes.fill(-1); this.held = []; this.sustained.clear();
  }
  connect(destination) {
    if (destination.input) this.output.connect(destination.input);
    else this.output.connect(destination);
  }
}