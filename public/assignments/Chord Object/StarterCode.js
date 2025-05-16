let s = new Polyphony(Twinkle)
let output = new Tone.Multiply(.1).toDestination()
s.connect( output )

s.initGui()
s.listPresets()
s.loadPreset('marimba')
s.sequence('.', '8n')
s.seq[0].sustain = .5

class ChordMachine {
  constructor( key = 'C', tempo = 120 ) {
    this.key = key;
    this.tempo = tempo;
    this.chords = []
    this.index
  }
  init(){
    Theory.root = this.key
    Theory.tempo = tempo
    Theory.start()
  }
  addChord(pitchArray) {
    this.chords.push( pitchArray )
  }
  get(index = this.index) { //return chord
    index = index % this.chords.length
    return this.chords[ index ];
  }
  getAll(){
    return JSON.stringify(this.chords)
  }
}

let mySong = new ChordMachine('G',100)
console.log(mySong)

mySong.addChord([0,2,4])
mySong.addChord([0,3,5])

s.sequence(mySong.getAll(), '2n')
s.octave = 0
