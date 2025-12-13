// 4-SEQUENCE CONTROLLER (p5 GUI Version)
// Alt-Enter: run line  |  Alt-Shift-Enter: run block

// COLLABORATION SETUP
initCollab()
chClient.joinRoom('sequencer-jam')  // Change room name to collaborate
chClient.username = 'Player1'        // Change your username

function sendToCollab(seqName, actionName) {
  if (chClient && chClient.roomJoined) {
    chClient.control(seqName, { action: actionName })
  }
}

var isRemoteUpdateRef = { value: false }

// AUDIO CHAIN

const vco = new Tone.Oscillator().start()
const vcf = new Tone.Filter()
const vca = new Tone.Multiply()
const output = new Tone.Multiply(0.1).toDestination()
const env = new Tone.Envelope()

vcf.connect(vca)
vca.connect(output)
env.connect(vca.factor)

// SYNTH INSTANCES
const seq1 = new Twinkle()
const seq2 = new Daisy()
const seq3 = new DrumSampler()
const seq4 = new Player('PintoBass.wav')
seq3.loadPreset('breakbeat')

seq1.connect(vca)
seq2.connect(vca)
seq3.connect(vca)
seq4.connect(vca)
Theory.tempo = 90

// PATTERN DEFINITIONS

const startPattern = (synth, pattern, rate) => {
  synth.stop()
  synth.start()
  synth.sequence(pattern, rate)
}

const sequencePatterns = {
  seq1: {
    '1c': { pattern: '0 2 4 6 4 2', rate: '2n' },
    '2c': { pattern: '0... 0... 1 2 3 4 5 6 7 8', rate: '8n' },
    '3c': { pattern: '0 5 2 7 4 9 2 11', rate: '8n' }
  },
  seq2: {
    '1b': { pattern: '0 2 4 6 4 2', rate: '2n' },
    '2b': { pattern: '0... 0... 1 2 3 4 5 6 7 8', rate: '8n' },
    '3b': { pattern: '0 4 3 7 5 9 7 4', rate: '8n' }
  },
  seq3: {
    '1d': { pattern: 'O*.o X.*x .xO* X*^.', rate: '16n' },
    '2d': { pattern: '***^***^', rate: '8n' },
    '3d': { pattern: '1232', rate: '8n' }
  },
  seq4: {
    '1a': { pattern: '0 1 1 1 5 6 5 6', rate: '8n' },
    '2a': { pattern: '0 1 2 3 4 5 6 7', rate: '8n' },
    '3a': { pattern: '0 4 0 7 5 3 2 1', rate: '8n' }
  }
}

const seqSynths = { seq1, seq2, seq3, seq4 }
const sequenceActions = {
  seq1: {
    '1c': () => startPattern(seq1, sequencePatterns.seq1['1c'].pattern, sequencePatterns.seq1['1c'].rate),
    '2c': () => startPattern(seq1, sequencePatterns.seq1['2c'].pattern, sequencePatterns.seq1['2c'].rate),
    '3c': () => startPattern(seq1, sequencePatterns.seq1['3c'].pattern, sequencePatterns.seq1['3c'].rate),
    stop: () => seq1.stop()
  },
  seq2: {
    '1b': () => startPattern(seq2, sequencePatterns.seq2['1b'].pattern, sequencePatterns.seq2['1b'].rate),
    '2b': () => startPattern(seq2, sequencePatterns.seq2['2b'].pattern, sequencePatterns.seq2['2b'].rate),
    '3b': () => startPattern(seq2, sequencePatterns.seq2['3b'].pattern, sequencePatterns.seq2['3b'].rate),
    stop: () => seq2.stop()
  },
  seq3: {
    '1d': () => startPattern(seq3, sequencePatterns.seq3['1d'].pattern, sequencePatterns.seq3['1d'].rate),
    '2d': () => startPattern(seq3, sequencePatterns.seq3['2d'].pattern, sequencePatterns.seq3['2d'].rate),
    '3d': () => startPattern(seq3, sequencePatterns.seq3['3d'].pattern, sequencePatterns.seq3['3d'].rate),
    stop: () => seq3.stop()
  },
  seq4: {
    '1a': () => startPattern(seq4, sequencePatterns.seq4['1a'].pattern, sequencePatterns.seq4['1a'].rate),
    '2a': () => startPattern(seq4, sequencePatterns.seq4['2a'].pattern, sequencePatterns.seq4['2a'].rate),
    '3a': () => startPattern(seq4, sequencePatterns.seq4['3a'].pattern, sequencePatterns.seq4['3a'].rate),
    stop: () => seq4.stop()
  }
}


// HELPER FUNCTIONS

// Update a pattern (for next button press)
// Example: updateSequence('seq1', '1c', '0 1 2 3 4 5 6 7', '16n')
function updateSequence(seqName, slot, pattern, rate, broadcast) {
  if (broadcast === undefined) broadcast = true
  
  if (!sequencePatterns[seqName] || !sequencePatterns[seqName][slot]) {
    console.warn('Invalid sequence or slot:', seqName, slot)
    return
  }
  
  // Update the stored pattern
  sequencePatterns[seqName][slot].pattern = pattern
  if (rate) sequencePatterns[seqName][slot].rate = rate
  
  console.log('Updated', seqName, slot, '→', pattern, rate || sequencePatterns[seqName][slot].rate)
  
  // Broadcast to collaborators
  if (broadcast && chClient && chClient.roomJoined) {
    chClient.control(seqName + '-pattern', { 
      slot: slot, 
      pattern: pattern, 
      rate: rate || sequencePatterns[seqName][slot].rate 
    })
  }
}

// Update a pattern AND play it immediately
// Example: setSequence('seq1', '1c', '0 1 2 3 4 5 6 7', '16n')
function setSequence(seqName, slot, pattern, rate) {
  // Update the stored pattern
  updateSequence(seqName, slot, pattern, rate, true)
  
  // Get the synth and play immediately
  var synth = seqSynths[seqName]
  var seqData = sequencePatterns[seqName][slot]
  if (synth && seqData) {
    startPattern(synth, seqData.pattern, seqData.rate)
    console.log('Playing', seqName, slot)
  }
}

// Sync synth GUI knobs to current values
function pushState() {
  // Push synth GUI states
  if (seq1.pushState) seq1.pushState()
  if (seq2.pushState) seq2.pushState()
  if (seq3.pushState) seq3.pushState()
  if (seq4.pushState) seq4.pushState()
  
  console.log('State pushed for all synths')
}

// Get current pattern: getPattern('seq1', '1c')
function getPattern(seqName, slot) {
  if (sequencePatterns[seqName] && sequencePatterns[seqName][slot]) {
    return sequencePatterns[seqName][slot]
  }
  return null
}

// List all patterns to console
function listPatterns() {
  console.log('Current Patterns:')
  Object.keys(sequencePatterns).forEach(function(seqName) {
    console.log('  ' + seqName + ':')
    Object.keys(sequencePatterns[seqName]).forEach(function(slot) {
      var p = sequencePatterns[seqName][slot]
      console.log('    ' + slot + ': "' + p.pattern + '" @ ' + p.rate)
    })
  })
}


// SYNTH GUI LAYOUT (Twinkle)
seq1.layout = {
  "vco": {
    "color": [220, 120, 80],
    "boundingBox": { "x": 2, "y": 15, "width": 10, "height": 18 },
    "offsets": { "x": 0, "y": 6 },
    "groupA": ["type"],
    "controlTypeA": "radioButton",
    "controlTypeB": "knob",
    "sizeA": 0.8,
    "sizeB": 0.7,
    "orientation": "vertical"
  },
  "vcf": {
    "color": [160, 100, 220],
    "boundingBox": { "x": 14, "y": 15, "width": 30, "height": 18 },
    "offsets": { "x": 8, "y": 0 },
    "groupA": ["cutoff"],
    "controlTypeA": "knob",
    "controlTypeB": "knob",
    "sizeA": 0.7,
    "sizeB": 0.65,
    "showValue": true
  },
  "vca": {
    "color": [80, 200, 200],
    "boundingBox": { "x": 42, "y": 15, "width": 36, "height": 18 },
    "offsets": { "x": 7, "y": 0 },
    "groupA": [],
    "controlTypeA": "knob",
    "controlTypeB": "knob",
    "sizeA": 0.65,
    "sizeB": 0.65,
    "showValue": true
  }
}

seq1.initGui()

// P5 GUI SETUP

// Grid configuration (defined globally to avoid scope errors)
const buttonW = 8
const buttonH = 7
const spacingX = 10
const spacingY = 10
const labelSpace = 15
const startX = 25
const startY = 45
const seqToggleGrid = { seq1: [], seq2: [], seq3: [], seq4: [] }

const sketch = function(p) {
  p.elements = {}
  
  p.setup = function() {
    const canvas = document.getElementById('Canvas')
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    p.createCanvas(w, h)
  }
  
  p.draw = function() {}
  
  p.mousePressed = function() {
    Object.values(p.elements).forEach(el => {
      if (el.isPressed) el.isPressed()
    })
  }
  
  p.mouseReleased = function() {
    Object.values(p.elements).forEach(el => {
      if (el.isReleased) el.isReleased()
    })
  }
}

const gui = new p5(sketch, 'Canvas')

setTimeout(() => {
  gui.createCanvas(gui.width, gui.height)
  
  // Row definitions
  const rows = [
    { seq: 'seq1', label: 'sequence 1', color: [174, 198, 207], actions: ['1c', '2c', '3c', 'stop'] },
    { seq: 'seq2', label: 'sequence 2', color: [174, 198, 207], actions: ['1b', '2b', '3b', 'stop'] },
    { seq: 'seq3', label: 'sequence 3', color: [174, 198, 207], actions: ['1d', '2d', '3d', 'stop'] },
    { seq: 'seq4', label: 'sequence 4', color: [212, 165, 217], actions: ['1a', '2a', '3a', 'stop'] }
  ]
  
  // Create sequence button
  function createSeqButton(row, col, seqName, action, otherButtons) {
    const color = action === 'stop' ? [255, 105, 97] : rows[row].color
    
    const btn = gui.Toggle({
      label: action.toUpperCase(),
      callback: function(value) {
        if (isRemoteUpdateRef.value) {
          isRemoteUpdateRef.value = false
          return
        }
        
        if (value > 0.5) {
          // Turn off other buttons in this row
          otherButtons.forEach(other => {
            if (other !== btn) other.set(0)
          })
          
          // Execute action
          if (sequenceActions[seqName] && sequenceActions[seqName][action]) {
            sequenceActions[seqName][action]()
            console.log(seqName + ': ' + action.toUpperCase() + ' activated')
          }
          
          // Send to collaborators
          sendToCollab(seqName, action)
        }
      },
      x: startX + col * spacingX,
      y: startY + row * spacingY,
      size: 0.7,
      border: 1,
      borderColor: color,
      accentColor: color,
      textColor: [255, 255, 255]
    })
    
    return btn
  }
  
  // Create all sequence buttons
  rows.forEach((rowConfig, rowIdx) => {
    const buttons = []
    
    rowConfig.actions.forEach((action, colIdx) => {
      const btn = createSeqButton(rowIdx, colIdx, rowConfig.seq, action, buttons)
      buttons.push(btn)
      seqToggleGrid[rowConfig.seq].push(btn)
    })
    
    // Add row label (better aligned)
    gui.Text({
      label: rowConfig.label,
      x: 4,
      y: startY + rowIdx * spacingY + 2.5,
      size: 0.55,
      textColor: rowConfig.color,
      border: 0
    })
  })
  
  // Enable toggle (positioned to avoid overlap)
  const enable_toggle = gui.Toggle({
    label: 'enable',
    callback: function(value) {
      vca.factor.value = value > 0.5 ? 1 : 0
      console.log('VCA Enabled:', value > 0.5)
    },
    x: startX + 1.5 * spacingX,
    y: startY - 10,
    size: 0.9,
    border: 1,
    borderColor: [100, 100, 100],
    accentColor: [100, 200, 100],
    textColor: [255, 255, 255]
  })
  
  enable_toggle.set(1)
  
  // COLLABORATION HANDLERS
  
  function activateRemoteButton(seqName, action) {
    const seqIndex = rows.findIndex(r => r.seq === seqName)
    const actionIndex = rows[seqIndex].actions.indexOf(action)
    
    if (seqIndex >= 0 && actionIndex >= 0) {
      isRemoteUpdateRef.value = true
      seqToggleGrid[seqName][actionIndex].set(1)
    }
  }
  
  // Listen for button presses
  ;['seq1', 'seq2', 'seq3', 'seq4'].forEach(seqName => {
    chClient.on(seqName, function(data) {
      if (data.values && data.values.action) {
        activateRemoteButton(seqName, data.values.action)
      }
    })
  })
  
  // Listen for pattern updates
  chClient.on('seq1-pattern', function(data) {
    if (data.values && data.values.slot && data.values.pattern) {
      updateSequence('seq1', data.values.slot, data.values.pattern, data.values.rate, false)
    }
  })
  chClient.on('seq2-pattern', function(data) {
    if (data.values && data.values.slot && data.values.pattern) {
      updateSequence('seq2', data.values.slot, data.values.pattern, data.values.rate, false)
    }
  })
  chClient.on('seq3-pattern', function(data) {
    if (data.values && data.values.slot && data.values.pattern) {
      updateSequence('seq3', data.values.slot, data.values.pattern, data.values.rate, false)
    }
  })
  chClient.on('seq4-pattern', function(data) {
    if (data.values && data.values.slot && data.values.pattern) {
      updateSequence('seq4', data.values.slot, data.values.pattern, data.values.rate, false)
    }
  })
  
  window.seqToggleGrid = seqToggleGrid
  
}, 100)


console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('4-SEQUENCE CONTROLLER (p5 Version)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Functions:')
console.log('  setSequence("seq1", "1c", "0 1 2 3", "16n") - play pattern')
console.log('  updateSequence(...) - change pattern (plays on next click)')
console.log('  getPattern("seq1", "1c") - get current pattern')
console.log('  listPatterns() - show all patterns')
console.log('  pushState() - sync GUI knobs')
console.log('')
console.log('Collab: ' + (chClient.roomJoined || 'not connected'))
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
