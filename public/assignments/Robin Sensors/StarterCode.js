//look in the console for the MIDI port for Wifiduino, and Tiny USB
setMidiInput(2)
setMidiOutput(2)

//OPTIONAL: messages to control incoming midi data
//limit rate of cc messages
// sendCC(10, 3) //sets 10ms limit
// sendCC(110, 50) //sets accelX smoothing
// sendCC(111, 30) //sets accelY smoothing
// sendCC(112, 50) //sets accelZ smoothing
//sendCC(127, 50) //software reset

let s = new Polyphony(Daisy)
let verb = new Reverb()
let output = new Tone.Gain(0.1).toDestination()
s.connect(output)
s.connect( verb )
verb.connect(output)
s.initGui(s)
verb.initGui()

let ax = new Graph(128, .4, 0)
let ay = new Graph(128, .4, 0)
let az = new Graph(128, .4, 0)
let roll = new Graph(128, .4, 1)
let pitch = new Graph(128, .4, 1)
let yaw = new Graph(128, .4, 1)
let magnitude = new Graph(128, .4, 1)

setNoteOnHandler((note,vel)=>{
  console.log('on', note)
})
setNoteOffHandler((note)=>{
  console.log('off', note)
})
setCCHandler((num, val)=>{
  if(num == 10) console.log(num, val)
  switch(num){
    case 10:
      ax.add(val)
      break;
    case 11:
      ay.add(val)
      break;
    case 12:
      az.add(val)
      break;
    case 20:
      roll.add(val)
      break;
    case 21:
      pitch.add(val)
      break;
    case 22:
      yaw.add(val)
      break;
    case 30:
      magnitude.add(val)
      break;
  }
})