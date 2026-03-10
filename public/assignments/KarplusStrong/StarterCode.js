//define impulse parameters
let impulse = new Tone.Noise().start()
let impulse_filter = new Tone.Filter()
let impulse_vca = new Tone.Multiply()
let impulse_env = new Tone.Envelope()
//karplus-strong delay line
let delay = new Tone.LowpassCombFilter()
let feedback = new Tone.Multiply()
//resonator and output
let dry_gain = new Tone.Multiply()
let resonator_gain = new Tone.Multiply()
let resonator = new Tone.Convolver('./audio/dreadnought_guitar.mp3')
//
let output = new Tone.Multiply(.1).toDestination()
//
impulse.connect( impulse_filter), impulse_filter.connect( impulse_vca)
impulse_env.connect( impulse_vca.factor)
impulse_vca.connect( delay)
delay.connect( resonator_gain), resonator_gain.connect( resonator)
delay.connect( dry_gain), dry_gain.connect( output)
resonator.connect( output)

// resonator.load('./audio/taylor_guitar.mp3')
// resonator.load('./audio/custom_guitar.mp3')
// resonator.load('./audio/marshall_amp.mp3')
// resonator.load('./audio/ampeg_amp.mp3')
// resonator.load('./audio/dreadnought_guitar.mp3')
// resonator.load('./audio/spring_reverb.mp3')
// resonator.load('./audio/plate_reverb.mp3')

let gui = new p5(sketch, Canvas)
//
let impulse_tone_knob = gui.Knob({
  label: 'impulse tone',
  mapto: impulse_filter.frequency,
  min:100, max:5000, curve: 2
})
let impulse_decay_knob = gui.Knob({
  label: 'impulse shape',
  callback: function(x){
    impulse_env.attack = x < .5 ? 0.001 : (x-.49)/2
    impulse_env.sustain = x < .5 ? 0 : (x - 0.5) * 2
    impulse_env.decay = x
    impulse_env.release = x
  },
  min:0.01, max:2, curve: 2
})
let feedback_knob = gui.Knob({
  label: 'feedback',
  mapto: delay.resonance,
  min:0.9, max:0.99999, curve: .75
})

let damping_knob = gui.Knob({
  label: 'damping',
  callback: function(x){delay.dampening = x},
  min:10, max:10000, curve: 2
})

let dry_gain_knob = gui.Knob({
  label: 'dry gain',
  mapto: dry_gain.factor,
  min:0, max:1, curve: 2
})
let resonator_gain_knob = gui.Knob({
  label: 'resonator gain',
  mapto: resonator_gain.factor,
  min:0, max:2, curve: 2
})

let scope = new Oscilloscope()
delay.connect( scope.input)

setNoteOnHandler( (note,vel)=>{
  note = Tone.Midi(note).toFrequency()
  impulse_env.triggerAttack()
  delay.delayTime.value = 1/note
})
//
setNoteOffHandler( (note,vel)=>{
  impulse_env.triggerRelease()
})
