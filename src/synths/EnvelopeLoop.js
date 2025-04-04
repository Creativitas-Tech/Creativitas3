import * as Tone from 'tone';

export class EnvelopeLoop extends Tone.Envelope {
  constructor({
    loop = false,
    loopInterval = null, // Optional custom interval
    ...options // Spread to catch all regular Tone.Envelope options
  } = {}) {
    super(options);

    // Internal state
    this.loop = loop;
    this.loopInterval = loopInterval;
    this._loopEvent = null; // Tone.Transport event for looping
    this._duration = 0
    this.prevTime = 0
    this.velocity = 100
  }

  /**
   * Set same curve for attack, decay, and release.
   * @param {Array|Float32Array} curveArray - Array of values (0 to 1).
   */
  setCurve(curveArray) {
    this.attackCurve = curveArray;
    this.decayCurve = curveArray;
    this.releaseCurve = curveArray;
  }

  createExponentialCurve (length = 128, exponent = 4) {
    let curve = new Array(length);
    for (let i = 0; i < length; i++) {
      let x = i / (length - 1); // normalized position 0 to 1
      curve[i] = Math.pow(x, exponent); // exponential shape
    }
    this.setCurve(curve);
  }

  /**
   * Trigger the envelope and start loop if enabled.
   * @param {Time} duration - The duration of the note.
   * @param {number} velocity - Optional velocity.
   */
  triggerAttackRelease(duration, time, velocity) {
    // Call the parent class method to handle envelope
    //console.log('AR', this.loop, time)
    this._duration = duration
    super.triggerAttackRelease(duration, time);

    // If looping, schedule next trigger
    if (this.loop) {
      this._scheduleLoop(duration, time);
      
      //super.triggerAttackRelease(duration, time+.1, velocity);
      //super.triggerAttackRelease(duration, time+.4, velocity);
      //super.triggerAttackRelease(duration, time+.6, velocity);
      //super.triggerAttackRelease(duration, time+.7, velocity);
    }
  }

  /**
   * Schedule next envelope if loop is enabled.
   * @param {Time} duration - Duration passed to triggerAttackRelease.
   * @param {Time} time - Start time.
   */
  _scheduleLoop(duration, time) {
    
    // Clear previous event if it exists
    if (this._loopEvent) {
      //this._loopEvent.stop()
      //this._loopEvent.cancel()
      //this._loopEvent.dispose()
      Tone.Transport.clear(this._loopEvent);
      this._loopEvent = null;
      console.log('cleared')
    }

    // Calculate when to retrigger
    const envelopeDuration = this._getEnvelopeDuration();
    const interval = this.loopInterval !== null ? this.loopInterval : envelopeDuration;
    const time2 = time + envelopeDuration
    //console.log('schedule', interval, time, time2)

    this.prevTime = time
    // Schedule the next trigger
    this.loopEvent(envelopeDuration,time)
    // this._loopEvent = Tone.context.setTimeout(()=>{
    //   this.loopEvent
    //   this._loopEvent = Tone.context.setTimeout(()=>{
    //   console.log('loop', this._duration, time+envelopeDuration, envelopeDuration, time+interval, this.velocity)
    //   super.triggerAttackRelease(this._duration, this.prevTime);
    // },envelopeDuration)
    // },envelopeDuration)



    // this._loopEvent = Tone.Transport.scheduleOnce((scheduledTime) => {
    //   console.log('loop')
    //   this.triggerAttackRelease(duration, scheduledTime); // Recursively retrigger
    // }, `@${this.toSeconds(time) + interval}`);

  }

  loopEvent(envelopeDuration,time){
    this._loopEvent = Tone.context.setTimeout(()=>{
      Tone.Transport.clear(this._loopEvent);
      this.prevTime = this.prevTime+envelopeDuration
      console.log('loop', this.prevTime, envelopeDuration)
      super.triggerAttackRelease(this._duration, this.prevTime);
      this.loopEvent(envelopeDuration,this.prevTime)
    },envelopeDuration)
  }
  /**
   * Calculate total duration of envelope stages (attack + decay + release).
   */
  _getEnvelopeDuration() {
    return this.attack + this.decay// + this.release + this._duration;
  }

  /**
   * Stop looping.
   */
  stopLoop() {
    if (this._loopEvent) {
      Tone.Transport.clear(this._loopEvent);
      this._loopEvent = null;
    }
  }

  /**
   * Dispose envelope and stop loop.
   */
  dispose() {
    this.stopLoop(); // Clean up looping event
    super.dispose(); // Call parent class dispose
  }
}