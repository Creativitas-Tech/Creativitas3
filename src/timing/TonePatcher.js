import * as Tone from 'tone';
import toneJsSync from './ToneJsSync.js';

/**
 * TonePatcher - Handles patching of Tone.js components
 * 
 * This class is responsible for patching Tone.js components to work with
 * different timing strategies. It patches Tone.Loop and Tone.Transport
 * to integrate with the timing strategy manager.
 */
class TonePatcher {
    constructor(timingStrategyManager) {
        this.timingStrategyManager = timingStrategyManager;
        this.debug = false;
        
        // Apply all patches upon construction
        this.applyPatches();
    }

    /**
     * Apply all patches to Tone.js components
     */
    applyPatches() {
        this.patchToneLoop();
        this.patchToneTransport();
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
        const patcher = this;

        // Override the start method to automatically register loops
        Tone.Loop.prototype.start = function (time) {
            patcher.registerLoop(this);
            return originalStart.call(this, time);
        };

        // Override the dispose method to unregister loops when they're disposed
        Tone.Loop.prototype.dispose = function () {
            // Unregister the loop before disposing it
            patcher.unregisterLoop(this);
            return originalDispose.call(this);
        };
    }

    /**
     * Patch Tone.Transport to prevent start() from working when MIDI clock is active
     * @private
     */
    patchToneTransport() {
        const originalStart = Tone.getTransport().start;
        const manager = this.timingStrategyManager;

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

export default TonePatcher;
