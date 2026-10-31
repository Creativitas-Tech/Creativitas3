import RecorderFactory from './recorder.mjs';
import * as Tone from 'tone';

export class Recorder2 {
  constructor() {
    this.instance = null;
    this.output = new Tone.Multiply(0.5);
    this.processor = null;
    this.ready = this.init();
  }

  // async init() {
  //   this.instance = await RecorderFactory();
  //   this.setupAudioProcessor();
  // }

async setupAudioProcessor() {
  const audioContext = Tone.context.rawContext;
  const bufferSize = 4096;
  
  try {
    // Try modern AudioWorkletNode approach
    await audioContext.audioWorklet.addModule(this.getWorkletCode());
    
    this.processor = new AudioWorkletNode(audioContext, 'recorder-processor');
    
    // Pass the instance to the worklet
    this.processor.port.onmessage = (event) => {
      if (event.data === 'ready') {
        this.processor.port.postMessage({
          type: 'init',
          instance: this.instance
        });
      }
    };
    
    this.processor.connect(audioContext.destination);
    
  } catch (e) {
    console.error("AudioWorklet not available:", e);
    // Fallback: just create a silent node
    this.processor = audioContext.createGain();
    this.processor.connect(audioContext.destination);
  }
}

getWorkletCode() {
  const code = `
    registerProcessor('recorder-processor', class extends AudioWorkletProcessor {
      process(inputs, outputs, parameters) {
        const output = outputs[0][0];
        for (let i = 0; i < output.length; i++) {
          output[i] = window.recorderInstance._tick() * 0.1;
        }
        return true;
      }
    });
  `;
  return new Blob([code], { type: 'application/javascript' });
}

async init() {
  this.instance = await RecorderFactory();
  window.recorderInstance = this.instance; // Make available to worklet
  await this.setupAudioProcessor();
}

/*
  setupAudioProcessor() {
    const audioContext = Tone.context.rawContext;
    const bufferSize = 4096;
   
       this.processor = audioContext.createGain();
      // this.processor = audioContext.createScriptProcessor(bufferSize, 0, 1);
      
      this.processor.onaudioprocess = (event) => {
        const output = event.outputBuffer.getChannelData(0);
        console.log("onaudioprocess called!"); // Add this
        for (let i = 0; i < bufferSize; i++) {
          output[i] = this.instance._tick() * 0.1;
        }
      };
      
      // Connect directly to Web Audio destination, then to Tone output
      const nativeGain = audioContext.createGain();
      this.processor.connect(nativeGain);
      Tone.connect(this.processor, Tone.context.destination);

      console.log("connected", this.processor, Tone.context.destination)
      // this.nativeGain.connect(Tone.context.destination);

      // const gain = new Tone.Multiply()


      // this.processor.connect(nativeGain);
      // Tone.connect(nativeGain, this.output);

      // console.log(nativeGain, this.output)
      // nativeGain.connect(this.output.input);
      // console.log(this.processor, this.output._nativeAudioNode)
      // this.processor.connect(this.output._nativeAudioNode);

  }
  */

  async initRecorder() {
    await this.ready;
    return this.instance._init_recorder();
  }

  async setFrequency(freq) {
    await this.ready;
    return this.instance._set_frequency(freq);
  }

  async startBlowing(amp, rate) {
    await this.ready;
    return this.instance._start_blowing(amp, rate);
  }

  async stopBlowing(rate) {
    await this.ready;
    return this.instance._stop_blowing(rate);
  }

  tick() {
    return this.instance._tick();
  }
}

