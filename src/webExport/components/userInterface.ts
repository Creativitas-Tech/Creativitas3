/**
 * User interface components for the web export
 * Provides functions for UI-related functionality
 */

/**
 * Generates the volume warning acknowledgment function
 * @returns The code for the volume warning acknowledgment function
 */
export function generateVolumeWarningCode(): string {
    return `
    function acknowledgeWarning() {
        document.getElementById('volumeWarning').style.display = 'none';
        runCode();
    }
    `;
}

/**
 * Generates the BPM control functions
 * @returns The code for the BPM control functions
 */
export function generateBPMControlCode(): string {
    return `
    function updateBPM(value) {
        document.getElementById('bpmValue').textContent = value;
        document.getElementById('bpmSlider').value = value;
        document.getElementById('bpmInput').value = value;
        window.timing.setBpm(value);
    }

    // Sync BPM UI with actual Tone.Transport BPM value
    function syncBPMFromToneTransport() {
        const currentBPM = Math.round(Tone.Transport.bpm.value);
        const displayedBPM = parseInt(document.getElementById('bpmValue').textContent);
        
        // Only update if the values differ
        if (currentBPM !== displayedBPM) {
            // Update UI without triggering the main updateBPM function
            document.getElementById('bpmValue').textContent = currentBPM;
            document.getElementById('bpmSlider').value = currentBPM;
            document.getElementById('bpmInput').value = currentBPM;
        }
    }

    // Check BPM periodically to keep UI in sync
    setInterval(syncBPMFromToneTransport, 1000); // Check every 1000ms
    `;
}

/**
 * Generates the code execution functions
 * @returns The code for the code execution functions
 */
export function generateCodeExecutionCode(): string {
    return `
    // Function to run user code
    async function runCode() {
        try {
            // Start audio context
            await Tone.start();
            window.audioContext = Tone.context.rawContext;
            
            // Clear previous state
            Tone.Transport.stop();
            Tone.Transport.cancel();
            
            // Clear all previous canvases
            Canvas.innerHTML = "";
            
            // Get the user code from the non-executable script tag
            const userCodeElement = document.getElementById('userCode');
            const userCode = userCodeElement.textContent || userCodeElement.innerText;
            
            // Run user code
            eval(userCode);

            updateBPM(Theory.tempo);
        } catch (error) {
            console.error('Error running code:', error);
            alert('Error running code: ' + error.message);
        }
    }

    // Function to stop all sound (just reloads the page, there is too much to fix otherwise)
    function stopCode() {
        location.reload();
    }

    // Attach listeners to buttons
    document.addEventListener('DOMContentLoaded', () => {
        const startBtn = document.getElementById('startButton');
        const stopBtn = document.getElementById('stopButton');
        if (startBtn) startBtn.addEventListener('click', startTiming); 
        if (stopBtn) stopBtn.addEventListener('click', stopTiming);   
    });
    `;
}
