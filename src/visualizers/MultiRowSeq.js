// Seq.js
//current sequencer module feb 2025

import * as Tone from 'tone';
import { Theory, parseStringSequence, parsePitchStringSequence, parsePitchStringBeat, getChord, pitchNameToMidi, intervalToMidi } from './../TheoryModule';
import { orn } from './../Ornament';
import { sketch } from './../p5Library.js'
import * as p5 from 'p5';

export class MultiRowSeqGui {
    constructor(numRows = 8, numSteps = 8, chlink = null) {
        this.numRows = numRows
        this.numSteps = numSteps
        this.minVal = -25
        this.maxVal = 25
        this.chlink = chlink
        this.seqs = new Array(numRows).fill(null);
        this.guiContainer = document.getElementById('Canvas');
        let height = .4*numRows
        const sketchWithSize = (p) => sketch(p, { height: height });
        this.gui = new p5(sketchWithSize, this.guiContainer);
        this.knobs = []
        // this.toggles = []
        this.colors = [[255,0,0],[255,255,0],[255,0,255],[0,255,150],[0,0,255]]
        this.initializeGui(numRows, numSteps)
        this.borderColor = [100, 100, 100]
    }

    initializeGui(numRows, numSteps) {
        this.knobs = [];
        // this.toggles = [];
        for (let j = 0; j < numRows; j++) {
            this.knobs.push([])
            // this.toggles.push([])
            for (let i = 0; i < numSteps; i++) {
                let knob = this.gui.Knob({
                    label: i + 1,
                    min: this.minVal,
                    max: this.maxVal,
                    value: 1,
                    x: Math.floor(100 / (numSteps + 1)) * (i + 1),
                    y: j==0 ? 20/numRows*3 : 20/numRows*3+Math.floor(30/numRows*3*(j)),
                    callback: (value) => this.knobCallback(j, i, value)
                })
                this.knobs[j].push(knob);
                knob.accentColor = this.colors[j%this.colors.length]
                knob.disabled = false

                // let toggle = gui.Toggle({
                //     label: i + 1,
                //     value: 1,
                //     x: Math.floor(100 / (numSteps + 1)) * (i + 1),
                //     y: Math.floor(300 / (numRows * 2 + 1)),
                //     callback: (value) => this.toggleCallback(this.seqs[j], i, value)
                // });
                // this.toggles[j].push(toggle);

                if (this.chlink != null) {
                    try {
                        // toggle.linkName = this.chlink + "toggle" + String(j) + String(i);
                        // toggle.ch.on(toggle.linkName, (incoming) => {
                        //     toggle.forceSet(incoming.values);
                        // })
                        knob.linkName = this.chlink + "knob" + String(j) + String(i);
                        knob.ch.on(knob.linkName, (incoming) => {
                            knob.forceSet(incoming.values);
                        })
                    } catch {
                        console.log("CollabHub link failed! Please call initCollab() first.")
                    }
                }
            }

        }
        this.gui.setTheme(this.gui, 'dark')
    }

    knobCallback(seqNum, stepNum, val) {
        let seq = this.seqs[seqNum]
        let knob = this.knobs[seqNum][stepNum]
        if(isNaN(Number(val))){
            this.disableKnob(knob);
            seq.vals[stepNum] = '.'
            return;
        }
        if(knob == undefined){
            return;
        }
        if(seq!= null){
            seq.prevVals[stepNum] = seq.vals[stepNum]
            seq.vals[stepNum] = val
        }
        if(Number(val) == Number(this.minVal)){
            seq.vals[stepNum] = '.'
            if(!knob.disabled){
                this.disableKnob(knob)
            }
            // if(seq != null) {c};
        }else if(knob.disabled){
            this.enableKnob(knob, seqNum)
        }
    }

    toggleCallback(seq, stepNum, val) {
        if(seq != null){
            if (val == 0) {
                // seq.prevVals[stepNum] = seq.vals[stepNum]
                seq.vals[stepNum] = '.'
            } else {
                seq.vals[stepNum] = seq.prevVals[stepNum];
            }
        }
    }

    disableKnob(knob){
        knob.forceSet(this.minVal)
        knob.accentColor = this.borderColor
        knob.disabled = true
    }

    enableKnob(knob, seqNum){
        knob.accentColor = this.colors[seqNum%this.colors.length];
        knob.disabled = false
    }

    assignSeq(seq, rowNum, toggles=false){
        this.seqs[rowNum] = seq
        let prevVals = seq.vals.slice(0)
        for (let i = 0; i < this.numSteps; i++) {
            let knob = null;
            // this.toggles[rowNum][i].callback = (value) => this.toggleCallback(seq, i, value)
            if(!toggles){
                knob = this.gui.Knob({
                    label: i + 1,
                    min: this.minVal,
                    max: this.maxVal,
                    value: Math.floor((this.minVal+this.maxVal)/2),
                    x: Math.floor(100 / (this.numSteps + 1)) * (i + 1),
                    y: rowNum==0 ? 20/this.numRows*3 : 20/this.numRows*3+Math.floor(30/this.numRows*3*(rowNum)),
                    callback: (value) => this.knobCallback(rowNum, i, Number(value))
                })
                this.knobs[rowNum][i].hide = true
                this.knobs[rowNum][i] = knob;
                knob.disabled = false
                seq.vals = prevVals.slice(0)
                if(seq.vals.length > i){
                    if(!isNaN(Number(seq.vals[i]))){
                        if(Number(seq.vals[i]) == this.minVal){
                            this.disableKnob(knob)
                            prevVals[i] = '.'
                        }else{
                            knob.forceSet(Number(seq.vals[i]))
                        }
                    }else{
                        this.disableKnob(knob)
                        prevVals[i] = '.'
                    }
                }else{
                    this.disableKnob(knob)
                }
                // this.knobs[rowNum][i].callback = (value) => this.knobCallback(seq, i, value)
                seq.guiElements["knobs"][i] = knob
            }else{
                knob = this.gui.Toggle({
                    label: i + 1,
                    value: 1,
                    x: Math.floor(100 / (this.numSteps + 1)) * (i + 1),
                    y: rowNum==0 ? 23/this.numRows*3 : 23/this.numRows*3+Math.floor(30/this.numRows*3*(rowNum)),
                    callback: (value) => this.toggleCallback(this.seqs[rowNum], i, value)
                });
                if(seq.vals.peek(-1)==undefined){
                    seq.vals.pop(-1)
                }
                if(i<seq.vals.length){
                    if(seq.vals[i%seq.vals.length]!=='.'){
                        knob.forceSet(1)
                    }else{
                        knob.forceSet(0)
                    }
                }else{
                    knob.forceSet(0)
                }
                knob.accentColor = this.colors[rowNum%this.colors.length]
                this.knobs[rowNum][i].hide = true
                this.knobs[rowNum][i] = knob;
                knob.textColor = [0,0,0]
                seq.guiElements["toggles"][i] = knob
            }
            // if(!knob.disabled){
            //     knob.accentColor = this.colors[rowNum%this.colors.length]
            // }
            if (this.chlink != null) {
                try {
                    knob.linkName = this.chlink + "knob" + String(rowNum) + String(i);
                    knob.ch.on(knob.linkName, (incoming) => {
                        knob.forceSet(incoming.values);
                    })
                } catch {
                    console.log("CollabHub link failed! Please call initCollab() first.")
                }
            }        
        }        
        seq.vals = prevVals
        this.showCurrentBeat(rowNum)
    }


    setSeqOff(seqNum){
        let seq = this.seqs[seqNum]
        let knob = this.knobs[seqNum]
        for(let i = 0; i < this.numSteps; i++){
            if(knob[i].constructor.name == 'Toggle'){
                knob[i].forceSet(0);
            }else{
                this.disableKnob(knob[i]);

            }
        }
        seq.vals = new Array(this.numSteps).fill('.'); 
    }

    pushState(){
        for(let j = 0; j<this.seqs.length; j++){
            for(let i = 0; i<this.knobs.length; i++){
                this.knobs[j][i].ch.control(this.knobs[j][i].linkName, this.knobs[j][i].value)
            }
        }
    }

    showCurrentBeat(seqNum){
        let seq = this.seqs[seqNum]
        let newCallback = ()=>{
            if(seq.index%seq.vals.length < this.numSteps){
                this.knobs[seqNum][seq.index%seq.vals.length].accentColor = this.knobs[seqNum][seq.index%seq.vals.length].accentColor.map(element => element * .4);
            }
            let prevInd = (seq.index+seq.vals.length-1)%seq.vals.length
            if(prevInd < this.numSteps){
                this.knobs[seqNum][prevInd].accentColor = this.colors[seqNum%this.colors.length]
                if(this.knobs[seqNum][prevInd].disabled){
                    this.knobs[seqNum][prevInd].accentColor = this.borderColor
                }
            }
        }
        seq.userCallback = newCallback;
    }

    setValues(seqNum, vals, subdivision = null){
        // vals = Array.isArray(vals) ? vals : parsePitchStringSequence(vals);
        if(subdivision == null){
            subdivision = this.seqs[seqNum].subdivision
        }
        let originalVals = this.seqs[seqNum].vals.slice(0)
        this.seqs[seqNum].sequence(vals, subdivision);
        
        //update GUI
        let updatedVals = this.seqs[seqNum].vals.slice(0)
        for(let i = 0; i<this.numSteps; i++){
            if(this.knobs[seqNum][i].value==0 && i<updatedVals.length){
                this.seqs[seqNum].vals[i] = '.'
            }
            if(this.seqs[seqNum].vals[i] == '.' || i>=updatedVals.length){
                if(this.knobs[seqNum][i].constructor.name == 'Toggle'){
                    this.knobs[seqNum][i].forceSet(0);
                    if(i>=updatedVals.length){
                        this.seqs[seqNum].vals.pop(-1)
                    }
                }else{
                    this.disableKnob(this.knobs[seqNum][i]);
                }
            }else{
                if(this.knobs[seqNum][i].constructor.name == 'Toggle'){
                    this.knobs[seqNum][i].forceSet(1);
                }else{
                    this.enableKnob(this.knobs[seqNum][i]);
                }
            }
            console.log(this.seqs[seqNum].vals)
        }
        this.seqs[seqNum].vals = this.seqs[seqNum].vals.filter(x => x)
        this.seqs[seqNum].prevVals = updatedVals

    }
}
