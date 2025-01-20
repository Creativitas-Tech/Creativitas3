
/********************
 * polyphony
 ********************/

import p5 from 'p5';
import * as Tone from 'tone';
import { MonophonicTemplate } from './MonophonicTemplate';
import {stepper} from  '../Utilities.js'

export class Polyphony extends MonophonicTemplate{
	constructor(voice,num=8, gui= null){
		super()
    this.gui = gui
    this.name = voice.name
		this.numVoices = num
		this.slop = .05

		//audio
		this.voice = []
		for(let i=0;i<this.numVoices;i++) this.voice.push(new voice)
		this.output = new Tone.Multiply(1/this.numVoices)
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
		this.v = this.getNewVoice(val)
		//val = val + Math.random()*this.slop - this.slop/2
		if(time){
			this.voice[this.v].triggerAttackRelease(val, vel, dur, time)
		} else{
			this.voice[this.v].triggerAttackRelease(val, vel, dur)
		}
		//console.log("AR ", val,dur)
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
			const curEnv = this.voice[curElement].env.value;
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


initGui(selfRef, gui) {
  this.voice[0].super = selfRef;
  this.voice[0].initGui(gui);
  const elements = this.voice[0].gui_elements;

  // Function to modify the value expression by replacing 'x' with 'e'
  const modifyValueExpression = (val) => val ? val.replace(/\bx\b/g, 'e') : null;
  //const modifyValueExpression = (val) => val// ? val.replace(/\bx\b/g, 'e') : null;

	function stringIsFunction(variableName, context = window) {
		return /\(.*\)/.test(variableName)
  	}

	function getFunctionDetails(funcString) {
	  // Remove any extra spaces and the "x => " part
	  funcString = funcString.trim().replace(/^.*=>\s*/, '');

	  // Check if the function is a block (has curly braces)
	  if (funcString.startsWith('{') && funcString.endsWith('}')) {
	    // Extract the code inside the curly braces
	    funcString = funcString.slice(1, -1).trim();
	  }

	  // Now try to match the function call and capture the function name and arguments
	  const match = funcString.match(/([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\((.*)\)/);
	  if (match) {
	    const functionName = match[1];
	    const argsString = match[2];
	    return { functionName, argsString };
	  }

	  return null;
	}

  // Function to generate a new callback based on the parameter and value expression
  /* Three cases
  		- x => param.value = x
  		- x => param.value = function(x)
  		- function(x)
  */
  const createCallback = (param, val, element) => {
  	
  	const modifiedVal = modifyValueExpression(val);
  	let voiceTarget = this.voice[0];

  	let keys = param.split('.');
     const lastKey = keys[keys.length - 1];

     //console.log('cb', param, val, keys)

	if (!val) {
		const modifiedParam = modifyValueExpression(param);
	     const funcDetails = getFunctionDetails(modifiedParam);
	    // console.log('details', funcDetails, modifiedParam)
		if (!funcDetails) {
		console.error("Invalid function string");
		return null;
		}

		const { functionName, argsString } = funcDetails;

		// console.log('cb is function', param, val, functionName, argsString)
		if (!functionName) {
		console.error("Invalid function string");
		return null;
		}

		// Return a new function that updates the target for each voice
		return (e) => {
		  for (let j = 0; j < this.numVoices; j++) {
		    const func = this.voice[j][functionName];

		    let voiceTarget = this.voice[j];
		    for (let k = 0; k < keys.length - 1; k++) {
		      voiceTarget = voiceTarget[keys[k]];
		    }

		    const evaluatedArgs = argsString.replace(/\bx\b/g, e);
		    //console.log('args', evaluatedArgs, argsString)
		    let argsArray;
		    try {argsArray = new Function('e', `return [${evaluatedArgs}]`)(e);} 
		    catch (error) {}
		    //console.log(j,'func1', this.voice[j][functionName], argsArray)
		    try { this.voice[j][functionName](...argsArray);} catch (error) {}
		  }
		};
 	}//done

    else {
      for (let k = 0; k < keys.length - 1; k++) {

        if (voiceTarget[keys[k]] === undefined) {
          console.log('Voice target undefined');
          return;
        }
        voiceTarget = voiceTarget[keys[k]];
      }
      //console.log(param, modifiedVal, lastKey, stringIsFunction(modifiedVal, this))
      
      //if a function is used to get the value of x
      //e.g. x=> this.param.value = function(x)
      if( stringIsFunction(modifiedVal, this) ){
      	const modifiedVal2 = modifiedVal.replace(/^this\./, '').replace(/\(.*\)$/, '');
      	let func = this.voice[0][modifiedVal2]
      	console.log('value is function', func, param, modifiedVal2)
      	return (e) => {
      		for (let j = 0; j < this.numVoices; j++) {
      			let func = this.voice[j][modifiedVal2]
      			voiceTarget = this.voice[j]
      			for (let k = 0; k < keys.length - 1; k++) voiceTarget = voiceTarget[keys[k]];
	      		voiceTarget[lastKey] = func(e);
	      		//console.log(j,'func2', voiceTarget, modifiedVal)
	    	}
      	}
      }//done

		//if the value being set uses .value
      return (e) =>{
      	//console.log(param, e)
      	this.set(param, eval(e))
      }
    }
  };//createCalback

  // Main loop to iterate over GUI elements and set their callbacks
  elements.forEach((element) => {
  	//console.log(element, element.callback)
    try {
      if (!element.callback) return;

      const funcString = element.callback.toString();
      if (funcString.includes('this.super')) return;

      let param = this.generateParamString(element.callback);
      const val = this.retrieveValueExpression(element.callback);

      if (!param) {
        param = this.applyFunctionToAllVoices(element.callback);
      }

      const callback = createCallback(param, val, element);
      //console.log(element, callback)
      element.callback = callback;
    } catch (error) {
      console.log('Invalid GUI element:', element, error);
    }
  });
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

	//SET PARAMETERS

	set(param, value, time = Tone.now()) {
    //console.log('set', param, value);

    // Split the parameter into keys (to access nested properties)
    let keys = param.split('.');

    for (let i = 0; i < this.numVoices; i++) {
        let target = this.voice[i];

        // Traverse through the nested objects based on the keys
        for (let j = 0; j < keys.length - 1; j++) {
            if (target[keys[j]] === undefined) {
                console.error(`Parameter ${keys[j]} does not exist on voice ${i}`);
                return;
            }
            target = target[keys[j]];
        }

        const lastKey = keys[keys.length - 1];

        // Ensure `value` is always treated as a function
        const finalValue = typeof value === 'function' ? value() : value;

        //console.log(target, finalValue)

        if (target[lastKey] !== undefined) {
            if (target[lastKey]?.value !== undefined) {
                console.log(`Current value: ${target[lastKey].value}, Setting new value: ${finalValue}`);

                if (time === null) {
                    target[lastKey].value = finalValue;  // Set value immediately
                } else {
                    target[lastKey].linearRampToValueAtTime(finalValue, time + 0.1);  // Ramp to value
                }
            } else {
                // If it's not an object with `value`, set directly
                target[lastKey] = finalValue;
            }
        } else {
            console.error(`Parameter ${lastKey} does not exist on voice ${i}`);
        }
    }
}

/**** PRESETS ***/

	loadPreset(name) {
		//for(let i=0;i<this.numVoices;i++) this.voice[i].loadPreset(name)
		this.voice[0].loadPreset(name)
	}

	listPresets() {
        this.voice[0].listPresets();
    }

	savePreset(name) {
		this.voice[0].savePreset(name)
	};

    // Function to download the updated presets data
	downloadPresets() {
		this.voice[0].downloadPresets()
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

}