let output = new Tone.Gain(.1).toDestination()
let s = new Polyphony(Daisy)
s.connect(output)
s.initGui()

//Don't forget to verify which input 
//your Barre uses!
setMidiInput(1)
setMidiOutput(1)

//execute this line to reset your touch pads
sendCC(101,2)

setCCHandler(( num, val ) => {
  // console.log('cc: ', num, val)
  if( num == 0){ //barre CC 0
    //control one of the your synth parameters here
    // for example:
    s.detune = val/127 + 1
  }
  if( num == 1){ //barre CC 1
    //control a different synth parameter here
  }
  //here are some examples using the potentiometers
  if( num == 2){ //pot 
    s.lfo = val/127*10 //controls lfo rate
  }
  if( num == 3){ //pot
    s.tremolo = val/127 //controls tremolo depth
  }
}) 
//
setNoteOnHandler((note, vel) => {
  console.log('note on: ', note)
  if( note == 36) s.sequence('0 2 4 6 4 2', '8n', 0)
  if( note == 38) s.stop()
  //keep adding if statements for all your notes!
});
setNoteOffHandler((note) => {
  // console.log('note off: ', note)
  //you could also add if statements here
  //if( note == 36) s.stop() //for example
});