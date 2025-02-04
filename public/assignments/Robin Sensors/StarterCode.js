setMidiInput(2)
setNoteOnHandler((note,vel)=>{
  console.log('on', note, vel)
  })
setNoteOffHandler((note,vel)=>{
  console.log('off', note,vel)
})
setCCHandler((cc,val)=>{
  console.log('cc', cc, val)
})
