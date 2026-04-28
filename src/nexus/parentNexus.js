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

    let colors = [
      "#ddd7c8",
      "#800039",
      "#75523f",
      "#e9b74c",
      "#3e6918"
    ]

    const Nexus = window.Nexus;
    Nexus.colors['background'] = colors[0]
    Nexus.colors["border"] = colors[1]
    Nexus.colors["mid"] = colors[2]
    Nexus.colors["accent"] = colors[3]
    Nexus.colors["text"] = colors[4]

    // 1. Calculate dimensions (Width of canvas, Height is 3/4 of width)
    const canvasWidth = container.clientWidth || window.innerWidth;
    const bgHeight = Math.floor(canvasWidth * 0.5);

    // 2. Create the GUI Background layer
    const guiBackground = document.createElement('div');
    guiBackground.id = 'nexus-gui-background'; // Helpful for debugging
    
    // 3. Apply Styles
    Object.assign(guiBackground.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',            // Matches the canvas width
        height: `${bgHeight}px`,  // Matches the 3/4 ratio
        backgroundColor: '#222',  // Or use one of your colors array
        zIndex: '0',              // Ensure it's the bottom layer
        pointerEvents: 'none'     // Don't block clicks to the UI elements
    });

    // 4. Add it to the container
    container.appendChild(guiBackground);

    // Setter for Background Color
    Object.defineProperty(Nexus, 'backgroundColor', {
        set: (color) => {
            guiBackground.style.backgroundColor = color;
            guiBackground.style.backgroundImage = 'none'; // Clear image if color is set
        }
    });

    // Function for Background Image
    Nexus.backgroundImage = (url) => {
        guiBackground.style.backgroundImage = `url('${url}')`;
    };

    // Initialize with your default
    Nexus.backgroundColor = backgroundColor;

    const svgns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgns, "svg");
    Object.assign(svg.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%'
    });
    // Set viewBox to 0 0 1 1 so coordinates are always 0.0 to 1.0
    svg.setAttributeNS(null, "viewBox", "0 0 1 1");
    svg.setAttributeNS(null, "preserveAspectRatio", "none");

    guiBackground.appendChild(svg);
    Nexus.svgLayer = svg; // Store for the draw function


    Nexus.drawLine = function(v1 = [0, 0], v2 = [1, 1], color = '#F00', thickness = 0.01) {
        const svgns = "http://www.w3.org/2000/svg";
        const line = document.createElementNS(svgns, "line");
        
        line.setAttributeNS(null, "x1", v1[0]);
        line.setAttributeNS(null, "y1", v1[1]);
        line.setAttributeNS(null, "x2", v2[0]);
        line.setAttributeNS(null, "y2", v2[1]);
        
        line.setAttributeNS(null, "stroke", color);
        line.setAttributeNS(null, "stroke-width", thickness);
        line.setAttributeNS(null, "stroke-linecap", "round");

        Nexus.svgLayer.appendChild(line);
        return line; // Return it so you can remove or move it later
    };


    container.style.backgroundColor = Nexus.colors['background']
    
    

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

export class NexusElement{
    constructor(element_type, options = {}) {
        this.element_type = element_type; 
        this.initialized = false 

         // Get the Canvas container - this is where NexusUI elements should appear
        const container = document.getElementById('Canvas');
        if (!container) {
            console.error('NexusElement: #Canvas container not found!');
            return;
        }
        this.container = container;
        this.containerWidth = container.clientWidth ?? window.innerWidth;
        this.containerRatio = 2/4
        this.containerHeight = Math.floor(this.containerWidth * this.containerRatio)

        // Auto-initialize Canvas if not already done
        if (!canvasInitialized) {
            initNexusCanvas();
            console.log("canvas")
        }

        // Create a unique container div for this element inside Canvas
        const elementContainer = document.createElement('div');
        elementContainer.style.position = 'absolute';
        elementContainer.style.display = 'flex';
        elementContainer.style.justifyContent = 'center'; // Horizontal centering
        elementContainer.style.alignItems = 'center';     // Vertical centering

        this.container.appendChild(elementContainer);
        this.elementContainer = elementContainer;

        //OBJECT PARAMETERS
        
        this.colors = {
            'border': "#000",
            'accent': "#F00",
            'alt': '#555',
            'text': "#F00"
        }

        
        if(['NexusBackground', 'text'].includes(this.element_type)) return
            // Create the NexusUI element inside our positioned container
        
        const Nexus = window.Nexus;    
        this.element = new Nexus[this.element_type](elementContainer);
        console.log('el', element_type, options)

        this.showLabel = options.showLabel ?? true
        this.showValue = options.showValue ?? false
        if(element_type === 'TextButton') this.showLabel = false
        if(element_type === 'TextButton') this.showValue = false
        

        this.baseSize = this.containerWidth/10
        this.size = options.size ?? 1;
        this.x = options.x ?? .5;
        this.y = options.y ?? .5;
        this.width = options.width ?? 1;
        this.height = options.height ?? 1;
        this.orientation = options.orientation ?? 'horizontal'

        this.value = options.value ?? 0
        this.isInteger = options.isInteger ?? 0
        this.min = options.min ?? 0
        this.max  = options.max ?? 1
        this.curve = options.curve ?? 1
        this.options = options.options ?? []
        
        this.label = options.label ?? null;
        this.style = options.style ?? "default"
        this.colors['accent'] = options.accentColor ?? this.colors.accent
        this.colors['border'] = options.borderColor ?? this.colors.border
        this.colors['text'] = options.textColor ?? this.colors.text
        this.colors['alt'] = options.altColor ?? this.colors.alt
        this.textSize = options.textSize ?? 1
        this.textX = options.textX ?? 0
        this.textY = options.textY ?? 1

        if( options.callback) this.callback = options.callback
    
        //parameter values
        // this.active = 0;
        this.isInteger = options.isInteger ?? false;
       
        // //collab-hub sharing values
        // this.linkName = typeof options.link === 'string' ? options.link : null; // share params iff link is defined
        // this.linkFunc = typeof options.link === 'function' ? options.link : null;

        // // set listener for updates from collab-hub (for linkName only)
        // if (this.linkName) {
        //     this.ch.on(this.linkName, (incoming) => {
        //         this.forceSet(incoming.values);
        //     })
        // }
     
        this.initialized = true
        
        // Apply initial position (already set, but ensures consistency)
        setTimeout(()=>{
            this.updatePositionAndSize()
            this.updateColors()
        },200)
        
        // Use ResizeObserver to handle container resizing (e.g. split pane drag)
        if (container) {
            this.resizeObserver = new ResizeObserver(() => {
                window.requestAnimationFrame(() => {
                    if (!this.element ?? !this.element.element ?? !document.body.contains(this.element.element)) {
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
        if(!this.initialized) return;
        
        const container = this.container ?? document.getElementById('Canvas');
        if (!container) return;

        this.containerWidth = container.clientWidth ?? window.innerWidth;
        this.containerHeight = Math.floor(this.containerWidth * this.containerRatio);

        let elementWidth = this.baseSize * this._size * this.widthPercent;
        let elementHeight = this.baseSize * this._size * this.heightPercent;
        
        if (this.elementContainer) {
            this.elementContainer.style.width = elementWidth + "px";
            this.elementContainer.style.height = elementHeight + "px";

            // --- TOP-LEFT ALIGNMENT ---
            // This maps 0% to the far left/top and 100% to the far right/bottom.
            // The "Top-Left" corner of your element will sit exactly at this coordinate.
            const posX = this.xPercent * this.containerWidth;
            const posY = this.yPercent * this.containerHeight;

            this.elementContainer.style.left = posX + "px";
            this.elementContainer.style.top = posY + "px";

            // Optional: Remove flex centering if you want the internal Nexus 
            // element to also hug the top-left of its OWN container.
            this.elementContainer.style.display = 'block'; 
        }
        
        if (this.element && this.element.resize) {
            this.element.resize(elementWidth, elementHeight);
        }

        if (this.labelContainer) {
            // Set the label width to match the element so 'center' alignment works
            this.labelContainer.style.width = elementWidth + "px";
            
            // Position X at 0 relative to elementContainer (since container is already at xPercent)
            this.labelContainer.style.left = "0px";

            this.labelContainer.style.fontSize = this.textSize * elementWidth/4 + "px"; // Apply custom text size
            
            // Set the Y position based on your formula: this.size - 5
            // We use 'px' because this.size usually refers to a pixel-based scale
            this.labelContainer.style.top = (this.textY*elementHeight) + "px";
        }
    }

    colorize(property, color) {
        //if(!this.initialized) return 
        if (this.element && this.element.colorize) {
            this.element.colorize(property, color);
        }
    }

    updateColors(){
        // console.log(this.colors)
        this.colorize('fill', this.colors.border)
        this.colorize('accent', this.colors.accent)
        this.colorize('dark', this.colors.text)
    }

    set accentColor(color){
        this.colors['accent'] = color
        this.updateColors()
    }
    set borderColor(color){
        this.colors['border'] = color
        this.updateColors()
    }
    set textColor(color){
        this.colors['text'] = color
        this.updateColors()
    }

    renderLabel(){
        if( this.showLabel ) this.labelContainer.textContent = this._labelText
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

    set(val){
        this.value = val
        try{
            if(val) this.turnOn()
            else this.turnOff()
        } catch(e){
            //console.log(e)
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
            this.widthPercent = value;
            this.updatePositionAndSize();
        }
    
        set height(value) {
            this.heightPercent = value;
            this.updatePositionAndSize();
        }
    
        // Getters for convenience
        get x() {
            return this.xPercent;
        }
    
        get y() {
            return this.yPercent
        }
    
        get width() {
            return this.widthPercent;
        }
    
        get height() {
            return this.heightPercent;
        }

        set size(val) {
            this._size = val
            this.updatePositionAndSize();
        }
        get size() {
           return this._size;
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
            if (!value || !this.showLabel) return
            this._labelText = value;
            this.text = value
            if( !this.labelContainer ){
                // 1. Create the label container
                const labelContainer = document.createElement('div');
                labelContainer.style.position = 'absolute';

                // 2. Set the text style and color
                labelContainer.style.color = this.colors.text; // Use the text color from your object
                labelContainer.style.fontSize = this.textSize + "px"; // Apply custom text size
                labelContainer.style.whiteSpace = 'nowrap'; // Prevent text from wrapping

                // 3. Center the text inside the container
                labelContainer.style.display = 'flex';
                labelContainer.style.justifyContent = 'center';
                labelContainer.style.alignItems = 'center';

                // 4. Set the text content
                labelContainer.innerText = this.label_text || "Label";

                this.elementContainer.appendChild(labelContainer);
                this.labelContainer = labelContainer;
            }
            // Assuming you have a method to render a text overlay
            this.labelContainer.textContent = this._labelText 
        }
        get label() {
            return this._labelText;
        }
        set text(value) {
            //console.log('text', value)
            if( !this.showLabel ) return 
            this.element.text = value
            if( this.labelContainer )this.labelContainer.textContent = this._labelText
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

        /* --- Visibility Flags --- */

        set showLabel(value) {
            this._showLabel = !!value;
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
                //console.log(v)
            });
        }
    }

export class NexusTextElement {
    constructor(element_type, options = {}) {
        this.element_type = element_type;
        this.initialized = false;

        // 1. Setup Container & Math
        const container = document.getElementById('Canvas');
        if (!container) return console.error('NexusElement: #Canvas not found!');
        
        this.container = container;
        this.containerRatio = 0.5; // 2/4
        this.baseSize = (container.clientWidth ?? window.innerWidth) / 10;

        // 2. Initialize UI State
        this.showLabel = options.showLabel ?? true;
        this._size = options.size ?? 1;
        this.xPercent = options.x ?? 0.5;
        this.yPercent = options.y ?? 0.5;
        this.widthPercent = options.width ?? 1;
        this.heightPercent = options.height ?? 1;
        this.textSize = options.textSize ?? 1;
        
        this.colors = {
            border: options.borderColor ?? "#00000000",
            accent: options.accentColor ?? "#F00",
            text: options.textColor ?? "#888"
        };
        console.log(this.colors, options)

        // 3. Create DOM Structure
        this.elementContainer = document.createElement('div');
        this.elementContainer.style.position = 'absolute';
        this.elementContainer.style.display = 'flex';
        this.elementContainer.style.justifyContent = 'center';
        this.elementContainer.style.alignItems = 'center';
        this.container.appendChild(this.elementContainer);

        // 5. Create Label Overlay
        this.labelElement = document.createElement('div');
        this.labelElement.style.position = 'absolute';
        this.labelElement.style.pointerEvents = 'none';
        this.labelElement.style.textAlign = 'center';
        this.labelElement.style.topAlign = 'center';
        this.labelElement.style.whiteSpace = 'nowrap';
        this.elementContainer.appendChild(this.labelElement);

        // 6. Set initial content (Now that structure exists)
        this.label = options.label ?? ""; 
        
        this.initialized = true;
        this.setupObservers();
        this.updateColors();
        this.updatePositionAndSize();
    }

    setupObservers() {
        this.resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(() => this.updatePositionAndSize());
        });
        this.resizeObserver.observe(this.container);
    }

    updateColors() {
        if (!this.elementContainer) return;
        this.elementContainer.style.backgroundColor = this.colors.border;
        this.labelElement.style.color = this.colors.text;
    }

    updatePositionAndSize() {
        if (!this.initialized) return;

        const w = this.container.clientWidth;
        const h = Math.floor(w * this.containerRatio);

        const elW = this.baseSize * this._size * this.widthPercent;
        const elH = this.baseSize * this._size * this.heightPercent;

        // Position Container (Top-Left Alignment)
        this.elementContainer.style.width = `${elW}px`;
        this.elementContainer.style.height = `${elH}px`;
        this.elementContainer.style.left = `${this.xPercent * w}px`;
        this.elementContainer.style.top = `${this.yPercent * h}px`;
        console.log(this.textSize)
        this.labelElement.style.fontSize = this.textSize * elW /4  + "px";
    }

    // --- Setters & Getters ---
    set label(value) {
        this._labelText = value;
        if (this.labelElement) {
            this.labelElement.textContent = (this.showLabel) ? value : "";
        }
    }
    get label() { return this._labelText; }

    set x(v) { this.xPercent = v; this.updatePositionAndSize(); }
    get x() { return this.xPercent; }

    set y(v) { this.yPercent = v; this.updatePositionAndSize(); }
    get y() { return this.yPercent; }

    set size(v) { this._size = v; this.updatePositionAndSize(); }
    get size() { return this._size; }

    destroy() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        this.elementContainer?.remove();
    }

    set textSize(val){ 
        this._textSize = val
        this.updatePositionAndSize()
    }
    get textSize(){ return this._textSize}

}