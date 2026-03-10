let vco = new Tone.Oscillator().start()
let shaperInput = new Tone.Multiply()
let waveShaper = new Tone.WaveShaper()
let vca = new Tone.Multiply(1)
let output = new Tone.Multiply(0.1).toDestination()
//
vco.connect( shaperInput), shaperInput.connect(waveShaper),
waveShaper.connect(vca), vca.connect( output)

//here are some different transfer functions
let linearMap = function(value){return value}
//
let sineFolder = function(value){
  return Math.sin(value * Math.PI * 4);
}
let triangleFolder = function(value){
  value = Math.abs(value*4 + 0.5)
  if( Math.floor(value%2) == 0 ) {
    return (value%1) * 2 - 1
  } else{
    return (1 - (value%1)) * 2 - 1
  }
}
let softClipper = function(value){
  return Math.tanh(value*4) *.9
}
let hardClipper = function(value){
  return Math.max(Math.min(value*4,1),-1) *.9
}

waveShaper.setMap(sineFolder);
waveShaper.setMap(triangleFolder);
waveShaper.setMap(softClipper);
waveShaper.setMap(hardClipper);
waveShaper.setMap(sineFolder);

//GUI
let gui = new p5(sketch, Canvas)
let depth_knob = gui.Knob({
  label: 'depth',
  mapto: shaperInput.factor,
  min:0, max:1
})
let enable_tog = gui.Toggle({
  label: 'mute', mapto: vca.factor
})

let scope= new Oscilloscope()
waveShaper.connect( scope.input)