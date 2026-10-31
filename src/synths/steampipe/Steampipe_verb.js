// Steampipe.js
import * as Tone from 'tone';
import { loadSteampipeWorklets } from './steampipeWorklets.js';

const DEFAULTS = { size: 0.5, low: 0.6, high: 0.5, spin: 0.3, spread: 1, mix: 0.3 };


// accept both "reverbSize" style and plain "size" style names
const PARAM_MAP = {
  reverbSize: 'size', reverbLow: 'low', reverbHigh: 'high',
  reverbSpin: 'spin', reverbSpread: 'spread', reverbMix: 'mix',
};

/* =====================================================================
   Steampipe: 8-voice wrapper (voice modes, reverb, LFOs, mod matrix)
   ===================================================================== */
export class Steampipe_verb extends Tone.ToneAudioNode {
  constructor(options = {}) {
    super()
    this.name = 'Steampipe_verb';

    this.input  = new Tone.Gain(1);
    this.output = new Tone.Gain(1);
    this._dry   = new Tone.Gain(0);   // bypass path (off by default)
    this._wet   = new Tone.Gain(1);   // worklet path

    this.input.connect(this._dry);
    this._dry.connect(this.output);
    this._wet.connect(this.output);

    this.values   = { ...DEFAULTS, ...options };
    this.bypassed = false;
    this.reverb   = null;

     this.ready = loadSteampipeWorklets(this.context)
      .then(() => this._build())
      .catch(err => { console.error('[Steampipe_verb] failed to build', err); throw err; });
  }

  _build() {
    this.reverb = this.context.createAudioWorkletNode('steampipe-reverb', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2],
      channelCount: 2, channelCountMode: 'explicit',
    });
    this.reverb.onprocessorerror = e => console.error('[steampipe-reverb] processor error', e);

    for (const [k, v] of Object.entries(this.values)) this.reverb.parameters.get(k).value = v;

    this.input.connect(this.reverb);
    Tone.connect(this.reverb, this._wet);
    return this;
  }
 // ---------------- params
  setParam(name, value, rampTime = 0.02) {
    if (name === 'reverbBypass' || name === 'bypass') return this.setBypass(value);

    const key = PARAM_MAP[name] ?? name;
    if (!(key in DEFAULTS)) { console.warn(`[Steampipe_verb] unknown param "${name}"`); return this; }

    this.values[key] = value;                       // remembered even before ready
    const param = this.reverb?.parameters.get(key);
    if (param) param.setTargetAtTime(value, this.context.currentTime, rampTime / 3);
    return this;
  }
  applyParam(name, value) { return this.setParam(name, value); }

  // Tone-compatible: set({size: .7}) or set('size', .7)
  set(nameOrObj, value) {
    if (typeof nameOrObj === 'object') {
      Object.entries(nameOrObj).forEach(([k, v]) => this.setParam(k, v));
      return this;
    }
    return this.setParam(nameOrObj, value);
  }
  loadSettings(obj) { return this.set(obj); }

  connect(destination) {
    if (destination.input) this.output.connect(destination.input);
    else this.output.connect(destination);
  }
}