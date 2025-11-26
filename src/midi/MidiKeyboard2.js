// MidiKeyboard2.js
function MidiKeyboard2(midiHandler) {

    let activeKeys = {};
    let octave = 4;
    let midiOn = false;
    let notesOn = new Set();

    const keyToNote = {
        32: { midi: '.' },
        90: { midi: 60 }, 83: { midi: 61 }, 88: { midi: 62 },
        68: { midi: 63 }, 67: { midi: 64 }, 86: { midi: 65 },
        71: { midi: 66 }, 66: { midi: 67 }, 72: { midi: 68 },
        78: { midi: 69 }, 74: { midi: 70 }, 77: { midi: 71 },
        188: { midi: 72 }, 76: { midi: 73 }, 190: { midi: 74 },
        186: { midi: 75 }, 191: { midi: 76 },

        81: { midi: 72 }, 50: { midi: 73 }, 87: { midi: 74 },
        51: { midi: 75 }, 69: { midi: 76 }, 82: { midi: 77 },
        53: { midi: 78 }, 84: { midi: 79 }, 54: { midi: 80 },
        89: { midi: 81 }, 55: { midi: 82 }, 85: { midi: 83 },
        73: { midi: 84 }, 57: { midi: 85 }, 79: { midi: 86 },
        48: { midi: 87 }, 80: { midi: 88 }
    };

    function enable() {
        if (midiOn) return;
        midiOn = true;
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);
    }

    function disable() {
        if (!midiOn) return;
        midiOn = false;

        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("keyup", handleKeyUp);

        for (let note of notesOn) {
            midiHandler.handleNoteOff(note, 0);
        }
        notesOn.clear();
    }

    function toggle() {
        midiOn ? disable() : enable();
    }

    function handleKeyDown(event) {
        if (!midiOn) return;
        const keyCode = event.keyCode;

        if (activeKeys[keyCode]) return;
        activeKeys[keyCode] = true;

        if (keyCode === 37) return decreaseOctave();
        if (keyCode === 39) return increaseOctave();

        const map = keyToNote[keyCode];
        if (!map) return;
        if (map.midi === '.') {
            midiHandler.handleNoteOn('.', 100);
            return;
        }

        const midiNote = map.midi + (octave - 4) * 12;

        if (midiNote < 128) {
            notesOn.add(midiNote);
            midiHandler.handleNoteOn(midiNote, 100);
        }
    }

    function handleKeyUp(event) {
        if (!midiOn) return;
        const keyCode = event.keyCode;

        activeKeys[keyCode] = false;

        const map = keyToNote[keyCode];
        if (!map) return;
        if (map.midi === '.') {
            midiHandler.handleNoteOff('.', 100);
            return;
        }

        const midiNote = map.midi + (octave - 4) * 12;

        if (midiNote < 128) {
            notesOn.delete(midiNote);
            midiHandler.handleNoteOff(midiNote, 0);
        }
    }

    function increaseOctave() {
        if (octave < 7) octave++;
    }

    function decreaseOctave() {
        if (octave > 1) octave--;
    }

    return {
        enable,
        disable,
        toggle,
        get activeNotes() { return Array.from(notesOn); }
    };
}


// browser global
if (typeof window !== "undefined") {
    window.MidiKeyboard2 = MidiKeyboard2;
}

// node export
if (typeof module !== "undefined") {
    module.exports = MidiKeyboard2;
}