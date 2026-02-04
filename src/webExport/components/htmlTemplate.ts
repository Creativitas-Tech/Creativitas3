import { getBundledTimingPackages, getBundledSynthCode } from '../utils/bundleLoader.ts';
import { generateTimingIntegrationCode, generateTimingControlCode } from './timingIntegration.ts';
import { generateMidiIntegrationCode } from './midiIntegration.ts';
import {
    generateVolumeWarningCode,
    generateBPMControlCode,
    generateCodeExecutionCode,
    generateVolumeControlCode,
    generateCollabUICode
} from './userInterface.ts';
import { exportStyles } from '../styles/exportStyles.ts';

/**
 * HTML template for the exported web application
 */

// Helper function to generate the <head> section
// Takes title as parameter, includes external dependencies and styles
function generateHead(title: string): string {
    return `
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    <!-- External Dependencies -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/tone/15.0.4/Tone.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.0/p5.js"></script>
    <script src="https://cdn.socket.io/4.8.1/socket.io.min.js" integrity="sha384-mkQ3/7FUtcGyoppY6bz/PORYoGqOl7/aSUMn2ymDOJcapfS6PHqxhRTMh1RR0Q6+" crossorigin="anonymous"></script>               
    <script src="https://unpkg.com/nexusui/dist/NexusUI.js"></script>
    
    <!-- Styles -->
    <style>
        ${exportStyles} // Inject styles directly
    </style>
</head>
    `;
}

// The controls section HTML
const generateControls = `
<div id="controls">
    <div>
        <button id="startButton" style="padding: 5px 10px; margin-right: 5px;">Start</button>
        <button id="stopButton" style="padding: 5px 10px; margin-right: 10px;">Stop</button>
        
        <label for="bpmInput" style="margin-right: 5px;">BPM:</label>
        <span id="bpmValue" style="display: inline-block; min-width: 25px; text-align: right; margin-right: 5px;">120</span>
        <input 
            type="range" 
            id="bpmSlider" 
            min="10" 
            max="300" 
            value="120" 
            oninput="updateBPM(this.value)" 
            style="vertical-align: middle; margin-right: 5px;"
        >
        <input 
            type="number" 
            id="bpmInput" 
            min="10" 
            max="300" 
            value="120" 
            oninput="updateBPM(this.value)"
            style="width: 50px; margin-right: 10px; padding: 2px; vertical-align: middle;"
        >
        
        <label for="volumeSlider" style="margin-right: 5px;">Volume:</label>
        <span id="volumeValue" style="display: inline-block; min-width: 25px; text-align: right; margin-right: 5px;">100</span>
        <input 
            type="range" 
            id="volumeSlider" 
            min="0" 
            max="100" 
            value="100" 
            oninput="updateVolume(this.value)" 
            style="vertical-align: middle; margin-right: 10px;"
        >
        
        <label for="timingStrategySelect" style="margin-right: 5px;">Timing:</label>
        <select id="timingStrategySelect" title="Select Timing Strategy" style="padding: 2px; vertical-align: middle;">
            <option value="tone_js">Tone.js</option>
            <option value="midi_clock">Midi Clock</option>
            <option value="timing_object">Timing Object</option>
        </select>
    </div>
    <div style="margin-top: 10px;">
        <label for="midiInputSelect" style="margin-right: 5px;">MIDI Input:</label>
        <select id="midiInputSelect" title="Select MIDI Input Device" style="padding: 2px; vertical-align: middle; margin-right: 10px;">
            <option value="">None</option>
        </select>
        
        <label for="midiOutputSelect" style="margin-right: 5px;">MIDI Output:</label>
        <select id="midiOutputSelect" title="Select MIDI Output Device" style="padding: 2px; vertical-align: middle; margin-right: 10px;">
            <option value="">None</option>
        </select>
        
        <button id="refreshMidiBtn" style="padding: 2px 8px; vertical-align: middle;">Refresh MIDI</button>
    </div>
    <div style="margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px;">
        <label for="usernameInput" style="margin-right: 5px;">Username:</label>
        <input 
            type="text" 
            id="usernameInput" 
            placeholder="Enter username" 
            style="padding: 2px; vertical-align: middle; margin-right: 5px; width: 150px;"
        >
        <button id="setUsernameBtn" style="padding: 2px 8px; vertical-align: middle; margin-right: 10px;">Set Username</button>
        <span id="currentUsernameDisplay" style="margin-left: 5px; font-style: italic;"></span>
        
        <label for="roomInput" style="margin-right: 5px; margin-left: 10px;">Room:</label>
        <input 
            type="text" 
            id="roomInput" 
            placeholder="Enter room name" 
            value="famleLounge"
            style="padding: 2px; vertical-align: middle; margin-right: 5px; width: 150px;"
        >
        <button id="joinRoomBtn" style="padding: 2px 8px; vertical-align: middle;">Join Room</button>
        <span id="currentRoomDisplay" style="margin-left: 5px; font-style: italic;"></span>
    </div>
</div>
    `;

// The volume warning overlay HTML
const generateVolumeWarningHTML = `
<div id="volumeWarning">
    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
        <h2>Audio Application</h2>
        <p>
        This page contains audio content. Please ensure your volume is at a comfortable level.
        </p>
        <button onclick="acknowledgeWarning()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">I understand</button>
    </div>
</div>
    `;

// Window initializers code
const generateWindowInitializers = `
    // Initialize ASCII
    window.enableAsciiInput = asciiCallbackInstance.enable.bind(asciiCallbackInstance);
    window.disableAsciiInput = asciiCallbackInstance.disable.bind(asciiCallbackInstance);
    window.setAsciiHandler = asciiCallbackInstance.setHandler.bind(asciiCallbackInstance);
    window.enableAsciiRepeat = () => asciiCallbackInstance.allowRepeat = true;
    window.disableAsciiRepeat = () => asciiCallbackInstance.allowRepeat = false;

    // Initialize MIDI
    window.midiHandlerInstance = midiHandlerInstance;
    window.setNoteOnHandler = midiHandlerInstance.setNoteOnHandler.bind(midiHandlerInstance);
    window.setNoteOffHandler = midiHandlerInstance.setNoteOffHandler.bind(midiHandlerInstance);
    window.setCCHandler = midiHandlerInstance.setCCHandler.bind(midiHandlerInstance);
    window.sendCC = midiHandlerInstance.sendCC.bind(midiHandlerInstance);
    window.sendNote = midiHandlerInstance.sendNoteOn.bind(midiHandlerInstance);
    window.sendNoteOff = midiHandlerInstance.sendNoteOff.bind(midiHandlerInstance);
    window.midiHandler = midiHandlerInstance
    `;

// Helper function to generate the user code script block
// Takes userCode as parameter
function generateUserScript(userCode: string): string {
    return `
<script id="userCode" type="text/plain">
    ${userCode}
</script>
    `;
}

// Async helper function to generate the main script block in the body
// Fetches and includes all necessary script components directly
async function generateBodyScript(): Promise<string> {
    // Fetch bundled code
    const timingPackages = await getBundledTimingPackages();
    const synthCode = await getBundledSynthCode();

    return `
<script>
    // --- Bundled Core Dependencies ---
    ${timingPackages}
    ${synthCode}

    // --- Important window initializations ---
    ${generateWindowInitializers}

    // --- UI/Control Functions ---
    ${generateVolumeWarningCode}
    ${generateTimingControlCode}
    ${generateTimingIntegrationCode}
    ${generateMidiIntegrationCode}
    ${generateCodeExecutionCode}
    ${generateBPMControlCode}
    ${generateVolumeControlCode}
    ${generateCollabUICode}
</script>
    `;
}

// Async function to generate the complete HTML template.
// Only requires the userCode.
async function generateHTMLTemplate(userCode: string): Promise<string> {
    const title = "Creativitas Web Export"; // Example title

    // Generate all parts by calling helper functions
    const headContent = generateHead(title);
    const bodyScriptContent = await generateBodyScript(); // Async call for the main script
    const userScriptContent = generateUserScript(userCode);

    return `
<!DOCTYPE html>
<html lang="en">
${headContent}
<body>
    ${generateControls}
    <div class="canvas-container" id="Canvas"></div>
    ${generateVolumeWarningHTML}
    ${bodyScriptContent}
    ${userScriptContent}
</body>
</html>
    `;
}

export { generateHTMLTemplate }; // Export the main function
