let s = new Twinkle()
let output = new Tone.Multiply(.1).toDestination()
s.connect( output )

s.initGui()
s.listPresets()
s.loadPreset('flute')

s.sequence('0... 0... 1 2 3 4 5 6 7 8', '8n')
s.sustain = .01
s.velocity = 100

let scope = new Oscilloscope()
s.connect(scope)

let envScope = new Oscilloscope()
s.env.connect(envScope.input)
envScope.setFftSize(1024*32)
envScope.threshold = .01

let spectrum = new Spectrogram(1)
spectrum.maxFrequency = 5000
s.connect(spectrum)
spectrum.analyserNode.smoothingTimeConstant = 0.0;