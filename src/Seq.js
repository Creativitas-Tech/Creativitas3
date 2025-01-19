// Seq.js
//current sequencer module jan 2025

import * as Tone from 'tone';
import { Theory, parseStringSequence, parsePitchStringSequence, parsePitchStringBeat, getChord, pitchNameToMidi, intervalToMidi } from './TheoryModule';

export class Seq {
     constructor(synth, arr = [0], subdivision = '8n', phraseLength = 'infinite', num = 0, callback = null) {
        this.synth = synth; // Reference to the synthesizer
        this.vals = Array.isArray(arr) ? arr : parsePitchStringSequence(arr);
        this._subdivision = subdivision; // Local alias
        this._octave = 0;                // Local alias
        this._sustain = 0.1;             // Local alias
        this._roll = 0.02;               // Local alias
        this._velocity = 100;            // Local alias
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
            if (this.enable === 0) return;

            this.index = Math.floor(Theory.ticks / Tone.Time(this.subdivision).toTicks());

            let curBeat = this.vals[this.index % this.vals.length];

            //console.log("before transform", '.'+curBeat+'.')
            curBeat = this.perform_transform(curBeat);
            //console.log("after transform", '.'+curBeat+'.')

            curBeat = this.checkForRandomElement(curBeat);

            const event = parsePitchStringBeat(curBeat, time);

            // Roll chords
            const event_timings = event.map(subarray => subarray[1]);
            let roll = this.getNoteParam(this.roll, this.index);
            for (let i = 1; i < event.length; i++) {
                if (event_timings[i] === event_timings[i - 1]) event[i][1] = event[i - 1][1] + roll;
            }
            for (const val of event) this.callback(val, time, this.index, this.num);

            if (this.phraseLength === 'infinite') return;
            this.phraseLength -= 1;
            if (this.phraseLength < 1) this.stop();
        }, this.subdivision).start(0);

        this.setSubdivision(this.subdivision);

        Tone.Transport.start();
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
        if (this.loopInstance) this.loopInstance.start();
    }

    stop() {
        this.enable = 0;
        if (this.loopInstance) this.loopInstance.stop();
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
        if(!isNaN(Number(curBeat))){ //make sure it's a number
            // console.log("returning", String(this.transform(Number(curBeat))))
            return String((this.transform(Number(curBeat))));
        }else if(curBeat[0]==='['){ //it's an array
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
        }else{
            // console.log("returning", curBeat);
            return curBeat;
        }
    }

    setTransform(func){
        this.transform = func;
    }
}
