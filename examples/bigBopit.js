let myGame = new Game()
//
let mysynth = (val)=>{
  const s = new Polyphony(Twinkle)
  const d = new DrumSampler()
  const output = new Tone.Multiply(.1).toDestination()
  s.connect(output)
  d.connect(output)
  return {s:s, output:output, d:d}
}
myGame.makeSynth = ()=> mysynth()

myGame.curPlayer = 0

myGame.numPlayers = 4
myGame.playerColors = ['#F00', '#0F0', '#00F', '#0FF']
myGame.curPlayer = 0
myGame.points = [0,0,0,0]

//
let mydisplay = ()=>{
  let b = []
  const num_rows = 4
  const num_columns = 6
  const button_spacing = 1.2
  
  
//
  for(let i=0;i< num_rows*num_columns; i++){
    b.push(new NexusButton())
    const button_offset = b[i].size*0.7
    
    b[i].x = (i%num_columns)/num_columns* button_offset + .2
    b[i].y = 0
    b[i].mode = 'button'
    b[i].size = .8
    b[i].note = (i%6) + Math.floor((i)/6)*2
    b[i].element.on('change', x=>  {
      myGame.onUserInput(i,x)
    })
    //b[i].y = Math.floor((num_rows*num_columns-i-1)/num_columns) * x_offset
    const y_offset_px = (button_offset*Math.floor(i/num_columns)/num_columns + .03) * b[i].containerWidth;
    b[i].elementContainer.style.transform = `translate(${0}px, ${y_offset_px}px)`;

    console.log(button_offset, y_offset_px)
  }
  let startB = new NexusTextButton({
    x:.1, y:.9,size:1, label:'start'
  })
    startB.element.on('change', x=> {
      console.log(x)
      if(x) myGame.start()
    })

  return { b, startB }
}
myGame.makeDisplay = ()=> mydisplay()

myGame.init()

//
let userInput = (num,val)=>{
  // console.log('played', num, val)
  if(val > 0) {
    myGame.audio.s.play(expr(i=>myGame.gui.b[num].note-7, (myGame.level_number)%8+1),'16n')
    myGame.targets = myGame.targets.filter(t => t.num !== num);
    //myGame.gui.b[num].colorize('accent', myGame.color['default'])
  }
}
myGame.onUserInput = userInput

//
let onBar = (time)=>{
  console.log('BAR')
  if(myGame.curBar%4 == 0){
    myGame.chord = Math.floor(Math.random()*6)
    let root =  myGame.chord
    myGame.audio.s.sequence([
      root,
      root+Math.floor(Math.random()*3*2+4),
      root+Math.floor(Math.random()*1*2+2),
      root+Math.floor(Math.random()*3*2+4)
    ], '8n',1)
    myGame.audio.s.seq[1].velocity = 60
    myGame.level_number += 0
    myGame.audio.d.sequence(Array.from({length:16},(x,i)=>i%3==0 ? 'O' : '*'))
  }
}
myGame.onBar = onBar

myGame.onBeat = (time)=>{
  for(let i=0; i< myGame.played.length; i++){
    myGame.gui.b[myGame.played[i]].turnOff()
  }
  if( myGame.level_number %4 == 0) myGame.updateRate = 4 - (Math.floor(myGame.level_number/4)%3)
  if( (myGame.curBar*4+myGame.curBeat) % myGame.updateRate==0){
    myGame.updateTarget(myGame.chord)
  }
  console.log(myGame.updateRate, (myGame.curBar*4+myGame.curBeat) % myGame.updateRate)
}

let myFunc = (root)=>{
  myGame.curPlayer = (myGame.curPlayer+1)%myGame.numPlayers
  myGame.targets = []
  myGame.played = []
  let curNote = Math.floor(Math.random()*23)//*6+root
  let newTarget = {'player':myGame.curPlayer, 'num':curNote}
  myGame.targets.push(newTarget)
  myGame.gui.b[curNote].colorize('mediumLight', myGame.playerColors[myGame.curPlayer])
  myGame.gui.b[curNote].colorize('accent', myGame.playerColors[myGame.curPlayer])
}
myGame.updateTarget = myFunc

myGame.init()

myGame.updateRate = 4
// console.log(myGame.updateRate)