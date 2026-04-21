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
    }

    updateColors() {
        this.elementContainer.style.backgroundColor = this.backgroundColor;
    }
}