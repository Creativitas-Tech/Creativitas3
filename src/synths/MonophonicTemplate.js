// MonophonicTemplate.js

import * as Tone from 'tone';
import * as p5 from 'p5';
import { Theory, parsePitchStringSequence, parsePitchStringBeat, getChord, pitchNameToMidi, intervalToMidi } from '../TheoryModule';
import { Seq } from '../Seq'
import { TuringMachine } from '../Turing'
import { ArrayVisualizer } from '../visualizers/VisualizeArray';
import { Parameter } from './ParameterModule.js'
import { NexusDial } from '../nexus/Dial.js'
import { NexusSlider } from '../nexus/Slider.js'
import { NexusNumberBox } from '../nexus/NumberBox.js'
import { NexusRadioButton } from '../nexus/RadioButton.js'
import { sketch } from '../p5Library.js'
import basicLayout from './layouts/basicLayout.json';
import Groove from '../Groove.js'
import { initConsole, deinitConsole, hasConsole, consoleWrite } from '../visualizers/Console.js';

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
        this.synthPresetName = ""
        this.gui_elements = [];
        this.gui = null;
        this.guiContainer = null;
        this.guiHeight = 1
        this.layout = basicLayout
        this.poly_ref = null;
        this.super = null;
        this.type = 'Synth';
        this.name = "";
        this.presetsData = null;
        this.curPreset = null;
        this.backgroundColor = [10,10,10]
        this.snapshots = {}

        // Sequencer related
        this.seq = []; // Array of Seq instances
        this.prevEventTiming = 0
        this.turingMachine = null;
        this.callback = (i, time) => { }
        this.callbackLoop = new Tone.Loop((time) => {
            this.index = Math.floor(Theory.ticks / Tone.Time('16n').toTicks());
            this.callback(this.index, time = null)
        }, '16n').start()
        // Sequencer parameters
        this._subdivision = '8n'; // Local alias
        this._octave = 0;                // Local alias
        this._duration = .1;             // Local alias
        this._roll = 0.0;               // Local alias
        this._velocity = 100;            // Local alias
        this._orn =[0];            // Local alias
        this._lag = 0;            // Local alias
        this._pedal = 0;
        this._rotate = 0;   //actual permanent rotate amount, about the thoery.tick
        this._offset = null;   //internal variable for calculating rotation specifically for play
        this._transform = (x) => x;      // Local alias
        this.pianoRoll = null

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
     * Populate this.presets with presets fetched from the server
     * Using the name in this.synthPresetName
     */
    async accessPreset(){      
        let presetData = {} 
        try {
            let response = await fetch('https://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/'+this.synthPresetName+'.json')
            let jsonString = ""
                if (!response.ok) {
                    // Handle HTTP errors (e.g., 404 Not Found, 500 Internal Server Error)
                    console.warn("Error accessing file");
                }else{
                    jsonString = await response.text();
                }
                presetData = JSON.parse(jsonString);
                //console.log("jsonString", jsonString);
                //console.log("presetData", presetData);
        } catch (error) {
            console.warn("Error parsing JSON:", error);
        }
        this.presets = await presetData;
        //this.loadPreset("default");
    }
    
    /**
     * Save a preset by name
     * @param {string} name - Name of the preset to save
     * @returns {void}
     * @example synth.savePreset('default')
     */
    //async savePreset (name) {
    savePreset (name) {
        const _preset = {};
        for (let element of Object.values(this.param)) {
            _preset[element.name] = element._value;
        }
        this.printToConsole(this.presets)
        // Update the presetsData in memory
        //console.log(this.presets);
        if (!this.presets[name]) {
            this.presets[name] = {};
        }
        this.presets[name] = _preset;

        //  try {
        //     const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/save', {
        //         method: 'POST', // Specify the HTTP method
        //         headers: {
        //             'Content-Type': 'application/json' // Tell the server we're sending JSON
        //         },
        //         body: JSON.stringify({ // Convert your data to a JSON string for the body
        //             name: this.synthPresetName,
        //             data: this.presets
        //     })
        //     });

        //     const result = await response.json(); // Parse the server's JSON response

        //     if (response.ok) {
        //         console.log(`Save successful: ${result.message}`);
        //         return result.success;
        //     } else {
        //         console.warn(`Save failed: ${result.message}`);
        //         // You might want to throw an error here or handle specific status codes
        //         return false;
        //     }
        // } catch (error) {
        //     console.error(`Error sending save request for '${name}':`, error);
        //     return false;
        // }

        //old preset code below
        
        
        this.printToConsole(`Preset saved under ${this.name}/${name}`);
    };

    async deletePreset (name) {
        // Update the presetsData in memory
        //console.log(this.presets);
        if (this.presets[name]) {
            delete this.presets[name]
            try {
                const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/save', {
                    method: 'POST', // Specify the HTTP method
                    headers: {
                        'Content-Type': 'application/json' // Tell the server we're sending JSON
                    },
                    body: JSON.stringify({ // Convert your data to a JSON string for the body
                        name: this.synthPresetName,
                        data: this.presets
                })
                });

                const result = await response.json(); // Parse the server's JSON response

                if (response.ok) {
                    this.printToConsole(`Delete successful: ${result.message}`);
                    return result.success;
                } else {
                    console.warn(`Delete failed: ${result.message}`);
                    // You might want to throw an error here or handle specific status codes
                    return false;
                }
            } catch (error) {
                console.error(`Error sending delete request for '${name}':`, error);
                return false;
            }
        }

        this.printToConsole(`Preset deleted  under ${this.name}/${name}`);
    };

    async downloadAllPresets() {
    try {
        const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/download_presets');
        if (!response.ok) {
            console.error('Failed to download presets:', response.status, response.statusText);
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'synth_presets.zip'; // The filename the user will see
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url); // Clean up the object URL
        this.printToConsole('Presets folder downloaded successfully.');
    } catch (error) {
        console.error('Error downloading presets:', error);
    }
}

    /**
     * Load a preset by name
     * @param {string} name - Name of the preset to load
     * @returns {void}
     * @example synth.loadPreset('default')
     */
    loadPreset(name) {
        this.curPreset = name;
        const presetData = this.presets[this.curPreset];

        if (presetData) {
          //console.log("Loading preset", this.curPreset, presetData);
          for (let name in presetData) {
            try {
              if (this.param[name]?.set) {
                this.param[name].set(presetData[name]);
              }
            } catch (e) {
              this.printToConsole(name, presetData[name], e);
            }
          }
          //console.log(this.param.vco_mix)
        } else {
            this.printToConsole("No preset of name ", name);
        }
    }

    logPreset() {
        const presetData = this.presets[this.curPreset];

        if (presetData) {

          let output = 'Parameters:\n';
          for (let key in presetData) {
              const param = presetData[key];
              if (Array.isArray(param)) {
                  const formattedArray = param.map((value) => {
                      if (typeof value === "number") {
                          return Number(value.toFixed(2)); // Limit to 2 decimals
                      }
                      return value; // Keep non-numbers unchanged
                  });

                  output += `${key}: [${formattedArray.join(", ")}]\n`; // Add the array to output
              }
              else if(typeof param === 'number') output += `${key}: ${param.toFixed(2)}\n`;
              else output += `${key}: ${param}\n`;
          }
          this.printToConsole(output);
        }

        else {
            this.printToConsole("No preset of name ", this.curPreset);
        }
    }

    /**
     * Console log all available presets
     * @returns {void}
     * @example synth.listPresets()
     */
    listPresets() {
        this.printToConsole("Synth presets", this.presets);
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
        //console.log('AR ',val,vel,dur,time)
        vel = vel / 127;
        if (time) {
            this.frequency.setValueAtTime(Tone.Midi(val).toFrequency(), time);
            this.env.triggerAttackRelease(dur, time);
        } else {
            this.frequency.value = Tone.Midi(val).toFrequency();
            this.env.triggerAttackRelease(dur);
        }
    }

    releaseAll(time = null){
        // console.log("releaseAll")
        if(this.env) this.env.triggerRelease(0,time)
    }

    generateParameters(paramDefinitions) {
        // console.log(paramDefinitions)
        const params = {};
        paramDefinitions.forEach((def) => {
            //console.log(def)
            const param = new Parameter(this,def);
            //console.log(param)
            params[def.name] = param;
        });
        //console.log(params)
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
                get(target, prop,value=null) {
                    if (prop === 'sequence') return (valueArray, subdivision = '16n') => {
                        param.sequence(valueArray,subdivision)
                    };
                    if (prop === 'stop') return () => {
                        param.stop()
                    };
                    if (prop === 'set') return () => {
                        //console.log('set',target,prop,value)
                        const rawValue = (typeof value === 'function') ? value() : value.value;
                        if (currentSeq) {
                            currentSeq.dispose();
                            currentSeq = null;
                        }
                        //console.log(target,prop,rawValue)
                        param.set(value,null,false) 
                    };
                    if (prop === 'from') {
                      return (source, options = {}) => {
                        param.from(source, options);
                      };
                    }
                    return target.get(); // Return the current value
                },
                set(target, _, newValue) {
                    if (Array.isArray(newValue)) {
                        // console.log(target, newValue)
                        if (currentSeq) currentSeq.dispose();
                        currentSeq = new Seq(
                            parent,
                            newValue,
                             '4n',
                            'infinite',
                            0,
                            ((v, time) => param.set(Number(v[0]),null,false, time)) // Ensure time is passed
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
                set: (newValue) => {
                    if (Array.isArray(newValue)) {
                        param.sequence(newValue, this.seq[0].subdivision)
                    } else {
                        param.stop()
                        param.set(newValue);
                    }
                },
            });
        });
    }//accessors

    // Method to trigger the sequence in the Proxy
    startSequence(paramName, valueArray, subdivision = '16n') {
        const param = this.param[paramName];

        if (param ) {
            param.sequence(valueArray, subdivision);
        } else {
            console.warn(`Param ${paramName} has no sequence method or doesn't exist.`);
        }
    }

    stopSequence(paramName) {
        const param = this.param[paramName];
        if (param.seq ) {
            param.stop(); 
        } else {
            //console.warn(`Param ${paramName} has no stop method or doesn't exist.`);
        }
    }

    get() {
        let output = '\t' + this.name + ' Parameters:\n';
        for (let key in this.param) {
            const param = this.param[key];
            let value = param._value
            //console.log(value)
            if( typeof value === 'number') {
                if(value > 100) value = value.toFixed()
                else if( value > 1) value = value.toFixed(1)
                else value = value.toFixed(3)
            }
            output += `${param.name}: ${value}\n`;
        }
        this.printToConsole(output);
    }
    print(){ this.get()}

    printToConsole( data ){
        if( hasConsole ) consoleWrite( data )
        console.log(data)
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
     * @returns {void}
     * @example 
     * const gui = new p5(sketch, 'Canvas1');
     * synth.initGui(gui, 10, 10)
     */
    initGui(gui = null) {
        this.guiContainer = document.getElementById('Canvas');
        const sketchWithSize = (p) => sketch(p, { height: this.guiHeight });
        //console.log(this.guiHeight)
        this.gui = new p5(sketchWithSize, this.guiContainer);
        const layout = this.layout;
        //console.log(layout);

        // Group parameters by type
        const groupedParams = {};
        Object.values(this.param).forEach((param) => {
            if (!groupedParams[param.type]) groupedParams[param.type] = [];
            groupedParams[param.type].push(param);
        });

        // Create GUI for each group
        Object.keys(groupedParams).forEach((groupType) => {
            const groupLayout = layout[groupType];
            if (!groupLayout) return;
            if (groupType === 'hidden') return;

            let indexOffset = 0;

            groupedParams[groupType].forEach((param, index) => {
                const isGroupA = groupLayout.groupA.includes(param.name);
                const controlType = isGroupA ? groupLayout.controlTypeA : groupLayout.controlTypeB;
                const size = isGroupA ? groupLayout.sizeA : groupLayout.sizeB;

                // **Retrieve the current parameter value**
                const paramValue = param.get ? param.get() : param._value;

                if (Array.isArray(paramValue)) {
                    paramValue.forEach((value, i) => {
                        let xOffset = groupLayout.offsets.x * ((index + indexOffset) % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
                        let yOffset = groupLayout.offsets.y * Math.floor((index + indexOffset) / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));

                        const x = groupLayout.boundingBox.x + xOffset;
                        const y = groupLayout.boundingBox.y + yOffset;

                        this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color, i, value });
                        indexOffset++;
                    });
                } else {
                    let xOffset = groupLayout.offsets.x * ((index + indexOffset) % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
                    let yOffset = groupLayout.offsets.y * Math.floor((index + indexOffset) / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));

                    const x = groupLayout.boundingBox.x + xOffset;
                    const y = groupLayout.boundingBox.y + yOffset;

                    // Pass the **retrieved parameter value** to GUI
                    this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color, value: paramValue });
                }
            });
        });
        this.gui.setTheme(this.gui, 'dark' )
        this.gui.backgroundColor = this.backgroundColor
        //setTimeout(this.loadPreset('default'),1000)
        //setTimeout(this.gui.setTheme(this.gui, 'dark' ),1000)
    }

    /**
     * Initialize the GUI with NexusUI
     * @returns {void}
     * @example     
     * synth.initNexus()
     */
    initNexus(gui = null) {
        this.guiContainer = document.getElementById('Canvas');
        if (!this.guiContainer) {
            console.error('NexusUI container #Canvas not found in DOM');
            return;
        }
        
        // Track created labels for cleanup
        this.nexusLabels = [];
        
        // Flag to indicate NexusUI GUI is initialized (not p5)
        this.gui = 'nexus';
        this.isNexusGui = true;
        const layout = this.layout;
        
        if (!layout) {
            console.error('No layout defined for this synth');
            return;
        }
        
        this.printToConsole(`[initNexus] Initializing NexusUI GUI for ${this.name || 'synth'}`);

        // Group parameters by type
        const groupedParams = {};
        Object.values(this.param).forEach((param) => {
            if (!groupedParams[param.type]) groupedParams[param.type] = [];
            groupedParams[param.type].push(param);
        });

        // Create GUI for each group
        Object.keys(groupedParams).forEach((groupType) => {
            const groupLayout = layout[groupType];
            if (!groupLayout) {
                // console.log(`[initNexus] No layout for group: ${groupType}`);
                return;
            }
            if (groupType === 'hidden') return;

            let indexOffset = 0;

            groupedParams[groupType].forEach((param, index) => {
                const isGroupA = groupLayout.groupA.includes(param.name);
                const controlType = isGroupA ? groupLayout.controlTypeA : groupLayout.controlTypeB;
                const size = isGroupA ? groupLayout.sizeA : groupLayout.sizeB;

                // **Retrieve the current parameter value**
                const paramValue = param.get ? param.get() : param._value;

                // Calculate items per row safely (avoid division by zero)
                const itemsPerRow = groupLayout.offsets.x > 0 
                    ? Math.max(1, Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x))
                    : 1;

                // Extract optional layout settings
                const orientation = groupLayout.orientation || 'horizontal';
                const showValue = groupLayout.showValue || false;

                if (Array.isArray(paramValue)) {
                    paramValue.forEach((value, i) => {
                        let xOffset = groupLayout.offsets.x * ((index + indexOffset) % itemsPerRow);
                        let yOffset = groupLayout.offsets.y * Math.floor((index + indexOffset) / itemsPerRow);

                        const x = groupLayout.boundingBox.x + xOffset;
                        const y = groupLayout.boundingBox.y + yOffset;

                        this.createNexusElement(param, { x, y, size, controlType, color: groupLayout.color, i, value, orientation, showValue });
                        indexOffset++;
                    });
                } else {
                    let xOffset = groupLayout.offsets.x * ((index + indexOffset) % itemsPerRow);
                    let yOffset = groupLayout.offsets.y * Math.floor((index + indexOffset) / itemsPerRow);

                    const x = groupLayout.boundingBox.x + xOffset;
                    const y = groupLayout.boundingBox.y + yOffset;

                    // Pass the **retrieved parameter value** to GUI
                    this.createNexusElement(param, { x, y, size, controlType, color: groupLayout.color, value: paramValue, orientation, showValue });
                }
            });
        });
        
        // Apply theme colors to all Nexus elements
        if (this.backgroundColor) {
            document.body.style.backgroundColor = `rgb(${this.backgroundColor[0]}, ${this.backgroundColor[1]}, ${this.backgroundColor[2]})`;
        }
        
        this.printToConsole(`[initNexus] GUI initialization complete`);
    }
    
    /**
     * Hide/destroy the NexusUI GUI
     * @returns {void}
     */
    hideNexus() {
        // Destroy all NexusUI elements from parameters
        Object.values(this.param).forEach((param) => {
            if (param.guiElements && param.guiElements.length > 0) {
                param.guiElements.forEach((element) => {
                    if (element && element.destroy) {
                        element.destroy();
                    }
                });
                param.guiElements = [];
            }
        });
        
        // Remove all created labels
        if (this.nexusLabels) {
            this.nexusLabels.forEach((label) => {
                if (label && label.parentNode) {
                    label.parentNode.removeChild(label);
                }
            });
            this.nexusLabels = [];
        }
        
        this.gui = null;
        this.isNexusGui = false;
    }

    /**
     * Hide the GUI
     * @returns {void}
     */
    hideGui() {
        // Check if using NexusUI
        if (this.isNexusGui || this.gui === 'nexus') {
            this.hideNexus();
            return;
        }
        
        // Otherwise assume p5 instance
        if (this.gui && this.gui.remove) {
            this.gui.remove(); // Properly destroy p5 instance
            this.gui = null;
        }
    }

    /**
     * Show the GUI
     * @returns {void}
     */
    showGui() {
        this.initGui()
    }

    // Create individual GUI element
    createGuiElement(param, { x, y, size, controlType, color, i=null }) {
        //console.log('createG', param, x,y,size,controlType, i)
        if (controlType === 'knob') {
            param.guiElements.push(this.gui.Knob({
                label: i ? param.labels[i] : param.name,
                min: param.min,
                max: param.max,
                value: param._value,
                size: size , // Scale size
                curve: param.curve,
                x,
                y,
                accentColor: color,
                callback: (value) => param.set(value,i,true),
            }));
        } else if (controlType === 'fader') {
            param.guiElements.push(this.gui.Fader({
                label: i ? param.labels[i] : param.name,
                min: param.min,
                max: param.max,
                value: param._value,
                curve: param.curve,
                size: size , // Scale size
                x,
                y,
                accentColor: color,
                callback: (value) => param.set(value,i,true),
            }));
        } else if (controlType === 'radioButton') {
            if (!Array.isArray(param.radioOptions) || param.radioOptions.length === 0) {
                console.warn(`Parameter "${param.name}" has no options defined for radioBox.`);
                return null;
            }

            param.guiElements.push(this.gui.RadioButton({
                label: i ? param.labels[i] : param.name,
                radioOptions: param.radioOptions,
                value: param._value,
                x:x,
                y:y+10,
                accentColor: color,
                callback: (selectedOption) => param.set(selectedOption,i,true),
            }));
        } else if (controlType === 'dropdown') {
            // if (!Array.isArray(param.radioOptions) || param.radioOptions.length === 0) {
            //     console.warn(`Parameter "${param.name}" has no options defined for radioBox.`);
            //     return null;
            // }

            param.guiElements.push( this.gui.Dropdown({
                label: i ? param.labels[i] : param.name, 
                dropdownOptions: this.drumkitList,
                value: param._value,
                x:x,
                y:y+10,
                size:15,
                accentColor: color,
                callback:(x)=>{this.loadSamples(x)}
              }))
        } else if (controlType === 'text') {
            param.guiElements.push( this.gui.Text({
                label: param.max,
                value: param._value,
                x:x+2,
                y:y+10,
                border:0.01,
                textSize: size,
                accentColor: color,
                callback: (x) => {},
            }) );
        } else {
            this.printToConsole('no gui creation element for ', controlType)
        }
    }

    // Helper to convert RGB array to hex color string
    rgbToHex(colorArray) {
        if (!colorArray || !Array.isArray(colorArray)) return '#FFFFFF';
        const [r, g, b] = colorArray;
        return '#' + [r, g, b].map(x => {
            const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    // Create individual GUI element using NexusUI wrappers
    createNexusElement(param, { x, y, size, controlType, color, i=null, value, orientation='horizontal', showValue=false }) {
        // console.log('createNexusElement', param.name, { x, y, size, controlType, color, i, value });
        
        // Convert p5 percentage coordinates (0-100) to pixel coordinates
        const container = document.getElementById('Canvas');
        const containerWidth = container ? container.clientWidth : window.innerWidth;
        const containerHeight = container ? container.clientHeight : window.innerHeight;
        
        // Convert from p5 percentage (0-100) to pixels
        const pixelX = (x / 100) * containerWidth;
        const pixelY = (y / 100) * containerHeight;
        
        // Calculate dial size - use a fixed base size scaled by the size parameter
        // Target: ~50-70px dials that scale slightly with container
        const baseDialSize = 55;  // Base dial size in pixels
        const width = Math.round(baseDialSize * size);
        const height = width;  // Keep square for dials
        
        // Get the actual value to use
        const paramValue = value !== undefined ? value : 
            (i !== null && Array.isArray(param._value) ? param._value[i] : param._value);
        
        // Convert RGB array to hex for NexusUI
        const hexColor = Array.isArray(color) ? this.rgbToHex(color) : color;
        
        // Create label element for parameter name and store for cleanup
        const createLabel = (labelText, labelX, labelY, labelWidth) => {
            const label = document.createElement('div');
            label.textContent = labelText;
            label.style.cssText = `
                position: absolute;
                left: 0px;
                top: -18px;
                color: ${hexColor || '#AAAAAA'};
                font-family: monospace;
                font-size: 11px;
                pointer-events: none;
                user-select: none;
                text-align: center;
                width: ${labelWidth}px;
            `;
            return label;
        };
        
        if (controlType === 'knob') {
            const dial = new NexusDial(pixelX, pixelY, width, height, showValue);
            
            // IMPORTANT: Set min/max BEFORE value to ensure proper clamping
            dial.min = param.min || 0;
            dial.max = param.max || 1;
            
            // Validate and clamp value
            let safeValue = paramValue;
            if (typeof safeValue !== 'number' || isNaN(safeValue) || !isFinite(safeValue)) {
                safeValue = dial.min;
            }
            safeValue = Math.max(dial.min, Math.min(dial.max, safeValue));
            dial.value = safeValue;
            
            // Update value display with initial value
            if (showValue) {
                dial._updateValueDisplay(safeValue);
            }
            
            // Apply color if provided
            if (hexColor) {
                dial.colorize("accent", hexColor);
            }
            
            // Create label above the dial - add to the dial's container
            const labelText = i !== null && param.labels ? param.labels[i] : param.name;
            const label = createLabel(labelText, 0, 0, width);
            if (dial.elementContainer) {
                dial.elementContainer.appendChild(label);
            }
            if (this.nexusLabels) {
                this.nexusLabels.push(label);
            }
            
            // Set up the callback
            dial.mapTo((v) => param.set(v, i, true));
            
            param.guiElements.push(dial);
            
        } else if (controlType === 'fader') {
            // Faders are vertical sliders - make them taller than wide
            const sliderWidth = width * 0.5;
            const sliderHeight = width * 2;
            
            const slider = new NexusSlider(pixelX, pixelY, sliderWidth, sliderHeight);
            
            // IMPORTANT: Set min/max BEFORE value to ensure proper clamping
            slider.min = param.min || 0;
            slider.max = param.max || 1;
            
            // Validate and clamp value
            let safeValue = paramValue;
            if (typeof safeValue !== 'number' || isNaN(safeValue) || !isFinite(safeValue)) {
                safeValue = slider.min;
            }
            safeValue = Math.max(slider.min, Math.min(slider.max, safeValue));
            slider.value = safeValue;
            
            // Apply color if provided
            if (hexColor) {
                slider.colorize("accent", hexColor);
            }
            
            // Create label above the slider - add to the slider's container
            const labelText = i !== null && param.labels ? param.labels[i] : param.name;
            const label = createLabel(labelText, 0, 0, sliderWidth);
            if (slider.elementContainer) {
                slider.elementContainer.appendChild(label);
            }
            if (this.nexusLabels) {
                this.nexusLabels.push(label);
            }
            
            // Set up the callback
            slider.mapTo((v) => param.set(v, i, true));
            
            param.guiElements.push(slider);
            
        } else if (controlType === 'radioButton') {
            // Get the options from the parameter's radioOptions
            const options = param.radioOptions || [];
            if (options.length === 0) {
                console.warn(`RadioButton has no options for param: ${param.name}`);
                return;
            }
            
            // Calculate button dimensions - smaller for vertical, wider for horizontal
            const buttonWidth = orientation === 'vertical' ? 55 : Math.max(40, width);
            const buttonHeight = 22;
            
            const radioBtn = new NexusRadioButton(pixelX, pixelY, options, {
                buttonWidth,
                buttonHeight,
                orientation: orientation,  // Use layout orientation
                showLabel: true,
                label: param.name
            });
            
            // Apply color if provided
            if (hexColor) {
                radioBtn.colorize('accent', hexColor);
            }
            
            // Set initial value
            const currentValue = paramValue !== undefined ? paramValue : options[0];
            radioBtn.ccSet(currentValue);
            
            // Set up the callback
            radioBtn.mapTo((v) => param.set(v, i, true));
            
            param.guiElements.push(radioBtn);
        } else if (controlType === 'dropdown') {
            // Dropdown not yet implemented in NexusUI wrappers
            console.warn(`Dropdown controlType not yet supported with NexusUI for param: ${param.name}`);
        } else if (controlType === 'text') {
            // Text display not yet implemented in NexusUI wrappers
            console.warn(`Text controlType not yet supported with NexusUI for param: ${param.name}`);
        } else {
            this.printToConsole('no gui creation element for ', controlType)
        }
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


    createKnob(label, x, y, min, max, size, accentColor, callback) {
        return this.gui.Knob({
          label, min, max, size, accentColor,
          x: x + this.x, y: y + this.y,
          callback: callback,
          showLabel: 1, showValue: 0, // Assuming these are common settings
          curve: 2, // Adjust as needed
          border: 2 // Adjust as needed
        });
    }

    createNexusKnob(label, x, y, min, max, size, accentColor, callback) {
        // Convert p5 percentage coordinates (0-100) to pixel coordinates
        const container = document.getElementById('Canvas');
        const containerWidth = container ? container.clientWidth : window.innerWidth;
        const containerHeight = container ? container.clientHeight : window.innerHeight;
        
        const pixelX = ((x + (this.x || 0)) / 100) * containerWidth;
        const pixelY = ((y + (this.y || 0)) / 100) * containerHeight;
        
        const dial = new NexusDial(pixelX, pixelY, size, size);
        dial.min = min;
        dial.max = max;
        
        if (accentColor) {
            dial.colorize("accent", accentColor);
        }
        
        dial.mapTo(callback);
        
        return dial;
    }

    linkGui(name){
        //console.log(this.param)
        let objectIndex = 0
        Object.keys(this.param).forEach(key => {
          let subObject = this.param[key];
          if( subObject.guiElements[0] ) 
            subObject.guiElements[0].setLink( name + objectIndex )
          objectIndex++
        });
    }

    pushState(snap = null) {
      Object.keys(this.param).forEach(key => {
        const subObject = this.param[key];
        const value = snap ? snap[key]?.value : subObject._value;

        if (value !== undefined && subObject.guiElements?.[0]) {
          subObject.guiElements[0].set(value);
        }
      });
    }

    saveSnap(name) {
      this.snapshots[name] = {};

      Object.keys(this.param).forEach(key => {
        let subObject = this.param[key];
        this.snapshots[name][key] = {
          value: subObject._value // store raw value
        };
      });

      this.printToConsole(`Snapshot "${name}" saved.`);
    }

    loadSnap(name) {
      const snap = this.snapshots[name];
      if (!snap) {
        console.warn(`Snapshot "${name}" not found.`);
        return;
      }
      this.pushState(snap);
      this.printToConsole(`Snapshot "${name}" loaded.`);
    }

    listSnapshots() {
      this.printToConsole( Object.keys(this.snapshots) )
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
            this.seq[num] = new Seq(this, arr, subdivision, phraseLength, num, this);
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

    play(arr, subdivision = '8n', num = 0, phraseLength = 1) {
        if (!this.seq[num]) {
            // this.seq[num]._offset = 0//make sure the new one starts at the beginning as well
            this.seq[num] = new Seq(this, arr, subdivision, phraseLength, num, this.parseNoteString.bind(this));
            this.seq[num]._offset = 0
        } else {
            this.seq[num]._offset = 0//there is a time delay between this and where the index is, but i can set it such as this so that I know that is started
            this.seq[num].sequence(arr, subdivision, phraseLength);
        }
        this.start(num);

        // if (this.seq[num]) {
        //     this.seq[num].play(length);
        // }
    }

    expr(func, len = 32, subdivision = '16n', num = 0) {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, [], subdivision, 'infinite', num, this);
        }
        this.seq[num].expr(func, len, subdivision);
        this.start(num);
    }

    euclid(seq, hits=4, beats=8, rotate=0, subdivision = '8n', num = 0){
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, seq, subdivision, 'infinite', num, this.parseNoteString.bind(this));
        } else {
            this.seq[num].sequence(seq, subdivision, 'infinite');
        }
        this.seq[num].euclid(hits, beats,rotate);
        this.start(num);
    }

    // cantus: array of numbers or strings (e.g. [0,1,2,'.',3])
    // returns: array of numbers or same strings
    counterpoint(cantus, beamWidth = 16, w = {}) {
      const W = {
        step: 1.0,
        similar: 0.6,
        contrary: -0.3,
        oblique: 0.0,
        ...w
      };

      const baseOffsets = [2, -5, 5, -2];

      const sgn = (x) => (x === 0 ? 0 : (x > 0 ? 1 : -1));

      const toIndex = (d, baseOct = 4) => {
        if (d === "." || d === "_" || d === "?") return d;
        const n = (typeof d === "number") ? d : Number(d);
        if (!Number.isFinite(n)) return NaN;
        return n + 7 * baseOct;
      };

      const propose = (cIdx, lastCp) => {
        const out = [];
        for (const off of baseOffsets) {
          for (let k = -2; k <= 2; k++) out.push(cIdx + off + 7 * k);
        }
        if (Number.isFinite(lastCp)) out.sort((a, b) => Math.abs(a - lastCp) - Math.abs(b - lastCp));
        return out;
      };

      // ---- rules/terms take a ctx object ----
      // ctx = { i, cantusRaw, cIdx, cpIdx, path, W }

      const hardRules = [
        // Example: you can add more later (no-op now)
        function ruleCandidateIsFinite(ctx) {
          return Number.isFinite(ctx.cpIdx);
        },
        function ruleCandidateRepeatsNote(ctx) {
            if( Number.isFinite(ctx.cpIdx) )
                return ctx.cpIdx !== ctx.path.lastCp;
            else return true
        }
      ];

      const costTerms = [
        function costSmallMelodicMotion(ctx) {
          const lastCp = ctx.path.lastCp;
          if (!Number.isFinite(lastCp)) return 0;
          return ctx.W.step * Math.abs(ctx.cpIdx - lastCp);
        },

        function costPreferContrary(ctx) {
          const lastCp = ctx.path.lastCp;
          const lastC = ctx.path.lastC;
          if (!Number.isFinite(lastCp) || !Number.isFinite(lastC)) return 0;

          const cMove = sgn(ctx.cIdx - lastC);
          const cpMove = sgn(ctx.cpIdx - lastCp);

          if (cMove === 0 || cpMove === 0) return ctx.W.oblique;
          if (cMove === cpMove) return ctx.W.similar;
          return ctx.W.contrary;
        }
      ];

      // ---- beam search ----
      let beam = [{ seq: [], cost: 0, lastCp: null, lastC: null }];

      for (let i = 0; i < cantus.length; i++) {
        const cIdx = toIndex(cantus[i], 4);
        const nextBeam = [];

        for (const path of beam) {
          // pass-through tokens: CP gets same token, no scoring
          if (typeof cIdx === "string") {
            nextBeam.push({
              seq: path.seq.concat(cIdx),
              cost: path.cost,
              lastCp: path.lastCp,
              lastC: path.lastC
            });
            continue;
          }

          // bad cantus value: mirror raw input
          if (!Number.isFinite(cIdx)) {
            nextBeam.push({
              seq: path.seq.concat(cantus[i]),
              cost: path.cost,
              lastCp: path.lastCp,
              lastC: path.lastC
            });
            continue;
          }

          const candidates = propose(cIdx, path.lastCp);

          for (const cpIdx of candidates) {
            const ctx = { i, cantusRaw: cantus[i], cIdx, cpIdx, path, W };

            // hard rules
            let ok = true;
            for (const rule of hardRules) {
              if (!rule(ctx)) { ok = false; break; }
            }
            if (!ok) continue;

            // costs
            let add = 0;
            for (const term of costTerms) add += term(ctx);

            nextBeam.push({
              seq: path.seq.concat(cpIdx),
              cost: path.cost + add,
              lastCp: cpIdx,
              lastC: cIdx
            });
          }
        }

        nextBeam.sort((a, b) => a.cost - b.cost);
        beam = nextBeam.slice(0, beamWidth);
        if (beam.length === 0) return null;
      }

      return beam[0].seq;
    }

    /************************************************/


    set velocity(val) {
        this._velocity = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].velocity = val
        }
    }

    set orn(val) {
        this._orn = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].orn = val
        }
    }

    set octave(val) {
        this._octave = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].octave = val
        }
    }

    set duration(val) {//turn into duration
        this._duration = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].duration = val
        }
    }

    set subdivision(val) {
        this._subdivision = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].subdivision = val
        }
    }

    set transform(val) {
        this._transform = val
        if (typeof val !== 'function') {
            console.warn(`Transform must be a function. Received: ${typeof val}`);
            return;
        }
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].transform = val
        }
    }
//roll already exists in seq
    set roll(val) {
        this._roll = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].roll = val
        }
    }

    set rotate(val) {
        this._rotate = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].rotate = val
        }
    }

    set offset(val) {
        this._offset = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].offset = val
        }
    }

    set pianoRoll(val) {
        this._pianoRoll = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].pianoRoll = this._pianoRoll
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

    //pedaling
    pedal(state = "full"){
        this._pedal = state
        for (let seq of this.seq) {
                if (seq) seq.pedal(state);
            }
    }
    star(){
        if(this.synth.releaseAll) this.synth.releaseAll()
        else this.releaseAll()
    }
    clearPedal(){ 
        this._pedal = "off"
        this.star()
        for (let seq of this.seq) {
                if (seq) seq.clearPedal();
            }
    }
    lift(){ this.clearPedal() }

    get duration() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setDuration(value);
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

    get rotate() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setRotate(value);
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

    parseNoteString(val, time, index, num=null) {
       //console.log(val,time,index, num, isNaN(Number(val[0])))
        let lag = this.getSeqParam(this.seq[num].lag, index);
        let subdivision = this.getSeqParam(this.seq[num].subdivision, index);
        let groove = Groove.get(subdivision,index);
        const timeOffset = val[1] * (Tone.Time(subdivision)) + lag + groove.timing
        let curEventTiming = val[1] + index

        if (val[0] === "~") {  return; }
        else if (val[0] === "*") {
            this.releaseAll(time + timeOffset)
            return;
        }

        if (val[0] === ".") return;
        if (!val || val.length === 0 ) return '.';
        
        

        //handle pedaling
        let pedal = this.seq[num]._pedal
        if( pedal == "legato" && curEventTiming > this.prevEventTiming ) this.releaseAll(time + timeOffset)
        if( pedal == "star" ) this.releaseAll(time + timeOffset)

        

        const usesPitchNames = /^[a-gA-G]/.test(val[0][0]);
        //console.log(usesPitchNames, val[0])
        let note = '';
        if (usesPitchNames) note = pitchNameToMidi(val[0]);
        else note = intervalToMidi(val[0], this.min, this.max);

        if (note < 0) return;
        if (note >127) {
            this.printToConsole("MIDI note ", note, "ignored")
            return;
        }

        let octave = this.getSeqParam(this.seq[num].octave, index);
        let velocity = this.getSeqParam(this.seq[num].velocity, index);
        let duration = this.getSeqParam(this.seq[num].duration, index);
        
        
        
        
        velocity = velocity * groove.velocity
        if( Math.abs(velocity)>256) velocity = 256
        //console.log('pa', note, octave, velocity, duration, time, timeOffset)
        
         if( pedal === "full" || pedal === "legato"){
            try {
                //console.log('trig', this.triggerAttackRelease, note + octave * 12, velocity,duration,time+timeOffset)
                this.triggerAttack(
                    note + octave * Theory.scaleRatios.length,
                    velocity,
                    time + timeOffset
                );
            } catch (e) {
                this.printToConsole('invalid pedal note', note + octave * 12, velocity, duration, time + val[1] * Tone.Time(subdivision) + lag);
            }
        } else {
            try {
                //console.log('trig', note + octave * 12, velocity,duration,time+timeOffset)
                this.triggerAttackRelease(
                    note + octave * Theory.scaleRatios.length,
                    velocity,
                    duration,
                    time + timeOffset
                );
            } catch (e) {
                this.printToConsole('invalid note', note + octave * 12, velocity, duration, time + val[1] * Tone.Time(subdivision) + lag);
            }
        }
        this.prevEventTiming = curEventTiming
    }
}
