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
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    
    canvasInitialized = true;
    return container;
}

export class NexusElement{
    constructor(element_type, x = 0, y = 0, width = 100, height = 100) {
        this.element_type = element_type;

        // Get the Canvas container - this is where NexusUI elements should appear
        const container = document.getElementById('Canvas');
        if (!container) {
            console.error('NexusElement: #Canvas container not found!');
            return;
        }
        
        // Auto-initialize Canvas if not already done
        if (!canvasInitialized) {
            initNexusCanvas();
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

        const containerWidth = container.clientWidth || window.innerWidth;
        const containerHeight = container.clientHeight || window.innerHeight;

        // Store position as percentages for responsive resizing
        this.xPercent = x / containerWidth;
        this.yPercent = y / containerHeight;
        this.widthPercent = width / containerWidth;
        this.heightPercent = height / containerHeight;

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
        
        const newWidth = container.clientWidth || window.innerWidth;
        const newHeight = container.clientHeight || window.innerHeight;

        // Position our wrapper container
        if (this.elementContainer) {
            this.elementContainer.style.left = (this.xPercent * newWidth) + "px";
            this.elementContainer.style.top = (this.yPercent * newHeight) + "px";
        }
        
        // Resize the NexusUI element
        if (this.element && this.element.resize) {
            this.element.resize(
                this.widthPercent * newWidth,
                this.heightPercent * newHeight
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
            const container = this.container || document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            this.xPercent = value / containerWidth;
            this.updatePositionAndSize();
        }
    
        set y(value) {
            const container = this.container || document.getElementById('Canvas');
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            this.yPercent = value / containerHeight;
            this.updatePositionAndSize();
        }
    
        set width(value) {
            const container = this.container || document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            this.widthPercent = value / containerWidth;
            this.updatePositionAndSize();
        }
    
        set height(value) {
            const container = this.container || document.getElementById('Canvas');
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            this.heightPercent = value / containerHeight;
            this.updatePositionAndSize();
        }
    
        // Getters for convenience
        get x() {
            const container = this.container || document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            return this.xPercent * containerWidth;
        }
    
        get y() {
            const container = this.container || document.getElementById('Canvas');
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            return this.yPercent * containerHeight;
        }
    
        get width() {
            const container = this.container || document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            return this.widthPercent * containerWidth;
        }
    
        get height() {
            const container = this.container || document.getElementById('Canvas');
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            return this.heightPercent * containerHeight;
        }

        set size([newWidth, newHeight]) {
            const container = this.container || document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            this.widthPercent = newWidth / containerWidth;
            this.heightPercent = newHeight / containerHeight;
            this.updatePositionAndSize();
        }
    
        get size() {
            const container = this.container || document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            return [
                this.widthPercent * containerWidth,
                this.heightPercent * containerHeight
            ];
        }
    }