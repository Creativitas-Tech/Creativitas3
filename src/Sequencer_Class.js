export class Sequencer{
  constructor(values = [], subdivision = '8n', enable = [true]){
    console.log('enter construct')
    this.subdivision = subdivision
    this.values = values
    this.enable = enable
    this.beatsPerBar = 4
    this.subdivisionsPerBeat = 4
    this.timeGrain = this.beatsPerBar * this.subdivisionsPerBeat
    this.loop =  new Tone.Loop((time) => {
//
    //Index calculations
    console.log(Tone.Transport.position)
    this.position = Tone.Transport.position.split(':');
    this.measure = parseInt(position[0]);
    this.beat = parseInt(position[1])
    this.sub = parseInt(position[2])
    this.interval = //parsed int from subdivision
    this.duration_scaler = this.timeGrain/interval
    console.log(sub)
  // console.log('Current measure:', measure);
  // console.log('Current beat:', beat);
    this.index =(measure * this.timeGrain*(1/this.duration_scaler))+(beat*this.subdivionsPerBeat*(1/duration_scaler))+Math.floor(sub/(this.timeGrain/this.interval))
    this.enable_index = index % this.enable.length
    this.values_index = index % this.values.length
//
    if (this.enable[this.enable_index]){
      console.log(this.values[this.values_index])
      this.val = this.values[this.values_index]
    }
    console.log(0)
    return 0
//
}, subdivision).start(0);
  console.log("sequencer ready")
  }
}