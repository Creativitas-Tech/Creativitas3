let audioURL = "audio/pintoDrums.wav"
let output = new Tone.Multiply(0.05).toDestination()
const player = new Player(audioURL)
const player2 = new Player("audio/pintoBass.wav")
player.connect( output )
player2.connect(output)
Theory.tempo = 90
output.factor.value = 1
player.initGui()
player2.initGui()

//standard playback order
player.sequence('0 1 2 3 4 5 6 7', '8n')
player2.sequence('0 1 2 3 4 5 6 7', '8n')
//you might need to set sustain to 1
player.sustain = 1
player2.sustain = 1

//breakbeat!
player.sequence('0 2 3 4 4 7 2 7 0 1 7 6 5 4 3 2', '16n')
player2.sequence('0 1 1 1 5 6 5 6', '8n')

player2.stop()
player.stop()