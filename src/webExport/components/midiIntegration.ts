/**
 * MIDI integration for the web export
 * Provides integration with the MIDI module
 */

/**
 * The code to integrate with MIDI input and output selection
 */
export const generateMidiIntegrationCode = `
    // Function to display available MIDI devices and populate the selectors
    function displayMidiDevices() {
        if (!window.midi_input_ids || !window.midi_output_ids || !window.midi_input_names || !window.midi_output_names) {
            console.warn('MIDI device information not available');
            return;
        }
        
        // Get the select elements
        const inputSelect = document.getElementById('midiInputSelect');
        const outputSelect = document.getElementById('midiOutputSelect');
        
        if (inputSelect && outputSelect) {
            // Clear existing options
            inputSelect.innerHTML = '<option value="">None</option>';
            outputSelect.innerHTML = '<option value="">None</option>';
            
            // Add input options using midi_input_ids and midi_input_names
            for (const id in window.midi_input_ids) {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = window.midi_input_names[id];
                inputSelect.appendChild(option);
            }
            
            // Add output options using midi_output_ids and midi_output_names
            for (const id in window.midi_output_ids) {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = window.midi_output_names[id];
                outputSelect.appendChild(option);
            }
        }
    }

    // Function to handle MIDI input device selection
    function handleMidiInputSelection(deviceId) {
        console.log('Setting MIDI input device:', deviceId);
        if (window.setMidiInput && deviceId) {
            try {
                window.setMidiInput(deviceId);
                console.log('MIDI input device set successfully');
            } catch (error) {
                console.error('Failed to set MIDI input device:', error);
            }
        } else {
            console.warn("MIDI input function not available or no device selected");
        }
    }

    // Function to handle MIDI output device selection
    function handleMidiOutputSelection(deviceId) {
        console.log('Setting MIDI output device:', deviceId);
        if (window.setMidiOutput && deviceId) {
            try {
                window.setMidiOutput(deviceId);
                console.log('MIDI output device set successfully');
            } catch (error) {
                console.error('Failed to set MIDI output device:', error);
            }
        } else {
            console.warn("MIDI output function not available or no device selected");
        }
    }

    // Attach listeners for MIDI device selection
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize MIDI device selectors
        const refreshBtn = document.getElementById('refreshMidiBtn');
        const inputSelect = document.getElementById('midiInputSelect');
        const outputSelect = document.getElementById('midiOutputSelect');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                displayMidiDevices();
            });
        }
        
        if (inputSelect) {
            inputSelect.addEventListener('change', (event) => {
                const target = event.target;
                if (target) {
                    handleMidiInputSelection(target.value);
                }
            });
        }
        
        if (outputSelect) {
            outputSelect.addEventListener('change', (event) => {
                const target = event.target;
                if (target) {
                    handleMidiOutputSelection(target.value);
                }
            });
        }
        
        // Initial display of MIDI devices
        // Wait a moment to ensure MIDI is initialized
        setTimeout(displayMidiDevices, 500);
    });

    // Make MIDI functions globally available
    window.setMidiInput = setMidiInput;
    window.setMidiOutput = setMidiOutput;
    `;
