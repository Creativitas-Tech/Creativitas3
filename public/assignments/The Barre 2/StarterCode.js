//set the midi input number
const MIDI_INPUT = 1
//
// === Setup ===
const s = new Polyphony( Daisy );
s.initGui()
//
const output = new Tone.Gain(0.2).toDestination();
s.connect(output);
s.octave = 2
//
let barreA = new Graph(128, .5)
let barreB = new Graph(128, .5)

// MIDI setup
setMidiInput(MIDI_INPUT);
setMidiOutput(MIDI_INPUT);
//
// === MIDI Note On Handler ===
setNoteOnHandler(function(note, vel) {
  console.log("Note On:", note, vel);
  s.triggerAttack( note+36, vel);
});
//
// === MIDI Note Off Handler ===
setNoteOffHandler(function(note) {
  console.log("Note Off:", note);
  s.triggerRelease(note+36);
 
});
//
// === MIDI CC Handler ===
setCCHandler(function(num, val) {
  console.log("CC", num, val);
  switch(cc){
    case 0:  
      barreA.addCCValue(value)
      break;
    case 1: 
      s.envDepth = value/60*3000; 
      barreB.addCCValue(value)
      break;
    case 2: //pot 1 does nothing for now
      break;
    case 3: //pot 2 does nothing for now
      break;
    case 4: //button 1 does nothing for now
      break;
    case 5: //button 2 does nothing for now
      break
  }
});

//reset the capacitive sensor if it stops responding
sendCC(101,1);

//slow down how fast the sensors send data
//only change this if you notice the sensor data lagging
//sendCC(100, 20); //CC number 100, higher values reduce data rate

