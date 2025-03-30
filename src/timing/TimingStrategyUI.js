/**
 * TimingStrategyUI.js - UI components for timing strategy management
 * 
 * This module provides UI components and handlers for managing timing strategies
 * in the Creativitas application.
 */

import { handleTimingInitialization } from './TimingModalDialog.js';

/**
 * Creates a timing strategy selector dropdown
 * @param {Object} timingStrategyManager - The timing strategy manager instance
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} - The created dropdown element
 */
export function createTimingStrategySelector(timingStrategyManager, options = {}) {
    const { onChange, className = 'timing-strategy-selector' } = options;
    
    // Create select element
    const select = document.createElement('select');
    select.className = className;
    
    // Add options for each strategy
    const strategies = timingStrategyManager.getAvailableStrategies();
    
    // Add Tone.js option
    const toneOption = document.createElement('option');
    toneOption.value = strategies.TONE_JS;
    toneOption.textContent = 'Tone.js Timing';
    select.appendChild(toneOption);
    
    // Add Timing Object option
    const timingObjectOption = document.createElement('option');
    timingObjectOption.value = strategies.TIMING_OBJECT;
    timingObjectOption.textContent = 'Timing Object';
    select.appendChild(timingObjectOption);
    
    // Add MIDI Clock option
    const midiClockOption = document.createElement('option');
    midiClockOption.value = strategies.MIDI_CLOCK;
    midiClockOption.textContent = 'MIDI Clock';
    select.appendChild(midiClockOption);
    
    // Set initial value
    select.value = timingStrategyManager.getActiveStrategy();
    
    // Add change handler
    select.addEventListener('change', async (e) => {
        const strategy = e.target.value;
        
        if (strategy === strategies.TONE_JS) {
            // Tone.js is simple to switch to
            await timingStrategyManager.setStrategy(strategies.TONE_JS);
            if (onChange) onChange(strategy);
        } 
        else if (strategy === strategies.TIMING_OBJECT) {
            // Timing Object requires async initialization with UI feedback
            handleTimingObjectStrategy(timingStrategyManager, select, onChange);
        } 
        else if (strategy === strategies.MIDI_CLOCK) {
            // MIDI Clock is simple to switch to
            await timingStrategyManager.setStrategy(strategies.MIDI_CLOCK);
            if (onChange) onChange(strategy);
        }
    });
    
    return select;
}

/**
 * Creates timing control buttons (start/stop)
 * @param {Object} timingStrategyManager - The timing strategy manager instance
 * @param {Object} options - Configuration options
 * @returns {Object} - Object containing the created buttons
 */
export function createTimingControlButtons(timingStrategyManager, options = {}) {
    const { onStart, onStop, className = 'timing-button' } = options;
    
    // Create start button
    const startButton = document.createElement('button');
    startButton.className = `${className} timing-start-button`;
    startButton.textContent = 'Start';
    
    // Create stop button
    const stopButton = document.createElement('button');
    stopButton.className = `${className} timing-stop-button`;
    stopButton.textContent = 'Stop';
    
    // Add event handlers
    startButton.addEventListener('click', () => {
        timingStrategyManager.start();
        console.log('Timing manager started');
        if (onStart) onStart();
    });
    
    stopButton.addEventListener('click', () => {
        timingStrategyManager.stop();
        console.log('Timing manager stopped');
        if (onStop) onStop();
    });
    
    return { startButton, stopButton };
}

/**
 * Creates a complete timing controls container with selector and buttons
 * @param {Object} timingStrategyManager - The timing strategy manager instance
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} - The container element with all controls
 */
export function createTimingControlsContainer(timingStrategyManager, options = {}) {
    const { onChange, onStart, onStop, containerClassName = 'timing-controls' } = options;
    
    // Create container
    const container = document.createElement('div');
    container.className = containerClassName;
    
    // Create selector
    const selector = createTimingStrategySelector(timingStrategyManager, { onChange });
    
    // Create buttons
    const { startButton, stopButton } = createTimingControlButtons(timingStrategyManager, { onStart, onStop });
    
    // Assemble container
    container.appendChild(selector);
    container.appendChild(startButton);
    container.appendChild(stopButton);
    
    return container;
}

/**
 * Handles switching to the Timing Object strategy with UI feedback
 * @param {Object} timingStrategyManager - The timing strategy manager instance
 * @param {HTMLSelectElement} selectElement - The strategy selector element
 * @param {Function} onChange - Callback for when the strategy changes
 */
async function handleTimingObjectStrategy(timingStrategyManager, selectElement, onChange) {
    const strategies = timingStrategyManager.getAvailableStrategies();
    const currentStrategy = timingStrategyManager.getActiveStrategy();
    
    // Initialize with modal dialog
    const result = await handleTimingInitialization(
        // Initialization function
        () => timingStrategyManager.setStrategy(strategies.TIMING_OBJECT),
        
        // Success callback
        () => {
            console.log('Successfully switched to Timing Object strategy');
            if (onChange) onChange(strategies.TIMING_OBJECT);
        },
        
        // Cancel callback
        () => {
            // Reset dropdown to current strategy
            selectElement.value = currentStrategy;
        },
        
        'Timing Object'
    );
    
    return result;
}
