# Creating an Audio Effect

This guide covers the basics of building a new audio effect using for the Creativitas site. Effects are defined using a consistent structure made up of parameter definitions, presets, a layout file, and a constructor that defines the signal path and routing.

If you're creating a new effect, the easiest approach is to **copy an existing effect file** and simply replace the **audio object definitions and routing** in the constructor. Most of the system logic — parameter handling, GUI layout, and presets — stays the same and doesn't need to be touched.

---

## 1. Import Statements

At the top of your effect file, you'll typically include:

```js
import * as Tone from 'tone';
import { EffectTemplate } from './EffectTemplate';
import { Parameter } from './ParameterModule.js';
import ChorusPresets from './synthPresets/ChorusPresets.json';
import layout from './layouts/EffectLayout.json';
import { paramDefinitions } from './params/ChorusParams.js';
```

You should change:
- `ChorusPresets` → your effect's preset file
- `paramDefinitions` import path → your effect's parameter file
- `layout` → usually remains `EffectLayout.json`, which is shared

---

## 2. Parameter File

Each effect defines adjustable parameters in a file like `ChorusParams.js`. These describe:
- Parameter name
- Type (`"input"`,`"param"`, `"output"`, `"none"`)
  - The type will determine where in the GUI the objects are located.
- Min, max, and default values
  - there are other possible values too, which are covered in the params system overview
- A callback for applying the value to the audio engine

**Example:**

```js
{
  name: "level",
  type: "output",
  min: 0,
  max: 1,
  default: 0.3,
  callback: (value) => synth.ouput.gain.rampTo(value,.01)
}
```

---

## 3. Preset File

Presets are stored in a `.json` file such as `ChorusPresets.json`, with an array of named presets.

**Example:**

```json
{
  "default": {
    "delayTime": 0.3,
    "feedback": 0.5
  },
  "Wide Echo":{
    "delayTime": 0.6,
    "feedback": 0.7
  }
}
```

Always include a `"default"` preset.

---

## 4. Layout File

Most effects use a shared layout file: `EffectLayout.json`. This defines GUI positioning, control types, and grouping. You usually don’t need to modify this unless you're building a radically different effect UI.

---

## 5. Constructor

The constructor is where you define:
- Audio objects (Tone.js nodes)
- Signal routing
- Background color

You do **not** need to change the parameter handling boilerplate. Here’s the typical constructor format:

```js
constructor(gui = null) {
  super();
  this.gui = gui;
  this.presets = ReverbPresets;
  this.name = "Reverb";
  this.layout = layout;
  this.backgroundColor = [0, 0, 50];

  // Effect-specific variables
  this.curDelayTime = 0.1;
  this.curSpread = 0.1;

  // Audio object definitions
  this.input = new Tone.Gain(1);
  this.output = new Tone.Gain(1);
  // Connect audio path
  this.input.connect(this.output);

  // Parameter setup — DON’T MODIFY
  this.paramDefinitions = paramDefinitions(this);
  this.param = this.generateParameters(this.paramDefinitions);
  this.createAccessors(this, this.param);
  this.autocompleteList = this.paramDefinitions.map(def => def.name);
  this.presetList = Object.keys(this.presets);
  setTimeout(() => {
    this.loadPreset('default');
  }, 500);
}
```

---

## 6. Custom Setters (When Needed)

Only include custom methods when your parameter requires logic beyond a direct property assignment. For example:

```js
this.setDelayTime = function(value) {
  this.curDelayTime = value
  this.delayL.delayTime.rampTo(value * (1 - this.curSpread), 0.01);
  this.delayR.delayTime.rampTo(value * (1 + this.curSpread), 0.01);
}
```

This lets the `delayTime` and `this.curSpread` parameters work together to create stereo spread.

---

## Summary

To create a new effect:

1. Copy an existing effect file.
2. Replace the audio nodes and routing in the constructor.
3. Create a parameter file with callbacks.
4. Create a `.json` preset file (include a `"default"`).
5. Use the standard `EffectLayout.json` layout.
6. Only define custom parameter setters when needed.