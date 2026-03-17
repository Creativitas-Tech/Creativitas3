let frequency = new Tone.Signal()
//frequency ratios for vcos
let vco_freq_1 = new Tone.Multiply()
let vco_freq_2 = new Tone.Multiply()
let vco_freq_3 = new Tone.Multiply()
//vcos
let vco_1 = new Tone.Oscillator().start()
let vco_2 = new Tone.Oscillator().start()
let vco_3 = new Tone.Oscillator().start()
//mixer
let vco_gain_1 = new Tone.Multiply()
let vco_gain_2 = new Tone.Multiply()
let vco_gain_3 = new Tone.Multiply()
//vcf,vca,output
let vcf = new Tone.Filter()
let vca = new Tone.Multiply()
let output = new Tone.Multiply(0.1).toDestination()

frequency.connect( vco_freq_1)
frequency.connect( vco_freq_2)
frequency.connect( vco_freq_3)
vco_freq_1.connect( vco_1.frequency)
vco_freq_2.connect( vco_2.frequency)
vco_freq_3.connect( vco_3.frequency)
vco_1.connect( vco_gain_1)
vco_2.connect( vco_gain_2)
vco_3.connect( vco_gain_3)
vco_gain_1.connect( vcf)
vco_gain_2.connect( vcf)
vco_gain_3.connect( vcf)
vcf.connect( vca), vca.connect( output)

//waveforms
vco_1.type = 'square'
vco_2.type = 'square'
vco_3.type = 'square'

frequency.rampTo( 100, 1)


let gui = new p5(sketch, Canvas)
let vco_knob_x = [15,25,35]
//labels
let vco1_label = gui.Text({
  label:'vco1', x:vco_knob_x[0],y:5,
  border:1, borderRadius: 0.01
})
let vco2_label = gui.Text({
  label:'vco2', x:vco_knob_x[1],y:5,border:1, 
  borderRadius: 0.01
})
let vco3_label = gui.Text({
  label:'vco3', x:vco_knob_x[2],y:5,
  border:1, borderRadius: 0.01
})
let oct_label = gui.Text({
  label:'octave', size:1.5,
  x:6,y:20,border:0.01
})
let detune_label = gui.Text({
  label:'detune', size:1.5,
  x:6,y:50,border:0.01
})
let gain_label = gui.Text({
  label:'gain', size:1.5,
  x:6,y:80,border:0.01
})

//vco1
let vco1_oct_knob = gui.Knob({
  label:'freq 1',
  showLabel:0,showValue: 1,
  callback: function(x){
   vco_freq_1.value = Math.pow(2,Math.floor(x)) + vco1_detune_knob.value  
  },
  min:-2, max:1, value:.0,
  x:vco_knob_x[0],y:20,size: 0.75, border: 2
})
let vco1_detune_knob = gui.Knob({
  label:'freq 1',
  showLabel:0,showValue: 1,
  callback: function(x){
   vco_freq_1.value = x + Math.pow(2,Math.floor(vco1_oct_knob.value))  
  },
  min:-.2, max:.2, curve:1., value:.0,
  x:vco_knob_x[0],y:50,size: 0.75, border: 2, accentColor: [50,150,100]
})
let vco1_gain_knob = gui.Knob({
  label:'gain',
  mapto: vco_gain_1.factor, value:.5,
  showLabel:0,showValue: 1,
  min:0., max:1, curve:2, 
  x:vco_knob_x[0],y:80,size:0.75,
  border: 2, accentColor: [200,50,0]
})

//vco2
let vco2_oct_knob = gui.Knob({
  label:'freq 1',
  showLabel:0,showValue: 1,
  callback: function(x){
   vco_freq_2.value = Math.pow(2,Math.floor(x)) + vco2_detune_knob.value  
  },
  min:-2, max:2,
  x:vco_knob_x[1],y:20,size: 0.75, border: 2
})
let vco2_detune_knob = gui.Knob({
  label:'freq 1',
  showLabel:0,showValue: 1,
  callback: function(x){
   vco_freq_2.value = x + Math.pow(2,Math.floor(vco2_oct_knob.value))  
  },
  min:-.1, max:.1, curve:1,
  x:vco_knob_x[1],y:50,size: 0.75, border: 2, accentColor: [50,150,100]
})
let vco2_gain_knob = gui.Knob({
  label:'gain',
  mapto: vco_gain_2.factor,
  showLabel:0,showValue: 1,
  min:0., max:1, curve:2, 
  x:vco_knob_x[1],y:80,size:0.75,
  border: 2, accentColor: [200,50,0]
})

//vco3
let vco3_oct_knob = gui.Knob({
  label:'freq 1',
  showLabel:0,showValue: 1,
  callback: function(x){
   vco_freq_3.value = Math.pow(2,Math.floor(x)) + vco3_detune_knob.value  
  },
  min:0, max:3,
  x:vco_knob_x[2],y:20,size: 0.75, border: 2
})
let vco3_detune_knob = gui.Knob({
  label:'freq 1',
  showLabel:0,showValue: 1,
  callback: function(x){
   vco_freq_3.value = x + Math.pow(2,Math.floor(vco3_oct_knob.value))  
  },
  min:-.1, max:.1, curve:1,
  x:vco_knob_x[2],y:50,size: 0.75, border: 2, accentColor: [50,150,100]
})
let vco3_gain_knob = gui.Knob({
  label:'gain',
  mapto: vco_gain_3.factor,
  showLabel:0,showValue: 1,
  min:0., max:1, curve:2, 
  x:vco_knob_x[2],y:80,size:0.75,
  border: 2, accentColor: [200,50,0]
})

let vcf_cutoff_knob = gui.Knob({
  label:'cutoff',
  mapto: vcf.frequency,
  min:2., max:10000, curve:2.5, 
  x:55,y:28,size:1.75,
  border: 4, accentColor: [200,0,200]
})
let vcf_res_knob = gui.Knob({
  label:'Q',
  mapto: vcf.Q,
  min:0, max:20, curve:1, 
  x:55,y:75,size:.75,
  border: 2, accentColor: [200,0,200]
})
let vca_knob = gui.Knob({
  label:'vca',
  mapto: vca.factor,
  min:0, max:1, curve:2, 
  x:80,y:25,size:1.5,
  border: 3, accentColor: [0,0,255]
})

let scope = new Oscilloscope()
vcf.connect( scope.input)
scope.threshold = .99