/*
 * Simple Sampler
 *
 * 
*/

import p5 from 'p5';
import * as Tone from 'tone';
// import SimplerPresets from './synthPresets/SimplerPresets.json';
import { MonophonicTemplate } from './MonophonicTemplate';

class ExtendedSampler extends Tone.Sampler{
    constructor(options){
        super(options)
        this.startTime = 0
        console.log('begin')
    }

    ftomf(freq) {
        return 69 + 12 * Math.log2(freq / 440);
    }
    triggerAttack(notes, time, velocity = 1) {
        this.log("triggerAttack", notes, time, velocity);

        if (!Array.isArray(notes)) {
            notes = [notes];
        }

        notes.forEach((note) => {
            const midiFloat = this.ftomf(
                new Tone.FrequencyClass(this.context, note).toFrequency()
            );
            const midi = Math.round(midiFloat);
            const remainder = midiFloat - midi;

            // find the closest note pitch
            const difference = this._findClosest(midi);
            const closestNote = midi - difference;

            const buffer = this._buffers.get(closestNote);
            const playbackRate = Tone.intervalToFrequencyRatio(difference + remainder);

            // play that note
            const source = new Tone.ToneBufferSource({
                url: buffer,
                context: this.context,
                curve: this.curve,
                fadeIn: this.attack,
                fadeOut: this.release,
                playbackRate,
            }).connect(this.output);

            // Updated this line:
            source.start(time, this.startTime, buffer.duration / playbackRate, velocity);

            // add it to the active sources
            if (!Array.isArray(this._activeSources.get(midi))) {
                this._activeSources.set(midi, []);
            }
            this._activeSources.get(midi).push(source);

            // remove it when it's done
            source.onended = () => {
                if (this._activeSources && this._activeSources.has(midi)) {
                    const sources = this._activeSources.get(midi);
                    const index = sources.indexOf(source);
                    if (index !== -1) {
                        sources.splice(index, 1);
                    }
                }
            };
        });

        return this;
    }   
}

export class Simpler extends MonophonicTemplate {
    constructor (file) {
        super()
        // this.gui = gui
		this.presets = {}
		this.synthPresetName = "SimplerPresets"
		this.accessPreset()
        this.name = "Simpler"
        
        //audio objects
        this.sampler = new ExtendedSampler()
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
        this.vcf.connect(this.vca)
        this.vca.connect(this.output)

        this.sample = ''

        let paramDefinitions = [
          {name:'volume',min:-36,max:0,curve:1,callback:x=>{this.sampler.volume.value = Math.pow(10,x/20)}},
          {name:'attack',min:0.01,max:1,curve:2,callback:x=>{this.sampler.attack=x}},
          {name:'release',min:.01,max:10,curve:2,callback:x=>{ this.sampler.release=x }},
          {name:'cutoff',min:100,max:10000,curve:2,callback:value=>this.cutoffSig.value = value},
          {name:'Q',min:0.0,max:20,curve:2,callback:value=>this.vcf.Q.value = value},
          {name:'filterEnvDepth',min:0.0,max:5000,curve:2,callback:value=>this.vcfEnvDepth.factor.value = value},
          ]

        let paramGui = [
          {name:'volume',x:10,y:10,color:'red'},
          {name:'attack',min:0.01,max:1,curve:2,callback:x=>{this.sampler.attack=x}},
          {name:'release',min:.01,max:10,curve:2,callback:x=>{ this.sampler.release=x }},
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
    load(file = 'piano'){this.loadSample(file)}
    loadSample(file = null){
        //clear all previously playing notes
        if(this.sampler) {
            this.sampler.dispose()
            this.sampler.releaseAll()
        }

        if(file === null){
            this.loadSampleToSampler()
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
          console.log(`Simpler loading ${file}`);
          this.sample = file
        } else {
          console.error(`The sample "${file}" is not available.`);
          return
        }

        this.baseUrl = "https://tonejs.github.io/audio/"
        const url = this.sampleFiles[this.sample][1]
        const note = this.sampleFiles[this.sample][0]
        console.log(note, url)
        this.sampler = new ExtendedSampler({
            urls:{
                [60]: this.baseUrl.concat(url)
            }
        }).connect(this.vcf)
    }

    listSamples(){
        const fileKeys = Object.keys(this.sampleFiles);
        console.log(fileKeys)
    }

    //envelopes
    triggerAttack (freq, amp=100, time=null){ 
        this.sampler.release = this.release
        freq = Tone.Midi(freq).toFrequency()
        amp = amp/127
        if(time){
            this.sampler.triggerAttack(freq, time, amp)
            this.filterEnv.triggerAttack(time)
            //this.vca.factor.setValueAtTime(amp, time)
        } else{
            this.sampler.triggerAttack(freq)
            this.filterEnv.triggerAttack()
            //this.vca.factor.value = amp
        }
    }

    triggerRelease (freq, time=null){
        freq = Tone.Midi(freq).toFrequency()
        if(time) {
            this.sampler.triggerRelease(freq, time)
            this.filterEnv.triggerRelease(time)
        }
        else {
            this.sampler.triggerRelease(freq)
            this.filterEnv.triggerRelease()
        }
    }

    triggerAttackRelease (freq, amp, dur=0.01, time=null){ 
        //console.log(freq, amp, dur)
        this.param.release = this.release 
        freq = Tone.Midi(freq).toFrequency()
        
        amp = amp/127
        //console.log(freq,amp,dur)
        if(time){
            this.sampler.triggerAttackRelease(freq, dur, time, amp)
            this.filterEnv.triggerAttackRelease(dur,time)
            //this.vca.factor.setValueAtTime(amp, time)
        } else{
            //this.sampler.triggerAttackRelease(freq, dur)
            //this.filterEnv.triggerAttackRelease(dur)
        }
    }//attackRelease


    //parameter setters
    setADSR(a,d,s,r){
        this.sampler.attack = a>0.001 ? a : 0.001
        //this.filterEnv.decay = d>0.01 ? d : 0.01
        //this.filterEnv.sustain = Math.abs(s)<1 ? s : 1
        this.sampler.release = r>0.01 ? r : 0.01
    }

    loadSampleToSampler(note = "C4") {
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
                this.sampler = new ExtendedSampler({
                    urls:{
                        [60]: fileReader.result
                    }
                }).connect(this.vcf)
                console.log("Audio loaded into sampler");
            };
            fileReader.readAsDataURL(file);
        };

        // Trigger the file dialog
        fileInput.click();
    }
}