const mic = new Tone.UserMedia()
let output = new Tone.Multiply(0.05).toDestination()
mic.connect(output)
//
//basic spectroscope setup
//note the argument to Spectroscope(argument) must be a valid html div
let spectrum = new Spectroscope()
spectrum.start()
//
mic.open().then(() => {
	// promise resolves when input is available
	console.log("mic open");
    mic.connect( spectrum.input )
}).catch(e => {
	// promise is rejected when the user doesn't have or allow mic access
	console.log("mic not open");
});

//alternatively, send a VCO to the spectroscope
let vco = new Tone.Oscillator(440).start()
//vco.connect( spectrum.input )
//change vco settings and see the output
vco.frequency.value = 220
vco.type = "square"

//oscilloscope options
spectrum.setFftSize( 1024*8 )
spectrum.maxFrequency = 2000
//spectrum.stop()