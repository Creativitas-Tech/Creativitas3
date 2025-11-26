// NexusUI wrapper base class
// Uses the global Nexus object from the nexusui npm package

export class NexusElement{
    constructor(element_type, x = 0, y = 0, width = 100, height = 100) {
        this.element_type = element_type;

        // Initialize the Nexus element
        // Reference Nexus from window object
        const Nexus = window.Nexus;
        this.element = new Nexus[this.element_type]("#Canvas", {
            size: [width, height]
        });
        
        // Set positioning style for the element
        this.element.element.style.position = 'absolute';

        const container = document.getElementById('Canvas');
        const containerWidth = container ? container.clientWidth : window.innerWidth;
        const containerHeight = container ? container.clientHeight : window.innerHeight;

        this.xPercent = x / containerWidth;
        this.yPercent = y / containerHeight;
        this.widthPercent = width / containerWidth;
        this.heightPercent = height / containerHeight;

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
        const container = document.getElementById('Canvas');
        const newWidth = container ? container.clientWidth : window.innerWidth;
        const newHeight = container ? container.clientHeight : window.innerHeight;

        this.element.element.style.left = this.xPercent * newWidth + "px";
        this.element.element.style.top = this.yPercent * newHeight + "px";
        this.element.resize(
            this.widthPercent * newWidth,
            this.heightPercent * newHeight
        );
    }

    colorize(property, color) {
                this.element.colorize(property, color);
            }
        // for linking number boxes to other elements

        //general, destroys any element
        destroy(){
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            }
            this.element.destroy()
        }

        //Dynamic sizing and positioning

        set x(value) {
            const container = document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            this.xPercent = value / containerWidth;
            this.updatePositionAndSize();
        }
    
        set y(value) {
            const container = document.getElementById('Canvas');
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            this.yPercent = value / containerHeight;
            this.updatePositionAndSize();
        }
    
        set width(value) {
            const container = document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            this.widthPercent = value / containerWidth;
            this.updatePositionAndSize();
        }
    
        set height(value) {
            const container = document.getElementById('Canvas');
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            this.heightPercent = value / containerHeight;
            this.updatePositionAndSize();
        }
    
        // Getters for convenience
        get x() {
            const container = document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            return this.xPercent * containerWidth;
        }
    
        get y() {
            const container = document.getElementById('Canvas');
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            return this.yPercent * containerHeight;
        }
    
        get width() {
            const container = document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            return this.widthPercent * containerWidth;
        }
    
        get height() {
            const container = document.getElementById('Canvas');
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            return this.heightPercent * containerHeight;
        }

        set size([newWidth, newHeight]) {
            // Convert absolute size to percentages relative to the window size
            const container = document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            this.widthPercent = newWidth / containerWidth;
            this.heightPercent = newHeight / containerHeight;
            this.updatePositionAndSize();
        }
    
        get size() {
            // Return the absolute size based on current window size
            const container = document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            return [
                this.widthPercent * containerWidth,
                this.heightPercent * containerHeight
            ];
        }
    }