//musical settings
Theory.root = 'A'
Theory.progression = 'I'
let tempo = 95
Tone.Transport.bpm.value = tempo

//audio objects and connections
const s = new Polyphony(Daisy, 16)
const output = new Tone.Multiply(.1).toDestination()
const verb = new Reverb()
s.connect(output)
s.connect(verb), verb.connect(output)

//wait a sec
s.initGui(s)
verb.initGui()

//parameters
s.loadPreset('chime')
s.output.factor.value = .9
verb.load('hall')
//verb.stretchIR(2)

//sequences
s.sequence('0 2 4 3 5 4 6 [-2 -1]')
//s.sequence('0 ? 4 ? 5 ? 6 [-2 ?]')

//1
s.sequence('2 4 7 9 7 ? . . . ', '8n', 1)
s.seq[1].octave = 1
s.seq[1].sustain = .02
s.seq[1].velocity = 80 //0-127

//2
s.sequence('0.. -1.. -2.. -3.. .... .@16', '8n', 2)
s.seq[2].octave = -2
s.seq[2].sustain = .5
s.seq[2].velocity = 127 //0-127

//visuals
const scope = new Oscilloscope()
s.connect(scope.input)