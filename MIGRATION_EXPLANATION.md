# Complete NexusUI Migration: From p5.js GUI to NexusUI Wrappers

## The Problem: Two GUI Systems Coexisting

Creativitas3 had **two different GUI systems** that were causing confusion:

### 1. **p5.js GUI System** (Old - Canvas-Based)
- Located in: `src/p5Elements.js` and `src/p5Library.js`
- Created a p5.js canvas that **draws GUI elements as circles/shapes**
- Used percentage-based positioning (x: 0-100)
- Initialized with: `gui = new p5(sketch, 'Canvas')`
- Created elements with: `gui.Toggle({x, y, size, callback})`
- Elements were **rendered on every frame** in the p5 draw loop
- Used by: Old synth examples and starter code

### 2. **NexusUI System** (New - HTML-Based)
- NexusUI library: HTML-based interactive UI elements
- Wrapper classes in: `src/ui/*.js` (Dial, Slider, Button, Switch, NumberBox)
- Used by: MonophonicTemplate and modern synths
- Created **actual DOM elements** (not canvas drawings)
- Used absolute pixel positioning

### The Conflict:
- User code that used `gui.Toggle()` was creating p5 canvas circles
- MonophonicTemplate's `initGui()` was creating NexusUI HTML elements
- Both targeted the same `#Canvas` container but rendered differently
- This caused visual inconsistencies and confusion

---

## The Migration: Step-by-Step Technical Breakdown

### **Phase 1: Understand the Architecture**

#### 1.1 How p5 GUI System Worked:
```javascript
// User code (evaluated in Editor.js)
const gui = new p5(sketch, 'Canvas')
const btn = gui.Toggle({
  x: 30,           // Percentage of canvas width
  y: 50,           // Percentage of canvas height  
  size: 1,         // Scale multiplier
  callback: fn,    // Called on change
  accentColor: [174, 198, 207]  // RGB array
})
```

**What happened internally:**
1. `new p5(sketch, 'Canvas')` created a p5.js instance
2. p5's `setup()` initialized canvas inside `#Canvas` div
3. p5's `draw()` loop ran continuously, redrawing GUI elements as circles
4. `gui.Toggle()` added element to `p.elements` object
5. Mouse events (`mousePressed`, `mouseReleased`) checked collision with circles
6. Console showed: `p5Elements.js:1032 Button isPressed`

#### 1.2 How NexusUI Wrapper System Works:
```javascript
// In MonophonicTemplate.js
import { Dial } from '../ui/Dial.js'

initGui() {
  const dial = new Dial(x, y, width, height)  // Pixels, not percentages
  dial.min = 0
  dial.max = 100
  dial.value = 50
  dial.colorize('accent', '#8200C8')
  dial.mapTo((value) => this.param.set(value))
}
```

**What happens internally:**
1. `new Dial(x, y, w, h)` calls `super('Dial', x, y, w, h)` in NexusElement
2. NexusElement creates: `new window.Nexus.Dial('#Canvas', {size: [w, h]})`
3. NexusUI creates **real HTML canvas element** (not p5.js circle drawing)
4. Element positioned absolutely via: `element.style.left/top = '${x}px'`
5. Event listeners: `element.on('change', callback)`
6. No draw loop needed - HTML handles rendering

---

### **Phase 2: Expose Wrapper Classes to User Code**

**Problem:** Wrapper classes were only available in imported modules (MonophonicTemplate.js), not in user code evaluated with `eval()`.

**Solution:** Make classes globally available via `window` object.

#### 2.1 Import Wrapper Classes in Editor.js
```javascript
// src/Editor.js (lines 16-21)
import { Dial } from './ui/Dial.js';
import { Slider } from './ui/Slider.js';
import { NumberBox } from './ui/NumberBox.js';
import { Button } from './ui/Button.js';
import { Switch } from './ui/Switch.js';
```

#### 2.2 Expose on Window Object
```javascript
// src/Editor.js (lines 281-286)
window.Dial = Dial;
window.Slider = Slider;
window.NumberBox = NumberBox;
window.Button = Button;
window.Switch = Switch;
```

**Why this works:**
- User code is evaluated with `eval()` in the global scope
- `eval()` has access to `window` object
- Now user can write: `new Button(x, y, w, h)` directly

---

### **Phase 3: Understand Wrapper Class Architecture**

#### 3.1 Base Class: NexusElement (parentNexus.js)
```javascript
export class NexusElement {
  constructor(element_type, x, y, width, height) {
    // Get global Nexus from CDN script
    const Nexus = window.Nexus;
    
    // Create actual NexusUI element
    this.element = new Nexus[element_type]("#Canvas", {
      size: [width, height]
    });
    
    // Set absolute positioning
    this.element.element.style.position = 'absolute';
    
    // Store as percentages for responsive design
    this.xPercent = x / window.innerWidth;
    this.yPercent = y / window.innerHeight;
    
    // Position element
    this.updatePositionAndSize();
    
    // Update on window resize
    window.addEventListener("resize", () => this.updatePositionAndSize());
  }
  
  colorize(property, color) {
    this.element.colorize(property, color);
  }
  
  mapTo(callback) {
    this.element.on("change", callback);
  }
}
```

**Key insights:**
- Wraps `window.Nexus.*` constructors
- Handles positioning and responsive layout
- Provides consistent API across all element types

#### 3.2 Button Wrapper (Button.js)
```javascript
export class Button extends NexusElement {
  constructor(x, y, width, height) {
    super('Button', x, y, width, height);
  }
  
  get mode() {
    return this._mode;
  }
  
  set mode(type) {
    this._mode = type;
    this.element.mode = type;  // Pass to underlying NexusUI
  }
  
  get state() {
    return this._state;
  }
  
  set state(pressed) {
    this._state = pressed;
    this.element.state = pressed;  // Pass to underlying NexusUI
  }
}
```

**How it works:**
1. `new Button(200, 100, 80, 40)` creates wrapper
2. Wrapper calls `super('Button', 200, 100, 80, 40)`
3. NexusElement creates `window.Nexus.Button('#Canvas', {size: [80, 40]})`
4. Element positioned at `(200px, 100px)` via CSS
5. Properties like `mode` and `state` proxy to underlying `this.element`

---

### **Phase 4: Convert User Code Patterns**

#### Pattern 1: Initialization
```javascript
// OLD (p5 GUI)
const gui = new p5(sketch, 'Canvas')
gui.setTheme('dark')

// NEW (NexusUI Wrappers)
// No initialization needed! Just create elements directly
```

#### Pattern 2: Create Toggle Button
```javascript
// OLD (p5 GUI)
const btn = gui.Toggle({
  label: '1C',
  callback: value => {
    if (value > 0.5) {
      console.log('activated')
    }
  },
  x: 30,           // Percentage
  y: 50,           // Percentage
  size: 1,
  borderColor: [135, 150, 235],
  accentColor: [174, 198, 207]
})
btn.value = false

// NEW (NexusUI Wrappers)
const btn = new Button(200, 100, 80, 40)  // Pixels
btn.mode = 'toggle'
btn.state = false
btn.colorize('accent', '#AEC6CF')
btn.colorize('fill', '#303030')
btn.element.on('change', function(v) {
  if (v) {
    console.log('activated')
  }
})
```

**Key differences:**
- Positioning: Percentage → Pixels
- Colors: RGB arrays → Hex strings
- Callback: `callback` option → `element.on('change', fn)`
- State: `.value` → `.state`
- No `label` - must create separate DOM element

#### Pattern 3: Radio Button Behavior (Exclusive Selection)
```javascript
// OLD (p5 GUI)
const buttons = []
for (let i = 0; i < 4; i++) {
  const btn = gui.Toggle({
    callback: value => {
      if (value > 0.5) {
        buttons.forEach(other => {
          if (other !== btn) other.value = false
        })
      }
    },
    x: 30 + i * 12,
    y: 50,
    size: 1
  })
  buttons.push(btn)
}

// NEW (NexusUI Wrappers)
const buttons = []
for (let i = 0; i < 4; i++) {
  const btn = new Button(200 + i * 100, 100, 80, 40)
  btn.mode = 'toggle'
  btn.element.on('change', function(v) {
    if (v) {
      buttons.forEach((other, j) => {
        if (j !== i) other.state = false
      })
    }
  })
  buttons.push(btn)
}
```

#### Pattern 4: Linking to Tone.js
```javascript
// OLD (p5 GUI)
const dial = gui.Knob({
  label: 'cutoff',
  mapto: vcf.frequency,
  min: 50,
  max: 5000,
  x: 20,
  y: 30,
  size: 1
})

// NEW (NexusUI Wrappers)
const dial = new Dial(200, 100, 60, 60)
dial.min = 50
dial.max = 5000
dial.value = 1000
dial.colorize('accent', '#8200C8')
dial.mapTo(function(freq) {
  vcf.frequency.value = freq
})
```

---

### **Phase 5: Positioning and Layout**

#### The Container System:
```html
<!-- public/index.html -->
<div id="Canvas" style="position: relative; width: 100%; height: 100%;"></div>
```

All NexusUI elements are children of `#Canvas`:
```javascript
// When you create:
const btn = new Button(200, 100, 80, 40)

// Internally creates:
<div id="Canvas">
  <canvas class="nexus-ui-button" 
          style="position: absolute; left: 200px; top: 100px; width: 80px; height: 40px;">
  </canvas>
</div>
```

#### Responsive Positioning:
NexusElement stores positions as **percentages** internally:
```javascript
constructor(element_type, x, y, width, height) {
  this.xPercent = x / window.innerWidth;   // 200/1920 = 0.104
  this.yPercent = y / window.innerHeight;  // 100/1080 = 0.093
  
  window.addEventListener("resize", () => {
    const newX = this.xPercent * window.innerWidth;   // Recalculate
    const newY = this.yPercent * window.innerHeight;
    this.element.element.style.left = newX + "px";
    this.element.element.style.top = newY + "px";
  });
}
```

**Grid Layout Pattern:**
```javascript
const gridOrigin = { x: 200, y: 100 }
const gridSpacing = { x: 120, y: 80 }
const buttonSize = { width: 80, height: 40 }

// Create 4x4 grid
for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 4; col++) {
    const btn = new Button(
      gridOrigin.x + col * gridSpacing.x,  // 200, 320, 440, 560
      gridOrigin.y + row * gridSpacing.y,  // 100, 180, 260, 340
      buttonSize.width,
      buttonSize.height
    )
  }
}
```

---

### **Phase 6: Handle Text Labels**

**Problem:** NexusUI doesn't have a Text element yet.

**Solution:** Create DOM elements directly:
```javascript
const label = document.createElement('div')
label.textContent = 'sequence 1'
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

**Why this works:**
- Labels are also children of `#Canvas`
- `pointer-events: none` prevents interference with buttons
- `position: absolute` allows precise placement

---

### **Phase 7: MonophonicTemplate.initGui() Deep Dive**

This is where **synth GUI elements** are created automatically.

#### The Layout System:
```javascript
// In a synth class extending MonophonicTemplate:
this.layout = {
  oscillator: {
    groupA: ['frequency', 'detune'],    // These get knobs
    groupB: ['type', 'phase'],          // These get faders
    controlTypeA: 'knob',
    controlTypeB: 'fader',
    sizeA: 1,
    sizeB: 1,
    boundingBox: { x: 100, y: 100, width: 400, height: 200 },
    offsets: { x: 60, y: 60 },
    color: '#8200C8'
  },
  filter: {
    groupA: ['frequency', 'Q'],
    groupB: ['type', 'rolloff'],
    controlTypeA: 'knob',
    controlTypeB: 'radioButton',
    // ... etc
  }
}
```

#### initGui() Process:
```javascript
initGui() {
  // 1. Get container
  this.guiContainer = document.getElementById('Canvas');
  
  // 2. Group parameters by type
  const groupedParams = {};
  Object.values(this.param).forEach((param) => {
    if (!groupedParams[param.type]) groupedParams[param.type] = [];
    groupedParams[param.type].push(param);
  });
  
  // 3. For each group (oscillator, filter, etc)
  Object.keys(groupedParams).forEach((groupType) => {
    const groupLayout = layout[groupType];
    
    // 4. For each parameter in group
    groupedParams[groupType].forEach((param, index) => {
      // Determine if it's in groupA or groupB
      const isGroupA = groupLayout.groupA.includes(param.name);
      const controlType = isGroupA ? groupLayout.controlTypeA : groupLayout.controlTypeB;
      const size = isGroupA ? groupLayout.sizeA : groupLayout.sizeB;
      
      // Calculate position in grid
      let xOffset = groupLayout.offsets.x * (index % cols);
      let yOffset = groupLayout.offsets.y * Math.floor(index / cols);
      const x = groupLayout.boundingBox.x + xOffset;
      const y = groupLayout.boundingBox.y + yOffset;
      
      // Create the GUI element
      this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color });
    });
  });
}
```

#### createGuiElement() Implementation:
```javascript
createGuiElement(param, { x, y, size, controlType, color }) {
  // Convert p5 size units to pixels
  const width = size * 15;   // size=1 → 15px
  const height = size * 15;
  
  if (controlType === 'knob') {
    const dial = new Dial(x, y, width, height);
    dial.min = param.min;
    dial.max = param.max;
    dial.value = param._value;
    dial.colorize("accent", color);
    dial.mapTo((value) => param.set(value));
    param.guiElements.push(dial);  // Store reference for cleanup
  }
  else if (controlType === 'fader') {
    const slider = new Slider(x, y, width * 2, height);
    slider.min = param.min;
    slider.max = param.max;
    slider.value = param._value;
    slider.colorize("accent", color);
    slider.mapTo((value) => param.set(value));
    param.guiElements.push(slider);
  }
}
```

**Key features:**
- **Automatic layout**: Parameters positioned in grid based on layout config
- **Scaling**: `size * 15` converts abstract units to pixels
- **Two-way binding**: GUI changes call `param.set()`, which updates Tone.js
- **Cleanup**: Elements stored in `param.guiElements` array for later destruction

---

## Summary: What Changed Architecturally

### Before (p5 GUI):
```
User Code
   ↓
gui = new p5(sketch, 'Canvas')
   ↓
p5.js creates canvas
   ↓
draw() loop redraws circles every frame
   ↓
Mouse events check collision
   ↓
Console: "p5Elements.js Button isPressed"
```

### After (NexusUI Wrappers):
```
User Code
   ↓
new Button(x, y, w, h)
   ↓
Button extends NexusElement
   ↓
NexusElement calls window.Nexus.Button()
   ↓
NexusUI creates HTML canvas element
   ↓
CSS positions element absolutely
   ↓
HTML event listeners handle interaction
   ↓
Console: "sequence 1: 1C activated"
```

### Files Modified:
1. **src/Editor.js** - Import and expose wrapper classes (6 lines added)
2. **User code** - Replace `gui.Toggle()` with `new Button()`

### Files Created:
1. **SEQUENCER_COMPLETE.js** - Working example
2. **NEXUSUI_INTEGRATION_GUIDE.md** - User documentation

### Why This Is Better:
- ✅ **Consistent**: All GUI uses same system (NexusUI)
- ✅ **HTML-based**: Real DOM elements, not canvas drawings
- ✅ **Performant**: No draw loop overhead
- ✅ **Modern**: Matches MonophonicTemplate architecture
- ✅ **Maintainable**: Single source of truth for GUI
- ✅ **Flexible**: Direct access to NexusUI features
