// Sequencer.js

import * as Tone from 'tone';
import {parsePitchStringSequence, parsePitchStringBeat,getChord, pitchNameToMidi, intervalToMidi} from '../Theory'
import { ArrayVisualizer } from '../visualizers/VisualizeArray';


/**

Intended to take the sequencer from monophonicTemplate and make it
more generally useful for custom sequences, as well as 
able to be imported into Param class.

 * @constructor
 */
export class MonophonicTemplate {
    constructor() {
        this.presets = {};
        this.gui_elements = [];
        this.gui = null;
        this.poly_ref = null
        this.super = null
        this.frequency = new Tone.Signal();
        this.env = new Tone.Envelope();
        this.type = 'Synth'
        this.name = ""
        this.presetsData = null

        //for .sequence()
        //this.loop = new Tone.Loop(time => {},this.subdivision)
        this.enable = new Array(10).fill(1)
        this.octave = new Array(10).fill(0)
        this.sustain = new Array(10).fill(.1)
        this.min = 24
        this.max = 127
        
        this.seq = []
        this.subdivision = []
        this.velocity = new Array(10).fill(100)
        this.loop = new Array(10).fill(null)
        for(let i=0;i<10;i++) {
            this.seq.push([0])
            this.subdivision.push('8n')
        }

        this.callback = i=>{}
        this.callbackLoop = new Tone.Loop((time)=>{
            this.index = Math.floor(Tone.Transport.ticks / Tone.Time('16n').toTicks());
            this.callback(this.index)
        },'16n').start()

        this.seqToDraw = 0
        this.drawing = new ArrayVisualizer(this,this.seq[0], 'Canvas1', .2);
        this.drawingLoop = new Tone.Loop(time=>{
            if(this.drawing.enabled === true ) {
                this.drawing.startVisualFrame()
                if(!Array.isArray(this.seqToDraw)){
                    if(this.seq[this.seqToDraw].length > 0){
                        const index = Math.floor(Tone.Transport.ticks / Tone.Time(this.subdivision[this.seqToDraw]).toTicks());
                        this.drawing.visualize(this.seq[this.seqToDraw], index)
                    }
                } else{
                    this.seqToDraw.forEach(num=>{
                        if(this.seq[num].length > 0){
                            const index = Math.floor(Tone.Transport.ticks / Tone.Time(this.subdivision[num]).toTicks());
                            this.drawing.visualize(this.seq[num], index)
                        }
                    })
                }
            }
        }, '16n').start()
    }


    /**
     * Sequences the provided array of notes and initializes a Tone.Loop with the given subdivision.
     *
     * @param {string} arr - The sequence of notes as a string.
     * @param {string} [subdivision] - The rhythmic subdivision for the loop (e.g., '16n', '8n').
     * @param {string} num (default 0) - the sequence number. Up to 10 sequences per instance.
     */
    sequence(arr, subdivision = '8n', num = 0) {

        this.seq[num] = parsePitchStringSequence(arr)

        this.createLoop(subdivision, num)

    }

    /**
     * plays the provided sequence array initializes a Tone.Loop with the given subdivision.
     *
     * @param {string} arr - The sequence of notes as a string.
     * @param {number} iterations - The the number of times to play the sequence
     * @param {string} [subdivision] - The rhythmic subdivision for the loop (e.g., '16n', '8n').
     * @param {string} num (default 0) - the sequence number. Up to 10 sequences per instance.
     */
    setSeq(arr, subdivision = '8n', num = 0){
        this.seq[num] = parsePitchStringSequence(arr)

        if (subdivision) this.setSubdivision(subdivision, num) 
    }

    play(iterations = 1, arr = null, subdivision = '8n', num = 0) {

        if(arr) this.seq[num] = parsePitchStringSequence(arr)
        if (subdivision) this.setSubdivision(subdivision, num)

        this.createLoop(subdivision, num, iterations)
        this.loop[num].start()
    }

    createLoop(subdivision, num, iterations = 'Infinity'){
        // Create a Tone.Loop
        if (this.loop[num] === null) {
            this.loop[num] = new Tone.Loop(time => {
                this.index = Math.floor(Tone.Transport.ticks / Tone.Time(this.subdivision[num]).toTicks());
                if(this.enable[num] === 0) return
                
                //if(num == 0) this.callback(this.index)
                let curBeat = this.seq[num][this.index%this.seq[num].length];
                curBeat = this.checkForRandomElement(num,curBeat)
                // if(Array.isArray(curBeat)) JSON.stringify(curBeat)
                const event = parsePitchStringBeat(curBeat, time)
                //console.log(event[0])
                //console.log(num,this.index, event, this.seq[num])
                for (const val of event)  this.parseNoteString(val, time, num)

            }, '4n').start(0);

            // Start the Transport
            Tone.Transport.start();
        }
        this.loop.iterations = iterations

        if (subdivision) {
            this.setSubdivision(subdivision, num)
        }

        this.start(num)
    }

    checkForRandomElement(num, curBeat) {
    // If curBeat is a number, return it directly
    if (typeof curBeat === 'number') {
        return curBeat;
    }

    // If curBeat is a string and contains '?', we need to replace it
    if (typeof curBeat === 'string' && curBeat.includes('?')) {
        // Assuming `this.seq` is the context where sequences are stored
        let validElements = [];

        // Iterate through each element in seq[num] to build validElements
        this.seq[num].forEach(item => {
            if (typeof item === 'string') {

                  // Define the regex patterns
                  const letterPattern = /[A-G]|[ac-g]|[#b]?[A-G]|[#b]?[ac-g]/g;
                  const symbolPattern = /[oOxX\*\^]/g;
                  const numberPattern = /(-?\d+)/g;
                  const symbolNumberPattern = /([oOxX\*\^])\s*(1|2|3)/g;

                  // Find all matching letters (A-G, a, c-g, and variations with b or #)
                  let letterMatches = item.match(letterPattern);
                  if (letterMatches) {
                    validElements.push(...letterMatches);
                  }

                  // Find all matching symbols (o O x X * ^)
                  let symbolMatches = item.match(symbolPattern);
                  if (symbolMatches) {
                    validElements.push(...symbolMatches);

                    // Also include numbers 1, 2, 3 without regard to space if symbols are present
                    let symbolNumberMatches = item.match(symbolNumberPattern);
                    if (symbolNumberMatches) {
                      symbolNumberMatches.forEach(match => {
                        const [symbol, number] = match.split(/\s*/);
                        validElements.push(number);
                      });
                    }
                  }

                  // Find all other numbers, space-separated
                  let otherNumbers = item.match(numberPattern);
                  if (otherNumbers) {
                    validElements.push(...otherNumbers);
                  }

            }
        });
        console.log(validElements)

        // Function to get a random non-? element
        function getRandomElement() {
            return validElements[Math.floor(Math.random() * validElements.length)];
        }

        // Replace each '?' with a random valid element
        curBeat = curBeat.replace(/\?/g, () => getRandomElement());
    }

    return curBeat;
}



        /**
     * Starts the loop for the synthesizer.
     */
    start(num = 'all') {
        if(num === 'all'){
            for(let i=0;i<10;i++) this.enable[i] = 1
            this.drawingLoop.start()
        }
        else this.enable[num] = 1
    }

    /**
     * Stops the loop for the synthesizer.
     */
    stop(num = 'all') {
        if(num === 'all'){
            for(let i=0;i<10;i++) this.enable[i] = 0
            this.drawingLoop.stop()
        }
        else this.enable[num] = 0
    }

    expr(func, len=32, subdivision = '16n', num = 0) {
        const arr = Array.from({ length: len }, (_, i) => func(i))

        this.seq[num] = arr.map(element => {
            return typeof element === 'string' ? element : Array.isArray(element) ? JSON.stringify(element): element;
        });

        //console.log(this.seq[num])
        this.createLoop(subdivision, num)
    }

    /**
     * Sets the velocity for a loop
     * 
     * @param {string} velocity - MIDI velocity valur
     */
    setVelocity(velocity=100, num = 'all') {
        
        if(num === 'all'){
            this.velocity = new Array(10).fill(velocity)
        } else {
            this.velocity[num] = velocity
        }
    }

    /**
     * Sets the velocity for a loop
     * 
     * @param {string} velocity - MIDI velocity valur
     */
    setSustain(val=.1, num = 'all') {
        if(val<=0) return
        if(num === 'all'){
            this.sustain = new Array(10).fill(val)
        } else {
            this.sustain[num] = val
        }
    }


    /**
     * Sets the subdivision for the loop and adjusts the playback rate accordingly.
     * 
     * @param {string} sub - The subdivision to set (e.g., '16n', '8n', '4n', '2n').
     */
    setSubdivision(sub='8n', num = 'all') {
        // this.loop.subdivision = sub;
        
        if(num === 'all'){
            this.subdivision = new Array(10).fill(sub)
            for(let i=0;i<10;i++){
                if(this.loop[i] !== null) {
                    this.setOneSub(sub,i)
                }
            }
        } else {
            if(this.loop[num] !== null) this.setOneSub(sub,num)
        }
    }

    setOneSub(sub,num){
        this.subdivision[num] = sub;
        switch (sub) {
            case '32n':
                this.loop[num].playbackRate = 16;
                break;
            case '32n':
                this.loop[num].playbackRate = 8;
                break;
            case '16n':
                this.loop[num].playbackRate = 4;
                break;
            case '8n':
                this.loop[num].playbackRate = 2;
                break;
            case '4n':
                this.loop[num].playbackRate = 1;
                break;
            case '2n':
                this.loop[num].playbackRate = 0.5;
                break;
            case '1n':
                this.loop[num].playbackRate = 0.25;
                break;
        }
    }


    parseNoteString(val, time, num){
        //console.log(val)
        if(val[0] === ".") return
        
        const usesPitchNames = /^[a-ac-zA-Z]$/.test(val[0][0]);

        let note = ''
        //console.log(val[0], usesPitchNames)
        if( usesPitchNames ) note =  pitchNameToMidi(val[0])
        else note = intervalToMidi(val[0], this.min, this.max)
        const div = val[1]
        if(note < 0) return
        //console.log(note, this.velocity[num], this.sustain)
        try{
            this.triggerAttackRelease(note + this.octave[num]*12, this.velocity[num], this.sustain[num], time + div * (Tone.Time(this.subdivision[num])));
        } catch(e){
            console.log('invalid note', note + this.octave[num]*12, this.velocity[num], this.sustain[num])
        }
    }

    //visualizations

    draw(arr = this.drawing.array, target = this.drawing.target, ratio = this.drawing.ratio ){
        this.drawing = new ArrayVisualizer(arr, target, ratio)
    }
}
