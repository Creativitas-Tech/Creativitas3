/*
Twinkle

Single vco monosynth
* vco->vcf->vca->output

methods:
- connect
- setADSR(a,d,s,r)


properties set directly:
frequency.value
velocitySig.value
cutoff_cv.value
vca_lvl.value
cutoffSig.value
vcf_env_depth.factor
keyTracking.factor
lfo.frequency

*/
import p5 from 'p5';
import * as Tone from 'tone';
import TwinklePresets from './synthPresets/TwinklePresets.json';
import { MonophonicTemplate } from './MonophonicTemplate';
import {Parameter} from './ParameterModule.js'
import basicLayout from './layouts/basicLayout.json';

export class Twinkle extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
    this.presets = TwinklePresets
    this.isGlide = false
    this.name = "Twinkle"
    console.log(this.name, " loaded, available preset: ", this.presets)

    // Initialize the main frequency control
    this.frequency = new Tone.Signal(200);

    // VCOs
    this.vco = new Tone.OmniOscillator({ type:'pulse'}).start();
    this.frequency.connect(this.vco.frequency)

    // VCF
    this.vcf = new Tone.Filter({type:"lowpass", rolloff:-24});
    this.vco.connect(this.vcf);

    // VCF, VCA, output
    this.vca = new Tone.Multiply()
    this.vcf.connect(this.vca)
    this.output = new Tone.Multiply(1)
    this.vcf.connect(this.vca)
    this.vca.connect(this.output)

    // VCA control
    this.vca_lvl = new Tone.Signal();
    this.vca_lvl.connect(this.vca.factor)
    this.env = new Tone.Envelope();
    this.env.releaseCurve = 'linear'
    this.env.decayCurve = 'exponential'
    this.env_depth = new Tone.Multiply()
    this.env.connect(this.env_depth)
    this.env_depth.connect(this.vca.factor)
    this.velocitySig = new Tone.Signal(1)
    this.velocitySig.connect(this.env_depth.factor)

    //vcf control
    this.cutoffSig = new Tone.Signal(1000);
    this.cutoff_cv = new Tone.Signal(0);
    this.vcf_env_depth = new Tone.Multiply(500);
    this.keyTracker = new Tone.Multiply(.1)
    this.env.connect(this.vcf_env_depth)
    this.vcf_env_depth.connect(this.vcf.frequency)
    this.cutoffSig.connect(this.vcf.frequency)
    this.cutoff_cv.connect(this.vcf.frequency)
    this.frequency.connect(this.keyTracker)
    this.keyTracker.connect(this.vcf.frequency)

    let paramDefinitions = [
      {name:'type',type:'vco',value:'square',radioOptions:['square','saw','tri','sine'],callback:(x,time=null)=>{
          switch(x){
          case 'square': this.vco.type = 'pulse'; break;
            case 'saw': this.vco.type = 'sawtooth'; break;
              case 'tri': this.vco.type = 'triangle'; break;
                case 'sine': this.vco.type = 'sine'; break;
          }
        }
      },
      {name:'cutoff',type:'vcf',min:20.,max:10000,curve:2,callback:(x,time=null)=>this.cutoffSig.value = x},
      {name:'Q',type:'vcf',min:0.,max:30,curve:2,callback:(x,time=null)=>this.vcf.Q.value = x},
      {name:'keyTrack',type:'hidden',min:0.,max:2,curve:1,callback:(x,time=null)=>this.keyTracker.factor.value = x},
      {name:'envDepth',type:'vcf',min:-1000,max:5000,curve:2,callback:(x,time=null)=>this.vcf_env_depth.factor.value = x},
      {name:'level',value:0,type:'vca',min:0.,max:1,curve:2,callback:(x,time=null)=>this.vca_lvl.value = x},
      {name:'adsr',type:'env',min:0,max:1,curve:2,value:[.01,.1,.5,.5],
        labels:['attack','decay','sustain','release'],
        callback:(x,i=null)=>{
          if( Array.isArray(x)){
            if( x.length<=4) this.setADSR(x[0],x[1],x[2],x[3])
          }
          else if(i==0)this.env.attack = x
          else if(i==1)this.env.decay = x
          else if(i==2)this.env.sustain = x
          else if(i==3)this.env.release = x
        }
    }
    ]

    this.param = this.generateParameters(paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = paramDefinitions.map(def => def.name);;
    //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
    setTimeout(()=>{this.loadPreset('default')}, 500);
  }//constructor

  //envelopes
  triggerAttack (freq, amp, time=null){
    freq = Tone.Midi(freq).toFrequency()
    amp = amp/127
    if(time){
      this.env.triggerAttack(time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.setValueAtTime(amp,time)
    } else {
      this.env.triggerAttack()
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }
  triggerRelease (time=null){
    if(time) {
    	this.env.triggerRelease(time)
    }
    else {
      this.env.triggerRelease()
    }
  }
  triggerAttackRelease (freq, amp, dur=0.01, time=null){
    //console.log('AR ',freq,amp,dur,time)
    freq = Tone.Midi(freq).toFrequency()
    amp = amp/127
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.setValueAtTime(amp,time)
    } else{
      this.env.triggerAttackRelease(dur)
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }//attackRelease


  //GUI
  // Initialize GUI
  initGui(gui=null) {
    //console.log('init', this.param)
    this.gui = gui
    const layout = basicLayout.basicLayout;

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
      


        let indexOffset = 0
        groupedParams[groupType].forEach((param, index) => {
          const isGroupA = groupLayout.groupA.includes(param.name);

          // Calculate size and control type
          const controlType = isGroupA ? groupLayout.controlTypeA : groupLayout.controlTypeB;
          const size = isGroupA ? groupLayout.sizeA : groupLayout.sizeB;
          // Calculate offsets
          let xOffset = 0//groupLayout.offsets.x * (index % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
          let yOffset = 0//groupLayout.offsets.y * Math.floor(index / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
          if( Array.isArray( param._value )){
            param._value.forEach((_, i) => {
              // Calculate offsets
             xOffset = groupLayout.offsets.x * ((index+indexOffset) % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
             yOffset = groupLayout.offsets.y * Math.floor((index+indexOffset) / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
            
              // Calculate absolute positions
              const x = groupLayout.boundingBox.x + xOffset;
              const y = groupLayout.boundingBox.y + yOffset;
              this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color, i });
              indexOffset++
            })
          } else{
            xOffset = groupLayout.offsets.x * ((index+indexOffset) % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
            yOffset = groupLayout.offsets.y * Math.floor((index+indexOffset) / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
          
            // Calculate absolute positions
            const x = groupLayout.boundingBox.x + xOffset;
            const y = groupLayout.boundingBox.y + yOffset;
            // Create GUI element
            this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color });    
          }

        });
    });
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

        return this.gui.RadioButton({
            label: i ? param.labels[i] : param.name,
            radioOptions: param.radioOptions,
            x:x,
            y:y+10,
            accentColor: color,
            callback: (selectedOption) => param.set(selectedOption),
        });
    }
}

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

