// CONSTANTS ===================================================================
const allowedOctaves = 2;
const scale = [0, 2, 4, 5, 7, 9, 11]; // Major Scale
const baseNote = 60; // C4
const COLORS = {
    ACTIVE_SEQUENCE: [255, 85, 0],    // Orange for active sequence
    INACTIVE_SEQUENCE: [51, 153, 255], // Blue for inactive sequence
    SELECTED_ACTIVE_NOTE: [0, 255, 0],       // Green for selected active note
    SELECTED_REST_NOTE: [0, 120, 0],       // Green for selected rest note
    REST_NOTE: [100, 100, 100]        // Gray for rest notes
};
const keyboardMapping = [
    ['1', '2', '3', '4', '5', '6', '7', '8'],         // First sequence
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i'],         // Second sequence
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'],         // Third sequence
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',']          // Fourth sequence
];

const seqHeight = 10;
const padding = 10;

// HELPERS =====================================================================
const midiToDegree = (midi) => {
    const semitone = (midi - baseNote) % 12;
    let degree = scale.indexOf(semitone);
    if (degree === -1) degree = 0; // fallback
    const octaveShift = Math.floor((midi - baseNote) / 12);
    return (degree + octaveShift * scale.length) / (scale.length);
};

const noteObjectToString = (noteObj, transpose = 0) => {
    if (!noteObj.isOn) {
        return '.';  // Return rest if note is off
    }
    return Tone.Frequency(noteObj.value + transpose, "midi").toNote();
};

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// KEYBOARD METHODS ============================================================
function adjustNote(key) {
    const s = selectedNote.sequence;
    const i = selectedNote.step;
    const noteObj = sequenceValues[s][i];

    // Calculate current position in the scale
    const currentMidi = noteObj.value;
    const semitone = (currentMidi - baseNote) % 12;
    let octave = Math.floor((currentMidi - baseNote) / 12);

    // Find current index in the scale
    let scaleIndex = scale.indexOf(semitone);
    if (scaleIndex === -1) {
        // If not in scale, find the closest note in the scale
        for (let j = 0; j < scale.length; j++) {
            if (scale[j] > semitone) {
                scaleIndex = j - 1;
                break;
            }
        }
        if (scaleIndex === -1) scaleIndex = scale.length - 1;
    }

    // Adjust the note based on arrow key
    switch (key) {
        case "ArrowUp":
            // Move to next note in scale
            if (scaleIndex < scale.length - 1) {
                // Move to next note in same octave
                scaleIndex++;
            } else {
                // Move to first note in next octave
                scaleIndex = 0;
                octave++;
            }
            break;

        case "ArrowDown":
            // Move to previous note in scale
            if (scaleIndex > 0) {
                // Move to previous note in same octave
                scaleIndex--;
            } else {
                // Move to last note in previous octave
                scaleIndex = scale.length - 1;
                octave--;
            }
            break;

        default:
            return; // Exit if not an arrow key we handle
    }

    // Calculate new MIDI value
    const newMidi = baseNote + (octave * 12) + scale[scaleIndex];

    // Ensure we stay within allowed octave range
    if (octave < 0 || (octave >= allowedOctaves && scaleIndex != 0)) {
        return; // Don't allow going outside the allowed range
    }

    // Update the knob value
    seqKnobs[s][i].set(midiToDegree(newMidi));
}

function handleKeyboardInput(key, state) {
    // Only process key down events
    if (state !== 'down') {
        return;
    }

    switch (key) {
        case 'Space':
        case ' ':
            toggleRest();
            break;
        case 'ArrowUp':
        case 'ArrowDown':
            adjustNote(key);
            break;
        case 'Enter':
            seqRadioGroup.set(`Seq ${selectedNote.sequence + 1}`)
            break;
        case '-':
            transposeNegButtons[selectedNote.sequence].set(1) // set to true
            transposeNegButtons[selectedNote.sequence].set(0) // set to false
            break;
        case '=':
        case '+':
            transposePosButtons[selectedNote.sequence].set(1) // set to true
            transposePosButtons[selectedNote.sequence].set(0) // set to false
    }
    
    // Convert key to lowercase for consistent mapping
    const lowerKey = typeof key === 'string' ? key.toLowerCase() : key;

    // Check if the key is in our mapping
    for (let s = 0; s < keyboardMapping.length; s++) {
        const rowIndex = keyboardMapping[s].indexOf(lowerKey);
        if (rowIndex !== -1) {
            selectedNote.sequence = s;
            selectedNote.step = rowIndex;
            updateNotesVisual();
            return;
        }
    }
}

function toggleRest() {
    const seq = selectedNote.sequence;
    const step = selectedNote.step;
    const noteObj = sequenceValues[seq][step];

    noteObj.isOn = !noteObj.isOn;
    updateNotesVisual();
    activateSequence();
}

// GENERAL SETUP ==============================================================
initCollab()
window.setp5Theme("dark")
const gui = new p5(sketch, Canvas);
const output = new Tone.Multiply(0.1).toDestination();
const synth = new Twinkle(gui);
synth.connect(output);
setAsciiHandler(handleKeyboardInput);
enableAsciiInput();
enableAsciiRepeat();

// STATE ======================================================================
const sequenceValues = [
    [
        { value: 60, isOn: true },
        { value: 62, isOn: true },
        { value: 64, isOn: true },
        { value: 65, isOn: true },
        { value: 67, isOn: true },
        { value: 69, isOn: true },
        { value: 71, isOn: true },
        { value: 72, isOn: true }
    ],
    [
        { value: 60, isOn: true },
        { value: 64, isOn: true },
        { value: 62, isOn: true },
        { value: 67, isOn: true },
        { value: 65, isOn: true },
        { value: 71, isOn: true },
        { value: 69, isOn: true },
        { value: 72, isOn: true }
    ],
    [
        { value: 60, isOn: true },
        { value: 69, isOn: true },
        { value: 71, isOn: true },
        { value: 72, isOn: true },
        { value: 62, isOn: true },
        { value: 64, isOn: true },
        { value: 65, isOn: true },
        { value: 67, isOn: true }
    ],
    [
        { value: 67, isOn: true },
        { value: 69, isOn: true },
        { value: 71, isOn: true },
        { value: 72, isOn: true },
        { value: 60, isOn: true },
        { value: 62, isOn: true },
        { value: 64, isOn: true },
        { value: 65, isOn: true }
    ]
]

let seqKnobs = [];
let seqButtons = [];
let transposes = [0, 0, 0, 0];
let transposeLabels = [];
let transposeNegButtons = [];
let transposePosButtons = [];
let activeSequence = 0;
let selectedNote = {
    sequence: 0,
    step: 0
};


// STATE METHODS ===============================================================
function activateSequence() {
    // Create all sequences
    for (let s = 0; s < 4; s++) {
        if (s == activeSequence) {
            synth.sequence(sequenceValues[s]
                .map(noteObj => noteObjectToString(noteObj, transposes[s])),
                '8n',
                s);
            continue;
        }
        synth.sequence(".", '8n', s);
    }
}

function updateControlColors() {
    for (let s = 0; s < 4; s++) {
        const color = s === activeSequence ? COLORS.ACTIVE_SEQUENCE : COLORS.INACTIVE_SEQUENCE;

        if (transposeLabels[s]) {
            transposeLabels[s].textColor = color;
        }
    }

    updateNotesVisual();
}

function setActiveSequence(num) {
    if (num >= 0 && num < 4) {
        activeSequence = num;
        updateControlColors();
        activateSequence();
        return true;
    }
    return false;
}

function updateNotesVisual() {
    // Update all knob colors based on their state
    for (let s = 0; s < 4; s++) {
        for (let i = 0; i < 8; i++) {
            if (seqKnobs[s] && seqKnobs[s][i]) {
                // Check if this is the selected note
                if (s === selectedNote.sequence && i === selectedNote.step) {
                    seqKnobs[s][i].accentColor = sequenceValues[s][i].isOn ? COLORS.SELECTED_ACTIVE_NOTE : COLORS.SELECTED_REST_NOTE;
                }
                // Check if this is a rest note (isOn = false)
                else if (!sequenceValues[s][i].isOn) {
                    seqKnobs[s][i].accentColor = COLORS.REST_NOTE;
                }
                // Otherwise, color based on active sequence
                else {
                    seqKnobs[s][i].accentColor = s === activeSequence ? COLORS.ACTIVE_SEQUENCE : COLORS.INACTIVE_SEQUENCE;
                }
            }
        }
    }
}

// GUI ELEMENT SETUP ===========================================================
for (let s = 0; s < 4; s++) {
    const yPos = 20 + (s * (seqHeight + padding));
    seqKnobs[s] = [];
    seqButtons[s] = [];
    transposePosButtons[s] = [];

    transposeLabels[s] = gui.Text({
        x: 63.5,
        y: yPos,
        size: 1.2,
        label: `${transposes[s] > 0 ? '+' : ''}${transposes[s]}`,
        textColor: s === activeSequence ? [255, 85, 0] : [51, 153, 255]
    });

    transposeNegButtons[s] = gui.Button({
        x: 4 + (8 * 7),
        y: yPos,
        size: 0.4,
        showValue: true,
        label: "Note -",
        callback: (val) => {
            if (!val) return;
            transposes[s] = clamp(transposes[s] - 1, -36, 36); // Limit 3 oct down/up
            // Update the transpose label
            if (transposeLabels[s]) {
                transposeLabels[s].label = `${transposes[s] > 0 ? '+' : ''}${transposes[s]}`;
            }
            activateSequence();
        }
    });

    transposePosButtons[s] = gui.Button({
        x: 4 + (9 * 7),
        y: yPos,
        size: 0.4,
        showValue: true,
        label: "Note +",
        callback: (val) => {
            if (!val) return;
            transposes[s] = clamp(transposes[s] + 1, -36, 36); // Limit 3 oct down/up
            // Update the transpose label
            if (transposeLabels[s]) {
                transposeLabels[s].label = `${transposes[s] > 0 ? '+' : ''}${transposes[s]}`;
            }
            activateSequence();
        }
    });

    // Create 8 knobs for each sequence
    for (let i = 0; i < 8; i++) {
        seqKnobs[s][i] = gui.Knob({
            x: 4 + (i * 7),
            y: yPos,
            size: 0.5,
            textSize: 1.5,
            min: 1e-9, // a little less than zero, min here tests for equality, need to allow values of zero
            max: allowedOctaves,
            value: midiToDegree(sequenceValues[s][i].value),
            showLabel: false,
            showValue: false,
            accentColor: s === activeSequence ? [255, 85, 0] : [51, 153, 255],
            link: `seq${s}_step${i}_knob`,
            callback: (val) => {
                val = Math.max(val, 0);
                let totalDegrees = scale.length;
                let raw = val * totalDegrees;
                let degree = Math.floor(raw) % totalDegrees;
                let octaveShift = Math.floor(raw / totalDegrees);
                let midiValNoTranspose = baseNote + octaveShift * 12 + scale[degree];
                sequenceValues[s][i].value = midiValNoTranspose;
                activateSequence();
            }
        });
    }
}

// EXTRA BUTTONS ===============================================================
const seqRadioGroup = gui.RadioButton({
    x: 85,
    y: 65,
    textColor: [255, 255, 255],
    textSize: 1.5,
    textFont: "Helvetica",
    radioOptions: ['Seq 1', 'Seq 2', 'Seq 3', 'Seq 4'],
    value: 'Seq 1',
    linkName: 'activeSequenceRadio',
    label: ' ',
    callback: (val) => {
        let seqNum = parseInt(val.split(" ")[1]) - 1;
        setActiveSequence(seqNum);
    }
});


let bright = gui.Knob({
    size: 0.75,
    textSize: 1.5,
    value: 0.5,
    x: 80,
    y: 18,
    label: 'brightness',
    callback: x => {
        synth.cutoff = x * 5000 + 100,
            synth.Q = 10 - x * 10,
            synth.envDepth = x * 3000
    }
})

let envelope = gui.Knob({
    size: 0.75,
    textSize: 1.5,
    value: 0.5,
    x: 90,
    y: 18,
    label: 'env',
    callback: x => {
        synth.attack = x < 0.75 ? .005 : (x - .745),
            synth.sustain = x < 0.5 ? 0 : (x - .495),
            synth.decay = x < 0.5 ? x / 2 : .25 + (x - .5),
            synth.release = x < 0.5 ? x / 2 : .25 + (x - .5) * 4
    }
})

// HACK ========================================================================
// I don't know why it doesn't apply unless I offset by 500 ms
// oh well
setInterval(() => {
    bright.set(bright.value);
    envelope.set(envelope.value);
}, 500);
