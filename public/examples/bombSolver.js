initCollab('uniqueName')

Theory.tempo = 100

let output = new Tone.Multiply(.1).toDestination()
let s = new Twinkle()
s.connect(output)
let d = new DrumSampler()
d.sequence('[* .] [x *] [. *] [x .] [* .] [x *] [. *] [x .] * [1 *] * [2 *] [* .] [x *] [. *] [x .]')
d.connect(output)

let b = new Rumble()
b.connect(output)
b.sequence('0 [. 0] 0 [. 0] 0 [. 0] 0 [. 0] 0 1 2 4 0 [. 0] 0 [. 0]')
b.octave = 0
// s.initGui()]

s.sequence('[0, 4] [. 0] [0 5] [4, 7] [0, 4] [. 0] [0 5] [4, 7]  [0, 4] [0 3] [4 .] [0, 2] [0, 1] [0, 1] [. 4] [3, 0]', '16n')
s.octave = 1
s.duration = .01

s.vco.type= 'sine'

let dist = new Distortion()
b.connect(dist)
dist.connect(output)

dist.initGui()

s.envDepth = -20000

b.initGui()



let verb = new Reverb()
verb.connect(output)
s.connect(verb)
verb.type = 'hall'
verb.level = .1

let buttonStates = [0,0,0,0]
let targetPattern = [0,2,0,1,3]
let enteredPattern = []

let handleButtons = (num)=>{
  if(buttonStates[0] == 1)  bb.colorize('fill', '#FF0')
  enteredPattern.push(num)

  if( targetPattern == enteredPattern){
    //
    //do something
  } else if ( enteredPattern.length > 4){
    //error
  } else{
    Theory.tempo = Theory.tempo + 10
  }
  console.log(targetPattern, enteredPattern)
}

console.log( [0,1,2,3] == [0,1,2,3])


let ba = new NexusButton()
ba.x = .2
ba.y = .2
ba.element.on('change', x=> {
  if( x['state'] == true) {
    console.log(x)
    buttonStates[0] = 1
  }
  else buttonStates[0] = 0
  handleButtons(0)
})
ba.colorize('fill', '#F00')


let bb = new NexusButton()
bb.x = .7
bb.y = .7
bb.element.on('change', x=> {
  if( x['state'] == true) console.log(x)
  handleButtons(1)
})
bb.colorize('fill', '#0F0')

let bc = new NexusButton()
bc.x = .7
bc.y = .2
bc.element.on('change', x=> {
  if( x['state'] == true) console.log(x)
})
  
let bd = new NexusButton()
bd.x = .2
bd.y = .7
bd.element.on('change', x=> {
  if( x['state'] == true) {
    console.log(x)
    handleButtons(2)
  }
  
})

let breset = new NexusButton()
breset.x = .5
breset.y = .5
breset.width = 50
breset.element.on('change', x=> {
  if( x['state'] == true) console.log(x)
  enteredButton = []
})
