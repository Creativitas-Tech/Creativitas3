let s = new Twinkle()
let output= new Output()
s.connect(output)
//
let m = midi.device('waveshare')
m.verbose = false
//
let gui = new p5(sketch, Canvas)
let b = []
for(let i=0;i<11;i++){
  b.push( gui.Toggle({
    label:i.toString(),
    callback: x=> console.log()
  }))
}
//
let graph_y = new Graph()
let graph_z = new Graph()
let graph_mag = new Graph()

//tilt - pitch/roll/yaw
m.cc3.cb = val => {}
m.cc4.cb = val => {
  graph_y.addCC(val)
}
m.cc5.cb = val => graph_z.addCC(val)
//magnitude of acceleration
m.cc6.cb = val => graph_mag.addCC(val) //console.log('cc', 6, val)
//potentiometer
m.cc0.cb = val => console.log('cc', 0, val)

//handle all midi notes
m.note.cb = (note,vel)=>{
  console.log(note,vel)
  b[note].set(vel > 0 ? 1 : 0)
}
//handle individual midi nots
m.note0.cb = vel => {
  s.sequence('0 2 3 1')
}
m.note1.cb = vel => s.sequence('4 5 3 6')