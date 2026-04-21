import { NexusElement } from './parentNexus.js';

export class NexusSlider extends NexusElement {
    constructor(options = {}) {
        super('Slider', options);

        if( this.style !== 'default') {
            this.modifyRender()
            setTimeout( ()=> this.value = this.value, 5)
        }
        

        // this.element.render = function() {
        //   // Clear the canvas
        //   this.context.clearRect(0, 0, this.width, this.height);

        //   // 1. Draw the Track (Background)
        //   this.context.fillStyle = this.colors.fill;
        //   this.context.fillRect(0, this.height / 2 - 2, this.width, 4);

        //   // 2. Calculate handle position based on value (0 to 1)
        //   var handleX = this.value * (this.width - 10); // '10' is handle width

        //   // 3. Draw the Rectangular Handle
        //   this.context.fillStyle = this.colors.accent;
        //   // fillRect(x, y, width, height)
        //   this.context.fillRect(handleX, 0, 10, this.height); 
        // };
    }

    modifyRender(){
        // 1. Hide the circle entirely
        let circle = this.element.element.querySelector('circle');
        circle.style.display = 'none';

        // 1. Setup elements
        const myRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        const myLine = document.createElementNS("http://www.w3.org/2000/svg", "rect");

        const bounds = this.element.element.getBoundingClientRect();

        // 2. Attributes
        myRect.setAttribute("width", bounds.width);
        myRect.setAttribute("height", "35");
        myRect.setAttribute("fill", window.Nexus.colors.mid);
        myRect.setAttribute("rx", "5");
        myRect.setAttribute("ry", "5");
        myRect.style.pointerEvents = "none"; // Don't block mouse clicks

        myLine.setAttribute("width", "60");
        myLine.setAttribute("height", "2"); 
        myLine.setAttribute("fill", window.Nexus.colors.border);
        myLine.style.pointerEvents = "none"; // Don't block mouse clicks

        // 3. Append to SVG (Order matters!)
        this.element.element.appendChild(myRect);
        this.element.element.appendChild(myLine);

        this.element.on('change', (v) => {
            const val = typeof v === 'object' ? v.value : v;
            const bounds = this.element.element.getBoundingClientRect();
            const trackHeight = bounds.height;
            
            const hHeight = 35; // Handle Height
            const lHeight = 2;  // Line Height
            
            // Calculate Handle Position
            const yPos = (1 - val) * (trackHeight - hHeight);
            
            // Calculate Line Position (Relative to the handle)
            const yLinePos = yPos + (hHeight / 2) - (lHeight / 2);
            

            myRect.setAttribute("y", yPos);
            myLine.setAttribute("y", yLinePos);
            
            // Horizontal Centering
            const xPos = (bounds.width / 2) - 50; // (width/2) - (rectWidth/2)
            //myRect.setAttribute("x", xPos);
            //myLine.setAttribute("x", xPos);
        });
    }

    // ccSet is called by Parameter.set() to update the GUI without triggering callback
    ccSet(value) {
        // Validate value to prevent NaN errors
        if (this.element && typeof value === 'number' && !isNaN(value) && isFinite(value)) {
            // Clamp value to min/max range
            const clampedValue = Math.max(this._min || 0, Math.min(this._max || 1, value));
            this.element.value = clampedValue;
        }
    }

  
    // setMode(mode) {
    //     this.element.mode = mode; // "relative" or "absolute"
    // }

    get mode() {
        return this._mode;
    }

    set mode(type){
        this._mode = type;
        this.element.mode = type
    }

    get value() {
        return this.element.value;
    }
    set value(value) {
        this.element.value = value;
    }

    get step(){
        return this._step
    }

    set step(increment){
        this._step = increment;
        this.element.step = increment
    }

    get max() {
        return this._max;
    }
    set max(value) {
        this._max = value;
        this.element.max = value
    }

    get min() {
        return this._min;
    }
    set min(value) {
        this._min = value;
        this.element.min = value
    }

}