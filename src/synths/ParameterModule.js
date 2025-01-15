/*

//define parameters
let paramDefinitions = [
      {name:'time',min:0.01,max:1,curve:2,callback:this.setDelayTime},
      {name:'feedback',min:0.0,max:1.2,curve:.7,callback:this.setFeedback}
    ]

    //populate array of parameters
    this.param = this.generateParameters(paramDefinitions)
    //generate setters and getters
    this.createAccessors(this, this.param);


    generateParameters(paramDefinitions) {
    const params = {};
    paramDefinitions.forEach((def) => {
      const param = new Parameter(def);
      params[def.name] = param;
    });
    return params;
  }

  createAccessors(parent, params) {
    Object.keys(params).forEach((key) => {
      Object.defineProperty(parent, key, {
        get: () => params[key].value,
        set: (newValue) => {
          params[key].value = newValue;
        },
      });
    });
  }

  //access parameters by:
  object.time = .1 //called by gui element
  object.feedback = .5

  //also: setter should update a linked gui object
*/

export class Parameter {
  constructor(options) {

    this.name = options.name || 'param'
    this.min = options.min || 0;
    this.max = options.max || 1;
    this.curve = options.curve || 1; // Curve for value scaling
    this._value = Array.isArray(options.value)?options.value : options.value || this.scaleValue(0.5, 0, 1, this.min, this.max, this.curve); // Real to normalized
    this.rawValue = this.unScaleValue(options.value || 0.5, 0, 1, this.min, this.max, this.curve); // Normalized to real
    this.callback = options.callback || function(x){}
    //this._value = this.min; // Initial value
    this._value = Array.isArray(options.value)
            ? [...options.value]
            : (options.value || 0);
    this.normalizedValue = 0

    // Automatically generate setter and getter for the parameter
    
    };

    get(index = null) {
      if (Array.isArray(this._value)) {
          return index !== null ? this._value[index] : this._value;
      }
      return this._value;
    }
    set(newValue, index = null) {
      console.log(newValue, index, this._value)
      if (Array.isArray(this._value)) {
          if (Array.isArray(newValue)) {
              // Set the entire array
              this._value.splice(0, this._value.length, ...newValue);
              console.log('a', newValue)
              for(let i=0;i<newValue.length;i++){
                this.callback(newValue[i], i); // Callback for the entire array
              }
          } else if (index !== null) {
              // Set individual array element
              this._value[index] = newValue;
              console.log('t', newValue, index)
              this.callback(newValue, index); // Callback for the single element
          } else {
              // Fill the array with a single value
            console.log('o', newValue, index)
              this._value.fill(newValue);
            for(let i=0;i<this._value.length;i++){
                this.callback(this._value[i], i); // Callback for the entire array
              }
          }
      } else {
          // Set scalar value
        console.log('x', newValue, index)
          this._value = newValue;
          this.callback(newValue, null);
      }
  }
  

  // Attach a GUI control to this parameter
  attachControl(control) {
    this.control = control;
    control.onChange = (newValue) => {
      this.value = newValue; // Update the parameter when the control changes
    };
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
    return realMin + (Math.pow(value, curve) * (realMax - realMin));
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
