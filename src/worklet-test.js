import * as Tone from 'tone';

class SimpleAudioWorklet {
  constructor() {
    this.processor = null;
    this.ready = this.init();
  }

  async init() {
    const audioContext = Tone.context.rawContext;
    
    try {
      // Load the worklet
      await audioContext.audioWorklet.addModule('/audio-worklet.js');
      
      // Create the worklet node
      this.processor = new AudioWorkletNode(audioContext, 'audio-processor');
      
      // Connect to destination
      this.processor.connect(audioContext.destination);
      
      console.log("AudioWorklet initialized!");
    } catch (e) {
      console.error("AudioWorklet init error:", e);
    }
  }

  async start() {
    await this.ready;
  }

  async stop() {
    if (this.processor) {
      this.processor.disconnect();
    }
  }
}

export default SimpleAudioWorklet;