// MonophonicTemplate.js

import * as Tone from 'tone';
import * as p5 from 'p5';
import { Theory, parsePitchStringSequence, parsePitchStringBeat, getChord, pitchNameToMidi, intervalToMidi } from '../TheoryModule';
import { Seq } from '../Seq'
import { TuringMachine } from '../Turing'
import { ArrayVisualizer } from '../visualizers/VisualizeArray';
import { Parameter } from './ParameterModule.js'
import { sketch } from '../p5Library.js'


/**
 * Represents a Monophonic Synth
 * 
 * Base class for synths. Includes:
 * - methods for loading and saving presets
 * - connect/disconnect
 * - setting ADSR values for env and vcf_env objects
 * - show/hide gui, and custom createKnob function
 *
 * ## Working with presets
 * - all synths can load presets saved in the synth/synthPresets folder.
 *
 * To add preset functionality to a synth:
 * - create the preset file `synths/synthPresets/yourSynthPresets.json`
 *     - your preset file needs an open/close brace {} in it
 *
 * - make sure to:
 *     - import your presets and assign to this.presets 
 *     - name your synth correctly in its constructor
 *     - pass the gui into the synth constructor
 *     - add this optional code to the end of the constructor to load
 *         default preset:
 *     if (this.gui !== null) {
 *         this.initGui()
 *         this.hideGui();
 *         setTimeout(()=>{this.loadPreset('default')}, 500);
 *     }
 *
 * When saving presets you will need to manually download and copy
 * the preset file into synth/synthPresets/
 *
 * @constructor
 */
export class MonophonicTemplate {
    constructor() {
        this.presets = {};
        this.gui_elements = [];
        this.gui = null;
        this.poly_ref = null;
        this.super = null;
        this.frequency = new Tone.Signal();
        this.env = new Tone.Envelope();
        this.type = 'Synth';
        this.name = "";
        this.presetsData = null;
        this.curPreset = null;

        // Sequencer related
        this.seq = []; // Array of Seq instances
        this.turingMachine = null;
        this.callback = (i, time) => { }
        this.callbackLoop = new Tone.Loop((time) => {
            this.index = Math.floor(Theory.ticks / Tone.Time('16n').toTicks());
            this.callback(this.index, time = null)
        }, '16n').start()

        // Drawing
        this.seqToDraw = 0;
        this.drawing = new ArrayVisualizer(this, [0], 'Canvas', .2);
        this.drawingLoop = new Tone.Loop(time => {
            if (this.drawing.enabled === true) {
                this.drawing.startVisualFrame();
                if (this.seq[this.seqToDraw]) {
                    const seq = this.seq[this.seqToDraw];
                    if (seq.vals.length > 0) {
                        const index = Math.floor(Theory.ticks / Tone.Time(seq.subdivision).toTicks());
                        this.drawing.visualize(seq.vals, index);
                    }
                }
            }
        }, '16n').start();
    }

    
    /**
     * Save a preset by name
     * @param {string} name - Name of the preset to save
     * @returns {void}
     * @example synth.savePreset('default')
     */
    savePreset (name) {
        const _preset = {};
        for (let element of Object.values(this.gui.elements)) {
            _preset[element.id] = element.value;
        }
        console.log(this.presets, this.gui)
        // Update the presetsData in memory
        //console.log(this.presets);
        if (!this.presets[name]) {
            this.presets[name] = {};
        }
        this.presets[name] = _preset;

        console.log(`Preset saved under ${this.name}/${name}`);
    };

    /**
     * Download the presets data as a JSON file
     * @returns {void}
     * @example synth.downloadPresets()
     */
    downloadPresets ()  {
        this.presetsData = this.presets;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.presetsData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${this.name}Presets.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    /**
     * Load a preset by name
     * @param {string} name - Name of the preset to load
     * @returns {void}
     * @example synth.loadPreset('default')
     */
    loadPreset(name) {
        setTimeout(()=>{
            this.curPreset = name;
            const presetData = this.presets[this.curPreset];

            if (presetData) {
                console.log("Loading preset ", this.curPreset);
                for (let id in presetData) {
                    try {
                        for (let element of Object.values(this.gui.elements)) {
                            //console.log(element.id, element)
                            if (element.id === id) {
                                if (element.type !== 'momentary') element.set(presetData[id]);
                            }
                        }
                    } catch (e) {
                        console.log(e);
                    }
                }
            } else {
                console.log("No preset of name ", name);
            }
        },50)
    }

    logPreset() {
        const presetData = this.presets[this.curPreset];

        if (presetData) {
            console.log("Preset " + this.curPreset);
            for (let id in presetData) {
                try {
                    for (let element of Object.values(this.gui.elements)) {
                        if (element.id === id) {
                            if (element.type !== 'momentary') console.log(id, presetData[id]);
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        } else {
            console.log("No preset of name ", this.curPreset);
        }
    }

    /**
     * Console log all available presets
     * @returns {void}
     * @example synth.listPresets()
     */
    listPresets() {
        console.log("Synth presets", this.presets);
    }

    /**
     * Trigger the attack phase of the envelope
     * @param {number} val - MIDI note value
     * @param {number} vel - MIDI velocity value
     * @param {number} time - Time to trigger the attack
     * @returns {void}
     * @example synth.triggerAttack(60, 100, Tone.now())
     */
    triggerAttack(val, vel = 100, time = null) {
        vel = vel / 127;
        if (time) {
            this.frequency.setValueAtTime(Tone.Midi(val).toFrequency(), time);
            this.env.triggerAttack(time);
        } else {
            this.frequency.value = Tone.Midi(val).toFrequency();
            this.env.triggerAttack();
        }
    }

    /**
     * Trigger the release phase of the envelope
     * @param {number} val - MIDI note value
     * @param {number} time - Time to trigger the release
     * @returns {void}
     * @example synth.triggerRelease(60, Tone.now())
     * @example synth.triggerRelease(60)
     */
    triggerRelease(val, time = null) {
        if (time) this.env.triggerRelease(time);
        else this.env.triggerRelease();
    }

    /**
     * Trigger the attack and release phases of the envelope
     * @param {number} val - MIDI note value
     * @param {number} vel - MIDI velocity value
     * @param {number} dur - Duration of the attack and release
     * @param {number} time - Time to trigger the attack and release
     * @returns {void}
     * @example synth.triggerAttackRelease(60, 100, 0.01, Tone.now())
     * @example synth.triggerAttackRelease(60, 100, 0.01)
     */
    triggerAttackRelease(val, vel = 100, dur = 0.01, time = null) {
        console.log('AR ',val,vel,dur,time)
        vel = vel / 127;
        if (time) {
            this.frequency.setValueAtTime(Tone.Midi(val).toFrequency(), time);
            this.env.triggerAttackRelease(dur, time);
        } else {
            this.frequency.value = Tone.Midi(val).toFrequency();
            this.env.triggerAttackRelease(dur);
        }
    }

    generateParameters(paramDefinitions) {
        const params = {};
        paramDefinitions.forEach((def) => {
            const param = new Parameter(def);
            params[def.name] = param;
        });
        return params;
    }



    createAccessors(parent, params) {
        Object.keys(params).forEach((key) => {
            const param = params[key];
            let currentSeq = null; // Track active sequence

            if (typeof param.set !== 'function' || typeof param.get !== 'function') {
                throw new Error(`Parameter '${key}' does not have valid get/set methods`);
            }

            // Proxy handler to intercept method calls
            const proxyHandler = {
                get(target, prop) {
                    //console.log(target,prop)
                    if (prop === 'sequence') return (valueArray, subdivision = '16n') => {
                        if (currentSeq) {
                            currentSeq.dispose(); // Dispose of existing sequence
                        }
                        currentSeq = new Seq(
                            parent,
                            valueArray,
                            subdivision,
                            'infinite',
                            0,
                            (v, time) => param.set(Number(v[0]),null,false, time) // Ensure time is passed
                        );
                    };
                    if (prop === 'stop') return () => {
                        if (currentSeq) {
                            currentSeq.dispose();
                            currentSeq = null;
                        }
                    };
                    return target.get(); // Return the current value
                },
                set(target, _, newValue) {
                    console.log(target, _, newValue)
                    if (Array.isArray(newValue)) {
                        if (currentSeq) currentSeq.dispose();
                        currentSeq = new Seq(
                            parent,
                            newValue,
                            param.subdivision || '16n',
                            'infinite',
                            0,
                            (v, time) => param.set(Number(v[0]),null,false, time) // Ensure time is passed
                        );
                    } else {
                        if (currentSeq) {
                            currentSeq.dispose();
                            currentSeq = null;
                        }
                        param.set(newValue);
                    }
                    return true;
                }
            };

            // Define the parameter with a Proxy
            Object.defineProperty(parent, key, {
                get: () => new Proxy(param, proxyHandler),
                set: (newValue) => param.set(newValue),
            });
        });
    }//accessors

    setParameter(name, value, time = null) {
        const param = this.param[name];
        if (!param) throw new Error(`Parameter '${name}' does not exist.`);
        
        if (time) {
            // Handle sequenced parameter updates
            param.callback(value, time);
        } else {
            // Handle immediate parameter updates
            param.callback(value);
        }

        // Update associated GUI elements
        if (param.guiElement) {
            param.guiElement.setValue(value);
        }
    }

    get() {
        let output = 'Parameters:\n';
        for (let key in this.param) {
            const param = this.param[key];
            output += `${param.name}: ${param._value}\n`;
        }
        console.log(output);
    }

    /**
     * Set the ADSR values for the envelope
     * @param {number} a - Attack time
     * @param {number} d - Decay time
     * @param {number} s - Sustain level
     * @param {number} r - Release time
     * @returns {void}
     * @example synth.setADSR(0.01, 0.1, 0.5, 0.1)
     */
    setADSR(a, d, s, r) {
        if (this.env) {
            this.attack = a > 0.001 ? a : 0.001;
            this.decay = d > 0.01 ? d : 0.01;
            this.sustain = Math.abs(s) < 1 ? s : 1;
            this.release = r > 0.01 ? r : 0.01;
        }
    }

    /**
     * Set the ADSR values for the filter envelope
     * @param {number} a - Attack time
     * @param {number} d - Decay time
     * @param {number} s - Sustain level
     * @param {number} r - Release time
     * @returns {void}
     * @example synth.setFilterADSR(0.01, 0.1, 0.5, 0.1)
     */
    setFilterADSR(a, d, s, r) {
        if (this.vcf_env) {
            this.vcf_env.attack = a > 0.001 ? a : 0.001;
            this.vcf_env.decay = d > 0.01 ? d : 0.01;
            this.vcf_env.sustain = Math.abs(s) < 1 ? s : 1;
            this.vcf_env.release = r > 0.01 ? r : 0.01;
        }
    }

    /**
     * Initialize the GUI
     * @param {object} gui - p5.gui object
     * @param {number} x - X position of the GUI
     * @param {number} y - Y position of the GUI
     * @returns {void}
     * @example 
     * const gui = new p5(sketch, 'Canvas1');
     * synth.initGui(gui, 10, 10)
     */
    initGui(gui, x = 10, y = 10) {
        let target = document.getElementById('Canvas');
        //console.log(this.gui)
        this.gui = new p5(sketch,target );
        //console.log(this.gui)
        //this.gui = gui
        this.x = x;
        this.y = y;
        this.gui_elements = [];
    }

    /**
     * Hide the GUI
     * @returns {void}
     */
    hideGui() {
        for (let i = 0; i < this.gui_elements.length; i++) {
            this.gui_elements[i].hide = true;
        }
    }

    /**
     * Show the GUI
     * @returns {void}
     */
    showGui() {
        for (let i = 0; i < this.gui_elements.length; i++) this.gui_elements[i].hide = false;
    }

    /**
     * Fast way to create a knob GUI element
     * @param {string} _label - Label for the knob
     * @param {number} _x - X position of the knob
     * @param {number} _y - Y position of the knob
     * @param {number} _min - Minimum value of the knob
     * @param {number} _max - Maximum value of the knob
     * @param {number} _size - Size of the knob
     * @param {string} _accentColor - Accent color of the knob
     * @param {function} callback - Callback function for the knob
     * @returns {object} - p5.gui knob object
     * @example
     * this.createKnob('Attack', 10, 10, 0.01, 1, 100, '#ff0000', (val) => {
     *    this.setADSR(val, this.gui.get('Decay').value(), this.gui.get('Sustain').value(), this.gui.get('Release').value());
     * });
     */
    createKnob(_label, _x, _y, _min, _max, _size, _accentColor, callback) {
        return this.gui.Knob({
            label: _label, min: _min, max: _max, size: _size, accentColor: _accentColor,
            x: _x + this.x, y: _y + this.y,
            callback: callback,
            showLabel: 1, showValue: 1,
            curve: 2,
            border: 2
        });
    }

    /**
     * Connects to Tone.js destination
     * @param {object} destination - Tone.js destination object
     * @returns {void}
     * @example 
     * const amp = new Tone.Gain(0.5).toDestination();
     * synth.connect(amp)
     */
    connect(destination) {
        if (destination.input) {
            this.output.connect(destination.input);
        } else {
            this.output.connect(destination);
        }
    }

    /**
     * Disconnects from Tone.js destination
     * @param {object} destination - Tone.js destination object
     * @returns {void}
     * @example
     * const amp = new Tone.Gain(0.5).toDestination();
     * synth.connect(amp)
     * synth.disconnect(amp)
     */
    disconnect(destination) {
        if (destination.input) {
            this.output.disconnect(destination.input);
        } else {
            this.output.disconnect(destination);
        }
    }

    /**
     * Sequences the provided array of notes and initializes a Tone.Loop with the given subdivision.
     *
     * @param {string} arr - The sequence of notes as a string.
     * @param {string} [subdivision] - The rhythmic subdivision for the loop (e.g., '16n', '8n').
     * @param {string} num (default 0) - the sequence number. Up to 10 sequences per instance.
     */
    sequence(arr, subdivision = '8n', num = 0, phraseLength = 'infinite') {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, arr, subdivision, phraseLength, num, this.parseNoteString.bind(this));
        } else {
            this.seq[num].sequence(arr, subdivision, phraseLength);
        }
        this.start(num);
    }

    /**
     * Plays the provided sequence array initializes a Tone.Loop with the given subdivision.
     *
     * @param {string} arr - The sequence of notes as a string.
     * @param {number} iterations - The the number of times to play the sequence
     * @param {string} [subdivision] - The rhythmic subdivision for the loop (e.g., '16n', '8n').
     * @param {string} num (default 0) - the sequence number. Up to 10 sequences per instance.
     */
    setSeq(arr, subdivision = '8n', num = 0) {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, arr, subdivision, 'infinite', num, this.parseNoteString.bind(this));
        } else {
            this.seq[num].setSeq(arr, subdivision);
        }
    }

    play(num = 0, length = null) {
        if (this.seq[num]) {
            this.seq[num].play(length);
        }
    }

    expr(func, len = 32, subdivision = '16n', num = 0) {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, [], subdivision, 'infinite', num, this.parseNoteString.bind(this));
        }
        this.seq[num].expr(func, len, subdivision);
    }

    set velocity(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].velocity = val
        }
    }

    set octave(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].octave = val
        }
    }

    set sustain(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].sustain = val
        }
    }

    set subdivision(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].subdivision = val
        }
    }

    set transform(val) {
        if (typeof val !== 'function') {
            console.warn(`Transform must be a function. Received: ${typeof val}`);
            return;
        }
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].transform = val
        }
    }

    set roll(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].roll = val
        }
    }


    /**
     * Sets the transformation for the loop.
     * 
     * @param {string} transform - The transformation to apply.
     */
    setTransform(transform, num = 'all') {
        if (num === 'all') {
            for (let seq of this.seq) {
                if (seq) seq.setTransform(transform);
            }
        } else {
            if (this.seq[num]) this.seq[num].setTransform(transform);
        }
    }

    get sustain() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setSustain(value);
                    }
                }
                return true; // Indicate success
            }
        });
    }

    get velocity() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setVelocity(value);
                    }
                }
                return true;
            }
        });
    }

    get octave() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setOctave(value);
                    }
                }
                return true;
            }
        });
    }

    get subdivision() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setSubdivision(value);
                    }
                }
                return true;
            }
        });
    }

    get roll() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setRoll(value);
                    }
                }
                return true;
            }
        });
    }

    get transform() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setTransform(value);
                    }
                }
                return true;
            }
        });
    }

    start(num = 'all') {
        if (num === 'all') {
            for (let seq of this.seq) {
                if (seq) seq.start();
            }
            this.drawingLoop.start();
        } else {
            if (this.seq[num]) this.seq[num].start();
        }
    }

    stop(num = 'all') {
        if (num === 'all') {
            for (let seq of this.seq) {
                if (seq) seq.stop();
            }
            this.drawingLoop.stop();
        } else {
            if (this.seq[num]) this.seq[num].stop();
        }
    }

    turing(val){

    }

    // Visualizations

    draw(arr = this.drawing.array, target = this.drawing.target, ratio = this.drawing.ratio) {
        this.drawing = new ArrayVisualizer(arr, target, ratio);
    }

    getSeqParam(val, index) {
        //console.log(val, index,)
        if (Array.isArray(val)) return val[index % val.length];
        else return val;
    }

    parseNoteString(val, time, index, num) {
        //console.log(val,time,index, num)
        if (val[0] === ".") return;

        const usesPitchNames = /^[a-gA-G]/.test(val[0][0]);

        let note = '';
        if (usesPitchNames) note = pitchNameToMidi(val[0]);
        else note = intervalToMidi(val[0], this.min, this.max);

        if (note < 0) return;

        let octave = this.getSeqParam(this.seq[num].octave, index);
        let velocity = this.getSeqParam(this.seq[num].velocity, index);
        let sustain = this.getSeqParam(this.seq[num].sustain, index);
        let subdivision = this.getSeqParam(this.seq[num].subdivision, index);
        //octave = 0
        //velocity=100

        try {
            //console.log('trig', time, val[1], Tone.Time(this.subdivision))
            this.triggerAttackRelease(
                note + octave * 12,
                velocity,
                sustain,
                time + val[1] * (Tone.Time(subdivision))
            );
        } catch (e) {
            console.log('invalid note', note + octave * 12, velocity, sustain, time + val[1] * Tone.Time(subdivision));
        }
    }
}
