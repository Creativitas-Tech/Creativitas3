// Seq.js

import * as Tone from 'tone';
import { Theory, parsePitchStringSequence, parsePitchStringBeat, getChord, pitchNameToMidi, intervalToMidi } from './TheoryModule';

export class TuringMachine {
  constructor(){
    this.seq = new Array(32).fill(0)
    this.bigKnob = 0
    this.index = 0
    this.len = 16
    this.init()
    this.val = 0
    this.pitchScalar = 1
    this.pitchVal = 0
    this.scale = [0,2,4,5,7,9,11,12]
  }
  init(){
    for(let i=0;i<32;i++)this.seq[i] = Math.random()>0.5
  }
  get(){
    if(Math.random()> Math.abs(this.bigKnob)) this.seq[this.index%this.len] = Math.random()>0.5
    this.val = this.seq[this.index%this.len]
    this.index++
   return this.val
  }
  set knob(val){
    this.len = this.bigKnob>0?16:8
    this.bigKnob = val>1?1: val<-1?-1: val
    this.len = this.bigKnob>0?32:16
  }
  pitch(){
    this.pitchVal = 0
    for(let i=0;i<8;i++)this.pitchVal+=(this.seq[(this.index+i)%8]*i)
    this.pitchVal = this.pitchVal*this.pitchScalar/32
    console.log(this.pitchVal)
    return this.scale[Math.floor(this.pitchVal)]
  }
  getStep(num){
    if(Array.isArray(num)) num = num.reduce((a,b)=>a+b)
    return this.seq[(this.index+num)%this.len]
  }
}
