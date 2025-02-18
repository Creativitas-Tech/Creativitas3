/**
 * AnalogDelay.js
 * 
 * Simple approximation of an analog delay
 * 
 * Signal path:
 * input -> hpf -> gain -> waveShaper -> lpf -> delay -> wet -> output
 *                                         <- feedback <-
 * input -> dry -> output
 * 
 * @class
 */
import p5 from 'p5';
import * as Tone from 'tone';
import { DelayOp } from './DelayOp.js';
import {Parameter} from './ParameterModule.js'
// import './userInterface.css';


export class AnalogDelay {
  /**
   * Creates an instance of AnalogDelay.
   * @constructor
   * @param {number} [initialTime=0.1] - Initial delay time in seconds.
   * @param {number} [initialFB=0] - Initial feedback amount.
   */
  constructor(initialTime = 1, initialFB = 0) {
    this.input = new Tone.Multiply(1);
    this.highpass = new Tone.Filter({ type: 'highpass', frequency: 20, Q: 0 });
    this.ws_input = new Tone.Multiply(0.125);
    this.waveShaper = new Tone.WaveShaper((x) => { return Math.tanh(x) });
    this.vcf = new Tone.Filter({ type: 'lowpass', frequency: 5000, Q: 0, slope: '-12' });
    this.vcfR = new Tone.Filter({ type: 'lowpass', frequency: 5000, Q: 0, slope: '-12' });
    this.delay = new Tone.Delay(initialTime, initialTime);
    this.delayR = new Tone.Delay(initialTime, initialTime);
    this._delayRatio = 0.75
    this.feedbackMult = new Tone.Multiply(initialFB);
    this.feedbackMultR = new Tone.Multiply(initialFB);
    this.merge = new Tone.Merge(2)
    this.wetSig = new Tone.Multiply(1);
    this.drySig = new Tone.Multiply(0);
    this.output = new Tone.Multiply(1);

    // Connecting signal path
    this.input.connect(this.drySig);
    this.input.connect(this.highpass);
    this.highpass.connect(this.ws_input);
    this.ws_input.connect(this.waveShaper);
    this.waveShaper.connect(this.vcf);
    this.waveShaper.connect(this.vcfR);
    this.vcf.connect(this.delay);
    this.vcfR.connect(this.delayR);
    this.delay.connect(this.feedbackMult);
    this.delayR.connect(this.feedbackMultR);
    this.feedbackMult.connect(this.vcf);
    this.feedbackMultR.connect(this.vcfR);
    this.delay.connect(this.merge,0,0);
    this.delayR.connect(this.merge,0,1);
    this.merge.connect(this.wetSig);
    this.wetSig.connect(this.output);
    this.drySig.connect(this.output);

    this.lfo = new Tone.Oscillator(2).start()
    this.lfoDepth = new Tone.Multiply()
    this.lfo.connect(this.lfoDepth)
    this.lfoDepth.connect(this.delay.delayTime)
    this.lfoDepth.connect(this.delayR.delayTime)

    let paramDefinitions = [
      {name:'time',min:0.01,max:1,curve:2,callback:this.setDelayTime},
      {name:'feedback',min:0.0,max:1.2,curve:.7,callback:this.setFeedback},
      {name:'damping',min:100,max:10000,curve:2,callback:this.setFilterFrequency},
      {name:'hpf',min:10,max:2000,curve:2,callback:value=>this.highpass.frequency.value = value},
      {name:'dry',value:0,min:0.0,max:1.2,curve:2,callback:value=>this.drySig.factor.value = value},
      {name:'wet',min:0.0,max:1.2,curve:2,callback:value=>this.wetSig.factor.value = value},
      {name:'gain',min:0.0,max:1,curve:0.2,callback:value=>this.ws_input.factor.value = value},
      {name:'amp',min:0.0,max:1.2,curve:2,callback:value=>this.output.factor.value = value},
      {name:'delayRatio',value:0,min:0.5,max:1,curve:1,callback:value=>{
        this._delayRatio = value
        this.setDelayTime(this.delay.delayTime.value)}},
    ]


    this.param = this.generateParameters(paramDefinitions)
    this.createAccessors(this, this.param);

//     // Create a label for the slider
//     const div = document.getElementById('canvases');

//     // Create a container div to hold both the label and the slider
// const container = document.createElement('div');
// container.style.display = 'flex'; // Set default display to flex
// container.style.flexDirection = 'column'; // Set default direction to column (vertical)

// // To make it horizontal
// container.className = 'vertical-container';

// const label = document.createElement('label');
// label.innerText = 'Delay Time'; // Set the text for the label
// label.htmlFor = 'mySlider'; // Associate the label with the slider

     
//   const slider = document.createElement('input');
//   slider.type = 'range';
//   slider.min = '0';
//   slider.max = '1';
//   slider.value = '50';
//   slider.step = '0.01';
//   slider.id = 'mySlider';
//   slider.className = 'sliderStyle';

//   // Add an event listener for input changes
//   slider.addEventListener('input', function(event) {
//     console.log('Slider value changed to:', event.target.value);
//     this.time = event.target.value
//   });

//   // Append the slider to the div
//   container.appendChild(label);
//   container.appendChild(slider);
//   div.appendChild(container)
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

        // Ensure the Parameter object has a `set` method
        if (typeof param.set !== 'function') {
            throw new Error(`Parameter '${key}' does not have a set method`);
        }

        // Proxy to handle array-like access
        const proxyHandler = {
            get(target, prop) {
                if (typeof prop === 'string' && !isNaN(prop)) {
                    // Access individual array element
                    return target.get(parseInt(prop));
                }
                return target.get();
            },
            set(target, prop, value) {
                console.log(target, prop, value)
                if (typeof prop === 'string' && !isNaN(prop)) {
                    // Set individual array element
                    target.set(value, parseInt(prop));
                    return true;
                }
                // Set the entire array or scalar value
                target.set(value);
                return true;
            }
        };

        // Define the accessor property on the parent
        Object.defineProperty(parent, key, {
            get: () => new Proxy(param, proxyHandler),
            set: (newValue) => param.set(newValue),
        });
    });
}//createAccessors

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

  setDelayTime = (value)=>{
    this.delay.delayTime.value = value
    this.delayR.delayTime.value = value*this._delayRatio
  }
  setFeedback = (value)=>{
    this.feedbackMult.factor.value = value; 
    this.feedbackMultR.factor.value = value
  }
  setFilterFrequency = (value)=>{
    this.vcf.frequency.value = value; 
    this.vcf.frequency.value = value*0.9;
  }

  /**
   * Connect the output to a destination.
   * @param {Tone.Signal | AudioNode} destination - The destination to connect to.
   */
  connect(destination) {
    if (destination.input) {
      this.output.connect(destination.input);
    } else {
      this.output.connect(destination);
    }
  }

  /**
   * Disconnect the output from a destination.
   * @param {Tone.Signal | AudioNode} destination - The destination to disconnect from.
   */
  disconnect(destination) {
    if (destination.input) {
      this.output.disconnect(destination.input);
    } else {
      this.output.disconnect(destination);
    }
  }

  /**
     * Save a preset by name
     * @param {string} name - Name of the preset to save
     * @returns {void}
     * @example synth.savePreset('default')
     */
    savePreset (name) {
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
        this.curPreset = name;
        const presetData = this.presets[this.curPreset];

        if (presetData) {
            console.log("Loading preset ", this.curPreset);
            for (let name in presetData) {
                try {
                    for (let element of Object.values(this.param)) {
                        this.param[name].set(presetData[name])
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        } else {
            console.log("No preset of name ", name);
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
        /*

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
        } 
  */
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
}
