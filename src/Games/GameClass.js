import * as Tone from 'tone';
import * as TheoryModule from '../TheoryModule.js';

export class Game{
	constructor(){
		this.levelNum = 0
		this.loop = null
		this.tempo = 90
		this.loopDivision = '4n'
		this.curBeat = 0
		this.curBar = 0
	}

	init(){
		this.audio = this.makeSynth()
		this.gui = this.makeDisplay()
		this.loop = new Tone.Loop(time=> {
			this.onBeat(time)
			if(this.curBeat == 0) this.onBar(time)
		}, this.loopDivision).start()	
		this.counterLoop = new Tone.Loop(time=> this.countBeats(time-.1), this.loopDivision).start()	
	}

	makeSynth(){}

	makeDisplay(){}

	loadLevel(){}

	inputHandler(){}

	updateDisplay(){}

	onBar(time){

	}
	onBeat(time){

	}

	countBeats(time){
		const t = TheoryModule.Theory.now+.2
		this.curBeat = Math.floor(t)%4
		this.curBar = Math.floor(t/4)
		//console.log("bar ",this.curBar, " beat ", this.curBeat)
	}

	reset(){}

	gameOver(){}

	start(){}

	stop(){
		this.loop.stop()
	}
}

