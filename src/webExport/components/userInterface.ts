/**
 * User interface components for the web export
 * Provides functions for UI-related functionality
 */

/**
 * The code for the volume warning acknowledgment function
 */
export const generateVolumeWarningCode = `
    function acknowledgeWarning() {
        document.getElementById('volumeWarning').style.display = 'none';
        runCode();
    }
    `;

/**
 * The code for the volume control functions
 */
export const generateVolumeControlCode = `
    function updateVolume(value) {
        // Convert slider value (0-100) to decibels (-60 to 0)
        // -60dB is near silence, 0dB is full volume
        const volumeDb = (value / 100) * 60 - 60;
        
        // Update Tone.js master volume
        Tone.getDestination().volume.value = volumeDb;
        
        // Update UI
        document.getElementById('volumeValue').textContent = value;
        document.getElementById('volumeSlider').value = value;
    }
    `;

/**
 * The code for the BPM control functions
 */
export const generateBPMControlCode = `
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

/**
 * The code for collaboration UI functionality
 */
export const generateCollabUICode = `
    // Initialize CollabSlob client
    window.chClient = new CollabSlobClient();
    
    // Initialize CollabSlob UI elements
    document.addEventListener('DOMContentLoaded', function() {
        // Get UI elements
        const usernameInput = document.getElementById('usernameInput');
        const setUsernameBtn = document.getElementById('setUsernameBtn');
        const roomInput = document.getElementById('roomInput');
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        const currentRoomDisplay = document.getElementById('currentRoomDisplay');
        const currentUsernameDisplay = document.getElementById('currentUsernameDisplay');
        
        // Set username button click handler
        setUsernameBtn.addEventListener('click', function() {
            const username = usernameInput.value.trim();
            if (username) {
                window.chClient.setUsername(username);
                currentUsernameDisplay.textContent = "Current username: " + username;
                console.log("Username set to: " + username);
            } else {
                console.warn('Please enter a valid username');
            }
        });
        
        // Join room button click handler
        joinRoomBtn.addEventListener('click', function() {
            const roomName = roomInput.value.trim();
            if (roomName) {
                window.chClient.joinRoom(roomName);
                currentRoomDisplay.textContent = "Current room: " + roomName;
                console.log("Joined room: " + roomName);
            } else {
                console.warn('Please enter a valid room name');
            }
        });
    });

    // Function to join a collaboration room
    function initCollab(roomName = 'famleLounge') {
        window.chClient.joinRoom(roomName);
        document.getElementById('roomInput').value = roomName;
        document.getElementById('currentRoomDisplay').textContent = "Current room: " + roomName;
    }
    `;

/**
 * The code for the code execution functions
 */
export const generateCodeExecutionCode = `
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
