/*
 * Simple Sampler
 *
 * 
*/
import p5 from 'p5';
import * as Tone from 'tone';
//import SimplerPresets from './synthPresets/SimplerPresets.json';
import { MonophonicTemplate } from './MonophonicTemplate';
import {Theory, parsePitchStringSequence, parsePitchStringBeat,getChord, pitchNameToMidi, intervalToMidi} from '../TheoryModule'
import { Seq } from '../Seq'

class CustomPlayer extends Tone.Player {
    set playbackRate(rate) {
        this._playbackRate = rate;
        const now = this.now();

        // Custom logic or modifications
        //console.log("Custom playback rate set:", rate);

        // Original logic
        // const stopEvent = this._state.getNextState("stopped", now);
        // if (stopEvent && stopEvent.implicitEnd) {
        //     this._state.cancel(stopEvent.time);
        //     this._activeSources.forEach((source) => source.cancelStop());
        // }
        this._activeSources.forEach((source) => {
            source.playbackRate.setValueAtTime(rate, now);
        });
    }
}


export class Player extends MonophonicTemplate {
    constructor (file) {
        super()
        // this.gui = gui
        //this.presets = SimplerPresets
        this.name = "Player"
        
        //audio objects
        this.player = new CustomPlayer()
        this.vcf = new Tone.Filter()
        this.vca = new Tone.Multiply(1)
        this.output = new Tone.Multiply(1)
        this.cutoffSig = new Tone.Signal(10000)

        //vcf setup
        this.cutoffSig.connect(this.vcf.frequency)
        this.vcf.frequency.value = 10000
        this.vcf.rolloff = -12
        this.vcf.Q.value = 1

        //Set up filter envelope
        this.filterEnv = new Tone.Envelope()
        this.vcfEnvDepth = new Tone.Multiply()
        this.filterEnv.connect(this.vcfEnvDepth)
        this.vcfEnvDepth.connect(this.vcf.frequency)

        //connect vcf to vca
        this.player.connect(this.vcf)
        this.vcf.connect(this.vca)
        this.vca.connect(this.output)

        this.sample = ''
        this.sampleDuration = 0
        this._baseUnit = 16
        this.seqControlsPitch = false
        this._start = 0
        this._end = 100
        this._playbackRate = 1
        this._baseNote = 60

        let paramDefinitions = [
          {name:'volume',value: -6,min:-36,max:0,curve:1,callback:x=>this.player.volume.value = x},
          {name:'cutoff',value:20000,min:100,max:10000,curve:2,callback:value=>this.cutoffSig.value = value},
          {name:'Q',min:0.0,value:0,max:20,curve:2,callback:value=>this.vcf.Q.value = value},
          {name:'filterType',value:'lowpass',min:0.0,max:20,curve:2,callback:value=>this.vcf.type = value},
          {name:'filterEnvDepth',value:0,min:0.0,max:5000,curve:2,callback:value=>this.vcfEnvDepth.factor.value = value},
            {name:'loopStart',value:0,min:0,max:10000,curve:1,callback:x=>this.player.loopStart =x},
            {name:'loopEnd',value:1,min:0,max:10000,curve:1,callback:x=>this.player.loopEnd =x},
            {name:'loop',value:false, min:0,max:1,curve:1,callback:x=>this.player.loop = x>0},
            {name:'fadeIn',value:0.005, min:0,max:10,curve:3,callback:x=>this.player.fadeIn =x},
            {name:'fadeOut',value: 0.1,min:0,max:10,curve:3,callback:x=>this.player.fadeOut =x},
            {name:'baseUnit',value:16, min:0,max:60000,curve:1,callback:x=>this._baseUnit =x},
            {name:'playbackRate',value:1,min:0,max:1000,curve:1,callback:x=>{
                if(x<0)this.player.reverse = 1
                this._playbackRate=Math.abs(x); 
                this.player.playbackRate = Math.abs(x)
            }},
            {name:'sequenceTime',value:true,min:0,max:1,curve:1,callback:x=>this.seqControlsPitch = !x},
            {name:'startTime',value:0, min:0,max:10000,curve:1,callback:x=>this._start = x},
            {name:'endTime',value:1, min:0,max:10000,curve:1,callback:x=>this._end = x},
            {name:'baseNote',min:0,max:127,curve:1,callback:x=>this._baseNote = x},
            {name:'reverse',value:false, min:0,max:1,curve:1,callback:x=> {
                if(x>0) this.player.reverse = 1
                else this.player.reverse = 0
            }},
       
        ]

        let paramGui = [
          {name:'volume',x:10,y:10,color:'red'},
          {name:'attack',min:0.01,max:1,curve:2,callback:x=>{this.player.attack=x}},
          {name:'release',min:.01,max:10,curve:2,callback:x=>{ this.player.release=x }},
          {name:'cutoff',min:100,max:10000,curve:2,callback:value=>this.cutoffSig.value = value},
          {name:'Q',min:0.0,max:20,curve:2,callback:value=>this.vcf.Q.value = value},
          {name:'filterEnvDepth',min:0.0,max:5000,curve:2,callback:value=>this.vcfEnvDepth.factor.value = value},
          ]

        this.param = this.generateParameters(paramDefinitions)
        this.createAccessors(this, this.param);
        //this.attachGuiToParams()

        this.sampleFiles = {
          bell: ['C4', 'berklee/bell_1.mp3'],
          bell1:   ['C4', 'berklee/bell_1a.mp3'],
          bell2:   ['C4', 'berklee/bell_2a.mp3'],
          bell3:   ['C4', 'berklee/bell_mallet_2.mp3'],
          horn:['C4', 'berklee/casiohorn2.mp3'],
          chotone:  ['C4', 'berklee/chotone_c4_!.mp3'],
          voice: ['C4', 'berklee/femalevoice_aa_Db4.mp3'],
          kalimba: ['C4', 'berklee/Kalimba_1.mp3'],
          dreamyPiano: ['A5', 'salamander/A5.mp3'],
          softPiano: ['A4', 'salamander/A4.mp3'],
          piano: [45, 'salamander/A3.mp3'],
          casio:['C4', 'casio/C2.mp3']
        }

        if(file) this.loadSample(file)
    }

    /**
   * Load a specific sample.
   * @param {string} file - The name of the sample to load.
   */
    load(file = null){this.loadSample(file)}
    loadSample(file = null){
        if(file === null) {
            this.loadAudioBuffer()
            return
        }

        // If the file is a number, treat it as an index into the sampleFiles object
        if (typeof file === 'number') {
            // Convert the keys of the sampleFiles object to an array
            const fileKeys = Object.keys(this.sampleFiles);
            file = Math.floor(file)%fileKeys.length
            file = fileKeys[file];
        }

        if (file in this.sampleFiles) {
          console.log(`Player loading ${file}`);
          this.sample = file
        } else {
            try{
                this.player.load(file)
                console.log('file loaded from ', file)
                this.getSampleDuration()
                return
            }catch{}
          console.error(`The sample "${file}" is not available.`);
          return
        }

        this.baseUrl = "https://tonejs.github.io/audio/"
        const url = this.sampleFiles[this.sample][1]
        const note = this.sampleFiles[this.sample][0]
        console.log(note, url)
        this.player.load(this.baseUrl.concat(url), () => {
            const duration = this.player.buffer.length / Tone.context.sampleRate;
            console.log(`Sample duration: ${duration.toFixed(2)} seconds`);
        });
    }

    listSamples(){
        const fileKeys = Object.keys(this.sampleFiles);
        console.log(fileKeys)
    }

    //envelopes
    trigger(freq=0, amp=127, dur=0.1, time=null){
        this.triggerAttackRelease (freq, amp, dur, time)
    }

    triggerAttack (freq, amp=100, time=null){ 
        const dur = 100
        amp = amp/127
        if(time){
            if(!this.seqControlsPitch) {
                if(this._playbackRate!= this.player.playbackRate) this.player.playbackRate = this._playbackRate
                this.player.start(time,freq, dur)
            }
            else {
                this.player.playbackRate = this.midiToRate(freq)
                this.player.start(time, this._start, dur)
            }
            this.filterEnv.triggerAttack(time+.0)
            this.vca.factor.setValueAtTime(amp, time+.0)
        } else{
            if(!this.seqControlsPitch) {
                if(this._playbackRate!= this.player.playbackRate) this.player.playbackRate = this._playbackRate
                this.player.start(Tone.now(),freq, dur)
            }
            else {
                //console.log('pitch',freq,amp,dur,time)
                this.player.playbackRate = this.midiToRate(freq)
                this.player.start(Tone.now(), this._start, dur)
            }
            this.filterEnv.triggerAttack()
            this.vca.factor.setValueAtTime(amp)
        }
    }
    
    triggerRelease (freq, time=null){
        if(time){
            this.player.stop(time)
            this.filterEnv.triggerRelease(time+.0)
        } else{
            this.player.stop()
            this.filterEnv.triggerRelease()
        }
    }

    triggerAttackRelease (freq, amp, dur=0.01, time=null){ 
        //console.log(freq,amp,dur,time)
        amp = amp/127
        dur+=.2
        if(time){
            if(!this.seqControlsPitch) {
                //console.log('noy', freq,dur)
                if(this._playbackRate!= this.player.playbackRate) this.player.playbackRate = this._playbackRate
                this.player.start(time,freq)
            }
            else {
                //console.log('pitch',dur.toFixed(2), this._start,time)
                this.player.playbackRate = this.midiToRate(freq)
                this.player.start(time, this._start)
            }
            this.filterEnv.triggerAttackRelease(dur,time)
            this.vca.factor.setValueAtTime(amp, time)
         } 
        //else{
        //     if(!this.seqControlsPitch) {
        //         if(this._playbackRate!= this.player.playbackRate) this.player.playbackRate = this._playbackRate
        //         this.player.start(Tone.now(),freq, dur)
        //     }
        //     else {
        //         //console.log('pitch',freq,amp,dur,time)
        //         this.player.playbackRate = this.midiToRate(freq)
        //         this.player.start(Tone.now(), this._start, dur)
        //     }
        //     this.filterEnv.triggerAttackRelease(dur)
        //     this.vca.factor.setValueAtTime(amp)
        // }
    }//attackRelease

    midiToRate(note){
        //console.log(Math.pow(2, (note - this._baseNote) / 12));
        return Math.pow(2, (note - this._baseNote) / 12);
    }

    connect(destination) {
        if (destination.input) {
            this.output.connect(destination.input);
        } else {
            this.output.connect(destination);
        }
    }
    // Function to open a file dialog and load the selected audio file
    loadAudioBuffer() {
        // Create a file input element programmatically
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*'; // Accept only audio files

        // Handle file selection
        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) {
                console.log("No file selected");
                return;
            }

            // Use FileReader to read the file as a Data URL
            const fileReader = new FileReader();
            fileReader.onload = () => {
                // Create a Tone.Player and load the Data URL
                this.player = new CustomPlayer(fileReader.result).connect(this.vcf);
                this.player.autostart = false; // Automatically start playback
                console.log("Audio loaded into player");
                this.getSampleDuration()
            };
            fileReader.readAsDataURL(file);
        };

        // Trigger the file dialog
        fileInput.click();
    }
    getSampleDuration(){
        setTimeout(()=>{
            const duration = this.player._buffer.length / Tone.context.sampleRate;
            if(duration>0){
                console.log(`Sample duration: ${duration.toFixed(2)} seconds`)
                this.sampleDuration = duration
            } else{
                this.getSampleDuration()
            }
        },100);
    }

    /**
     * Sequences the provided array of notes and initializes a Tone.Loop with the given subdivision.
     *
     * @param {string} arr - The sequence of notes as a string.
     * @param {string} [subdivision] - The rhythmic subdivision for the loop (e.g., '16n', '8n').
     * @param {string} num (default 0) - the sequence number. Up to 10 sequences per instance.
     */
    sequence(arr, subdivision = '8n', num = 0, phraseLength = 'infinite') {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, arr, subdivision, phraseLength, num, this.parseNoteString.bind(this));
        } else {
            this.seq[num].sequence(arr, subdivision, phraseLength);
        }
        this.start(num);
    }

    /*
    For Player the sequencer controls the sample start time by default.
    - sample start times are normalized where 0-1 is the length of the sample
    this.seqControlsPitch allows controlling sample pitch instead
    */
    parseNoteString(val, time, index, num){
        if(this.sampleDuration==0){
                console.log(`Sample duration: 0 seconds`)
                this.getSampleDuration()
                return;
            } 
        //console.log(val,val[0]*this.sampleDuration,time,num)
        
        //uses val for time location rather than pitch
        if(val[0] === ".") {
            if(this.player.state === 'started') this.player.stop(time)
            return
        }

        const usesPitchNames = /^[a-ac-zA-Z]$/.test(val[0][0]);

        let note = ''
        //console.log()
        //console.log(val[0], usesPitchNames)
        if(!this.seqControlsPitch){
            if( usesPitchNames ) {
                console.log('player seq values are time positions in the sample')//note =  pitchNameToMidi(val[0])
                return
            } 
            //note = val[0]*this._baseUnit + this._start//intervalToMidi(val[0], this.min, this.max)
            note = val[0]*this.sampleDuration
        } else{
            if( usesPitchNames ) note =  pitchNameToMidi(val[0])
            else note = intervalToMidi(val[0], this.min, this.max)
        }
        const div = val[1]
        if(note < 0) return

        let octave = this.getSeqParam(this.seq[num].octave, index);
        let velocity = this.getSeqParam(this.seq[num].velocity, index);
        let sustain = this.getSeqParam(this.seq[num].sustain, index);
        let subdivision = this.getSeqParam(this.seq[num].subdivision, index);
        if(!this.seqControlsPitch) note = note / this._baseUnit
        note = note+octave
        //console.log(note, velocity, sustain, time)
      // this.player.start(time + div * (Tone.Time(this.subdivision[num])), note, this.sustain[num]);
   //return
       try{
            this.triggerAttackRelease(note, velocity, sustain, time + div * Tone.Time(subdivision));
        } catch(e){
            console.log('invalid note', note , velocity, sustain)
        }
    }
}