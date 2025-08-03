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
                    value: 0,
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
        if(knob == undefined){
            return;
        }
        if(seq!= null){
            seq.prevVals[stepNum] = seq.vals[stepNum]
            seq.vals[stepNum] = val
        }
        if(val == this.minVal){
            if(!knob.disabled){
                this.disableKnob(knob)
            }
            if(seq != null) {seq.vals[stepNum] = '.'};
        }else if(knob.disabled){
            this.enableKnob(knob, seqNum)
        }
    }

    toggleCallback(seq, stepNum, val) {
        if(seq != null){
            console.log(seq.vals)
            if (val == 0) {
                seq.prevVals[stepNum] = seq.vals[stepNum]
                seq.vals[stepNum] = '.'
            } else {
                seq.vals[stepNum] = seq.prevVals[stepNum];
            }
            console.log(seq.vals)
        }
    }

    disableKnob(knob){
        // knob.forceSet(this.minVal)
        knob.accentColor = "border"
        knob.disabled = true
    }

    enableKnob(knob, seqNum){
        knob.accentColor = this.colors[seqNum%this.colors.length];
        knob.disabled = false
    }

    assignSeq(seq, rowNum, toggles=false, symbol='x'){
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
                    value: 0,
                    x: Math.floor(100 / (this.numSteps + 1)) * (i + 1),
                    y: rowNum==0 ? 20/this.numRows*3 : 20/this.numRows*3+Math.floor(30/this.numRows*3*(rowNum)),
                    callback: (value) => this.knobCallback(rowNum, i, value)
                })
                this.knobs[rowNum][i].hide = true
                this.knobs[rowNum][i] = knob;
                knob.disabled = false
                if(seq.vals.length > i){
                    this.knobs[rowNum][i].forceSet(Number(seq.vals[i%seq.vals.length]))
                    if(seq.vals[i%seq.vals.length] == '.'){
                        this.disableKnob(knob)
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
                    callback: (value) => this.toggleCallback(this.seqs[rowNum], i, value, symbol)
                });
                if(seq.vals.length > i){
                    if(seq.vals[i%seq.vals.length]!='.'){
                        this.knobs[rowNum][i].forceSet(1)
                    }else{
                        this.knobs[rowNum][i].forceSet(0)
                    }
                }else{
                        this.knobs[rowNum][i].forceSet(0)
                }
                this.knobs[rowNum][i].hide = true
                this.knobs[rowNum][i] = knob;
                knob.textColor = [0,0,0]
            }
            knob.accentColor = this.colors[rowNum%this.colors.length]
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
    }

    updateSeqGui() { }
}
