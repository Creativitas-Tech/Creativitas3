/**
 * Timing integration for the web export
 * Provides integration with the timing module
 */

/**
 * Generates the code to integrate with the TimingModalDialog.js module
 * Assumes TimingModalDialog functions (handleTimingInitialization) are globally available from synth-bundle.
 * @returns The code for handling timing strategy changes.
 */
export function generateTimingIntegrationCode(): string {
    return `
    // Function to handle timing strategy changes
    async function handleTimingStrategyChange(strategy) {
        console.log('Changing timing strategy to:', strategy);
        
        if (strategy === 'tone_js' || strategy === 'midi_clock') {
            window.timing.setStrategy(strategy);
        } else if (strategy === 'timing_object') {
            // Use the handleTimingInitialization function (expected from synth-bundle)
            await handleTimingInitialization(
                () => window.timing.setStrategy(strategy),
                () => console.log('Timing Object initialized successfully'),
                (error) => console.error('Failed to initialize Timing Object:', error),
                'Timing Object'
            );
        }    
    }

    // Attach listener for timing strategy selection
    document.addEventListener('DOMContentLoaded', () => {
        const timingSelect = document.getElementById('timingStrategySelect');
        if (timingSelect) {
            timingSelect.addEventListener('change', (event) => {
                const target = event.target;
                if (target) {
                    handleTimingStrategyChange(target.value);
                }
            });
        }
    });
    `;
}

/**
 * Generates the JavaScript code for basic timing control functions (start/stop).
 * @returns The JavaScript code as a string.
 */
export function generateTimingControlCode(): string {
    return `
    window.timing = timingStrategyManager;
    // Functions for timing control
    function startTiming() {
        console.log('Starting timing manager');
        // Ensure window.timing is initialized before calling start
        if (window.timing && typeof window.timing.start === 'function') {
            window.timing.start();
        } else {
            console.error("Timing manager (window.timing) not initialized or start function missing.");
        }
    }
    
    function stopTiming() {
        console.log('Stopping timing manager');
        // Ensure window.timing is initialized before calling stop
        if (window.timing && typeof window.timing.stop === 'function') {
            window.timing.stop();
        } else {
            console.error("Timing manager (window.timing) not initialized or stop function missing.");
        }
    }
    `;
}
