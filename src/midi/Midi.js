import { MidiPort } from './MidiPort';

export var midiHost = null;
export var muted = false;

export var outputMidiID = null;

export var midiMsgs = {};
export var ccCallbacks = {};

const deviceRegistry = new Map();

/****** load webMIDI API ******/
//comment out to disable MIDI
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({ sysex: true })
        .then(onMIDISuccess)
        .catch(onMIDIFailure);
} else {
    console.log("Web MIDI API is not supported in this browser.");
    // Handle the situation gracefully, e.g., show a notification to the user
}

export function onMIDISuccess(midiAccess) {
    console.log("MIDI ready!");
    midiHost= midiAccess;  // store in the global
    // Tone.Transport.start()
    console.log(getMidiIO())
    // initializeCodeBox();
    //setupClock();

    eval('globalThis.setMidiInput1 = setMidiInput;');
    refresh()
}

export function onMIDIFailure(msg) {
    console.error(`Failed to get MIDI access - ${msg}`);
}

export function setMidiInput(inputID) {
    //in case only one id is inputted, turn into array
    if (!Array.isArray(inputID)) inputID = [inputID];

    //reset inputs
    midiHost.inputs.forEach(function (key, val) { key.onmidimessage = null; })

    for (var id of inputID) {
        if (id in midi_input_ids & midiHost.inputs.get(midi_input_ids[id]) != null) {
            midiHost.inputs.get(midi_input_ids[id]).onmidimessage = handleMidiInput;
            console.log("MIDI input set to: " + midi_input_names[id]);
        } else { console.warn('Invalid input ID'); }
    }
}

export function setMidiOutput(outputID) {
    if (Array.isArray(outputID)) {
        console.warn('Can only handle one MIDI output. Please enter one ID.')
    }
    if (outputID in midi_output_ids & midiHost.outputs.get(midi_output_ids[outputID]) != null) {
        outputMidiID = midi_output_ids[outputID];
        console.log("MIDI output set to: " + midi_output_names[outputID]);
                // Set the MIDI output in MidiHandler
        midiHandlerInstance.setOutput(midiHost.outputs.get(outputMidiID));
    } else { console.warn('Invalid output ID'); }
}

export function refresh() {
    const inputList = Array.from(midiHost.inputs.values());
    const outputList = Array.from(midiHost.outputs.values());

    inputList.forEach((input, index) => {
        // Filter out DAW ports right at the source
        if (input.name.toLowerCase().includes('daw')) return;

        if (!deviceRegistry.has(input.name)) {
            // Match output by the exact same position in the list
            const output = outputList[index];
            
            console.log(`Matching ${input.name} to output index ${index}`);

            deviceRegistry.set(
                input.name, 
                new MidiPort(input.name, input, output)
            );
        }
    });
}

/****** load webMIDI API ******/
class MidiHandler {
    constructor() {
        this.noteOnHandler = (note, velocity=127, channel=1) => {
            console.log('Default Note On Handler:', note, velocity);
            console.log(`Define your own note on handler like this:\nsetNoteOnHandler(( note, vel, (optional:channel) ) => { <your code here> }) `)
        };
        this.noteOffHandler = (note, velocity=0, channel=1) => {
            console.log('Default Note Off Handler:', note, velocity);
            console.log(`Define your own note off handler like this:\nsetNoteOffHandler(( note, vel, (optional:channel) ) => { <your code here> }) `)
        };
        this.CCHandler = (controller, value, channel=1) => {
            console.log('Default CC Handler:', controller, value);
            console.log(`Define your own CC handler like this:\nsetCCHandler(( cc, value, (optionaL:channel) ) => { <your code here> }) `)
        };
        this.midiClockHandler = (message) => {
            // Default handler does nothing - will be replaced by MidiClockManager
            console.log('MIDI Clock message received', message.data[0]);
        };

        this.midiOutput = null; // Reference to the active MIDI output
    }

    // Set the MIDI output port
    setOutput(output) {
        this.midiOutput = output;
    }

    // Send Note On message
    sendNoteOn(note, velocity = 127, channel = 1) {
        console.log(note, velocity, channel)
        if (this.midiOutput) {
            const status = 0x90 | (channel - 1); // Note On status byte
            this.midiOutput.send([status, note, velocity]);
        } else {
            console.warn('No MIDI output is set.');
        }
    }

    // Send Note Off message
    sendNoteOff(note, velocity = 0, channel = 1) {
        console.log(note, velocity, channel)
        if (this.midiOutput) {
            const status = 0x80 | (channel - 1); // Note Off status byte
            this.midiOutput.send([status, note, velocity]);
        } else {
            console.warn('No MIDI output is set.');
        }
    }

    // Send Control Change (CC) message
    sendCC(controller, value, channel = 1) {
        if (this.midiOutput) {
            const status = 0xB0 | (channel - 1); // Control Change status byte
            this.midiOutput.send([status, controller, value]);
        } else {
            console.warn('No MIDI output is set.');
        }
    }

    send(status, data1, data2) {
        if (this.midiOutput) {
            this.midiOutput.send([status, data1, data2]);
        } else {
            console.warn('No MIDI output is set.');
        }
    }

    sendSysex(data) {
        if (this.midiOutput) {
            // Validation: Ensure the message is wrapped in SysEx markers
            if (data[0] !== 0xF0 || data[data.length - 1] !== 0xF7) {
                console.error('Invalid SysEx: Must start with 0xF0 and end with 0xF7');
                return;
            }

            // Web MIDI accepts both standard Arrays and Uint8Arrays
            this.midiOutput.send(data);
        } else {
            console.warn('No MIDI output is set.');
        }
    }

    handleNoteOn(note, velocity, channel) {
        this.noteOnHandler(note, velocity, channel);
    }
    handleNoteOff(note, velocity, channel) {
        this.noteOffHandler(note, velocity, channel);
    }
    handleCC(controller, value, channel) {
        this.CCHandler(controller, value, channel);
    }
    handleMidiClock(message) {
        this.midiClockHandler(message);
    }

    setNoteOnHandler(func) {
        this.noteOnHandler = func;
    }
    setNoteOffHandler(func) {
        this.noteOffHandler = func;
    }
    setCCHandler(func) {
        this.CCHandler = func;
    }
    setMidiClockHandler(func) {
        this.midiClockHandler = func;
    }
}
export const midiHandlerInstance = new MidiHandler();

export var midi_input_ids = {};
export var midi_output_ids = {};
export var midi_input_names = {};
export var midi_output_names = {};

export function getMidiIO() {
    var midiInputs = 'MIDI Inputs:\n';
    var midiOutputs = 'MIDI Outputs:\n';
    var inputID = null;
    var outputID = null;

    var num = 1;
    for (var output of midiHost.outputs) {
        midiOutputs += num + ': ' + output[1].name + '\n'; //+ \', ID: \'' + output[1].id + '\'\n';
        outputID = output[1].id;
        midi_output_ids[num] = outputID;
        midi_output_names[num] = output[1].name;
        num += 1;
    }

    num = 1;
    for (var input of midiHost.inputs) {
        midiInputs += num + ': ' + input[1].name + '\n'; // + \', ID: \'' + input[1].id + '\'\n';
        inputID = input[1].id;
        midi_input_ids[num] = inputID;
        midi_input_names[num] = input[1].name;
        num += 1;
    }
    return midiInputs + midiOutputs
}

export function handleMidiInput(message) {
    // Check for MIDI clock messages (status byte >= 248)
    if (message.data[0] >= 248) {
        // Special case for System Real-Time Messages (clock, start, stop, etc.)
        midiHandlerInstance.handleMidiClock(message);
        return;
    }
    
    // Handle normal MIDI messages
    let channel = (message.data[0] & 15) + 1
    
    if (message.data[1] != null) {
        let status = message.data[0]
        //console.log('midi', status, message.data[1], message.data[2])
        if (status >= 128 && status <= 159) {
            let note = message.data[1]
            let velocity = message.data[2]
            //note off msg
            if (status >= 128 && status <= 143 || velocity < 1) {
                midiHandlerInstance.handleNoteOff(note, velocity, channel)
            }
            //note on msg
            else {
                midiHandlerInstance.handleNoteOn(note, velocity, channel)
            }
        } else if (status >= 176 && status <= 191) {
            let cc = message.data[1]
            let value = message.data[2]
            midiHandlerInstance.handleCC(cc, value, channel)
        }
    }
}

export function device(name) {
    // 1. Get all keys (device names)
    debugRegistry();
    const key = Array.from(deviceRegistry.keys())
      // 2. Filter out anything that contains "daw" (case insensitive)
      .filter(k => !k.toLowerCase().includes('daw'))
      // 3. Find the specific device you requested
      .find(k => k.toLowerCase().includes(name.toLowerCase()));
    
    // 4. Return the instance or null
    const device = deviceRegistry.get(key) || null;

    console.group(name + " Connected")
    console.log(device.input.name)
    console.log(device.output.name)
    console.groupEnd()
    return device
}

const debugRegistry = () => {
  const tableData = [];

  deviceRegistry.forEach((port, key) => {
    tableData.push({
      "Registry Key": key,
      "Input Hardware": port.input?.name || "None",
      "Output Hardware": port.output?.name || "None",
      "Status": port.input?.state || "Unknown"
    });
  });

  console.log("%c--- MIDI DEVICE REGISTRY ---", "color: #00d4ff; font-weight: bold; font-size: 12px;");
  console.table(tableData);
};

/**
 * Manually pairs an input and output by their index positions.
 * @param {string} friendlyName - The key to use in the registry.
 * @param {number} inIdx - The index of the input device.
 * @param {number} outIdx - The index of the output device.
 */
export function customDevice(inIdx, outIdx) {
    // 1. Convert live MapIterators to Arrays to access by index
    const inputs = Array.from(midiHost.inputs.values());
    const outputs = Array.from(midiHost.outputs.values());

    // 2. Grab the specific hardware ports
    const inputPort = inputs[inIdx-1];
    const outputPort = outputs[outIdx-1];

    // 3. Validation log
    if (!inputPort && !outputPort) {
        console.error(`Custom Device Error: No ports found at indices In:${inIdx}, Out:${outIdx}`);
        return null;
    }

    console.log(`%c Custom Pairing:`, 'background: #444; color: #ff9900');
    console.log(` -> Input: ${inputPort?.name || 'NONE'}`);
    console.log(` -> Output: ${outputPort?.name || 'NONE'}`);

    // 4. Create and store the class instance
    const deviceInstance = new MidiPort(inputPort, outputPort);
    deviceRegistry.set('custom', deviceInstance);

    return deviceInstance;
}