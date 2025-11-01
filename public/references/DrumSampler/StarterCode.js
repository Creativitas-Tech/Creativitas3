//musical settings
Theory.tempo = 95

//audio objects and connections
const gui = new p5(sketch, Canvas)
const d = new DrumSampler()
const output = new Tone.Multiply(.1).toDestination()
d.connect(output)

d.initGui(gui)
d.loadPreset('breakbeat')
d.listPresets()

//basic drums sequencing
d.sequence('O*.o X.*x .xO* X*^.', '16n')

//basic parameters
d.kickDecay = .1
d.kickRate = 2
d.kickDecay = .1
d.kick_gain.factor.value = .1
d.snare.reverse = 0

//hihat decay times
d.sequence('***^***^')
d.closedDecay = .1
d.openDecay = .5

//percussion voices
d.sequence('1232')
d.p1Decay = .1
d.p2Decay = .1
d.p3Decay = .1
d.p1Rate = 2
d.p2Rate = 2
d.p3Rate = 2

//you can load samplesets independent of presets
console.log(d.drumFolders)
d.loadSamples("breakbeat13")

//conpressor and distortion
console.log(d.distortion.get())
d.threshold = -20
d.ratio = 1
d.dist = 0
d.output.factor.value = 1

//dry kick if you need it
//no distortion or compression
d.dryKick = 1