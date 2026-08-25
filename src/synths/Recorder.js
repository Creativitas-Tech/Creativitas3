import * as Tone from 'tone';
 

 export class Recorder {
  constructor() {
    this.mediaRecorder = null;
    this.mediaStream = null;
    this.chunks = [];
  }

  async initialize() {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true 
      });
      console.log("Microphone accessed");
      
      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      // Clear chunks when data arrives
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
          console.log("Data chunk received:", event.data.size);
        }
      };
      
      console.log("Recorder initialized");
    } catch (error) {
      console.error("Error initializing:", error);
      throw error;
    }
  }

  start() {
    if (!this.mediaRecorder) {
      throw new Error("Recorder not initialized");
    }
    this.chunks = [];
    this.mediaRecorder.start();
    console.log("Recording started");
  }

  async stop() {
    if (!this.mediaRecorder) {
      throw new Error("Recorder not initialized");
    }
    
    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = () => {
        console.log("Recording stopped, chunks:", this.chunks.length);
        
        if (this.chunks.length > 0) {
          const blob = new Blob(this.chunks, { type: 'audio/webm' });
          console.log("Blob created, size:", blob.size);
          
          if (blob.size > 0) {
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.download = "recording.webm";
            anchor.href = url;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
            console.log("File downloaded");
          }
        } else {
          console.error("No chunks recorded");
        }
        resolve();
      };
      
      this.mediaRecorder.stop();
    });
  }
}
// export class Recorder {
//   constructor () {
//     this.input = new Tone.Multiply(1)
//     this.recorder = new MediaRecorder(this.mediaStream, {
//         mimeType: 'audio/webm;codecs=opus'
//       });

//     this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
//         audio: true 
//       });
//       console.log("Microphone accessed");
      
//       // Clear chunks when data arrives
//       this.recorder.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           this.chunks.push(event.data);
//           console.log("Data chunk received:", event.data.size);
//         }
//       };
      
//       console.log("Recorder initialized");

//     this.input.connect(this.recorder);
//   }

//   async start() {
//   console.log('started');
//   if (!this.recorder) {
//     throw new Error("Recorder not initialized. Call initialize() first.");
//   }
  
//   try {
//     console.log("About to call recorder.start()");
//     console.log("Recorder state:", this.recorder.state);
//     console.log("Recorder:", this.recorder);
//     this.chunks = [];
//     this.recorder.start();

//     console.log("Recording started");
//   } catch (error) {
//     console.error("Error starting recorder:", error);
//     throw error;
//   }
// }

//  async stop() {
//     if (!this.recorder) {
//       throw new Error("Recorder not initialized");
//     }
    
//     return new Promise((resolve, reject) => {
//       this.recorder.onstop = () => {
//         console.log("Recording stopped, chunks:", this.chunks.length);
        
//         if (this.chunks.length > 0) {
//           const blob = new Blob(this.chunks, { type: 'audio/webm' });
//           console.log("Blob created, size:", blob.size);
          
//           if (blob.size > 0) {
//             const url = URL.createObjectURL(blob);
//             const anchor = document.createElement("a");
//             anchor.download = "recording.webm";
//             anchor.href = url;
//             document.body.appendChild(anchor);
//             anchor.click();
//             document.body.removeChild(anchor);
//             URL.revokeObjectURL(url);
//             console.log("File downloaded");
//           }
//         } else {
//           console.error("No chunks recorded");
//         }
//         resolve();
//       };
      
//       this.recorder.stop();
//     });
//   }
// }

//   