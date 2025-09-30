let audioURL = "120bpm_beat.mp3"
let output = new Tone.Multiply(0.05).toDestination()
const player = new Player(audioURL)
player.connect( output )
player.initGui()

//run this code after previous code is loaded!
player.playbackrate = 1 //negative is reverse!
player.fadein = 0
player.fadeout = 0.01
player.sustain = 1
player.divisions = 8 //divisor for time sequencing
player.sequence('0 1 2 3 4 5 6 7', '8n')
player.volume = 1

//try updating the audioURL, and then loading it into the player
// audioURL = "kalimba.mp3"
// audioURL = "vocal.mp3"
// player.load( audioURL)
// player.stop()
// player.load()
