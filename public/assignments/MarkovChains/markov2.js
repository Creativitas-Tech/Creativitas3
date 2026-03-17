/*** Create Markov Transition Table ***/
let i = 0;
let gram = [];
let possibleNextStates = [];
let newValue = 0;
let currentGram = []
let generatedSequence = []

class MarkovChain {
    constructor(order) {
        this.order = order;
        this.ngrams = {};
        this.startGram = []
        this.sourceSequence = []
        this.currentState = []
    }
  
    createMarkovTable(arr) {
        this.sourceSequence = arr
        for( i = 0; i <= arr.length - this.order - 1; i++) {
             gram = arr.slice(i, i + this.order).join('');
            if (!this.ngrams[gram]) this.ngrams[gram] = [];
            this.ngrams[gram].push(arr[i + this.order]);
        }
    }
  
    getNextState() {
        if( this.ngrams[this.currentState] == undefined ) {
          this.currentState = this.sourceSequence.slice(0,this.order)
        }
        possibleNextStates = this.ngrams[this.currentState];
        
        newValue = possibleNextStates[Math.floor(Math.random() * possibleNextStates.length)];
        
        this.currentState = this.currentState.slice(1,this.order)
        this.currentState.push( newValue )
        return newValue
    }
    generateSequence(startGram, length) {
        currentGram = startGram;
        generatedSequence = [currentGram];

        for (i = 0; i < length; i++) {
            generatedSequence.push(this.getNextState());
        }
        return generatedSequence;
    }
}

// Example usage
let myMelody = [60, 62, 60, 64, 60, 65, 64, 65, 62, 64, 65, 67, 60, 67, 65, 67, 64, 67, 62, 67, 60, 67, 64, 62, 60, 64, 62, 64, 60, 65, 60, 62, 62, 64, 65, 62, 65, 62, 64, 60, 62, 64, 65, 67, 65, 64, 62, 60, 67, 65, 64, 62, 60, 69, 67, 65, 64, 62, 71, 69, 67, 65, 64, 72, 71, 69, 67, 65, 74, 72, 71, 69, 67, 72, 74, 71, 72, 69, 71, 67, 69, 65, 67, 64, 65, 62, 64, 60, 74, 60, 72, 60, 71, 60, 69, 60, 67, 60, 65, 60]
let markovChain = new MarkovChain(1); // Order of 3
markovChain.createMarkovTable(myMelody)
console.log( markovChain.currentState)

// // Generate a new sequence
let newSequence = markovChain.generateSequence([0,1,2], 10);
console.log(newSequence);