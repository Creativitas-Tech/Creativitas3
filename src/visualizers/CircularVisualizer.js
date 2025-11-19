/**
 * CircularVisualizer - A simple circular array visualization
 *
 * Usage:
 *   s.sequence('0', '16n', 0)
 *   let c = new CircularVisualizer(s.seq[0], gui, { synth: s })
 *   // That's it! Automatically sets up callback and enables
 *
 * Custom color for current beat:
 *   let c = new CircularVisualizer(s.seq[0], gui, {
 *     synth: s,
 *     currentColor: { r: 0, g: 255, b: 0 }  // Green instead of red
 *   })
 *
 * - Subdivides circle into equal segments
 * - All notes visible in grayscale (darker = lower note, lighter = higher note)
 * - Current beat highlighted in red
 */
export class CircularVisualizer {
    constructor(parent, gui, options = {}) {
        this.parent = parent  // The sequence object (s.seq[0])
        this.gui = gui
        this.synth = options.synth || (parent && parent.parent) || null  // The synth that owns the sequence
        this._enabled = false

        // Position & size
        this.x = options.x || null  // null = auto center
        this.y = options.y || null  // null = auto center
        this.diameter = options.diameter || 100

        // Visual style
        this.separatorWeight = options.separatorWeight || 0.5
        this.showSeparators = options.showSeparators !== undefined ? options.showSeparators : true

        // Color config
        this.currentColor = options.currentColor || { r: 255, g: 0, b: 0 }  // Red for current beat (customizable)
        this.separatorColor = options.separatorColor || { r: 255, g: 255, b: 255 }  // White separators

        // Original gui.draw
        this._originalGuiDraw = null

        // Auto-enable and set up callback
        this.enable()
        this.setupCallback()
    }

    /**
     * Calculate normalized values (min-max normalization)
     */
    normalizeArray(array) {
        if (array.length === 0) return array

        // Convert all values to numbers (handles strings like '0', '5', etc.)
        const numericArray = array.map(v => {
            const num = Number(v)
            return isNaN(num) ? 0 : num
        })

        const min = Math.min(...numericArray)
        const max = Math.max(...numericArray)

        if (max === min) return array.map(() => 0.5)

        return numericArray.map(v => {
            const normalized = (v - min) / (max - min)
            return normalized
        })
    }

    /**
     * Get grayscale color from normalized value (0-1)
     * Maps to range: lowest note = 80 (dark gray), highest note = 255 (white)
     */
    grayscale(normalized) {
        const minGray = 80   // Dark gray (not black) for lowest note
        const maxGray = 255  // White for highest note
        const gray = Math.floor(minGray + (normalized * (maxGray - minGray)))
        return { r: gray, g: gray, b: gray }
    }

    /**
     * Setup callback on the synth automatically
     */
    setupCallback() {
        if (!this.synth) return

        // Store original callback if it exists
        const originalCallback = this.synth.callback

        // Set up new callback that calls update
        this.synth.callback = (i, time) => {
            if (originalCallback && typeof originalCallback === 'function') {
                originalCallback(i, time)
            }
            this.update()
        }
    }

    /**
     * Update - automatically called by callback every beat
     */
    update() {
        if (!this.parent || !this.parent.vals) return
        this.draw()
    }

    /**
     * Draw the circle
     */
    draw() {
        if (!this._enabled || !this.gui || !this.parent || !this.parent.vals) return

        const array = this.parent.vals
        const currentIndex = this.synth ? this.synth.index : 0

        // Calculate position (auto center if not set)
        const x = this.x !== null ? this.x : (this.gui.width || 800) / 2
        const y = this.y !== null ? this.y : (this.gui.height || 600) / 2

        const outerRadius = this.diameter / 2
        const numSegments = array.length

        if (numSegments === 0) return

        // Normalize array values to 0-1 for grayscale
        const normalized = this.normalizeArray(array)

        // Draw segments
        for (let i = 0; i < numSegments; i++) {
            const startAngle = this.gui.radians((i * 360 / numSegments) - 90)
            const endAngle = this.gui.radians(((i + 1) * 360 / numSegments) - 90)

            // All notes visible in grayscale, current beat turns red
            const isCurrent = (currentIndex % numSegments) === i
            const isRest = array[i] === '.' || array[i] === '~'  // Rest symbols
            let color

            if (isCurrent) {
                // Current beat: use customizable color
                color = this.currentColor
            } else if (isRest) {
                // Rests: black
                color = { r: 0, g: 0, b: 0 }
            } else {
                // Non-current beats: grayscale based on pitch
                color = this.grayscale(normalized[i])
            }

            // Draw the segment
            this.gui.fill(color.r, color.g, color.b)
            this.gui.noStroke()
            this.gui.arc(x, y, this.diameter, this.diameter, startAngle, endAngle, this.gui.PIE)
        }

        // Draw separator lines from center to edge
        if (this.showSeparators) {
            this.gui.stroke(this.separatorColor.r, this.separatorColor.g, this.separatorColor.b)
            this.gui.strokeWeight(this.separatorWeight)

            for (let i = 0; i < numSegments; i++) {
                const angle = this.gui.radians((i * 360 / numSegments) - 90)
                const endX = x + outerRadius * this.gui.cos(angle)
                const endY = y + outerRadius * this.gui.sin(angle)
                this.gui.line(x, y, endX, endY)  // From center to edge
            }
        }

        // Draw outer circle outline
        this.gui.noFill()
        this.gui.stroke(this.separatorColor.r, this.separatorColor.g, this.separatorColor.b)
        this.gui.strokeWeight(1)
        this.gui.ellipse(x, y, this.diameter, this.diameter)
    }

    /**
     * Enable visualization
     */
    enable() {
        if (this._enabled) return

        this._enabled = true

        // Store original gui.draw
        if (this.gui && typeof this.gui.draw === 'function') {
            this._originalGuiDraw = this.gui.draw
        }

        // Override gui.draw
        if (this.gui) {
            this.gui.draw = () => {
                if (this._originalGuiDraw) {
                    this._originalGuiDraw.call(this.gui)
                }
                this.draw()
            }
        }
    }

    /**
     * Disable visualization
     */
    disable() {
        if (!this._enabled) return

        this._enabled = false

        if (this.gui && this._originalGuiDraw) {
            this.gui.draw = this._originalGuiDraw
        }
        this._originalGuiDraw = null
    }

    get enabled() { return this._enabled }
}
