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

        this.xPercent = x / window.innerWidth;
        this.yPercent = y / window.innerHeight;
        this.widthPercent = width / window.innerWidth;
        this.heightPercent = height / window.innerHeight;

        this.updatePositionAndSize();
        window.addEventListener("resize", () => this.updatePositionAndSize());
    }

    mapTo(callback){
        this.element.on("change", callback)
        //callback must be written as (element_output) => {function}
    }

    updatePositionAndSize() {
        // Update pixel values based on percentages and current window size
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

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
            this.element.destroy()
        }

        //Dynamic sizing and positioning

        set x(value) {
            this.xPercent = value / window.innerWidth;
            this.updatePositionAndSize();
        }
    
        set y(value) {
            this.yPercent = value / window.innerHeight;
            this.updatePositionAndSize();
        }
    
        set width(value) {
            this.widthPercent = value / window.innerWidth;
            this.updatePositionAndSize();
        }
    
        set height(value) {
            this.heightPercent = value / window.innerHeight;
            this.updatePositionAndSize();
        }
    
        // Getters for convenience
        get x() {
            return this.xPercent * window.innerWidth;
        }
    
        get y() {
            return this.yPercent * window.innerHeight;
        }
    
        get width() {
            return this.widthPercent * window.innerWidth;
        }
    
        get height() {
            return this.heightPercent * window.innerHeight;
        }

        set size([newWidth, newHeight]) {
            // Convert absolute size to percentages relative to the window size
            this.widthPercent = newWidth / window.innerWidth;
            this.heightPercent = newHeight / window.innerHeight;
            this.updatePositionAndSize();
        }
    
        get size() {
            // Return the absolute size based on current window size
            return [
                this.widthPercent * window.innerWidth,
                this.heightPercent * window.innerHeight
            ];
        }
    }