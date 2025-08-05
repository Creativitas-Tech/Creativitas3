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
                    value: 0,
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

    /**
     * Clears/resets a specific row to minimum values (disabled state)
     * @param {number} rowNum - The row index to clear
     */
    clearRow(rowNum) {
        if (rowNum < 0 || rowNum >= this.numRows) return;
        
        for (let i = 0; i < this.numSteps; i++) {
            this.knobs[rowNum][i].forceSet(this.minVal);
            this.disableKnob(this.knobs[rowNum][i]);
        }
        
        if (this.seqs[rowNum]) {
            this.seqs[rowNum].vals = new Array(this.numSteps).fill('.');
        }
    }

    /**
     * Randomizes values in a specific row
     * @param {number} rowNum - The row index to randomize
     * @param {boolean} keepDisabled - Whether to keep currently disabled knobs disabled
     */
    randomizeRow(rowNum, keepDisabled = true) {
        if (rowNum < 0 || rowNum >= this.numRows) return;
        
        for (let i = 0; i < this.numSteps; i++) {
            const knob = this.knobs[rowNum][i];
            if (!keepDisabled || !knob.disabled) {
                const randomVal = Math.floor(Math.random() * (this.maxVal - this.minVal + 1)) + this.minVal;
                knob.forceSet(randomVal);
                this.enableKnob(knob, rowNum);
            }
        }
    }

    /**
     * Shifts values in a row left or right
     * @param {number} rowNum - The row index to shift
     * @param {number} amount - Positive for right shift, negative for left shift
     * @param {boolean} wrapAround - Whether to wrap values around
     */
    shiftRow(rowNum, amount, wrapAround = true) {
        if (rowNum < 0 || rowNum >= this.numRows) return;
        
        const currentValues = [];
        const disabledStates = [];
        
        // Get current values and disabled states
        for (let i = 0; i < this.numSteps; i++) {
            currentValues.push(this.knobs[rowNum][i].value);
            disabledStates.push(this.knobs[rowNum][i].disabled);
        }
        
        // Shift values and states
        const shiftedValues = [];
        const shiftedStates = [];
        
        for (let i = 0; i < this.numSteps; i++) {
            let newIndex = (i - amount) % this.numSteps;
            if (newIndex < 0) newIndex += this.numSteps;
            
            if (wrapAround || (newIndex >= 0 && newIndex < this.numSteps)) {
                shiftedValues[i] = currentValues[newIndex];
                shiftedStates[i] = disabledStates[newIndex];
            } else {
                shiftedValues[i] = this.minVal;
                shiftedStates[i] = true;
            }
        }
        
        // Apply shifted values and states
        for (let i = 0; i < this.numSteps; i++) {
            this.knobs[rowNum][i].forceSet(shiftedValues[i]);
            if (shiftedStates[i]) {
                this.disableKnob(this.knobs[rowNum][i]);
            } else {
                this.enableKnob(this.knobs[rowNum][i], rowNum);
            }
        }
    }

    /**
     * Inverts values in a row (mirrors around center)
     * @param {number} rowNum - The row index to invert
     */
    invertRow(rowNum) {
        if (rowNum < 0 || rowNum >= this.numRows) return;
        
        const currentValues = [];
        const disabledStates = [];
        
        // Get current values and disabled states
        for (let i = 0; i < this.numSteps; i++) {
            currentValues.push(this.knobs[rowNum][i].value);
            disabledStates.push(this.knobs[rowNum][i].disabled);
        }
        
        // Apply inverted values
        for (let i = 0; i < this.numSteps; i++) {
            const invertedIndex = this.numSteps - 1 - i;
            this.knobs[rowNum][i].forceSet(currentValues[invertedIndex]);
            if (disabledStates[invertedIndex]) {
                this.disableKnob(this.knobs[rowNum][i]);
            } else {
                this.enableKnob(this.knobs[rowNum][i], rowNum);
            }
        }
    }

    /**
     * Scales values in a row by a factor
     * @param {number} rowNum - The row index to scale
     * @param {number} factor - Scaling factor (e.g., 0.5 for halving, 2 for doubling)
     */
    scaleRow(rowNum, factor) {
        if (rowNum < 0 || rowNum >= this.numRows) return;
        
        for (let i = 0; i < this.numSteps; i++) {
            const knob = this.knobs[rowNum][i];
            if (!knob.disabled) {
                const newValue = Math.min(this.maxVal, Math.max(this.minVal, Math.round(knob.value * factor)));
                knob.forceSet(newValue);
            }
        }
    }

    /**
     * Enables or disables an entire row
     * @param {number} rowNum - The row index to enable/disable
     * @param {boolean} enable - Whether to enable (true) or disable (false) the row
     */
    setRowEnabled(rowNum, enable) {
        if (rowNum < 0 || rowNum >= this.numRows) return;
        
        for (let i = 0; i < this.numSteps; i++) {
            const knob = this.knobs[rowNum][i];
            if (enable) {
                if (knob.value === this.minVal) {
                    knob.forceSet(0); // Default to 0 when enabling
                }
                this.enableKnob(knob, rowNum);
            } else {
                knob.forceSet(this.minVal);
                this.disableKnob(knob);
            }
        }
    }

    /**
     * Gets all values from a specific row
     * @param {number} rowNum - The row index to get values from
     * @returns {Array} Array of values (with '.' for disabled steps)
     */
    getRowValues(rowNum) {
        if (rowNum < 0 || rowNum >= this.numRows) return [];
        
        const values = [];
        for (let i = 0; i < this.numSteps; i++) {
            values.push(this.knobs[rowNum][i].disabled ? '.' : this.knobs[rowNum][i].value);
        }
        return values;
    }

    /**
     * Sets all values for a specific row
     * @param {number} rowNum - The row index to set values for
     * @param {Array} values - Array of values (can include '.' for disabled steps)
     */
    setRowValues(rowNum, values) {
        if (rowNum < 0 || rowNum >= this.numRows) return;
        
        for (let i = 0; i < Math.min(this.numSteps, values.length); i++) {
            const val = values[i];
            const knob = this.knobs[rowNum][i];
            
            if (val === '.' || val === null || val === undefined) {
                knob.forceSet(this.minVal);
                this.disableKnob(knob);
            } else {
                const numVal = Number(val);
                if (!isNaN(numVal)) {
                    knob.forceSet(Math.min(this.maxVal, Math.max(this.minVal, numVal)));
                    this.enableKnob(knob, rowNum);
                }
            }
        }
    }
}
