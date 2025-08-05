Theory.tempo = 100
//
let s = new Twinkle()
let dist = new Distortion()
let ch = new Chorus()
let delay = new Delay()
let verb = new Reverb()
let output = new Tone.Gain(0.1).toDestination()
// connect s->dist->chorus
s.connect(dist)
dist.connect(ch)
//connect chorus to verb, delay, and output
ch.connect(delay)
delay.connect(output)
ch.connect(verb)
verb.connect(output)
ch.connect(output)
//
s.initGui()
dist.initGui()
ch.initGui()
delay.initGui()
verb.initGui()

dist.type = 'tube'
verb.type = 'plate'
delay.type = 'tube'
delay.time = 45/Theory.tempo
verb.level = .2

s.sequence('0..7 .3.3 0..7 .4 0 1', '8n')
s.seq[0].octave = -1
s.sustain = .1
s.decay = .2
s.sustainTime = 0
s.release = .8
s.cutoff = 1000
s.Q = 5