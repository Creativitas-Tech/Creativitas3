/*
 * Simple Sampler
 *
 * 
*/

import * as Tone from 'tone';
// import SimplerPresets from './synthPresets/SimplerPresets.json';
import { MonophonicTemplate } from './MonophonicTemplate.js';
import {Parameter} from './ParameterModule.js'
import layout from './layouts/EffectLayout.json';
import paramDefinitions from './params/simplerParams.js';

class ExtendedSampler extends Tone.Sampler{
    constructor(options){
        super(options)
        this._startTime = 0
        console.log('begin')
    }

    ftomf(freq) {
        return 69 + 12 * Math.log2(freq / 440);
    }
    triggerAttack(notes, time, velocity = 1) {
        //console.log("es.triggerAttack", notes, time, velocity);

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
            source.start(time, this._startTime, buffer.duration / playbackRate, velocity);

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
		//this.accessPreset()
        this.name = "Simpler"
        this.layout = layout;
        this.guiHeight = .3
        this.backgroundColor = [0,0,50]

        this.pitchOffset = 0
        
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

        // Bind parameters with this instance
        this.paramDefinitions = paramDefinitions(this)
        ///console.log(this.paramDefinitions)
        this.param = this.generateParameters(this.paramDefinitions)
        this.createAccessors(this, this.param);

        //for autocomplete
        this.autocompleteList = this.paramDefinitions.map(def => def.name);;
        //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
        setTimeout(()=>{this.loadPreset('default')}, 500);

        this.sampleFiles = {
          bell: [-4, 'berklee/bell_1.mp3'],
          bell1:   [-1, 'berklee/bell_1a.mp3'],
          bell2:   [-1, 'berklee/bell_2a.mp3'],
          bell3:   [-1, 'berklee/bell_mallet_2.mp3'],
          horn:[2, 'berklee/casiohorn2.mp3'],
          chotone:  [0, 'berklee/chotone_c4_!.mp3'],
          voice: [0.8, 'berklee/femalevoice_aa_Db4.mp3'],
          kalimba: [-1, 'berklee/Kalimba_1.mp3'],
          dreamyPiano: [-3, 'salamander/A5.mp3'],
          softPiano: [-3, 'salamander/A4.mp3'],
          piano: [-3, 'salamander/A3.mp3'],
          casio:[0, 'casio/C2.mp3']
        }

        //for autocomplete
        this.autocompleteList = this.paramDefinitions.map(def => def.name);
        //this.autocompleteList = this.autocompleteList + Object.keys(this.sampleFiles)
        //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
        setTimeout(()=>{this.loadPreset('default')}, 500);

        //console.log(this.autocompleteList)
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

        this.baseUrl = ""
        let url, note
        if (file in this.sampleFiles) {
          console.log(`Simpler loading ${file}`);
          this.sample = file
          this.baseUrl = "https://tonejs.github.io/audio/"
          url = this.sampleFiles[this.sample][1]
          note = this.sampleFiles[this.sample][0]
        } else {
            url = file + '.mp3'
            note = 0
            this.baseUrl = "./audio/"; // Relative to your script's location
        }



        //console.log(note, url)
        this.pitchOffset = note
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
        // console.log(freq, amp, time)
        try{
            this.param.release = this.release
            freq = freq - this.pitchOffset
            freq = Tone.Midi(freq).toFrequency()
            amp = amp/127
            if(time){
                this.sampler.triggerAttack(freq, time, amp)
                this.filterEnv.triggerAttack(time)
                //this.vca.factor.setValueAtTime(amp, time)
            } else{
            
                this.sampler.triggerAttack(freq, Tone.now(), amp)
                //console.log('s.a',freq, amp, time)
                this.filterEnv.triggerAttack()
                //this.vca.factor.value = amp
            }
        }catch(e){}
    }

    triggerRelease (freq, time=null){
        try{
            freq = freq - this.pitchOffset
            freq = Tone.Midi(freq).toFrequency()
            if(time) {
                this.sampler.triggerRelease(freq, time)
                this.filterEnv.triggerRelease(time)
            }
            else {
                //console.log('s.r',freq, time)
                this.sampler.triggerRelease(freq)
                this.filterEnv.triggerRelease()
            }
        }catch(e){}
    }

    triggerAttackRelease (freq, amp, dur=0.01, time=null){
        try{ 
            //console.log('AR', freq, amp, dur, time)
            this.param.release = this.release
            freq = freq - this.pitchOffset 
            freq = Tone.Midi(freq).toFrequency()
            
            amp = amp/127
            //console.log(freq,amp,dur)
            if(time){
                this.sampler.triggerAttackRelease(freq, dur, time, amp)
                this.filterEnv.triggerAttackRelease(dur,time)
                this.vca.factor.setValueAtTime(amp, time)
            } else{
                this.sampler.triggerAttackRelease(freq, dur, Tone.now(), amp)
                this.filterEnv.triggerAttackRelease(dur)
                this.vca.factor.setValueAtTime(amp)
            }
        }catch(e){}
    }//attackRelease

    releaseAll(time = null){
        //console.log('releaseAll')
        if(time) {
            this.sampler.releaseAll(time)
        } else {
            this.sampler.releaseAll();
        }
    }


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