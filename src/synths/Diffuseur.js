/*
Diffuseur

convolution reverb
* input->eq3->convolver->output

methods:
- load(url) loads an IR
- filterIR: applies a lowpass to the IR, destructive
- highpassIR: applies a highpass to the IR, destructive
- stretchIR: stretches the IR
- ampIR: amplifies the IR into a softclipper
- setEQ(low,mid,hi) in dB
- setEQBand(low,hi)

properties:
- gain.factor.value
*/

import p5 from 'p5';
import * as Tone from 'tone';

export class Diffuseur {
  constructor(gui = null) {
    this.gui = gui;
    this.input = new Tone.Multiply(1);
    this.eq = new Tone.EQ3
    this.convolver = new Tone.Convolver();
    this.output = new Tone.Multiply(1);
    // Buffer
    this.buffer = null;
    // Audio connections
    this.input.connect(this.eq);
    this.eq.connect( this.convolver);
    this.convolver.connect(this.output);

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
                console.log("Audio loaded into diffuseur");
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
        console.log(`Diffuseur loading ${url}`);
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

  //NOTE: changing amp and waveshaping never worked as expected
  // async ampIR(gainVal) {
  //   if (!this.buffer) {
  //     console.error('Buffer not loaded.');
  //     return;
  //   }
    
  //   const context = Tone.getContext().rawContext;
  //   const duration = this.buffer.duration;
  //   const offlineContext = new OfflineAudioContext(2, duration * context.sampleRate, context.sampleRate);
    
  //   // Use the buffer directly from Tone.Buffer
  //   const decodedData = this.buffer.get();

  //   const source = offlineContext.createBufferSource();
  //   source.buffer = decodedData; // Use the buffer directly.
    
  //   // Create a Multiply node
  //   const gain = offlineContext.createGain();
  //   gain.gain.value = gainVal
  //   console.log(gainVal, gain.gain.value)

  //   // Correct setup for WaveShaper node
  //   const waveShaper = offlineContext.createWaveShaper();
  //   waveShaper.curve = this.generateWaveShaperCurve(256); // Example length, adjust as needed
  //   waveShaper.oversample = '4x'; // Optional: Apply oversampling to reduce aliasing


  //   // Connect the nodes
  //   source.connect(gain);
  //   source.connect(waveShaper);
  //   waveShaper.connect(offlineContext.destination);
    
  //   source.start(0);
    
  //   return new Promise((resolve, reject) => {
  //     offlineContext.startRendering().then((renderedBuffer) => {
  //       // Use the rendered buffer as a new Tone.Buffer
  //       const newBuffer = new Tone.Buffer(renderedBuffer);
  //       this.buffer = newBuffer
  //       this.convolver.buffer = newBuffer; // Load it into the convolver
  //       resolve();
  //     }).catch(reject);
  //   });
  // }//amp

  // generateWaveShaperCurve(length = 256) {
  //   const curve = new Float32Array(length);
  //   for (let i = 0; i < length; i++) {
  //     let x = (i * 2) / length - 1; //convert to -1,1
  //     //curve[i] = Math.tanh(x*128); // Adjust this function as needed
  //     curve[i] = x>0 ? 1 : -0; 
  //     //curve[i] = x
  //   }
  //   console.log(curve)
  //   return curve;
  // }

  setEQ(low,mid,hi){
    this.eq.high.value = hi
    this.eq.mid.value = mid
    this.eq.low.value = low
  }
  setEQBand(low,hi){
    if(low < 10 || hi < 10){
      console.log('EQ bands are in Hz')
      return;
    }
    this.eq.highFrequency.value = hi
    this.eq.lowFrequency.value = low
  }

  listSamples(){
        const fileKeys = Object.keys(this.sampleFiles);
        console.log(fileKeys)
    }


  /**
   * Connect the output to a destination.
   * @param {Tone.Signal | AudioNode} destination - The destination to connect to.
   */
  connect(destination) {
    if (destination.input) {
      this.output.connect(destination.input);
    } else {
      this.output.connect(destination);
    }
  }

  /**
   * Disconnect the output from a destination.
   * @param {Tone.Signal | AudioNode} destination - The destination to disconnect from.
   */
  disconnect(destination) {
    if (destination.input) {
      this.output.disconnect(destination.input);
    } else {
      this.output.disconnect(destination);
    }
  }
}
