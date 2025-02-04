//audio objects and connections
const gui = new p5(sketch, Canvas)
const output = new Tone.Multiply(.1).toDestination()
const verb = new Diffuseur()
const b = new Rumble()
b.connect(output)
b.connect(verb), verb.connect(output)
//wait a sec
b.initGui(gui)
b.loadPreset('sub')

verb.input.factor.value = .7
b.output.factor.value = 1.5
verb.load('./audio/plate_reverb.mp3')
verb.stretchIR(.75)

b.expr( i=> i%16%5<2 ? -i*2%5*2 : '.', 64, '8n', 0)
b.drawing.disable()
b.stop()