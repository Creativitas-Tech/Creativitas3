window.audioContext = Tone.context.rawContext;
        // evaluate(`
        //     // Enable multichannel output
        //     //var AudioContext = window.AudioContext || window.webkitAudioContext;
        //     window.audioContext = Tone.context.rawContext;
        //     //Tone.setContext(window.audioContext); // Set Tone.js to use this AudioContext
            
        //     // Configure the audio context destination for multi-channel output
        //     let maxChannelCount = window.audioContext.destination.maxChannelCount;
        //     window.audioContext.destination.channelCount = maxChannelCount;
        //     window.audioContext.destination.channelCountMode = "explicit";
        //     window.audioContext.destination.channelInterpretation = "discrete";
            
        //     // Create and connect a channel merger
        //     window.channelMerger = window.audioContext.createChannelMerger(maxChannelCount);
        //     channelMerger.channelCount = 1;
        //     channelMerger.channelCountMode = "explicit";
        //     channelMerger.channelInterpretation = "discrete";
        //     channelMerger.connect(window.audioContext.destination);
        // `);