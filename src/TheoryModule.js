/**
 * The MusicGenerator class handles the generation and manipulation of musical elements such as chords, harmony, scales,
 * harmonic progressions, rhythmic attributes like tempo, beat, and time signature, and provides setters and getters
 * to interact with these properties.
 *
 * @class
 * 
 * @property {string} tonic - The tonic or root note (setter: `setTonic`), which can be set using `tonic`, `root`, or `key`.
 * @property {string} root - Alias for `tonic`, allows setting the root note (setter: `setTonic`).
 * @property {string} key - Alias for `tonic`, allows setting the key (setter: `setTonic`).
 * @property {string[]} progression - The chord progression (setter: `setProgression`).
 * @property {number} tempo - The tempo of the piece in beats per minute (BPM), controlled via Tone.js's `Tone.Transport.bpm`.
 * @property {string} scale - The scale type (e.g., 'major', 'minor') used for the chord progression.
 * @property {string} chord - The current chord in the progression.
 * @property {string} timeSignature - The time signature of the piece (e.g., '4/4').
 * @property {number} harmonicTempo - The harmonic tempo, or how quickly harmonic changes occur (in BPM).
 * @property {number} beat - The current beat in the measure.
 * @property {number} bar - The current bar of the piece.
 * @property {number} beatsPerBar - The number of beats in each bar.
 * 
 * @example
 * // Create an instance of the MusicGenerator class
 * const Theory = new MusicGenerator();
 * 
 * // Set the tonic
 * Theory.tonic = 'C';
 * 
 * // Set the progression
 * Theory.progression = ['I', 'IV', 'V'];
 * 
 * // Set the tempo
 * Theory.tempo = 120;
 * 
 */


import * as Tone from 'tone';
import * as Ornament from './Ornament.js'

class MusicGenerator {
  constructor() {
    this._tonic = 'C';
    this.tonicNumber = 0; // MIDI note of tonic, 0-11
    this.keyType = 'major';
    this.octave = 4;
    this.voicing = 'closed';
    this.previousChord = [];

    this._scale = 'major'; // Private variable for scale
    this._chord = 'I'; // Private variable for chord
    this._timeSignature = '4/4'; // Private variable for time signature
    this._harmonicTempo = 120; // Private variable for harmonic tempo
    this._beat = 0; // Private variable for beat
    this._bar = 0; // Private variable for bar
    this._beatsPerBar = 4;
    this._startingBar = 0;
    this._startingBeat = 0;
    this._barOffset = 0; // Store the tick offset to reset the index
    this._prevBarOffset = 0;
    this._ticks = 0

    this.pulsePerChord = 16;
    this.harmonicRhythm = 8;
    this.progressionChords = [];
    this._progression = [];

    this.scale = [0,2,4,5,7,9,11]
    this.scaleRatios = Array.from({ length: 12 }, (_, i) => Math.pow(2, i / 12));
    this.A4 = 440;
    this.A4_MIDI = 69;
    
    this.voicings = {
      "closed": [0, 2, 4, 6],
      "open": [0, 4, 6, 9],
      "drop2": [-3, 0, 2, 6],
      "drop3": [-1, 0, 3, 4]
    };
    this.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    this.noteToInterval = {
      'C': 0, 'B#': 12, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 
      'Fb': 4, 'E#': 5, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 
      'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11
    };
    this.chordIntervals = {
      "major": [0, 4, 7],
      "minor": [0, 3, 7],
      "dominant7": [0, 4, 7, 10],
      "minor7": [0, 3, 7, 10],
      "major7": [0, 4, 7, 11],
      "minorMaj7": [0, 3, 7, 11],
      "diminished": [0, 3, 6],
      "diminished7": [0, 3, 6, 9],
      "add9": [0, 4, 7, 14] // Major triad with added ninth
    };
    this.chordScales = {
      "major": [0, 2, 4, 5, 7, 9, 11],
      "minor": [0, 2, 3, 5, 7, 8, 10], // aeolian
      "lydianDominant": [0, 2, 4, 6, 7, 9, 10], //lydian dominant?
      "mixolydian": [0,2,4,5,7,9,10], //for V7
      "phrygianDominant": [0,1,4,5,7,8,10], //for minor V7
      "minor7": [0, 2, 3, 5, 7, 9, 10], //dorian
      "major7": [0, 2, 4, 5, 7, 9, 11],
      "minorMaj7": [0, 2, 3, 5, 7, 9, 11], //melodic minor
      "diminished": [0, 2, 3, 5, 6, 8, 9, 11],
      "diminished7": [0, 2, 3, 5, 6, 8, 9, 11],
      "add9": [0, 2, 4, 5, 7, 9, 11],
      "dorian": [0,2,3,5,7,9,10], //minor natural-6
      "phrygian": [0,1,3,5,7,8,10], //minor flat-2
      "lydian": [0,2,4,6,7,9,11], //major sharp-4
      "locrian": [0,1,3,5,6,8,10], //half-diminished
      "chromatic": [0,1,2,3,4,5,6,7,8,9,10,11] 
    };
    this.MajorScaleDegrees = {
      'I': 0, 'bII': 1, 'II': 2, 'bIII': 3,'III': 4, 'IV': 5, '#IV': 6, 
      'bV': 6,'V': 7,'#V': 8, 'bVI': 8,'VI': 9, 'bVII': 10,'VII': 11,
      'i': 0, 'bii': 1, 'ii': 2, 'biii': 3,'iii': 4, 'iv': 5, '#iv': 6, 
      'bv': 6,'v': 7, 'bvi': 8,'vi': 9, 'bvii': 10,'vii': 11 
    };
    this.MinorScaleDegrees = {
      'I': 0, 'bII': 1, 'II': 2, 'III': 3,'#III': 4, 'IV': 5, '#IV': 6, 
      'bV': 6,'V': 7,'#V': 8, 'VI': 8,'#VI': 9, 'VII': 10,'#VII': 11,
      'i': 0, 'bii': 1, 'ii': 2, 'iii': 3,'#iii': 4, 'iv': 5, '#iv': 6, 
      'bv': 6,'v': 7, 'vi': 8,'#vi': 9, 'bvii': 10,'vii': 11
    };
  }

  set tonic(value) {this.setTonic(value);}
  get tonic() {return this._tonic;}
  set root(value) {this.setTonic(value);}
  get root() {return this._tonic;}
  set key(value) {this.setTonic(value);}
  get key() { return this._tonic; }
  set progression(value) {this.setProgression(value);}
  get progression() {return this._progression;}
  set tempo(value) {Tone.Transport.bpm.value = value;}
  get tempo() {return Tone.Transport.bpm.value;}
  
  set scale(value) { this._scale = value;}
  get scale() { return this._scale;}
  set chord(value) { this._chord = value;}
  get chord() {   return this._chord; }
  set timeSignature(value) {  this._timeSignature = value; }
  get timeSignature() { return this._timeSignature; }
  set harmonicTempo(value) {  this._harmonicTempo = value; }
  get harmonicTempo() {   return this._harmonicTempo;  }

  //Tone.transport time setters
  //Transport info https://tonejs.github.io/docs/r13/Transport
  set beat(value) { 
    let pos = this.transportToArray(Tone.Transport.position)
    pos[1] = value
    Tone.Transport.position = this.arrayToTransport(pos)  
  }
  get beat() {   return  this.transportToArray(Tone.Transport.position)[1] }
  set bar(value) {  
    let pos = this.transportToArray(Tone.Transport.position)
    pos[0] = value
    Tone.Transport.position = this.arrayToTransport(pos)   
  }
  get bar() {  return this.transportToArray(Tone.Transport.position)[0] } 
  set beatsPerBar(value) {  
    this._beatsPerBar = value; 
    Tone.Transport.timeSignature = value
  }
  get beatsPerBar() {  return this._beatsPerBar; }
  set ticks(value) {  this._ticks = value }
  get ticks() {  return this.getTicks()+2; }
  set start(value=0){}
  get now() {
    const time = Tone.Transport.position.split(':').map(Number); // Split and convert to numbers
    return time[0] * 4 + time[1] + (time[2] || 0) / 4; // Handle undefined time[2]
  }

  getIndex(subdiv) { return Math.floor(this.ticks / Tone.Time(subdiv).toTicks()) }

  start(num=0){
    Tone.Transport.position = this.arrayToTransport([num,0,0])
    Tone.Transport.start()
  }
  stop(){ Tone.Transport.stop()}

  transportToArray(position){ return position.split(':').map(Number);}
  arrayToTransport(arr){return arr.join(':')}

  onBar(cb, bar){
    Tone.Transport.schedule(cb, this.arrayToTransport([bar,0,0]))
  }
  /**
 * Sets the tonic (root note) of the scale or chord and updates related properties like key type and octave.
 * Accepts either a string representing a musical note (e.g., "C4", "G#3") or a MIDI note number.
 *
 * If the input is a string, the tonic is derived from the note part, and the key type is determined based on 
 * whether the note is uppercase (for major keys) or lowercase (for minor keys). The octave is set from 
 * the numeric part of the string.
 *
 * If the input is a number, it is treated as a MIDI note number, and both the tonic and octave are computed.
 *
 * @param {string|number} val - The tonic value. Can be a musical note (e.g., "C4", "g#") or a MIDI note number.
 *
 * @example
 * // Set tonic using a musical note string
 * setTonic('C4'); // Sets tonic to 'C', key type to 'major', octave to 4
 * 
 * @example
 * // Set tonic using a MIDI note number
 * setTonic(60); // Sets tonic to 'C', key type remains unchanged, octave to 4
 */
  setTonic(val) {
    if (typeof val === 'string') {
      const noteRegex = /[A-Ga-g][#b]?/;
      const numberRegex = /\d+/;
  
      const noteMatch = val.match(noteRegex);
      const numberMatch = val.match(numberRegex);
      const prevKeyType = this.keyType
  
      if (noteMatch) {
        this._tonic = noteMatch[0].toUpperCase();
        this.keyType = noteMatch[0] === noteMatch[0].toUpperCase() ? 'major' : 'minor';
        if(this.keyType !== prevKeyType) this.progression = []
      }
  
      if (numberMatch) {
        this.octave = parseInt(numberMatch[0], 10);
      }
    } else if (typeof val === 'number') {
      this.octave = Math.floor(val / 12) - 1;
      const noteIndex = val % 12;
      this._tonic = this.notes[noteIndex];
    }
  
    this.tonicNumber = this.noteToInterval[this._tonic];
    console.log(`Tonic: ${this._tonic}, Number: ${this.tonicNumber}, Key Type: ${this.keyType}, Octave: ${this.octave}`);
  }

  /**
  * Sets the chord progression and validates the input.
  * The progression can be passed as either a string or an array of strings representing chords.
  * 
  * If provided as a string, it will split the string into an array by spaces or commas. Each chord
  * in the progression is validated by checking its Roman numeral and corresponding scale type.
  * 
  * If the progression is valid, it is stored and the corresponding chord objects are generated.
  * In case of an error, a message is logged indicating the problematic chord element.
  *
  * @param {string|string[]} val - The chord progression, either as a string (e.g., "I IV V") or an array of chord strings.
  *
  * @example
  * // Set progression using a string
  * setProgression('I IV V');
  * 
  * @example
  * // Set progression using an array of chords
  * setProgression(['I', 'IV', 'V']);
  */
  setProgression(val) {
    let newProgression = [];
    let error = -1;
  
    if (val.constructor !== Array) {
      val = val.replaceAll(',', ' ').split(' ');
    }
  
    for (let i = 0; i < val.length; i++) {
      let chord = val[i];
      try {
        if (val[i] !== '') {
          const romanNumeral = chord.match(/[iIvVb#]+/)[0];
          const quality = this.getChordType(chord);
          console.log(chord, quality)
          if (typeof this.MajorScaleDegrees[romanNumeral] !== "number") error = i;
          if (this.chordScales[quality].constructor !== Array) error = i;
          if (error < 0) newProgression.push(chord);
        }
      } catch {
        console.log("error with element ", val[i]);
        error = 0;
      }
    }
  
    if (error < 0) {
      this._progression = newProgression;
      this.progressionChords = [];
      for (let i = 0; i < this._progression.length; i++) {
        this.progressionChords.push(new Chord(this._progression[i]));
      }
    } else {
      console.log("error in progression element", val[error]);
    }
  }

  setVoicing(name) {
    if (this.voicings.hasOwnProperty(name)) this.voicing = name;
    else console.log('invalid voicing name ', name);
    console.log('current voicing: ', this.voicing);
  }

  getChord(index) {
    let index2 = this.getChordIndex();
    if (this.progressionChords.length < 1) this.progressionChords.push(this.keyType === 'minor' ? new Chord('i') : new Chord('I'));
    return this.progressionChords[Math.floor(index2 % this.progressionChords.length)];
  }

  getChordIndex() {
    let index = Math.floor((this.ticks + 2) / (Tone.Time('4n').toTicks() * this._beatsPerBar));
    return index;
  }

  getChordType(name) {
    const suffix = name.replace(/[iIvVb#]+/, '');
    let majorMinor = name.match(/[iIvV]+/)[0];

    if(!majorMinor) majorMinor = 'I'

    const defaultMode = this.getDefaultMode(majorMinor, this.keyType)
    //console.log(name, this.keyType, defaultMode)
      //look for a specific scale defined in suffix
    for (const key of Object.keys(this.chordScales)) {
      if (suffix.toLowerCase().includes(key.toLowerCase())) {
        console.log('key', key)
        return key;
      }
    }
    //look for special cases
    if (suffix.includes('dim'))  return 'diminished';
    if (suffix.includes('m6'))  return 'dorian';
    if (suffix.includes('min6'))  return 'dorian';
    if (suffix.includes('m13'))  return 'dorian';
    if (suffix.includes('min13'))  return 'dorian';
    if (suffix.includes('m7b9'))  return 'phrygian';
    if (suffix.includes('7b9'))  return 'phrygianDominant';
    if (suffix.includes('Maj7#11'))  return 'lydian';
    if (suffix.includes('m7b5'))  return 'locrian';
    if (suffix.includes('7b5'))  return 'lydianDominant';
    if (suffix.includes('Maj7')) {
      const isMajor = majorMinor === majorMinor.toUpperCase() 
      if(defaultMode === 'lydian') return defaultMode
      return isMajor === true ? 'major7' : 'minorMaj7'
    }
    if (suffix.includes('7')) {
      // if(defaultMode !== 'none') return defaultMode
      // else 
    return majorMinor === majorMinor.toUpperCase() ? 'mixolydian' : 'minor7'; 
    }
    if (suffix.includes('2')) return 'major9';

    if( defaultMode !== 'none') return defaultMode
    return majorMinor === majorMinor.toUpperCase() ? 'major' : 'minor';
  }

  getDefaultMode(numeral, key){
    if (key === 'major'){
      switch(numeral){
      case 'I': return 'major'
      case 'ii': return 'dorian'
      case 'iii': return 'phrygian'
      case 'IV': return 'lydian'
      case 'V': return 'mixolydian'
      case 'vi': return 'minor'
      case 'vii': return 'locrian'
      }
    }
    if (key === 'minor'){
      switch(numeral){
      case 'i': return 'minor'
      case 'ii': return 'locrian'
      case 'III': return 'major'
      case 'iv': return 'dorian'
      case 'v': return 'phrygian'
      case 'V': return 'phrygianDominant'
      case 'VI': return 'lydian'
      case 'VII': return 'mixolydian'
      }
    }
    return 'none'
  }

  /************************************
 * Time keeping
 * ************************************/
  getTicks(){
    const currentTicks = Tone.Transport.ticks - this._barOffset
    if(currentTicks < 0) return Tone.Transport.ticks - this._prevBarOffset
    else return currentTicks
  }
  // resetBar(){
  //   let index = Math.floor((Tone.Transport.ticks + 8) / Tone.Time('1n').toTicks());
  // }

  // calcTicks(val){

  // }


  resetBar(val) {
    const currentTicks = Tone.Transport.ticks;
    const ticksInBar = Tone.Time('4n').toTicks() * this._beatsPerBar; // Get tick value for a quarter note

    // Calculate the next quarter note by rounding up to the nearest quarter note
    const nextBar = Math.ceil(currentTicks / ticksInBar) * ticksInBar ;

    // Store the offset to be subtracted from future index calculations
    this._barOffset = nextBar + val*ticksInBar - val*ticksInBar;

    //console.log(`Bar reset. Next downbeat tick: ${nextBar}, current tick: ${currentTicks}`);
  }

  /************************************
 * Helper functions
 * ************************************/

  getChordRoot(name){
    //parse chord name
    const romanNumeral = name.match(/[iIvVb#]+/)[0];

    //set keyType
    if (!romanNumeral) {
      console.log('incorrect chord name ${name}')
      return this.tonicNumber
    }
    let degree = 0
    
    if (this.keyType == 'major') {
      degree =  this.MajorScaleDegrees[romanNumeral];
      if(degree == undefined) degree = this.MinorScaleDegrees[romanNumeral];
      if(degree == undefined) degree = 0
    }
    else {
      degree =  this.MinorScaleDegrees[romanNumeral];
      if(degree == undefined) degree = this.MajorScaleDegrees[romanNumeral];
      if(degree == undefined) degree = 0
    }
    if(degree == undefined) degree = 0

    return degree % 12
  }

  //return midi note numbers for current chord
  getChordTones(root, quality, scale){
    let chord = []
    let len = 3
    if( /\d/.test(quality)) len = 4
    for(let i=0;i<len;i++) chord[i] = scale[i*2]+root
  }

  getInterval(num,scale){
    let len = scale.length
    if (typeof num === 'number') num = JSON.stringify(num)

      //parse num to look for # and b notes
      const match = num.match(/^([^\d-]+)?(-?\d+)$/);

      //get scale degree
      num = Number(match[2])
      let _octave = Math.floor(num/len)
      if(num<0) num = 7+num%7
      num = scale[num%len] + _octave*12
      

      //apply accidentals
      if(match[1]== '#')num+=1
      else if (match[1] == 'b') num-=1

      num += this.tonicNumber
      return num
  }

  minimizeMovement(chord, previousChord) {
    let distance = Math.abs(chord[0]%12-previousChord[0]%12)
    let lowNote = 0

    for(let i=1;i<chord.length;i++){
      if(Math.abs(chord[i]%12-previousChord[0]%12) < distance){
        distance = Math.abs(chord[i]%12-previousChord[0]%12)
          lowNote = i
      }
    }

    while(chord[lowNote] < previousChord[0]-2)chord = chord.map(x=>x+12)
   
    for(let i=0;i<chord.length;i++){
      if(chord[i] < previousChord[0])chord[i]+=12
    }

    return chord.sort((a, b) => a - b);
  }



    mtof(midiNote) {
      const stepsPerOctave = this.scaleRatios.length;

      // Offset from C4 instead of A4
      const semitoneOffset = midiNote - 60;
      const octaveOffset = Math.floor(semitoneOffset / stepsPerOctave);
      const degree = ((semitoneOffset % stepsPerOctave) + stepsPerOctave) % stepsPerOctave;

      //console.log(midiNote, semitoneOffset, octaveOffset, degree)
      // Frequency of C4 (the 1:1 ratio point)
      const c4Freq = 440 * Math.pow(2, (60 - 69) / 12);

      const freq = c4Freq * Math.pow(2, octaveOffset) * this.scaleRatios[degree];
      //console.log(freq,Math.pow(2, octaveOffset), this.scaleRatios[degree])
      return freq;
    }

    setTemperament(ratios) {
    this.scaleRatios = ratios;
  }

    setA4(freq) {
    this.A4 = freq;
  }
}

export const Theory = new MusicGenerator()

/****************** 
 * CHORD Class
 * Methods
 * - constructor(name,octave,voicing)
 * - getChordTones(lowNote): gets array of MIDI notes
 * - getInterval(degree): midi note number of scale degree
 * - setChord: set custom chord
 * 
 * Parameters
 * - notes: midi note numbers of current chord degrees
 * - root: midi note
 * - octave
 * - voicing: name 'closed' or interval pattern [0,2,4]
 * - scale: name 'major' or custom e.g. [0,2,4,5,7,9,11]
 *  * ******************/

/**
 * Class representing a musical chord.

 */
export class Chord {
  /**
   * Create a chord.
  
   * @param {string} name - The name of the chord (e.g., "Cmaj7", "Dm7").
   * @param {number} [_octave=octave] - The octave in which the chord is played.
   * @param {string} [_voicing=voicing] - The voicing to use for the chord.
   */
  constructor(name, _octave = Theory.octave, _voicing = Theory.voicing) {
    this.name = name;
    this.octave = _octave;
    this.voicing = _voicing;
    this.rootValue = Theory.getChordRoot(name); //integer 0-11
    this.quality = Theory.getChordType(name) //'Maj7'
    this.scale = Theory.chordScales[this.quality];
    if(this.name == 'V7') this.scale = Theory.chordScales['mixolydian']
    this.chordTones = this.getChordTones(this.rootValue,this.quality,this.scale);
    this.length = this.chordTones.length
  }
  /**
   * Calculate the interval for the chord within a specified range.
   * @param {number} num - The scale degree or interval number.
   * @param {number} [min=48] - The minimum MIDI note number for the interval.
   * @param {number} [max=null] - The maximum MIDI note number for the interval. Defaults to min + 12.
   * @returns {number} - The MIDI note number for the interval.
   */
  interval(num, min = 12, max = null){
    if(max === null) max = min + 12
    return this.getInterval(num,min,max)
  }

  getInterval(num, min = 0, max = 127){ 
    num = Theory.getInterval(num, this.scale) + this.rootValue + this.octave*12 
    if(num<min) {
      const count = Math.floor((min-num)/12)+1
      for(let i=0;i<count;i++)num += 12
        //console.log('min', count)
    }
    else if(num>max) {
      const count = Math.floor((num-max)/12)+1
      for(let i=0;i<count;i++)num -= 12
        //console.log('max', count)
    }
    return num
  }

  /**
   * Get the root note of the chord adjusted for a specified low note.
  
   * @param {number} [lowNote=36] - The lowest note to start the chord from.
   * @returns {number} - The root note as a MIDI note number.
   */
  root(lowNote = 36){
    return this.rootValue + lowNote
  }

  /**
   * Get the chord tones starting from a specified low note.
  
   * @param {number} [lowNote=48] - The lowest note to start the chord from.
   * @returns {number[]} - An array of MIDI note numbers representing the chord tones.
   */
  tones(lowNote = 48){
    return this.getChordTones(lowNote)
  }

  getChordTones(lowNote=48, highNote = null) {
    if(highNote === null) highNote  = lowNote + 12
    const chordTones = this.getChord(this.name, lowNote, this.voicing)
    //console.log(chordTones)
    return chordTones;
  }

  /**
   * Set a custom chord with specified notes.
  
   * @param {number[]} customChord - An array of MIDI note numbers representing the custom chord.
   */
  setChord(customChord) {
    this.notes = customChord;
  }

  applyVoicing(chordTones) {
    const voicingOffsets = Theory.voicings[this.voicing];
    return Theory.chordTones.map((tone, index) => tone + (voicingOffsets[index] || 0));
  }

  getChord(name,  lowNote = null, _voicing = null){

    if(_voicing == null) _voicing = Theory.voicing

    // Adjust the chord tones based on the voicing type
    //let chord = applyVoicing(name, _voicing, this.scale);

    let chord = [this.scale[0], this.scale[2], this.scale[4]];

    //check for numeric extensions
    const regex = /\d/;
    if( regex.test(name) && this.scale.length >= 7 ) {
      const match = name.match(/\d+/); // Match one or more digits
      if (match) {
        chord.push( this.scale [parseInt(match[0], 10)%7]); // Convert the matched string to a number
      }
    }
    chord = chord.map(x=> x+ this.octave*12 + this.rootValue)// + Theory.tonicNumber)

    // Adjust the chord tones to be as close as possible to the previous chord
    if (Theory.previousChord.length > 0) {
      if(lowNote){ Theory.previousChord[0] = lowNote}
      chord = Theory.minimizeMovement(chord, Theory.previousChord);
    }

    Theory.previousChord = chord;
    return chord.map(x=> x + Theory.tonicNumber)
  }
}

/************************************
 * String parsing functions
 * ************************************/
/** parseStringSequence

 * 
 * takes an input string and:
 * - replaces groups like *@4 with ****
 * - splits the string into an array of strings, one string per beat
 * - preserves characters inside [] inside one beat
 */

export function parseStringSequence(str){
    str = str.replace(/\s/g, ""); // Remove all whitespace

    //replace the expression  *@4 with ****
    str = str.replace(/(.)@(\d+)/g, (match, p1, p2) => {
        // p1 is the character before the @
        // p2 is the number after the @, so repeat p1 p2 times
        return p1.repeat(Number(p2));
    });

    //split original string into an array of strings
    //items within [] are one entry of the array
    const regex = /\[.*?\]|./g;
    str.match(regex);
    str = str.match(regex);
    //console.log('pitch', str)
    return str
}

export function parsePitchStringSequence(str) {
  const firstChar = str.replace(/\[/g, "")[0];
  const usesPitchNames = /^[A-Ga-g?]$/.test(firstChar);

  if( usesPitchNames ) str = str.replace(/\s+/g, "");

  // Tokenizers
  const pitchRegex = /\[.*?\]|[A-Ga-g][#b]?\d*|@\d+|\.|\?|~|\*/g;
  const numRegex   = /\[.*?\]|-?\d+|@\d+|\.|\?|~|\*/g;

  const regex = usesPitchNames ? pitchRegex : numRegex;

  let arr = str.match(regex) ?? [];

  // Expand @N: repeat the previous token N-1 additional times
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][0] === "@") {
      const repeatCount = parseInt(arr[i].slice(1), 10) - 1;
      const prev = arr[i - 1];

      if (repeatCount > 0 && prev !== undefined) {
        arr.splice(i, 1, ...new Array(repeatCount).fill(prev));
        i += repeatCount - 1;
      } else {
        // If malformed (e.g. starts with @), just remove it
        arr.splice(i, 1);
        i -= 1;
      }
    }
  }

  return arr;
}

//handles rhythm sequences
function splitBeat(str) {
    const inside = str.slice(1, -1);   // remove outer brackets
    const out = [];
    let i = 0;

    while (i < inside.length) {
        // preserve inner bracket groups: [ ... ]
        if (inside[i] === '[') {
            const start = i;
            i++; 
            while (i < inside.length && inside[i] !== ']') i++;
            //i++; // include the closing bracket
            out.push(inside.slice(start, i));
            continue;
        }

        // otherwise split into single characters
        out.push(inside[i]);
        i++;
    }

    return out;
}

export function parseStringBeat(curBeat, time){
  // console.log(curBeat)
  let outArr = []
  //handle when a beat contains more than one element
    const bracketCheck = /^\[.*\]$/;
    if (bracketCheck.test(curBeat)) {
      curBeat = splitBeat(curBeat)

      for(let i=0;i<curBeat.length;i++){
        outArr.push([curBeat[i],i/curBeat.length])
      }

    } else { //for beats with only one element
      outArr.push([curBeat, 0])
        //callback(curBeat, time);
    }
    return  outArr 
}

//handles pitch sequences
/* DEEP SEEK
export function parsePitchStringBeat(curBeat, time, parentStart=0, parentDuration=1){
  console.log('____', curBeat, parentStart, parentDuration)
  try{
    if (typeof curBeat === 'number')  curBeat = curBeat.toString();
    const firstElement = curBeat.replace(/\[/g, "")[0]
    const usesPitchNames = /^[a-ac-zA-Z]$/.test(firstElement);

    // Check if the input is a single value (not an array)
    if (!curBeat.startsWith('[')) {
      return [[curBeat, 0]];
    }

    // Remove outer brackets and split into top-level elements
    const elements = curBeat.slice(1, -1).trim().split(/\s+/);
    console.log('el', elements)
    const outArr = [];

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      // Handle subarrays recursively (e.g., "[3 4]")
      if (element.startsWith('[')) {
        // Find the full subarray string (handles nested brackets)
        let subArrayStr = element;
        let bracketCount = (element.match(/\[/g) || []).length;
        let j = i + 1;

        while (bracketCount > 0 && j < elements.length) {
          subArrayStr += ' ' + elements[j];
          bracketCount += (elements[j].match(/\[/g) || []).length;
          bracketCount -= (elements[j].match(/\]/g) || []).length;
          j++;
        }
        subArrayStr += ']'

        // Calculate the subarray's slot in the parent
        console.log('sub', parentStart, elements.length, elements, (i / (elements.length-1)), parentDuration)
        const subArraySlotStart = parentStart + (i / (elements.length-1)) * parentDuration;
        const subArraySlotDuration = parentDuration / (elements.length-1);

        // Parse the subarray internally (timings relative to its own slot)
        const subArrayElements = subArrayStr.slice(1, -1).trim().split(/\s+/);
        for (let k = 0; k < subArrayElements.length; k++) {
          const subElement = subArrayElements[k];
          const subElementTime = subArraySlotStart + (k / subArrayElements.length) * subArraySlotDuration;
          outArr.push([subElement, subElementTime]);
        }
        i = j - 1; // Skip processed elements
      }
      // Handle simple values (e.g., "2")
      else {
        const noteTime = parentStart + (i / elements.length) * parentDuration;
        outArr.push([element, noteTime]);
      }
    }
      console.log(outArr)
      return  outArr 
    }
  catch(e){
    console.log('error with parsePitchStringBeat')
    return ['.']
  }
}
*/

export function parsePitchStringBeat(curBeat, time){
  //console.log('pitch', curBeat)
  try{
    if (typeof curBeat === 'number')  curBeat = curBeat.toString();
    const firstElement = curBeat.replace(/\[/g, "")[0]
    const usesPitchNames = /^[a-ac-zA-Z]$/.test(firstElement);
    let outArr = []
    //handle when a beat contains more than one element
      const bracketCheck = /^\[.*\]$/;
      if (bracketCheck.test(curBeat)) {
        //remove brackets and split into arrays by commas
        curBeat =curBeat.slice(1, -1).split(',');
        //console.log(curBeat)
        curBeat.forEach(arr => {
          let regex = /\[.*?\]|[A-Ga-g][#b]?\d*|@(\d+)|./g;
          if( !usesPitchNames){ //true if first element is a number
            regex = /\[.*?\]|-?\d+|@\d+|\.|\?|~|\*/g;
          } 
          arr = arr.match(regex)

           for (let i = 0; i < arr.length; i++) {
                if (arr[i].startsWith("@")) {
                    const repeatCount = parseInt(arr[i].slice(1), 10)-1; // Get the number after '@'
                    const elementToRepeat = arr[i - 1]; // Get the previous element
                    const repeatedElements = new Array(repeatCount).fill(elementToRepeat); // Repeat the element
                    arr.splice(i, 1, ...repeatedElements); // Replace '@' element with the repeated elements
                    i += repeatCount - 1; // Adjust index to account for the newly inserted elements
                }
            }
            // console.log(arr)
            
            const length = arr.length;
            for (let i = 0; i < length; i++) {
                const val = arr[i];
                outArr.push([val,i/length])
            }
        });
        //console.log(outArr)
      } else { //for beats with only one element
        outArr.push([curBeat, 0])
      }
      return  outArr 
    }
  catch(e){
    console.log('error with parsePitchStringBeat', curBeat)
    return ['.']
  }
}


/**
 * Converts a pitch name (e.g., "C4", "g#", "Bb3") to a MIDI note number.

 *
 * @param {string} name - The pitch name to convert. This can include a pitch class (A-G or a-g), 
 *                        an optional accidental (# or b), and an optional octave number.
 *                        If no octave number is provided, uppercase letters default to octave 3,
 *                        and lowercase letters default to octave 4.
 * @returns {number} - The corresponding MIDI note number.
 */
export function pitchNameToMidi(name) {
    const pitchClasses = Theory.noteToInterval

    // Normalize input to remove spaces
    name = name.trim()
    
    // Determine the pitch class and accidental if present
    let pitchClass = name.match(/[A-G]?[a-g]?[#b]?/)[0];

    // Determine the octave:
    // - Uppercase letters (C-B) should be octave 3
    // - Lowercase letters (c-a) should be octave 4
    let octave;
    if (/[A-G]/.test(name[0])) {
        octave = 3;
    } else {
        octave = 4;
    }

    //convert first character to uppercase
    pitchClass = pitchClass.charAt(0).toUpperCase() + pitchClass.slice(1)

    // Adjust for any explicit octave provided (e.g., "C4" or "c5")
    let explicitOctave = name.match(/\d+$/);
    if (explicitOctave) octave = parseInt(explicitOctave[0], 10)

    // Adjust the MIDI note for flats (# and b are already handled in pitchClasses)
    let midiNote = pitchClasses[pitchClass] + (octave+1) * 12;

    return midiNote;
}

/**
 * Converts an to a MIDI note number, taking into account the current chord.

 *
 * @param {string} interval - The interval to convert. This will include a integer number, 
 *                        and an optional accidental (# or b).
 * @returns {number} - The corresponding MIDI note number.
 */
export function intervalToMidi(interval, min=12, max = 127) {
    // Normalize input to remove spaces
  //console.log(interval)
  let degree = 0
  let accidental = null
  let midiNote = -1
    if (typeof interval === 'string') {
      interval = interval.trim()
    
    // Determine the pitch class and accidental if present
     degree = interval.match(/\[.*?\]|-?\d+|@(\d+)|\./g)[0];
     accidental = interval.match(/[b#]+/g);
   }
   else degree = interval

    //console.log(degree,accidental Theory.getChord())

    try{  midiNote = Theory.getChord().interval(degree,min,max)}
    catch(e){ console.log('bad interval: ', degree)}

    //console.log('th', midiNote, accidental)
    if (accidental !== null) {
      if (Array.isArray(accidental)) {
        for (const sign of accidental) {
          if (sign === "#") midiNote += 1;
          else if (sign === "b") midiNote -= 1;
        }
      } else {
        if (accidental === "#") midiNote += 1;
        else if (accidental === "b") midiNote -= 1;
      }
    }

    // Adjust the MIDI note for flats (# and b are already handled in pitchClasses)
    //let midiNote = pitchClasses[pitchClass] + (octave+1) * 12;
    //return 60

    //console.log(interval, midiNote, Theory.getChord())

    return midiNote //+ Theory.tonicNumber;
}

//parses a symbol and makes sure it is in correct order
function rearrangeAccidentals(arr, usesPitchNames) {

    // Regular expression to separate sign, letters, numbers, and accidentals
    const match = arr.match(/^(-?)([A-Za-ac-z]*)(\d*)([#b]*)$/);
    console.log(arr, usesPitchNames, match)
    if (match) {
        const [, sign, letters, numbers, accidentals] = match;
        //console.log(`letters ${accidentals}${numbers} ${usesPitchNames}`);
        if (usesPitchNames) {
            // For pitch names: letter/accidental/octaveNumber
            //console.log(`letters ${sign}${letters}${accidentals}${numbers}`);
            return `${letters}${accidentals}${numbers}`;
        } else {
            // For scale degrees: sign,number,accidental
            //console.log(`numbers ${sign}${letters}${numbers}${accidentals}`);
            return `${sign}${numbers}${accidentals}`;
        }
    }

    // Return the original string if no match
    return arr;
}

