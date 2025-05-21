/*
Reverb.js

        Input Signal
             │
             ▼
      Highpass Filter 
             │                     
             ▼                     
       Convolution Reverb   ◀──────┐
             │                     │
             ▼                     │
      Lowpass Filter               │
             │                     │
             ▼                     │
           Delay                   │
             │                     │
             ▼                     │
               ───Feedback Gain ───┘
             │
             ▼
           Output
  */


import * as Tone from 'tone';
import { EffectTemplate } from './EffectTemplate';
import { Parameter } from './ParameterModule.js';
import ReverbPresets from './synthPresets/ReverbPresets.json';
import layout from './layouts/EffectLayout.json';
import {paramDefinitions} from './params/reverbParams.js';

export class Reverb extends EffectTemplate {

    constructor(gui = null) {
    super();
    this.gui = gui;
    this.presets = ReverbPresets;
    this.name = "Reverb";
    this.layout = layout;
    this.backgroundColor = [0,0,50]
    this.curDelayTime = .1

    this.widthValue = 0.01

    this.types = {
      "spring": {
        ir: 'spring',
        hicut: 200,
        lfoRate: 3,
        lfoDepth: 0.0025,
        feedbackScale: 0.4
      },
      "hall": {
        ir: 'hall',
        hicut: 100,
        lfoRate: 0.1,
        lfoDepth: 0.005,
        feedbackScale: 0.3
      },
      "plate": {
        ir: 'plate',
        hicut: 200,
        lfoRate: 0.5,
        lfoDepth: 0.01,
        feedbackScale: 0.2
      },
      "room": {
        ir: 'hall',
        hicut: 7000,
        lfoRate: .1,
        lfoDepth: 0.008,
        feedbackScale: 0.3
      },
      "space": {
        ir: 'plate',
        hicut: 5000,
        lfoRate: 0.5,
        lfoDepth: 0.02,
        feedbackScale: 0.2
      }
    };

    this.sampleFiles = {
          plate: './audio/plate_reverb.mp3',
          spring: './audio/spring_reverb.mp3',
          hall:   './audio/hall_reverb.mp3',
          ampeg: './audio/ampeg_amp.mp3',
          marshall: './audio/marshall_amp.mp3',
          vox:   './audio/voxAC30_amp.mp3',
          dreadnought: './audio/dreadnought_guitar.mp3',
          taylor: './audio/taylor_guitar.mp3',
          guitar:   './audio/custom_guitar.mp3',
          bell3:  'berklee/bell_mallet_2.mp3',
          horn: 'berklee/casiohorn2.mp3',
          chotone:  'berklee/chotone_c4_!.mp3',
          voice:  'berklee/femalevoice_aa_Db4.mp3',
          kalimba:  'berklee/Kalimba_1.mp3',
          dreamyPiano:  'salamander/A5.mp3',
          softPiano:  'salamander/A4.mp3',
          piano:  'salamander/A3.mp3',
          casio: 'casio/C2.mp3'
        }

    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);

    this.highpass = new Tone.Filter({type:'highpass', rolloff:-24,Q:0,frequency:100})
    this.convolver = new Tone.Convolver();
    this.dampingFilter = new Tone.Filter({frequency:1000, type:'lowpass', rolloff:-12});
    this.delayL = new Tone.Delay({delayTime:0.001, maxDelay:1})
    this.delayR = new Tone.Delay({delayTime:0.001, maxDelay:1})
    this.merge = new Tone.Merge()

    this.feedbackGain = new Tone.Gain(0);
    this.feedbackScale = new Tone.Gain(0.25)
    this.feedbackShaper = new Tone.WaveShaper(x => x - (1/3) * Math.pow(x, 3), 1024);
    this.lfo = new Tone.LFO({type:'sine'}).start()
    
    // Buffer
    this.buffer = null;
    // Audio connections
    this.input.connect(this.highpass);
    this.highpass.connect( this.convolver);
    this.convolver.connect(this.dampingFilter);
    this.dampingFilter.connect(this.delayL);
    this.dampingFilter.connect(this.delayR)
    this.delayL.connect(this.merge,0,0);
    this.delayR.connect(this.merge,0,1);
    this.merge.connect(this.output)

    this.delayL.connect(this.feedbackGain);
    this.delayR.connect(this.feedbackGain);
    this.feedbackGain.connect(this.feedbackScale);
    this.feedbackScale.connect(this.feedbackShaper);
    this.feedbackShaper.connect(this.convolver);

    this.lfo.connect(this.delayL.delayTime)
    this.lfo.connect(this.delayR.delayTime)

        // Parameter definitions
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    this.createAccessors(this, this.param);
    this.autocompleteList = this.paramDefinitions.map(def => def.name);
    this.presetList = Object.keys(this.presets)
    setTimeout(() => {
      this.loadPreset('default');
    }, 500);

  }

  load(url = null) {
    if(url === null){
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
                this.buffer = new Tone.Buffer(fileReader.result)
                this.convolver.buffer = this.buffer
                console.log("Audio loaded into reverb");
                return
            };
            fileReader.readAsDataURL(file);
            
        };

        // Trigger the file dialog
        fileInput.click();
    }

    // If the `url` is a number, treat it as an index into the `sampleFiles` object
    if (typeof url === 'number') {
        // Convert the keys of the `sampleFiles` object to an array
        const fileKeys = Object.keys(this.sampleFiles);
        url = Math.floor(url) % fileKeys.length; // Calculate a valid index
        url = fileKeys[url]; // Reassign `url` to the corresponding filename
    }

    // Check if the `url` exists in `sampleFiles`
    if (url in this.sampleFiles) {
        console.log(`Reverb loading ${url}`);
        this.sample = url; // Store the selected sample
    } else {
        console.error(`The sample "${url}" is not available.`);
        return;
    }

    // Load the buffer and assign it to `this.buffer` and `this.convolver.buffer`
    return new Promise((resolve, reject) => {
        new Tone.Buffer(this.sampleFiles[url], (buffer) => {
            this.buffer = buffer;
            this.convolver.buffer = buffer;
            resolve();
        }, reject);
    });
}

  async filterIR(filterFreq) {
    if (!this.buffer) {
      console.error('Buffer not loaded.');
      return;
    }
    
    const context = Tone.getContext().rawContext;
    const duration = this.buffer.duration;
    const offlineContext = new OfflineAudioContext(2, duration * context.sampleRate, context.sampleRate);
    
    // Use the buffer directly from Tone.Buffer
    const decodedData = this.buffer.get();

    const source = offlineContext.createBufferSource();
    source.buffer = decodedData; // Use the buffer directly.
    
    // Example transformation: apply a filter (this could be more complex, including stretching)
    const filter = offlineContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    
    source.connect(filter);
    filter.connect(offlineContext.destination);
    
    source.start(0);
    
    return new Promise((resolve, reject) => {
      offlineContext.startRendering().then((renderedBuffer) => {
        // Use the rendered buffer as a new Tone.Buffer
        const newBuffer = new Tone.Buffer(renderedBuffer);
        this.buffer = newBuffer
        this.convolver.buffer = newBuffer; // Load it into the convolver
        resolve();
      }).catch(reject);
    });
  }//filter

  async stretchIR(stretchAmt) {
    if (!this.buffer) {
      console.error('Buffer not loaded.');
      return;
    }
    
    const context = Tone.getContext().rawContext;
    const duration = this.buffer.duration;
    const offlineContext = new OfflineAudioContext(2, duration * stretchAmt * context.sampleRate, context.sampleRate);
    
    // Use the buffer directly from Tone.Buffer
    const decodedData = this.buffer.get();

    const source = offlineContext.createBufferSource();
    source.buffer = decodedData; // Use the buffer directly.

    // Apply time-stretching by adjusting the playback rate
    source.playbackRate.value = 1/stretchAmt; // Adjust the playback rate based on the stretchVal
    source.connect(offlineContext.destination);
    source.start(0);
    
    return new Promise((resolve, reject) => {
      offlineContext.startRendering().then((renderedBuffer) => {
        // Use the rendered buffer as a new Tone.Buffer
        const newBuffer = new Tone.Buffer(renderedBuffer);
        this.buffer = newBuffer
        this.convolver.buffer = newBuffer; // Load it into the convolver
        resolve();
      }).catch(reject);
    });
  }//stretch

  async highpassIR(filterFreq) {
    if (!this.buffer) {
      console.error('Buffer not loaded.');
      return;
    }
    
    const context = Tone.getContext().rawContext;
    const duration = this.buffer.duration;
    const offlineContext = new OfflineAudioContext(2, duration * context.sampleRate, context.sampleRate);
    
    // Use the buffer directly from Tone.Buffer
    const decodedData = this.buffer.get();

    const source = offlineContext.createBufferSource();
    source.buffer = decodedData; // Use the buffer directly.
    
    // Example transformation: apply a filter (this could be more complex, including stretching)
    const filter = offlineContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = filterFreq;
    
    source.connect(filter);
    filter.connect(offlineContext.destination);
    
    source.start(0);
    
    return new Promise((resolve, reject) => {
      offlineContext.startRendering().then((renderedBuffer) => {
        // Use the rendered buffer as a new Tone.Buffer
        const newBuffer = new Tone.Buffer(renderedBuffer);
        this.buffer = newBuffer
        this.convolver.buffer = newBuffer; // Load it into the convolver
        resolve();
      }).catch(reject);
    });
  }//highpass

  listSamples(){
        const fileKeys = Object.keys(this.sampleFiles);
        console.log(fileKeys)
    }

  setType = function(typeName) {
    console.log('type', typeName)
    const typeDef = this.types[typeName];
    if (!typeDef) return;

    // Set feedback path routing (if implemented)
    if (typeDef.feedbackScale) {
      this.feedbackScale.gain.rampTo(parseFloat(typeDef.feedbackScale))
    }

    // Set highpass (hicut) filter
    if (typeDef.hicut) {
      this.locut =parseFloat(typeDef.hicut);
    }

    // 
    if (typeDef.ir) {
      this.load(typeDef.ir)
    }

    // Set smoothing when changing delay times
    if (typeDef.lfoRate) {
      this.lfoRate = typeDef.lfoRate
    }
    // Set smoothing when changing delay times
    if (typeDef.lfoDepth) {
      this.lfoDepth = typeDef.lfoDepth
    }

    // Optional: store current type
    this.currentType = typeName;
  };

}