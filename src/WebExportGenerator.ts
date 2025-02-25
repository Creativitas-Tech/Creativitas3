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
                
                <style>
                ${css}
                </style>
            </head>
            <body>
                <div id="controls">
                    <button onclick="runCode()">Run Code</button>
                    <button onclick="stopCode()">Stop</button>
                <div class="span-container" id="keyboard-container">
                    <button class="invisible-button" id="keyboard-button">
                        <img class="icon inactive" id="keyboard-icon" src="https://n54omxuiol.ufs.sh/f/K0nF6SKQt5rdQI0fYSZ76iwjnab1uNgOfU42I3KsEv8Yh9Cr" alt="Keyboard" />
                    </button>
                    <div id="notes-display"></div>
                </div>
                </div>

                <!-- Canvas container -->
                <div class="canvas-container" id="Canvas"></div>

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
                        } catch (error) {
                            console.error('Error running code:', error);
                            alert('Error running code: ' + error.message);
                        }
                    }

                    // Function to stop all sound (just reloads the page, there is too much to fix otherwise)
                    function stopCode() {
                        location.reload();
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
