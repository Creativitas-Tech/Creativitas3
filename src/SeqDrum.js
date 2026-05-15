// Seq.js
//current sequencer module feb 2025

import * as Tone from 'tone';
import { Theory, parseStringSequence, parsePitchStringSequence, parsePitchStringBeat, parseStringBeat, getChord, pitchNameToMidi, intervalToMidi } from './TheoryModule';
import { orn } from './Ornament';
import { Seq } from './Seq.js'

export class SeqDrum extends Seq {
     constructor(synth, arr = [0], subdivision = '8n', phraseLength = 'infinite', num = 0, callback = null) {
        super(synth, arr, subdivision, phraseLength , num , callback)
        this.prevVals = Array.isArray(arr) ? arr : parsePitchStringSequence(arr); //for gui tracking
        this.stop()
    }


    sequence(arr, subdivision = '8n', phraseLength = 'infinite') {
        this.vals = Array.isArray(arr) ? arr : parseStringSequence(arr);
        if(phraseLength !== 'infinite') this.phraseLength = phraseLength * this.vals.length;
        else this.phraseLength = phraseLength
        this.subdivision = subdivision;
        // console.log('drum seq', phraseLength)
        this.start()   
    }

    createLoop (){
        // Create a Tone.Loop
      //console.log('loop made')
            this.loopInstance = new Tone.Loop(time => {
                // console.log(this.num)
                if(this.enable=== 0) return
                this.index = Math.floor(Tone.Transport.ticks / Tone.Time(this.subdivision).toTicks());
                let curBeat = this.vals[this.index % this.vals.length];

                curBeat = this.checkForRandomElement(curBeat);
                
                const event = parseStringBeat(curBeat, time);
                //console.log(event,curBeat, this.vals,time,this.index, this.subdivision)
                for (const val of event) {
                  this.parent.triggerDrum(val[0], time + val[1] * (Tone.Time(this.subdivision)), this.index, this.num);
                }
                
                if (this.phraseLength === 'infinite') return;
                this.phraseLength -= 1;
                if (this.phraseLength < 1) this.stop();
            }, this.subdivision).start(0);

            this.setSubdivision(this.subdivision);
            // Start the Transport
            Tone.Transport.start();
            //console.log("loop started")
        
        
        this.loopInstance.start()
        Tone.Transport.start()
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
            this.rawIndex = Math.floor(Theory.ticks / Tone.Time(this.subdivision).toTicks());
            this.index = this.index % len
            //console.log('ind ', this.index)
            if (this.enable === 0) return;
            
            let event = parseStringBeat(this.nextBeat, time);
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
            for (const val of event) {
                  this.parent.triggerDrum(val[0], time + val[1] * (Tone.Time(this.subdivision)), this.index, this.num);
                }
            //console.log('loop', time, event, this.callback)
            if(this.userCallback){
                this.userCallback();
            }

            if(this.drawing){
                this.updateDrawing(event, time, this.index, this.num);
            }
            if(this.pianoRoll){
                for (const val of event){
                    this.updatePianoRoll(val,time,this.index,this.num)
                }
            }

            //check for sequencing params
            // try{
            // for(params in this.synth.param){
            //     if(Array.isArray(params)) this.synth.setValueAtTime
            // }}
            //console.log('len ', this.phraseLength)
            this.calcNextBeat(func, len, log)

            //if(this.drawing){
                this.updateDrawing(event, time, this.index, this.num);
            //}



            if (this.phraseLength === 'infinite') return;
            this.phraseLength -= 1;
            if (this.phraseLength < 1) this.stop();
        }, this.subdivision).start(0);

        this.setSubdivision(this.subdivision);

        Tone.Transport.start();
    }

}