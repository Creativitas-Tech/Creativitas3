export class ControlSource {
  constructor(name) {
    this.name = name;
    this.handlers = [];
    this.value = 0
    this.val = 0
    this.v = 0
  }

  connect(fn) {
    this.handlers.push(fn);
  }

  disconnect(fn) {
    const i = this.handlers.indexOf(fn);
    if (i !== -1) this.handlers.splice(i, 1);
  }

  emit(val) {
    this.value = val
    this.val = val
    this.v = val
    console.log(`[${this.name}] emit ${val}`);
    this.handlers.forEach(fn => fn(val));
  }

  scale(inMin, inMax, outMin, outMax) {
    const scaled = new ControlSource(`${this.name}.scale`);
    this.connect(val => {
      const norm = (val - inMin) / (inMax - inMin);
      scaled.emit(outMin + norm * (outMax - outMin));
    });
    return scaled;
  }

  smooth(amount = 0.1) {
    const smoothed = new ControlSource(`${this.name}.smooth`);
    let prev = null;
    this.connect(val => {
      prev = prev == null ? val : prev + amount * (val - prev);
      smoothed.emit(prev);
    });
    return smoothed;
  }
}