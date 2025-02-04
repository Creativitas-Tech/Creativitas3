let audioURL = "audio/vocal.mp3"
let output = new Tone.Multiply(0.05).toDestination()
const player = new Player(audioURL)
player.connect( output )

player.cutoff = 10000
player.volume = -6
player.playbackRate = 1 //must be positive
player.reverse = false
player.fadeIn = 0.01
player.fadeOut = 0.1
player.get()
player.sustain = .01
player.sequenceTime = true
player.baseUnit = 128 //divisor for time sequencing
player.sequence('0 3 2 1 4 3 2 6 0', '16n')



//try updating the audioURL, and then loading it into the player
audioURL = "audio/kalimba.mp3"
audioURL = "audio/vocal.mp3"
player.load( audioURL)
player.load()
