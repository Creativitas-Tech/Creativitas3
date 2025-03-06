async function webExportHTMLContentGenerator(userCode: String) {

    // Load the bundled synth code from public assets
    let synthCode = '';
    try {
        const response = await fetch('/creativitas/synth-bundle.txt');
        if (!response.ok) throw new Error('Failed to load synth bundle');
        synthCode = await response.text();
    } catch (error) {
        console.error('Error loading synth bundle:', error);
        synthCode = '// Failed to load synth bundle';
    }

    const css = `
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            canvas { display: block; margin-bottom: 10px; }
            #controls { margin-bottom: 20px; }
            .canvas-container { margin-bottom: 20px; }
            .span-container {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .invisible-button {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
            }
            .icon {
                height: 24px;
                transition: opacity 0.1s ease;
            }
            .active {
                opacity: 1;
            }
            .inactive {
                opacity: 0.5;
            }
            #notes-display {
                display: flex;
                flex-direction: row;
                flex-wrap: nowrap;
                gap: 8px;
                overflow-x: auto;
                white-space: nowrap;
                max-width: 70vw;
            }
            .note-pill {
                background-color: #f0f0f0;
                border-radius: 12px;
                padding: 4px 8px;
                font-size: 12px;
            }
`;

    const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Creativitas Exported Code</title>
                
                <!-- External Dependencies -->
                <script src="https://cdnjs.cloudflare.com/ajax/libs/tone/15.0.4/Tone.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.0/p5.js"></script>
                <script src="https://cdn.socket.io/4.8.1/socket.io.min.js" integrity="sha384-mkQ3/7FUtcGyoppY6bz/PORYoGqOl7/aSUMn2ymDOJcapfS6PHqxhRTMh1RR0Q6+" crossorigin="anonymous"></script>               

                <style>
                ${css}
                </style>
            </head>
            <body>
                <div id="controls">
                    <button onclick="stopCode()">Restart</button>
                    <p>BPM: <span id="bpmValue">120</span></p>
                    
                    <input 
                        type="range" 
                        id="bpmSlider" 
                        min="10" 
                        max="300" 
                        value="120"
                        oninput="updateBPM(this.value)"
                    >
                    
                    <input 
                        type="number" 
                        id="bpmInput" 
                        min="10" 
                        max="300" 
                        value="120"
                        oninput="updateBPM(this.value)"
                    >
                <div class="span-container" id="keyboard-container">
                    <button class="invisible-button" id="keyboard-button">
                        <img class="icon inactive" id="keyboard-icon" src="https://n54omxuiol.ufs.sh/f/K0nF6SKQt5rdQI0fYSZ76iwjnab1uNgOfU42I3KsEv8Yh9Cr" alt="Keyboard" />
                    </button>
                    <div id="notes-display"></div>
                </div>
                </div>

                <!-- Canvas container -->
                <div class="canvas-container" id="Canvas"></div>

                <div id="volumeWarning" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;">
                    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                        <h2>⚠️ Volume Warning</h2>
                        <p>This page contains audio content. Please ensure your volume is at a comfortable level.</p>
                        <button onclick="acknowledgeWarning()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">I understand</button>
                    </div>
                </div>

                <script>
                    // Synth class definitions and dependencies
                    ${synthCode}

                    // Initialize ASCII
                    window.enableAsciiInput = asciiCallbackInstance.enable.bind(asciiCallbackInstance);
                    window.disableAsciiInput = asciiCallbackInstance.disable.bind(asciiCallbackInstance);
                    window.setAsciiHandler = asciiCallbackInstance.setHandler.bind(asciiCallbackInstance);

                    // Initialize MIDI
                    window.midiHandlerInstance = midiHandlerInstance;
                    window.setNoteOnHandler = midiHandlerInstance.setNoteOnHandler.bind(midiHandlerInstance);
                    window.setNoteOffHandler = midiHandlerInstance.setNoteOffHandler.bind(midiHandlerInstance);
                    window.setCCHandler = midiHandlerInstance.setCCHandler.bind(midiHandlerInstance);
                    window.sendCC = midiHandlerInstance.sendCC.bind(midiHandlerInstance);
                    window.sendNote = midiHandlerInstance.sendNoteOn.bind(midiHandlerInstance);
                    window.sendNoteOff = midiHandlerInstance.sendNoteOff.bind(midiHandlerInstance);

                    // Initialize CollabHub
                    // WARNING: Given as function because user will have initCollab() in their code!!!
                    function initCollab (roomName = "web-export-famle") {
                        window.chClient = new CollabHubClient(); // needs to happen once (!)
                        window.chTracker = new CollabHubTracker(window.chClient);
                        // collab-hub join a room
                        window.chClient.joinRoom("web-export-famle");
                    }

                    function acknowledgeWarning() {
                        document.getElementById('volumeWarning').style.display = 'none';
                        runCode();
                    }

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
                            
                            // Run user code
                            eval(document.getElementById('userCode').textContent);

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

                    function updateBPM(value) {
                        Theory.tempo = parseInt(value);
                        document.getElementById('bpmValue').textContent = value;
                        document.getElementById('bpmSlider').value = value;
                        document.getElementById('bpmInput').value = value;
                    }
                </script>

                <!-- User Code -->
                <script id="userCode" type="text/javascript">
                    ${userCode}
                </script>
            </body>
            </html>
        `;
    return htmlContent;
}
export default webExportHTMLContentGenerator;
