// Sequence Selector Example
// Features:
// - Four 8-step sequences with knobs & buttons (collabhub on all)
// - One radioButton to select which sequence triggers the synth
initCollab()
// Set up audio objects and connections
const gui = new p5(sketch, Canvas);
const output = new Tone.Multiply(0.1).toDestination();

// Create a synth to play the sequences
const synth = new Twinkle(gui);
synth.connect(output);
let bright = gui.Knob({
    size: 0.75,
    x: 75,
    y: 15,
    label: 'brightness',
    callback: x => {
        synth.cutoff = x * 5000 + 100,
            console.log(x)
    }
})

bright.callback = x => {
    synth.cutoff = x * 5000 + 100,
        synth.Q = 10 - x * 10,
        synth.envDepth = x * 3000
}

let envelope = gui.Knob({
    size: 0.75,
    x: 85,
    y: 15,
    label: 'env',
    callback: x => {
        synth.attack = x < 0.5 ? .005 : (x - .495),
            synth.sustain = x < 0.5 ? .0 : (x - .495),
            synth.decay = x < 0.5 ? x / 5 : .1 + (x - .5),
            synth.release = x < 0.5 ? x / 2 : .25 + (x - .5) * 4
    }
})


envelope.callback = x => {
    synth.attack = x < 0.75 ? .005 : (x - .745),
        synth.sustain = x < 0.5 ? 0 : (x - .495),
        synth.decay = x < 0.5 ? x / 2 : .25 + (x - .5),
        synth.release = x < 0.5 ? x / 2 : .25 + (x - .5) * 4
}

// Create 4 sequences, each with 8 steps
let sequenceValues = [
    ['C4', 'E4', 'G4', 'C5', 'E4', 'G4', 'C5', 'E5'],
    ['E4', 'G4', 'C5', 'E5', 'G4', 'C5', 'E5', 'G5'],
    ['G4', 'C5', 'E5', 'G5', 'C5', 'E5', 'G5', 'C6'],
    ['C5', 'E5', 'G5', 'C6', 'E5', 'G5', 'C6', 'E6'],
];


// Set the active sequence to 0
let activeSequence = 0;

let seq;
function setupSequences() {
    // Create all sequences
    for (let s = 0; s < 4; s++) {
        synth.sequence(sequenceValues[s].join(" "), '8n', s);
    }
}
// Create a function to handle sequence playback
function activateSequence() {
    // Create all sequences
    for (let s = 0; s < 4; s++) {
        if (s == activeSequence) {
            synth.sequence(sequenceValues[s].join(" "), '8n', s);
            continue;
        }
        for (let i = 0; i < 8; i++) {
            synth.seq[s].vals[i] = ".";
        }
    }
}

// Initial setup of sequences
setupSequences();
activateSequence();

// Update the colors of knobs and buttons based on active sequence
function updateControlColors() {
    for (let s = 0; s < 4; s++) {
        const color = s === activeSequence ? [255, 85, 0] : [51, 153, 255];

        for (let i = 0; i < 8; i++) {
            if (seqKnobs[s] && seqKnobs[s][i]) {
                seqKnobs[s][i].accentColor = color;
            }

            if (seqButtons[s] && seqButtons[s][i]) {
                seqButtons[s][i].accentColor = color;
            }
        }
    }
}

// Method to set which sequence is active for triggering the synth
function setActiveSequence(num) {
    if (num >= 0 && num < 4) {
        // Switch to new sequence
        activeSequence = num;
        console.log(`Sequence ${num + 1} is now active`);
        // Update the visual appearance
        updateControlColors();
        activateSequence();
        return true;
    }
    return false;
}

// Store references to GUI elements
let seqKnobs = [];
let seqButtons = [];

// Create sequence step controls
const seqHeight = 10;  // 10% of canvas height
const padding = 10;    // 2% of canvas height

// Create radio buttons to select active sequence
const seqRadioGroup = gui.RadioButton({
    x: 80,  // 5% from left
    y: 60,  // 5% from top
    radioOptions: ['Seq 1', 'Seq 2', 'Seq 3', 'Seq 4'],
    value: 'Seq 2', // Set initial value to match activeSequence (1)
    linkName: 'activeSequenceRadio',
    callback: (val) => {
        console.log('Radio button callback triggered with value:', val);
        // Handle both string values and numeric values (from CollabHub)
        console.log('Radio button changed to:', val);
        let seqNum;
        seqNum = parseInt(val.split(" ")[1]) - 1;
        console.log('Parsed sequence number:', seqNum);
        console.log(`Setting active sequence to ${seqNum + 1}`);
        setActiveSequence(seqNum);
    }
});

let prevVal;
let noteName;
let midiNote;
let initialNotes;
let initialNote;
// Create sequence step controls for each sequence
for (let s = 0; s < 4; s++) {
    const yPos = 20 + (s * (seqHeight + padding));  // Start at 20% from top
    seqKnobs[s] = [];
    seqButtons[s] = [];

    // Transform functions are already set in setupSequences()

    // Create 8 knobs for each sequence
    for (let i = 0; i < 8; i++) {
        // Extract the initial note value from the pattern
        initialNotes = sequenceValues[s];
        initialNote = Tone.Midi(initialNotes[i] || 'C4').toMidi();

        seqKnobs[s][i] = gui.Knob({
            x: 10 + (i * 7),  // Start at 10% from left, each 5% apart
            y: yPos,
            size: 0.5,  // 1% of canvas size
            min: 36,  // C2
            max: 84,  // C6
            value: initialNote,
            showLabel: false,
            showValue: true,
            accentColor: s === activeSequence ? [255, 85, 0] : [51, 153, 255],
            link: `seq${s}_step${i}_knob`,
            callback: (val) => {
                // Update the sequence value with the exact MIDI note value
                midiNote = Math.round(val);
                console.log(`Setting sequence ${s} step ${i} to MIDI note: ${midiNote}`);

                // Convert MIDI note to a note string that the sequencer expects
                // This ensures it's treated as a MIDI note, not a frequency
                noteName = Tone.Frequency(midiNote, 'midi').toNote();
                console.log(`Converted MIDI ${midiNote} to note name: ${noteName}`);
                synth.seq[s].vals[i] = noteName;
                sequenceValues[s][i] = noteName;
            }
        });
    }
}



// Start the transport
Tone.Transport.start()
console.log(activeSequence)



