let output = new Tone.Multiply(.1).toDestination()
let s= new Polyphony(FM, 4)
s.connect(output)
s.initGui(s)
s.sequence('0 1 2 3 4 5 6 7')

s.stop()
s.get()

let s2 = new FM4()
s2.connect(output)
s2.initGui()

s2.sequence('7 9 11 7', '1n')

let scope = new Oscilloscope()
s.connect(scope)