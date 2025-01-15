/*
ToneWood

convolution engine
* input->gain->convolver->waveShaper->output

methods:
- load(url) loads an IR
- filterIR: applies a lowpass to the IR, destructive
- highpassIR: applies a highpass to the IR, destructive
- stretchIR: stretches the IR
- ampIR: amplifies the IR into a softclipper

properties:
- gain.factor.value
*/

import p5 from 'p5';
import * as Tone from 'tone';

export class ToneWood {
  constructor(gui = null) {
    this.gui = gui;
    this.input = new Tone.Multiply(1);
    this.gain = new Tone.Multiply(1)
    this.waveShaper = new Tone.WaveShaper((x)=>{
      return Math.tanh(x)
    })
    this.convolver = new Tone.Convolver();
    this.output = new Tone.Multiply(1);
    // Buffer
    this.buffer = null;
    // Audio connections
    this.input.connect(this.gain);
    this.gain.connect( this.convolver);
    this.waveShaper.connect( this.output);
    this.convolver.connect(this.waveShaper);
    this.convolver.normalize = true
  }

  load(url) {
    return new Promise((resolve, reject) => {
      new Tone.Buffer(url, (buffer) => {
        this.buffer = buffer;
        this.convolver.buffer = buffer
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

  connect(destination) {
    this.output.connect(destination);
  }
}
