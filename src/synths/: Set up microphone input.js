import * as Tone from 'tone';
 
export class Recorder2 {
  constructor () {
    const input = new Tone.Multiply(1)
    const recorder = new Tone.Recorder();
    input.connect(recorder);
  }

  start(){
    await recorder.start();
  }

  stop(){
    const recording = await recorder.stop();

    // IMPORTANT: Ensure recording is a Blob before using createObjectURL
    if (recording instanceof Blob) {
      const url = URL.createObjectURL(recording);
      const anchor = document.createElement("a");
      anchor.download = "recording.wav";
      anchor.href = url;
      anchor.click();
      
      // Clean up the URL object to prevent memory leaks
      URL.revokeObjectURL(url);
    } else {
      console.error("Recording is not a Blob:", recording);
    }
  }
}

  