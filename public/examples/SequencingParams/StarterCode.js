/*
TIP: Run code blocks separately for better experimentation!
- Alt(option)-Shift-Enter: Run the selected block of code
- Alt(option)-Enter: Run a single line
*/

let s = new Twinkle()
let output = new Tone.Multiply(.1).toDestination()
s.connect(output)

s.initGui()
s.loadPreset('flute')

Theory.tempo = 80

// Visualizers
let scope = new Oscilloscope()
s.connect(scope)

let spectrum = new Spectrogram(1)
spectrum.maxFrequency = 5000
s.connect(spectrum)
spectrum.analyserNode.smoothingTimeConstant = 0.0;

// Example 1: Basic sequence with default parameters
s.sequence('0 2 4 5 7', '8n')
s.octave = 0
s.sustain = .2
s.velocity = 80

// Example 2: Change octave for a different range
s.octave = 2  // try -1, 0, 1, or 2

// Example 3: Staccato vs. Legato
s.sustain = .01  // very short, staccato notes
s.sustain = .8   // long, legato notes

// Example 4: Velocity changes expression
s.velocity = 30   // quiet and delicate
s.velocity = 127  // loud and aggressive

// Example 5: Subdivision changes speed
s.subdivision = '16n'  // faster
s.subdivision = '4n'   // slower

// Example 6: Ornamentation adds neighbor tones
s.orn = 1  // adds ornamental notes

// Example 7: Lag creates groove
s.lag = 0.1   // notes play behind the beat
s.lag = -0.1  // notes rush ahead
