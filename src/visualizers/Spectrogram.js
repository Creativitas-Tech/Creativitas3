/****************************************

SPECTROGRAM

****************************************/
import * as Tone from 'tone';

/**
 * Represents a Spectrogram that visualizes the frequency spectrum of audio signals.
 * 
 * @param {string} _target - The ID of the HTML element where the spectroscope will be displayed.
 * 
 * @class
 */

export const Spectrogram = function( ratio = 1, _target= 'Canvas') {
    this.target = document.getElementById(_target);

    // Canvas setup
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.width = this.target.offsetWidth;
    this.height = ratio * 100;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.target.appendChild(this.canvas);
    this.context.fillStyle = "lightgrey";
    this.context.fillRect(0, 0, this.width, this.height);

    // Audio context and analyser node
    this.audioContext = window.audioContext || new (window.AudioContext || window.webkitAudioContext)();
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.smoothingTimeConstant = 0.0;
    this.input= new Tone.Multiply()
    this._gain = new Tone.Signal(0.1)
    this.input.connect( this.analyserNode )
    this._gain.connect( this.input.factor )
    this.analyserNode.fftSize = 4096; // Default FFT size
    this.bufferLength = this.analyserNode.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);

    // Spectrogram settings
    this._maxFrequency = 24000; // Default max frequency
    this._minFrequency = 0;     // Default min frequency
    this._timeResolution = 2;  // Number of pixels per time frame
    this.currentX = 0;        // Current horizontal position
    this.running = false;

    // Color mapping (amplitude to color)
    const getColor = (amplitude) => {
        // let intensity = [
        // amplitude * 3,
        // (amplitude-20) * 2 ,
        // (amplitude-40) * 1 ,
        // ]; // Normalize amplitude
        let intensity = [
        //Math.sin((amplitude/255) * Math.PI * 2.5)*255,
        Math.sin((amplitude/255-.25) * Math.PI * 3)*255,
        amplitude<128?0 : Math.sin(((amplitude-128)/255) * Math.PI * 1)*255,
        Math.sin((amplitude/255) * Math.PI * 2.5)*255,
        ]; // Normalize amplitude
        intensity = intensity.map(x=> Math.min(255, Math.max(0, x)))
        return `rgb(${intensity[0]}, ${intensity[1]}, ${intensity[2]})`;
    };

    Object.defineProperty(this, 'gain', {
        get: () => this._gain.value,
        set: (value) => {
            this._gain.value = value;
        },
    });

    // Frequency range setters and getters
    Object.defineProperty(this, 'minFrequency', {
        get: () => this._minFrequency,
        set: (value) => {
            this._minFrequency = Math.max(0, Math.min(value, this.maxFrequency));
        },
    });

    Object.defineProperty(this, 'maxFrequency', {
        get: () => this._maxFrequency,
        set: (value) => {
            this._maxFrequency = Math.max(this.minFrequency, Math.min(value, this.audioContext.sampleRate / 2));
        },
    });

    // Time resolution setter and getter
    Object.defineProperty(this, 'timeResolution', {
        get: () => this._timeResolution,
        set: (value) => {
            this._timeResolution =  value;
        },
    });

    // Time resolution setter and getter
    Object.defineProperty(this, 'fftSize', {
        get: () => this._timeResolution,
        set: (val) => {
            if (Math.log2(val) % 1 !== 0) {
                val = Math.pow(2, Math.floor(Math.log2(val)))
                console.log("FFT size must be a power of two.")
            }
            console.log("Setting FFT size to ", val)
            
            this.analyserNode.fftSize = val;
            this.bufferLength = this.analyserNode.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
        },
    });

    this.drawSpectrogram = function () {
    // Get frequency data
    this.analyserNode.getByteFrequencyData(this.dataArray);

    // Clear the current frame column
    this.context.clearRect(this.currentX, 0, this._timeResolution, this.height);

    const freqRange = this._maxFrequency - this._minFrequency;
    const binWidth = (this.audioContext.sampleRate / 2) / this.bufferLength;
    const startBin = Math.floor(this._minFrequency / binWidth);
    const endBin = Math.ceil(this._maxFrequency / binWidth);

    // Calculate vertical scaling
    const binHeight = this.height / (endBin - startBin);

    for (let i = startBin; i <= endBin; i++) {
        const freq = i * binWidth;

        // Map frequency to vertical position
        const y = this.height - Math.floor((freq - this._minFrequency) * (this.height / freqRange));

        // Get amplitude and map to color
        //const amplitude = Math.min(255, Math.max(0, this.dataArray[i]));
        const amplitude = this.dataArray[i];
        const color = getColor(amplitude);
        //if(i<10) console.log(this.dataArray[i],amplitude, color)

        this.context.fillStyle = color;

        // Adjust height based on binHeight
        if (binHeight >= 1) {
            // Scale bin to cover multiple vertical pixels
            this.context.fillRect(this.currentX, y - binHeight, this._timeResolution, Math.ceil(binHeight));
        } else {
            // Draw as a single pixel
            this.context.fillRect(this.currentX, y, this._timeResolution, 1);
        }
    }

        // Move to the next frame position
        this.currentX += this._timeResolution;
        if (this.currentX >= this.width) {
            this.currentX = 0;
        }

        // Continue animation if running
        if (this.running) {
            requestAnimationFrame(this.drawSpectrogram);
        }
    }.bind(this);

    this.start = function () {
        this.running = true;
        requestAnimationFrame(this.drawSpectrogram);
    }.bind(this);

    this.stop = function () {
        this.running = false;
    }.bind(this);

    this.destroy = function () {
        this.stop();
        this.target.removeChild(this.canvas);
        this.analyserNode.disconnect();
        this.audioContext.close();
    }.bind(this);

    // Start the spectrogram by default
    this.start();
};