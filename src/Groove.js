import * as Tone from 'tone';

class GrooveGenerator {
  constructor(size = 16, baseValue = '16n') {
    this.baseValue = baseValue;
    this.strength = 1.0;
    this.timing = new Array(2).fill(0);
    this.velocity = new Array(2).fill(1.0);
    this.preset = null;
    this._humanizerV = new EMAHumanizer(0.9); // separate class below
    this._humanizerT = new EMAHumanizer(0.97); // separate class below
  }

  // Humanization via Exponential Moving Average (EMA)
  humanize(amount = 0.01, velocityRange = 0.1) {
    for (let i = 0; i < this.velocity.size; i++) {
      this.velocity[i] = 1 + this._humanizerV.next() * velocityRange;
    }
    for (let i = 0; i < this.timing.size; i++) {
      this.timing[i] = this._humanizerT.next() * amount;
    }
  }

  // Get groove value for a given subdivision and index
  get(subdivision, index) {
  	const quarter = Tone.Time('4n')
  	// console.log(subdivision,index)
  	if( subdivision==='32n') index = Math.floor(index/2)
  	else if( subdivision === '16n') index = index
  	else if( subdivision === '8n') index = index*2
  	else if( subdivision === '4n') index = index*4
  	else if( subdivision === '2n') index = index*8
  	else index = 0	
  	//console.log(index, this.velocity[index%this.velocity.length])
    const timingOffset = this.timing[index%this.timing.length] * this.strength * quarter*0.25
    const velocityScale = this.velocity[index%this.velocity.length] * this.strength
    return { 
      timing: timingOffset,
      velocity: velocityScale
    };
  }

  setPreset(presetName) {
    if (this.preset && this.preset[presetName]) {
      const { timing, velocity } = this.preset[presetName];
      this.timing = [...timing];
      this.velocity = [...velocity];
    } else {
      console.warn(`Preset "${presetName}" not found.`);
    }
  }

  // Convert notation like "16n", "8n" into step scaling
  _subdivisionToRatio(subdivision) {
    const base = parseInt(this.baseValue.replace('n', ''));
    const target = parseInt(subdivision.replace('n', ''));
    return base / target;
  }
}

// Helper class for smoothed randomness
class EMAHumanizer {
  constructor(smoothness = 0.9) {
    this.smoothness = smoothness;
    this.value = 0;
  }

  next() {
    const change = (Math.random() * 2 - 1) * (1 - this.smoothness);
    this.value = this.value * this.smoothness + change;
    return this.value;
  }
}

// Export a singleton instance
const Groove = new GrooveGenerator();
export default Groove;