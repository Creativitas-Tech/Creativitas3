import * as Tone from 'tone';

export class Game{
	constructor(){
		this.levelNum = 0
		this.loop = null
		this.tempo = 90
		this.loopDivision = '4n'
	}

	init(){
		this.audio = this.makeSynth()
		this.gui = this.makeDisplay()
		this.loop = new Tone.Loop(time=> this.onBeat(time), this.loopDivision).start()	
	}

	makeSynth(){}

	makeDisplay(){}

	loadLevel(){}

	inputHandler(){}

	updateDisplay(){}

	onBeat(time){

	}

	reset(){}

	gameOver(){}

	start(){}

	stop(){
		this.loop.stop()
	}
}

