const s = new Simpler('piano')
const output = new Tone.Multiply(.1).toDestination()
const verb = new Diffuseur()
s.connect(output)
s.connect(verb), verb.connect(output)
//
s.sequence('0 2 4 0 1 3 5 1 2 4 6 2', '8n', 0)
s.initGui()

//load a new samples
s.listSamples() //prints samples to console
s.load('piano') //select a sample by name
s.load(13) //or use a number to run through the available samples

//these controls affect the sample playback
s.volume = .4
s.attack = .01
s.release = 1
s.sustain = .5

//there is also a vcf after the sampler
//by default it is set to not affect the sound
//but you can use it as a subtle tone control
//or synth style filter
s.cutoff = 5000
s.Q = 0 //0-20
s.vcf.rolloff = -12 //-12, -24, or -48
s.filterEnvDepth = 400
s.setFilterADSR(.1,.1,.5,1)
s.vcf.type = 'lowpass' //or 'bandpass' or 'highpass'