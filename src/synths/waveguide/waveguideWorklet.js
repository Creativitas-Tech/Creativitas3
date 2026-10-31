// Minimal digital waveguide
// After J.O. Smith III, "Physical Modeling Using Digital Waveguides", CMJ 16(4), 1992
import * as Tone from 'tone';



function waveguideWorklet(){

  const sampleRate = 48000

  const MIN_FREQ = 20;
  // Buffer large enough for the longest rail we'll ever need
  const SIZE = Math.ceil(sampleRate / MIN_FREQ);

  class waveguide extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [
        { name: 'frequency', defaultValue: 220,   minValue: MIN_FREQ, maxValue: 4000 },
        { name: 'loss',      defaultValue: 0.995, minValue: 0,        maxValue: 0.9999 },
      ];
    }

    constructor() {
      super();
      this.upper = new Float32Array(SIZE); // y+  rightgoing rail (x=0 → x=L)
      this.lower = new Float32Array(SIZE); // y-  leftgoing rail  (x=L → x=0)
      this.w = 0;       // write index (shared by both rails)
      this.lpPrev = 0;  // one-sample memory for the loss filter
    }

    process(inputs, outputs, parameters) {
      const inp  = inputs[0][0];   // undefined if nothing is connected
      const out  = outputs[0][0];
      const fArr = parameters.frequency;
      const gArr = parameters.loss;
      const { upper, lower } = this;
      let w = this.w, lpPrev = this.lpPrev;

      for (let i = 0; i < out.length; i++) {
        const f = fArr.length > 1 ? fArr[i] : fArr[0];
        const g = gArr.length > 1 ? gArr[i] : gArr[0];

        // --- Rail length M --------------------------------------------
        // A round trip takes 2M samples, plus 0.5 sample of delay from the
        // averaging filter, so the pitch is sampleRate / (2M + 0.5).
        let M = Math.round((sampleRate / f - 0.5) / 2);
        M = Math.max(1, Math.min(SIZE - 1, M));

        // --- Read the delay-line outputs ------------------------------
        const r = (w - M + SIZE) % SIZE;
        const arrivingRight = upper[r]; // y+(n-M): wave hitting the x=L end
        const arrivingLeft  = lower[r]; // y-(n):   wave hitting the x=0 end

        // --- Termination at x = L, with ALL losses lumped here --------
        // Two-tap average = simplest linear-phase lowpass (Fig. 17),
        // scaled by g (the consolidated loss g^N of Fig. 16).
        const filtered = g * 0.5 * (arrivingRight + lpPrev);
        lpPrev = arrivingRight;
        const reflectedAtL = -filtered;           // rigid end: invert

        // --- Termination at x = 0, plus the excitation ----------------
        const excite = inp ? inp[i] : 0;
        const reflectedAt0 = -arrivingLeft + excite; // rigid end: invert

        // --- Write the delay-line inputs ------------------------------
        upper[w] = reflectedAt0;   // y+(n)   enters at x=0
        lower[w] = reflectedAtL;   // y-(n+M) enters at x=L
        w = (w + 1) % SIZE;

        // --- Output ---------------------------------------------------
        // Like Fig. 15's "non-physical" output: the traveling wave arriving
        // at the far end (think: what reaches the mouth of the pipe).
        out[i] = arrivingRight;
      }

      this.w = w;
      this.lpPrev = lpPrev;
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