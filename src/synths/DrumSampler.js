/**
 * 
 * player -> vca -> comp -> distortion -> output
 * 
 * each voice has its own env and vca
 * 
 * hihat simulates open and closed:
 * 
 * hihat -> hatVca (for open/closed) -> hihat_vca (overall level) -> comp, etc.
 * openEnv -> openHatChoke(vca) -> hatVca.factor
 * closedEnv -> hatVca.factor
 * 
 * kick has a dry output pre-comp and distortion
 */

import * as Tone from 'tone';
import * as p5 from 'p5';
import { sketch } from '../p5Library.js'
import { DrumTemplate } from './DrumTemplate';
import DrumSamplerPresets from './synthPresets/DrumSamplerPresets.json';
import {parseStringSequence, parseStringBeat} from '../TheoryModule'
import {Parameter} from './ParameterModule.js'
import { Seq } from '../Seq'
import { Theory, parsePitchStringSequence, parsePitchStringBeat, getChord, pitchNameToMidi, intervalToMidi } from '../TheoryModule';
import Groove from '../Groove.js'
import paramDefinitions from './params/drumSamplerParams.js';
import layout from './layouts/drumSamplerLayout.json';
/**
 * DrumSampler class extends DrumTemplate to create a drum sampler with various sound manipulation features.
 * It loads and triggers different drum samples based on the selected kit.
 * 
 * extends DrumTemplate
 */
export class DrumSampler extends DrumTemplate{
  constructor(kit = "default", gui=null) {
    super()
    this.gui = gui
    this.backgroundColor = [150,50,50]
    
    this.presets = DrumSamplerPresets;
		this.synthPresetName = "DrumSamplerPresets"
		//this.accessPreset()
    this.name = "DrumSampler"
    this.layout = layout
    this.defaultKit = "CR78"


    this.kit = kit
    this.drumkitList = ["LINN", "Techno", "TheCheebacabra1", "TheCheebacabra2", "acoustic-kit", "breakbeat13", "breakbeat8", "breakbeat9", "4OP-FM", "Bongos", "CR78", "KPR77", "Kit3", "Kit8"]
    //
    this.closedEnv = new Tone.Envelope({attack:0.0,decay:.5,sustain:0,release:.4})
    this.openEnv = new Tone.Envelope({attack:0.0,decay:1,sustain:0,release:.4})
    this.hatVca = new Tone.Multiply()
    this.openHatChoke = new Tone.Multiply()
    this.comp = new Tone.Compressor(-20,4)
    this.distortion = new Tone.Distortion(.5)
    this.output = new Tone.Multiply(0.8);
    this.dry_kick = new Tone.Multiply(0.)
    //
    this.snareEnv = new Tone.Envelope(0.0, 1, 1, 10)
    this.snare_vca = new Tone.Multiply()
    this.snare_gain = new Tone.Multiply(1)
    this.snare = new Tone.Player().connect(this.snare_vca)
    this.hihat_vca = new Tone.Multiply(.9)
    this.hihat = new Tone.Player().connect(this.hihat_vca)
    //switched Toms to arrays
    this.tom = []
    this.tomEnv = []
    this.tom_vca = []
    this.tom_gain = []
    for(let i=0;i<3;i++) {
      this.tomEnv.push(new Tone.Envelope(0.0, 1, 1, 10))
      this.tom_vca.push( new Tone.Multiply() )
      this.tom_gain.push( new Tone.Multiply(.8) )
      this.tom.push( new Tone.Player() )
    }
    for(let i=0;i<3;i++) {
      this.tom[i].connect( this.tom_vca[i] ) 
      this.tomEnv[i].connect( this.tom_gain[i] )
      this.tom_gain[i].connect( this.tom_vca[i].factor )
      this.tom_vca[i].connect(this.comp)
    }
    //
    this.snareEnv.connect( this.snare_gain)
    this.snare_gain.connect( this.snare_vca.factor)
    this.snare_vca.connect(this.comp)
    this.hihat_vca.connect(this.hatVca)
    //
    
    this.comp.connect(this.distortion)
    this.distortion.connect(this.output)
    this.closedEnv.connect(this.hatVca.factor)
    this.openEnv.connect(this.openHatChoke)
    this.openHatChoke.connect(this.hatVca.factor)
    this.hatVca.connect(this.comp)
    //

    this.newKick = new DrumVoice()
    this.newKick.output.connect(this.dry_kick)
    this.dry_kick.connect(this.output)
    this.newKick.output.connect(this.comp)
    this.newHat = new DrumVoice()
    this.newHat.output.connect(this.comp)
    this.newSnare = new DrumVoice()
    this.newSnare.output.connect(this.comp)
    this.p1 = new DrumVoice()
    this.p1.output.connect(this.comp)
    this.p2 = new DrumVoice()
    this.p2.output.connect(this.comp)
    this.p3 = new DrumVoice()
    this.p3.output.connect(this.comp)

    //setTimeout(()=>this.loadSamples(this.kit),100)
    this.hatDecay = .05
    this.prevTime = 0

    this.kickGhostVelocity = new Array(10).fill(.25)
    this.snareGhostVelocity = new Array(10).fill(1/4)
    this.kickVelocity = new Array(10).fill(1)
    this.snareVelocity = new Array(10).fill(1)
    this.closedVelocity = new Array(10).fill(.75)
    this.openVelocity = new Array(10).fill(1)
    this.p1Velocity = new Array(10).fill(1)
    this.p2Velocity = new Array(10).fill(1)
    this.p3Velocity = new Array(10).fill(1)

    for(let i=0;i<10;i++) {
        this.subdivision[i] = '16n'
    }
    // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    //console.log(this.paramDefinitions)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    
    //this.loadKit('default')

  }//constructor
/*
  //SETTERS AND GETTERS
  get kickDecay() { return this.kickEnv.release; }
  set kickDecay(value) { this.kickEnv.release = value; }
  get snareDecay() { return this.snareEnv.release; }
  set snareDecay(value) { this.snareEnv.release = value; }
  get closedDecay() { return this.closedEnv.release; }
  set closedDecay(value) { this.closedEnv.release = value; }
  get openDecay() { return this.openEnv.decay; }
  set openDecay(value) { this.openEnv.decay = value; }
  get p1Decay() { return this.tomEnv[0].release; }
  set p1Decay(value) { this.tomEnv[0].release = value; }
  get p2Decay() { return this.tomEnv[1].release; }
  set p2Decay(value) { this.tomEnv[1].release = value; }
  get p3Decay() { return this.tomEnv[2].release; }
  set p3Decay(value) { this.tomEnv[2].release = value; }

  get kickRate() { return this.kick.playbackRate; }
  set kickRate(value) { this.kick.playbackRate = value; }
  get snareRate() { return this.snare.playbackRate; }
  set snareRate(value) { this.snare.playbackRate = value; }
  get closedRate() { return this.hihat.playbackRate; }
  set closedRate(value) { this.hihat.playbackRate = value; }
  get p1Rate() { return this.tom[0].playbackRate; }
  set p1Rate(value) { this.tom[0].playbackRate = value; }
  get p2Rate() { return this.tom[1].playbackRate.playbackRate; }
  set p2Rate(value) { this.tom[1].playbackRate = value; }
  get p3Rate() { return this.tomEnv[2].playbackRate; }
  set p3Rate(value) { this.tom[2].playbackRate = value; }

  get threshold() { return this.comp.threshold.value ; }
  set threshold(value) { this.comp.threshold.value = value; }
  get ratio() { return this.comp.ratio.value ; }
  set ratio(value) { this.comp.ratio.value = value; }
  get dist() { return this.distortion.distortion ; }
  set dist(value) { this.distortion.distortion = value; }
  get volume() { return this.output.factor.value; }
  set volume(value) { this.output.factor.value = value; }

  set dryKick(value) {this.dry_kick.factor.value = value}
  get dryKick() {return this.dry_kick.factor.value}

  setVelocity(voice, num, val){
    if(val > 1) val = val/127 //account for 0-127 velocities
    if(num>=0 && num<10){
      switch( voice ){
        case 'kick': case 'O': this.kickVelocity[num]=val; break;
        case 'snare': case 'X': this.snareVelocity[num]=val; break;
        case 'closed': case '*': this.closedVelocity[num]=val; break;
        case 'open': case '^': this.openVelocity[num]=val; break;
        case 'p1': case '1': this.p1Velocity[num]=val; break;
        case 'p2': case '2': this.p1Velocity[num]=val; break;
        case 'p3': case '3': this.p1Velocity[num]=val; break;
        case 'o': this.kickGhostVelocity[num]=val; break;
        case 'x': this.snareGhostVelocity[num]=val; break;
      }
    } else{
      for(let i=0;i<10;i++){
        switch( voice ){
        case 'kick': case 'O': this.kickVelocity[i]=val; break;
        case 'snare': case 'X': this.snareVelocity[i]=val; break;
        case 'closed': case '*': this.closedVelocity[i]=val; break;
        case 'open': case '^': this.openVelocity[i]=val; break;
        case 'p1': case '1': this.p1Velocity[num]=i; break;
        case 'p2': case '2': this.p1Velocity[num]=i; break;
        case 'p3': case '3': this.p1Velocity[num]=i; break;
        case 'o': this.kickGhostVelocity[num]=val; break;
        case 'x': this.snareGhostVelocity[num]=val; break;
      }
      }

    }

  }
  */

  /**
   * Load a specific drum kit.
   * - duplicates loadSamples()
   * @param {string} kit - The name of the drum kit to load.
   */
  loadKit(kit){ this.loadSamples(kit)}
  listKits(){console.log(this.drumkitList)}
  loadSamples(kit){
    //console.log("kit", kit)
    //this.kit = kit
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

     if (kit in this.drumFolders) {
      console.log(`Drumsampler loading ${kit}`);
      this.baseUrl = "https://tonejs.github.io/audio/drum-samples/".concat(this.drumFolders[kit]);
    } else if(kit === 'default'){
        this.baseUrl = "./audio/drumDefault";
    } else {
      console.error(`The kit "${kit}" is not available.`);
      return
    }

    //console.log("load sample", this.baseUrl)
    try{
      this.newSnare.voice.load( this.baseUrl.concat("/snare.mp3") )
      this.newHat.voice.load( this.baseUrl.concat("/hihat.mp3") )
      this.p1.voice.load( this.baseUrl.concat("/tom1.mp3") )
      this.p2.voice.load( this.baseUrl.concat("/tom2.mp3") )
      this.p3.voice.load( this.baseUrl.concat("/tom3.mp3") )
      this.newKick.voice.load( this.baseUrl.concat("/kick.mp3") )
    } catch(e){
      console.log('unable to load samples - try calling loadPreset(`default`)')
    }
  }

  /**
   * Set up and start a sequenced playback of drum patterns.
   * 
   * @param {string} arr - A string representing the drum pattern.
   * @param {string} subdivision - The rhythmic subdivision to use for the sequence (e.g., '8n', '16n').
   */
  // sequence(arr, subdivision = '8n', num = 0, iterations = 'Infinity') {

  //   this.seq[num] = parseStringSequence(arr)

  //   this.createLoop(subdivision, num, iterations)

  //   // Initialize arrays for each drum voice
  //   if (subdivision) this.subdivision[num] = subdivision;

  //   //note: we have changed approaches
  //   //the sequence is not split up at this point
  //   //instead, it is parsed in the loop
  // } 

  sequence(arr, subdivision = '8n', num = 0, phraseLength = 'infinite') {
        //this.start(num);
        //console.log(arr,num)
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, '0', subdivision, phraseLength, num, this.triggerDrum.bind(this));
            this.seq[num].parent = this
            this.seq[num].vals = parseStringSequence(arr)
            this.seq[num].loopInstance.stop()
            this.seq[num].createLoop = this.newCreateLoop
            this.seq[num].createLoop()
        } else {
            //console.log('update seq')
            this.seq[num].drumSequence(arr, subdivision, phraseLength);
        }
    }

    euclid(seq, hits=4, beats=8, rotate=0, subdivision = '8n', num = 0){
        if (!this.seq[num]) {
            this.sequence(seq, subdivision='8n', num, 'infinite');
        } else {
            this.seq[num].drumSequence(seq, subdivision, 'infinite');
        }
        this.seq[num].euclid(hits, beats,rotate);
        this.start(num);
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
        this.seq[num] = parseStringSequence(arr)

        if (subdivision) this.setSubdivision(subdivision, num) 
    }

    // play(iterations = 1, arr = null, subdivision = '8n', num = 0) {

    //     if(arr) this.seq[num] = parseStringSequence(arr)

    //     this.createLoop(subdivision, num, iterations)
    //     //this.loopInstance[num].start()
    // }

    newCreateLoop (){
        // Create a Tone.Loop
      //console.log('loop made')
            this.loopInstance = new Tone.Loop(time => {
              //console.log(this.num)
                if(this.enable=== 0) return
                this.index = Math.floor(Tone.Transport.ticks / Tone.Time(this.subdivision).toTicks());
                let curBeat = this.vals[this.index % this.vals.length];
                //console.log("before transform", '.'+curBeat+'.')
                curBeat = this.perform_transform(curBeat);
                //console.log("after transform", '.'+curBeat+'.')

                curBeat = this.checkForRandomElement(curBeat);

                const event = parseStringBeat(curBeat, time);
                //console.log(event,curBeat, this.vals,time,this.index, this.subdivision)
                for (const val of event) {
                  this.parent.triggerDrum(val[0], time + val[1] * (Tone.Time(this.subdivision)), this.index, this.num);
                }
                
            }, this.subdivision).start(0);

            this.setSubdivision(this.subdivision);
            // Start the Transport
            Tone.Transport.start();
            //console.log("loop started")
        
        
        this.loopInstance.start()
        Tone.Transport.start()
    }

  triggerDrum = (val, time=Tone.immediate(), index = 0, num=0)=>{
    // console.log(val,time,index,num)
    val = val[0]

    let octave = this.getSeqParam(this.seq[num].octave, index);
    let velocity = this.getSeqParam(this.seq[num].velocity, index);
    let sustain = this.getSeqParam(this.seq[num].sustain, index);
    let subdivision = this.getSeqParam(this.seq[num].subdivision, index);
    let lag = this.getSeqParam(this.seq[num].lag, index);

    let subdivisionTime = Tone.Time(subdivision).toSeconds();

    let groove = Groove.get(subdivision,index)
    // Calculate lag as a percentage of subdivision
    let lagTime = (lag) * subdivisionTime;
    //console.log(lag, subdivisionTime, lagTime)

    // Apply lag to time
    time = time + lagTime + groove.timing

    
    //console.log(groove)
    const timeOffset = val[1] * (Tone.Time(subdivision)) + lag + groove.timing
    velocity = (velocity/100) * groove.velocity
    if( Math.abs(velocity)>2) velocity = 2

    switch(val){
      case '.': break;
      case '0': this.newKick.trigger(1*velocity,1,time); break; //just because. . . .
      case 'O': this.newKick.trigger(1*velocity,1,time); break;
      case 'o': this.newKick.trigger(.2*velocity,1.5,time); break;
      
      case 'X': this.newSnare.trigger(1*velocity,1,time); break;
      case 'x': this.newSnare.trigger(.2*velocity,1,time); break;
      case '*': this.newHat.triggerChoke(.75*velocity,0.1,time); break;
      case '^': this.newHat.trigger(.75*velocity,1,time); break;
      
      case '1': this.p1.trigger(1*velocity,1,time); break;
      case '2': this.p2.trigger(1*velocity,1,time); break;
      case '3': this.p3.trigger(1*velocity,1,time); break;
      default: console.log('triggerDrum(), no matching drum voice ', val, '\n')
    }   
  }

  //drawBeat doesn't really work but is an attempt to draw the 
    //sequence to a canvas using html
  drawBeat (canvasId) {
        const verticalOrder = ['^', '*', '1', '2', '3', 'x', 'X', 'o', 'O'];
        const verticalSpacing = 20; // Vertical spacing between each row
        const horizontalSpacing = 40; // Horizontal spacing between each character
        const canvas = document.getElementById(canvasId);
        const beat = this.seq.original
        canvas.innerHTML = ''; // Clear any existing content

        for (let i = 0; i < beat.length; i++) {
            const element = beat[i];
            const verticalIndex = verticalOrder.indexOf(element);

            if (verticalIndex !== -1) {
                const yPos = verticalIndex * verticalSpacing; // Calculate vertical position
                const xPos = i * horizontalSpacing; // Calculate horizontal position

                const beatElement = document.createElement('div');
                beatElement.className = 'beat';
                beatElement.style.transform = `translate(${xPos}px, ${yPos}px)`;
                beatElement.textContent = element;

                canvas.appendChild(beatElement);
            }
        }
      }

  /**
     * Load a preset by name
     * @param {string} name - Name of the preset to load
     * @returns {void}
     * @example synth.loadPreset('default')
     */
    loadPreset(name) {
        setTimeout(()=>{
          this.curPreset = name;
        const presetData = this.presets[this.curPreset];

        if (presetData) {
            //console.log("Loading preset ", this.curPreset, presetData);
            for (let id in presetData) {
                try {
                    for (let element of Object.values(this.gui_elements)) {
                        
                        if (element.id === id) {
                          //console.log(id, presetData[id])
                            if (element.type !== 'momentary') element.set(presetData[id]);
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        } else {
            //console.log("No preset of name ", name);
        }
      },1000)
    }

}

class DrumVoice{
  constructor(){
    this.chokeRatio = .1
    this.decayTime = 1
    this.startPoint = 0
    this.env = new Tone.Envelope(0.0, 1, 1, 10)
    this.vca = new Tone.Multiply()
    this.output = new Tone.Multiply(1)
    this.dryOut = new Tone.Multiply(0)
    this.voice = new Tone.Player().connect(this.vca)
    this.vca.connect(this.output)
    this.voice.connect(this.dryOut)
    this.env.connect(this.vca.factor)

    let paramDefinitions = [
      {name:'choke',min:0.,max:1,curve:2,callback:x=>{
        this.chokeRatio = x
      }},
      {name:'decay',min:0.0,max:5,curve:3,callback:x=>{
        this.decayTime = x
      }},
      {name:'amp',min:0,max:1,curve:2,callback:x=>this.output.factor.value = x},
      {name:'dry',min:0,max:1,curve:2,callback:x=>this.dryOut.factor.value = x},
      {name:'rate',value:1, min:-10,max:10,curve:1,callback:x=>{
        this.voice.playbackRate = Math.abs(x)
        if(x<0) this.voice.reverse = true
      }},
      // {name:'wet',min:0.0,max:1.2,curve:2,callback:value=>this.wetSig.factor.value = value},
      // {name:'gain',min:0.0,max:1,curve:0.2,callback:value=>this.ws_input.factor.value = value},
      // {name:'amp',min:0.0,max:1.2,curve:2,callback:value=>this.output.factor.value = value},
    ]

    this.param = this.generateParameters(paramDefinitions)
    this.createAccessors(this, this.param);
  }

  setDecayTime(decay, choke){
    this.decayTime = decay
    this.chokeRatio = choke
    this.env.release = decay*choke
  }
  triggerSample(amplitude, decay,time){
    //console.log(amplitude,decay,time, this.voice)
    try{
      //this.env.release = decay == 0 ? this.decayTime * this.chokeRatio : this.decayTime
      this.voice.volume.setValueAtTime( Tone.gainToDb(amplitude), time)
      this.voice.start(time, this.startPoint)
      //this.voice.start()
      this.env.triggerAttackRelease(0.001, time)
    } catch(e){
        //console.log('time error', e)
    }
  }
    trigger(amplitude, decay,time){
      this.env.release =  this.decayTime
      this.env.decay =  this.decayTime 
      this.triggerSample(amplitude, decay,time)
    }
    triggerChoke(amplitude, decay,time){
      this.env.release =  this.decayTime * this.chokeRatio
      this.env.decay =  this.decayTime * this.chokeRatio
      this.triggerSample(amplitude, decay,time)
    }

  generateParameters(paramDefinitions) {
        const params = {};
        paramDefinitions.forEach((def) => {
            const param = new Parameter(this, def);
            params[def.name] = param;
        });
        return params;
    }

    createAccessors(parent, params) {
      //console.log(params)
      Object.keys(params).forEach((key) => {
        const param = params[key];

        // Ensure the Parameter object has a `set` method
        if (typeof param.set !== 'function') {
            throw new Error(`Parameter '${key}' does not have a set method`);
        }

        // Proxy to handle array-like access
        const proxyHandler = {
            get(target, prop) {
                if (typeof prop === 'string' && !isNaN(prop)) {
                    // Access individual array element
                    return target.get(parseInt(prop));
                }
                return target.get();
            },
            set(target, prop, value) {
                console.log(target, prop, value)
                if (typeof prop === 'string' && !isNaN(prop)) {
                    // Set individual array element
                    target.set(value, parseInt(prop));
                    return true;
                }
                // Set the entire array or scalar value
                target.set(value);
                return true;
            }
        };

        // Define the accessor property on the parent
        Object.defineProperty(parent, key, {
            get: () => new Proxy(param, proxyHandler),
            set: (newValue) => param.set(newValue),
        });
    });
}//createAccessors

    setParameter(name, value, time = null) {
        const param = this.param[name];
        if (!param) throw new Error(`Parameter '${name}' does not exist.`);
        
        if (time) {
            // Handle sequenced parameter updates
            param.callback(value, time);
        } else {
            // Handle immediate parameter updates
            param.callback(value);
        }

        // Update associated GUI elements
        if (param.guiElement) {
            param.guiElement.setValue(value);
        }
    }

    get() {
        let output = 'Parameters:\n';
        for (let key in this.param) {
            const param = this.param[key];
            output += `${param.name}: ${param._value}\n`;
        }
        console.log(output);
    }
}
