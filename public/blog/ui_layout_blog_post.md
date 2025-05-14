# Automatically Building UIs for Synth Parameters

One of the features I find most helpful — and most forgettable — is my system for generating a full GUI from just a list of parameters and a layout file. This has saved me hours of dragging sliders around by hand.

Here’s a breakdown of how it works, and how to adapt it for new synths.

---

## Defining Parameters

Each synth has a parameter definition file that declares:

- What each parameter is called
- What it controls
- How it should be scaled
- How to apply the value to the synth

For example, in `twinkleParams.js`:

```js
{
  name: 'cutoff', type: 'vcf',
  min: 20, max: 10000, curve: 2,
  callback: function(x) {
    synth.cutoffSig.value = x;
  }
}
```

Every entry follows this format, and they’re passed into the synth like this:

```js
this.paramDefinitions = paramDefinitions(this)
this.param = this.generateParameters(this.paramDefinitions)
this.createAccessors(this, this.param)
```

---

## Creating a Layout File

Layout files are JSON files that map parameter groups (`vco`, `vcf`, `env`, `lfo`, etc.) to positions and styles on the canvas.

Here’s a simplified layout block for a `vco` section:

```json
"vco": {
  "color": [200, 50, 0],
  "boundingBox": { "x": 10, "y": 10, "width": 50, "height": 40 },
  "offsets": { "x": 12, "y": 30 },
  "groupA": ["vco_mix", "detune", "shape1", "shape2"],
  "controlTypeA": "knob",
  "sizeA": 0.75
}
```

Each section defines:
- Visual styling (`color`)
- Screen position (`boundingBox`)
- Control layout rules (`groupA`, `controlTypeA`, `sizeA`)

These groups correspond directly to the `type` field in your parameter definitions.

---

## Using the Layout in Your Synth

To use a layout file, just import it and assign it to `this.layout` in your synth constructor.

```js
import daisyLayout from './layouts/daisyLayout.json';

export class Daisy extends MonophonicTemplate {
  constructor() {
    super();
    this.presets = DaisiesPresets;
    this.name = 'Daisy';
    this.layout = daisyLayout;
    
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    this.createAccessors(this, this.param);
  }
}
```

That’s it — the GUI will be automatically generated using the specified layout and parameter definitions.

---

## Making a New Layout

When building a new synth, just:

1. Define your parameters in `mySynthParams.js`
2. Create a `mySynthLayout.json` file with matching `type` blocks
3. Assign the layout in your synth file with:

```js
import myLayout from './layouts/mySynthLayout.json';
this.layout = myLayout;
```

Done.

This structure keeps your synth code clean, modular, and fast to iterate on. Adding a new control is as easy as updating a parameter list and layout block.

Let me know if you want to dive deeper into dynamic layouts, live editing, or visual design tweaks.
