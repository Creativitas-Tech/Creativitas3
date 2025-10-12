//audio objects and connections
const s = new Polyphony(Daisy, 16)
const d = new DrumSampler()
const output = new Tone.Multiply(.1).toDestination()
const verb = new Diffuseur()
d.connect(output)
s.connect(output)
s.connect(verb), verb.connect(output)
output.factor.value = .2
d.volume = .2
s.output.factor.value = 1
s.setADSR(.01,.1,.5,.2)
s.setFilterADSR(.01,.1,.5,.2)
s.setSustain(.1)

//* True random frequencies **/
// let vco = new Tone.Oscillator()
// vco.start()
// let seq = setInterval(()=>{
//   vco.frequency.value = random()*200+250
// }, 100)
// vco.stop()
// clearInterval(seq)

//EUCLIDIAN RHYTHMS
let euc = function(hits,length = 16,rotation = 0){
  let arr = []
  let total = 0
  for(let i=0;i<length;i++){
    total+=hits
    if(total >= length) {
      arr.push(1)
      total -= length
    }
    else arr.push(0)
  }
  rotation += 1
  while( rotation < 0 ) rotation += length
  rotation = length - rotation%length
  arr = arr.slice(rotation).concat(arr.slice(0, rotation));
  return arr
}

//using euclidian rhythms
d.expr(i=> euc(9,16,3)[i%16]==1 ? '*' : '.',16)
//d.expr(i=> euc(2,8)[i%8]==1 ? 'o' : '.',16, '16n', 1)
//d.expr(i=> euc(2,16,8)[i]==1 ? 'x' : '.',16, '16n', 2)
d.drawing.enable()
d.seqToDraw=[0,1,2]

//using waveforms to generate sequences

s.expr(i=> sin(i*PI*1.34)*4+4)
s.drawing.enable()

s.expr(i=> sin(i*PI*.1)*2+4 + sin(i*PI*.2)*4)
s.expr(i=> sin(i*PI*.1 + sin(i*PI*0.05)*4)*2, 64)

//triangle doesn't use PI
s.expr(i=> tri(i*.2)*4+4)
//square is easy!
s.expr(i=> i/2%4>=2 ? 1 : 0)
//also can use random
s.expr(i=> random()*4)
//or a smooth out random by adding in the previous value
s.expr(i=> s.seq[0][i]*.8 + random()*6*.2)

//using .peek to get a value from an existing array
// let seq =[0,2,4,5,4,'5b',7,8]
// let x = 1
// let y = 9
// s.expr(i=> seq.peek(i%y%8+x))
