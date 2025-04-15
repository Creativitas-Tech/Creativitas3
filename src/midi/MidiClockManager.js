import * as Tone from 'tone';
import { midiHandlerInstance } from './Midi.js';

/**
 * MidiClockManager - Handles incoming MIDI clock messages and triggers
 * registered callbacks at specific MIDI clock pulse intervals.
 * 
 * MIDI clock sends 24 pulses per quarter note. This class 
 * simply counts pulses and triggers functions at specified intervals.
 */
class MidiClockManager {
    constructor() {
        // State tracking
        this.enabled = false;
        this.debug = false;

        // Clock counters
        this.pulseCount = 0;
        this.pulsePosition = 0; // Position within a quarter note (0-23)

        // Registered callbacks
        this.registeredCallbacks = new Map();
    }

    /**
     * Enable MIDI clock processing
     */
    enable() {
        if (this.enabled) return this;

        this.enabled = true;
        this.setupMidiClockListener();
        if (this.debug) { console.log('MIDI clock manager enabled'); }
        return this;
    }

    /**
     * Disable MIDI clock processing
     */
    disable() {
        this.enabled = false;
        if (this.debug) { console.log('MIDI clock manager disabled'); }
        return this;
    }

    /**
     * Hook into MIDI message handling to capture clock messages
     */
    setupMidiClockListener() {
        // Simply set our handler as the MIDI clock handler in MidiHandlerInstance
        midiHandlerInstance.setMidiClockHandler((message) => this.handleMidiInput(message));
        if (this.debug) { console.log('MIDI clock listener registered'); }
    }

    /**
     * Handle MIDI message and process clock messages
     */
    handleMidiInput(message) {
        // Process MIDI clock messages
        if (!this.enabled) return;

        switch (message.data[0]) {
            // MIDI clock pulse (0xF8 = 248)
            case (248):
                this.handleClockPulse();
                break;
            // MIDI start (0xFA = 250)
            case (250):
                this.handleStart();
                break;
            // MIDI stop (0xFC = 252)
            case (252):
                this.handleStop();
                break;
            // MIDI continue (0xFB = 251)
            case (251):
                this.handleContinue();
                break;
        }
    }

    /**
     * Process incoming MIDI clock pulse
     */
    handleClockPulse() {
        if (!this.enabled) return;

        // Increment pulse counters
        this.pulseCount++;
        this.pulsePosition = this.pulseCount % 24;

        // Update Tone.js transport position based on MIDI clock pulse count
        // This ensures Tone.js sequences stay perfectly in sync with MIDI clock
        Tone.getTransport().position = this.ticksToTransportPosition();

        // Process all registered callbacks
        this.triggerCallbacks();
    }

    /**
     * Handle MIDI start message
     */
    handleStart() {
        if (!this.enabled) return;

        // Reset counters
        this.pulseCount = 0;
        this.pulsePosition = 0;

        if (this.debug) { console.log('MIDI clock start received'); }
    }

    /**
     * Handle MIDI stop message
     */
    handleStop() {
        if (!this.enabled) return;

        if (this.debug) { console.log('MIDI clock stop received'); }
    }

    /**
     * Handle MIDI continue message
     */
    handleContinue() {
        if (!this.enabled) return;

        if (this.debug) { console.log('MIDI clock continue received'); }
    }

    /**
     * Register a callback to be triggered at specific pulse intervals
     * 
     * @param {String} id - Unique identifier for this callback
     * @param {Function} callback - Function to be called at the specified interval
     * @param {Object} options - Configuration options
     * @param {Number} options.pulses - Number of pulses between triggers (default: 6)
     * @param {Number} options.offset - Pulse offset for first trigger (default: 0)
     * @returns {MidiClockManager} - This instance for chaining
     */
    on(id, callback, options = {}) {
        if (!id || typeof callback !== 'function') {
            console.error('Invalid callback registration');
            return this;
        }

        const { pulses = 1, offset = 0 } = options;

        this.registeredCallbacks.set(id, {
            callback,
            pulses,       // How many pulses between triggers
            offset,       // Initial offset
            options
        });

        if (this.debug) { console.log(`MIDI clock callback registered: ${id} at ${pulses} pulse intervals`); }
        return this;
    }

    /**
     * Unregister a previously registered callback
     * 
     * @param {String} id - Identifier of the callback to remove
     * @returns {MidiClockManager} - This instance for chaining
     */
    off(id) {
        if (this.registeredCallbacks.has(id)) {
            this.registeredCallbacks.delete(id);
            if (this.debug) { console.log(`MIDI clock callback unregistered: ${id}`); }
        }
        return this;
    }

    /**
     * Convert MIDI clock ticks to Tone.js transport position string
     * @returns {String} - Transport position in bars:beats:sixteenths format
     */
    ticksToTransportPosition() {
        // 24 ticks = 1 quarter note
        // 96 ticks = 1 whole note = 1 bar in 4/4 time

        const ticks = this.pulseCount;
        const ticksPerBeat = 24;  // MIDI spec: 24 ticks per quarter note
        const beatsPerBar = 4;    // Assuming 4/4 time signature

        const sixteenthNote = ticks / 6;  // 6 ticks = 1 sixteenth note
        const beat = Math.floor(ticks / ticksPerBeat) % beatsPerBar;
        const bar = Math.floor(ticks / (ticksPerBeat * beatsPerBar));
        const sixteenth = Math.floor(sixteenthNote % 4);

        return `${bar}:${beat}:${sixteenth}`;
    }

    /**
     * Process all registered callbacks and trigger those that are due
     */
    triggerCallbacks() {
        if (this.registeredCallbacks.size === 0) return;

        this.registeredCallbacks.forEach((config, id) => {
            const { callback, pulses, offset } = config;

            // Simply trigger on exact pulse positions that match the pattern
            // This ensures proper behavior when stopping and restarting the MIDI clock
            if (this.pulseCount % pulses === offset) {
                // trigger the callback
                callback();
            }
        });
    }

    /**
     * Get the current state of the MIDI clock
     * 
     * @returns {Object} - Current MIDI clock state
     */
    getState() {
        return {
            enabled: this.enabled,
            running: this.running,
            pulseCount: this.pulseCount,
            pulsePosition: this.pulsePosition,
            quartersElapsed: Math.floor(this.pulseCount / 24),
            sixteenthsElapsed: Math.floor(this.pulseCount / 6)
        };
    }
}

// Create a singleton instance
const midiClockManager = new MidiClockManager();

export default midiClockManager;
