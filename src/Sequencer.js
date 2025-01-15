import * as Tone from 'tone'

/**
 * Class representing a Sequencer.
 */
export class Sequencer{

  /**
   * Creates a sequencer.
   * 
   * @param {object|null} [control=null] - The control object that the sequencer will manipulate (e.g., a Synth, Filter, etc.).
   * @param {number} [values=16] - The number of values that the sequencer will step through.
   * @param {string} [subdivision='8n'] - The rhythmic subdivision for the sequencer (e.g., '8n' for eighth notes).
   * @param {boolean} [enables=0] - The number of boolean values that enable or disable specific steps in the sequence.
   */
  constructor(control = null, values = 8, subdivision = '8n', enables = 0){
    //console.log('enter construct')
    this.gui = null
    this.subdivision = subdivision
    this.control = control
    this.callback = this.callback = function(i,time){
      console.log('To set custom callback: this.callback = (your function here)')
    }
    this.setCallback(this.control)
    this.values = new Array(values).fill(0)
    this.tempVal = values
    this.enables = new Array(enables).fill(0)
    this.tempenables = enables
    this.beatsPerBar = 4
    this.subdivisionsPerBeat = 4
    this.enables_index = 0
    this.values_index = 0
    this.timeGrain = this.beatsPerBar * this.subdivisionsPerBeat
    this.env = new Tone.Envelope()
    this.loop =  new Tone.Loop((time) => {
  //
      //Index calculations
        //console.log(Tone.Transport.position)
        this.time = time
        this.position = Tone.Transport.position.split(':');
        this.measure = parseInt(this.position[0]);
        this.beat = parseInt(this.position[1])
        this.sub = parseInt(this.position[2])
        this.interval = parseInt(this.subdivision)//parsed int from subdivision
        this.loop.interval = this.subdivision
        this.duration_scaler = this.timeGrain/this.interval
        this.index =(this.measure * this.timeGrain*(1/this.duration_scaler))+(this.beat*this.subdivisionsPerBeat*(1/this.duration_scaler))+Math.floor(this.sub/(this.timeGrain/this.interval))
        //console.log(this.index)
        this.temp_enables_index = this.enables_index
        this.temp_values_index = this.values_index
        this.enables_index = this.index % this.enables.length
        this.values_index = this.index % this.values.length
        
        //console.log(this.values_index)
    //
        if (this.enables.length == 0){
          this.val = this.values[this.values_index]
          this.callback(this.val, time)
          //console.log(this.val)
        }

        else if (this.enables[this.enables_index]){
          //console.log(this.values[this.values_index])
          this.val = this.values[this.values_index]
          this.callback(this.val, time)
          //console.log(this.val)
          
        }
        else {
          //console.log(0)
          //this.val = 0
        }

        

       if(this.interface !== undefined){
        this.interface.updateGui(this.values_index, this.enables_index)

      }
                
    //
    }, this.subdivision);
  //console.log("sequencer ready")
  }
  /**
   * Sets the GUI interface for the sequencer.
   * 
   * @param {string} name - The name of the GUI interface to use (e.g., 'stepSequence', 'circularSequence').
   * @param {object} gui - The GUI object.
   */
  setGui(name, gui, x=10, y=10, rows=1){
    this.gui = gui
    if(name === "stepSequence") this.interface = new stepSequence(this, gui, x,y,rows)
    else if (name === "circularSequence") this.interface = new circularSequence(this, gui,x,y,rows)
  }

  /**
   * Starts the sequencer loop and the Tone.js Transport.
   */
  start() {
    // Start the loop and the transport
    this.loop.start(0);
    Tone.Transport.start();
  }

  /**
   * Stops the loop
   */
  stop() {
    this.loop.stop()
  }

  /**
   * Sets the callback function that will be triggered on each step of the sequence.
   * 
   * @param {object|function} control - The control object or function to use as the callback.
   */
  setCallback(control) {
    if (control == null) {
      return
    }

    else if (control.name === 'Synth'){
      //console.log(true)
      this.callback = function(i, time){
        if (this.val) {
          //console.log(this.control)
          //console.log(this.val)
          this.control.triggerAttackRelease(this.val,100,.01,time)
        }
      }
    }

    else if (control.name === 'Drum'){
      this.callback = function(){
      
      }
    }

    else if (control.name === 'Filter'){
      this.callback = function(){
        this.control.frequency.value = this.val
      }
    }

    else if (control.name === 'Multiply'){
      this.callback = function(){
        this.control.factor.value = this.val
      }
    }

    else if (control.name === 'Envelope'){
      this.callback = function(){
        this.control.decay = this.val
        this.control.release = this.val*1.2
      }
    }

    else if (control.name === 'Oscillator'){
      //console.log(true)
      this.callback = function(){
        if (this.val) {
          this.control.frequency.setValueAtTime(Tone.Midi(this.val).toFrequency(), this.time)
          this.env.triggerAttackRelease(this.subdivision, this.time)
        }
      }
    }

    else if (typeof control === 'function'){
      this.callback = control
    }
  }
} 
// so the idea is make methods that check to see if you should execute a sequence for midi, delay, cutoff
// frequencies, scale degrees, etc., and return a true or false value. Given that true or false the loop
// should execute different things. So the midi method should be

/**
 * Class representing a step sequencer GUI with a linear layout
 */
class stepSequence{
  /**
   * Creates a step sequencer interface.
   * 
   * @param {object} target - The target sequencer object that this GUI will control.
   * @param {object} gui - The GUI object used to create controls.
   */
  constructor(target, gui, x,y,rows = 2){
    this.gui = gui
    this.rows = rows
    this.enColumns = target.enables.length / this.rows
    this.valColumns = target.values.length / this.rows
    this.target = target
    this.initGui(x,y)
    this.prevVal = 0
    this.prevEnable = 0
  }
  /**
   * Initializes the GUI controls for the step sequencer.
   * 
   * @param {number} [x=10] - The x-coordinate for the start of the GUI layout.
   * @param {number} [y=10] - The y-coordinate for the start of the GUI layout.
   */
  initGui( x = 10, y = 10) {
    //make your sequencer.gui here
    this.x = x
    this.y = y
    this.enables_array = []
    this.values_array = []

    for(let j=0;j<this.rows;j++){
      for( let i=0; i<this.enColumns; i++){
        this.enables_array.push(this.createToggle('En'+(i+1+j*this.enColumns).toString(), x*i+10, y+10+j*25, 0.3, [200,50,0],  x => this.target.enables[i+j*this.enColumns] = x))
        this.enables_array[i+j*this.enColumns].set(1)
      }
    }
    for(let j=0;j<this.rows;j++){
      for( let i=0; i<this.valColumns; i++){
      this.values_array.push(this.createKnob((i+1+j*this.valColumns).toString(), x*i+10, y+j*25, 0, 127, .75,  [200,50,0],  x => this.target.values[i+j*this.valColumns] = Math.floor(x)))
      }
    }
    this.playButton = this.createToggle('Pause/Play', x-10, y, 1, [200,50,0], x => this.togglePlay(x))
    this.playButton.set(1)
    console.log(x,y)

    //this.playText = this.gui.Text({label:"play", x:50,y:20})
  }

  /**
   * Updates the GUI to reflect the current state of the sequencer.
   * Called in the sequencer's loop.
   * 
   * @param {number} values - The current index of the values array.
   * @param {number} enables - The current index of the enables array.
   */
  updateGui(values, enables){
    if(this.values_array.length > 0){
      this.values_array[values].accentColor = [0, 250, 0]
      this.values_array[this.prevVal].accentColor = [0, 0, 200]
      this.prevVal = values
    }

    if(this.enables_array.length > 0){
      this.enables_array[enables].accentColor = [0, 250, 0]
      this.enables_array[this.prevEnable].accentColor = [0, 0, 200]
      this.prevEnable = enables
    }

  }

  createKnob(_label, _x, _y, _min, _max, _size, _accentColor, callback) {
    //console.log(_label)
    return this.gui.Knob({
      label:_label, min:_min, max:_max, size:_size, accentColor:_accentColor,
      x: _x + this.x, y: _y + this.y,
      callback: callback,
      curve: 1, // Adjust as needed
      border: 4, // Adjust as needed
      showLabel: 0, showValue: 0
    });
  }

  createToggle(_label, _x, _y, _size, _accentColor, callback) {
    //console.log(_label)
    return this.gui.Toggle({
      label:_label, size:_size, accentColor:_accentColor,
      x: _x + this.x, y: _y + this.y,
      callback: callback,
      border: 5, // Adjust as needed
      showLabel: 0, showValue: 0,
      cornerRadius: .1
    });
  }
  /**
   * Toggles the playback state of the sequencer.
   * 
   * @param {boolean} x - If true, starts the sequencer; otherwise, stops it.
   */
  togglePlay(x){
    if (x){
      return this.target.start()
    }
    return this.target.stop()
  }
}

/**
 * Class representing a step sequencer GUI with a circular layout
 */
class circularSequence extends stepSequence{
  /**
   * Creates a circular step sequencer interface.
   * 
   * @param {object} target - The target sequencer object that this GUI will control.
   * @param {object} gui - The GUI object used to create controls.
   */
  constructor(target, guix,y,rows){
    super(target, guix,y,rows)
  }

  /**
   * Initializes the GUI controls for the step sequencer.
   * 
   * @param {number} [x=10] - The x-coordinate for the start of the GUI layout.
   * @param {number} [y=10] - The y-coordinate for the start of the GUI layout.
   */
  initGui(x = 25, y = 25) {
    this.x = x;
    this.y = y;
    this.enables_array = [];
    this.values_array = [];

    const centerX = this.x;
    const centerY = this.y;
    const radius = 100; // Adjust the radius as needed
    const knobRadius = radius + 80; // Knobs on the outside

    const numElements = Math.max(this.target.enables.length, this.target.values.length);
    const angleStep = 2*Math.PI / numElements;

    // Create buttons in the inner circle
    for (let i = 0; i < this.target.enables.length; i++) {
        const angle = i * angleStep;
        const buttonX = centerX + radius * Math.cos(angle)/10;
        const buttonY = centerY + radius * Math.sin(angle)/5;
        
        this.enables_array.push(this.createToggle('En'+(i+1).toString(), buttonX, buttonY, 0.3, [200, 50, 0], x => this.target.enables[i] = x));
        this.enables_array[i].set(1);
    }

    // Create knobs in the outer circle
    for (let i = 0; i < this.target.values.length; i++) {
        const angle = i * angleStep;
        const knobX = centerX + knobRadius * Math.cos(angle)/10;
        const knobY = centerY + knobRadius * Math.sin(angle)/5;

        this.values_array.push(this.createKnob((i + 1), knobX, knobY, 24, 72, 0.8, [200, 50, 0], x => this.target.values[i] = Math.floor(x)));
    }

    // Place the play button in the center
    this.playButton = this.createToggle('Pause/Play', centerX, centerY, 1, [200, 50, 0], x => this.togglePlay(x));
    this.playButton.set(1)
    this.playText = this.gui.Text({label:"play", x:50,y:50, border:1})
  }
}