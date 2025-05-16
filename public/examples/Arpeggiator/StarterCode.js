//Arpeggiator
//^^^ don't forget to enable the keyboard
Theory.tempo = 140

let pitch = -1;
let pattern = 'up'
let original_seq = []
let notesHeldDown = 0
let index = 0

//Synth setup
let s = new Twinkle()
let delay = new AnalogDelay()
let output = new Tone.Multiply(.1).toDestination()
s.connect(output)
s.connect(delay), delay.connect(output)

s.initGui()
setTimeout( ()=>{ 
  s.loadPreset('guitar') 
}, 1000)
//s.get()

//sequencer params
s.sequence([])
s.seq[0].sustain = .2
s.sustain = .05
s.octave = 0
s.velocity = 127

//delay params
delay.time = 48/Theory.tempo
delay.feedback = .2
delay.hpf = 100
delay.wet = .5
delay.amp = 0
delay.get()
delay.delayRatio = 1

//gui setup
let gui2 = new p5(sketch, Canvas);
gui2.createCanvas(700,200);

let curOrderLabel = gui2.RadioButton({
  label:'order',
  radioOptions: ['order','up','down','updown','random'],
  callback: function(x){pattern = x},
  x: 30, y:80, size:1, orientation:'horizontal',
  value: 'up'
})

//MIDI handling
let pitchmap = [0,0,1,1,2,3,3,4,4,5,5,6]
setNoteOnHandler( (note,vel)=>{
  notesHeldDown++
  pitch = pitchmap[note%12] + floor(note/12-5)*7;
  if(original_seq.includes(pitch)){
     //do nothing
  }else{
    original_seq.push(pitch);
  }
  sortSequence(pattern)
})
setNoteOffHandler((note, vel)=>{
  if(notesHeldDown>1) {
    notesHeldDown = notesHeldDown-1
    pitch = pitchmap[note%12] + floor(note/12-5)*7;
    index = original_seq.indexOf(pitch);
    if (index !== -1) {
      original_seq.splice(index, 1);
    }
    sortSequence(pattern)
  }
  else {
    notesHeldDown = 0
    original_seq = []
    s.seq[0].vals = ['.']
  }
  return;
})

const sortSequence = (patt) =>{
  if (patt === 'order'){ //inputted order
    s.seq[0].vals = original_seq;
  } else if(patt === 'up'){ //ascending
    s.seq[0].vals = original_seq.slice().sort();
  } else if(patt === 'down'){ //descending
    s.seq[0].vals = original_seq.slice().sort().reverse();
  }else if(patt ==='random'){ //random
    s.seq[0].vals = original_seq.slice().sort(() => Math.random() - 0.5);
  }else if(patt === 'updown'){ //pingpong
    s.seq[0].vals = original_seq.slice().sort().slice(1);
    s.seq[0].vals = s.seq[0].vals.concat(original_seq.slice().sort().reverse().slice(1));
  }
}