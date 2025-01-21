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
 * 
 * 
 * 
 * 
 * 
 */

import * as Tone from 'tone';
import { DrumTemplate } from './DrumTemplate';
import DrumSamplerPresets from './synthPresets/DrumSamplerPresets.json';
import {parseStringSequence, parseStringBeat} from '../TheoryModule'
import {Parameter} from './ParameterModule.js'
import { Seq } from '../Seq'
import { Theory, parsePitchStringSequence, parsePitchStringBeat, getChord, pitchNameToMidi, intervalToMidi } from '../TheoryModule';
/**
 * DrumSampler class extends DrumTemplate to create a drum sampler with various sound manipulation features.
 * It loads and triggers different drum samples based on the selected kit.
 * 
 * extends DrumTemplate
 */
export class DrumSampler extends DrumTemplate{
  constructor(kit = "acoustic", gui=null) {
    super()
    this.gui = gui
    this.presets = DrumSamplerPresets
    this.name = "DrumSampler"
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
    this.kickEnv = new Tone.Envelope(0.0, 1, 1, 10)
    this.kick_vca = new Tone.Multiply()
    this.kick_gain = new Tone.Multiply(1)
    this.kick = new Tone.Player().connect(this.kick_vca)
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
    this.kickEnv.connect( this.kick_gain)
    this.kick_gain.connect( this.kick_vca.factor)
    this.kick_vca.connect(this.comp)
    this.snareEnv.connect( this.snare_gain)
    this.snare_gain.connect( this.snare_vca.factor)
    this.snare_vca.connect(this.comp)
    this.hihat_vca.connect(this.hatVca)
    //
    this.kick_vca.connect(this.dry_kick)
    this.comp.connect(this.distortion)
    this.distortion.connect(this.output)
    this.closedEnv.connect(this.hatVca.factor)
    this.openEnv.connect(this.openHatChoke)
    this.openHatChoke.connect(this.hatVca.factor)
    this.hatVca.connect(this.comp)
    this.dry_kick.connect(this.output)
    //

    this.new = new DrumVoice()
    this.new.output.connect(this.comp)
    this.newHat = new DrumVoice()
    this.newHat.output.connect(this.comp)
    this.p1 = new DrumVoice()
    this.p1.output.connect(this.comp)

    this.loadSamples(this.kit)
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

    if (this.gui !== null) {
            this.initGui()
            this.hideGui();
            this.loadPreset('default');
        }

        for(let i=0;i<10;i++) {
            this.subdivision[i] = '16n'
        }

  }//constructor

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
    this.kick.load( this.baseUrl.concat("/kick.mp3") )
    this.snare.load( this.baseUrl.concat("/snare.mp3") )
    this.hihat.load( this.baseUrl.concat("/hihat.mp3") )
    this.newHat.voice.load( this.baseUrl.concat("/hihat.mp3") )
    this.tom[0].load( this.baseUrl.concat("/tom1.mp3") )
    this.tom[1].load( this.baseUrl.concat("/tom2.mp3") )
    this.tom[2].load( this.baseUrl.concat("/tom3.mp3") )
    this.new.voice.load( this.baseUrl.concat("/kick.mp3") )
  }

  /**
   * Trigger a specific drum voice.
   * 
   * @param {string} voice - The name of the drum voice to trigger (e.g., "kick", "snare").
   * @param {number} vel - The velocity (amplitude) of the triggered voice.
   * @param {number} time - The time at which to trigger the voice.
   */
  trigger(voice, vel, time) {
    if (voice.loaded) {
      switch (voice) {
        case "kick": this.triggerVoice( this.kick,  vel, time ); break;
        case "snare": this.triggerVoice( this.snare, vel, time ); break;
        case "hihat": this.triggerVoice( this.hihat, vel, time ); break;
        case "tom1": this.triggerVoice( this.tom[0], vel, time ); break;
        case "tom2": this.triggerVoice( this.tom[1], vel, time ); break;
        case "tom3": this.triggerVoice( this.tom[2], vel, time ); break;
        default: console.error(`Unknown voice: ${voice}`); break;
      }
    } else {
      console.error("Sampler is not loaded yet.");
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
    console.log(arr)
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

  createLoop(subdivision, num, iterations='Infinity',){
        // Create a Tone.Loopdsfg
        if (this.loopInstance[num] === null) {
            this.loopInstance[num] = new Tone.Loop(time => {
              //console.log(num)
                this.index = Math.floor(Tone.Transport.ticks / Tone.Time(this.subdivision[num]).toTicks());
                if(this.enable[num] === 0) return
                
                if(num == 0) this.callback(this.index)
                let curBeat = this.seq[num][this.index%this.seq[num].length];
                curBeat = this.checkForRandomElement(num,curBeat)
                const event = parseStringBeat(curBeat, time)
                //console.log(this.index , this.seq[num],curBeat, event)

                for (const val of event) {
                  this.triggerDrum(val[0], num, time + val[1] * (Tone.Time(this.subdivision[num])));
                }
                
                if(this.phraseLength[num] === 'infinite') return
                this.phraseLength[num] -= 1
                if(this.phraseLength[num] < 1) this.stop(num)
            }, subdivision).start(0);

            // Start the Transport
            Tone.Transport.start();
            console.log("loop started")
        }
        //this.loopInstance[num].iterations = iterations * this.seq[num].length

        if (subdivision) {
         // if(subdivision !== this.subdivision[num]){
                setTimeout( this.setSubdivision(subdivision, num), 100)
             // }
        }

        this.start(num)
    }

    newCreateLoop (){
        // Create a Tone.Loop
      console.log('loop made')
            this.loopInstance = new Tone.Loop(time => {
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
                  this.parent.triggerDrum(val[0], 0, time + val[1] * (Tone.Time(this.subdivision)));
                }
                
            }, this.subdivision).start(0);

            this.setSubdivision(this.subdivision);
            // Start the Transport
            Tone.Transport.start();
            console.log("loop started")
        
        
        this.loopInstance.start()
        Tone.Transport.start()
    }

  triggerDrum = (val, num, time)=>{
    //console.log(val,time, this.kickVelocity[num],this)
    val = val[0]
    switch(val){
      case '.': break;
      case '0': this.new.trigger(1,1,time); break; //just because. . . .
      case 'O': this.new.trigger(1,1,time); break;
      //case 'O': this.triggerVoice(this.kick,this.kickVelocity[num],time); break;
      case 'o': this.new.trigger(.5,1.5,time); break;
      case 'X': this.triggerVoice(this.snare,1,time); break;
      case 'x': this.triggerVoice(this.snare,.5,time); break;
      // case '*': this.triggerVoice(this.hihat,this.closedVelocity[num],time); break;
      case '*': this.newHat.trigger(.75,0.1,time); break;
      case '^': this.newHat.trigger(.75,1,time); break;
      case '1': this.triggerVoice(this.tom[0],1,time); break;
      case '2': this.triggerVoice(this.tom[1],1,time); break;
      case '3': this.triggerVoice(this.tom[2],1,time); break;
      default: console.log('triggerDrum(), no matching drum voice ', val, '\n')
    }   
  }
  triggerNew(voice, amplitude, time){
    console.log('new')
    this.new.voice.volume.setValueAtTime( Tone.gainToDb(amplitude), time)
    this.new.voice.start(time)
    this.new.env1.triggerAttackRelease(0.001, time)
  }

  triggerVoice(voice, amplitude, time){
    let curEnv = null
    if( voice === this.kick ) curEnv = this.kickEnv
    else if( voice === this.snare ) curEnv = this.snareEnv
    else if( voice === this.tom[0] ) curEnv = this.tomEnv[0]
    else if( voice === this.tom[1] ) curEnv = this.tomEnv[1]
    else if( voice === this.tom[2] ) curEnv = this.tomEnv[2]
    else if( voice === this.hihat) {
      this.closedEnv.triggerAttackRelease(.001,time)
      this.openHatChoke.factor.setValueAtTime(0, time)
    }
    else if( voice === "openHat") {
      voice = this.hihat
      this.openHatChoke.factor.setValueAtTime(1, time)
      this.openEnv.triggerAttackRelease(10,time)
    }
    //if( voice.state === "started" ) voice.stop(time)
    //if( this.prevTime < time){
    try{
      voice.volume.setValueAtTime( Tone.gainToDb(amplitude), time)
      voice.start( time )
      if(curEnv !== null) curEnv.triggerAttackRelease(.001, time)
    } catch(e){
      console.log('time error')
    }
    // } else { console.log('caught time error', time, this.prevTime)}
    // this.prevTime = time
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

  /** create a visual gui on the gui element.
   * The gui element can be passed in the constructor or here
   * @param {number} [x = 10] - base X position
   * @param {number} [y = 10] - base Y position
   * @param {object} [gui=this.gui] - The GUI object to use.
   */
  initGui(gui=this.gui, x = 10, y = 10) {
      if(gui) this.gui = gui
      // Set the base positions
      this.x = x;
      this.y = y;
      
      this.enables_array = [];
      this.values_array = [];

      // Create GUI elements for VCA controls (factor controls)
      const kick_vca_knob = this.createKnob('Kick', 0, 40, 0, 1, .5, [200, 50, 0], x => this.kick_gain.factor.value = x);
      const snare_vca_knob = this.createKnob('Snare', 0, 20, 0, 1, .5, [200, 50, 0], x => this.snare_gain.factor.value = x);
      const hat_vca_knob = this.createKnob('Hihat', 0, 0, 0, 1, .5, [200, 50, 0], x => this.hihat_vca.factor.value = x);
      const toms_vca_knob = this.createKnob('Toms', 0, 60, 0, 1, .5, [200, 50, 0], x => {this.tom_gain[0].factor.value = x; this.tom_gain[1].factor.value = x ;this.tom_gain[2].factor.value = x});
      const kick_decay_knob = this.createKnob('decay', 10, 40, 0, 1, .5, [200, 50, 0], x => this.kickEnv.release = x*10+.01);
      const snare_decay_knob = this.createKnob('decay', 10, 20, 0, 1, .5, [200, 50, 0], x => this.snareEnv.release = x*10+.01);
      const toms_decay_knob = this.createKnob('decay', 10, 60, 0, 1, .5, [200, 50, 0], x => {this.tomEnv[0].release = x*10+.01; this.tomEnv[1].release = x*10+.01 ;this.tomEnv[2].release = x*10+.01});
      
      const output_knob = this.createKnob('Output', 80, 60, 0, 4, 1, [200, 50, 0], x => this.output.factor.value = x);
      const dry_kick_knob = this.createKnob('Dry Kick', 40, 40, 0, 1, .4, [200, 50, 0], x => this.dry_kick.factor.value = x);

      // Create GUI elements for Playback Rate controls
      const kick_rate_knob = this.createKnob('rate', 20, 40, 0., 2, .4, [200, 50, 0], x => this.kick.playbackRate = x);
      const snare_rate_knob = this.createKnob('rate', 20, 20, 0., 2, .4, [200, 50, 0], x => this.snare.playbackRate = x);
      const hat_rate_knob = this.createKnob('rate', 20, 0, 0., 2, .4, [200, 50, 0], x => this.hihat.playbackRate = x);
      const tom1_rate_knob = this.createKnob('1 Rate', 20, 60, 0., 2, .4, [200, 50, 0], x => this.tom[0].playbackRate = x);
      const tom2_rate_knob = this.createKnob('2 Rate', 30, 60, 0., 2, .4, [200, 50, 0], x => this.tom[1].playbackRate = x);
      const tom3_rate_knob = this.createKnob('3 Rate', 40, 60, 0., 2, .4, [200, 50, 0], x => this.tom[2].playbackRate = x);

      // Create GUI elements for Compressor controls
      const comp_threshold_knob = this.createKnob('Threshold', 60, 20, -60, -5, .5, [200, 50, 0], x => this.comp.threshold.value = x);
      const comp_ratio_knob = this.createKnob('Ratio', 60, 40, 1, 20, .5, [200, 50, 0], x => this.comp.ratio.value = x);

      // Create GUI element for Distortion Amount control
      const distort_knob = this.createKnob('Distort', 60, 60, 0, 1, .5, [200, 50, 0], x => this.distortion.distortion = x);

      // Create GUI element for Hat Decay
      const hihat_decay_knob = this.createKnob('Closed Decay', 40, 0, 0.01, .5, .75, [200, 50, 0], x => this.closedEnv.release = x);
      const open_decay_knob = this.createKnob('Open Decay', 50, 0, 0.01, 2, .75, [200, 50, 0], x => this.openEnv.decay = x);
  
      const kit_dropdown = this.gui.Dropdown({
        label: 'kit', dropdownOptions: this.drumkitList,
        // (()=>{
        //   const valuesArray = Object.values(this.drumFolders)
        //   const uniqueValuesArray = [...new Set(valuesArray)];
        //   return uniqueValuesArray})(),
        x: 80, y:10, size:15,
        callback:(x)=>{this.loadSamples(x)}
      })

      // Add all elements to an array for hiding/showing gui
    this.gui_elements = [
        kick_vca_knob, 
        snare_vca_knob, 
        hat_vca_knob, 
        toms_vca_knob,
        kick_decay_knob,
        snare_decay_knob,
        toms_decay_knob, 
        output_knob, 
        dry_kick_knob,
        kick_rate_knob, 
        snare_rate_knob, 
        hat_rate_knob, 
        tom1_rate_knob, 
        tom2_rate_knob, 
        tom3_rate_knob,
        comp_threshold_knob, 
        comp_ratio_knob,
        distort_knob, 
        hihat_decay_knob,
        open_decay_knob,
        kit_dropdown
    ];
  }

  createKnob(_label, _x, _y, _min, _max, _size, _accentColor, callback) {
      //console.log(_label)
      return this.gui.Knob({
        label:_label, min:_min, max:_max, size:_size, accentColor:_accentColor,
        x: _x + this.x, y: _y + this.y,
        callback: callback,
        curve: 1, // Adjust as needed
        border: 4, // Adjust as needed
        showLabel: 1, showValue: 1
      });
    }

  // connect(destination) {
  //   if (destination.input) {
  //     this.output.connect(destination.input);
  //   } else {
  //     this.output.connect(destination);
  //   }
  // }

	// disconnect(destination) {
  //   if (destination.input) {
  //     this.output.disconnect(destination.input);
  //   } else {

  //     this.output.disconnect(destination);
  //   }
  // }
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
        this.env.release = x*this.decayTime
      }},
      {name:'decay',min:0.0,max:10,curve:2,callback:x=>{
        this.decayTime = x
        this.env.release = x*this.chokeRatio
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
  trigger(amplitude, decay,time){
    //console.log(amplitude,decay,time, this.voice)
    try{
      this.env.release = decay == 0 ? this.decayTime * this.chokeRatio : this.decayTime
      this.voice.volume.setValueAtTime( Tone.gainToDb(amplitude), time)
      this.voice.start(time, this.startPoint)
      //this.voice.start()
      this.env.triggerAttackRelease(0.001, time)
    } catch(e){
        console.log('time error', e)
    }

    
  }

  generateParameters(paramDefinitions) {
        const params = {};
        paramDefinitions.forEach((def) => {
            const param = new Parameter(def);
            params[def.name] = param;
        });
        return params;
    }

    createAccessors(parent, params) {
      console.log(params)
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