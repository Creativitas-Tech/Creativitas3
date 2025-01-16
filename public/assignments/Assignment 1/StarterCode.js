let s = new Polyphony( Daisy )
let output = new Tone.Multiply(.1).toDestination()
s.connect( output )

let gui = new p5(sketch, Canvas)
s.initGui(s, gui )
s.loadPreset( 'default' )

s.sequence('0 1 2 3 4 5 6 7')
s.seq[0].octave = 1
s.seq[0].sustain = .03 //in seconds

//brackets subdivide beats
s.sequence('0 [1 2] 3 [2 1]')

//inside brackets, commas enable notes play simultaneously
s.sequence('[0,2,4] . [-1,1,4] .','4n')
//periods '.' are resets
//the second argument is the playback rate: 4n=quarter note
