/** Oscilloscope class
 * * uses svg drawing on a canvas
 * 
 * Based on: https://github.com/Sambego/oscilloscope.js
 */
/****************************************



OSCILLOSCOPE


****************************************/
import * as Tone from 'tone';

/**
 * Represents an Oscilloscope that visualizes audio waveforms.
 * 
 * @param {string} _target - The ID of the HTML element where the oscilloscope will be displayed.
 * 
 * @class
 */
export const Oscilloscope = function( ratio = 1, _target= 'Canvas') {
    // Get the target DOM element and set dimensions based on the provided ratio
    this.target = document.getElementById(_target);
    this.width = this.target.offsetWidth;
    this.height = this.width * ratio * 4/10;

    // Create the SVG path for the oscilloscope wave
    this.wave = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    this.wave.setAttribute('class', 'oscilloscope__wave');

    // Create the SVG element to contain the wave
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute('width', this.width);
    this.svg.setAttribute('height', this.height);
    this.svg.setAttribute('class', 'oscilloscope__svg');
    this.svg.appendChild(this.wave);

    // Append the SVG to the target container
    this.target.appendChild(this.svg);

    // Use Tone.js's audio context or create a new one
    //this.audioContext = Tone.context;
    this.audioContext = window.audioContext;
    
    // State variables
    this.running = true; // Indicates if oscilloscope is running
    this.hasAudio = false; // If the oscilloscope is connected to the audio context destination

    // Set up the input and gain for the oscilloscope
    this.input = new Tone.Multiply();
    this.gain = new Tone.Signal(1);
    this.analyserNode = this.audioContext.createAnalyser(); // Create an analyser node for audio data
    this.input.connect(this.analyserNode); // Connect input to analyser
    this.gain.connect(this.input.factor); // Connect gain to input

    // Configuration for the analyser node
    this.analyserNode.fftSize = 2048;
    this.bufferLength = this.analyserNode.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);

    // Display settings
    this.yScaling = 1; // Scaling factor for Y axis
    this.xScaling = 2; // Scaling factor for X axis
    this.zoom = 1.25; // Zoom level
    this.enableTrigger = 1; // Trigger for zero-crossing detection
    this.threshold = 128; // Threshold for signal triggering

    /**
     * Automatically start the oscilloscope when the constructor is called.
     */
    this.constructor = function() {
        this.start();
        console.log('Oscilloscope started');
    };

    /**
     * Set the FFT size for the analyser node.
     * Ensures the value is a power of two, as required by the Web Audio API.
     * @memberof Oscilloscope
     * @param {number} val - The FFT size to set.
     */
    this.setFftSize = function(val) {
        if (Math.log2(val) % 1 !== 0) {
            val = Math.pow(2, Math.floor(Math.log2(val))); // Adjust to nearest power of two
            console.log("FFT size must be a power of two.");
        }
        console.log("Setting FFT size to", val);
        this.analyserNode.fftSize = val;
        this.bufferLength = this.analyserNode.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
    }.bind(this);

    /**
     * Draw the waveform data in the oscilloscope SVG.
     * @memberof Oscilloscope
     */
    this.drawWave = function() {
        var path = 'M';
        this.analyserNode.getByteTimeDomainData(this.dataArray); // Get waveform data

        // Find the first point that crosses the threshold for triggering
        var firstOverThreshold = 0;
        let threshold = this.threshold <= 1 ? this.threshold * 128 + 127 : this.threshold;

        for (var i = 1; i < this.bufferLength; i++) {
            if (this.dataArray[i] > threshold && this.dataArray[i - 1] <= threshold) {
                firstOverThreshold = i;
                break;
            }
        }
        if (this.enableTrigger === 0) firstOverThreshold = 0;

        // Start drawing the path
        let x = 0;
        let y = this.height / 2;
        path += `${x} ${y}, `;

        // Scaling the X axis based on zoom level
        this.xScaling = this.zoom < 0.1 ? 0.2 : this.zoom * 2;

        // Draw the waveform as a series of points
        for (var i = 0; i < this.bufferLength - firstOverThreshold; i++) {
            let val = (255 - this.dataArray[i + firstOverThreshold]) * (1 / this.yScaling);
            x = (this.width / this.bufferLength) * i * this.xScaling;
            y = (this.height / 2) * (val / 128.0);

            // Stop drawing if the X value exceeds the scope's width
            if (x > this.width - 10) break;

            path += `${x} ${y}, `;
        }

        // Update the SVG path with the new waveform
        this.wave.setAttribute('d', path);
        this.wave.setAttribute('stroke', 'black');
        this.wave.setAttribute('stroke-width', '2');
        this.wave.setAttribute('fill', 'none');

        // Continue drawing if running
        if (this.running) {
            window.requestAnimationFrame(this.drawWave);
        }
    }.bind(this);

    /**
     * Start the oscilloscope animation.
     * @memberof Oscilloscope
     */
    this.start = function() {
        this.running = true;
        window.requestAnimationFrame(this.drawWave);
    }.bind(this);

    /**
     * Stop the oscilloscope animation.
     * @memberof Oscilloscope
     */
    this.stop = function() {
        this.running = false;
    }.bind(this);

    /**
     * Disconnect the oscilloscope from its target.
     * @memberof Oscilloscope
     */
    this.disconnect = function() {
        this.target.removeChild(this.svg);
    }.bind(this);

    /**
     * Reconnect the oscilloscope to a target.
     * @memberof Oscilloscope
     * @param {string} _target - The ID of the new target DOM element.
     */
    this.connect = function(_target) {
        this.target = document.getElementById(_target);
        this.target.appendChild(this.svg);
    }.bind(this);

    /**
     * Clean up and delete the oscilloscope object.
     * Stops the animation, removes DOM elements, and nullifies references.
     * @memberof Oscilloscope
     */
    this.destroy = function() {
        // Stop the oscilloscope animation if running
        this.stop();

        setTimeout(()=>{
            // Remove the SVG element from the DOM
            if (this.target.contains(this.svg)) {
                this.target.removeChild(this.svg);
            }

            // Disconnect the analyser node and nullify object references to free memory
            this.analyserNode.disconnect();
            this.input.disconnect();
            this.gain.dispose();

            // Nullify all references to help with garbage collection
            this.target = null;
            this.wave = null;
            this.svg = null;
            this.audioContext = null;
            this.input = null;
            this.gain = null;
            this.analyserNode = null;
            this.dataArray = null;

            console.log("Oscilloscope destroyed.");
        }, 100)
        
    }.bind(this);

    // Automatically start the oscilloscope upon creation
    this.start();
};








