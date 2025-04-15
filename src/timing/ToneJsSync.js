import * as Tone from 'tone';
import midiClockManager from '../midi/MidiClockManager.js';

/**
 * ToneJsSync - Simple registry for synchronizing Tone.js loops with MIDI clock
 * Provides methods to register and unregister Tone.js loops with MidiClockManager
 */
class ToneJsMidiSync {
    constructor() {
        this.registeredLoops = new Map();
        this.nextLoopId = 1;
        this.debug = false;
    }
    /**
     * Register a Tone.Loop with the MIDI clock manager
     * @param {Tone.Loop} loopInstance - The Tone.Loop instance to register
     * @param {string|number|null} interval - Optional interval override (uses loop.interval if not provided)
     * @returns {string} ID assigned to the registered loop
     */
    registerLoop(loopInstance, interval = null) {
        // If no interval provided, try to get it from the loop instance
        if (interval === null && loopInstance.interval) {
            interval = loopInstance.interval;
        }

        if (!interval) {
            this.debug && console.error('No interval provided and could not determine interval from loop instance');
            return null;
        }

        // Generate a unique ID for this loop
        const id = `tone-loop-${this.nextLoopId++}`;

        // Convert the interval to MIDI clock pulses
        const pulses = this.convertIntervalToPulses(interval);

        // Prepare the callback function
        const callbackFn = this.getCallbackFunction(loopInstance);

        if (!callbackFn) {
            this.debug && console.error('Could not determine callback function for loop', loopInstance);
            return null;
        }

        // Register with the MIDI clock manager
        midiClockManager.on(id, () => {
            // Only call if the loop is active
            if (loopInstance._active !== false) {
                try {
                    callbackFn(Tone.getTransport().immediate());
                } catch (err) {
                    this.debug && console.error('Error in MIDI clock triggered loop callback:', err);
                }
            }
        }, { pulses });

        // Store reference to the loop
        this.registeredLoops.set(id, {
            loop: loopInstance,
            interval,
            pulses
        });

        this.debug && console.log(`Registered Tone.js loop with MIDI clock: ${id} (${pulses} pulses)`);
        return id;
    }

    /**
     * Register a repeating callback with MIDI clock
     * @param {Function} callback - The callback function to execute on each interval
     * @param {string|number} interval - Tone.js interval (e.g., '4n', '8t', 0.5)
     * @returns {string} ID assigned to the registered callback
     */
    registerCallback(callback, interval) {
        // Create a simple object to track the callback
        const loopObj = {
            callback,
            _active: true
        };

        return this.registerLoop(loopObj, interval);
    }

    /**
     * Unregister a loop by its ID
     * @param {string} id - The ID returned from registerLoop or registerCallback
     */
    unregisterLoop(id) {
        if (this.registeredLoops.has(id)) {
            midiClockManager.off(id);
            this.registeredLoops.delete(id);
            this.debug && console.log(`Unregistered loop: ${id}`);
        }
    }

    /**
     * Get the callback function from a loop object
     * @private
     */
    getCallbackFunction(loopObj) {
        // If it's a function, use it directly
        if (typeof loopObj.callback === 'function') {
            return loopObj.callback;
        }

        // Handle different types of callbacks
        if (typeof loopObj.callback === 'object' && loopObj.callback !== null) {
            if (typeof loopObj.callback.next === 'function') {
                // Handle iterator-based callbacks (used in some Tone.js classes)
                return (time) => loopObj.callback.next(time);
            }
        }

        // For Tone.Loop instances, the callback might be stored differently
        // Some loops store the callback function in a different property
        if (loopObj._callback && typeof loopObj._callback === 'function') {
            return loopObj._callback;
        }

        // For custom loop implementations in the codebase
        if (loopObj.onTrigger && typeof loopObj.onTrigger === 'function') {
            return loopObj.onTrigger;
        }

        return null;
    }

    /**
     * Convert Tone.js time interval notation to MIDI clock pulses
     * @param {string|number} interval - Tone.js interval (e.g., '4n', '8t', 0.5)
     * @returns {number} - Equivalent MIDI clock pulses
     */
    convertIntervalToPulses(interval) {
        let pulses = 6; // Default: 16th note (6 pulses)

        // Handle different interval formats
        if (typeof interval === 'number') {
            // Convert seconds to pulses based on current BPM
            // 24 pulses per quarter note at current BPM
            const quarterDuration = 60 / Tone.getTransport().bpm.value;
            pulses = Math.round((interval / quarterDuration) * 24);
        } else if (typeof interval === 'string') {
            // Common note values
            if (interval === '4n' || interval === '1/4') {
                pulses = 24; // Quarter note: 24 pulses
            } else if (interval === '8n' || interval === '1/8') {
                pulses = 12; // Eighth note: 12 pulses
            } else if (interval === '16n' || interval === '1/16') {
                pulses = 6;  // Sixteenth note: 6 pulses
            } else if (interval === '32n' || interval === '1/32') {
                pulses = 3;  // Thirty-second note: 3 pulses
            } else if (interval === '2n' || interval === '1/2') {
                pulses = 48; // Half note: 48 pulses
            } else if (interval === '1m' || interval === '1n') {
                pulses = 96; // Whole note: 96 pulses (assuming 4/4 time)
            } else if (interval === '8t') {
                pulses = 8;  // Eighth note triplet: 8 pulses
            } else if (interval === '16t') {
                pulses = 4;  // Sixteenth note triplet: 4 pulses
            }
            // More interval types could be added as needed
        }

        return Math.max(1, pulses); // Ensure at least 1 pulse
    }

    /**
     * Set the active state of a registered loop
     * @param {string} id - The loop ID
     * @param {boolean} active - Whether the loop should be active
     */
    setLoopActive(id, active) {
        const loopData = this.registeredLoops.get(id);
        if (loopData) {
            loopData.loop._active = active;
            this.debug && console.log(`Loop ${id} active state set to ${active}`);
        }
    }

    /**
     * Get information about all currently registered loops
     * @returns {Object} - Information about registered loops
     */
    getRegisteredLoops() {
        const result = {};

        for (const [id, data] of this.registeredLoops) {
            result[id] = {
                interval: data.interval,
                pulses: data.pulses,
                active: data.loop._active !== false // Treat undefined as true
            };
        }

        return result;
    }
}

// Create singleton instance
const toneJsMidiSync = new ToneJsMidiSync();

export default toneJsMidiSync;
