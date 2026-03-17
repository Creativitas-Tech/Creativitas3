let vco = new Tone.Oscillator({type:'square'}).start()
let vcf = new Tone.Filter({rolloff:-24})
let vca = new Tone.Multiply()
let output = new Tone.Multiply(0.05).toDestination()
let env = new Tone.Envelope()
let cutoff = new Tone.Signal()
let vcf_env_depth = new Tone.Multiply()

vco.connect( vcf), vcf.connect( vca), vca.connect(output)
env.connect( vca.factor ), env.connect( vcf_env_depth)
cutoff.connect( vcf.frequency), vcf_env_depth.connect( vcf.frequency)

cutoff.value = 300, vcf.Q.value = 4
env.decay = .5, env.sustain = .3
vcf_env_depth.factor.value = 1200

//define our pitch sequence and index
let pitches = [60, 63, 60, 65, 58, 55, 67, 63]; //MIDI notes
let index = 0
const sequence = new Tone.Loop( (time) => {
  //calculate freq for note
  let pitch = Tone.Midi(pitches[index]).toFrequency()
  vco.frequency.setValueAtTime(pitch, time);
  env.triggerAttackRelease('8n', time); // Assuming 8n duration for each note
  //update index
  index = index+1
  if(index >= pitches.length) index = 0
  //console.log(index, pitch)
  },
  '8n' // Time interval between each note
);
sequence.start()

//sequence.stop()
Tone.Transport.start();
