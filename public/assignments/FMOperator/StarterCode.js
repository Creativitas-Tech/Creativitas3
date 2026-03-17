let gui = new p5(sketch, Canvas)
class FMOperator {
  constructor(x=0,y=0,color=[0,0,0],carrier = 'no') {
    //audio objects
    this.oscillator = new Tone.Oscillator().start();
    this.output = new Tone.Multiply()
    this.env = new Tone.Envelope()
    this.harmonicity = new Tone.Multiply(1)
    this.index = new Tone.Multiply(0)
    this.index_env_depth = new Tone.Multiply()
    if( carrier == 'carrier') this.amplitude = new Tone.Signal(1)
    else this.amplitude = new Tone.Signal()
    this.env_depth = new Tone.Multiply()
    //audio connections
    this.harmonicity.connect( this.oscillator.frequency)
    this.oscillator.connect( this.output )
    this.harmonicity.connect (this.index)
    this.harmonicity.connect( this.index_env_depth )
    if(carrier != 'carrier') this.index.connect( this.output.factor )
    if(carrier != 'carrier') this.index_env_depth.connect( this.env_depth.factor)
    this.amplitude.connect( this.env_depth.factor)
    this.env.connect( this.env_depth), this.env_depth.connect( this.output.factor)
    //GUI objects
    this.harmonicity_knob = gui.Knob({
      label: 'harmonicity', value: 1,
      callback: function(x){
        this.harmonicity.factor.value = Math.floor(x)
      }.bind(this),
      min: 1, max: 10,
      x: x+0, y: y+0, size:0.75, accentColor: color
    })
    if(carrier != 'carrier')  {
      this.index_knob = gui.Knob({
        label: 'index', value: .5,
        mapto: this.index.factor,
        min: 0, max: 4,
        x: x+10, y: y+0, size:0.75, accentColor: color
      })
    }
    this.decay_knob = gui.Knob({
      label: 'decay', value: 1,
      callback: function(x){
        this.env.decay = x/2
        this.env.release = x
      }.bind(this),
      min: 0.01, max: 10, curve:2,
      x: x+0, y: y+50, size:0.75, accentColor: color
    })
    if(carrier != 'carrier')  {
      this.index_env_knob = gui.Knob({
        label: 'index env', value: .25,
        mapto: this.index_env_depth.factor,
        min: 0, max: 4, curve:1.5,
        x: x+10, y: y+50, size:0.75, accentColor: color
      })
    }
  }
}

let main_freq = new Tone.Signal(100)
let output = new Tone.Multiply(0.1).toDestination()
//operator arguments are (x,y,color,carrier):
// [x,y] is location the harmonicity knob
// color is the accent colors of the knobs
// if the fourth argument is 'carrier' then the index controls are not connected
let operator = [
  new FMOperator(10,10,[255,0,0]),
  new FMOperator(30,10,[0,255,0]),
  new FMOperator(50,10,[0,0,255], 'carrier')
]
for( let i=0;i<operator.length;i++) main_freq.connect(operator[i].harmonicity) 

//we will connect our oscillators in a chain:
// op0 -> op1 -> op2, where op2 is the carrier
operator[2].output.connect( output)
operator[1].output.connect( operator[2].oscillator.frequency)
operator[0].output.connect( operator[1].oscillator.frequency)
//with multiple modulators it can be helpful for earlier operators to have higher
//harmonicities than later ones
operator[0].harmonicity.factor.value = 5

let sequence = new Tone.Sequence((time,note)=>{
  main_freq.setValueAtTime(note,time)
  for( let i=0;i<operator.length;i++) operator[i].env.triggerAttackRelease(0.01,time)
},[100,150,200,300], '4n')
sequence.start()

Tone.Transport.start()
//sequence.stop()