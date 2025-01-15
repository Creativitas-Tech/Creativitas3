/** Theory.js
 * 
 * Implements a system for specifying chord and progressions 
as Roman numerals.

Includes the class 'chord'

Variables:
- tonic: tonic as string
- tonicNumber: tonic as MIDI number
- keytype: major or minor depending on tonic capital
- octave: default octave for chords/scales
- harmonicRhythm: how fast chord changes occur
  - can be a number or an array of numbers
  - in number of beats

- progression: chord progression (array of strings ['i','iv','V7','VII7'])
- chords: array of Chord objects

- voicing: default voicing
- voicings[]: array for voicing types [open,closed,drop2,drop3]
- notes[12]: array of alphabet note names
- noteToInterval{}: maps alphabetic names to intervals (with b/#)
-chordIntervals[]: interval patterns for chords, e.g. [0,2,4]
-chordScale[]: scales associated with chords, e.g. '7':[0,2,4,5,7,9,10]
-MajorScaleDegrees[]: 'I': 0, 'bII': 1, etc.
-MinorScaleDegrees[]: 'i': 0, 'bII': 1, etc.

functions:
setProgression(str): progression as single string or array of strings
  - setProgression('i i iv V7') or setProgression('i', 'i', 'iv', 'V7')
setVoicing(str)
export function rotateVoicing(steps)
setTonic(str/num): updates tonic, tonicNumber,octave, keyType
getChordTones(root, quality, scale): returns array of MIDI notes, either triad or 7th
getChord(name, lowNote, voicing) //roman number and returns MIDI note array
getChordType(name): return chord quality, e.b. minorMajor7
function applyVoicing(chord, _voicing)
minimizeMovement(chord, previousChord): shifts chord so lowest note is higher than previousChord[0]
getChordRoot(name): returns midi note of root %12
getInterval(num,scale): returns MIDI note number of scale degree (from 0)

 * @file This file implements functions for working with concepts from music theory
 * @module Theory
 */

import * as Tone from 'tone';
import * as Ornament from './Ornament.js'

let tonic = 'C';
let tonicNumber = 0; //midi note of tonic, 0-11
let keyType = 'major';
let octave = 4;
let voicing = 'closed'
let previousChord = [];

let pulsePerChord = 16
let harmonicRhythm = 8
let progressionChords = []
let progression = []

const voicings = { 
  "closed": [0,2,4,6],
  "open": [0,4,6,9],
  "drop2": [-3,0,2,6],
  "drop3": [-1,0,3,4]
}

const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteToInterval = {
  'C': 0, 'B#': 12, 'C#': 1, 'Db': 1,'D': 2, 'D#':3, 'Eb':3, 'E': 4, 'Fb': 4,
  'E#': 5, 'F': 5,'F#': 6, 'Gb': 6, 'G': 7,'G#': 8, 'Ab': 8,'A': 9,
  'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11,
  };

export const chordIntervals = {
  "major": [0, 4, 7],
  "minor": [0, 3, 7],
  "dominant7": [0, 4, 7, 10],
  "minor7": [0, 3, 7, 10],
  "major7": [0, 4, 7, 11],
  "minorMaj7": [0, 3, 7, 11],
  "diminished": [0, 3, 6],
  "diminished7": [0, 3, 6, 9],
  "add9": [0, 4, 7, 14], // Major triad with added ninth
};

export const chordScales = {
  "major": [0, 2, 4, 5, 7, 9, 11],
  "minor": [0, 2, 3, 5, 7, 8, 10], //aeolian
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
};

const MajorScaleDegrees = {
  'I': 0, 'bII': 1, 'II': 2, 'bIII': 3,'III': 4, 'IV': 5, '#IV': 6, 
  'bV': 6,'V': 7,'#V': 8, 'bVI': 8,'VI': 9, 'bVII': 10,'VII': 11,
  'i': 0, 'bii': 1, 'ii': 2, 'biii': 3,'iii': 4, 'iv': 5, '#iv': 6, 
  'bv': 6,'v': 7, 'bvi': 8,'vi': 9, 'bvii': 10,'vii': 11 
};
const MinorScaleDegrees = {
  'I': 0, 'bII': 1, 'II': 2, 'III': 3,'#III': 4, 'IV': 5, '#IV': 6, 
  'bV': 6,'V': 7,'#V': 8, 'VI': 8,'#VI': 9, 'VII': 10,'#VII': 11,
  'i': 0, 'bii': 1, 'ii': 2, 'iii': 3,'#iii': 4, 'iv': 5, '#iv': 6, 
  'bv': 6,'v': 7, 'vi': 8,'#vi': 9, 'bvii': 10,'vii': 11
};

export function orn(note,pattern=0,scalar=1, length=4 ){
  return Ornament.orn(note,pattern,scalar,length)
}


export function setVoicing(name){
  if (voicings.hasOwnProperty(name)) voicing = name 
  else console.log('invalid voicing name ', name)
console.log('current voicing: ', voicing)
}

/**
 * Sets the chord progression and validates the input.
 *
 * @param {string|string[]} val - The chord progression as a string or an array of strings.
 *                                If provided as a string, it will be split into an array.
 */
export function setProgression(val){
  let newProgression = []
  let error = -1

  //convert progressions in a single string to an array of strings
  if( val.constructor !== Array ){
    val = val.replaceAll(',', ' ')
    val = val.split(' ')
  }
  //iteratate through array, check for errors
  for(let i=0;i<val.length;i++){
    let chord = val[i]
    try{
      if(val[i] !== ''){ //remove empty strings
        const romanNumeral = chord.match(/[iIvVb#]+/)[0];
        const quality = getChordType(chord);
        console.log(quality)
        if( typeof MajorScaleDegrees[romanNumeral] !== "number") error = i
        if( chordScales[quality].constructor !== Array) error = i
        if( error < 0 ) newProgression.push(chord)
      } 
    } catch{
      console.log("error with element ", val[i])
      error = 0
    }
  }

  if(error < 0) {
    progression = newProgression
    progressionChords = []
    for(let i=0;i<progression.length;i++) progressionChords.push(new Chord(progression[i]))
  }
  else console.log("error in progression element", val[error])
  //console.log(progression)
}

export function printProgression(){
  console.log(progressionChords)
}

//gets the index of the current chord based on tranpost position
export function getChordIndex(){
  let index = Math.floor((Tone.Transport.ticks+8) / Tone.Time('1n').toTicks());
  // console.log(index)
  return index
}

/**
 * Retrieves an index for an array, based on the transport position.

 * 
 * @param {number} length - The length of the array we are indexing.
 *                         The index is wrapped around based on the length
 * @returns {string} - The subdivision for our sequence
 */
export function getIndex(length=8, sub='8n'){
  let index = Math.floor(Tone.Transport.ticks / Tone.Time(sub).toTicks());
  //console.log('index', length, sub, index%length, Tone.Transport.ticks)
  return index%length
}

/**
 * Sets the number of pulses per chord in the progression.

 *
 * @param {number} num - The number of pulses to set for each chord in the progression.
 */
export function setProgressionRate(num) {
  harmonicRhythm = num;
}

/**
 * Retrieves the chord at a given index within the progression.

 * 
 * @param {number} index - The index within the progression to retrieve the chord from.
 *                         The index is wrapped around based on the length of the progression and pulsePerChord.
 * @returns {Chord} - The chord object corresponding to the provided index.
 */
export function getChord(index){
  let index2 = getChordIndex()// index % (pulsePerChord * progression.length)
  if (progressionChords.length < 1) progressionChords.push( new Chord('I'))
  //console.log(index2, progressionChords[Math.floor( index2%progressionChords.length )].name)
  return progressionChords[Math.floor( index2%progressionChords.length )]
}

/**
 * Sets the tonic for the key, key type, and octave.

 * 
 * @param {string|number} val - The tonic value, which can be a musical note (e.g., "C4", "g#") 
 *                              or a MIDI number representing the pitch.
 */
export function setTonic(val) {
  if (typeof val === 'string') {
    const noteRegex = /[A-Ga-g][#b]?/; // Regular expression to detect musical notes including sharps and flats
    const numberRegex = /\d+/; // Regular expression to detect numbers

    const noteMatch = val.match(noteRegex);
    const numberMatch = val.match(numberRegex);

    if (noteMatch) {
      tonic = noteMatch[0].toUpperCase(); // Set the tonic and convert to uppercase
      keyType = noteMatch[0] === noteMatch[0].toUpperCase() ? 'major' : 'minor'; // Set the key type based on case
    }

    if (numberMatch) {
      octave = parseInt(numberMatch[0], 10); // Set the octave
    }
  } else if (typeof val === 'number') {
    octave = Math.floor(val / 12) - 1; // Calculate the octave from the MIDI number
    const noteIndex = val % 12;
    tonic = notes[noteIndex]; // Set the tonic based on the note index
    //keyType = 'major'; // Default to major when using MIDI number
  }

  //set midi note of tonic
  tonicNumber = noteToInterval[tonic]

  console.log(`Tonic: ${tonic}, Number: ${tonicNumber}, Key Type: ${keyType}, Octave: ${octave}`);
}

export function rotateVoicing(steps){
  const len = previousChord.length
  steps = steps % len
  //console.log(steps, previousChord)
  let newChord = Array.from({length:len},(x,i)=>{
    x=previousChord[(i+steps+len)%len]
    if((i+steps)>=len)x+=12
    else if( (i+steps) < 0)x-=12
    return x
  })
  
  previousChord = newChord
}

//returns chord quality
function getChordType(name) {
  const suffix = name.replace(/[iIvVb#]+/, '');
  let majorMinor = name.match(/[iIvV]+/)[0];
  if(!majorMinor) majorMinor = 'I'

  const defaultMode = getDefaultMode(majorMinor, keyType)

    //look for a specific scale defined in suffix
  for (const key of Object.keys(chordScales)) {
    if (suffix.toLowerCase().includes(key.toLowerCase())) {
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
    if(defaultMode !== 'none') return defaultMode
    else return majorMinor === majorMinor.toUpperCase() ? 'mixolydian' : 'minor7'; 
  }
  if (suffix.includes('2')) return 'major9';

  if( defaultMode !== 'none') return defaultMode
  return majorMinor === majorMinor.toUpperCase() ? 'major' : 'minor';
}

function getDefaultMode(numeral, key){
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
    case 'v': return 'locrian'
    case 'V': return 'phrygianDominant'
    case 'VI': return 'lydian'
    case 'VII': return 'mixolydian'
    }
  }
  return 'none'
}

function applyVoicing(name, _voicing,scale) {
  //console.log(_voicing, scale)
  // Apply different voicings (closed, drop2, drop3, etc.)
  let cVoicing = voicings[_voicing]
  let voicedChord = Array(cVoicing.length)

  for(let i=0;i<cVoicing.length;i++){
    voicedChord[i] = getInterval(cVoicing[i],scale)
  }
  //console.log(voicedChord)
  return voicedChord
}

function minimizeMovement(chord, previousChord) {
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
  constructor(name, _octave = octave, _voicing = voicing) {
    this.name = name;
    this.octave = _octave;
    this.voicing = _voicing;
    this.rootValue = getChordRoot(name); //integer 0-11
    this.quality = getChordType(name) //'Maj7'
    this.scale = chordScales[this.quality];
    if(this.name == 'V7') this.scale = chordScales['mixolydian']
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
  interval(num, min = 48, max = null){
    if(max === null) max = min + 12
    return this.getInterval(num,min,max)
  }

  getInterval(num, min = 0, max = 127){ 
    num = getInterval(num, this.scale) + this.rootValue + this.octave*12 
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
    const voicingOffsets = voicings[this.voicing];
    return chordTones.map((tone, index) => tone + (voicingOffsets[index] || 0));
  }

  getChord(name,  lowNote = null, _voicing = null){

    if(_voicing == null) _voicing = voicing

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
    //console.log(octave, this.scale, tonicNumber)
    chord = chord.map(x=> x+ this.octave*12 + this.rootValue + tonicNumber)
    //console.log(chord)
    // Adjust the chord tones to be as close as possible to the previous chord
    if (previousChord.length > 0) {
      if(lowNote){ previousChord[0] = lowNote}
      chord = minimizeMovement(chord, previousChord);
    }
    //console.log("post", chord, lowNote)
    previousChord = chord;
    return chord
  }
}

/************************************
 * Helper functions
 * ************************************/

export function getChordRoot(name){
  //parse chord name
  const romanNumeral = name.match(/[iIvVb#]+/)[0];

  //set keyType
  if (!romanNumeral) {
    console.log('incorrent chord name ${name}')
    return tonicNumber
  }
  let degree = 0
  
  if (keyType == 'major') {
    degree =  MajorScaleDegrees[romanNumeral];
    if(degree == undefined) degree = MinorScaleDegrees[romanNumeral];
    if(degree == undefined) degree = 0
  }
  else {
    degree =  MinorScaleDegrees[romanNumeral];
    if(degree == undefined) degree = MajorScaleDegrees[romanNumeral];
    if(degree == undefined) degree = 0
  }
  if(degree == undefined) degree = 0

  return degree % 12
}

//return midi note numbers for current chord
function getChordTones(root, quality, scale){
  let chord = []
  let len = 3
  if( /\d/.test(quality)) len = 4
  for(let i=0;i<len;i++) chord[i] = scale[i*2]+root
}

function getInterval(num,scale){
  let len = scale.length
  if (typeof num === 'number') {
    let _octave = Math.floor(num/len)
    if(num<0) num = len+num%len //check negative numbers
    num = scale[num%len] + _octave*12
    return num
  } else if (typeof num === 'string') {
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
    return num
  }
  return 0
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

    return str
}

export function parsePitchStringSequence(str) {
    
    const firstElement = str.replace(/\[/g, "")[0]
    const usesPitchNames = /^[a-ac-zA-Z?]$/.test(firstElement);


    // Step 1: Remove all whitespace
    if( usesPitchNames ) str = str.replace(/\s/g, "");
    //str = str.replace(/\,/g, "");

    // Step 2: Split into an array
    // - Matches items inside brackets as one element
    // - Groups numbers, 'b', and '#' with the preceding pitch
    // - Ensures '@' and the number following it are in their own array element
    //const regex = /\[.*?\]|[A-Ga-g][#b]?\d*|@(\d+)|./g;
    // - Preserves periods '.' as their own array elements
    let regex = /\[.*?\]|[A-Ga-g][#b]?\d*|@(\d+)|\.|\?/g;

    if (!usesPitchNames) { // true if the first element is a number
        regex = /\[.*?\]|-?[b#]?\d+[b#]?|@(\d+)|\.|\?/g;
    }

    let arr = str.match(regex);

    // Step 3: Process '@' elements
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].startsWith("@")) {
            const repeatCount = parseInt(arr[i].slice(1), 10)-1; // Get the number after '@'
            const elementToRepeat = arr[i - 1]; // Get the previous element
            const repeatedElements = new Array(repeatCount).fill(elementToRepeat); // Repeat the element
            arr.splice(i, 1, ...repeatedElements); // Replace '@' element with the repeated elements
            i += repeatCount - 1; // Adjust index to account for the newly inserted elements
        }
    }


    return arr;
}

//handles rhythm sequences
export function parseStringBeat(curBeat, time){
  let outArr = []
  //handle when a beat contains more than one element
    const bracketCheck = /^\[.*\]$/;
    if (bracketCheck.test(curBeat)) {
      //remove brackets and split into arrays by commas
      curBeat =curBeat.slice(1, -1).split(',');
      //console.log(curBeat)
      curBeat.forEach(arr => {
          const length = arr.length;
          for (let i = 0; i < length; i++) {
              const val = arr[i];
              outArr.push([val,i/length])
              //console.log('out', outArr)
            }
      });
    } else { //for beats with only one element
      outArr.push([curBeat, 0])
        //callback(curBeat, time);
    }
    return  outArr 
}

//handles pitch sequences
export function parsePitchStringBeat(curBeat, time){
  //console.log(curBeat)
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
            regex = /\[.*?\]|-?\d+[#b]?|@(\d+)|\./g;
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
    console.log('error with parsePitchStringBeat')
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
    const pitchClasses = noteToInterval

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
    interval = interval.trim()
    
    // Determine the pitch class and accidental if present
    const degree = interval.match(/\[.*?\]|-?\d+|@(\d+)|\./g)[0];
    const accidental = interval.match(/[b#]+/g);

    let midiNote = -1
    try{  midiNote = getChord().interval(degree,min,max)}
    catch(e){ console.log('bad interval: ', degree)}

    //console.log(midiNote)
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
    return midiNote;
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

