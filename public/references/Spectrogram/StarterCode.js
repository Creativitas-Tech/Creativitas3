const mic = new Tone.UserMedia()
let output = new Tone.Multiply(0.05).toDestination()
mic.connect(output)
//
//basic spectroscope setup
//note the argument to Spectroscope(argument) must be a valid html div
let gram = new Spectrogram(4)
gram.start()
//
mic.open().then(() => {
	// promise resolves when input is available
	console.log("mic open");
    mic.connect( gram.input )
}).catch(e => {
	// promise is rejected when the user doesn't have or allow mic access
	console.log("mic not open");
});

gram.maxFrequency = 20000 //in hertz
gram.minFrequency = 100
gram.timeResolution = 1 //1 = default