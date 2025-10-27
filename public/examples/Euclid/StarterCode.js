// Setup audio objects
let d = new DrumSampler()
let s = new Twinkle()
let output = new Tone.Multiply(.1).toDestination()
d.connect(output)
s.connect(output)

s.initGui()
s.loadPreset('flute')

Theory.tempo = 120

// Example 1: Cuban tresillo (3 hits in 8 beats)
d.euclid('*', 3, 8, 0, '8n', 0)

// Example 2: West African pattern (5 hits in 8 beats)
d.euclid('o', 5, 8, 0, '8n', 1)

// Example 3: Indian classical (5 hits in 12 beats)
d.euclid('x', 5, 12, 0, '8n', 2)

// Example 4: Euclidean melody pattern
s.euclid('0 2 4 5 7', 5, 8, 0, '8n', 0)
s.octave = 0
s.sustain = .1

// Try these additional patterns:
// d.euclid('*', 7, 16, 0, '16n', 0) // 7-in-16 (Brazilian rhythms)
// d.euclid('*', 16, 16, 0, '16n', 0) // 16-in-16 (simple and steady)
