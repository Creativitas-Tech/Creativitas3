const BUTTON_X = .02
const TOP_Y = .02
const SLIDER_X = .15
const SLIDER_OFFSET = .09
const ROW_1_Y = .3
const ROW_2_Y = .7
const FADER_BUTTON_OFFSET = .07
const PLAYER_A_COLOR = "#FF0000"
const PLAYER_B_COLOR = "#0000FF"
const ENABLE_BUTTON_X_OFFSET = 0.01

const colors = {
      'background': "#7AF",
      'border': "#800",
      'accent': "#75523f",
      'mid': "#e9b74c",
      'text': "#FFF"
}

setTimeout(()=>Nexus.backgroundColor = colors.background, 100)


let output = new Tone.Multiply(.1).toDestination()
let s = new Twinkle()
s.connect(output)
let s2 = new Twinkle()
s2.connect(output)
let verb = new Reverb ()
verb.connect(output)
s.connect(verb)
verb.type = 'hall'
verb.level = 0.2
let b = new Rumble()
b.connect(output)
b.sequence('-0.......')
let d = new DrumSampler()
d.sequence('**.* **')
d.connect(output)
let dist = new Distortion()
dist.connect(output)
s2.connect(dist)
dist.type = 'fold'
dist.level = 0.7
//==octave function==
let octaveA = new NexusDial({
  label:'octave',
  x: .90, y: ROW_1_Y, size: 0.5,
  min:-2, max: 3, accentColor:PLAYER_A_COLOR,
  borderColor: colors.border
})
octaveA.mapTo(x => {
    s.octave = Math.floor(x);
} )
// console.log(octaveA)
//
let octaveB = new NexusDial({
  label:'octave',
  x: .90, y: ROW_2_Y, size: 0.5,
  min:-2, max: 3, accentColor:PLAYER_B_COLOR,
  borderColor: colors.border
})
octaveB.mapTo(x => {
    s2.octave = Math.floor(x);
} )
// console.log(octaveB)


//==part function==
let part1=true
let part2=true
let seq1 = ['.','.','.','.','.','.','.','.']
let seq2 = ['.','.','.','.','.','.','.','.']
s.sequence(". . . . . . . .","8n")
// s.stop()
s2.sequence(". . . . . . . .","8n")
//
let button1 = new NexusTextButton({
  label:'A Enable', altText:'A Disable',
  x:BUTTON_X, y:ROW_1_Y, size:.5, mode:'toggle',
  borderColor:"#ddd", accentColor:PLAYER_A_COLOR,
  textColor:colors.text,
  width:2, height: .5,  value:true
})
button1.altText = 'A Disable'
//
button1.element.on('change', (x)=>{
    if(x) {
      //part1=true
      s.start()
    }
    else {
      //part1=false
      s.stop()
    }
})
  //
let button2 = new NexusTextButton({
  x:BUTTON_X, y:ROW_2_Y, size:.5, label:'B Enable',
  borderColor:"#ddd", accentColor:PLAYER_B_COLOR,
  textColor:colors.text,
  width:2, height: .5, value: true
})
button2.altText = 'B Disable'
button2.element.on('change', (x)=>{
  console.log(x)
    if(x) {
      //part2=true
      s2.start()
    }
    else {
      //part2=false
      s2.stop()
    }
})
let scorekeep = new NexusText({
  label:'Score', size:1, height:.5,
  x:.5, y:TOP_Y, accentColor:'#0000c8',
  textColor:colors.text

})
scorekeep.text = 'Score'
//
let bestScoreDisplay = new NexusText({
  label:'Score', size:1, height:.5,
  x:.5, y:TOP_Y+.1,accentColor:'#0000c8',
  textColor:colors.text
})
bestScoreDisplay.text = 'Best:'
//
let timerDisplay = new NexusText({
  label:'Score', size:1, height:.5,
  x:.75, y:TOP_Y, accentColor:'#0000c8',
  textColor:colors.text
})
timerDisplay.text = 'Timer:'


//==timer==
let curLevel = 1
let timeLeft = 80;
 let finalScore =  0
//
let loop = new Tone.Loop(time =>{
    if (timeLeft >= 16) {//set timeLEft to 64 + 16
    timeLeft--;
    timerDisplay. label = 'Time: ' + timeLeft;
  } else if (timeLeft > 0) {
    timerDisplay. label = "time is up";
    part1=false
    part2=false
    finalScore = scoreMelody();
 } else {
      s.stop()
      s2.stop()
    }
}, '2n').start()
//
//==faders/toggles for blue and red==
// gui.backgroundColor = [100,200,255]
let notes = []
let notes2 = []
let keySpacing = 10
let enableButton = []
let enableButton2 = []
let vals = ['.','.','.','.','.','.','.','.']
//
for(let i=0;i<8;i++){
    notes.push(new NexusSlider({
      x:SLIDER_X + i*SLIDER_OFFSET, y:ROW_1_Y+FADER_BUTTON_OFFSET, size:1, mode:'toggle',
      borderColor:'#FFF', accentColor:PLAYER_A_COLOR,
      width:.5, height:1.2
    }))

    notes[i].callback = x=> {
      if(1) {
        console.log(i, s2.seq[0], seq1)
        if(x==0) {
          
          s.seq[0].vals[i]='.'
          enableButton[i].turnOff()
          seq1[i] = '.'
        }
        else {
          seq1[i] = Math.floor(x*7)
          s.seq[0].vals[i]= seq1[i]
          enableButton[i].turnOn()
        }
        scoreMelody();
      }
    }

    enableButton.push(new NexusButton({
      x:SLIDER_X + i*SLIDER_OFFSET + ENABLE_BUTTON_X_OFFSET, y:ROW_1_Y, size:0.25, mode:'toggle',
      borderColor:'#FFF', accentColor:PLAYER_A_COLOR
    }))
    enableButton[i].callback = x=> {
      s.seq[0].vals[i] = x ? seq1[i] : '.' 
    }
}
//
//the red on3
for(let i=0;i<8;i++){
    notes2.push(new NexusSlider({
      x:SLIDER_X + i*SLIDER_OFFSET, y:ROW_2_Y+FADER_BUTTON_OFFSET, size:1, mode:'toggle',
      borderColor:'#FFF', accentColor:PLAYER_B_COLOR,
      width:.5, height:1.2
    }))
    notes2[i].callback = x=> {
      if(1) {
        if(x==0) {
          enableButton2[i].turnOff()
          seq2[i] = '.'
          s2.seq[0].vals[i]='.'
        }
        else {
          enableButton2[i].turnOn()
          seq2[i] = Math.floor(x*7)
          s2.seq[0].vals[i] = seq2[i]
        }
        scoreMelody();
      }
    }

    enableButton2.push(new NexusButton({
      x:SLIDER_X + i*SLIDER_OFFSET + ENABLE_BUTTON_X_OFFSET, y:ROW_2_Y, size:0.25, mode:'toggle',
      borderColor:'#FFF', accentColor:PLAYER_B_COLOR
    }))
    enableButton2[i].callback = x=> {
      s2.seq[0].vals[i] = x ? seq2[i] : '.' 
    }
}
//
let bestScore = 0;
//
//==scoring system==
let int = (x)=>{
  if(x<0.5) return 0
  else if (x<1.5) return 1
  else if (x<2.5) return 2
  else if (x<3.5) return 3
  else if (x<4.5) return 4
  else if (x<5.5) return 5
  else if (x<6.5) return 6
  else if (x<7.5) return 7
  else if (x<8.5) return 8
}
//
let scoreMelody = ()=>{
  let points=0
  let harmonyPoints= {
    '0':2,
    '1':-2,
    '2':4,
    '3':1,
    '4':2,
    '5':2,
    '6':4,
    '7':-1,
    '8':3
  }
  for(let i=0;i<8;++i) {
    if(s.seq[0].vals[i]=='.'&&s2.seq[0].vals[i]=='.') continue
    else if(s.seq[0].vals[i]=='.'||s2.seq[0].vals[i]=='.') points=points-2
    else{
      let diff = s.seq[0].vals[i]-s2.seq[0].vals[i]
      if(diff<0) diff=-diff
      diff=int(diff)
      points+=harmonyPoints[diff]
      // console.log(diff)
    }
  }
  scorekeep.label = 'pts: '+ points
  if (points > bestScore) {
  bestScore = points;
  bestScoreDisplay.label = 'Best: ' + bestScore;
  }
  return points
}
let ans=scoreMelody()
// console.log(ans)
//
//==reset==
let resetEverything = () => {
  scorekeep.label = 'pts: 0'
  for (let i = 0; i < 8; i++) {
    s.seq[0].vals[i] = '.'
    notes2[i].set(0)
  }
  for (let i = 0; i < 8; i++) {
    s2.seq[0].vals[i] = '.'
    notes[i].set(0)     
  }
  button1.set(1)
  button2.set(1)
  part1=false;
  part2=false;
  s.stop()
  s2.stop()
  // timeLeft = 80
  // timerDisplay.label = 'Time: 80'
  console.log("round reset")
};
//
let resetButton = new NexusTextButton({
  label:'Reset', x:SLIDER_X+.2,y:TOP_Y,size:.5,
  accentColor:colors.background, borderColor:colors.border,
  textColor:colors.text,
})
resetButton.element.on('change',function(x){
  if(x) resetEverything()
})
//
let finishButton = new NexusTextButton({
  label:'Finish', x:SLIDER_X+.3,y:TOP_Y,size:.5,
  accentColor:colors.background, borderColor:colors.border,
  textColor:colors.text,
})
finishButton.element.on('change', function(x){
  if(!x.state) return
    timeLeft=1
    timerDisplay.label="Time: 1"
})
//
let newA = new NexusTextButton({
  label:'ALead', x:BUTTON_X,y:TOP_Y,size:1, height:.3,
  accentColor:colors.accent, borderColor:colors.border,
  textColor:colors.text,
})
newA.element.on('change', (x) => {
  if(!x.state) return
    timeLeft = 80
    timerDisplay.label = 'Time: 80'
    button5.set(1)
    part1=true;
    s.start()
  })
//
let newB = new NexusTextButton({
  label:'BLead', x:BUTTON_X,y:TOP_Y+.1,size:1, height:.3,
  accentColor:colors.accent, borderColor:colors.border,
  textColor:colors.text,
})
newB.element.on('change', (x) => {
  if(!x.state) return
    timeLeft = 80
    timerDisplay.label = 'Time: 80'
    button6.set(1)
    part2=true;
    s2.start()
  })
//
let newC = new NexusTextButton({
  label:'Both',x:BUTTON_X,y:TOP_Y+.2,size:1, height:.3,
  accentColor:colors.accent, borderColor:colors.border,
  textColor:colors.text,
})
newC.element.on('change', (x) => {
  if(!x.state) return
    timeLeft = 80
    timerDisplay.label = 'Time: 80'
    button5.set(1)
    button6.set(1)
    part1=true;
    part2=true;
    s.start()
    s2.start()
  })
