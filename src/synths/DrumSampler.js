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
import { DrumVoice } from './DrumVoice.js';
import DrumSamplerPresets from './synthPresets/DrumSamplerPresets.json';
import {parseStringSequence, parseStringBeat} from '../TheoryModule'
import {Parameter} from './ParameterModule.js'
import { Seq } from '../Seq'
import { Theory } from '../TheoryModule';
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
  constructor(kit = "default") {
    super()
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
    
    this.comp = new Tone.Compressor(-20,4)
    this.distortion = new Tone.Distortion(.5)
    this.output = new Tone.Multiply(0.8);
    this.dry_kick = new Tone.Multiply(0.)

    this.comp.connect(this.distortion)
    this.distortion.connect(this.output)

    //drum voices
    this.kick = new DrumVoice()
    this.kick.output.connect(this.dry_kick)
    this.dry_kick.connect(this.output)
    this.kick.output.connect(this.comp)
    this.hat = new DrumVoice()
    this.hat.output.connect(this.comp)
    this.snare = new DrumVoice()
    this.snare.output.connect(this.comp)
    this.p1 = new DrumVoice()
    this.p1.output.connect(this.comp)
    this.p2 = new DrumVoice()
    this.p2.output.connect(this.comp)
    this.p3 = new DrumVoice()
    this.p3.output.connect(this.comp)

    for(let i=0;i<10;i++) {
        this.subdivision[i] = '16n'
        this.createSequence(i)
    }
    // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    //console.log(this.paramDefinitions)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    
    this.loadKit('acoustic')

  }//constructor

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
      this.snare.voice.load( this.baseUrl.concat("/snare.mp3") )
      this.hat.voice.load( this.baseUrl.concat("/hihat.mp3") )
      this.p1.voice.load( this.baseUrl.concat("/tom1.mp3") )
      this.p2.voice.load( this.baseUrl.concat("/tom2.mp3") )
      this.p3.voice.load( this.baseUrl.concat("/tom3.mp3") )
      this.kick.voice.load( this.baseUrl.concat("/kick.mp3") )
    
      setTimeout( ()=>{
        this.snare.duration = this.snare.voice.buffer.duration
        this.hat.duration = this.hat.voice.buffer.duration
        this.p1.duration = this.p1.voice.buffer.duration
        this.p2.duration = this.p2.voice.buffer.duration
        this.p3.duration = this.p3.voice.buffer.duration
        this.kick.duration = this.kick.voice.buffer.duration
      }, 500)
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
  sequence(arr, subdivision = '8n', num = 0, phraseLength = 'infinite') {
        if (!this.seq[num]) {
          //console.log(num, this.seq[num])
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
    createSequence(num){
      this.seq[num] = new Seq(this, '0', '16n', 'infinite', num, this.triggerDrum.bind(this));
      this.seq[num].parent = this
      this.seq[num].vals = ['.']
      this.seq[num].loopInstance.stop()
      this.seq[num].createLoop = this.newCreateLoop
      this.seq[num].createLoop()
    }
    expr(func, len = 32, subdivision = '16n', num = 0) {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, [], subdivision, 'infinite', num, this.parseNoteString.bind(this));
        }
        this.seq[num].expr(func, len, subdivision);
        this.start(num);
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

    newCreateLoop (){
        // Create a Tone.Loop
      //console.log('loop made')
            this.loopInstance = new Tone.Loop(time => {
              //console.log(this.num)
                if(this.enable=== 0) return
                this.index = Math.floor(Tone.Transport.ticks / Tone.Time(this.subdivision).toTicks());
                let curBeat = this.vals[this.index % this.vals.length];

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
    let duration = this.getSeqParam(this.seq[num].duration, index);
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
      case '0': case 0: this.kick.trigger(1*velocity,1,time); break; //just because. . . .
      case 'O': this.kick.trigger(1*velocity,1,time); break;
      case 'o': this.kick.triggerGhost(velocity,1,time); break;
      
      case 'X': this.snare.trigger(1*velocity,1,time); break;
      case 'x': this.snare.triggerGhost(velocity,1,time); break;
      case '*': this.hat.triggerChoke(.75*velocity,0.1,time); break;
      case '^': this.hat.trigger(.75*velocity,1,time); break;
      
      case '1': case 1: this.p1.trigger(1*velocity,1,time); break;
      case '2': case 2: this.p2.trigger(1*velocity,1,time); break;
      case '3': case 3: this.p3.trigger(1*velocity,1,time); break;
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
