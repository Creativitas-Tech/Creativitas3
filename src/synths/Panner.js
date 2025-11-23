import * as Tone from 'tone';
//import SimplerPresets from './synthPresets/SimplerPresets.json';
import { MonophonicTemplate } from './MonophonicTemplate.js';
import {Parameter} from './ParameterModule.js'
import basicLayout from './layouts/basicLayout.json';
import paramDefinitions from './params/pannerParams.js';

export class QuadPanner extends MonophonicTemplate{
    constructor() {
        super()
        this.context = window.audioContext;
        this.name = 'panner'

        // Create the ChannelMergerNode with the specified number of channels
        this.channelMerger = this.context.createChannelMerger(4);

        // Configure the audio context destination for multi-channel output
        let maxChannelCount = window.audioContext.destination.maxChannelCount;
        window.audioContext.destination.channelCount = maxChannelCount;
        window.audioContext.destination.channelCountMode = "explicit";
        window.audioContext.destination.channelInterpretation = "discrete";
        
        // Create and connect a channel merger
        //this.channelMerger.channelCount = 1;
        this.channelMerger.channelCountMode = "explicit";
        this.channelMerger.channelInterpretation = "discrete";
        this.channelMerger.connect(window.audioContext.destination);
   
        this.input = new Tone.Multiply(1)

        this.channel = []
        for(let i=0;i<4;i++){
            this.channel.push(new Tone.Multiply(.5))
            this.input.connect(this.channel[i])
            this.channel[i].connect(this.channelMerger, 0,i);
        }
        // Make the channelMerger available for external connections
        this._x = 0
        this._y = 0
        this.output = this.channelMerger;

        // Bind parameters with this instance
        this.paramDefinitions = paramDefinitions(this)
        this.param = this.generateParameters(this.paramDefinitions)
        this.createAccessors(this, this.param);

        //for autocomplete
        this.autocompleteList = this.paramDefinitions.map(def => def.name);;
        
    }

    // Set x-axis (left-right) panning using the LR panner
    x(value=.5) {
        this._x = value
        this.pan(this._x,this._y)
    }

    // Set y-axis (front-back) panning using the FB panner
    y(value=.5) {
        this._y = value
        this.pan(this._x,this._y)
    }

    pan(x = 0.5, y = 0.5, time=null) {
        x = Math.max(-1, Math.min(1, x));
        y = Math.max(-1, Math.min(1, y));
        let curve = 0.7;
        let base_amp = -70;

        // Calculate gain values
        const gainFL = Math.pow((1 - x) * (1 - y), curve); // Front-Left
        const gainFR = Math.pow((1 + x) * (1 - y), curve); // Front-Right
        const gainBL = Math.pow((1 - x) * (1 + y), curve); // Back-Left
        const gainBR = Math.pow((1 + x) * (1 + y), curve); // Back-Right

        // Smooth transition over 10 ms
        const rampTime = 0.01; // 10 ms in seconds
        if(time==null){
            this.channel[0].factor.rampTo(gainFL, rampTime);
            this.channel[1].factor.rampTo(gainFR, rampTime);
            this.channel[2].factor.rampTo(gainBR, rampTime);
            this.channel[3].factor.rampTo(gainBL, rampTime);
        } else{
            this.channel[0].factor.setValueAtTime(gainFL, time);
            this.channel[1].factor.setValueAtTime(gainFR, time);
            this.channel[2].factor.setValueAtTime(gainBR, time);
            this.channel[3].factor.setValueAtTime(gainBL, time);
        }

        // Optionally log values for debugging
        // console.log(x, y, gainFL, gainFR, gainBL, gainBR);
    }

    setAngle(angle, depth = 1, time = null) {
        // Convert angle from degrees to radians
        const radians = (angle * Math.PI) / 180;

        // Calculate x and y positions based on the angle and depth
        const x = Math.cos(radians) * depth;
        const y = Math.sin(radians) * depth;

        // Set x and y positions
        this._x = x;
        this._y = y;

        // Call the pan function with the calculated positions
        this.pan(this._x, this._y, time);
    }

    // Dispose of all nodes
    dispose() {
        this.lrPanner.dispose();
        this.fbPanner.dispose();
        this.splitter.disconnect();
        this.channelMerger.disconnect();
        console.log("SimpleQuadPanner disposed.");
    }

}