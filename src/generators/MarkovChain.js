/*** Create Markov Object ***/
export class MarkovChain {
    constructor(order=1) {
        this.order = order;
        if(this.order < 1) this.order = 1
        this.matrix = {};
        this.startGram = []
        this.sourceSequence = []
        this.currentState = []
    }
    //create a transition matrix from an array
    train(arr){ this.createMarkovTable(arr)}
    createMarkovTable(arr) {
        this.sourceSequence = arr
        this.matrix = {}
        for(let i = 0; i <= arr.length - this.order - 1; i++) {
          this.gram = arr.slice(i, i + this.order).join(' ');
          if (!this.matrix[this.gram]) this.matrix[this.gram] = [];
          this.matrix[this.gram].push(arr[i+this.order])
        }
    }

    //set the state to start generating output
    //by specifying the number of one of the states
    //the actual state selected is hard to predict,but repeatable
    //returns the last entry of the state selected
    start(num=0){
        if(this.matrix[Object.keys(this.matrix)[num]]) this.currentState =Object.keys(this.matrix)[num]
        else this.currentState = this.matrix[Object.keys(this.matrix)[0]]
        this.currentState = this.stringToGram(this.currentState)
        return this.currentState[this.currentState.length-1]
    }
    //get the next state based on the currentState
    //optional argument to set the currentState
    get(prev=null){
        return this.getNextState(prev)
    }
    getNextState(current = null) {
        if( current !== null ){
            if(this.matrix[Object.keys(this.matrix)[current]]) this.currentState = this.stringToGram(Object.keys(this.matrix)[current])
        }
        if (this.currentState === undefined || this.currentState.length<1) {
          this.currentState = this.stringToGram(Object.keys(this.matrix)[0] )
        }
        this.possibleNextStates = this.matrix[this.gramToString(this.currentState)];
        if(this.possibleNextStates == undefined) return this.currentState[this.currentState.length-1]

        this.newValue = this.possibleNextStates[Math.floor(Math.random() * this.possibleNextStates.length)];
        
        this.currentState.push( this.newValue )
        this.currentState = this.currentState.slice(1,this.order+1)
        
        return this.newValue
    }
    //generate a new sequence. 
    generateSequence(length, startGram = null) {
        //if startGram is a number, use it to retrieve an engram from the matrix
        if( typeof startGram === 'number'){
            startGram = Object.keys(this.matrix)[startGram % Object.keys(this.matrix).length] 
        }
        if (this.matrix[startGram] === undefined) {
          startGram = Object.keys(this.matrix)[0] 
        }
        this.currentState = this.stringToGram(startGram)
        this.generatedSequence = []//[this.currentState[this.currentState.length-1]];
        for (let i = 0; i < length; i++) {
            this.generatedSequence.push(this.getNextState());
        }
        return this.generatedSequence;
    }
    //helper functions to convert the state from a string to an array and back
    gramToString(gram) { return gram == undefined ? 'undefined' : gram.join(' ');}
    stringToGram(str) { return str == undefined ? 'undefined' : str .trim().split(' ').map(pair => pair.split(','));}
    //download the matrix as a json file
      download() {
        this.name = window.prompt("File name (without extension):", "markov");
        if (!this.name) return;
      
        this.data = JSON.stringify(this.matrix, null, 0);
        this.blob = new Blob([this.data], { type: "application/json" });
        this.url = URL.createObjectURL(this.blob);
      
        this.a = document.createElement("a");
        this.a.href = this.url;
        this.a.download = this.name + ".json";
        this.a.style.display = "none";
      
        document.body.appendChild(this.a);
        this.a.click();
        document.body.removeChild(this.a);
      
        URL.revokeObjectURL(this.url);
      }
}