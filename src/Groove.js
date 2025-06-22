import * as Tone from 'tone';

class GrooveGenerator {
  constructor(size = 16, baseValue = '16n') {
    this.size = size;
    this.baseValue = baseValue;
    this.strength = 1.0;
    this.timing = new Array(size).fill(0);
    this.velocity = new Array(size).fill(1.0);
    this.preset = null;
    this._humanizer = new EMAHumanizer(0.9); // separate class below
  }

  // Humanization via Exponential Moving Average (EMA)
  humanize(amount = 0.01, velocityRange = 0.1) {
    for (let i = 0; i < this.size; i++) {
      this.timing[i] = this._humanizer.next() * amount;
      this.velocity[i] = 1 + this._humanizer.next() * velocityRange;
    }
  }

  // Get groove value for a given subdivision and index
  get(subdivision, index) {
  	const quarter = Tone.Time('4n')
  	if( subdivision=='32n') index = Math.floor(index/2)
  	else if( subdivision == '16n') index = index
  	else if( subdivision == '8n') index = index*2
  	else if( subdivision == '4n') index = index*4
  	else if( subdivision == '2n') index = index*8
  	else index = 0	
    const baseSteps = this.size;
    const scaledIndex = Math.floor(index) % baseSteps;
    const timingOffset = this.timing[scaledIndex] * this.strength * quarter
    return { 
      timingOffset: timingOffset,
      velocityMult: this.velocity[scaledIndex] * this.strength
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