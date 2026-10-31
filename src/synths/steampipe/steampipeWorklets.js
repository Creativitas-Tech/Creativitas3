// steampipeWorklets.js
import * as Tone from 'tone';

const sampleRate = 48000

/* Everything in this function runs on the audio thread. It is stringified into a Blob
   module, so it must be fully self-contained (no imports or outside references). */
function steampipeProcessors() {
  const TWO_PI = 2 * Math.PI;
  const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
  const wrapPi = (p) => { while (p > Math.PI) p -= TWO_PI; while (p < -Math.PI) p += TWO_PI; return p; };

  // phase of (b0 + b1 z^-1)/(1 + a1 z^-1) at w; returns phase delay in samples
  const phaseDelay1 = (b0, b1, a1, w) => {
    const c = Math.cos(w), s = Math.sin(w);
    const ph = wrapPi(Math.atan2(-b1 * s, b0 + b1 * c) - Math.atan2(-a1 * s, 1 + a1 * c));
    return -ph / w;
  };

  // soft (p=1) -> hard (p large) clipper, always bounded to ±1
  const shape = (x, p) => x / Math.pow(1 + Math.pow(Math.abs(x), p), 1 / p);

  // =====================================================================
  //  THE PIPE: modified Karplus-Strong with push-pull, saturator, HPF/LPF
  // =====================================================================
  class SteampipePipe extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      const k = (name, defaultValue, minValue, maxValue) =>
        ({ name, defaultValue, minValue, maxValue, automationRate: 'k-rate' });
      return [
        k('frequency', 0, 0, 20000),   // Hz (note + glide)
        k('gate', 0, 0, 1),              // selects decay vs release feedback time
        k('tune', 0, -48, 48),           // semitones
        k('fine', 0, -200, 200),         // cents (fine + unison detune)
        k('delayMod', 0, -48, 48),       // semitones (pitch bend, vibrato, mod matrix)
        k('push', 0.6, -4, 4),           // push (+) / pull (-)
        k('decay', 4, 0.001, 1000),      // feedback T60 (s) while the note is held
        k('release', 0.3, 0.001, 1000),  // feedback T60 (s) after note off
        k('polarity', 0, 0, 1),          // 1 = inverted feedback -> odd harmonics
        k('saturation', 0.3, 0, 1),      // soft -> hard clipping
        k('symmetry', 0, 0, 1),          // 0 symmetrical (odd) -> 1 asymmetrical (even)
        k('symMode', 0, 0, 1),           // 0 = A (waveshaping), 1 = B (self phase-mod)
        k('stiffness', 0, -1, 1),        // harmonic spread (allpass dispersion)
        k('split', 0, 0, 1),
        k('splitPoint', 0.5, 0, 1),
        k('hpf', -12, -72, 72),          // semitones re: middle C (keytracked, see below)
        k('lpf', 36, -72, 96),
        k('filterKeytrack', 1, 0, 1),    // 0 = literal "relative to middle C", 1 = follows note
        k('hpComp', 1, 0, 1),            // TUNE menu compensation
        k('lpComp', 1, 0, 1),
      ];
    }

    constructor() {
      super();
      this.size = 16384; this.mask = this.size - 1;
      this.bufA = new Float32Array(this.size);
      this.bufB = new Float32Array(this.size);
      this.w = 0; this.D = -1; this.g = 0; this.prev = 0;
      this.gCoef = 1 - Math.exp(-1 / (0.005 * sampleRate));
      this.lp = 0; this.hpX = 0; this.hpY = 0; this.dcX = 0; this.dcY = 0;
      this.apX = new Float64Array(4); this.apY = new Float64Array(4);
    }

    read(buf, d) { // 4-point Hermite, d >= 3
      const rp = this.w - d, i = Math.floor(rp), f = rp - i, m = this.mask;
      const xm1 = buf[(i - 1) & m], x0 = buf[i & m], x1 = buf[(i + 1) & m], x2 = buf[(i + 2) & m];
      const c1 = 0.5 * (x1 - xm1);
      const c2 = xm1 - 2.5 * x0 + 2 * x1 - 0.5 * x2;
      const c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1);
      return ((c3 * f + c2) * f + c1) * f + x0;
    }

    process(inputs, outputs, p) {
      const out = outputs[0][0];
      if (!out) return true;
      const inp = inputs[0] && inputs[0][0];
      const sr = sampleRate, n = out.length;

      // ---- pitch & polarity
      const semis = p.tune[0] + p.fine[0] / 100 + p.delayMod[0];
      const f0 = clamp(p.frequency[0] * Math.pow(2, semis / 12), 8, sr * 0.2);
      const w0 = TWO_PI * f0 / sr;
      const pol = p.polarity[0] >= 0.5 ? -1 : 1;
      const period = pol < 0 ? sr / (2 * f0) : sr / f0; // inverted loop = half-wave

      // ---- in-loop filters (one-pole LP/HP), cutoffs in semitones
      const ref = 261.63 * Math.pow(f0 / 261.63, p.filterKeytrack[0]);
      const fLP = clamp(ref * Math.pow(2, p.lpf[0] / 12), 20, sr * 0.45);
      const fHP = clamp(ref * Math.pow(2, p.hpf[0] / 12), 2, sr * 0.45);
      const pl = Math.exp(-TWO_PI * fLP / sr);
      const ph = Math.exp(-TWO_PI * fHP / sr);
      const hb = 0.5 * (1 + ph);
      const ap = -0.5 * p.stiffness[0]; // a<0 stretches partials (bells), a>0 compresses

      // ---- tuning compensation: subtract filter phase delay at f0
      const dLP = phaseDelay1(1 - pl, 0, -pl, w0);
      const dHP = phaseDelay1(hb, -hb, -ph, w0);     // negative (phase lead)
      const dAP = 4 * phaseDelay1(ap, 1, ap, w0);   // always compensated
      const Dt = clamp(period - p.lpComp[0] * dLP - p.hpComp[0] * dHP - dAP, 3, this.size * 0.45);
      const D0 = this.D < 0 ? Dt : this.D, dStep = (Dt - D0) / n;
      this.D = Dt;

      // ---- feedback gain from T60 ("logarithmic time")
      const t60 = p.gate[0] >= 0.5 ? p.decay[0] : p.release[0];
      const gT = Math.pow(0.001, period / (sr * Math.max(t60, 0.001)));

      // ---- saturator
      const sat = p.saturation[0], pe = 1 + 39 * sat * sat;
      const modeB = p.symMode[0] >= 0.5, sym = p.symmetry[0];
      const bias = modeB ? 0 : 0.8 * sym, biasOut = shape(bias, pe);
      const pmAmt = modeB ? 0.15 * sym : 0;

      const push = p.push[0];
      const split = p.split[0] >= 0.5;
      const sp = clamp(p.splitPoint[0], 0.05, 0.95);
      const { bufA, bufB, apX, apY } = this;
      let { lp, hpX, hpY, g, prev, dcX, dcY } = this;

      for (let i = 0; i < n; i++) {
        const D = D0 + dStep * i;
        g += (gT - g) * this.gCoef;

        // read the delay box (mode B = self phase modulation, FM-like sidebands)
        const pm = pmAmt * D * prev;
        let x = split
          ? 0.5 * (this.read(bufA, Math.max(3, 2 * D * sp + pm)) +
                   this.read(bufB, Math.max(3, 2 * D * (1 - sp) + pm)))
          : this.read(bufA, Math.max(3, D + pm));
        prev = x;
        x *= pol;

        // LPF -> HPF -> dispersion allpass chain
        lp = (1 - pl) * x + pl * lp;
        const hp = hb * (lp - hpX) + ph * hpY; hpX = lp; hpY = hp;
        let y = hp;
        for (let k = 0; k < 4; k++) {
          const o = ap * y + apX[k] - ap * apY[k];
          apX[k] = y; apY[k] = o; y = o;
        }

        // PUSH-PULL: the pipe contents modulate the steam -> self-oscillation
        const gen = inp ? inp[i] : 0;
        let s = gen * (1 + push * y) + g * y;
        s = clamp(s, -8, 8);
        s = shape(s + bias, pe) - biasOut;
        if (s !== s) s = 0; // NaN guard

        bufA[this.w] = s; bufB[this.w] = s;
        this.w = (this.w + 1) & this.mask;

        const o = s - dcX + 0.998 * dcY; dcX = s; dcY = o; // output DC blocker
        out[i] = o;
      }
      Object.assign(this, { lp, hpX, hpY, g, prev, dcX, dcY });
      return true;
    }
  }

  // =====================================================================
  //  THE REVERBERATOR: 8-line FDN, Householder matrix, modulated ("spin")
  // =====================================================================
  class SteampipeReverb extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      const k = (name, defaultValue) => ({ name, defaultValue, minValue: 0, maxValue: 1, automationRate: 'k-rate' });
      return [k('size', 0.5), k('low', 0.6), k('high', 0.5), k('spin', 0.3), k('spread', 1), k('mix', 0.3)];
    }
    constructor() {
      super();
      this.size = 1 << Math.ceil(Math.log2(sampleRate * 0.8));
      this.mask = this.size - 1;
      this.lines = Array.from({ length: 8 }, () => new Float32Array(this.size));
      this.ratios = [1.0, 0.9257, 0.8521, 0.7853, 0.7151, 0.6491, 0.5813, 0.5137];
      this.inc = [0.31, 0.37, 0.43, 0.53, 0.59, 0.67, 0.71, 0.79].map(r => TWO_PI * r / sampleRate);
      this.phase = Float64Array.from({ length: 8 }, (_, i) => i * 0.8);
      this.hs = new Float64Array(8); this.ls = new Float64Array(8); this.v = new Float64Array(8);
      this.d = new Float64Array(8); this.g = new Float64Array(8);
      this.w = 0;
    }
    process(inputs, outputs, p) {
      const out = outputs[0], oL = out[0];
      if (!oL) return true;
      const oR = out[1] || oL;
      const ins = inputs[0] || [], iL = ins[0], iR = ins[1] || ins[0];
      const sr = sampleRate, N = 8, m = this.mask;

      // manual: size 0 ≈ 2.6 m room, size 100 ≈ 666 m room
      const room = 2.6 * Math.pow(666 / 2.6, p.size[0]);
      const rt60 = 0.2 + Math.min(0.08 * room, 60);
      const base = clamp(room / 343, 0.006, 0.3) * sr;
      for (let i = 0; i < N; i++) {
        this.d[i] = base * this.ratios[i];
        this.g[i] = Math.pow(0.001, this.d[i] / (sr * rt60));
      }
      const depth = p.spin[0] * Math.min(0.004 * sr, 0.12 * base);
      const hp = Math.exp(-TWO_PI * (800 * Math.pow(25, p.high[0])) / sr); // HF damping 0.8–20 kHz
      const lpc = Math.exp(-TWO_PI * 300 / sr);
      const lowCut = 1 - p.low[0];
      const spread = p.spread[0], mix = p.mix[0];
      const dry = Math.cos(mix * Math.PI / 2), wet = Math.sin(mix * Math.PI / 2);
      const { lines, phase, inc, hs, ls, v, d, g } = this;

      for (let n = 0; n < oL.length; n++) {
        const xl = iL ? iL[n] : 0, xr = iR ? iR[n] : xl;
        let sum = 0;
        for (let i = 0; i < N; i++) {
          phase[i] += inc[i]; if (phase[i] > TWO_PI) phase[i] -= TWO_PI;
          const rp = this.w - (d[i] + depth * (1 + Math.sin(phase[i])) + 1);
          const j = Math.floor(rp), f = rp - j;
          const a = lines[i][j & m], b = lines[i][(j + 1) & m];
          let y = a + (b - a) * f;
          hs[i] = (1 - hp) * y + hp * hs[i]; y = hs[i];           // HIGH
          ls[i] = (1 - lpc) * y + lpc * ls[i]; y -= lowCut * ls[i]; // LOW
          y *= g[i];
          v[i] = y; sum += y;
        }
        const h = sum * (2 / N);
        let wl = 0, wr = 0;
        for (let i = 0; i < N; i++) {
          const sign = (i & 2) ? -1 : 1;
          lines[i][this.w] = v[i] - h + 0.3 * sign * ((i & 1) ? xr : xl);
          if (i & 1) wr += sign * v[i]; else wl += sign * v[i];
        }
        this.w = (this.w + 1) & m;
        const mid = 0.5 * (wl + wr), side = 0.5 * (wl - wr) * spread;
        oL[n] = dry * xl + wet * 0.5 * (mid + side);
        oR[n] = dry * xr + wet * 0.5 * (mid - side);
      }
      return true;
    }
  }

  registerProcessor('steampipe-pipe', SteampipePipe);
  registerProcessor('steampipe-reverb', SteampipeReverb);
}

let modulePromise = null;
export function loadSteampipeWorklets(context = Tone.getContext()) {
  if (!modulePromise) {
    const src = `(${steampipeProcessors.toString()})();`;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    // Use rawContext directly: Tone's own addAudioWorkletModule() caches one module per
    // context, so it can silently skip ours if Tone already loaded its built-in worklets.
    modulePromise = context.rawContext.audioWorklet.addModule(url);
  }
  return modulePromise;
}