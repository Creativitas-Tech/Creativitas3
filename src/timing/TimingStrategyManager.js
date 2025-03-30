import * as Tone from 'tone';
import { timingObjectManager } from './TimingObjectManager.js';
import midiClockManager from '../midi/MidiClockManager.js';
import toneJsSync from './ToneJsSync.js';

/**
 * TimingStrategyManager - Centralized manager for different timing strategies
 * 
 * This class provides a unified interface to switch between different timing mechanisms:
 * 1. Default Tone.js transport (built-in)
 * 2. TimingObject-based synchronization (TimingManager)
 * 3. MIDI clock-based synchronization (MidiClockManager)
 */
class TimingStrategyManager {
    constructor() {
        // Available timing strategies
        this.STRATEGIES = {
            TONE_JS: 'tone_js',           // Default Tone.js transport
            TIMING_OBJECT: 'timing_object', // TimingManager with TimingObject
            MIDI_CLOCK: 'midi_clock'      // MidiClockManager with MIDI clock
        };

        // Current active strategy
        this.activeStrategy = this.STRATEGIES.TONE_JS;

        // Patch Tone.Loop to automatically register with our manager
        this.patchToneLoop();

        // Patch Tone.Transport.start to prevent it from working with MIDI clock
        this.patchToneTransport();
    }

    /**
     * Initialize a specific timing strategy
     * @param {string} strategy - The strategy to initialize
     * @returns {Promise} - Resolves when initialization is complete
     */
    async initializeStrategy(strategy) {
        switch (strategy) {
            case this.STRATEGIES.TIMING_OBJECT:
                return timingObjectManager.initialize();

            case this.STRATEGIES.MIDI_CLOCK:
                midiClockManager.enable();
                return Promise.resolve();

            case this.STRATEGIES.TONE_JS:
                // Already initialized by default
                return Promise.resolve();

            default:
                throw new Error(`Unknown timing strategy: ${strategy}`);
        }
    }

    /**
     * Set the active timing strategy
     * @param {string} strategy - The strategy to activate
     * @returns {Promise} - Resolves when the strategy is activated
     */
    async setStrategy(strategy) {
        if (!Object.values(this.STRATEGIES).includes(strategy)) {
            throw new Error(`Invalid timing strategy: ${strategy}. Valid options are: ${Object.values(this.STRATEGIES).join(', ')}`);
        }

        // If already using this strategy, do nothing
        if (this.activeStrategy === strategy) {
            return Promise.resolve();
        }

        // Initialize the strategy
        await this.initializeStrategy(strategy);

        // Deactivate current strategy
        this.deactivateCurrentStrategy();

        // Update active strategy
        this.activeStrategy = strategy;

        // Activate new strategy
        this.activateStrategy();

        console.log(`Timing strategy changed to: ${strategy}`);
        return Promise.resolve();
    }

    /**
     * Deactivate the current timing strategy
     * @private
     */
    deactivateCurrentStrategy() {
        switch (this.activeStrategy) {
            case this.STRATEGIES.TIMING_OBJECT:
                timingObjectManager.shouldBeUsed = false;
                timingObjectManager.stopTimer();
                break;

            case this.STRATEGIES.MIDI_CLOCK:
                midiClockManager.disable();
                break;

            case this.STRATEGIES.TONE_JS:
                // Nothing to deactivate for default Tone.js
                break;
        }
    }

    /**
     * Activate the current timing strategy
     * @private
     */
    activateStrategy() {
        switch (this.activeStrategy) {
            case this.STRATEGIES.TIMING_OBJECT:
                timingObjectManager.setShouldUse();
                break;

            case this.STRATEGIES.MIDI_CLOCK:
                // Stop the Tone.js transport since MIDI clock doesn't rely on it
                // and having both running can cause doubled sounds
                Tone.getTransport().stop();
                break;

            case this.STRATEGIES.TONE_JS:
                // Default Tone.js transport is always active
                break;
        }
    }

    /**
     * Get the current active strategy
     * @returns {string} - The active strategy
     */
    getActiveStrategy() {
        return this.activeStrategy;
    }

    /**
     * Get all available strategies
     * @returns {Object} - Available strategies
     */
    getAvailableStrategies() {
        return { ...this.STRATEGIES };
    }

    /**
     * Start transport based on active strategy
     */
    start() {
        switch (this.activeStrategy) {
            case this.STRATEGIES.TIMING_OBJECT:
                timingObjectManager.startTimer();
                break;

            case this.STRATEGIES.MIDI_CLOCK:
                // For MIDI clock, we don't start the transport directly
                midiClockManager.enable();
                break;

            case this.STRATEGIES.TONE_JS:
                // Default Tone.js transport start
                Tone.getTransport().start();
                break;
        }
    }

    /**
     * Stop transport based on active strategy
     */
    stop() {
        switch (this.activeStrategy) {
            case this.STRATEGIES.TIMING_OBJECT:
                timingObjectManager.stopTimer();
                break;

            case this.STRATEGIES.MIDI_CLOCK:
                // For MIDI clock, we don't stop the transport directly
                // It will be controlled by incoming MIDI clock messages
                midiClockManager.disable();
                console.log('Transport is controlled by MIDI clock');
                break;

            case this.STRATEGIES.TONE_JS:
                // Default Tone.js transport stop
                Tone.getTransport().stop();
                break;
        }
    }

    /**
     * Set BPM based on active strategy
     * @param {number} bpm - Beats per minute
     */
    setBpm(bpm) {
        switch (this.activeStrategy) {
            case this.STRATEGIES.TIMING_OBJECT:
                // Update TimingObject velocity
                timingObjectManager.updateVelocity(bpm);
                break;

            case this.STRATEGIES.MIDI_CLOCK:
                // For MIDI clock, BPM is determined by incoming clock messages
                console.log('BPM is controlled by MIDI clock');
                break;

            case this.STRATEGIES.TONE_JS:
                // Default Tone.js BPM setting
                Tone.getTransport().bpm.value = bpm;
                break;
        }
    }

    /**
     * Register a Tone.Loop with toneJsSync
     * @param {Tone.Loop} loop - The loop to register
     * @param {string|number} [interval] - Optional interval override
     * @returns {string|null} - ID of the registered loop
     */
    registerLoop(loop, interval = null) {
        // Always register with toneJsSync to ensure loops are available for MIDI clock
        return toneJsSync.registerLoop(loop, interval);
    }

    /**
     * Unregister a loop from toneJsSync
     * @param {string|Tone.Loop} loopOrId - Loop instance or ID to unregister
     */
    unregisterLoop(loopOrId) {
        if (typeof loopOrId === 'string') {
            toneJsSync.unregisterLoop(loopOrId);
        } else {
            // Find the loop ID by loop instance in toneJsSync's registry
            for (const [id, loopData] of toneJsSync.registeredLoops.entries()) {
                if (loopData.loop === loopOrId) {
                    toneJsSync.unregisterLoop(id);
                    break;
                }
            }
        }
    }


    /**
     * Patch Tone.Loop to automatically register with our manager and track lifecycle
     * @private
     */
    patchToneLoop() {
        const originalStart = Tone.Loop.prototype.start;
        const originalDispose = Tone.Loop.prototype.dispose;
        const manager = this;

        // Override the start method to automatically register loops
        Tone.Loop.prototype.start = function (time) {
            manager.registerLoop(this);
            return originalStart.call(this, time);
        };

        // Override the dispose method to unregister loops when they're disposed
        Tone.Loop.prototype.dispose = function () {
            // Unregister the loop before disposing it
            manager.unregisterLoop(this);
            return originalDispose.call(this);
        };
    }

    /**
     * Patch Tone.Transport to prevent start() from working when MIDI clock is active
     * @private
     */
    patchToneTransport() {
        const originalStart = Tone.getTransport().start;
        const manager = this;

        // Override the start method to prevent it from working with MIDI clock
        Tone.getTransport().start = function (time, offset) {
            // If MIDI clock strategy is active, prevent direct transport start
            if (manager.activeStrategy === manager.STRATEGIES.MIDI_CLOCK) {
                console.warn('Cannot start Tone.Transport directly when MIDI clock strategy is active');
                return this;
            }

            // Otherwise, use the original start method
            return originalStart.call(this, time, offset);
        };
    }
}

// Create singleton instance
export const timingStrategyManager = new TimingStrategyManager();
