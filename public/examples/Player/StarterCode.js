let audioURL = "audio/120bpm_beat.mp3"
let output = new Tone.Multiply(0.05).toDestination()
const player = new Player(audioURL)
player.connect( output )
player.initGui()

player.playbackrate = 1 //negative is reverse!
player.fadeIn = 0.01
player.fadeOut = 0.01
player.sustain = 1
player.divisions = 8 //divisor for time sequencing
player.sequence('0 1 2 3 4 5 6 7', '8n')
player.volume = 1

//try updating the audioURL, and then loading it into the player
audioURL = "audio/kalimba.mp3"
audioURL = "audio/vocal.mp3"
player.load( audioURL)
player.stop()
player.load()
