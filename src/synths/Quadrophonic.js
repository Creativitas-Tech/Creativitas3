import * as Tone from 'tone';

export class Quadrophonic {
    constructor(numChannels = 4) {
        this.context = window.audioContext;
        this.numChannels = numChannels;


        // Create the ChannelMergerNode with the specified number of channels
        this.channelMerger = this.context.createChannelMerger(this.numChannels);

        // Configure the audio context destination for multi-channel output
        let maxChannelCount = window.audioContext.destination.maxChannelCount;
        window.audioContext.destination.channelCount = maxChannelCount;
        window.audioContext.destination.channelCountMode = "explicit";
        window.audioContext.destination.channelInterpretation = "discrete";
        
        // Create and connect a channel merger
        this.channelMerger = window.audioContext.createChannelMerger(maxChannelCount);
        this.channelMerger.channelCount = 1;
        this.channelMerger.channelCountMode = "explicit";
        this.channelMerger.channelInterpretation = "discrete";
        this.channelMerger.connect(window.audioContext.destination);

        this.input = []
        for(let i=0;i<this.numChannels;i++){
            this.input.push(new Tone.Multiply(1))
            this.input[i].connect(this.channelMerger,0,0)
        }
    }

    // Connect a source node to a specific channel on the ChannelMerger
    connectSource(source, inputChannel = 0, outputChannel = 0) {
        source.connect(this.channelMerger, inputChannel, outputChannel);
    }

    // Disconnect a source from a specific channel on the ChannelMerger
    disconnectSource(source, inputChannel = 0) {
        source.disconnect(this.channelMerger, 0, inputChannel);
    }

    // Get the underlying ChannelMerger node for further routing
    getNode() {
        return this.channelMerger;
    }

    // Dispose of the ChannelMerger and disconnect any sources
    dispose() {
        this.channelMerger.disconnect();
        console.log("ChannelMerger disposed.");
    }
}