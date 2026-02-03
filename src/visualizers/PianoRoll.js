/**
 * PianoRollDisplay
 * ----------------
 * A lightweight, time-windowed piano roll visualizer for sequenced MIDI-style data.
 *
 * CONSTRUCTOR ARGUMENTS
 * - numBeats:        Number of beats displayed horizontally in the window.
 * - height:          Height of the display in pixels.
 * - color:           Base color used to draw note events.
 * - backgroundColor: Background color of the roll.
 *
 * CORE METHODS
 * - place(note, subdivision, duration, velocity)
 *   Adds a note event at a specific time position and pitch.
 *   The note is immediately drawn onto the main canvas (no full redraw).
 *
 * - clear(beatNumber = null)
 *   Clears previously drawn notes.
 *   If beatNumber is null, all events are cleared.
 *   If beatNumber is provided, only notes intersecting that beat are removed.
 *
 * 
 * 
The visualizer uses **multiple stacked canvases**:

1. **Grid Canvas**  
   Drawn once (or when configuration changes). Renders the background color and vertical grid lines at beat and subdivision boundaries.

2. **Note Canvas**  
   Receives individual note drawings when `place()` is called. Notes persist until explicitly cleared.
   Also clears beats on the canvas when the cursor arrives at a new beat.

3. **Cursor Canvas**  
   Updated frequently. Cleared and redrawn every subdivision (e.g. every 16th note) to show the current playhead position without disturbing the grid or notes.

This separation keeps redraw costs low and ensures stable, predictable visuals during real-time playback.

 * NOTE DRAWING FLOW
 * - Notes are drawn individually when place() is called.
 * - Notes are rendered directly onto the main (note) canvas.
 * - No full canvas redraw is required for new notes.
 * - Old notes are removed by clearing beats ahead of the playhead.
 *
 * DESIGN INTENT
 * - Separation of static (grid) and dynamic (cursor + notes) layers
 *   keeps redraw cost low and timing predictable.
 * - Beat-relative clearing ensures the playhead always advances into
 *   empty space, avoiding stale visual artifacts.
 * 
 * TO DO
 * - right now, all notes in the coming beat are drawn at the same time.
 * - it would be nice to get timing information to delay drawing
 *    future notes.
 * - maybe make the notes a bit prettier?
 */

import * as Tone from 'tone';
import { Theory  } from '../TheoryModule';


export class PianoRoll {
  constructor({
    target = 'Canvas',
    numBeats = 8,
    height = 1,
    color = "#fff",
    backgroundColor = "#1b1c1e",

    // practical defaults
    pxPerBeat = 20,
    subdivPerBeat = 1,   // 4 = 16ths, 8 = 32nds, etc.
    noteMin = -7,        // C2
    noteMax = 7         // C6
  } = {}) {
    this.numBeats = numBeats;
    this.beat = 0
    this.height = height*200;
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
  this.gridCanvas = document.createElement("canvas");
	this.ctx = this.canvas.getContext("2d");
  this.cursorCtx = this.cursorCanvas.getContext("2d");
  this.gridCtx = this.gridCanvas.getContext("2d");

  this.containerDiv.style.position = "relative";

  Object.assign(this.canvas.style, {
    position: "absolute", left: "0", top: "0", width: "100%", height: "100%", display: "block",
  });
  Object.assign(this.cursorCanvas.style, {
    position: "absolute", left: "0", top: "0", width: "100%", height: "100%", display: "block",
    pointerEvents: "none",
  });
  Object.assign(this.gridCanvas.style, {
    position: "absolute", left: "0", top: "0", width: "100%", height: "100%", display: "block",
    pointerEvents: "none",
  });

	this.containerDiv.appendChild(this.canvas);
  this.containerDiv.appendChild(this.cursorCanvas);
  this.containerDiv.appendChild(this.gridCanvas);

    this.canvas.style.display = "block";
    this.canvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.canvas.style.height = `${this.height}px`;

    this.cursorCanvas.style.display = "block";
    this.cursorCanvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.cursorCanvas.style.height = `${this.height}px`;

    this.gridCanvas.style.display = "block";
    this.gridCanvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.gridCanvas.style.height = `${this.height}px`;
    
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
    this.height = height<10 ? height*200 : this.height;
    this.color = color;
    this.backgroundColor = backgroundColor;

    this.containerDiv.appendChild(this.canvas);
    this.containerDiv.appendChild(this.cursorCanvas);
    this.containerDiv.appendChild(this.gridCanvas);

    this.canvas.style.display = "block";
    this.canvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.canvas.style.height = `${this.height}px`;

    this.cursorCanvas.style.display = "block";
    this.cursorCanvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.cursorCanvas.style.height = `${this.height}px`;

    this.gridCanvas.style.display = "block";
    this.gridCanvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.gridCanvas.style.height = `${this.height}px`;

    // set backing resolution
    this._resizeBackingStore();
  }

  makeLoop(){
  	this.loop = new Tone.Loop(()=>{
  		this.beat = (Theory.ticks/Tone.Time('4n').toTicks())
  		let nextBeat = (this.beat + 1/4 + 1) % this.numBeats;
      //console.log('next', nextBeat)
      nextBeat = Math.floor(nextBeat*4)/4
      //setTimeout(()=>this.clear(nextBeat), 25);
      this.clear(nextBeat)
      this.render(nextBeat)
  	},'16n').start()

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

    let events = []
    events.push({
      note,
      subdivision,
      duration: Math.max(0, duration),
      velocity: Math.max(0, Math.min(1, velocity/127)),
      color
    });
    this.events.push({
      note,
      subdivision,
      duration: Math.max(0, duration),
      velocity: Math.max(0, Math.min(1, velocity/127)),
      color
    });

    // const ctx = this.ctx;
    // let w = this.cssW
    // const h = this.cssH

    // // notes
    // ctx.globalAlpha = 1;
    // const noteSpan = Math.max(1, this.noteMax - this.noteMin + 1);
    // const rowH = h / noteSpan;
    // const pxPerSub = (this.pxPerBeat / this.subdivPerBeat) 


    for (const e of events) {
      this.renderEvent(e)
      // if (e.duration <= 0) continue;

      // const x = e.subdivision * pxPerSub;
      // const width = e.duration * pxPerSub;

      // if (x > w || x + width < 0) continue;

      // const noteClamped = Math.max(this.noteMin, Math.min(this.noteMax, e.note));
      // const yIndex = (this.noteMax - noteClamped); // high notes at top
      // const y = yIndex * rowH;
      // const h = rowH
      // w = width
      // const xx = x;
      // const yy = y + 1;

      // ctx.globalAlpha = 0.2 + 0.8 * e.velocity;
      // //ctx.fillStyle = e.color;
      // ctx.lineWidth = 1 ;
      // ctx.strokeStyle = "rgba(0,0,0,0.5)";

      // ctx.globalAlpha = 1;

      //   //e.color = {h:0, s:0, v:0.75}
      //   const sat = e.color.s * (0.3 + 0.7 * e.velocity);
      //   const light = 30 + 40 * e.color.v;              // stable brightness

      //   ctx.globalAlpha = 1;
      //   ctx.fillStyle = `hsl(${e.color.h}, ${sat * 100}%, ${light}%)`;
      //   //console.log('hsv', e.color.h, sat * 100, light)
      //   if (ctx.roundRect) {
      //     const r = Math.min(2, h / 2, w / 2);
      //     ctx.beginPath();
      //     ctx.roundRect(xx, yy, w, h, r);
      //     ctx.fill();
      //     ctx.stroke();
      //   } else {
      //     ctx.fillRect(xx, yy, w, h);
      //     ctx.strokeRect(xx + 0.5, yy + 0.5, w - 1, h - 1);
      //   }
    }

    //this.render();
  }

  renderEvent(e){
    const ctx = this.ctx;
    let w = this.cssW
    let h = this.cssH

    // notes
    ctx.globalAlpha = 1;
    const noteSpan = Math.max(1, this.noteMax - this.noteMin + 1);
    const rowH = h / noteSpan;
    const pxPerSub = (this.pxPerBeat / this.subdivPerBeat) 

    if (e.duration <= 0) return;

      const x = e.subdivision * pxPerSub;
      const width = e.duration * pxPerSub;

      if (x > w || x + width < 0) return;

      const noteClamped = Math.max(this.noteMin, Math.min(this.noteMax, e.note));
      const yIndex = (this.noteMax - noteClamped); // high notes at top
      const y = yIndex * rowH;
      h = rowH
      w = width
      const xx = x;
      const yy = y + 1;

      ctx.globalAlpha = 0.2 + 0.8 * e.velocity;
      //ctx.fillStyle = e.color;
      ctx.lineWidth = 1 ;
      ctx.strokeStyle = "rgba(0,0,0,0.5)";

      ctx.globalAlpha = 1;

        //e.color = {h:0, s:0, v:0.75}
        let sat = e.color.s * (0.1 + 0.9 * Math.pow(e.velocity,2));
        let light = 30 + 40 * e.color.v;              // stable brightness

        if( e.color.s < 0.1) light = light * (0.3 + 0.7 * e.velocity);
        ctx.globalAlpha = 1;
        ctx.fillStyle = `hsl(${e.color.h}, ${sat * 100}%, ${light}%)`;
        //console.log('hsv', e.color.h, sat * 100, light)
        if (ctx.roundRect) {
          const r = Math.min(2, h / 2, w / 2);
          ctx.beginPath();
          ctx.roundRect(xx, yy, w, h, r);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(xx, yy, w, h);
          ctx.strokeRect(xx + 0.5, yy + 0.5, w - 1, h - 1);
        }
    

  }

	advanceToBeat(currentBeat) {
	  const nextBeat = (currentBeat + 1) % this.numBeats;
	  this.clear(nextBeat);
	  //console.log('beat', currentBeat, nextBeat)
	}

  clear(beatNumber = null) {
    if (beatNumber === null) {
      this.events.length = 0;
      //this.render();
      return;
    }

    const startSub = (beatNumber) ;
    const endSub = (beatNumber + 1/4 ) ;
    //console.log('sub', startSub, endSub)

    this.events = this.events.filter(e => {
      const eStart = e.subdivision;
      const eEnd = e.subdivision + e.duration;
      // keep events that do NOT intersect that beat
      return (eEnd <= startSub) || (eStart >= endSub);
    });

    //this.render();
  }

  render(nextBeat) {
    const ctx = this.ctx;
    const w = this.cssW
    const h = this.cssH

    // background
    ctx.globalAlpha = 1;

    const start = nextBeat % this.numBeats * this.pxPerBeat 
    const width = this.pxPerBeat/4

    //console.log(nextBeat, start, width)

    // If you want to “erase” to backgroundColor:
    ctx.fillStyle = this.backgroundColor;   // '#000' if black
    ctx.fillRect(start, 0, width, h);
    //ctx.fillRect(0, 0, w, h);

    // // notes drawn in place()

  }

  renderCursor() {
    const ctx = this.cursorCtx;
    const dpr = window.devicePixelRatio || 1;

    // clear the entire cursor backing store, regardless of transforms
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);
    ctx.restore();

    // draw in CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const h = this.cssH;
    const curStep = Math.floor(Theory.ticks / Tone.Time("16n").toTicks());

    const stepW = this.pxPerBeat / 4; // 16ths
    const x = (curStep % (this.numBeats * 4)) * stepW;

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#770";
    ctx.fillRect(Math.round(x), 0, Math.round(stepW), h);
  }

  renderGrid() {
    const ctx = this.gridCtx;
    const dpr = window.devicePixelRatio || 1;

    const w = this.cssW;
    let h = this.cssH;
    // ctx.globalAlpha = 1;
    // ctx.fillStyle = this.backgroundColor;
    // ctx.fillRect(0, 0, this.cssW, this.cssH);

    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    

    h = this.cssH;
    const subMultiplier = 2
    const totalSubs = subMultiplier * this.numBeats * this.subdivPerBeat;
    const pxPerSub = this.pxPerBeat / this.subdivPerBeat / subMultiplier;

    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#fff";
    for (let b = 0; b <= this.numBeats; b++) ctx.fillRect(Math.round(b * this.pxPerBeat), 0, 1, h);

    ctx.globalAlpha = 0.05;
    for (let s = 0; s <= totalSubs; s++) ctx.fillRect(Math.round(s * pxPerSub), 0, 1, h);
  }

  //only when needing to redraw everything
  renderNotes(){
    const ctx = this.ctx;
    //ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (const e of this.events) {
      this.renderEvent(e)
    }
  }

  _resizeBackingStore() {
    const dpr = this._dpr();

    const rect = this.containerDiv.getBoundingClientRect();
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, this.height); // or use this.height if you want fixed height
    this.cssW = cssW
    this.cssH = cssH

    this.containerDiv.style.position = "relative";

    for (const [el, z] of [
      [this.gridCanvas, 1],
      [this.canvas, 0],       // notes
      [this.cursorCanvas, 2],
    ]) {
      el.style.position = "absolute";
      el.style.left = "0";
      el.style.top = "0";
      el.style.display = "block";
      el.style.zIndex = String(z);
      el.style.pointerEvents = "none"; // optional
    }

    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.cursorCanvas.width = Math.floor(cssW * dpr);
    this.cursorCanvas.height = Math.floor(cssH * dpr);
    this.gridCanvas.width = Math.floor(cssW * dpr);
    this.gridCanvas.height = Math.floor(cssH * dpr);

    // now pxPerBeat should be CSS pixels per beat (not derived from canvas.width)
    this.pxPerBeat = cssW / this.numBeats;


    for (const c of [this.canvas, this.cursorCanvas, this.gridCanvas]) {
      c.style.width = `${cssW}px`;
      c.style.height = `${cssH}px`;
      c.width  = Math.round(cssW * dpr);
      c.height = Math.round(cssH * dpr);
    }

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cursorCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.gridCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.renderGrid()

    const ctx = this.ctx;

    const w = this.cssW;
    let h = this.cssH;
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    this.enableRangeDrag()
 }

  _dpr() {
    return window.devicePixelRatio || 1;
  }

  //CLICK & DRAG
  // Call once after canvases are created + appended
  enableRangeDrag() {
    const el = this.cursorCanvas; // top layer receives input
    el.style.pointerEvents = "auto";

    this._drag = {
      active: false,
      startY: 0,
      startMin: this.noteMin,
      startMax: this.noteMax,
    };

    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      this._drag.active = true;
      this._drag.startY = e.clientY;
      this._drag.startMin = this.noteMin;
      this._drag.startMax = this.noteMax;
    });

    el.addEventListener("pointermove", (e) => {
      if (!this._drag.active) return;

      let dy = e.clientY - this._drag.startY;
      dy = -dy
      const span = this._drag.startMax - this._drag.startMin;
      const pxPerNote = this.cssH / (span + 1);

      // drag up => higher notes (increase min/max)
      const deltaNotes = Math.round(-dy / pxPerNote);

      this.setNoteRange(this._drag.startMin + deltaNotes, this._drag.startMax + deltaNotes);
    });

    el.addEventListener("pointerup", () => { this._drag.active = false; });
    el.addEventListener("pointercancel", () => { this._drag.active = false; });
  }

  setNoteRange(min, max) {
    const span = this.noteMax - this.noteMin; // preserve current span

    // If caller passes both, keep them; otherwise keep span.
    if (max == null) max = min + span;

    // clamp + preserve span
    min = Math.max(-36, Math.min(127 - span, min));
    max = min + span;

    this.noteMin = min;
    this.noteMax = max;

    // grid depends on row height, so redraw it too
    this.renderGrid();
    this.render();       // whatever you use to redraw notes layer
    this.renderCursor();
    this.renderNotes()
  }
}