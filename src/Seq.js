// Seq.js
//current sequencer module feb 2025

import * as Tone from 'tone';
import { Theory, parseStringSequence, parsePitchStringSequence, parsePitchStringBeat, getChord, pitchNameToMidi, intervalToMidi } from './TheoryModule';
import { orn } from './Ornament';
import { sketch } from './p5Library.js'
import * as p5 from 'p5';

export class Seq {
     constructor(synth, arr = [0], subdivision = '8n', phraseLength = 'infinite', num = 0, callback = null) {
        this.synth = synth; // Reference to the synthesizer
        this.vals = Array.isArray(arr) ? arr : parsePitchStringSequence(arr);
        this._subdivision = subdivision; // Local alias
        this._octave = 0;                // Local alias
        this._sustain = .1;             // Local alias
        this._roll = 0.0;               // Local alias
        this._velocity = 100;            // Local alias
        this._orn = 0;            // Local alias
        this._lag = 0;            // Local alias
        this._rotate = 0;   //actual permanent rotate amount, about the thoery.tick
        this._offset = null;   //internal variable for calculating rotation specifically for play
        this._transform = (x) => x;      // Local alias
        this.phraseLength = phraseLength === 'infinite' ? 'infinite' : phraseLength * this.vals.length;
        this.enable = 1;
        this.min = 24;
        this.max = 127;
        this.loopInstance = null;
        this.num = num;
        this.callback = callback;
        this.parent = null;
        this.index = 0;
        this.nextBeat = '.'
        this.prevVals = Array.isArray(arr) ? arr : parsePitchStringSequence(arr); //for gui tracking
        this.guiElements = {}
        this.guiElements["knobs"]=[]
        this.guiElements["toggles"]=[]
        this.userCallback = null

        //(note, pattern=1, scalar=1, length=4)
        this.ornaments = [
            [1,1,1],
            [2,2,2],
            [1,2,3],
            [2,1,2],
            [1,1,8],
            [1,2,4],
            [2,1,4],
            [4,1,4]
        ]

        this.createLoop();
    }

    get subdivision() { return this._subdivision;}
    set subdivision(val) {
        this._subdivision = val;
        this.setSubdivision(val); // Update loop timing if needed
    }
    get octave() {return this._octave; }
    set octave(val) {this._octave = val; }
    get sustain() {return this._sustain;}
    set sustain(val) {  this._sustain = val; }
    get roll() {  return this._roll; }
    set roll(val) {    this._roll = val; }
    get velocity() { return this._velocity; }
    set velocity(val) {  this._velocity = val; }
    get orn() { return this._orn; }
    set orn(val) {  this._orn = val; }
    get lag() { return this._lag; }
    set lag(val) {  this._lag = val; }
    get rotate() { return this._rotate; }
    set rotate(val) {  this._rotate = val; }
    get offset() { return this._offset;}
    set offset(val) {this._offset = val}
    get transform() {  return this._transform;}
    set transform(val) {
        if (typeof val !== 'function') {
            throw new TypeError('Transform must be a function');
        }
        this._transform = val;
    }


    sequence(arr, subdivision = '8n', phraseLength = 'infinite') {
        this.vals = Array.isArray(arr) ? arr : parsePitchStringSequence(arr);
        // console.log('vals', this.vals)
        this.prevVals = Array.isArray(arr) ? arr : parsePitchStringSequence(arr);
        if(phraseLength !== 'infinite') this.phraseLength = phraseLength * this.vals.length;
        else this.phraseLength = phraseLength
        this.subdivision = subdivision;

        this.createLoop();
        //this.start()
        this.updateGui()
    }

    updateGui(){
        this.prevVals = [...this.vals];
        for(let i = 0; i<this.guiElements["knobs"].length; i++){
            if(i<this.vals.length){
                if(this.vals[i]=='.' && this.guiElements["toggles"].length > i){
                    this.guiElements["toggles"][i].forceSet(0);
                }else{
                    if(!isNaN(Number(this.vals[i]))){
                        this.guiElements["knobs"][i].forceSet( Number(this.vals[i]) )
                        // console.log("setting knob", this.guiElements["knobs"][i], "to", this.vals[i])
                    }
                    if(this.guiElements["toggles"].length > i){
                        this.guiElements["toggles"][i].forceSet(1);
                    }
                }
            }
        }
    }

    drumSequence(arr, subdivision = '8n', phraseLength = 'infinite') {
        this.vals = Array.isArray(arr) ? arr : parseStringSequence(arr);
        if(phraseLength !== 'infinite') this.phraseLength = phraseLength * this.vals.length;
        else this.phraseLength = phraseLength
        this.subdivision = subdivision;

        this.start()   
    }

    createLoop() {
        // Create a Tone.Loop
        if (this.loopInstance) {
            //this.loopInstance.stop();
            this.loopInstance.dispose();  // or .cancel() + .dispose()
        }    
        //console.log('createLoop', this.subdivision)
        this.loopInstance = new Tone.Loop(time => {
            //console.log('loop', time)
            
            this.index = Math.floor(Theory.ticks / Tone.Time(this.subdivision).toTicks());
            this.index = (this.index + this._rotate) % this.vals.length//ask ian if he wants offset to only be implemented for play with limited amount of loops, or as an infinite variable
            // console.log('ind ', this.index)
            if(this._offset !== null){//this makes offset an inperminent variable exceptfor infinite case
                console.log(this._offset)
                this.index = this._offset % this.vals.length                 
                this._offset += 1
                if (this.phraseLength !== 'infinite' && this.offset >= this.vals.length*this.phraseLength)
                    {this._offset = null}
            }
            if (this.enable === 0) return;
            let curBeat = this.vals[this.index];
            if (curBeat == undefined) curBeat = '.'

            curBeat = this.checkForRandomElement(curBeat);

            let event = parsePitchStringBeat(curBeat, time);
            //console.log('1', event)
            event = this.applyOrnamentation(event)
            event = event.map(([x, y]) => [this.perform_transform(x), y])
            //console.log(event)
            // Roll chords
            const event_timings = event.map(subarray => subarray[1]);
            let roll = this.getNoteParam(this.roll, this.index);
            roll = roll * Tone.Time(this.subdivision)
            for (let i = 1; i < event.length; i++) {
                if (event_timings[i] === event_timings[i - 1]) event[i][1] = event[i - 1][1] + roll;
            }

            //main callback for triggering notes
            //console.log(event, time, this.index, this.num)
            for (const val of event) this.callback(val, time, this.index, this.num);
            //console.log('loop', time, event, this.callback)
            if(this.userCallback){
                this.userCallback();
            }

            //check for sequencing params
            // try{
            // for(params in this.synth.param){
            //     if(Array.isArray(params)) this.synth.setValueAtTime
            // }}
            //console.log('len ', this.phraseLength)
            if (this.phraseLength === 'infinite') return;
            this.phraseLength -= 1;
            if (this.phraseLength < 1) this.stop();
        }, this.subdivision).start(0);

        this.setSubdivision(this.subdivision);

        Tone.Transport.start();
    }

    applyOrnamentation(event) {
        if (typeof event === 'string') return event; // e.g., '.' or 'r'
        //console.log(event)
        let ornIndex;
        if (Array.isArray(this._orn)) {
            ornIndex = this._orn[this.index % this._orn.length];
        } else {
            ornIndex = this._orn;
        }

        // Ensure index is valid
        const ornament = this.ornaments[ornIndex % this.ornaments.length];
        if (!ornament) return event;

        let [pattern, scalar, length] = ornament;

        const ornamentedEvent = [];

        const uniqueTimeSteps = [...new Set(event.map(e => e[1]))];
        const numSourceNotes = uniqueTimeSteps.length;
        const noteSpacing = 1 / length;

        for (let [pitch, t] of event) {
            if (pitch === '.' || !(typeof pitch === 'number' || /^-?\d+$/.test(pitch))) {
                ornamentedEvent.push([pitch, t]);
                //console.log('orn',pitch)
            } else {
                // Apply ornament
                const ornNotes = orn(pitch, pattern, scalar, length);

                ornNotes.forEach((ornPitch, i) => {
                    if (ornPitch !== '.') {
                        const timeOffset = (i * noteSpacing) / numSourceNotes;
                        ornamentedEvent.push([ornPitch, t + timeOffset]);
                    }
                });
            }
        }

        return ornamentedEvent;
    }

    checkForRandomElement(curBeat) {
        if (typeof curBeat === 'number') {
            return curBeat;
        }

        if (typeof curBeat === 'string' && curBeat.includes('?')) {
            let validElements = [];

            this.vals.forEach(item => {
                if (typeof item === 'string') {
                    const letterPattern = /[#b]?[A-Ga-g]/g;
                    const symbolPattern = /[oOxX\*\^]/g;
                    const numberPattern = /(-?\d+)/g;
                    const symbolNumberPattern = /([oOxX\*\^])\s*(1|2|3)/g;

                    let letterMatches = item.match(letterPattern);
                    if (letterMatches) {
                        validElements.push(...letterMatches);
                    }

                    let symbolMatches = item.match(symbolPattern);
                    if (symbolMatches) {
                        validElements.push(...symbolMatches);

                        let symbolNumberMatches = item.match(symbolNumberPattern);
                        if (symbolNumberMatches) {
                            symbolNumberMatches.forEach(match => {
                                const [symbol, number] = match.split(/\s*/);
                                validElements.push(number);
                            });
                        }
                    }

                    let otherNumbers = item.match(numberPattern);
                    if (otherNumbers) {
                        validElements.push(...otherNumbers);
                    }
                }
            });

            function getRandomElement() {
                return validElements[Math.floor(Math.random() * validElements.length)];
            }

            curBeat = curBeat.replace(/\?/g, () => getRandomElement());
        }

        return curBeat;
    }

    getNoteParam(val, index) {
        if (Array.isArray(val)) return val[index % val.length];
        else return val;
    }

    setNoteParam(val, arr) {
        for (let i = 0; i < arr.length; i++) arr[i] = val;
        return arr;
    }

    start() {
        this.enable = 1;
        //this.phraseLength = 'infinite'
        //if (this.loopInstance) this.loopInstance.start(0);
    }

    stop() {
        this.enable = 0;
        //if (this.loopInstance) this.loopInstance.stop();
    }

    play(num=this.vals.length){// is this being used?
        this.phraseLength = num
        this.enable = 1;
        //if (this.loopInstance) this.loopInstance.start();
    }

    expr(func, len = 32, subdivision = '16n') {
        this.createExpr(func, len, subdivision)
        return
        const arr = Array.from({ length: len }, (_, i) => {
            return func(i);
        });

        this.vals = arr.map(element => {
            return typeof element === 'string' ? element : Array.isArray(element) ? JSON.stringify(element) : element;
        });
        this.updateGui()

        this.phraseLength = 'infinite';
        this.sequence(this.vals, subdivision);
    }

    euclid(hits, beats, rotate){
        //console.log('euclid', hits, beats, rotate)
        let pattern = [];
        let bucket = 0;

      for (let i = 0; i < beats; i++) {
        bucket += hits;
        if (bucket >= beats) {
          bucket -= beats;
          pattern.push(1); // play a hit
        } else {
          pattern.push(0); // rest
        }
      }
      const valLength = this.vals.length
      for(let i = valLength; i<pattern.length;i++){
        this.vals.push(this.vals[i%valLength])
      }
      
      pattern = pattern.rotate(-1+rotate)
      //console.log(pattern, this.vals)
      for(let i=0;i<this.vals.length;i++){
        if(pattern[i%pattern.length] == 0)this.vals[i] = '.'
      }
    }

    //createExpr calculates the expression one beat at a time
    createExpr(func, len=32, subdivision = '16n') {
        // Create a Tone.Loop
        const log = false
        this.calcNextBeat(func, len, log)
        this.subdivision = subdivision
        if (this.loopInstance) {
            //this.loopInstance.stop();
            this.loopInstance.dispose();  // or .cancel() + .dispose()
        }        
        this.loopInstance = new Tone.Loop(time => {
            //console.log('loop', time)
            this.index = Math.floor(Theory.ticks / Tone.Time(this.subdivision).toTicks());
            this.index = this.index % len
            //console.log('ind ', this.index)
            if (this.enable === 0) return;
            
            let event = parsePitchStringBeat(this.nextBeat, time);
            //console.log('1', event)
            event = this.applyOrnamentation(event)
            event = event.map(([x, y]) => [this.perform_transform(x), y])
            //console.log(event)
            // Roll chords
            const event_timings = event.map(subarray => subarray[1]);
            let roll = this.getNoteParam(this.roll, this.index);
            roll = roll * Tone.Time(this.subdivision)
            for (let i = 1; i < event.length; i++) {
                if (event_timings[i] === event_timings[i - 1]) event[i][1] = event[i - 1][1] + roll;
            }

            //main callback for triggering notes
            //console.log(event, time, this.index, this.num)
            for (const val of event) this.callback(val, time, this.index, this.num);
            //console.log('loop', time, event, this.callback)
            if(this.userCallback){
                this.userCallback();
            }

            //check for sequencing params
            // try{
            // for(params in this.synth.param){
            //     if(Array.isArray(params)) this.synth.setValueAtTime
            // }}
            //console.log('len ', this.phraseLength)
            this.calcNextBeat(func, len, log)
            
            if (this.phraseLength === 'infinite') return;
            this.phraseLength -= 1;
            if (this.phraseLength < 1) this.stop();
        }, this.subdivision).start(0);

        this.setSubdivision(this.subdivision);

        Tone.Transport.start();
    }
    calcNextBeat(func, length, log){
        let i = (this.index + 1) % length
            let curBeat = func(i)

            //console.log(curBeat, i, func)
            //let curBeat = this.vals[this.index ];
            if (curBeat == undefined) curBeat = '.'

            curBeat = this.checkForRandomElement(curBeat);
            this.nextBeat = curBeat
            if(log) console.log(this.nextBeat)

    }

    setSubdivision(sub = '8n') {
        this._subdivision = sub;
        if (this.loopInstance) {
            this.loopInstance.interval = Tone.Time(this.subdivision);
        }
    }

    perform_transform(input) {

        if(typeof input === 'string') return this.transformString(input)
        
         // If it's a number or numeric string
        if (!isNaN(Number(input))) {
            return this.transform(Number(input));
        }
    }

    transformString(inputStr){
        if (typeof inputStr !== 'string') return '.';

        const isNote = str => /^[A-Ga-g][#b]?\d/.test(str);
        const isNumeric = str => !isNaN(Number(str));
        const isRest = str => str === '.' || str === 'x';
        
        // Recursive parser
        const parseTokens = (tokens) => {
            let result = [];
            while (tokens.length > 0) {
                const token = tokens.shift();

                if (token === '[') {
                    const nested = parseTokens(tokens);
                    result.push('[' + nested.join(' ') + ']');
                } else if (token === ']') {
                    break;
                } else if (isNote(token) || isRest(token)) {
                    result.push(token);
                } else if (isNumeric(token)) {
                    const val = this.transform(Number(token));
                    result.push(String(val));
                } else {
                    // fallback, unhandled token
                    result.push(token);
                }
            }

            return result;
        };

        // Tokenize by splitting on spaces while preserving brackets
        const tokens = inputStr.match(/\[|\]|\S+/g); // grabs [ ] or any non-space group
        if (!tokens) return inputStr;

        const transformedTokens = parseTokens(tokens);
        return transformedTokens.join(' ');
    }

    setTransform(func){
        this.transform = func;
    }
    dispose() {
        this.stop();
        if (this.loopInstance) {
            this.loopInstance.dispose();
        }
        this.parent = null;
        this.sequence = null;
        this.callback = null;
    }

    pushSeqState(){
        for(let i = 0; i<this.guiElements["knobs"].length; i++){
                this.guiElements["knobs"][i].ch.control(this.guiElements["knobs"][i].linkName, this.guiElements["knobs"][i].value)
                this.guiElements["toggles"][i].ch.control(this.guiElements["toggles"][i].linkName, this.guiElements["toggles"][i].value)
        }
    }

    setMinMax(min, max){
        for(let i = 0; i<this.guiElements["knobs"].length; i++){
                this.guiElements["knobs"][i].min = min;
                this.guiElements["knobs"][i].max = max;
        }
    }


        /**
         * Initialize the GUI
         * @returns {void}
         * 
         * TO USE: mySynth.seq[0].seqGui(3, 1, "linkName")
         * 
         * Can update link name with: mySynth.seq[0].changeGuiLink("newLink")
         * 
         * TODO: numRows doesn't work
         */
        seqGui(numSteps=8, chlink=null) {
            let guiContainer = document.getElementById('Canvas');
            const sketchWithSize = (p) => sketch(p, { height: 1 });
            let gui = new p5(sketchWithSize, guiContainer);
            this.guiElements["knobs"] = [];
            this.guiElements["toggles"] = [];
            let numRows = 1;
            
            for(let i = 0; i < numSteps; i++) {
                //if the sequencer already has a value, populate the knob with that
                let curval = 0;
                let stringVal = null
                //set value if it's a number
                if(i<this.vals.length){
                    curval = Number(this.vals[i]);
                    if(isNaN(curval)){
                        stringVal = this.vals[i];
                        curval = 0;
                    }
                }
                let knob = gui.Knob({ 
                    label: i+1,
                    min: -25,
                    max: 25,
                    value: curval,
                    x:Math.floor(100/(numSteps+1))*(i+1),
                    y:Math.floor(100/(numRows*2+1)*2),
                    callback: (value) => this.knobCallback(i, value)
                });
                this.guiElements["knobs"].push(knob);

                //add back correct non-number value to vals (has been changed because of callback)
                if(i<this.vals.length & stringVal!=null){
                    this.vals[i] = stringVal;
                }

                //console.log("before toggle", i, this.vals)
                let toggle = gui.Toggle({ 
                    label: i+1,
                    value: i<this.vals.length ? this.vals[i]!='.' : 1,
                    x:Math.floor(100/(numSteps+1))*(i+1),
                    y:Math.floor(100/(numRows*2+1)),
                    callback: (value) => this.toggleCallback(i, value)
                });
                //console.log("after toggle", i, this.vals)
                this.guiElements["toggles"].push(toggle);

                if(chlink != null){
                    console.log("chlink:", chlink)
                    try{
                        toggle.linkName = chlink+"toggle"+String(i);
                        toggle.ch.on(toggle.linkName, (incoming) => {
                            toggle.forceSet(incoming.values);
                        })
                        knob.linkName = chlink+"knob"+String(i);
                        knob.ch.on(knob.linkName, (incoming) => {
                            knob.forceSet(incoming.values);
                        })
                    }catch{
                        console.log("CollabHub link failed! Please call initCollab() first.")
                    }
                }
            }

            gui.setTheme(gui, 'dark' )
        }

    changeGuiLink(newLink){
        for(let i = 0; i<this.guiElements["knobs"].length; i++){
            this.guiElements["knobs"][i].linkName = newLink+"knob"+String(i)
            this.guiElements["knobs"][i].ch.on(this.guiElements["knobs"][i].linkName, (incoming) => {
                this.guiElements["knobs"][i].forceSet(incoming.values);
            })
            
            this.guiElements["toggles"][i].linkName = newLink+"toggle"+String(i)
            this.guiElements["toggles"][i].ch.on(this.guiElements["toggles"][i].linkName, (incoming) => {
                this.guiElements["toggles"][i].forceSet(incoming.values);
            })
        }
    }

    knobCallback(stepNum, val){
        if(this.vals[stepNum]!='.'){
            this.vals[stepNum] = Math.floor(val);
        }
        this.prevVals[stepNum] = val
    }

    toggleCallback(stepNum, val){
        if(val == 0){
            this.vals[stepNum] = '.'
        }else{
            this.vals[stepNum] = this.prevVals[stepNum];
        }
    }

    updateSeqGui(){}
}
