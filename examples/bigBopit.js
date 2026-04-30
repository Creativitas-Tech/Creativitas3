//Bopit

let colors = {
  'border': '#777',
  'accent': '#FFF',
  'text': '#000',
  'alt': '#222'
  }
let playerPoints=  [0,0,0,0]
let root = 0

const seq1 = [0,1,2,3]
const seq4 = [4,5,6,7]
const seq3 = [-2,-1,0,1]
const seq2 = ['O','*','X','*']
const seqs = []
seqs.push(seq1)
seqs.push(seq2)
seqs.push(seq3)
seqs.push(seq4)

let myGame = new Game()
//
let mysynth = (val)=>{
  const output = new Tone.Multiply(.1).toDestination()
  const s = []
  for(let i=0;i<4;i++){
    s.push(new Twinkle)
  }
  let pan1 = new Tone.Panner()
  s[0].connect(pan1)
  pan1.connect(output)
  pan1.pan.value = -1
  let pan2 = new Tone.Panner()
  s[2].connect(output)
  s[3].connect(pan2)
  pan2.connect(output)
  pan2.pan.value = 1

  const d = new DrumSampler()
  const delay = new Delay()
  s[0].connect(delay)
  s[3].connect(delay)
  delay.connect(output)
  delay.loadPreset('LoFi')
  delay.level = .3
  delay.time = 120/Theory.tempo*3/4

  s[2].loadPreset('guitar')
  s[3].loadPreset('piano')
  s[0].loadPreset('pluck')
  d.loadKit('breakbeat9')
  
  d.connect(output)

  //Synth settings
  const setSynth = ()=>{
    s[2].octave = -1
    s[3].octave = 1
    s[3].velocity = 65
    s[0].velocity = 80
    s[2].velocity = 127
    
    s[3].envDepth = 2000
    s[3].duration = .5
    s[3].release=  .1

    s[3].cutoff = 1800
    s[3].envDepth = 1500
    s[3].keyTrack = 1

    
    s[0].Q = 6
    s[0].release = .3
    
    s[2].release = .5
    s[2].sustain = .1
    s[2].duration = .3
    s[2].cutoff = 200
    s[2].envDepth = 2000

    
    d.level = 5
    d.kick_vca = 1
    d.snare_vca = .4
    d.hat_vca = .8
  }
  setTimeout(setSynth, .5)

  return {s:s, output:output, d:d, delay:delay}
}
myGame.makeSynth = ()=> mysynth()

myGame.curPlayer = 0

myGame.numPlayers = 4
myGame.playersInGame = []
myGame.playerColors = ['#F00', '#0F0', '#00F', '#0FF']
myGame.curPlayer = 0
myGame.points = [0,0,0,0]

//
let mydisplay = ()=>{
  let b = []
  let points = []
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

  }

  let pColors = ['red', 'green', 'blue', 'aqua']
  let startButtons = []
  for(let i=0;i<4;i++){
    startButtons.push(new NexusTextButton({
      x:Math.floor(i/2)*.85+.025, y:i%2*.8,size:1, label:'JOIN',
      textColor:'#000', borderColor:myGame.playerColors[i],
    }))
    startButtons[i].altText = 'PLAY'

    startButtons[i].element.on('change', x=> {
      if (x) {
        if (myGame.playersInGame.includes(i)) {
          //myGame.playersInGame = myGame.playersInGame.filter(player => player !== i);
        } else {
          myGame.playersInGame.push(i);
        }
        // 2. Check game start condition (e.g., if we now have players)
        // if (myGame.playersInGame.length  == 1) {
        //   myGame.init(); 
        // }
      } else {
        if (myGame.playersInGame.includes(i)) {
          myGame.playersInGame = myGame.playersInGame.filter(player => player !== i);
        } else {
          //myGame.playersInGame.push(i);
        }
      }
    })//startButtons

    let resetButton = new NexusTextButton({
      x:.025, y:.5, size:.5, label:'RESET',
      textColor:'#000', borderColor:'#FFF'
    })

    resetButton.element.on('change', x=> {
      if (x) {
        console.log(x)
        myGame.reset()
      }
    })

    //point counters
    points.push(new NexusText({
      x:Math.floor(i/2)*.85+.025, y:0.25 + (i%2)/2*.3,
      label:'0', textColor:myGame.playerColors[i], size:2
    }))
  }

  return { 'b':b, 'points':points, 'startButtons':startButtons}
}
myGame.makeDisplay = ()=> mydisplay()

myGame.reset = ()=>{
  levelUp(0)
  playerPoints = [0,0,0,0]
  updatePlayerPoints()
  for(let i=0;i<4;i++) myGame.gui.startButtons[i].turnOff()
}

const updatePlayerPoints = ()=>{
  for(let i=0;i<4;i++){
    myGame.gui.points[i].text = playerPoints[i].toString()
  }
  //console.log('points', playerPoints)
}


//myGame.init()

//
let userInput = (num,val)=>{
  //console.log('played', num, val, myGame.targets)

  if(val > 0) {
    const isTarget = myGame.targets.find(t => t.num === num);
    if(isTarget){
      const playerID = isTarget.player
      //play audio
      let seqLength = playerPoints[playerID]
      if( seqLength== 0 ) seqLength = 1
      let seq = seqs[playerID].slice(0,playerPoints[playerID]+1)
      let rate = '8n'
      if( playerPoints[playerID] > 8) rate = '16n'
      if( playerID==1){
        myGame.audio.d.play(seq,rate,1)
      }
      else {
        myGame.audio.s[playerID].play(seq,rate)
      }

      myGame.targets = myGame.targets.filter(t => t.num !== num);
      myGame.gui.b[num].borderColor = colors.border
      myGame.gui.b[num].size = 1
      //console.log(myGame.gui.b[num], colors.border)
      playerPoints[playerID] += 1
      updatePlayerPoints()
    }
  }
}
myGame.onUserInput = userInput

//
let onBar = (time)=>{
  //console.log('BAR')
  if(myGame.curBar%4 == 0){
    myGame.chord = Math.floor(Math.random()*6)
    let root =  myGame.chord
    // myGame.audio.s.sequence([
    //   root,
    //   root+Math.floor(Math.random()*3*2+4),
    //   root+Math.floor(Math.random()*1*2+2),
    //   root+Math.floor(Math.random()*3*2+4)
    // ], '8n',1)
    //myGame.audio.s.seq[1].velocity = 60
    myGame.level_number = Math.floor(playerPoints.reduce((a,b)=> a+b,0))
    
    levelUp(Math.floor(myGame.level_number/8))
    //myGame.audio.d.sequence(Array.from({length:16},(x,i)=>i%3==0 ? 'O' : '*'))
  }
}
myGame.onBar = onBar

const levelUp = (level)=>{
  console.log('level up', level)
  level = Math.floor(level/2)
  if(1) {
    Theory.tempo = 50 + level*5
    console.log('tempo', Theory.tempo)
    root = (root+4)%7
    myGame.audio.s[0].transform = x=>x+root
    myGame.audio.s[2].transform = x=>x+root
    myGame.audio.s[3].transform = x=>x+root
    seqs[0] = expr(i=> (Math.random()*level+i)%9,16)
    //seqs[2] = expr(i=> (Math.random()*level+i)%9,16)
    seqs[2] = expr(i=> Math.floor(i/((level+1)/8))%3*2,16)
    //seqs[2] = expr(i=> i%level%8+Math.random()*2,16)
    seqs[3] = expr(i=> 7-(Math.random()*level+i*2)%9,16)
    // seqs[1] = expr(i=> 
    //   i%Math.floor(level/3+1)%8%4==0 ? 'O' :
    //   [4,level%3+1].includes(i%8) ? 'X' :
    //   6-i%level < 2 ? '*' : '.',
    //   32
    //   )
    seqs[1] = ['O','*,','*','o','X','*','o','*','O','x','*','o','X','*','^','x']
    console.log(seqs)
    myGame.audio.delay.time = 120/Theory.tempo*3/8
  }

}

let totalPts = 0
myGame.onBeat = (time)=>{
  totalPts = 0
  if( playerPoints.length > 1) {
    totalPts = playerPoints.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    totalPts = totalPts / myGame.playersInGame.length
  }
  if( myGame.level_number % 4 == 0) myGame.updateRate = 4 - (Math.floor(myGame.level_number/4)%3)
  if( (myGame.curBar*4+myGame.curBeat) % myGame.updateRate==0){
    myGame.updateTarget(myGame.chord)
  }
  myGame.updateTarget(myGame.chord)
  //console.log(myGame.updateRate, (myGame.curBar*4+myGame.curBeat) % myGame.updateRate)
}

let myFunc = (root)=>{
  const numPlayers= myGame.playersInGame.length
  //console.log('in game', myGame.playersInGame)
  if( numPlayers < 1) return
  else if( numPlayers == 1) myGame.curPlayer = myGame.playersInGame[0]
  else{
    let prevPlayer = myGame.playersInGame.indexOf(myGame.curPlayer)
    let playerWeights = playerPoints.filter((x,i)=>myGame.playersInGame.includes(i))
    playerWeights = playerWeights.map(x=>x+5)
    // playerWeights[prevPlayer] /= 4
    myGame.curPlayer = choosePlayer(playerWeights, prevPlayer)
    //myGame.curPlayer = Math.floor(Math.random()*numPlayers)
    //if(myGame.curPlayer == prevPlayer) myGame.curPlayer = Math.floor(Math.random()*numPlayers) 
    //console.log('which', [prevPlayer, myGame.curPlayer], myGame.playersInGame[myGame.curPlayer])
    myGame.curPlayer = myGame.playersInGame[myGame.curPlayer]
  }

  //check if a player hasn't matched their target yet
  const hasMatch = myGame.targets.find(t => t.player === myGame.curPlayer);

  if (hasMatch) {
    myGame.targets = myGame.targets.filter(t => t.player !== myGame.curPlayer);
    myGame.gui.b[hasMatch.num].borderColor = colors.border
    playerPoints[hasMatch.player] -= 1
    if(playerPoints[hasMatch.player] < 0) playerPoints[hasMatch.player] = 0
    updatePlayerPoints()
  }

  myGame.played = []
  let curNote = Math.floor(Math.random()*23)//*6+root
  let newTarget = {'player':myGame.curPlayer, 'num':curNote}
  myGame.targets.push(newTarget)
  myGame.gui.b[curNote].colorize('mediumLight', myGame.playerColors[myGame.curPlayer])
  myGame.gui.b[curNote].colorize('accent', myGame.playerColors[myGame.curPlayer])
}
myGame.updateTarget = myFunc

const choosePlayer = (playerWeights, prev)=>{
  //console.log(playerWeights)
  let totalWeight = playerWeights.reduce((sum, p) => sum + p, 0);
  playerWeights = playerWeights.map(x=> totalWeight-x)
  playerWeights[prev] /= 4
  totalWeight = playerWeights.reduce((sum, p) => sum + p, 0);

  let random = Math.random() * totalWeight;
  let cursor = 0;

  // 4. Find which player "owns" that spot
  let i = 0
  for (let weight of playerWeights) {
    cursor += weight;
    if (random <= cursor) {
      return i;
    }
    i+=1
  }
}

myGame.init()

myGame.updateRate = 4
// console.log(myGame.updateRate)

