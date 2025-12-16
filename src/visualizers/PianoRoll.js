import * as Tone from 'tone';
import { Theory  } from '../TheoryModule';


export class PianoRoll {
  constructor({
    target = 'Canvas',
    numBeats = 8,
    height = 200,
    color = "#fff",
    backgroundColor = "#111",

    // practical defaults
    pxPerBeat = 20,
    subdivPerBeat = 1,   // 4 = 16ths, 8 = 32nds, etc.
    noteMin = -7,        // C2
    noteMax = 7         // C6
  } = {}) {
    this.numBeats = numBeats;
    this.beat = 0
    this.height = height;
    this.color = color;
    this.backgroundColor = backgroundColor;

    this.pxPerBeat = pxPerBeat;
    this.subdivPerBeat = subdivPerBeat;
    this.noteMin = noteMin;
    this.noteMax = noteMax;

    this.events = [];

    const container = document.getElementById(target);
    this.containerDiv = document.createElement("div");
    container.appendChild(this.containerDiv);


	this.canvas = document.createElement("canvas");
  this.cursorCanvas = document.createElement("canvas");
	this.ctx = this.canvas.getContext("2d");
  this.cursorCtx = this.cursorCanvas.getContext("2d");


  this.containerDiv.style.position = "relative";

  Object.assign(this.canvas.style, {
    position: "absolute", left: "0", top: "0", width: "100%", height: "100%", display: "block",
  });
  Object.assign(this.cursorCanvas.style, {
    position: "absolute", left: "0", top: "0", width: "100%", height: "100%", display: "block",
    pointerEvents: "none",
  });

	this.containerDiv.appendChild(this.canvas);
  this.containerDiv.appendChild(this.cursorCanvas);

    this.canvas.style.display = "block";
    this.canvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.canvas.style.height = `${this.height}px`;

    this.cursorCanvas.style.display = "block";
    this.cursorCanvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.cursorCanvas.style.height = `${this.height}px`;
    

    // set backing resolution
    this._resizeBackingStore();

    this.makeLoop()

    this._ro = new ResizeObserver(() => {
      this._resizeBackingStore();
      //this.redrawBase();
      //this.redrawCursor();
    });
    this._ro.observe(this.containerDiv);
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

  makeLoop(){
  	this.loop = new Tone.Loop(()=>{
  		this.beat = Math.floor(Theory.ticks/Tone.Time('4n').toTicks())
  		const nextBeat = (this.beat + 2) % this.numBeats;
      //setTimeout(()=>this.clear(nextBeat), 200);
      this.clear(nextBeat)
      this.render()

//       console.log(
//   "base:", this.canvas.width, this.canvas.style.width, this.canvas.getBoundingClientRect().width,
//   "cursor:", this.cursorCanvas.width, this.cursorCanvas.style.width, this.cursorCanvas.getBoundingClientRect().width,
//   "dpr:", window.devicePixelRatio
// );

  //     const el = this.cursorCanvas;
  // const cs = getComputedStyle(el);
  // const r = el.getBoundingClientRect();
  // console.log({
  //   inlineWidth: el.style.width,
  //   computedWidth: cs.width,
  //   rectWidth: r.width,
  //   attrWidth: el.width,          // backing store
  //   dpr: window.devicePixelRatio,
  //   parentRectWidth: el.parentElement.getBoundingClientRect().width,
  // });
  	},'4n').start()

    this.cursorLoop = new Tone.Loop(()=>{
      this.renderCursor()
    },'16n').start()
  }

  setBeatColor(r = 255, g = 255, b = 255) {
	  this.color =
	    "#" +
	    [r, g, b]
	      .map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
	      .join("");
	}

  place(note, subdivision, duration=.5, velocity = 127, color = '#fff') {
    // note: MIDI number
    // subdivision: position in "subdivisions" from start of window (0..numBeats*subdivPerBeat)
    // duration: in subdivisions
    // velocity: 0..1 (used for alpha)
    //console.log(note, subdivision, duration, velocity)
    //console.log(note, subdivision)
  	subdivision = subdivision % this.numBeats
  	
  	if(note === '.') return
    this.events.push({
      note,
      subdivision,
      duration: Math.max(0, duration),
      velocity: Math.max(0, Math.min(1, velocity/127)),
      color
    });

    //this.render();
  }

	advanceToBeat(currentBeat) {
	  const nextBeat = (currentBeat + 1) % this.numBeats;
	  this.clear(nextBeat);
	  //console.log('beat', currentBeat, nextBeat)
	}

  clear(beatNumber = null) {
    if (beatNumber === null) {
      this.events.length = 0;
      this.render();
      return;
    }

    const startSub = beatNumber ;
    const endSub = (beatNumber + 1 ) ;
    //console.log('sub', startSub, endSub)

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
    const w = this.cssW
    const h = this.cssH


    // background
    ctx.globalAlpha = 1;

    const start = (this.beat+1) % this.numBeats * this.pxPerBeat 
    const width = this.pxPerBeat 

    // If you want to “erase” to backgroundColor:
    ctx.fillStyle = this.backgroundColor;   // '#000' if black
    ctx.fillRect(start, 0, width, h);
    //ctx.fillRect(0, 0, w, h);
    

    // grid (beats + subdivisions)
    const totalSubs = this.numBeats * this.subdivPerBeat;
    const pxPerSub = (this.pxPerBeat / this.subdivPerBeat) 

    // beat lines
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#fff';
    for (let b = 0; b <= this.numBeats; b++) {
      const x = Math.round(b * this.pxPerBeat);
      ctx.fillRect(x, 0, 1, h);
    }


    // subdivision lines (lighter)
    ctx.globalAlpha = 0.15;
    for (let s = 0; s <= totalSubs; s++) {
      const x = Math.round(s * pxPerSub);
      ctx.fillRect(x, 0, 1, h);
    }

    // notes
    ctx.globalAlpha = 1;
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
      ctx.fillStyle = e.color;
      ctx.fillRect(x, y + 1, Math.max(1, width), Math.max(1, rowH - 2));
    }

    ctx.globalAlpha = 1;
  }

  renderCursor(){
    const ctx = this.cursorCtx;
    const w = this.cssW
    const h = this.cssH

    const curBeat = Math.floor(Theory.ticks / Tone.Time("16n").toTicks());

    ctx.clearRect(0, 0, w, h);

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#770";
    // ctx.fillRect(0, 0, w, h);

    const stepW = (this.pxPerBeat / 4);   // scale width too
    const x = ((curBeat-0) % (this.numBeats * 4)) * stepW;

    ctx.fillRect(Math.round(x), 0, Math.round(stepW), h);
    //console.log(curBeat%32, x, this.pxPerBeat/4)

    // ctx.restore();
  }

  _resizeBackingStore() {
    const dpr = this._dpr();
    // const cssW = this.numBeats * this.pxPerBeat;
    // const cssH = this.height;

    const rect = this.containerDiv.getBoundingClientRect();
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, this.height); // or use this.height if you want fixed height
    this.cssW = cssW
    this.cssH = cssH

    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.cursorCanvas.width = Math.floor(cssW * dpr);
    this.cursorCanvas.height = Math.floor(cssH * dpr);

    //this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    //this.cursorCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // now pxPerBeat should be CSS pixels per beat (not derived from canvas.width)
    this.pxPerBeat = cssW / this.numBeats;


    for (const c of [this.canvas, this.cursorCanvas]) {
      c.style.width = `${cssW}px`;
      c.style.height = `${cssH}px`;
      c.width  = Math.round(cssW * dpr);
      c.height = Math.round(cssH * dpr);
    }

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cursorCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    //draw background
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, cssW, cssH);


  }

  _dpr() {
    return window.devicePixelRatio || 1;
  }
}