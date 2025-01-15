let gui = new p5(sketch, FMOperator)

class Caverns {
  constructor(num = 4) {
    //audio objects
    this.num_delay = num
    this.input = new Tone.Multiply(1)
    this.output = new Tone.Multiply(1)
    this.delay = []
    for(let i=0;i<num_delay;i++){
      this.delay.push(new delayOp(500))
    }
    //connections
    for(let i=0;i<num_delay;i++){
      this.input.connect(this.delay[i].input)
      this.delay[i].send[i].connect(this.delay[i].input)
      this.delay[i].output.connect( this.output)
    }

    //GUI objects
    // this.harmonicity_knob = gui.Knob({
    //   label: 'harmonicity', value: 1,
    //   callback: function(x){
    //     this.harmonicity.factor.value = Math.floor(x)
    //   }.bind(this),
    //   min: 1, max: 10,
    //   x: x+0, y: y+0, size:0.75, accentColor: color
    // })
  }
  this.setDelayHz(num=0,freq=100){
    if(num < this.num_delay){
      this.delay[num].delayTime = 1/freq
    }
  }
  this.setDelayMS(num=0,time=.25){
    if(num < this.num_delay){
      this.delay[num].delayTime = time
    }
  }
  this.setAllFeedback(val = .9,rate = .1){
    for(let i=0;i<this.num_delay;i++){
      this.delay[i].baseFeedback.rampTo(val,rate)
    }
  }
  this.setAllDamping(val = 1000,rate = .1){
    for(let i=0;i<this.num_delay;i++){
      this.delay[i].baseDamping.rampTo(val,rate)
    }
  }
  this.setAllCutoff(val = 1000,rate = .1){
    for(let i=0;i<this.num_delay;i++){
      this.delay[i].baseCutoff.rampTo(val,rate)
    }
  }
}

class delayOp{
	constructor(freq = 1000, color = [200,200,200]){
    this.input= new Tone.Multiply(1)
    this.delay = new Tone.LowpassCombFilter()
    this.vcf = new Tone.Filter({type:'bandpass', Q: 0})
    this.env = new Tone.Envelope()
    this.envDepth = new Tone.Signal(0)
    this.amp_const = new Tone.Signal(1)
    this.ampOffset = new Tone.Add(1)
    this.ampInv = new Tone.Multiply(-1)
    this.envDepth_scalar = new Tone.Multiply()
    this.ampScalar = new Tone.Multiply()
    this.send = [new Tone.Multiply(),new Tone.Multiply(),new Tone.Multiply(),new Tone.Multiply()]
    this.sendLevel = [new Tone.Signal(),new Tone.Signal(),new Tone.Signal(),new Tone.Signal()]
    this.output = new Tone.Multiply()
    this.baseFeedback = new Tone.Signal()
    this.feedback = new Tone.Signal()
    this.baseDamping = new Tone.Signal(10000)
    this.damping = new Tone.Signal()
    this.baseCutoff = new Tone.Signal(freq)
    this.cutoff = new Tone.Signal()
    //
    this.input.connect(this.delay)
    this.delay.connect(this.vcf)
    this.env.connect(this.env_depth)
    this.amp_const.connect(this.ampInv),this.ampInv.connect(this.ampOffset)
    this.ampOffset.connect(this.ampScalar)
    this.baseFeedback.connect(this.delay.resonance)
    this.feedback.connect(this.delay.resonance)
    this.baseDamping.connect(this.delay.dampening)
    this.damping.connect(this.delay.dampening)
    this.baseCutoff.connect(this.vcf.frequency)
    this.cutoff.connect(this.vcf.frequency)
    for(let i=0;i<4;i++){
      this.vcf.connect(this.send[i])
      this.send[i].connect(this.sendLevel[i])
      this.ampScalar.connect(this.send[i].factor)
      this.envScalar.connect(this.send[i].factor)
    }
	}
}