/****************************************

SPECTROSCOPE

****************************************/
import * as Tone from 'tone';

/**
 * Represents a Spectroscope that visualizes the frequency spectrum of audio signals.
 * 
 * @param {string} _target - The ID of the HTML element where the spectroscope will be displayed.
 * 
 * @class
 */
export const Spectroscope = function( ratio = 1, _target= 'Canvas') {
    //var _drawWave, _bufferLength, _dataArray;

    //this.target = document.querySelector(target);
    this.target = document.getElementById(_target)

    // Set the dimensions based on the target container
    this.width = this.target.offsetWidth;
    this.height = this.target.offsetWidth*ratio * 4/10;

    // Create the oscilloscope wave element
    this.wave = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    this.wave.setAttribute('class', 'oscilloscope__wave');

    // Create the oscilloscope svg element
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute('width', this.width);
    this.svg.setAttribute('height', this.height);
    this.svg.setAttribute('class', 'oscilloscope__svg');
    this.svg.appendChild(this.wave);

    // Append the svg element to the target container
    this.target.appendChild(this.svg);

    // Add the audio context or create a new one
    this.audioContext = window.audioContext;

    // Indicates if the oscilloscope is running
    this.running = false;

    // Is the oscilloscope analyser-node connected to the audio-context' destination
    this.hasAudio = false;

     // Create the oscilloscope analyser-node
    // Create the oscilloscope analyser-node
    this.input= new Tone.Multiply()
    this.gain = new Tone.Signal(0.1)
    this.analyserNode = this.audioContext.createAnalyser();
    this.input.connect( this.analyserNode )
    this.gain.connect( this.input.factor )

    this.analyserNode.fftSize = 4096; // Default fftSize
    this.bufferLength = this.analyserNode.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    this.yScaling = 1;
    this.maxFrequency = 24000;
    this.minFrequency = 0;
    this.xScaling = 2;
    this.binWidth = 24000 / this.analyserNode.frequencyBinCount;

    // Set-up the analyser-node which we're going to use to get the oscillation wave
    /**
     * Set the FFT size for the analyser node.
     * 
     * @memberof Spectroscope
     * @param {number} val - The FFT size to set. Must be a power of two.
     */
    this.setFftSize = function(val){
        if (Math.log2(val) % 1 !== 0) {
            val = Math.pow(2, Math.floor(Math.log2(val)))
            console.log("FFT size must be a power of two.")
        }
        console.log("Setting FFT size to ", val)
        
        this.analyserNode.fftSize = val;
        this.bufferLength = this.analyserNode.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        this.binWidth = 24000 / this.bufferLength;
    }.bind(this);

    /*
     * Draw the oscillation wave
     */
    this.drawWave = function() {
        var path = 'M';

        this.analyserNode.getByteFrequencyData(this.dataArray);

        let x = this.width;
        let y = this.height / 2;

        const maxValue = Math.max(...this.dataArray);
        const minValue = Math.min(...this.dataArray);

        ////scale y axis. . . not implemented
        // if(this.yScaling > 1) this.yScaling *= 0.99;
        // if(maxValue > this.yScaling) this.yScaling = maxValue;
        // if(Math.abs(minValue) > this.yScaling) this.yScaling = Math.abs(minValue);

        x = 0
        y = this.height;

        path += `${x} ${y}, `;
        for (var i = 0 ; i < this.bufferLength; i++) {

            let freqDivider = 24000 / (this.maxFrequency-this.minFrequency)
            let freqOffset = this.minFrequency / this.binWidth

            //To do: get minFrequency working
            //console.log(this.binWidth, freqOffset, freqDivider)

            let val = (255-this.dataArray[i+freqOffset]) * (1/this.yScaling);
            x = (((this.width + (this.width / this.bufferLength)) / this.bufferLength) * (i));
            x = x * freqDivider;
            y = ((this.height / 2) * (val / 128.0));


            // Check if the x-coordinate is beyond the width of the scope
            if (x > this.width) break; // Exit the loop if x exceeds width

            path += `${x} ${y}, `;
        }

        x += 1
        y = this.height;

        path += `${x} ${y}, `;

        this.wave.setAttribute('d', path);
        this.wave.setAttribute('stroke', 'black');
        //this.wave.setAttribute('stroke-width', '2');
        //this.wave.setAttribute('fill', 'none');

        if (this.running) {
            //console.log(this.dataArray)
            window.requestAnimationFrame(this.drawWave);
        }
    }.bind(this);


    /**
     * Start the Spectroscope
     * @memberof Spectroscope
     */
    this.start = function() {
        this.running = true;

        window.requestAnimationFrame(this.drawWave);
    }.bind(this);

    /**
     * Stop the Spectroscope
     * @memberof Spectroscope
     */
    this.stop = function(){
        this.running = false;
    }.bind(this)

    this.disconnect = function(){
        this.target.removeChild(this.svg);
    }.bind(this)

    this.connect = function(_target){
        this.target = document.getElementById(_target)
        this.target.appendChild(this.svg);
    }

    this.start();

    this.destroy = function() {
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

            console.log("Spectroscope destroyed.");
        }, 100)
        
    }.bind(this);
};