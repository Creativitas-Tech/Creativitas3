export class NexusBackground {
    constructor(options = {}) {
        const container = document.getElementById('Canvas');
        if (!container) {
            console.error('NexusElement: #Canvas container not found!');
            return;
        }
        
        this.container = container;
        
        // 1. Calculate dimensions
        this.containerWidth = container.clientWidth || window.innerWidth;
        this.containerRatio = 3/4;
        this.containerHeight = Math.floor(this.containerWidth * this.containerRatio);

        // 2. Create and style the elementContainer
        const elementContainer = document.createElement('div');
        elementContainer.style.position = 'absolute';
        elementContainer.style.top = '0';
        elementContainer.style.left = '0';
        
        // 3. Apply the calculated size (don't forget the 'px'!)
        elementContainer.style.width = `${this.containerWidth}px`;
        elementContainer.style.height = `${this.containerHeight}px`;
        
        // Ensure it sits behind other elements if necessary
        elementContainer.style.zIndex = "-1"; 
        elementContainer.style.pointerEvents = "none";

        this.container.appendChild(elementContainer);
        this.elementContainer = elementContainer;

        // Colors setup
        this.colors = {
            'background': "#000",
            'accent': "#F00",
            'text': "#F00",
        };

        this.backgroundColor = options.backgroundColor ?? this.colors['background'];
        this.updateColors();

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

    updateColors() {
        this.elementContainer.style.backgroundColor = this.backgroundColor;
    }

    updatePositionAndSize() {
        if(!this.initialized) return
        // Update pixel values based on percentages and current container size
        const container = this.container ?? document.getElementById('Canvas');
        if (!container) return;

        this.containerWidth = (container.clientWidth ?? window.innerWidth);
        this.containerHeight = Math.floor(this.containerWidth * this.containerRatio)

        let elementWidth = this.baseSize * this._size * this.widthPercent
        let elementHeight = this.baseSize * this._size * this.heightPercent
        
        // Position our wrapper container
        if (this.elementContainer) {
            this.elementContainer.style.left = (this.xPercent * (this.containerWidth- elementWidth)) + "px";
            this.elementContainer.style.top = (this.yPercent * (this.containerHeight- elementHeight)) + "px";
        }
        
        // Resize the NexusUI element
        if (this.element && this.element.resize) {
            this.element.resize(   elementWidth, elementHeight );
        }
    }
}