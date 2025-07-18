const s = new Polyphony(Twinkle)
const output = new Tone.Multiply(.1).toDestination()
const verb = new Reverb()
s.connect(output)
s.connect(verb), verb.connect(output)
//
s.initGui()
verb.initGui()
s.octave = 1
s.sustain  = 1
let scope = new Oscilloscope()

s.release = 1
s.Q = 0
s.cutoff = 500
s.sustain = .6


setNoteOnHandler( (note, vel) =>{
  s.triggerAttack(note, vel)
  //console.log('v', note,vel)
})
//
setNoteOffHandler( (note, vel) =>{
  s.triggerRelease(note)
})