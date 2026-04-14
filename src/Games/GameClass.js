import * as Tone from 'tone';
import * as TheoryModule from '../TheoryModule.js';

export class Game{
	constructor(){
		this.level_number = 0
		this.started = false
		this.loop = null
		this.tempo = 90
		this.loopDivision = '4n'
		this.curBeat = 0
		this.curBar = 0
		this.chord = 0
		this.targets = []
		this.played = []
		this.missed = 0
		this.updateRate = 4
	}

	init(){
		if( !this.started){
			this.audio = this.makeSynth()
			this.gui = this.makeDisplay()
			this.loop = new Tone.Loop(time=> {
				this.onBeat(time)
				if(this.curBeat == 0) this.onBar(time)
			}, this.loopDivision).start()	
			this.counterLoop = new Tone.Loop(time=> this.countBeats(time-.1), this.loopDivision).start()	
		}
		this.started = true
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
		// console.log("bar ", this.curBar, " beat ", this.curBeat)
	}

	updateTarget(){}

	reset(){}

	gameOver(){
		this.stop()
		console.log('Game over')
	}

	start(){}

	stop(){
		this.loop.stop()
		this.counterLoop.stop()
		this.started = false
		for(let synth in this.audio) {
			try{
				this.audio[synth].stop()
			}catch(e){console.log(e)}
		}
	}
}

