let s = new Polyphony(Daisy) //polyphonic Daisy so we can play chords
let output = new Tone.Multiply(.1).toDestination()
s.connect( output )

s.initGui(s)
s.listPresets()
s.loadPreset('default')

s.sequence('0', '2n')
s.seq[0].sustain = .5

s.sequence('0 4 6 2 -3', '2n')
s.sustain = .5
s.octave = 0

s.sequence('[0,2,6] [1,3,4] [1,4,0] [ 3,4,-1]', '1n')
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
