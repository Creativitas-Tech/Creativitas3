export class PianoRoll {
  constructor({
    target = 'Canvas',
    numBeats = 4,
    height = 200,
    color = "#fff",
    backgroundColor = "#111",

    // practical defaults
    pxPerBeat = 80,
    subdivPerBeat = 4,   // 4 = 16ths, 8 = 32nds, etc.
    noteMin = 36,        // C2
    noteMax = 84         // C6
  } = {}) {
    this.numBeats = numBeats;
    this.height = height;
    this.color = color;
    this.backgroundColor = backgroundColor;

    this.pxPerBeat = pxPerBeat;
    this.subdivPerBeat = subdivPerBeat;
    this.noteMin = noteMin;
    this.noteMax = noteMax;

    this.events = [];

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.canvas.style.display = "block";
    this.canvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.canvas.style.height = `${this.height}px`;

    // set backing resolution
    this._resizeBackingStore();

    const el = (typeof target === "string") ? document.querySelector(target) : target;
    el.appendChild(this.canvas);

    this.render();
  }

  setConfig({
    numBeats = this.numBeats,
    height = this.height,
    color = this.color,
    backgroundColor = this.backgroundColor
  } = {}) {
    this.numBeats = numBeats;
    this.height = height;
    this.color = color;
    this.backgroundColor = backgroundColor;

    this.canvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.canvas.style.height = `${this.height}px`;
    this._resizeBackingStore();
    this.render();
  }

  place(note, subdivision, duration, velocity = 1) {
    // note: MIDI number
    // subdivision: position in "subdivisions" from start of window (0..numBeats*subdivPerBeat)
    // duration: in subdivisions
    // velocity: 0..1 (used for alpha)

    this.events.push({
      note,
      subdivision,
      duration: Math.max(0, duration),
      velocity: Math.max(0, Math.min(1, velocity))
    });

    this.render();
  }

  clear(beatNumber = null) {
    if (beatNumber === null) {
      this.events.length = 0;
      this.render();
      return;
    }

    const startSub = beatNumber * this.subdivPerBeat;
    const endSub = (beatNumber + 1) * this.subdivPerBeat;

    this.events = this.events.filter(e => {
      const eStart = e.subdivision;
      const eEnd = e.subdivision + e.duration;
      // keep events that do NOT intersect that beat
      return (eEnd <= startSub) || (eStart >= endSub);
    });

    this.render();
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, w, h);

    // grid (beats + subdivisions)
    const totalSubs = this.numBeats * this.subdivPerBeat;
    const pxPerSub = (this.pxPerBeat / this.subdivPerBeat) * this._dpr();

    // beat lines
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = this.color;
    for (let b = 0; b <= this.numBeats; b++) {
      const x = Math.round(b * this.pxPerBeat * this._dpr());
      ctx.fillRect(x, 0, 1, h);
    }

    // subdivision lines (lighter)
    ctx.globalAlpha = 0.15;
    for (let s = 0; s <= totalSubs; s++) {
      const x = Math.round(s * pxPerSub);
      ctx.fillRect(x, 0, 1, h);
    }
    ctx.globalAlpha = 1;

    // notes
    const noteSpan = Math.max(1, this.noteMax - this.noteMin + 1);
    const rowH = h / noteSpan;

    for (const e of this.events) {
      if (e.duration <= 0) continue;

      const x = e.subdivision * pxPerSub;
      const width = e.duration * pxPerSub;

      if (x > w || x + width < 0) continue;

      const noteClamped = Math.max(this.noteMin, Math.min(this.noteMax, e.note));
      const yIndex = (this.noteMax - noteClamped); // high notes at top
      const y = yIndex * rowH;

      ctx.globalAlpha = 0.2 + 0.8 * e.velocity;
      ctx.fillStyle = this.color;
      ctx.fillRect(x, y + 1, Math.max(1, width), Math.max(1, rowH - 2));
    }

    ctx.globalAlpha = 1;
  }

  _resizeBackingStore() {
    const dpr = this._dpr();
    const cssW = this.numBeats * this.pxPerBeat;
    const cssH = this.height;
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
  }

  _dpr() {
    return window.devicePixelRatio || 1;
  }
}