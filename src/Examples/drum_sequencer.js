//4 lane drum sequencer
Theory.tempo = 90

//synth setup
const sampler = new DrumSampler()
const output = new Tone.Multiply(.1).toDestination()
const verb = new Diffuseur()
sampler.connect(output)
sampler.connect(verb), verb.connect(output)

let gui2 = new p5(sketch,Canvas)
sampler.initGui(gui2)

sampler.loadPreset('breakbeat')
verb.load('spring') //or plate or hall
verb.output.factor.value = .6

//sequencer gui setup
let noteOns = [];
let noteToggles = [];
let gui = new p5(sketch, Canvas);
[noteOns, noteToggles] = create_sequencer_gui(gui);
let symbols = ['O', 'X', '^', '2'];
let cur_lane = 0;

//midi setup
setMidiInput(2);
setMidiOutput(2);

//setting LEDs on robin
sendNote(cur_lane, 127, 1); //color, brightness, LED#
sendNote(cur_lane, 127, 2);

setNoteOnHandler( (note,vel)=>{
  if (note == 9){
      cur_lane = (cur_lane+3)%4;
      sendNote(cur_lane, 127, 1); //update led colors
      sendNote(cur_lane, 127, 2);
  }
  else if (note == 10){
      cur_lane = (cur_lane+1)%4;
      sendNote(cur_lane, 127, 1);
      sendNote(cur_lane, 127, 2);
  }
  else if (note >= 0 && note < 8){
      noteOns[cur_lane][note%60] = !noteOns[cur_lane][note%60];
      noteToggles[cur_lane][note%60].set(noteOns[cur_lane][note%60] ? 1 : 0);
      sampler.sequence(noteOns[cur_lane].map(value => (value ? symbols[cur_lane] : '.')).join(''), '8n', cur_lane);
  }
})
setNoteOffHandler((note,vel)=>{})
setCCHandler((note,vel)=>{})
