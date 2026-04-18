// NexusUI wrapper base class
// Uses the global Nexus object from the nexusui npm package

// Static flag to track if Canvas has been initialized
let canvasInitialized = false;

/**
 * Initialize the Canvas container for NexusUI elements
 * Call this once before creating NexusUI elements, or it will be called automatically
 * @param {string} backgroundColor - Optional background color (default: '#1a1a2e')
 */
export function initNexusCanvas(backgroundColor = '#1a1a2e') {
    const container = document.getElementById('Canvas');
    if (!container) {
        console.error('initNexusCanvas: #Canvas container not found!');
        return null;
    }
    
    // Set up Canvas styling for NexusUI
    container.style.backgroundColor = backgroundColor;
    container.style.margin = '0';
    container.style.padding = '0';
    // Add this to your initNexusCanvas function
    container.style.minHeight = '100vh'; // Or '100vh' for full screen
    container.style.display = 'block';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    container.style.zIndex = '100';
    container.style.pointerEvents = 'auto'; // Ensures you can actually touch the GUI
    
    canvasInitialized = true;
    return container;
}

const scaleOutput = function (input, inLow, inHigh, outLow, outHigh, curve) {
    if (curve === undefined) curve = 1;
    let val = (input - inLow) * (1 / (inHigh - inLow));
    val = Math.pow(val, curve);
    return val * (outHigh - outLow) + outLow;
}

const unScaleOutput = function (input, outLow, outHigh, inLow, inHigh, curve) {
    if (curve === undefined) curve = 1;
    else curve = 1 / curve;
    let val = (input - inLow) * (1 / (inHigh - inLow));
    val = Math.pow(val, curve);
    return val * (outHigh - outLow) + outLow;
}

let elementXPosition = 0;
let elementYPosition = 25;
let prevElementSize = 0;
let prevYElementSize = 0;

export class NexusElement{
    constructor(element_type, options = {}) {
        this.element_type = element_type;
        console.log('el', element_type)
        
        // this.label = options.label || "myElement";
        // this.style = options.style || 1;
        // this.size = options.size || 1;
        // this.textSize = options.textSize || 1;
        // this.border = options.border || 'theme' || 6;
        // this.borderColor = options.borderColor || 'border';
        // this.accentColor = options.accentColor || 'accent';
        // this.borderRadius = options.borderRadius || 0;

        //text
        // this.textColor = options.textColor || 'text';
        // this.showLabel = typeof (options.showLabel) === 'undefined' ? true : options.showLabel; //|| activeTheme.showLabel
        // this.showValue = typeof (options.showValue) === 'undefined' ? true : options.showValue; //|| activeTheme.showValue
        // this.labelFont = options.labelFont || 'label'
        // this.valueFont = options.valueFont || 'value'
        // this.mainFont = options.mainFont || 'text'
        // this.labelX = options.labelX || 0
        // this.labelY = options.labelY || 0
        // this.valueX = options.valueX || 0
        // this.valueY = options.valueY || 0
        // this.textX = options.textX || 0
        // this.textY = options.textY || 0

        //position
        // let currentGap = (prevElementSize + this.size) / 2
        // elementXPosition += (8 * currentGap + 5);
        // if (elementXPosition > (100 - this.size * 8)) {
        //     elementXPosition = this.size / 2 * 8 + 5
        //     elementYPosition += (20 * prevYElementSize + 10)
        //     prevYElementSize = this.size
        // }
        this.x = options.x || elementXPosition;
        this.y = options.y || elementYPosition;
        // prevElementSize = this.size
        // prevYElementSize = this.size > prevYElementSize ? this.size : prevYElementSize;
        this.width = options.width || 80;
        this.height = options.height || 80;
        // this.cur_x = (this.x / 100) * this.width

        // this.cur_y = (this.y / 100) * this.height
        // this.cur_size = (this.size / 6) * this.width
        // this.x_box = this.cur_size;
        // this.y_box = this.cur_size;

        //parameter values
        // this.active = 0;
        // this.isInteger = options.isInteger || false;
        // this.min = options.min || 0;
        // this.max = options.max || 1;
        // this.curve = options.curve || 1;
        // if (typeof (options.mapto) == 'string') this.mapto = eval(options.mapto)
        // else this.mapto = options.mapto || null;
        // this.callback = options.callback || null;
        // if (this.mapto || this.callback) this.maptoDefined = 'true'
        // else this.maptoDefined = 'false'
        // this.value = options.value != undefined ? options.value : scaleOutput(0.5, 0, 1, this.min, this.max, this.curve);
        // this.prevValue = this.value
        // this.rawValue = unScaleOutput(this.value, 0, 1, this.min, this.max, this.curve);
        

        // //collab-hub sharing values
        // this.linkName = typeof options.link === 'string' ? options.link : null; // share params iff link is defined
        // this.linkFunc = typeof options.link === 'function' ? options.link : null;

        // // set listener for updates from collab-hub (for linkName only)
        // if (this.linkName) {
        //     this.ch.on(this.linkName, (incoming) => {
        //         this.forceSet(incoming.values);
        //     })
        // }

        // this.mapValue(this.value, this.mapto);
        // this.runCallBack()


        // Get the Canvas container - this is where NexusUI elements should appear
        const container = document.getElementById('Canvas');
        if (!container) {
            console.error('NexusElement: #Canvas container not found!');
            return;
        }
        
        // Auto-initialize Canvas if not already done
        if (!canvasInitialized) {
            initNexusCanvas();
            console.log("canvas")
        }

        // Initialize the Nexus element - NexusUI will create its own wrapper
        const Nexus = window.Nexus;
        
        // Create a unique container div for this element inside Canvas
        const elementContainer = document.createElement('div');
        elementContainer.style.position = 'absolute';
        elementContainer.style.left = this.x + 'px';
        elementContainer.style.top = this.y + 'px';
        container.appendChild(elementContainer);

        elementContainer.style.cssText = `
            background: transparent;
            position: absolute;
            left: ${this.x}px;
            top: ${this.y}px;
            display: flex;           /* Use flexbox */
            flex-direction: column;  /* Stack children vertically */
            align-items: center;     /* Center the label and widget horizontally */
            gap: 4px;                /* Space between label and widget */
        `;
        
    
        if(this.element_type !== 'text'){
            // Create the NexusUI element inside our positioned container
            this.element = new Nexus[this.element_type](elementContainer, {
                size: [this.width, this.height]
            });
        }
        
        // Store reference to our container for cleanup
        this.container = container;
        this.elementContainer = elementContainer;

        this.containerWidth = container.clientWidth || window.innerWidth;
        this.containerHeight = this.containerWidth * 0.8

        // Store position as percentages for responsive resizing
        this.xPercent = this.x / this.containerWidth;
        this.yPercent = this.y / this.containerHeight;
        this.widthPercent = this.width / this.containerWidth;
        this.heightPercent = this.height / this.containerHeight;

        // Apply initial position (already set, but ensures consistency)
        this.updatePositionAndSize();
        
        // Use ResizeObserver to handle container resizing (e.g. split pane drag)
        if (container) {
            this.resizeObserver = new ResizeObserver(() => {
                window.requestAnimationFrame(() => {
                    if (!this.element || !this.element.element || !document.body.contains(this.element.element)) {
                        if (this.resizeObserver) this.resizeObserver.disconnect();
                        return;
                    }
                    this.updatePositionAndSize();
                });
            });
            this.resizeObserver.observe(container);
        } else {
            // Fallback to window resize if container not found immediately
            window.addEventListener("resize", () => this.updatePositionAndSize());
        }
    }

    mapTo(callback){
        this.element.on("change", callback)
        //callback must be written as (element_output) => {function}
    }

    updatePositionAndSize() {
        // Update pixel values based on percentages and current container size
        const container = this.container || document.getElementById('Canvas');
        if (!container) return;

        this.containerWidth = container.clientWidth || window.innerWidth;
        this.containerHeight = this.containerWidth * 0.8

        // Position our wrapper container
        if (this.elementContainer) {
            this.elementContainer.style.left = (this.xPercent * this.containerWidth) + "px";
            this.elementContainer.style.top = (this.yPercent * this.containerHeight) + "px";
        }
        
        // Resize the NexusUI element
        if (this.element && this.element.resize) {
            this.element.resize(
                this.widthPercent * this.containerWidth,
                this.heightPercent * this.containerHeight
            );
        }
    }

    colorize(property, color) {
        if (this.element && this.element.colorize) {
            this.element.colorize(property, color);
        }
    }

    renderLabel(){
        this.labelContainer.textContent = this._labelText
    }

    // Destroy the element and clean up
    destroy(){
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.element && this.element.destroy) {
            this.element.destroy();
        }
        // Remove our container div
        if (this.elementContainer && this.elementContainer.parentNode) {
            this.elementContainer.parentNode.removeChild(this.elementContainer);
        }
    }

        //Dynamic sizing and positioning

        set x(value) {
            this.xPercent = value /// this.containerWidth;
            this.updatePositionAndSize();
        }
    
        set y(value) {
            this.yPercent = value /// this.containerHeight;
            this.updatePositionAndSize();
        }
    
        set width(value) {
            this.widthPercent = value / this.containerWidth;
            this.updatePositionAndSize();
        }
    
        set height(value) {
            this.heightPercent = value / this.containerHeight;
            this.updatePositionAndSize();
        }
    
        // Getters for convenience
        get x() {
            return this.xPercent * this.containerWidth;
        }
    
        get y() {
            return this.yPercent * this.containerHeight;
        }
    
        get width() {
            return this.widthPercent * this.containerWidth;
        }
    
        get height() {
            return this.heightPercent * this.containerHeight;
        }

        set size([newWidth, newHeight]) {
            this.widthPercent = newWidth / this.containerWidth;
            this.heightPercent = newHeight / this.containerHeight;
            this.updatePositionAndSize();
        }
    
        get size() {
           return [
                this.widthPercent * this.containerWidth,
                this.heightPercent * this.containerHeight
            ];
        }
        set accentColor(value) {
            value = (Array.isArray(value) && value.length === 3) 
                ? value 
                : [value, value, value];
            this.colorize('accent', value)
        }
        set accentColor(value) {
            value = (Array.isArray(value) && value.length === 3) 
                ? value 
                : [value, value, value];
            this.colorize('accent', value)
        }

        /* --- Range & Value Logic --- */

        set min(value) {
            this.element.min = value;
        }
        get min() {
            return this.element.min;
        }

        set max(value) {
            this.element.max = value;
        }
        get max() {
            return this.element.max;
        }

        set step(value) {
            this.element.step = value;
        }
        get step() {
            return this.element.step;
        }

        set curve(value) {
            // NexusUI typically uses 'linear' or 'exponential'
            this.element.curve = value;
        }
        get curve() {
            return this.element.curve;
        }

        /* --- State Logic --- */

        set isInt(value) {
            // If true, forces steps to 1
            this.element.step = value ? 1 : 0;
        }
        get isInt() {
            return this.element.step >= 1;
        }

        set bipolar(value) {
            // Primarily for Dial or Slider; shifts range from [0,1] to [-1,1]
            if (value) {
                this.min = -1;
                this.max = 1;
            } else {
                this.min = 0;
                this.max = 1;
            }
        }

        /* --- Labeling --- */

        set label(value) {
            this._labelText = value;
            const label = document.createElement('div');
            label.innerText = this._labelText; // Your custom label text
            label.style.cssText = `
                margin-bottom: -25px;
                background: none !important; /* Forces transparency */
                pointer-events: none;
                color: #8796EB;
                font-family: monospace;
                font-size: 12px;
                white-space: nowrap; /* Prevents text from wrapping */
            `;
            this.labelContainer = label
            this.elementContainer.appendChild(this.labelContainer);
            // Assuming you have a method to render a text overlay
            this.renderLabel(); 
        }
        get label() {
            return this._labelText;
        }

        /* --- Visuals & Orientation --- */

        set orientation(value) {
            // 'horizontal' or 'vertical'
            this.element.orientation = value;
        }
        get orientation() {
            return this.element.orientation;
        }

        /* --- Cosmetics (Colors & Borders) --- */

        set border(value) {
            // Usually a boolean in NexusUI or a pixel width
            this.element.borderWidth = value;
        }
        get border() {
            return this.element.borderWidth;
        }

        set borderColor(value) {
            this.colorize('border', value);
        }

        set accentColor(value) {
            const color = (Array.isArray(value) && value.length === 3) 
                ? value 
                : [value, value, value];
            this.colorize('accent', color);
        }

        set textColor(value) {
            // Note: NexusUI uses 'fill' for text/foreground in many widgets
            this.colorize('fill', value);
        }

        /* --- Visibility Flags --- */

        set showLabel(value) {
            this._showLabel = !!value;
            this.renderLabel();
        }
        get showLabel() {
            return this._showLabel;
        }

        set showValue(value) {
            // Some NexusUI elements have a 'value' display built in
            this._showValue = !!value;
        }
        get showValue() {
            return this._showValue;
        }

        /* --- Mapping & Interaction --- */

        set mapto(func) {
            // Useful for linking to a specific synth parameter
            this._destination = func;
        }

        set callback(func) {
            // Standard NexusUI event listener
            this.element.on('change', (v) => {
                if (this._destination) this._destination(v);
                func(v);
            });
        }
    }