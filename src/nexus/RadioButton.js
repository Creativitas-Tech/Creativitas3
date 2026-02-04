import { NexusElement, initNexusCanvas } from './parentNexus.js';

/**
 * RadioButton - A group of toggle buttons where only one can be active
 * Uses NexusUI TextButton components arranged horizontally or vertically
 * 
 * @param {number} x - X position in pixels
 * @param {number} y - Y position in pixels
 * @param {string[]} options - Array of option labels/values
 * @param {Object} config - Configuration object
 * @param {number} config.buttonWidth - Width of each button (default 60)
 * @param {number} config.buttonHeight - Height of each button (default 25)
 * @param {string} config.orientation - 'horizontal' or 'vertical' (default 'horizontal')
 * @param {boolean} config.showLabel - Whether to show parameter label (default false)
 * @param {string} config.label - Label text if showLabel is true
 */
export class NexusRadioButton {
    constructor(x = 0, y = 0, options = ['A', 'B', 'C'], config = {}) {
        // Handle legacy 4th parameter as string (orientation)
        const normalizedConfig = typeof config === 'string' 
            ? { orientation: config } 
            : config;
        
        const {
            buttonWidth = 60,
            buttonHeight = 25,
            orientation = 'horizontal',
            showLabel = false,
            label = ''
        } = normalizedConfig;
        
        this.options = options;
        this.orientation = orientation;
        this.selectedIndex = 0;
        this.selectedValue = options[0];
        this.buttons = [];
        this.callbacks = [];
        this.label = label;
        this.showLabel = showLabel;
        
        // Get the Canvas container
        const container = document.getElementById('Canvas');
        if (!container) {
            console.error('RadioButton: #Canvas container not found!');
            return;
        }
        
        // Auto-initialize Canvas if needed
        initNexusCanvas();
        
        // Store reference to container
        this.container = container;
        
        // Calculate dimensions
        const containerWidth = container.clientWidth || window.innerWidth;
        const containerHeight = container.clientHeight || window.innerHeight;
        
        // Button sizing from config
        const spacing = 5;
        
        // Create container div for the radio group
        this.elementContainer = document.createElement('div');
        this.elementContainer.style.position = 'absolute';
        this.elementContainer.style.left = x + 'px';
        this.elementContainer.style.top = y + 'px';
        container.appendChild(this.elementContainer);
        
        // Add label if showLabel is true
        if (showLabel && label) {
            const labelDiv = document.createElement('div');
            labelDiv.textContent = label;
            labelDiv.style.cssText = `
                color: #AAAAAA;
                font-family: monospace;
                font-size: 11px;
                margin-bottom: 4px;
                pointer-events: none;
                user-select: none;
            `;
            this.elementContainer.appendChild(labelDiv);
            this.labelElement = labelDiv;
        }
        
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.flexDirection = orientation === 'horizontal' ? 'row' : 'column';
        buttonsContainer.style.gap = spacing + 'px';
        this.elementContainer.appendChild(buttonsContainer);
        this.buttonsContainer = buttonsContainer;
        
        // Store percentages for responsive resizing
        this.xPercent = x / containerWidth;
        this.yPercent = y / containerHeight;
        
        // Create buttons for each option
        const Nexus = window.Nexus;
        
        options.forEach((option, index) => {
            const btnContainer = document.createElement('div');
            btnContainer.style.position = 'relative';
            buttonsContainer.appendChild(btnContainer);
            
            // Use Button (momentary) instead of TextButton (toggle) to avoid double-click issues
            const btn = new Nexus.TextButton(btnContainer, {
                size: [buttonWidth, buttonHeight],
                state: false,
                text: option,
                alternateText: option,
                mode: 'button'  // Momentary mode - doesn't toggle state
            });
            
            // Style the button - highlight first one as selected
            const isSelected = index === 0;
            btn.colorize('fill', isSelected ? '#6060a0' : '#303030');
            btn.colorize('accent', '#8080c0');
            btn.colorize('text', '#ffffff');
            
            // Handle click - triggers on press
            btn.on('change', (v) => {
                if (v && !this._isUpdating) {
                    this.select(index);
                }
            });
            
            this.buttons.push(btn);
        });
        
        // Set up resize observer
        this.resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(() => {
                if (!this.elementContainer || !document.body.contains(this.elementContainer)) {
                    if (this.resizeObserver) this.resizeObserver.disconnect();
                    return;
                }
                this.updatePosition();
            });
        });
        this.resizeObserver.observe(container);
    }
    
    /**
     * Select an option by index
     */
    select(index, triggerCallbacks = true) {
        if (index < 0 || index >= this.options.length) return;
        if (this._isUpdating) return;  // Prevent recursion
        
        this._isUpdating = true;  // Set guard flag
        
        this.selectedIndex = index;
        this.selectedValue = this.options[index];
        
        // Use stored accent color or default
        const activeColor = this.accentColor || '#6060a0';
        const inactiveColor = '#303030';
        
        // Update button colors only (don't touch state to avoid text toggle)
        this.buttons.forEach((btn, i) => {
            const isSelected = i === index;
            btn.colorize('fill', isSelected ? activeColor : inactiveColor);
        });
        
        this._isUpdating = false;  // Clear guard flag
        
        // Trigger callbacks (unless suppressed, e.g. during ccSet)
        if (triggerCallbacks) {
            this.callbacks.forEach(cb => cb(this.selectedValue, index));
        }
    }
    
    /**
     * Select an option by value (without triggering callbacks - for ccSet)
     */
    selectByValue(value, triggerCallbacks = false) {
        const index = this.options.indexOf(value);
        if (index !== -1) {
            this.select(index, triggerCallbacks);
        }
    }
    
    /**
     * Get current value
     */
    get value() {
        return this.selectedValue;
    }
    
    /**
     * Set value
     */
    set value(val) {
        this.selectByValue(val);
    }
    
    /**
     * Register a callback for when selection changes
     */
    on(event, callback) {
        if (event === 'change') {
            this.callbacks.push(callback);
        }
    }
    
    /**
     * Alias for on('change', callback)
     */
    mapTo(callback) {
        this.on('change', callback);
    }
    
    /**
     * ccSet - for Parameter module compatibility
     */
    ccSet(value) {
        this.selectByValue(value);
    }
    
    /**
     * Update position on resize
     */
    updatePosition() {
        const container = this.container || document.getElementById('Canvas');
        if (!container || !this.elementContainer) return;
        
        const newWidth = container.clientWidth || window.innerWidth;
        const newHeight = container.clientHeight || window.innerHeight;
        
        this.elementContainer.style.left = (this.xPercent * newWidth) + 'px';
        this.elementContainer.style.top = (this.yPercent * newHeight) + 'px';
    }
    
    /**
     * Colorize all buttons and label
     */
    colorize(property, color) {
        this.buttons.forEach((btn, i) => {
            if (property === 'accent') {
                btn.colorize('accent', color);
                if (i === this.selectedIndex) {
                    btn.colorize('fill', color);
                }
            } else {
                btn.colorize(property, color);
            }
        });
        // Store accent color for future selections
        if (property === 'accent') {
            this.accentColor = color;
            // Also color the label
            if (this.labelElement) {
                this.labelElement.style.color = color;
            }
        }
    }
    
    /**
     * Destroy the radio button group
     */
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.buttons.forEach(btn => btn.destroy());
        if (this.elementContainer && this.elementContainer.parentNode) {
            this.elementContainer.parentNode.removeChild(this.elementContainer);
        }
    }
}
