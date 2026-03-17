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

export class NexusElement{
    constructor(element_type, x = 0, y = 0, width = 100, height = 100) {
        this.element_type = element_type;
        console.log('el', element_type)

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
        elementContainer.style.left = x + 'px';
        elementContainer.style.top = y + 'px';
        container.appendChild(elementContainer);
        
        // Create the NexusUI element inside our positioned container
        this.element = new Nexus[this.element_type](elementContainer, {
            size: [width, height]
        });
        
        // Store reference to our container for cleanup
        this.container = container;
        this.elementContainer = elementContainer;

        this.containerWidth = container.clientWidth || window.innerWidth;
        this.containerHeight = this.containerWidth * 0.8

        // Store position as percentages for responsive resizing
        this.xPercent = x / this.containerWidth;
        this.yPercent = y / this.containerHeight;
        this.widthPercent = width / this.containerWidth;
        this.heightPercent = height / this.containerHeight;

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