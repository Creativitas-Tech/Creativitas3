let vco = new Tone.Oscillator().start()
let output = new Tone.Multiply(0.05).toDestination()
vco.connect( output )
vco.frequency.value = 100

vco.stop()