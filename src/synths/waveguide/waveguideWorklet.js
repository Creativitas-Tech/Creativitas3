// Minimal digital waveguide
// After J.O. Smith III, "Physical Modeling Using Digital Waveguides", CMJ 16(4), 1992
import * as Tone from 'tone';



function waveguideWorklet(){

  const sampleRate = 48000
  const MIN_FREQ = 20;
  const SIZE = Math.ceil(sampleRate / MIN_FREQ) + 4; // ring-buffer length
  const MAX_M = Math.floor(SIZE / 2) - 2;             // longest rail allowed

  class waveguide extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [
        { name: 'frequency', defaultValue: 220,   minValue: MIN_FREQ, maxValue: 4000 },
        { name: 'loss',      defaultValue: 0.995, minValue: 0,        maxValue: 0.9999 },
        { name: 'pluck',     defaultValue: 0.2,   minValue: 0.02,     maxValue: 0.98,  automationRate: 'k-rate' },
        { name: 'pickup',    defaultValue: 0.8,   minValue: 0.02,     maxValue: 0.98,  automationRate: 'k-rate' },
        { name: 'lpf',       defaultValue: 5000,  minValue: 20,       maxValue: 20000, automationRate: 'k-rate' },
        { name: 'hpf',       defaultValue: 20,    minValue: 1,        maxValue: 2000,  automationRate: 'k-rate' },
      ];
    }

    constructor() {
      super();
      this.upper  = new Float32Array(SIZE); // rightgoing entries at x = 0
      this.lower  = new Float32Array(SIZE); // leftgoing entries at x = L
      this.inHist = new Float32Array(SIZE); // excitation history for the pluck comb
      this.w = 0;
      this.lpY = 0;   // lowpass state
      this.hpX = 0;   // DC-blocker state (previous input)
      this.hpY = 0;   // DC-blocker state (previous output)
    }

    process(inputs, outputs, p) {
      const inp = inputs[0] && inputs[0][0];
      const out = outputs[0][0];
      if (!out) return true;

      const { upper, lower, inHist } = this;
      const fs = sampleRate;

      // k-rate values, read once per block
      const pluck  = p.pluck[0];
      const pickup = p.pickup[0];
      const aLP = 1 - Math.exp(-2 * Math.PI * p.lpf[0] / fs); // one-pole lowpass coefficient
      const R   = Math.exp(-2 * Math.PI * p.hpf[0] / fs);     // DC-blocker pole
      const gdLP = (1 - aLP) / aLP;                            // low-frequency group delay of the lowpass

      let { w, lpY, hpX, hpY } = this;

      for (let i = 0; i < out.length; i++) {
        const f = p.frequency.length > 1 ? p.frequency[i] : p.frequency[0];
        const g = p.loss.length > 1 ? p.loss[i] : p.loss[0];

        // 1. Rail length. The lowpass adds delay, so subtract it from the loop.
        let M = Math.round((fs / f - gdLP) / 2);
        M = Math.max(1, Math.min(MAX_M, M));

        // 2. Pluck position: comb 1 - z^-D with D = pluck × loop delay
        inHist[w] = inp ? inp[i] : 0;
        const dP = Math.min(SIZE - 1, Math.max(1, Math.round(2 * pluck * M)));
        const excite = inHist[w] - inHist[(w - dP + SIZE) % SIZE];

        // 3. Waves arriving at each end this sample
        const arrivingRight = upper[(w - M + SIZE) % SIZE]; // reaches x = L
        const arrivingLeft  = lower[(w - M + SIZE) % SIZE]; // reaches x = 0

        // 4. Loss termination at x = L: lowpass -> DC blocker -> gain g
        lpY += aLP * (arrivingRight - lpY);
        const hpOut = lpY - hpX + R * hpY;
        hpX = lpY;
        hpY = hpOut;
        const reflectedAtL = -g * hpOut;      // rigid end inverts

        // 5. Rigid termination at x = 0, plus the excitation
        const reflectedAt0 = -arrivingLeft + excite;

        // 6. Write the new entries into both rails
        upper[w] = reflectedAt0;
        lower[w] = reflectedAtL;

        // 7. Pickup: physical displacement at position u = sum of both rails there
        const dU = Math.max(1, Math.round(pickup * M));
        const dL = Math.max(1, Math.round((1 - pickup) * M));
        out[i] = upper[(w - dU + SIZE) % SIZE] + lower[(w - dL + SIZE) % SIZE];

        w = (w + 1) % SIZE;
      }

      this.w = w; this.lpY = lpY; this.hpX = hpX; this.hpY = hpY;
      return true;
    }
  }

  registerProcessor('waveguide', waveguide);
}

let modulePromise = null;
export function loadWaveguideWorklet(context = Tone.getContext()) {
  if (!modulePromise) {
    const src = `(${waveguideWorklet.toString()})();`;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    // Use rawContext directly: Tone's own addAudioWorkletModule() caches one module per
    // context, so it can silently skip ours if Tone already loaded its built-in worklets.
    modulePromise = context.rawContext.audioWorklet.addModule(url);
  }
  return modulePromise;
}