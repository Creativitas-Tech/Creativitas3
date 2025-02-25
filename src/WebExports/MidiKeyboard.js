/*
This class mimics the midi keyboard react component.
It is a hassle to find a way to programmatically convert the component to usable html and js,
so here is an alternative
*/
class MidiKeyboard {
    constructor() {
        this.midiOn = false;
        this.notesOn = new Set();
        this.activeKeys = {};
        this.octave = 4;
        this.keyToNote = {
            90: { "midi": 60, "pitch": "C" },     // Z
            83: { "midi": 61, "pitch": "C#/Db" }, // S
            88: { "midi": 62, "pitch": "D" },     // X
            68: { "midi": 63, "pitch": "D#/Eb" }, // D
            67: { "midi": 64, "pitch": "E" },     // C
            86: { "midi": 65, "pitch": "F" },     // V
            71: { "midi": 66, "pitch": "F#/Gb" }, // G
            66: { "midi": 67, "pitch": "G" },     // B
            72: { "midi": 68, "pitch": "G#/Ab" }, // H
            78: { "midi": 69, "pitch": "A" },     // N
            74: { "midi": 70, "pitch": "A#/Bb" }, // J
            77: { "midi": 71, "pitch": "B" },     // M
            188: { "midi": 72, "pitch": "C" },    // ,
            76: { "midi": 73, "pitch": "C#/Db" }, // L
            190: { "midi": 74, "pitch": "D" },    // .
            186: { "midi": 75, "pitch": "D#/Eb" }, // ;
            191: { "midi": 76, "pitch": "E" },    // /

            // second octave
            81: { "midi": 72, "pitch": "C" },     // Q
            50: { "midi": 73, "pitch": "C#/Db" }, // 2
            87: { "midi": 74, "pitch": "D" },     // W
            51: { "midi": 75, "pitch": "D#/Eb" }, // 3
            69: { "midi": 76, "pitch": "E" },     // E
            82: { "midi": 77, "pitch": "F" },     // R
            53: { "midi": 78, "pitch": "F#/Gb" }, // 5
            84: { "midi": 79, "pitch": "G" },     // T
            54: { "midi": 80, "pitch": "G#/Ab" }, // 6
            89: { "midi": 81, "pitch": "A" },     // Y
            55: { "midi": 82, "pitch": "A#/Bb" }, // 7
            85: { "midi": 83, "pitch": "B" },     // U
            73: { "midi": 84, "pitch": "C" },     // I
            57: { "midi": 85, "pitch": "C#/Db" }, // 9
            79: { "midi": 86, "pitch": "D" },     // O
            48: { "midi": 87, "pitch": "D#/Eb" }, // 0
            80: { "midi": 88, "pitch": "E" }      // P
        };

        this.init();
    }

    init() {
        // Add event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // Get DOM elements
        // WARNING: These are assumed to be defined
        this.keyboardButton = document.getElementById('keyboard-button');
        this.keyboardIcon = document.getElementById('keyboard-icon');
        this.notesDisplay = document.getElementById('notes-display');

        // Add click handler
        this.keyboardButton.addEventListener('click', this.toggleMidi.bind(this));
    }

    handleKeyDown(event) {
        if (this.midiOn) {
            const keyCode = event.keyCode;
            if (!this.activeKeys[keyCode]) {
                this.activeKeys[keyCode] = true;
                try {
                    let note = this.keyToNote[keyCode];
                    let midiNote = note["midi"] + (this.octave - 4) * 12;
                    if (midiNote <= 127) {
                        this.notesOn.add(midiNote);
                        this.updateNotesDisplay();
                        if (window.midiHandlerInstance) {
                            window.midiHandlerInstance.handleNoteOn(midiNote, 100);
                        }
                    }
                } catch (error) {
                    if (keyCode === 37) {
                        this.decreaseOctave();
                    } else if (keyCode === 39) {
                        this.increaseOctave();
                    }
                }
            }
        }
    }

    handleKeyUp(event) {
        if (this.midiOn) {
            const keyCode = event.keyCode;
            this.activeKeys[keyCode] = false;
            try {
                let note = this.keyToNote[keyCode];
                let midiNote = note["midi"] + (this.octave - 4) * 12;
                if (midiNote <= 127) {
                    this.notesOn.delete(midiNote);
                    this.updateNotesDisplay();
                    if (window.midiHandlerInstance) {
                        window.midiHandlerInstance.handleNoteOff(midiNote, 0);
                    }
                }
            } catch (error) {
                // Ignore errors for non-mapped keys
            }
        }
    }

    toggleMidi() {
        this.midiOn = !this.midiOn;
        this.keyboardIcon.className = `icon ${this.midiOn ? 'active' : 'inactive'}`;
    }

    increaseOctave() {
        if (this.octave < 7) {
            this.octave++;
        }
    }

    decreaseOctave() {
        if (this.octave > 1) {
            this.octave--;
        }
    }

    updateNotesDisplay() {
        this.notesDisplay.innerHTML = Array.from(this.notesOn)
            .map(note => `<div class="note-pill">${note}</div>`)
            .join('');
    }
}

// Initialize the keyboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.midiKeyboard = new MidiKeyboard();
});
