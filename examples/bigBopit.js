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

myGame.numPlayers = 4
myGame.color = {
  'default':'#FEC6CF'
}
myGame.playerColors = ['#F00', '#0F0', '#00F', '#0FF']
myGame.curPlayer = 0
myGame.points = [0,0,0,0]
startB.colorize('accent', '#FEC6CF')
     startB.colorize('fill', '#3F3030')

//
let mydisplay = ()=>{
  let b = []
  const num_rows = 4
  const num_columns = 6
//
  for(let i=0;i< num_rows*num_columns; i++){
    b.push(new NexusButton())
    b[i].x = (i%num_columns)* 1/(num_columns)
    b[i].mode = 'toggle'
    b[i].y = Math.floor((23-i)/num_columns) * 1/(num_columns*1.5)
    b[i].height = 80,  b[i].width = 80
    b[i].colorize('accent', '#FEC6CF'), b[i].colorize('fill', '#3F3030')
    b[i].note = (i%6) + Math.floor((i)/6)*2
    b[i].element.on('change', x=>  myGame.onUserInput(i,x))
  }
  let startB = new NexusButton()
  startB.x = .10
    startB.mode = 'button'
    startB.y = .50
    startB.height = 40,  startB.width = 80
   startB.colorize('accent', '#FEC6CF')
     startB.colorize('fill', '#3F3030')
    startB.element.on('change', x=> {
      console.log(x)
      if(x) myGame.start()
        })
  startB.label = 'start'

  return { b, startB}
}
myGame.makeDisplay = ()=> mydisplay()

myGame.init()

//
let userInput = (num,val)=>{
  // console.log('played', num, val)
  if(val > 0) {
    myGame.audio.s.play(expr(i=>myGame.gui.b[num].note-7, (myGame.level_number)%8+1),'16n')
    myGame.targets = myGame.targets.filter(t => t.num !== num);
    myGame.gui.b[num].colorize('accent', myGame.color['default'])
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
  let newTarget = {'player':curPlayer, 'num':curNote}
  myGame.targets.push(newTarget)
  myGame.gui.b[curNote].colorize('mediumLight', myGame.playerColors[myGame.curPlayer])
  myGame.gui.b[curNote].colorize('accent', myGame.playerColors[myGame.curPlayer])
}
myGame.updateTarget = myFunc

myGame.init()

myGame.updateRate = 4
// console.log(myGame.updateRate)

