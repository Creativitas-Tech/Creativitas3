//21M.080 phase lab pt 2
const gui = new p5(sketch, Canvas)
let output = new Tone.Multiply(0.1).toDestination()

let audioURL = "audio/120bpm_beat.mp3"
/* mp3 audio files included as part of this website: 
120bpm_beat, haugharp, kalimba, marimba, rhodes, ukulele, vocal
*/
const player = new Tone.Player({
  url: audioURL,
  onload: () => {
    console.log("Audio file loaded");
    player.start("+1m");
  },
  autostart: false, // Don't start immediately upon loading
})
//player.load( audioURL, ()=>(player.start("+1m")))
player.loop = true
player.loopEnd = 5

//vca for level control
const vca = new Tone.Multiply()
player.connect( vca )
vca.connect( output )
////our delay for creating phase shifts
const delay = new Tone.FeedbackDelay({
  wet: 1, feedback: 0, time: .1
})
const delay_level = new Tone.Multiply(.1)
player.connect( delay_level )
delay_level.connect( delay )
delay.connect( vca )
//

//an LFO to control our delay time
const lfo = new Tone.Oscillator(1).start()
lfo.type = 'triangle'
const lfo_depth = new Tone.Multiply()
lfo.connect( lfo_depth )
lfo_depth.connect( delay.delayTime)

/**** GUI ELEMENTS ****/
let vol_knob = gui.Knob({
  label: 'volume',
  mapto: 'vca.factor',
  max: .5, curve: 2, y: 25
})
//
const sample_period = 1/Tone.context.sampleRate
console.log('sample rate is ', Tone.context.sampleRate)
console.log('sample period is ', sample_period)
let delay_time_coarse = 1
//
let dly_level_knob = gui.Knob({
  label: 'dly lvl',
  mapto: 'delay_level.factor',
  curve: 2, y: 25
})
dly_level_knob.value = 1

//
let feedback_knob = gui.Knob({
  label: 'feedback',
  mapto: 'delay.feedback',
  max: 1, curve: .5, y: 25
})
feedback_knob.value = 0

let dly_time_knob = gui.Knob({
  label: 'fineTime',
  callback: function(x){
    delay.delayTime.rampTo( x*sample_period*delay_time_coarse )
    console.log('dly time (ms): ', sample_period*x*delay_time_coarse*1000)
  },
  max: 250, min:1, y: 25
})

let coarse_time_knob = gui.Knob({
  label: 'coarseTime',
  callback: function(x){delay_time_coarse =  x },
  max: 1/(sample_period*250)-1, 
  min:1, y: 25
})
coarse_time_knob.value = 0

let lfo_rate_knob = gui.Knob({
  label: 'lfo rate',
  mapto: 'lfo.frequency',
  max: 9, min:0.1, curve: 2,
  x:20, y: 70
})

let lfo_depth_knob = gui.Knob({
  label: 'lfo depth',
  mapto: 'lfo_depth.factor',
  max: .01, curve: 2,
  x:40, y: 70
})