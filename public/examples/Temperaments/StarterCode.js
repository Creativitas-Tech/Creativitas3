Theory.tempo = 90
Theory.tonic = 'C'
//
let output = new Tone.Gain(.1).toDestination()
let s = new Polyphony(Twinkle)

s.connect(output)
s.initGui()

Theory.setTemperament( [1,1,9/8,9/8,5/4,4/3,4/3,3/2,3/2,5/3,5/3,15/8] )

Theory.setTemperament( expr(i=> pow(2,i/12), 12))

s.sequence('[0,2,4] . [0,2,4]. . .')
s.stop()

s.voice[0].triggerRawAttack(200)
s.voice[0].triggerRawRelease()