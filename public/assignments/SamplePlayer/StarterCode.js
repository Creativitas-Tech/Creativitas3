const p = new Player()
const p2 = new Player()
const verb = new Diffuseur()
const delay = new AnalogDelay(5) //max 5 sec delay
const output = new Tone.Multiply(.1).toDestination()
const feedback = new Feedback()
p.connect(verb),p.connect(delay)
p.connect(feedback), 
  p.connect(output)
p2.connect(verb),p2.connect(delay)
p2.connect(feedback), p2.connect(output)
verb.connect(feedback),verb.connect(output)
delay.connect(verb), delay.connect(feedback), delay.connect(output)
feedback.connect(delay)

//delay settings
delay.gain = .0
delay.delayRatio = .75 //left/right delay time
delay.time = .5
delay.feedback = .0
delay.damping = 3000 //lowpass filter
console.log(delay.get())

//verb settings
verb.listSamples() //prints available files
verb.load()//number, filename, url, or leave blank to upload your own
verb.input.factor.value = 0
//verb.stretchIR(2)

//feedback settings
feedback.inputGain = .0
feedback.outputGain = 1
feedback.time = .5

//sampler settings
p.listSamples()
p.load() //filename, number, url, or leave blank to upload your own
//p.trigger(0,40,10) //startPoint, velocity, length

//p.callback = i=> p.playbackRate = floor(i/64)%8/8+.5
//p.callback = i=>{}

p.sequence([0,1,2,3,4,5,6,7], '16n')
p.sustain[0] = 1
p.playbackRate = 1
p.baseUnit = .2 //this is a multiplier by the seq values
//it sets what time the sample plays from
p.startTime = 2
p.seqControlsPitch = 0 //enable pitch sequencing
p.stop()
p.fadeIn = .003
p.fadeOut = .003
//

p.loop = false
p.loopStart = 2.2
p.loopEnd = 2.27
p.reverse = false


// let startp = 0
// let index = 0
// let loop = new Tone.Loop(time=>{
//   p.player.start(time, startp,1)
// }, '8n').start()

// let loop2 = new Tone.Loop(time=>{
//   p.player.start(time+index, startp+index,1)
//   index+=0.5
// }, '8n').start()

//oscilloscope
let scope = new Oscilloscope('Canvas')
output.connect(scope.input)