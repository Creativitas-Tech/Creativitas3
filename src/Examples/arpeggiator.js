//Robin Arpeggiator
Theory.tempo = 140

let num_pads = 8
let noteVals = [0,1,2,3,4,5,6,7];
let pitch = -1;
let pattern = 0
let original_seq = []
let labels = ["Original", "Ascending", "Descending", "Random", "PingPong"]
let notesHeldDown = 0

//Synth setup
let s = new Rumble()
let delay = new AnalogDelay()
let output = new Tone.Multiply(.1).toDestination()
s.connect(output)
s.connect(delay), delay.connect(output)

let gui = new p5(sketch, Canvas)
s.initGui(gui)
s.loadPreset('sub')
s.get()

//sequencer params
s.sequence([])
s.sustain = .05
s.octave = 0
s.velocity = 127

//delay params
delay.time = 48/Theory.tempo
delay.feedback = .2
delay.hpf = 100
delay.wet = .5
delay.amp = 1
delay.get()
delay.delayRatio = 1

setMidiInput(2)

//gui setup
let gui2 = new p5(sketch, Canvas);
gui2.createCanvas(700,200);
let toggles = [];
let toggleSize = .75
let noteOn = [true, true, true, true, true, true, true, true]; 
for (let i = 0; i < num_pads; i++) {
  toggles.push(gui2.Toggle({
    callback: function (x) {
      noteOn[i] = x == 0 ? false : true;  // Toggle noteOn for the sequence
    },
    label: " ",
    x: (11 + 11*i) * toggleSize,  // Position the toggle switches
    y: 50,
    border: 10,
    borderColor: [0,128,0],
    size: toggleSize
  }));
  toggles[i].set(0);  // Default all to "off"
}
let curOrderLabel = gui2.Text({
  label: labels[0],
  border: 1,
  y: 85,
  x: 15
})

//MIDI handling
setNoteOnHandler( (note,vel)=>{
  notesHeldDown++
  //console.log(note);
  note = note
  if (note == 9){
      pattern = (pattern + 1)%5;
      curOrderLabel.label = labels[pattern];
    console.log(pattern)
  }else if (note == 10){
      pattern = (pattern + 4)%5;
      curOrderLabel.label = labels[pattern];
  }else{
    pitch = noteVals.indexOf(note);
    if(pitch == -1){
      return;
    }
    if(original_seq.includes(pitch)){
       original_seq = original_seq.filter(element => element !== pitch);
       toggles[noteVals.indexOf(note)].set(0);
    }else{
      original_seq.push(pitch);
      toggles[noteVals.indexOf(note)].set(1);
    }
  }
  if (pattern == 0){ //inputted order
    s.seq[0].vals = original_seq;
  } else if(pattern == 1){ //ascending
    s.seq[0].vals = original_seq.slice().sort();
  } else if(pattern == 2){ //descending
    s.seq[0].vals = original_seq.slice().sort().reverse();
  }else if(pattern == 3){ //random
    s.seq[0].vals = original_seq.slice().sort(() => Math.random() - 0.5);
  }else if(pattern == 4){ //pingpong
    if(s.seq[0].vals.length < 1){
      return;
    }
    s.seq[0].vals = original_seq.slice().sort().slice(1);
    s.seq[0].vals = s.seq[0].vals.concat(original_seq.slice().sort().reverse().slice(1));
  }
  //console.log(original_seq)
})
setNoteOffHandler((note, vel)=>{
  if(notesHeldDown>1) notesHeldDown = notesHeldDown-1
  else {
    notesHeldDown = 0
    original_seq = []
    s.seq[0].vals = ['.']
    for(let i=0;i<8;i++) toggles[i].set(0);
  }
  return;
})
setCCHandler((cc,val)=>{
  //console.log(cc,val)
  if( cc==2 ) {
    s.vcfEnvDepth = val/127*5000
    s.adsr = [.01,.1,(1-val/127)/4,(1-val/127)/4]
  }
})