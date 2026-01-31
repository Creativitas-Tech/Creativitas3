/*
 * Simple Sampler
 *
 * 
*/
import * as Tone from 'tone';
//import SimplerPresets from './synthPresets/SimplerPresets.json';
import { MonophonicTemplate } from './MonophonicTemplate.js';
import {Theory, parsePitchStringSequence, parsePitchStringBeat,getChord, pitchNameToMidi, intervalToMidi} from '../TheoryModule'
import { Seq } from '../Seq'

// import PlayerPresets from './synthPresets/PlayerPresets.json';
import {Parameter} from './ParameterModule.js'
import layout from './layouts/allKnobsLayout.json';
import paramDefinitions from './params/playerParams.js';
import Groove from '../Groove.js'

class CustomPlayer extends Tone.Player {
    constructor(options) {
    super(options);
    this._activeSource = null; // store one source at a time
  }
    set playbackRate(rate) {
        this._playbackRate = rate;
        let now = this.now();
        //if(time) now = time
        this._activeSources.forEach((source) => {
            source.playbackRate.setValueAtTime(rate, now);
        });
    }
}


export class Player extends MonophonicTemplate {
    constructor (file) {
        super()
         this.layout = layout
		this.presets = {}
		this.synthPresetName = "PlayerPresets"
		// this.accessPreset()
        this.name = "Player"
        this.guiHeight = .25
        
        //audio objects
        this.player = new CustomPlayer()
        this.hpf = new Tone.Filter({type:'highpass', Q:0, frequency:10, rolloff:-12})
        this.vcf = new Tone.Filter({type:'lowpass', Q:0,rolloff:-12})
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
        this.player.connect(this.hpf)
        this.hpf.connect(this.vcf)
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
        this._stopID = 0

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

            // Bind parameters with this instance
        this.paramDefinitions = paramDefinitions(this)

        this.param = this.generateParameters(this.paramDefinitions)
        this.createAccessors(this, this.param);

        //for autocomplete
        this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    
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

        this.baseUrl = "https://tonejs.github.io/audio/"
        let url = []
        let note = []
        if (file in this.sampleFiles) {
          console.log(`Player loading ${file}`);
          this.sample = file
           url = this.sampleFiles[this.sample][1]
           note = this.sampleFiles[this.sample][0]
        } else {
            url = file
            note = 0
            this.baseUrl = "./audio/"; // Relative to your script's location
        }
        
        //console.log(note, this.baseUrl.concat(url))
        this.player.load(this.baseUrl.concat(url))
        .then(() => {
            const duration = this.player.buffer.length / Tone.context.sampleRate;
            console.log(`Sample duration: ${duration.toFixed(2)} seconds`);
        })
        .catch((err) => {
            console.error("Failed to load sample:", err);
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
        //amp = amp/127
        //console.log(time, freq, dur)
        if(time){
            if(!this.seqControlsPitch) {
                //console.log('noy', freq,dur)
                if(this._playbackRate!= this.player.playbackRate) this.player.playbackRate = this._playbackRate
                //this.player.start(time,freq,dur)
                //console.log(freq, dur)
                this.player.start(time, freq, dur)
                //this.player.stop(time+dur)
            }
            else {
                //console.log('pitch',dur.toFixed(2), this._start,time)
                this.player.playbackRate = this.midiToRate(freq)
                this.player.start(time, this._start, dur)
                //this.player.stop(time+dur)
            }
            this.filterEnv.triggerAttackRelease(dur,time)
            this.vca.factor.setValueAtTime(amp, time)
         } 
        else{
            time = Tone.now()
            if(!this.seqControlsPitch) {
                //console.log('noy', freq,dur)
                if(this._playbackRate!= this.player.playbackRate) this.player.playbackRate = this._playbackRate
                this.player.start(time, this._start, this._end)
            }
            else {
                //console.log('pitch',dur.toFixed(2), this._start,time)
                this.player.playbackRate = this.midiToRate(freq)
                this.player.start(time, this._start)
                this.player.stop(time+dur)
            }
            this.filterEnv.triggerAttackRelease(dur,time)
            this.vca.factor.setValueAtTime(amp, time)
        }
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
                this.player = new CustomPlayer(fileReader.result).connect(this.hpf);
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

    scaleTempo(numBeats = 4) {
        const barLength = (numBeats / 4) * Tone.Time('1n').toSeconds();
        this.playbackRate = this.sampleDuration / barLength;
        console.log(barLength, this.sampleDuration, this._playbackRate)
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
        //console.log('parse', val,val[0]*this.sampleDuration,time,num)
        
        //uses val for time location rather than pitch
        if(val[0] === ".") {
            if(this.player.state === 'started') this.player.stop(time)
            return
        }

        const usesPitchNames = /^[a-ac-zA-Z]$/.test(val[0][0]);

        let note = ''
        if(!this.seqControlsPitch){
            if( usesPitchNames ) {
                console.log('player seq values are time positions in the sample')//note =  pitchNameToMidi(val[0])
                return
            } 
            //note = val[0]*this._baseUnit + this._start//intervalToMidi(val[0], this.min, this.max)
            note = val[0]
            if(note%1 == 0) note = note / Math.floor(this._baseUnit)
            else note = note%1
            note = note*this.sampleDuration
        } else{
            if( usesPitchNames ) note =  pitchNameToMidi(val[0])
            else note = intervalToMidi(val[0], this.min, this.max)
        }
        if(note < 0) return

        let octave = this.getSeqParam(this.seq[num].octave, index);
        let velocity = this.getSeqParam(this.seq[num].velocity, index);
        let duration = this.getSeqParam(this.seq[num].duration, index);
        let subdivision = this.getSeqParam(this.seq[num].subdivision, index);
        let lag = this.getSeqParam(this.seq[num].lag, index);
        note = note+octave
        duration = duration * Tone.Time(subdivision)
        //console.log(note, velocity, duration, time)

        let groove = Groove.get(subdivision,index)
        //console.log(groove)
        const timeOffset = val[1] * (Tone.Time(subdivision)) + lag + groove.timing
        velocity = velocity * groove.velocity
        if( Math.abs(velocity)>2) velocity = 2
        try {
            //console.log('trig', time, val[1], Tone.Time(this.subdivision))
            this.triggerAttackRelease(
                note,
                velocity,
                duration,
                time + timeOffset
            );
        } catch(e){
            console.log('invalid note', note , velocity, duration)
        }
    }
}