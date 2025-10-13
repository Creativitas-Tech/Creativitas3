/*
TIP: Toggle the keyboard icon at the top to use your laptop keyboard as MIDI input
- Z row = white keys
- Row above Z = black keys
- Left/Right arrows = change octaves
*/

let vco = new Tone.Oscillator().start()
let vca = new Tone.Multiply()
let output = new Tone.Multiply(0.02).toDestination()
vco.connect(vca), vco.type = "square"

let env = new Tone.Envelope()
vca.connect(output), env.connect(vca.factor)

// Handle MIDI note on (key pressed)
setNoteOnHandler((note, vel) => {
  vco.frequency.value = Tone.Midi(note).toFrequency()
  env.triggerAttack()
})

// Handle MIDI note off (key released)
setNoteOffHandler((note, vel) => {
  env.triggerRelease()
})
