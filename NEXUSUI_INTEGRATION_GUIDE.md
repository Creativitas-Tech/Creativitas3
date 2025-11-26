# NexusUI Integration - Complete Guide

## Overview
The Creativitas3 editor now supports **NexusUI wrapper classes** for creating GUI elements in user code. These are HTML-based UI elements (not p5.js canvas drawings).

## Available Wrapper Classes

All classes are available globally in user code via `window` object:

### 1. **Button** - Toggle/momentary buttons
```javascript
const btn = new Button(x, y, width, height)
btn.mode = 'toggle'  // or 'button' for momentary
btn.state = false    // true/false
btn.colorize('accent', '#AEC6CF')
btn.colorize('fill', '#303030')
btn.element.on('change', function(value) {
  console.log('Button:', value)
})
```

### 2. **Switch** (Toggle) - On/off switches
```javascript
const toggle = new Switch(x, y, width, height)
toggle.state = false
toggle.element.on('change', function(value) {
  console.log('Switch:', value)
})
```

### 3. **Dial** - Rotary knobs
```javascript
const dial = new Dial(x, y, width, height)
dial.min = 0
dial.max = 100
dial.value = 50
dial.colorize('accent', '#8200C8')
dial.mapTo(function(value) {
  console.log('Dial:', value)
})
```

### 4. **Slider** - Linear faders
```javascript
const slider = new Slider(x, y, width, height)
slider.min = 0
slider.max = 1
slider.value = 0.5
slider.mapTo(function(value) {
  console.log('Slider:', value)
})
```

### 5. **NumberBox** - Numeric input
```javascript
const numbox = new NumberBox(x, y, width, height)
numbox.min = 0
numbox.max = 127
numbox.value = 60
numbox.mapTo(function(value) {
  console.log('NumberBox:', value)
})
```

## Container System

All NexusUI elements are created inside the `#Canvas` container:
- Elements use **absolute positioning**
- Coordinates are in **pixels** (not p5 percentage units)
- Elements are **responsive** to window resize (via parentNexus.js)

## Positioning Guide

```javascript
// Grid-based layout example
const gridOrigin = { x: 200, y: 100 }
const gridSpacing = { x: 120, y: 80 }
const buttonSize = { width: 80, height: 40 }

// Create button at grid position [row, col]
const btn = new Button(
  gridOrigin.x + col * gridSpacing.x,
  gridOrigin.y + row * gridSpacing.y,
  buttonSize.width,
  buttonSize.height
)
```

## Adding Text Labels

Since there's no NexusUI Text element yet, use DOM elements:

```javascript
const label = document.createElement('div')
label.textContent = 'My Label'
label.style.cssText = `
  position: absolute;
  left: ${x}px;
  top: ${y}px;
  color: #8796EB;
  font-family: monospace;
  font-size: 12px;
  pointer-events: none;
  user-select: none;
`
document.getElementById('Canvas').appendChild(label)
```

## Color Scheme

Standard Creativitas colors:
- **Accent (active)**: `#AEC6CF` (light blue)
- **Stop button**: `#FF6961` (red)
- **Enable toggle**: `#8200C8` (purple)
- **Fill (background)**: `#303030` (dark gray)
- **Border**: `#8796EB` (medium blue)

## Backend Integration

### Editor.js Imports (lines 16-21)
```javascript
// NexusUI wrappers
import { Dial } from './ui/Dial.js';
import { Slider } from './ui/Slider.js';
import { NumberBox } from './ui/NumberBox.js';
import { Button } from './ui/Button.js';
import { Switch } from './ui/Switch.js';
```

### Window Object Exposure (lines 281-286)
```javascript
// NexusUI wrapper classes (for user code)
window.Dial = Dial;
window.Slider = Slider;
window.NumberBox = NumberBox;
window.Button = Button;
window.Switch = Switch;
```

## MonophonicTemplate.initGui()

The `initGui()` method in MonophonicTemplate automatically creates NexusUI elements:

### Key Parameters:
- **Container**: `#Canvas` DOM element
- **Scaling**: `size * 15` pixels (converts p5 size units to pixels)
- **Positioning**: Absolute pixel coordinates from layout.boundingBox

### Layout Structure:
```javascript
this.layout = {
  oscillator: {
    groupA: ['frequency', 'detune'],
    groupB: ['type', 'phase'],
    controlTypeA: 'knob',      // Uses Dial
    controlTypeB: 'fader',      // Uses Slider
    sizeA: 1,
    sizeB: 1,
    boundingBox: { x: 100, y: 100, width: 400, height: 200 },
    offsets: { x: 60, y: 60 },
    color: '#8200C8'
  }
}
```

### createGuiElement() Method:
```javascript
createGuiElement(param, { x, y, size, controlType, color, i }) {
  const width = size * 15;   // Scale to pixels
  const height = size * 15;
  
  if (controlType === 'knob') {
    const dial = new Dial(x, y, width, height);
    dial.min = param.min;
    dial.max = param.max;
    dial.value = param._value;
    dial.colorize("accent", color);
    dial.mapTo((value) => param.set(value, i, true));
    param.guiElements.push(dial);
  }
  // ...similar for 'fader' -> Slider
}
```

## Common Patterns

### Radio Button Behavior (Exclusive Selection)
```javascript
const buttons = []
for (let i = 0; i < 4; i++) {
  const btn = new Button(x + i * 100, y, 80, 40)
  btn.mode = 'toggle'
  btn.element.on('change', function(v) {
    if (v) {
      // Deactivate other buttons
      buttons.forEach((other, j) => {
        if (j !== i) other.state = false
      })
      // Do action
      console.log(`Button ${i} activated`)
    }
  })
  buttons.push(btn)
}
```

### Linking to Tone.js Parameters
```javascript
const cutoffDial = new Dial(100, 100, 60, 60)
cutoffDial.min = 50
cutoffDial.max = 5000
cutoffDial.value = 1000
cutoffDial.mapTo(function(freq) {
  vcf.frequency.value = freq
})
```

## Differences from p5 GUI

| Feature | p5 GUI | NexusUI Wrappers |
|---------|--------|------------------|
| Rendering | Canvas-based circles | HTML DOM elements |
| Container | p5 canvas instance | `#Canvas` div |
| Positioning | Percentage-based (x: 0-100) | Pixel-based (absolute) |
| Initialization | `gui = new p5(sketch, 'Canvas')` | No initialization needed |
| Create element | `gui.Toggle({x, y, size})` | `new Button(x, y, width, height)` |
| Callback | `callback: function(v)` | `element.on('change', fn)` |
| Colors | `accentColor: [r,g,b]` | `colorize('accent', '#hex')` |

## Troubleshooting

### Elements not appearing?
1. Check `#Canvas` container exists: `document.getElementById('Canvas')`
2. Verify positioning doesn't place elements off-screen
3. Check console for errors about `window.Nexus`

### p5Elements.js still being called?
- You're using old `gui = new p5(sketch, 'Canvas')` syntax
- Switch to `new Button()`, `new Dial()`, etc.

### Elements overlapping code editor?
- Increase `gridOrigin.x` (try 200px minimum)
- Adjust `gridOrigin.y` (try 100px minimum)

### State not updating?
- Use `.state` property, not `.value`
- Access underlying NexusUI with `.element` when needed

## Example: Complete 4-Sequence Controller

See `SEQUENCER_COMPLETE.js` for a full working example with:
- 16 toggle buttons in 4x4 grid
- Radio button behavior per row
- Text labels via DOM elements
- Color-coded stop buttons
- Enable toggle switch
- Proper spacing and layout
