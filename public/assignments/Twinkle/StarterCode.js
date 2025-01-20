let s = new Twinkle()
let output = new Tone.Multiply(.1).toDestination()
s.connect( output )
let gui = new p5(sketch, Canvas)
s.initGui(gui)

s.sequence('0... 0... 1 2 3 4 5 6 7 8', '8n',1)
s.sustain = .05
s.velocity = 100
s.octave = -1

//s.stop()

let scope = new Oscilloscope('Canvas')
s.connect(scope)
//s.env.connect(scope.input)
//scope.setFftSize(1024*32)

let spectrum = new Spectrogram('Canvas',400)
spectrum.maxFrequency = 5000
s.connect(spectrum)

s.listPresets()
s.loadPreset('default')