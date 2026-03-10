// Run this block first to import the ml5 library
let ml5 = import('https://unpkg.com/ml5@latest/dist/ml5.min.js');

//all the rest of the code is in the block below
//run it after ml5 is loaded
/********** AUDIO **********/
let frequency = new Tone.Signal(100)
let vco = []
let num_oscs = 5
for(let i=0;i<num_oscs;i++) vco.push(new Tone.PulseOscillator().start())
let vcf = new Tone.Filter()
let vca = new Tone.Multiply()
let env = new Tone.Envelope()
let vcf_env_depth = new Tone.Multiply(1000)
let cutoff = new Tone.Signal(100)
let output = new Tone.Multiply(0.02).toDestination();
let lfo = new Tone.Oscillator({type:'triangle'}).start()
let pwm_depth = new Tone.Multiply()
for(let i=0;i<num_oscs;i++) {
  frequency.connect( vco[i].frequency)
  vco[i].connect( vcf )
}
vcf.connect( vca), vca.connect( output )
env.connect( vcf_env_depth ), vcf_env_depth.connect( vcf.frequency), cutoff.connect( vcf.frequency)
env.connect( vca.factor )
lfo.connect(pwm_depth)
for(let i=0;i<num_oscs;i++) pwm_depth.connect( vco[i].width )
vcf.Q.value= 10
env.release = 1
env.decay = .2
pwm_depth.factor.value = .5
//
/********** NEURAL NETWORK **********/
const options = {
  inputs: ['x', 'y'],  // TODO: support ['x', 'y']
  outputs: ['detune','cutoff','vcf_env','lfo_rate','env_shape'], // TODO: support ['freq]
  task:'regression',
  debug: true,
}
let brain = ml5.neuralNetwork(options);
//
// Add a data record
function addData() {
  brain.addData(
    {//inputs
      x:gui2.mouseX, 
      y:gui2.mouseY
    }, 
    {//outputs
      detune: detune_knob.value,
      cutoff:cutoff_knob.value, 
      vcf_env: vcf_env_knob.value,
      lfo_rate:lfo_rate_knob.value,
      env_shape: env_slider.value
    }); //brain.addData
//
  // Draw circle to visualize training data
  gui2.stroke(0);
  gui2.noFill();
  gui2.ellipse(gui2.mouseX, gui2.mouseY, 32);
}
// Train the model
let trained = 0
function trainModel() {
  // ml5 will normalize data to a range between 0 and 1 for you.
  brain.normalizeData();
  // Train the model
  // Epochs: one cycle through all the training data
  brain.train({ epochs: 20 }, finishedTraining);
}
//
// Predict a frequency When the model is trained
function finishedTraining() {
  brain.predict([gui2.mouseX, gui2.mouseY], gotFrequency);
  trained = 1
}
// Got a result
function gotFrequency(error, outputs) {
  if (error) {
    console.error(error);
    return;
  }
//
  detune_knob.set( parseFloat(outputs[0].value) )
  cutoff_knob.set( parseFloat(outputs[1].value) )
  vcf_env_knob.set( parseFloat(outputs[2].value) )
  lfo_rate_knob.set( parseFloat(outputs[3].value) )
  env_slider.set( parseFloat(outputs[4].value) )
}
//
/********** GUI **********/
const gui = new p5(sketch, Canvas);
const gui2 = new p5(sketch, Canvas);
gui2.noLoop()
//
gui2.Text({
  label:'click in this gui to store input/output pair',
  x:50, y:50, size:2
})
//
gui2.mousePressed = () => {
  if(gui2.mouseX > 0 && gui2.mouseY > 0){
    console.log('addData, mouse:',gui2.mouseX,gui2.mouseY)
    addData()
  }
};
let detune_knob = gui.Knob({
  label:'detune',
  callback: function(x){
    for( let i=0;i<num_oscs;i++){
      vco[i].detune.value = x*(i+1-num_oscs/2-0.5)  
    }
  },
  min: 0,
  max: 10,
  curve: 2,
  size: .75,
  x: 10,
  y: 20,
});
let cutoff_knob = gui.Knob({
  label:'cutoff',
  mapto:'cutoff',
  min: 0,
  max: 1000,
  curve: 2,
  size: 1,
  x: 30,
  y: 20,
  size:.75
});
let vcf_env_knob = gui.Knob({
  label:'vcf env',
  mapto:'vcf_env_depth.factor',
  min: 1,
  max: 5000,
  curve: 2,
  size: .75,
  x: 50,
  y: 20,
});
let lfo_rate_knob = gui.Knob({
  label:'lfo rate',
  mapto:'lfo.frequency',
  min: 0,
  max: 8,
  curve: 2,
  x: 70,
  y: 20,
  size:.75
});
let env_slider = gui.Fader({
  label:'env shape',
  callback: function(x){
    env.attack = x > .5 ? (x-.5)*400 : .05
    env.decay = x
    env.sustain = x
    env.release = x*5
  },
  min: 0,
  max: 1,
  curve: 2,
  size: 1,
  x: 90,
  y: 50,
})
let trainButton = gui.Button({
  label: 'Train',
  mapto: '',
  size: 1,
  x: 60,
  y: 80,
});
trainButton.callback = trainModel;
//
setNoteOnHandler( (note,vel)=>{
  frequency.value = Tone.Midi(note).toFrequency()
  env.triggerAttack()
})
setNoteOffHandler( (note,vel)=>{
  env.triggerRelease()
})
//
/********** SEQUENCER **********/
let pent_scale = [0,3,5,7,10,12]
let pitch_sequence = Array.from({length:32},(x,i)=> [0,2,3,5,7].includes(i%8%(8-Math.floor(i/5))) ? pent_scale[i%6] : -1)
console.log(pitch_sequence)
let index = 0
let trigNote = function(){
  if( trained ) brain.predict([gui2.mouseX, gui2.mouseY], gotFrequency);
  if(pitch_sequence[index] >= 0){
    frequency.value = Tone.Midi(pitch_sequence[index]+36).toFrequency()
    env.triggerAttackRelease(0.1)
  }
  index = (index+1)%32
}
let mySeq = setInterval(trigNote, 200)

//clearInterval(mySeq)