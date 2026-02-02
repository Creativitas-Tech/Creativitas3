
/********************
 * polyphony
 ********************/

import p5 from 'p5';
import * as Tone from 'tone';
import { MonophonicTemplate } from './MonophonicTemplate.js';
import {stepper} from  '../Utilities.js'
import { sketch } from '../p5Library.js'

export class Polyphony extends MonophonicTemplate{
	constructor(voice,num=8){
		super()
    this.name = voice.name
		this.numVoices = num
		this.slop = .05
		this.backgroundColor = [0,0,0]

		//audio
		this.voice = []
		for(let i=0;i<this.numVoices;i++) this.voice.push(new voice)
		this.output = new Tone.Multiply(1/(this.numVoices/4))
		this.hpf = new Tone.Filter({type:'highpass', rolloff:-12, Q:0, cutoff:50})
		for(let i=0;i<this.numVoices;i++) this.voice[i].output.connect( this.hpf)
		this.hpf.connect(this.output)

	    //voice tracking
		this.prevNote = 0
		this.v = 0
		this.voiceCounter = 0
		this.activeNotes = []
		this.noteOrder = []
		this.noteOrderIndex = 0
		this.voiceOrder = []
		for (let i = 0; i < this.numVoices; i++) {
			this.activeNotes.push(-1)
			this.noteOrder.push(i)
		}

		this.initParamsFromVoices() 
	}

	initParamsFromVoices() {
	    const voiceParams = this.voice[0].param; // Take params from first voice as template

	    Object.keys(voiceParams).forEach((paramName) => {
	        const isSignal = voiceParams[paramName].isSignal;

	        const paramProxy = new Proxy(
			    () => {}, // Function base for callable
			    {
			        get: (_, prop) => {
			            if (prop === 'sequence') {
			                return (valueArray, subdivision = '16n') => {
			                    this.voice.forEach(v => v.startSequence(paramName, valueArray, subdivision));
			                };
			            }
			            if (prop === 'stop') {
			                return () => {
			                    this.voice.forEach(v => v.stopSequence(paramName));
			                };
			            }
			            if (prop === 'set') {
			                return (value, time = null, source = null) => {
			                    this.voice.forEach(v => v.param[paramName].set(value, time, source));
			                };
			            }
			            if (prop === 'value') {
			                return this.voice[0].param[paramName].get(); // Read value
			            }
			        },
			        set: (_, __, value) => {
			            this.voice.forEach(v => v.stopSequence(paramName)); // Stop seq when manually set
			            this.voice.forEach(v => v.param[paramName].set(value, null, false));
			            return true;
			        }
			    }
			);

	        // Assign s.cutoff = paramProxy (callable for set, methods like sequence/stop)
	        Object.defineProperty(this, paramName, {
	            get: () => paramProxy,
	            set: (value, source = null) => {
	            	this.voice.forEach(v=>{
	                	v.stopSequence(paramName) // Stop seq when manually set
	            		if (Array.isArray(value)) {
                        	v.startSequence(paramName, value);
	                    } else {
	                        v.param[paramName].set(value, null, false)
	                    }
	            	})},
	            configurable: true,
	            enumerable: true
	        });

	        // Assign explicit param object for value access and control
	        this[paramName+'_param'] = {
	            name: paramName,
	            isSignal,
	            get: () => this.voice[0].param[paramName].get(),
	            set: (value, time = null, source = null) => this.voice.forEach(v => v.param[paramName].set(value, time, source)),
	            sequence: (valueArray, subdivision = '8n') => {
	            	this.voice.forEach(v => {
	            		v.startSequence(paramName,valueArray,subdivision)
	            		//v.params[paramName].sequence(valueArray, subdivision)
	            })},
	            stop: () => this.voice.forEach(v => v.stopSequence(paramName))
	        };

	        // Optional: Quick value access via s.cutoff_value
	        Object.defineProperty(this, paramName + '_value', {
	            get: () => this.voice[0].param[paramName].get(),
	            set: (value) => this.voice.forEach(v => v.param[paramName].set(value, null, false)),
	            configurable: true,
	            enumerable: true
	        });
	    });
	}

	/**************** 
	 * trigger methods
	***************/
	triggerAttack = function(val, vel=100, time=null){
		//console.log('ta ', val)
		this.v = this.getNewVoice(val)
		//val = val + Math.random()*this.slop - this.slop/2
		if(time) this.voice[this.v].triggerAttack(val,vel,time) //midinote,velocity,time
		else this.voice[this.v].triggerAttack(val,vel) 
		//console.log("att ", val)
	}

	triggerRelease = function(val, time=null){
		this.v = this.getActiveNote(val)
		if (this.v >= 0 && this.v != undefined){
			//console.log('tr ', val, time, this.activeNotes[val], this.v, this.voice[this.v])
			if(time) this.voice[this.v].triggerRelease(time) //midinote,velocity,time
			else this.voice[this.v].triggerRelease() 
			this.freeActiveNote(val)
		//console.log("rel ", val)
		} else{
			console.log('tr null', val, time, this.activeNotes[val], this.v, this.voice[this.v])
		}
	}

	triggerAttackRelease = function(val, vel=100, dur=0.01, time=null){
		// console.log('poly trigAR', val)
		this.v = this.getNewVoice(val)
		//val = val + Math.random()*this.slop - this.slop/2
		//console.log(this.voice[this.v], val, vel, dur, time)
		if(time){
			this.voice[this.v].triggerAttackRelease(val, vel, dur, time)
		} else{
			this.voice[this.v].triggerAttackRelease(val, vel, dur)
		}
		//console.log("AR ", val,dur)
	}

	releaseAll(time = null){
		// console.log("releaseAll")
		for( let i=0; i< this.numVoices; i++){
			this.voice[i].triggerRelease(0,time)
		}
    }

    /** VOICE MANAGEMENT **/

    // Get a free voice or steal an old voice
	getNewVoice(noteNum) {
		// Increment and wrap voice counter for round-robin assignment
		this.voiceCounter = (this.voiceCounter + 1) % this.numVoices;

		// Free any voice currently playing the requested note
		const curIndex = this.getActiveNote(noteNum);
		if (curIndex >= 0 ) {
			this.freeActiveNote(curIndex);
		}

		// Try to find a free voice
		let weakestEnvValue = Infinity;
		let leastRecent = this.getLeastRecentNotes()
		let weakestVoice = leastRecent[0];

		for (let i = 0; i < this.numVoices/2; i++) {
			const curElement = this.noteOrder[i];
			//console.log('voice1', i, this.voice[curElement])
			const curEnv = this.voice[curElement].env.value;
			//console.log('voice2', i, this.voice[curElement])
			

			if (curEnv < weakestEnvValue && leastRecent.includes(curElement)) {
			  weakestEnvValue = curEnv;
			  weakestVoice = curElement;
			}
			
			// Check if the envelope indicates a free voice
			if (curEnv <= 0.01) { // Allow small floating-point tolerances
			  this.setActiveNote(curElement, noteNum);
			  return curElement;
			}
		}
		// No free voices: Implement voice stealing
		// Steal the weakest voice
		this.voice[weakestVoice].env.cancel();
		this.setActiveNote(weakestVoice, noteNum);
		return weakestVoice;
	}

  // Get the index of a specific active note, or -1 if the note is not active
    getActiveNote(midiNote) {
    	if(this.activeNotes.includes(midiNote)) return this.activeNotes.indexOf(midiNote);
    	else return -1
    }

    // Set a new active note (add it to the array)
    setActiveNote(index, midiNote) {
		//console.log('set active', index, midiNote, this.noteOrder);

		// Add the note only if it isn't already active
		if (!this.activeNotes.includes(midiNote))  this.activeNotes[index] = midiNote;

		// Update the noteOrder array
		// Remove the index if it already exists in the array
		const existingIndex = this.noteOrder.indexOf(index);
		if (existingIndex !== -1) this.noteOrder.splice(existingIndex, 1);

		this.noteOrder.push(index); // Add the index to the
		}
    getLeastRecentNotes() {
    	return this.noteOrder.slice(0,this.numVoices/2)
	}

    // Free a specific active note (remove it from the array)
    freeActiveNote(index) {
        if (this.voice[index] !== undefined && index >= 0) {
        	this.voice[index].triggerRelease()
            this.activeNotes[index] = -1;  // Remove the note if found
        }
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
    	for(let i=0;i<this.numVoices;i++){
    		if (this.voice[i].env) {
	            this.voice[i].env.attack = a>0.001 ? a : 0.001
	            this.voice[i].env.decay = d>0.01 ? d : 0.01
	            this.voice[i].env.sustain = Math.abs(s)<1 ? s : 1
	            this.voice[i].env.release = r>0.01 ? r : 0.01
        	}
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
    	for(let i=0;i<this.numVoices;i++){
	        if (this.voice[i].vcf_env) {
	            this.voice[i].vcf_env.attack = a>0.001 ? a : 0.001
	            this.voice[i].vcf_env.decay = d>0.01 ? d : 0.01
	            this.voice[i].vcf_env.sustain = Math.abs(s)<1 ? s : 1
	            this.voice[i].vcf_env.release = r>0.01 ? r : 0.01
	        }
	    }
    }

    updateAllVoices = (paramName, value) => {
	  for (let v = 0; v < this.numVoices; v++) {
	    this.voice[v].param[paramName].set(value,null,false);
	  }
	};

	initGui(gui = null) {
		this.guiHeight = this.voice[0].guiHeight
	    this.guiContainer = document.getElementById('Canvas');
	    const sketchWithSize = (p) => sketch(p, { height: this.guiHeight });
	    this.gui = new p5(sketchWithSize, this.guiContainer);

	    const layout = this.voice[0].layout; // Grab layout from first voice
	    const params = this.voice[0].param; // First voice's params as template
	    //console.log(layout);
	    // Group parameters by type
	    const groupedParams = {};
	    Object.values(params).forEach((param) => {
	        if (!groupedParams[param.type]) groupedParams[param.type] = [];
	        groupedParams[param.type].push(param);
	    });

	    // Create GUI for each group
	    Object.keys(groupedParams).forEach((groupType) => {
	        const groupLayout = layout[groupType];
	        if (!groupLayout || groupType === 'hidden') return;

	        let indexOffset = 0;


	        groupedParams[groupType].forEach((param, index) => {
	            const paramName = param.name; // Name of the param (e.g., "cutoff")
	            const isGroupA = groupLayout.groupA.includes(paramName);
	            const controlType = isGroupA ? groupLayout.controlTypeA : groupLayout.controlTypeB;
	            const size = isGroupA ? groupLayout.sizeA : groupLayout.sizeB;
	            //console.log(paramName)
	            // Get actual param value for initialization, NOT the proxy
				const paramValue = param.get ? param.get() : param._value; // or this.voice[0].param[paramName].get()
				const values = Array.isArray(paramValue) ? paramValue : [paramValue];

				const flatIndex = indexOffset;
	            values.forEach((value, i) => {
	            	//console.log(value,i)
	                let xOffset = groupLayout.offsets.x * (flatIndex % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
					  let yOffset = groupLayout.offsets.y * Math.floor(flatIndex / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));

					  const x = groupLayout.boundingBox.x + xOffset;
					  const y = groupLayout.boundingBox.y + yOffset;

	                // Callback to update polyphonic param when GUI is used
	                const callback = (e) => {
					    if (Array.isArray(this[paramName])) {
					        // For array-type params like ADSR
					        const updatedArray = [...this[paramName]]; // Copy current value
					        updatedArray[i] = e; // Update the specific index
					        this[paramName+'_param'].set(updatedArray, null,'gui'); // ✅ Use the param's set() to propagate to all voices
					    } else {
					        // For scalar params
					        this[paramName+'_param'].set(e,null,'gui'); // ✅ Use param set() to update all voices
					    }
					};
					
	                // Create GUI element linked to polyphony params
	                this.createGuiElement(param, {
	                    x,
	                    y,
	                    size,
	                    controlType,
	                    color: groupLayout.color,
	                    i, // index for arrays
	                    value, // initial value
	                    callback // callback for real-time updates
	                });

	                indexOffset++;
	            });
	        });
	    });
	    this.gui.setTheme( this.gui, 'dark' )
	    this.gui.backgroundColor = this.backgroundColor
	    //setTimeout(this.loadPreset('default'),100)
	}

	createGuiElement(param, { x, y, size, controlType, color, i = null, value, callback }) {
	    //console.log(x, y, size, controlType, color,i, value, callback)
	    //return
	    if (controlType === 'knob') {
	        param.guiElements.push(this.gui.Knob({
	            label: i !== 0 ? param.labels[i] : param.name,
	            min: param.min,
	            max: param.max,
	            value: value, // Use provided value, not param._value
	            size: size, // Scale size
	            curve: param.curve,
	            x,
	            y,
	            accentColor: color,
	            callback: callback // ✅ Correct callback for Polyphony
	        }));
	    } else if (controlType === 'fader') {
	        param.guiElements.push(this.gui.Fader({
	            label: i !== 0 ? param.labels[i] : param.name,
	            min: param.min,
	            max: param.max,
	            value: value, // Use provided value
	            curve: param.curve,
	            size: size,
	            x,
	            y,
	            accentColor: color,
	            callback: callback // ✅ Correct callback for Polyphony
	        }));
	    } else if (controlType === 'radioButton') {
	        if (!Array.isArray(param.radioOptions) || param.radioOptions.length === 0) {
	            console.warn(`Parameter "${param.name}" has no options defined for radioBox.`);
	            return null;
	        }

	        param.guiElements.push( this.gui.RadioButton({
	            label: i !== 0 ? param.labels[i] : param.name,
	            radioOptions: param.radioOptions,
	            value: value, // Use provided value
	            x: x,
	            y: y + 10,
	            accentColor: color,
	            callback: callback // ✅ Correct callback for Polyphony
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

	linkGui(name){
        let objectIndex = 0
        Object.keys(this.voice[0].param).forEach(key => {
          let subObject = this.voice[0].param[key];
          console.log(subObject)
          if( subObject.guiElements[0] ) 
            subObject.guiElements[0].setLink( name + objectIndex )
          objectIndex++
        });
    }

    pushState(snap = null) {
      Object.keys(this.voice[0].param).forEach(key => {
        const subObject = this.voice[0].param[key];
        const value = snap ? snap[key]?.value : subObject._value;

        if (value !== undefined && subObject.guiElements?.[0]) {
          subObject.guiElements[0].set(value);
        }
      });
    }

    saveSnap(name) {
      this.snapshots[name] = {};

      Object.keys(this.voice[0].param).forEach(key => {
        let subObject = this.voice[0].param[key];
        this.snapshots[name][key] = {
          value: subObject._value // store raw value
        };
      });

      console.log(`Snapshot "${name}" saved.`);
    }

	/**
     * Hide the GUI
     * @returns {void}
     */
    hideGui() {
        for (let i = 0; i < this.voice[0].gui_elements.length; i++) {
            //console.log(this.gui_elements[i])
            this.voice[0].gui_elements[i].hide = true;
        }
    }

    /**
     * Show the GUI
     * @returns {void}
     */
    showGui() {
        for (let i = 0; i < this.voice[0].gui_elements.length; i++) this.voice[0].gui_elements[i].hide = false;
    }

	applyFunctionToAllVoices(f) {
	    let fnString = f.toString();
	    // Perform the replacement and assign the result back
	    fnString = fnString.replace(/\bthis\./g, '');
	    //console.log("Modified function string:", fnString);

	    return fnString
	}

	stringToFunction(funcString) {
	   // Split by '=>' to get parameters and body for functions without 'this.super'
	    const parts = funcString.split('=>');
	    const params = parts[0].replace(/\(|\)/g, '').trim();  // Extract the parameter
	    let body = parts[1].trim();  // The function body

	    // Replace occurrences of 'this.' for the voice context
	    body = body.replace(/\bthis\./g, 'this.voice[i].');

	    // Prefix standalone function calls with 'this.'
	    body = body.replace(/(?<!this\.|this\.super\.)\b(\w+)\(/g, 'this.$1(');

	    // // Log the modified function for debugging purposes
	    // console.log('params:', params);
	    // console.log('modified body:', body);

	    return new Function('i', params, body);  // Create a function that accepts 'i' (voice index) and params
	}


	// Function to generate the parameter string from an assignment
	 generateParamString(assignment) {
    const fnString = assignment.toString();
    //console.log('param:', fnString);  // Log the function as a string to inspect its structure

    // Regex to match "this.[something] = [something];"
    const regex = /this\.([\w\d_\.]+)\s*=\s*([\w\d_\.]+)\s*;?/;
    const match = fnString.match(regex);

    //console.log('match:', match);  // Log the match result to debug
    if (match) {
        //console.log('Captured:', match[1]);  // Output: 'cutoff.value' or similar
        return match[1];  // Returns 'cutoff.value'
    } else {
        //console.log('No match found');
    }

    return null;
}


	 retrieveValueExpression(assignment) {
	    const fnString = assignment.toString();

	    // Adjusted regex to capture everything after the = sign, including optional semicolon
	    const regex = /this\.([\w\d_\.]+)\s*=\s*(.+);?/;
	    const match = fnString.match(regex);

	    if (match) {
	        // Return the value expression part (everything after '=')
	        return match[2].trim();  // Trimming to remove extra spaces if needed
	    }

	    return null;
	}

	/**** PRESETS ***/

	loadPreset(name) {
		for(let i=0;i<this.numVoices;i++) this.voice[i].loadPreset(name)
		//this.voice[0].loadPreset(name)
	}

	listPresets() {
        this.voice[0].listPresets();
    }

	savePreset(name) {
		this.voice[0].savePreset(name)
	};

    // Function to download the updated presets data
	downloadPresets() {
		this.voice[0].downloadAllPresets()
	};

	panic = function(){
		for(let i=0;i<this.numVoices;i++){
			this.voice[i].triggerRelease()
			this.activeNotes[i]  = -1
		}
	}

	pan = function(depth){
		for(let i=0;i<this.numVoices;i++){
			this.voice[i].panner.pan.value = Math.sin(i/8*Math.PI*2)*depth
		}
	}

	get() {
        let output = 'Parameters:\n';
        const params = {};
	    Object.keys(this.voice[0].param).forEach(paramName => {
	        params[paramName] = this.voice[0].param[paramName].get();
	    });
	    console.log(params);
	}

    print(){ this.get()}
}