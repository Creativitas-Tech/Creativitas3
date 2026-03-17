//define audio objects
let vco = new Tone.Oscillator().start()
let vca = new Tone.Multiply()
let env = new Tone.Envelope()
let output = new Tone.Multiply(0.1).toDestination()
vco.connect(vca), vca.connect(output)
env.connect(vca.factor)

//
//create a note array to analyze
let myMelody = []
myMelody = [60, 62, 60, 64, 60, 65, 64, 65, 62, 64, 65, 67, 60, 67, 65, 67, 64, 67, 62, 67, 60, 67, 64, 62, 60, 64, 62, 64, 60, 65, 60, 62, 62, 64, 65, 62, 65, 62, 64, 60, 62, 64, 65, 67, 65, 64, 62, 60, 67, 65, 64, 62, 60, 69, 67, 65, 64, 62, 71, 69, 67, 65, 64, 72, 71, 69, 67, 65, 74, 72, 71, 69, 67, 72, 74, 71, 72, 69, 71, 67, 69, 65, 67, 64, 65, 62, 64, 60, 74, 60, 72, 60, 71, 60, 69, 60, 67, 60, 65, 60]
//or make myMelody an empty array and add notes via keyboard
//myMelody = []
setNoteOnHandler( (note,vel)=>{
  vco.frequency.value = Tone.Midi(note).toFrequency()
  env.triggerAttackRelease(.1)
  myMelody.push(note)
  console.log('notes', myMelody)
})

/*** Create Markov Transition Table ***/
let order = 3; //number of previous notes to look at
let ngrams = {}
let i, gram 
//
//analyze our array and generate our probability table
let createMarkovTable = function(arr){
  //for every ngram in our array of length==order
  for(i=0;i<=arr.length - order - 1;i++){
    //make an array of size==order, fill with ngram starting at element i
    gram = arr.slice(i, i + order );
    //if this ngram doesn't exist, create an empty array
    if (!ngrams[gram]) ngrams[gram] = [];
    //add the next note following our ngram
    ngrams[gram].push(arr[i + order]);
  }
}
createMarkovTable(myMelody)
console.log("my melody", myMelody)
console.log('ngrams', ngrams)

/*** Generate new melodies ***/
//start off with the first ngram from our melody
let startGram = myMelody.slice(0,order)
let prevGram = startGram
//
let playNote = function(){
  //look for the available next elements based on our current ngram
  let nextVals = ngrams[prevGram]
  if(nextVals == undefined) nextVals = startGram //error handling
  let note = nextVals [Math.floor( Math.random()*nextVals.length)]
  let freq = Tone.Midi(note).toFrequency()
  //trigger audio
  vco.frequency.value = freq
  env.triggerAttackRelease(0.1)
  //prepare next ngram
  prevGram = prevGram.slice(1,order)
  prevGram.push(note)
}
let mySeq = setInterval(playNote, 200)

//clearInterval( mySeq)