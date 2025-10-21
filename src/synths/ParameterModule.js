/*
*/

import basicLayout from './layouts/basicLayout.json';
import { Seq } from '../Seq'

export class Parameter {
  constructor(parent,options, gui = null, layout = basicLayout) {
    //console.log(options)
    this.parent = parent
    this.name = options.name || 'param'
    this.min = options.min || 0;
    this.max = options.max || 1;
    this.curve = options.curve || 1; // Curve for value scaling
    this.rawValue = Array.isArray(options.value) ? options.value 
        : this.unScaleValue(options.value || 0.5, 0, 1, this.min, this.max, this.curve); // Normalized to real
    this.normalizedValue = 0
    this.group = options.group || 'default'; // Group assignment
    this._value = Array.isArray(options.value) ? options.value
        : options.value !== undefined ? options.value
        : this.scaleValue(0.5, 0, 1, this.min, this.max, this.curve);
    this.callback = options.callback || function () {};
    this.control = null; // GUI control
    this.gui = gui; // GUI framework
    this.layout = layout || basicLayout; // Layout info
    this.type = options.type || 'vcf'
    this.radioOptions = options.radioOptions || null; // Store available options for radioBox
    this.guiElements = []; // Store references to GUI elements for array values
    this.labels = options.labels || null;
    this.seq = null
    this.set(this._value)
    this.subdivision = '4n'
    //mapping
    this.sourceContributions = new Map();  // source → value
    this.sources = [];  // [{ source, handler }]
  };

  get(index = null) {
    if (Array.isArray(this._value)) {
        return index !== null ? this._value[index] : this._value;
    }
    return this._value;
  }
  set =  (newValue, index = null, calledByGui=false, time = null) => {
    //console.log('paramset', this._value, this.name, newValue, index, calledByGui,time)
    if (Array.isArray(this._value)) {
        if (Array.isArray(newValue)) {
            // Set entire array
            this._value = [...newValue];
            //this.callback(newValue, time);
            //newValue.forEach((val, i) => this.callback(val,  time));
        } else if (index !== null) {
            // Set specific index
            this._value[index] = newValue;
            this.callback(newValue, time);
        } else {
            // Fill array with single value
            this._value.fill(newValue);
            this._value.forEach((val, i) => this.callback(val, time));
        }
    } else {
        // Scalar value
        this._value = newValue;
        //console.log(this.callback)
        this.callback(newValue, time);
    }

    // Update GUI if attached
    // Update GUI elements
    if(calledByGui==false && this.type !== 'hidden'){
      if (Array.isArray(this._value)) {
          this.guiElements.forEach((gui, i) => gui.ccSet(this._value[i]));
      } else if (this.guiElements.length > 0) {
          this.guiElements[0].ccSet (this._value);
      }
    }
  }
  
  //define sequencer controls
    sequence(valueArray,subdivision){
        //console.log('p', subdivision)
        if (this.seq) {
            this.seq.dispose(); // Dispose of existing sequence
        }
        this.seq = new Seq(
            this,
            valueArray,
            subdivision,
            'infinite',
            0,
            ((v, time) => {
                //console.log(v,time)
                this.parent.param[this.name].set(Number(v[0]),null,false, time)}).bind(this)
            // Ensure time is passed
        );
    }
    stop(){
        if (this.seq) {
            this.seq.dispose();
            this.seq = null;
        }
    }

  // Attach a GUI control to this parameter
  attachControl(control) {
    this.control = control;
    control.onChange = (newValue) => {
      this.value = newValue; // Update the parameter when the control changes
    };
  }

  createGui() {
        const { x, y, width, height } = this.layout;
        const groupColor = this.getGroupColor(this.group);

        this.control = this.gui.Knob({
            label: this.name,
            min: this.min,
            max: this.max,
            size: width,
            x:x,
            y:y,
            accentColor: groupColor,
            callback: (value) => this.set(value),
        });

        // Sync initial value
        this.control.setValue(this.get());
    }

    //parameter mapping function
    from(source, {
      transform = null,
      smoothing = 0,
      index = null,
      priority = 0,
    } = {}) {
      let prev = null;

      // Resolve transform only once
      if (!transform) {
        transform = (val) => this.scaleValue(val, 0, 127, this.min, this.max, this.curve);
      }
      this.transform = transform

      const handler = (val) => {
          const v = (val) 
          if (smoothing > 0) {
            v = prev == null ? v : prev + smoothing * (v - prev);
            prev = v;
          }

          this.sourceContributions.set(source, v);
          this.updateFromSources(index);
        };

      source.connect(handler);
      this.sources.push({ source, handler });
    }

    updateFromSources(index = null) {
      const sum = Array.from(this.sourceContributions.values())
        .reduce((a, b) => a + b, 0);

        const val = this.transform(sum)
      // Clamp to parameter's min/max
      //const clamped = Math.max(this.min, Math.min(this.max, sum));
      this.set(val, index, false);
    }

    getGroupColor(group) {
        const colors = {
            vco: [200, 0, 0],
            vcf: [0, 200, 0],
            env: [0, 0, 200],
            default: [100, 100, 100],
        };
        return colors[group] || colors.default;
    }

  /**
   * Set the parameter value in real-world units (e.g., hertz or amplitude).
   * @param {number} realValue - The real-world value of the parameter.
   */
  setRealValue(realValue) {
    this.value = realValue;
    this.rawValue = this.unScaleValue(realValue, this.min, this.max, 0, 1, this.curve);
  }

  /**
   * Get the parameter value in real-world units (e.g., hertz or amplitude).
   * @returns {number} - The real-world value of the parameter.
   */
  getRealValue() {
    return this.value;
  }

  /**
   * Set the parameter value in normalized units (0-1).
   * @param {number} normalizedValue - The normalized value (0-1).
   */
  setNormalizedValue(normalizedValue) {
    this.rawValue = normalizedValue;
    this.value = this.scaleValue(normalizedValue, 0, 1, this.min, this.max, this.curve);
  }

  /**
   * Get the parameter value in normalized units (0-1).
   * @returns {number} - The normalized value (0-1).
   */
  getNormalizedValue() {
    return this.rawValue;
  }

  /**
   * Scale a normalized value (0-1) to a real-world value based on min, max, and curve.
   * @param {number} value - The normalized value (0-1).
   * @param {number} min - The minimum real-world value.
   * @param {number} max - The maximum real-world value.
   * @param {number} curve - The curve factor to adjust scaling.
   * @returns {number} - The scaled real-world value.
   */
  scaleValue(value, min, max, realMin, realMax, curve) {
      // Normalize value to 0–1 using min/max
      const norm = (value - min) / (max - min);
      // Clamp to 0–1 so out-of-range input doesn't explode
      //const clamped = Math.max(0, Math.min(1, norm));
      // Apply curve and scale to realMin–realMax
      return realMin + Math.pow(norm, curve) * (realMax - realMin);
    }

  /**
   * Convert a real-world value back into a normalized value (0-1) based on min, max, and curve.
   * @param {number} value - The real-world value.
   * @param {number} min - The minimum real-world value.
   * @param {number} max - The maximum real-world value.
   * @param {number} curve - The curve factor to adjust scaling.
   * @returns {number} - The normalized value (0-1).
   */
  unScaleValue(value, realMin, realMax, min, max, curve) {
    return Math.pow((value - realMin) / (realMax - realMin), 1 / curve);
  }
}
