//21M.080 phase lab
const gui = new p5(sketch, Canvas)
let output = new Tone.Multiply(0.1).toDestination()

//we will start by exploring a sine wave
//try changing delay time to see interferences
const vco = new Tone.Oscillator()
vco.start()
vco.frequency.value = 100
vco.stop()

//now lets take a look at noise and comb filtering
const noise = new Tone.Noise()
noise.start()
noise.stop()

//finally, let's look at audio files
const player = new Tone.Player()
//load sample into player
let audioURL = "audio/120bpm_beat.mp3"
/* mp3 audio files included as part of this website: 
120bpm_beat, haugharp, kalimba, marimba, rhodes, ukulele, vocal
*/
//uncomment below to work with player
player.load( audioURL )
//player.start()
//player.stop()
player.loop = true
player.loopEnd = 2

//vca for a=level control
const vca = new Tone.Multiply()
noise.connect( vca ), vco.connect( vca ), player.connect( vca )
vca.connect( output )
////our delay for creating phase shifts
const delay = new Tone.FeedbackDelay({
  wet: 1, feedback: 0, time: .1
})
const delay_level = new Tone.Multiply(.1)
noise.connect( delay_level), vco.connect( delay_level ), player.connect( delay_level )
delay_level.connect( delay )
delay.connect( vca )
//
const scope = new Oscilloscope()
vca.connect( scope.input)
//
const spectrum = new Spectroscope()
vca.connect( spectrum.input)

/**** GUI ELEMENTS ****/
let vol_knob = gui.Knob({
  label: 'volume',
  mapto: 'vca.factor',
  max: .5, curve: 2
})
//
const sample_period = 1/Tone.context.sampleRate
console.log('sample rate is ', Tone.context.sampleRate)
console.log('sample period is ', sample_period)
let delay_time_coarse = 100
//
let dly_level_knob = gui.Knob({
  label: 'dly lvl',
  mapto: 'delay_level.factor',
  curve: 2
})
dly_level_knob.value = 1
//
let feedback_knob = gui.Knob({
  label: 'feedback',
  mapto: 'delay.feedback',
  max: 1, curve: .5
})
feedback_knob.value = 0

let dly_time_knob = gui.Knob({
  label: 'fineTime',
  callback: function(x){
    delay.delayTime.rampTo( x*sample_period*delay_time_coarse )
    console.log('dly time (ms): ', sample_period*x*delay_time_coarse*1000)
  },
  max: 250, min:1
})

let coarse_time_knob = gui.Knob({
  label: 'coarseTime',
  callback: function(x){delay_time_coarse =  x },
  max: 1/(sample_period*250)-1, 
  min:1
})
coarse_time_knob.value = 0