//Music Pong Apr 17th gem

/*
make player notes more obvious
- make sequence velocity less, s.seq[1].velocity = 30
- make player notes have longer duration 
- s.seq[0].duration = 1 for example

start and stop buttons
- ian will work on that

make levels
- every 32 rounds the sounds and colors change?
- drumbeat, synth sounds

other game options
- make the ball trigger a note at the middle crossing
- also trigger at 1/4
- two balls!
- what happens when the balls hit each other?
*/

// Initialize
let tempo = 120
let tempoIncrement = 1
let dxIncrement = 0.0001
Theory.tempo = tempo
let output = new Tone.Multiply(.1).toDestination()


// Instruments
let s = new Twinkle() // Player 1 Synth
let s1 = new Twinkle() // Player 2 Synth
let d = new DrumSampler()
let d1 = new DrumSampler()
let verb = new Reverb()
s.connect(output)
s1.connect(output)
d.connect(output)
d1.connect(output)
s.connect(verb)
s1.connect(verb)
verb.connect(output)
//
s.listPresets()
s.loadPreset('flute')
s1.listPresets()
s1.loadPreset('guitar')
//
// Instrument Parameters
s.velocity = 100
s.octave = 1
s.sustain = 1
//
s1.velocity = 100
s1.sustain = 1
//
d.snare_vca = 0.7
d.snare_rate = 0.74
d.snare_decay = 0.85
d.hat_vca = 0.7
d1.kick_rate = 4
d1.kick_decay = 1
d1.dryKick = 1
//
verb.type = 'hall'
verb.level = .3

// ── Game Constants & Variables ────────────────────────────────────────────────
let p1 = .50 // Player 1 paddle Y position
let p2 = .50 // Player 2 paddle Y position
let paddleHeight = .25 // Collision tolerance for paddles

// Player 1 Control (Left)
let Slide1 = new NexusSlider({
  x: .01, y: .5, width:0.5, height:5, style:'new',
  min: 0, max: 1, curve: 1,
  callback: function(a){
    p1 = 100-a*100
  },
  accentColor: '#AAA', borderColor: '#AAA'
})



// Player 1 Control (Left)
let Slide2 = new NexusSlider({
  x: .95, y: .5, width:.5, height:5, style:'new',
  min: 0, max: 1, curve: 1,
  callback: function(b){
    p2 = 100-b*100
  },
  accentColor: '#AAA', borderColor: '#AAA'
})

console.log(Slide1)

// ── Scoreboard ─────────────────────────────────────────────────────────────────

Nexus.backgroundColor = '#0bb2f4'

//Court Line
let sector = Nexus.drawLine([.50, 0], [.50, 1], '#FFF')
let sector2 = Nexus.drawLine([0, .50], [1, .50], '#FFF')

let scorePlayer1 = 0 
let scorePlayer2 = 0 

// Using GUI elements as text displays for the scoreboard
let scoreDisplay1 = new NexusText({
  label: 'P1: 0',
  x: .30, y: .05, w: 1, h: 1, size: 1, 
  backgroundColor: "#000", borderColor: "#000", textColor:'#0F0'
});

let scoreDisplay2 = new NexusText({
  label: 'P2: 0',
  x: .60, y: .05, w: 1, h: .5, size: 1, 
  backgroundColor: "#000", borderColor: "#000", textColor:'#0F0'
});

let updateScore = (player)=> {
  if(player === 'p1'){
    scorePlayer1+=1
    scoreDisplay1.text = 'P1: ' + scorePlayer1;
  }
  if(player === 'p2'){
    scorePlayer2+=1
    scoreDisplay2.text = 'P2: ' + scorePlayer1;
  }
}

// ── The Ball ───────────────────────────────────────────────────────────────────
let buttons = [];
buttons.push(new NexusButton({
  label: ' ',
  x: .50, y: .50,
  width: .4, height: .4,
  // borderColor: [230, 107, 25],
  // backgroundColor: [230, 107, 25]
}));

let dx = 0.005
let dy = 0.003

function resetBall(){
  buttons[0].x = .50;
  buttons[0].y = .50;
  // Randomize start direction and slight speed variations
  dx = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.2 + 0.4)/100;
  dy = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.2 + 0.3)/100;
}

// ── Music Logic ────────────────────────────────────────────────────────────────
// Pentatonic scale array to ensure collaborative melodies sound harmonious
let pitches = ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5'];

function getPitchFromPosition(yPos) {  
  let clampedPos = Math.max(0, Math.min(1, 1 - yPos/100));
  let index = Math.floor((clampedPos) * (pitches.length - 1));
  //console.log(pitches[index],yPos)
  return pitches[index]
  
}

let seq1 = []
let seq2 = []
let indseq1 = 0
let indseq2 = 0
const MAX_BOUNCE_ANGLE = Math.PI / 3; // 45 degrees in radians
const BALL_SPEED = 0.005; // Keep this constant
// ── Main Game Loop ─────────────────────────────────────────────────────────────
let loop = new Tone.Loop(time => {
  let ball = buttons[0];
  
  ball.x += dx
  ball.y += dy
  
  if(ball.y >= 1 || ball.y <= 0){
    dy = -dy;
    if (ball.y > 1) ball.y = 1;
    if (ball.y < 0) ball.y = 0;
    //d.play('*', '16n', 1)
  }

  
  // 2. Left Paddle (Player 1) Collision
  if(ball.x <= Slide1.x + .02 && dx < 0) {
    //console.log(ball.y - p1/100)
    if (Math.abs(ball.y - p1/100) <= paddleHeight/2) {
      console.log(ball.y - p1/100)
     // dx = Math.abs(dx) + dxIncrement; // Bounce back and speed up slightly
      

    let relativeIntersectY = (p1/100) - ball.y;
    let normalizedRelativeIntersectionY = (relativeIntersectY / (paddleHeight / 2));
    
    // 2. Calculate the bounce angle 
    // If it hits the center, angle is 0 (perfectly horizontal)
    let bounceAngle = normalizedRelativeIntersectionY * MAX_BOUNCE_ANGLE;
    
    // 3. Update velocities using Trigonometry
    // We use Math.abs for dx to ensure it always goes "away" from the paddle (Right for P1)
    dx = Math.cos(bounceAngle) * BALL_SPEED;
    dy = -Math.sin(bounceAngle) * BALL_SPEED; // Negative because Y is usually inverted in Canvas

    // Optional: Increment the base speed slightly each hit
    BALL_SPEED += dxIncrement;




      s.play(getPitchFromPosition(p1)); // Play mapped pitch
      seq1.push(getPitchFromPosition(p1))
      if(seq1.length%8 == 0 && seq1.length > 0){
        s.sequence(seq1.slice(-8), '8n', 1)
        s.seq[1].octave = 1
        s.seq[0].octave = -1
        s.seq[1].velocity = 60
        indseq1 = 0
      }
    } else if (ball.x <= 0) {
      // Missed: Player 2 Scores
      console.log(ball.y, p1/100, ball.y - p1/100)
      updateScore('p2');
      //d.play('*', '16n', 1) // Oof sound
      s.stop()
      seq1 = []
    
      resetBall();
    }
  }
  
  // 3. Right Paddle (Player 2) Collision
  if(ball.x >= Slide2.x - .02 && dx > 0) {
    //console.log(ball.y - p1/100)
    if (Math.abs(ball.y - p2/100) <= paddleHeight/2) {
      //dx = -(Math.abs(dx) + dxIncrement); // Bounce back and speed up slightly
      
    let relativeIntersectY = (p2/100) - ball.y;
    let normalizedRelativeIntersectionY = (relativeIntersectY / (paddleHeight / 2));
    
    // 2. Calculate the bounce angle 
    // If it hits the center, angle is 0 (perfectly horizontal)
    let bounceAngle = normalizedRelativeIntersectionY * MAX_BOUNCE_ANGLE;
    
    // 3. Update velocities using Trigonometry
    // We use Math.abs for dx to ensure it always goes "away" from the paddle (Right for P1)
    dx = -Math.cos(bounceAngle) * BALL_SPEED;
    dy = -Math.sin(bounceAngle) * BALL_SPEED; // Negative because Y is usually inverted in Canvas

    // Optional: Increment the base speed slightly each hit
    BALL_SPEED += dxIncrement;


      s1.play(getPitchFromPosition(p2)); // Play mapped pitch
      seq2.push(getPitchFromPosition(p2))
      if(seq2.length%8 == 0 && seq2.length > 0){
        
        s1.sequence(seq2.slice(-8),'8n', 1)
        s1.seq[1].octave = 2
        s1.seq[0].octave = -1
        s1.seq[1].velocity = 60
        indseq2 = 0
      }
    } else if (ball.x >= 1) {
      // Missed: Player 1 Scores
      console.log(ball.y, p2/100, ball.y - p2/100)
      //d.play('*', '16n', 1) // Oof sound
      s1.stop(1)
      seq2 = []
      updateScore('p1');
      resetBall();
    }

    checkLevel()
  }
}, '128n') // Use a fast subdivision for smoother UI tick-rate


// Start the engine
Tone.Transport.start();
loop.start();

let curLevel = 0
let checkLevel = ()=>{
  let sum = seq1.length + seq2.length
  if( Math.floor(sum/8) != curLevel) {
    curLevel = Math.floor(sum/8)
    console.log('level', curLevel, seq1, seq2)
    if( curLevel == 0) section1()
    if( curLevel == 2) section2()
    if( curLevel == 4) section3()
    if( curLevel == 6) section4()
  }
}

let section1 = ()=>{
  d.sequence('*...')
  Nexus.backgroundColor = '#0bb2f4'
  Theory.tempo = 120
}

let section2 = ()=>{
  d.sequence('O.*.')
  Nexus.backgroundColor = '#A0A'
  Theory.tempo = 125
}

let section3 = ()=>{
  d.sequence('O***')
  Nexus.backgroundColor = '#0AA'
  Theory.tempo = 130
}

let section4 = ()=>{
  d.sequence('O**o X***')
  Nexus.backgroundColor = '#CCC'
  Theory.tempo = 140
}