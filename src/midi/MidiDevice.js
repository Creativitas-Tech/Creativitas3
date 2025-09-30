import { ControlSource } from './ControlSource.js';
import { midi } from './Midi.js';
/*
Hex   Binary      Meaning    Channel
0x80  1000 xxxx   Note Off   0–15
0x90   1001 xxxx   Note On   0–15
0xA0   1010 xxxx   Polyphonic Aftertouch   0–15
0xB0   1011 xxxx   Control Change (CC)   0–15
0xC0   1100 xxxx   Program Change   0–15
0xD0   1101 xxxx   Channel Pressure   0–15
0xE0   1110 xxxx   Pitch Bend   0–15
0xF0   1111 xxxx   System messages   N/A

*/

export class MidiDevice {
  constructor(inputIdentifier) {
    this.input = this.findInput(inputIdentifier);
    this.output = this.findMatchingOutput(this.input);
    this.cc = {};
    this.noteOn = {};
    this.noteOff = {};
    this.note = {};
    this.ccValues = {};
    this.activeNotes = {};
    this.namedSources = {}; // e.g. { myEncoder1: ControlSource, modwheel: ControlSource }

    this.allNoteCallbacks = [];
    this._muted = false;
    this._logEvents = false;

    if (this.input) {
      this.input.onmidimessage = this.handleMessage.bind(this);
      console.log(`[MidiDevice] Connected to input: ${this.input.name}`);
    }

    if (this.output) {
      console.log(`[MidiDevice] Connected to output: ${this.output.name}`);
    }
  }

  // 🔍 Device lookup
  findInput(id) {
    const inputs = [...midi.inputs.values()];
    if (typeof id === 'number') return inputs[id];
    return inputs.find(i => i.name === id);
  }

  findMatchingOutput(input) {
    if (!input) return null;
    const outputs = [...midi.outputs.values()];
    return outputs.find(o => o.name === input.name);
  }

  // 🎛 ControlSource auto-creation
  getCC(num) {
    if (!this.cc[num]) this.cc[num] = new ControlSource(`cc${num}`);
    return this.cc[num];
  }

  getNoteOn(num) {
    if (!this.noteOn[num]) this.noteOn[num] = new ControlSource(`noteOn${num}`);
    return this.noteOn[num];
  }

  getNoteOff(num) {
    if (!this.noteOff[num]) this.noteOff[num] = new ControlSource(`noteOff${num}`);
    return this.noteOff[num];
  }

  getNote(num) {
    console.log('note', num)
    if (!this.note[num]) this.note[num] = new ControlSource(`note${num}`);
    return this.note[num];
  }

  // 🧠 Note state access
  getActiveNotes() {
    return Object.keys(this.activeNotes).map(n => Number(n));
  }

  getPressedNotes() {
    return this.getActiveNotes().sort((a, b) => a - b);
  }

  noteOnEvents() {
    return Object.entries(this.activeNotes).map(([note, vel]) => ({
      note: Number(note),
      velocity: vel
    }));
  }

  getState() {
    return {
      ccValues: { ...this.ccValues },
      activeNotes: { ...this.activeNotes },
      pressedNotes: this.getPressedNotes()
    };
  }

  clearNotes() {
    this.activeNotes = {};
  }

  // 🔌 Register callback
  on(source, callback) {
    this.off(source, callback)
    this.add(source, callback)
  }

  add(source, callback) {
    if (typeof source === 'string') {
      if (this.namedSources[source]) {
      this.namedSources[source].connect(callback);
      return;
    }

      const match = source.match(/^(cc|noteOn|noteOff|note)(\d+)$/);
      if (match) {
        const type = match[1];
        const num = parseInt(match[2]);
        switch (type) {
          case 'cc': return this.getCC(num).connect(callback);
          case 'noteOn': return this.getNoteOn(num).connect(callback);
          case 'noteOff': return this.getNoteOff(num).connect(callback);
          case 'note': return this.getNote(num).connect(callback);
        }
      } else {
        console.warn(`[MidiDevice] Invalid source string: ${source}`);
      }
    } else if (source instanceof ControlSource) {
      source.connect(callback);
    } else {
      console.warn(`[MidiDevice] Unknown source type for 'on':`, source);
    }
  }

  // ❌ Unregister callback
  off(source) {
    if (typeof source === 'string') {
      if (this.namedSources[source]) {
      this.namedSources[source].disconnect();
      return;
    }

      const match = source.match(/^(cc|noteOn|noteOff|note)(\d+)$/);
      if (match) {
        const type = match[1];
        const num = parseInt(match[2]);
        switch (type) {
          case 'cc':
            delete this.cc[num];
            break;
          case 'noteOn':
            delete this.noteOn[num];
            break;
          case 'noteOff':
            delete this.noteOff[num];
            break;
          case 'note':
            delete this.note[num];
            break;
        }
      }
    } else if (source instanceof ControlSource) {
      // Try to find and remove it from any map
      const maps = [this.cc, this.noteOn, this.noteOff];
      for (let map of maps) {
        for (let key in map) {
          if (map[key] === source) {
            delete map[key];
          }
        }
      }
    }
  }

  // 🔁 All note on/off events
  listenToAllNotes(callback) {
    this.allNoteCallbacks.push(callback);
  }

  macro(name, { source, type = 'default', scale = x => x, routes = [] }) {
    const virtual = new ControlSource(name);
    this.namedSources[name] = virtual;

    // Store per-route control sources
    const routeControlSources = [];

    // Track route source states
    const routeState = {};

    for (const route of routes) {
      const routeSource = route.source;
      const routeCS = new ControlSource(`${name}.${routeSource}`);
      this.namedSources[`${name}.${routeSource}`] = routeCS;
      routeControlSources.push(routeCS);

      routeState[routeSource] = false;

      this.on(routeSource, val => {
        routeState[routeSource] = val > 0;
      });
    }

    // Create the transform function
    const transform = (rawVal) => {
      let v = rawVal;

      if (type === 'inverted') v = 127 - v;
      const scaled = scale(v);

      virtual.emit(scaled);

      // emit to any active route control sources
      routes.forEach((route, i) => {
        if (routeState[route.source]) {
          routeControlSources[i].emit(scaled);
        }
      });
    };

    if (typeof source === 'string') {
      this.on(source, transform);
    } else if (source instanceof ControlSource) {
      source.connect(transform);
    } else {
      console.warn(`[macro:${name}] invalid source`);
    }

    // Return macro metadata
    return {
      name,
      virtual,
      controlSources: routeControlSources
    };
  }

  // createEncoder(name, { mod, assign, stepSize = 1 }) {
  //   const cs = new ControlSource(name);
  //   this.namedSources[name] = cs;

  //   this.encoderState = this.encoderState || {};
  //   this.encoderState[name] = {
  //     activeNote: null,
  //     assignMap: assign,
  //     stepSize,
  //     lastValue: null,
  //   };

  //   // Track which note is active
  //   for (const note in assign) {
  //     this.on(`noteOn${note}`, () => {
  //       this.encoderState[name].activeNote = Number(note);
  //     });
  //     this.on(`noteOff${note}`, () => {
  //       if (this.encoderState[name].activeNote == note) {
  //         this.encoderState[name].activeNote = null;
  //       }
  //     });
  //   }

  //   // Listen to encoder (mod source)
  //   this.on(mod, val => {
  //     const state = this.encoderState[name];
  //     const target = state.assignMap[state.activeNote];
  //     if (!target) return;

  //     // Interpret delta-style encoder: 65 = +1, 63 = -1
  //     if (state.lastValue === null) {
  //       state.lastValue = val;
  //       return;
  //     }

  //     const diff = (val === 65) ? +1 : (val === 63) ? -1 : 0;
  //     state.lastValue = val;

  //     if (diff !== 0) {
  //       const cur = target.get();
  //       const next = cur + diff * stepSize;
  //       target.set(next);
  //       cs.emit(next); // Emit to the virtual control source
  //     }
  //   });

  //   return cs;
  // }

  // 🔇 Mute/unmute device
  mute() {
    this._muted = true;
  }

  unmute() {
    this._muted = false;
  }

  // 📝 Log messages
  logEvents(enable = true) {
    this._logEvents = enable;
  }

  // 🎹 Incoming message handler
  handleMessage(e) {
    if (this._muted) return;

    const [status, data1, data2] = e.data;
    const command = status & 0xf0;

    if (this._logEvents) {
      console.log(`[MidiDevice] Message:`, e.data);
    }

    if (command === 0xB0) {
      this.ccValues[data1] = data2;
      this.getCC(data1).emit(data2);

    } else if (command === 0x90 && data2 > 0) {
      this.activeNotes[data1] = data2;
      this.getNoteOn(data1).emit(data2);
      this.getNote(data1).emit(data2);
      this.allNoteCallbacks.forEach(fn => fn({ type: 'noteOn', note: data1, velocity: data2 }));

    } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
      delete this.activeNotes[data1];
      this.getNoteOff(data1).emit(data2);
      this.getNote(data1).emit(data2);
      this.allNoteCallbacks.forEach(fn => fn({ type: 'noteOff', note: data1, velocity: data2 }));
    }
  }

  // 📨 Send a note
  send(noteNum, velocity = 127, channel = 0) {
    if (this.output) {
      this.output.send([0x90 + channel, noteNum, velocity]);
    }
  }

  sendcc(cc, val = 127, channel = 0) {
    if (this.output) {
      this.output.send([0xB0 + channel, cc, val]);
    }
  }
}