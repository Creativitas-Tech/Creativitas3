# Preset Management Documentation

This guide covers how to create, save, manage, and share presets for the synthesizers
NOTE: this probably will only work for monophonic instances, so:
`s = new Twinkle()`
not
`s = new Polyphony(Twinkle)`

## Quick Start
To begin working with presets, initialize your synth and the GUI:

```javascript
let s = new Twinkle();
let output = new Tone.Multiply(.1).toDestination();
s.connect(output);

// Initialize the GUI to tweak sounds visually
s.initGui();
```

1. Exploring Existing Presets
Before creating new sounds, you can browse and load the built-in library.

List all available presets: `s.listPresets();`

Load a specific preset: 
`s.loadPreset("bowedString");`

2. Creating & Saving Presets
Presets are stored in a JSON file. You can add entries to this file, and also download it.

Tweak the Sound: Use the GUI or code to find a sound you like.

Save to Session: Run the savePreset method.

Note: Always provide a descriptive name to keep your library organized.

`s.savePreset('underwater_v2');`

3. Exporting & Importing (JSON)
Because local changes are lost when the browser refreshes, use the Download/Upload methods to persist your work.

Download (Export)
This triggers a browser download of a .json file containing all presets currently in s.presets.

`s.downloadPresets();`

Upload (Import)
This opens a file picker on your computer. Selecting a valid JSON file will update the synth's internal preset list.

`s.uploadPresets();`

Best Practices & Limitations
Monophony Recommended: For the most stable results when tweaking and saving, use a single instance of the synth rather than a polyphonic setup.

Permanent Integration: Once you have a collection of presets you love, the JSON data can be hardcoded into the creativitas source code to make them a permanent part of the library.

Sequencing: You can test your presets in real-time while a sequence is running:


```
s.sequence('0 7 4 7');
API Reference Summary
Method	Description
s.initGui()	Opens the visual control panel.
s.listPresets()	Logs all loaded preset names to the console.
s.loadPreset(name)	Updates synth parameters to match the named preset.
s.savePreset(name)	Adds the current synth state to the local preset list.
s.downloadPresets()	Exports all presets to a .json file.
s.uploadPresets()	Imports presets from a .json file on your computer.
```