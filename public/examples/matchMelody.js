let output = new Tone.Multiply(.1).toDestination()
let gui = new p5(sketch, Canvas)
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
let octaveA = new NexusDial(.90,.45,20)
octaveA.min = -2
octaveA.max = 3
octaveA.curve = 1
octaveA.mapTo(x => {
    s.octave = Math.floor(x);
} )
octaveA.colorize('accent', '#8200C8')
octaveA.width = 40
octaveA.x=.9
octaveA.y=.06
console.log(octaveA)

let octaveB = new NexusDial(.90,.45,20)
octaveB.min = -2
octaveB.max = 3
octaveB.curve = 1
octaveB.mapTo(x => {
    s2.octave = Math.floor(x);
} )
octaveB.colorize('accent', '#8200C8')
octaveB.width = 40
octaveB.x=.9
octaveB.y=.3
console.log(octaveB)


//==part function==
let part1=true
let part2=true
let seq1 = ['.','.','.','.','.','.','.','.']
let seq2 = ['.','.','.','.','.','.','.','.']
s.sequence(". . . . . . . .","8n")
// s.stop()
s2.sequence(". . . . . . . .","8n")

let button1 = new NexusTextButton({
  label:'A Enable', altText:'A Disable',
  x:.02, y:.3, size:.5, mode:'toggle',
  accentColor:'#FFF', borderColor:'#FF0000',
  width:2, height: .5, textColor:'#000', value:true
})
button1.textColor = '#000'
button1.altText = 'A Disable'

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
  
let button2 = new NexusTextButton({
  x:.02, y:.7, size:.5, label:'B Enable',
  accentColor:'#FFF', borderColor:'#FF0000',
  width:2, height: .5, textColor:'#000', value: true
})
button2.altText = 'B Disable'
button2.textColor = '#000'
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


//==timer==
let curLevel = 1
let timeLeft = 80;
let timerDisplay = gui.Text({
  label: 'time: 80',
  x: 85, y: 8,
  textSize: 1.2,
  textColor: [255, 255, 255]
});
 let finalScore =  0

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

//==faders/toggles for blue and red==
gui.backgroundColor = [100,200,255]
let notes = []
let notes2 = []
let keySpacing = 10
let enableButton = []
let enableButton2 = []
let vals = ['.','.','.','.','.','.','.','.']

const SLIDER_X = .15
const SLIDER_OFFSET = .11
for(let i=0;i<8;i++){
    notes.push(new NexusSlider({
      x:SLIDER_X + i*SLIDER_OFFSET, y:.5, size:1, mode:'toggle',
      accentColor:'#FFF', borderColor:'#FF0000',
      width:.3, height:1.2
    }))

    notes[i].callback = x=> {
      if(1) {
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
      x:SLIDER_X + i*SLIDER_OFFSET, y:.35, size:0.25, mode:'toggle',
      accentColor:'#FFF', borderColor:'#FF0000'
    }))
    enableButton[i].callback = x=> {
      s.seq[0].vals[i] = x ? seq1[i] : '.' 
    }


}


//the red on3
for(let i=0;i<8;i++){
    notes2.push(new NexusSlider({
      x:SLIDER_X + i*SLIDER_OFFSET, y:1, size:1, mode:'toggle',
      accentColor:'#FFF', borderColor:'#FF0000',
      width:.3, height:1.2
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
      x:SLIDER_X + i*SLIDER_OFFSET, y:.75, size:0.25, mode:'toggle',
      accentColor:'#FFF', borderColor:'#FF0000'
    }))
    enableButton2[i].callback = x=> {
      s2.seq[0].vals[i] = x ? seq2[i] : '.' 
    }

}

let bestScore = 0;

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

let scorekeep = gui.Text({
  label: 'p1: 0',
  x: 95, y: 8,
  textSize: 1.2,
  textColor: [255, 255, 255]
})

let bestScoreDisplay = gui.Text({ //my best score system
  label: 'Best: 0',
  x: 95, y: 15, 
  textSize: 0.8,
  textColor: [255,255,255]
});

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
      console.log(diff)
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
console.log(ans)

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
  button1.set(0)
  button2.set(0)
  part1=false;
  part2=false;
  s.stop()
  s2.stop()
  // timeLeft = 80
  // timerDisplay.label = 'Time: 80'
  console.log("round reset")
};

let resetButton = new NexusButton({x:.05,y:.35,size:.5})
resetButton.colorize('accent', '#F00')
resetButton.colorize('fill', '#FFF')
resetButton.colorize('dark', '#FF0000')
resetButton.colorize('light', '#FF0000')
resetButton.colorize('mediumDark', '#FF0000')
resetButton.colorize('mediumLight', '#0F0')
resetButton.x=SLIDER_X+.4
resetButton.y=.0
resetButton.element.on('change',function(){
  if(!x.state) return
  resetEverything()
})

let finishButton = new NexusButton({x:.05,y:.35,size:.5})
finishButton.colorize('accent', '#F00')
finishButton.colorize('fill', '#FFF')
finishButton.colorize('dark', '#FF0000')
finishButton.colorize('light', '#FF0000')
finishButton.colorize('mediumDark', '#FF0000')
finishButton.colorize('mediumLight', '#0F0')
finishButton.x=SLIDER_X+.5
finishButton.y=.0
finishButton.element.on('change', function(){
  if(!x.state) return
    timeLeft=1
    timerDisplay.label="Time: 1"
})


let newA = new NexusButton({x:.05,y:.1,size:.5})
newA.colorize('accent', '#FFF')
newA.colorize('fill', '#00F')
newA.colorize('dark', '#FF0000')
newA.colorize('light', '#FF0000')
newA.colorize('mediumDark', '#FF0000')
newA.colorize('mediumLight', '#0F0')
newA.x=SLIDER_X
newA.y=.0
newA.element.on('change', () => {
  if(!x.state) return
    timeLeft = 80
    timerDisplay.label = 'Time: 80'
    button5.set(1)
    part1=true;
    s.start()
  })

let newB = new NexusButton({x:.05,y:.1,size:.5})
newB.colorize('accent', '#FFF')
newB.colorize('fill', '#F00')
newB.colorize('dark', '#FF0000')
newB.colorize('light', '#FF0000')
newB.colorize('mediumDark', '#FF0000')
newB.colorize('mediumLight', '#0F0')
newB.x = SLIDER_X+.1
newB.y=.0
newB.element.on('change', () => {
  if(!x.state) return
    timeLeft = 80
    timerDisplay.label = 'Time: 80'
    button6.set(1)
    part2=true;
    s2.start()
  })

let newC = new NexusButton({x:.05,y:.1,size:.5})
newC.colorize('accent', '#FFF')
newC.colorize('fill', '#0F0')
newC.colorize('dark', '#FF0000')
newC.colorize('light', '#FF0000')
newC.colorize('mediumDark', '#FF0000')
newC.colorize('mediumLight', '#0F0')
newC.x=SLIDER_X+.2
newC.y=0.0
newC.element.on('change', () => {
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


// //==radiobutton==
// let presets = gui.RadioButton({
//   label: 'types', 
//   x:58, y:8, 
//   size:0.5, 
//   radioOptions:['preset1', 'preset2', 'preset3', 'preset4'],
//   callback: x=> {
//     if(x == 'preset1'){
//       s.loadPreset("default")
//       s2.loadPreset("default")
//       gui.backgroundColor = [100, 200, 255]
//       for(let i = 0; i < 8; i++) {
//         if (i < 4) {
//           setStepActive(i, true);
//         } else {
//           setStepActive(i, false);
//         }
//       }
//     }

//     if(x == 'preset2'){
//       s.loadPreset('banjo')
//       s2.loadPreset('guitar')
//       gui.backgroundColor = [100, 200, 255]
//       for(let i = 0; i < 8; i++) {
//         if (i < 4) {
//           setStepActive(i, true);
//         } else {
//           setStepActive(i, false);
//         }
//       }
//     }
    
//     if(x == 'preset3'){
//       s.loadPreset("brass")
//       s2.loadPreset("marimba")
//       gui.backgroundColor = [20, 50, 120]
//       for(let i = 0; i < 8; i++) {
//         setStepActive(i, true);
//       }
//     }
    
//     if(x == 'preset4'){
//       s.loadPreset("flute")
//       s2.loadPreset("chirp")
//       for(let i = 0; i < 8; i++) {
//         setStepActive(i, true)
//       }
//     }
    
//   },
//   orientation: 'horizontal',
//   textColor: [255, 255, 255],
//   border: 2,        
// })
// presets.setLink('presettype')
// presets.size = 0.5