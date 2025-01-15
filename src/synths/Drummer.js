/**
 * Drummer.js
 * 
 * Single drum voice
 * 
 * player -> vcf -> vca -> output
 * 
 * env -> gain -> vca.factor
 * accentEnv -> accentDepth -> vca.factor
 * 
 * uses the standard sequence type, with parameters for:
 * - velocity
 * - tuning: sample playback rate
 * - decay: base decay time for envelope
 * - choke: scalar for decay
 * - tone: multirange filter
 * - strike: position of sample to start playing
 * - accent: selectable volume boost
 * 
 * The sequence can either use a specified char to trigger playback
 * or use a float to set amplitude(velocity)
 * 
 * 
 */

import * as Tone from 'tone';
import { DrumTemplate } from './DrumTemplate';
import {parseStringSequence, parseStringBeat} from '../TheoryModule'
import { SimpleSeq } from './SimpleSeq'
import {Parameter} from './ParameterModule.js'

/**
 * DrumSampler class extends DrumTemplate to create a drum sampler with various sound manipulation features.
 * It loads and triggers different drum samples based on the selected kit.
 * 
 * extends DrumTemplate
 */
export class Drummer extends DrumTemplate{
  constructor(voice = "kick", kit = "acoustic") {
    super()
    this.name = "Drummer"
    this.voice = voice
    this.kit = kit
    this.drumkitList = ["LINN", "Techno", "TheCheebacabra1", "TheCheebacabra2", "acoustic-kit", "breakbeat13", "breakbeat8", "breakbeat9", "4OP-FM", "Bongos", "CR78", "KPR77", "Kit3", "Kit8"]
    //
    this.output = new Tone.Multiply(1);
    this.env = new Tone.Envelope(0.001, 1, 1, 10)
    this.vca = new Tone.Multiply()
    this.gain = new Tone.Multiply(1)
    this.drum = new Tone.Player()
    this.vcf = new Tone.Filter({type:'lowpass', rolloff:'-12',Q:0,frequency:10000})
    this.vcfEnvDepth = new Tone.Multiply()
    this.cutoffFreq = new Tone.Signal()
    this.accentEnv = new Tone.Envelope({attack:.003,decay:.1,sustain:0,release:.1})
    this.accentDepth = new Tone.Multiply()

    //connections
    this.drum.connect(this.vcf)
    this.vcf.connect(this.vca)
    this.vca.connect(this.output)

    this.cutoffFreq.connect(this.vcf.frequency)
    this.env.connect(this.vcfEnvDepth)
    this.accentEnv.connect(this.vcfEnvDepth)
    this.vcfEnvDepth.connect(this.vcf.frequency)

    this.env.connect( this.gain)
    this.gain.connect( this.vca.factor)
    this.accentEnv.connect(this.accentDepth)
    this.accentDepth.connect( this.vca.factor)

    //parameters
    this.velocity = new SimpleSeq(1)
    this.strike = new SimpleSeq(0)
    this.curStrike = 0
    this.damp = new SimpleSeq(0)
    this.chokeRatio = .5
    this.choke = new SimpleSeq(0)
    this.decay = new SimpleSeq(1)
    this.tone = new SimpleSeq(1)
    this.accent = new SimpleSeq(0)
    this.accentLevel = .2
    this.tuning = new SimpleSeq(1)
    this.subdivision = new SimpleSeq('16n')

    // let paramDefinitions = [
    //   {name:'volume',min:0.0,max:1,curve:2,callback:x=>this.output.factor.value = x},
    //   {name:'velocity',min:0.0,max:1,curve:2,callback:x=>this.velocityVal.setAll(x)},
    //   {name:'decay',min:0.0,max:1.,curve:2,callback:x=>this.decayTime.setAll(x)},
    //   {name:'damping',min:0,max:1,curve:2,callback:x=>this.dampValue.setAll(x)},
    //   {name:'choke',min:0,max:1,curve:2,callback:x=>this.chokeRatio=x},
    //   {name:'tone',min:0.0,max:1,curve:2,callback:x=>this.toneAmount.setAll(x)},
    //   {name:'accent',min:0.0,max:1,curve:2,callback:x=>this.accentLevel=x},
    //   {name:'tuning',min:0.0,max:2,curve:1,callback:x=>this.tuningAmount.setAll(x)},
    //   {name:'strike',min:0.0,max:1.,curve:2,callback:x=>this.strikePosition.setAll(x)}
    // ]

    // this.param = this.generateParameters(paramDefinitions)
    // this.createAccessors(this, this.param);

    this.sampleLength = 1
    //
    this.loadSamples(this.kit)
    this.prevTime = 0

  }//constructor


  /**
   * Load a specific drum kit.
   * - duplicates loadSamples()
   * @param {string} kit - The name of the drum kit to load.
   */
  loadKit(kit){ this.loadSamples(kit)}
  listKits(){console.log(this.drumkitList)}
  loadSamples(kit){
    this.kit = kit
    this.drumFolders = {
      "4OP-FM": "4OP-FM", "FM": "4OP-FM",
      "Bongos": "Bongos", "Bongo": "Bongos",
      "CR78": "CR78", 
      "KPR77": "KPR77",
      "Kit3": "Kit3","kit3": "Kit3", 
      "Kit8": "Kit8", "kit8": "Kit8", 
      "LINN": "LINN", "linn": "LINN", 
      "R8": "R8",
      "Stark": "Stark", "stark": "Stark", 
      "Techno": "Techno", "techno": "Techno", 
      "TheCheebacabra1": "TheCheebacabra1", "Cheese1": "TheCheebacabra1",
      "TheCheebacabra2": "TheCheebacabra2",  "Cheese2": "TheCheebacabra2",
      "acoustic-kit": "acoustic-kit", "acoustic": "acoustic-kit", "Acoustic": "acoustic-kit",
      "breakbeat13": "breakbeat13", 
      "breakbeat8": "breakbeat8", 
      "breakbeat9": "breakbeat9",
    }

     if (this.kit in this.drumFolders) {
      console.log(`Drumsampler loading ${this.kit}`);
    } else {
      console.error(`The kit "${this.kit}" is not available.`);
      return
    }

    this.baseUrl = "https://tonejs.github.io/audio/drum-samples/".concat(this.drumFolders[this.kit]);
    this.urls = {
      "C3": "/kick.mp3",
      "D3": "/snare.mp3",
      "F#3": "/hihat.mp3",
      "F3": "/tom1.mp3",
      "G3": "/tom2.mp3",
      "A3": "/tom3.mp3"
    }
    // Load the sample and store its length in ms
    this.drum = new Tone.Player({
        url: this.baseUrl.concat("/" + this.voice + ".mp3"),
        onload: () => {
            // Access the buffer duration and convert to milliseconds
            this.sampleLength = this.drum.buffer.duration; // duration in ms
            console.log("Sample length:", this.sampleLength, " seconds");
            this.drum.connect(this.vcf)
        }
    })
  }

  /**
   * Trigger a specific drum voice.
   * 
   * @param {string} voice - The name of the drum voice to trigger (e.g., "kick", "snare").
   * @param {number} vel - The velocity (amplitude) of the triggered voice.
   * @param {number} time - The time at which to trigger the voice.
   */
  trigger(vel, time){
    console.log('trig', vel)
    try{
      this.drum.volume.setValueAtTime( Tone.gainToDb(vel), time)
      this.drum.start( time, this.curStrike )
      this.env.triggerAttackRelease(.001, time)
    } catch(e){
      console.log('time error')
    }
  }
  
  parseNoteString(val, time, num, index){
    if(val[0] === ".") return

    let vel = val[0]
    let div = val[1]

    this.loopFunc(index, num, vel, time + div * (Tone.Time(this.subdivision[num])))
    return
        
        // const usesPitchNames = /^[a-ac-zA-Z]$/.test(val[0][0]);

        // let note = ''
        // //console.log(val[0], usesPitchNames)
        // //if( usesPitchNames ) note =  pitchNameToMidi(val[0])
        // if( usesPitchNames ) {
        //   console.log("drummer doesn't use pitches")
        //   return
        // }
        // //else note = intervalToMidi(val[0], this.min, this.max)
        // const div = val[1]
        // if(note < 0) return
        // //console.log(note, this.velocity[num], this.sustain[num], time)

        // //check for velocity,octave,sustain, and roll arrays
        // // let octave = this.getNoteParam(this.octave[num],index)
        // // let velocity = this.getNoteParam(this.velocity[num],index)
        // // let sustain = this.getNoteParam(this.sustain[num],index)
        // //let roll = getNoteParam(this.roll[num],this.index[num])
        // //console.log(note + octave*12, velocity, sustain)
        // try{
        //     this.trigger(velocity,time + div * (Tone.Time(this.subdivision[num])));
        // } catch(e){
        //     console.log('invalid note', note + octave*12, velocity, sustain)
        // }
    }

    getNoteParam(val,index){
        if( Array.isArray(val)) return val[index%val.length]
        else return val    
    }
    setNoteParam(val,arr){
        for(let i=0;i<arr.length;i++) arr[i] = val
        return arr
        // if( Array.isArray(val)) return val[index%val.length]
        // else Array(num).fill(val)
    }
    //convert tone value from 0-1 to Hz
    toneScalar(val,time){
      val = Math.pow(val,2)
      //console.log( val*2000,  10000-val*9900)
      this.vcfEnvDepth.factor.setValueAtTime( val*4000, time)
      this.cutoffFreq.setValueAtTime( (1-val)*10000, time)
    }
    /**
   * Trigger the drum voice.
   * @param {number} vel - The velocity (amplitude) of the triggered voice.
   * @param {number} time - The time at which to trigger the voice.
   */
    loopFunc(index, num=0, vel=127, time=Tone.now()){
      let velocity = vel * this.velocity.get(num,index)
      let curDecay = this.decay.get(num,index)
      this.env.release = this.sampleLength * curDecay
      if(this.choke.get(num,index)!= 1) curDecay*=this.chokeRatio
      this.toneScalar(this.damp.get(num,index),time)
      if(this.accent.get(num,index)) this.accentEnv.triggerAttackRelease(.05)
      this.curStrike = this.strike.get(num,index)
      //this.drum.playbackRate = this.tuning.get(num,index)
      this.trigger(velocity,time)
    }
}