let vco = new Tone.Oscillator(440).start()
let output = new Tone.Multiply(0.05).toDestination()
vco.connect( output )

//basic oscilloscope setup
//note the argument to Oscilloscope(argument) must be a valid html div
let scope = new Oscilloscope()
vco.connect( scope.input )
scope.start()

//change vco settings and see the output
vco.frequency.value = 220
vco.type = "square"

//oscilloscope options
scope.setFftSize( 1024*2 )
scope.threshold = .5
scope.stop()