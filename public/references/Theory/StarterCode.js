//Set the base tempo
Theory.tempo = 96
//you can use this tempo to set delay times
//tempo is beats per minute
//delay times are in seconds
//one beat in seconds is always 60/Theory.tempo
let delay = new AnalogDelay()
delay.time = 60/Theory.tempo

//You can set the key
Theory.root = 'C' //only major keys for now

//You can also define a chord progression
Theory.progression = 'I IV V vi'
//lower case roman numerals are minor chords
//you can use b's and #'s'
Theory.progression = 'I bIII iv V7'