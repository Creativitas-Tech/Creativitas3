// EffectTemplate.js

import * as Tone from 'tone';
import * as p5 from 'p5';
import { Theory, parsePitchStringSequence, parsePitchStringBeat, getChord, pitchNameToMidi, intervalToMidi } from '../TheoryModule';
import { Seq } from '../Seq'
import { Parameter } from './ParameterModule.js'
import { sketch } from '../p5Library.js'
import basicLayout from './layouts/basicLayout.json';


/**
 * Effects Template
 * 
 * contains the following core features:
 * - constructor
 * - preset management
 * - parameter management
 * - gooey creation
 * - snapshot creation
 * - collaboration linking
 *
 * @constructor
 */
export class EffectTemplate {
    constructor() {
        this.presets = {};
        this.synthPresetName = ""
        this.gui_elements = [];
        this.gui = null;
        this.guiContainer = null;
        this.backgroundColor = [100,100,100]
        this.layout = basicLayout
        this.type = 'Effect';
        this.name = "";
        this.presetsData = null;
        this.curPreset = null;
        this.snapshots = {}
    }

    /**
     * Populate this.presets with presets fetched from the server
     * Using the name in this.synthPresetName
     */
    async accessPreset(){
    return      
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
        this.loadPreset("default");
    }
    
    /**
     * Save a preset by name
     * @param {string} name - Name of the preset to save
     * @returns {void}
     * @example synth.savePreset('default')
     */
    async savePreset (name) {
        const _preset = {};
        for (let element of Object.values(this.param)) {
            _preset[element.name] = element._value;
        }
        console.log(this.presets)
        // Update the presetsData in memory
        //console.log(this.presets);
        if (!this.presets[name]) {
            this.presets[name] = {};
        }
        this.presets[name] = _preset;

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
                console.log(`Save successful: ${result.message}`);
                return result.success;
            } else {
                console.warn(`Save failed: ${result.message}`);
                // You might want to throw an error here or handle specific status codes
                return false;
            }
        } catch (error) {
            console.error(`Error sending save request for '${name}':`, error);
            return false;
        }
        console.log(`Preset saved under ${this.name}/${name}`);
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
                    console.log(`Delete successful: ${result.message}`);
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

        console.log(`Preset deleted  under ${this.name}/${name}`);
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
        console.log('Presets folder downloaded successfully.');
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
          //console.log("Loading preset", this.curPreset);
          for (let name in presetData) {
            try {
              if (this.param[name]?.set) {
                this.param[name].set(presetData[name]);
              }
            } catch (e) {
              console.log(name, presetData[name], e);
            }
          }
          
        } else {
            //console.log("No preset of name ", name);
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
          console.log(output);
        }

        else {
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

    generateParameters(paramDefinitions) {
        const params = {};
        paramDefinitions.forEach((def) => {
            const param = new Parameter(this,def);
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
                    return target.get(); // Return the current value
                },
                set(target, _, newValue) {
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
                set: (newValue) => {
                    if (Array.isArray(newValue)) {
                        param.sequence(newValue)
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
            console.warn(`Param ${paramName} has no stop method or doesn't exist.`);
        }
    }

    get() {
        let output = 'Parameters:\n';
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
        console.log(output);
    }
    print(){ this.get()}

    /**
     * Initialize the GUI
     * @returns {void}
     * @example 
     * const gui = new p5(sketch, 'Canvas1');
     * synth.initGui(gui, 10, 10)
     */
    initGui(gui = null) {
        this.guiContainer = document.getElementById('Canvas');
        const sketchWithSize = (p) => sketch(p, { height: .3 });
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
        this.gui.setTheme( this.gui, 'dark' )
        this.gui.backgroundColor = this.backgroundColor
        setTimeout(this.loadPreset('default'),1000)
    }

    /**
     * Hide the GUI
     * @returns {void}
     */
    hideGui() {
        if (this.gui) {
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
            // if (!Array.isArray(param.radioOptions) || param.radioOptions.length === 0) {
            //     console.warn(`Parameter "${param.name}" has no options defined for radioBox.`);
            //     return null;
            // }

            param.guiElements.push( this.gui.RadioButton({
                label: i  ? param.labels[i] : param.name,
                radioOptions: param.radioOptions,
                value: param._value, // Use provided value
                x: x+10,
                y,
                accentColor: color,
                orientation: 'horizontal',
                callback: (value) => param.set(value,i,true), // ✅ Correct callback for Polyphony
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
            console.log('no gui creation element for ', controlType)
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

      console.log(`Snapshot "${name}" saved.`);
    }

    loadSnap(name) {
      const snap = this.snapshots[name];
      if (!snap) {
        console.warn(`Snapshot "${name}" not found.`);
        return;
      }
      this.pushState(snap);
      console.log(`Snapshot "${name}" loaded.`);
    }

    listSnapshots() {
      console.log( Object.keys(this.snapshots) )
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

}
