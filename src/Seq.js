// Seq.js
//current sequencer module feb 2025

import * as Tone from 'tone';
import { Theory, parseStringSequence, parsePitchStringSequence, parsePitchStringBeat, getChord, pitchNameToMidi, intervalToMidi } from './TheoryModule';
import { orn } from './Ornament';

export class Seq {
     constructor(synth, arr = [0], subdivision = '8n', phraseLength = 'infinite', num = 0, callback = null) {
        this.synth = synth; // Reference to the synthesizer
        this.vals = Array.isArray(arr) ? arr : parsePitchStringSequence(arr);
        this._subdivision = subdivision; // Local alias
        this._octave = 0;                // Local alias
        this._sustain = 0.1;             // Local alias
        this._roll = 0.02;               // Local alias
        this._velocity = 100;            // Local alias
        this._orn = 0;            // Local alias
        this._lag = 0;            // Local alias
        this._transform = (x) => x;      // Local alias
        this.phraseLength = phraseLength;
        this.enable = 1;
        this.min = 24;
        this.max = 127;
        this.loopInstance = null;
        this.num = num;
        this.callback = callback;
        this.parent = null;
        this.index = 0;

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
    get transform() {  return this._transform;}
    set transform(val) {
        if (typeof val !== 'function') {
            throw new TypeError('Transform must be a function');
        }
        this._transform = val;
    }


    sequence(arr, subdivision = '8n', phraseLength = 'infinite') {
        this.vals = Array.isArray(arr) ? arr : parsePitchStringSequence(arr);
        this.phraseLength = phraseLength;
        this.subdivision = subdivision;

        if (this.loopInstance) {
            this.loopInstance.dispose();
        }

        this.createLoop();
        this.start()   
    }

    drumSequence(arr, subdivision = '8n', phraseLength = 'infinite') {
        this.vals = Array.isArray(arr) ? arr : parseStringSequence(arr);
        this.phraseLength = phraseLength;
        this.subdivision = subdivision;

        if (this.loopInstance) {
            this.loopInstance.dispose();
        }
        this.createLoop();
    }

    createLoop() {
        // Create a Tone.Loop
        this.loopInstance = new Tone.Loop(time => {
            //console.log('old loop')
            

            this.index = Math.floor(Theory.ticks / Tone.Time(this.subdivision).toTicks());
            if (this.enable === 0) return;

            let curBeat = this.vals[this.index % this.vals.length];
            if(curBeat == undefined) curBeat = '.'

            //console.log("before transform", '.'+curBeat+'.')
            curBeat = this.perform_transform(curBeat);
            //console.log("after transform", '.'+curBeat+'.')

            curBeat = this.checkForRandomElement(curBeat);

            let event = parsePitchStringBeat(curBeat, time);
            //console.log('1', event)
            event = this.applyOrnamentation(event)
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

            //check for sequencing params
            // try{
            // for(params in this.synth.param){
            //     if(Array.isArray(params)) this.synth.setValueAtTime
            // }}

            if (this.phraseLength === 'infinite') return;
            this.phraseLength -= 1;
            if (this.phraseLength < 1) this.stop();
        }, this.subdivision).start(0);

        this.setSubdivision(this.subdivision);

        Tone.Transport.start();
    }

    applyOrnamentation(event) {
        let ornIndex;

        // Check if _orn is an array, if so, index into it using this.index
        if (Array.isArray(this._orn)) {
            ornIndex = this._orn[this.index % this._orn.length]; // Select dynamically from array
        } else {
            ornIndex = this._orn % this.ornaments.length; // Use as a number
        }

        let [pattern, scalar, length] = this.ornaments[ornIndex]; // Get ornament parameters

        let ornamentedEvent = [];
        //console.log('orn', this._orn, pattern, scalar, length);

        let numEvents = event.length; // Total number of notes in the ornamented event
        let noteSpacing = 1 / length; // Uniformly distribute notes

        for (let [pitch, t] of event) {
            if(pitch === '.') ornamentedEvent.push(['.', t]);
            else{
                let ornNotes = orn(pitch, pattern, scalar, length);
                //console.log('ornNotes', ornNotes);

                ornNotes.forEach((ornPitch, i) => {
                    if (ornPitch !== '.') { // Skip rests in the ornament pattern
                        ornamentedEvent.push([ornPitch, t + i * noteSpacing*(1/numEvents)]);
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
        this.phraseLength = 'infinite'
        //if (this.loopInstance) this.loopInstance.start();
    }

    stop() {
        this.enable = 0;
        //if (this.loopInstance) this.loopInstance.stop();
    }

    play(num=this.vals.length){
        this.phraseLength = num
        this.enable = 1;
        //if (this.loopInstance) this.loopInstance.start();
    }

    expr(func, len = 32, subdivision = '16n') {
        const arr = Array.from({ length: len }, (_, i) => {
            return func(i);
        });

        this.vals = arr.map(element => {
            return typeof element === 'string' ? element : Array.isArray(element) ? JSON.stringify(element) : element;
        });

        this.phraseLength = 'infinite';
        this.sequence(this.vals, subdivision);
    }

    setSubdivision(sub = '8n') {
        this._subdivision = sub;
        if (this.loopInstance) {
            this.loopInstance.interval = Tone.Time(this.subdivision);
        }
    }

    perform_transform(curBeat){
        //console.log('trans', curBeat)
        // TODO: Ask Ian why
        // Check for note names like C4, D#3, etc.
        if(typeof curBeat === 'string' && /^[A-Ga-g][#b]?\d/.test(curBeat)) {
            // For note names, just return them as is - no transformation needed
            return curBeat;
        }
        
        if(!isNaN(Number(curBeat))){ //make sure it's a number
            // console.log("returning", String(this.transform(Number(curBeat))))
            return String((this.transform(Number(curBeat))));
        }else if(curBeat[0]==='['){ //it's an array
            //if(curBeat.length <3) return '.'
            for(let i = 0; i < curBeat.length; i++){
                if(!isNaN(Number(curBeat[i])) && curBeat[i].trim() !== ""){
                    let curNum = curBeat[i];
                    let lastInd = i;
                    while(true){ //check for multiple digit numbers
                        if(lastInd<curBeat.length-1){
                            if(!isNaN(Number(curBeat[lastInd+1])) && curBeat[lastInd+1].trim() !== ""){
                                // console.log("It says this is a number", curBeat[lastInd+1]);
                                curNum += curBeat[lastInd+1]
                                lastInd += 1;
                            }else{
                                break;
                            }
                        }else{
                            break;
                        }
                    }
                    // console.log("after while", curNum);
                    // console.log("returning", curBeat.slice(0, i) + String(this.transform(Number(curNum))) + curBeat.slice(lastInd + 1))
                    let transformedNum = String((this.transform(Number(curNum))));
                    curBeat = curBeat.slice(0, i) + transformedNum + curBeat.slice(lastInd + 1);
                    lastInd += transformedNum.length - curNum.length;
                    i = lastInd;
                }
            }
            return curBeat;
        }else if(curBeat === '[]') {
            this.transform('.')
            return '.'
        }else{
            // console.log("returning", curBeat);
            this.transform('.')
            return curBeat;
        }
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
}
