let s = new Polyphony(Twinkle)
s.initGui()
let output = new Tone.Multiply(.1).toDestination()
s.connect(output)

s.sequence('-1 3 5 [.-1]', '4n', 0)
s.sequence(expr(i=> i*2%5 -i*i/64 + 9, 32), '8n', 1)
s.sequence('-6 . .. ..[-3 .] .', '16n', 2)
//
let pr = new PianoRoll()
s.seq[0].pianoRoll = pr
s.seq[1].pianoRoll = pr
s.seq[2].pianoRoll = pr
//
pr.setConfig({
  height: 1, 
  numBeats:9, 
  backgroundColor:'#002'
})
s.seq[0].color = '#f0f'
s.seq[1].color = 'grey'
s.seq[2].color = 'red'
//
s.sustain = [.1, .05,.05]
s.velocity = [100,80,60,127,70,80,90]

s.seq[0].velocity = [60,80,127]
s.seq[1].velocity = 127
s.seq[1].sustain = [0.01,.1,.05]
s.seq[2].velocity = 60