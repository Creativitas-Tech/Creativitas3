registerProcessor('audio-processor', class extends AudioWorkletProcessor {
  constructor() {
    super();
    this.counter = 0;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0][0];
    
    // Generate a simple test tone
    for (let i = 0; i < output.length; i++) {
      this.counter += 0.01;
      output[i] = Math.sin(this.counter) * 0.1;
    }
    
    return true;
  }
});