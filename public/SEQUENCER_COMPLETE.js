//  SYSTEM NAME: 4-SEQUENCE CONTROLLER (NexusUI Version)
//  AUTHOR: CONVERTED FROM P5 GUI FORMAT  
//  DATE: DEC 2, 2025

//  Alt(option)-Enter: Evaluate Line
//  Alt(option)-Shift-Enter: Evaluate Block

/**
  INITIALIZATION & COLLABORATION
**/

// Initialize collaboration - creates window.chClient
initCollab()

// COLLABORATIVE SETUP - Change these to join a room with others!
// To collaborate: everyone should join the same room name
chClient.joinRoom('sequencer-jam')  // Change 'sequencer-jam' to any room name
chClient.username = 'Player1'       // Change to your name

// Helper to send sequence changes to collaborators
function sendToCollab(seqName, actionName) {
  if (chClient && chClient.roomJoined) {
    chClient.control(seqName, { action: actionName })
  }
}

// Flag to prevent feedback loops when updating button states from collab
var isRemoteUpdateRef = { value: false }


/**
  TONE.JS AUDIO CHAIN
**/

const vco = new Tone.Oscillator().start()
const vcf = new Tone.Filter()
const vca = new Tone.Multiply()
const output = new Tone.Multiply(0.1).toDestination()
const env = new Tone.Envelope()

vcf.connect(vca)
vca.connect(output)
env.connect(vca.factor)


/**
  SYNTH INSTANCES
**/

const seq1 = new Twinkle()
const seq2 = new Daisy()
const seq3 = new DrumSampler()
const seq4 = new Player('PintoBass.wav')
seq3.loadPreset('breakbeat')

// ROUTING
seq1.connect(vca)
seq2.connect(vca)
seq3.connect(vca)
seq4.connect(vca)
Theory.tempo = 90


/**
  PATTERN DEFINITIONS
**/

const startPattern = (synth, pattern, rate) => {
  synth.stop()
  synth.start()
  synth.sequence(pattern, rate)
}

// Store current patterns and rates for each sequence slot
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

// Map sequence names to synth instances
const seqSynths = { 
  seq1: seq1, 
  seq2: seq2, 
  seq3: seq3, 
  seq4: seq4 
}

// Define sequence actions
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


/**
  USER-FACING HELPER FUNCTIONS
**/

/**
 * Update a sequence pattern and optionally push to collaborators
 * @param {string} seqName - 'seq1', 'seq2', 'seq3', or 'seq4'
 * @param {string} slot - '1c', '2c', '3c' for seq1, '1b', '2b', '3b' for seq2, etc.
 * @param {string} pattern - The new pattern string
 * @param {string} rate - Optional new rate (e.g., '8n', '16n', '4n')
 * @param {boolean} broadcast - Whether to send to collaborators (default: true)
 * @example
 *   updateSequence('seq1', '1c', '0 1 2 3 4 5 6 7', '16n')
 *   updateSequence('seq2', '2b', '0 4 7 11 7 4')
 */
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

/**
 * Update a sequence pattern AND immediately play it
 * @param {string} seqName - 'seq1', 'seq2', 'seq3', or 'seq4'
 * @param {string} slot - '1c', '2c', '3c' for seq1, etc.
 * @param {string} pattern - The new pattern string
 * @param {string} rate - Optional new rate
 * @example
 *   setSequence('seq1', '1c', '0 1 2 3 4 5 6 7', '16n')
 */
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

/**
 * Push/sync all current synth GUI states (for synths that support pushState)
 * This updates knobs/sliders to match internal parameter values
 */
function pushState() {
  // Push synth GUI states
  if (seq1.pushState) seq1.pushState()
  if (seq2.pushState) seq2.pushState()
  if (seq3.pushState) seq3.pushState()
  if (seq4.pushState) seq4.pushState()
  
  console.log('State pushed for all synths')
}

/**
 * Get current pattern for a slot
 * @example getPattern('seq1', '1c') // returns { pattern: '...', rate: '8n' }
 */
function getPattern(seqName, slot) {
  if (sequencePatterns[seqName] && sequencePatterns[seqName][slot]) {
    return sequencePatterns[seqName][slot]
  }
  return null
}

/**
 * List all current patterns
 */
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


/**
  SYNTH GUI SETUP
**/

// Layout for seq1 (Twinkle) - compact, positioned at top-left
seq1.layout = {
  "vco": {
    "color": [220, 120, 80],
    "boundingBox": { "x": 2, "y": 3, "width": 10, "height": 18 },
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
    "boundingBox": { "x": 14, "y": 3, "width": 30, "height": 18 },
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
    "boundingBox": { "x": 42, "y": 3, "width": 36, "height": 18 },
    "offsets": { "x": 7, "y": 0 },
    "groupA": [],
    "controlTypeA": "knob",
    "controlTypeB": "knob",
    "sizeA": 0.65,
    "sizeB": 0.65,
    "showValue": true
  }
}

// Initialize synth GUI
seq1.initNexus()

// Add synth label
const canvas = document.getElementById('Canvas')
const w = canvas.clientWidth || window.innerWidth
const h = canvas.clientHeight || window.innerHeight

const seq1SynthLabel = document.createElement('div')
seq1SynthLabel.textContent = 'TWINKLE'
seq1SynthLabel.style.cssText = `position: absolute; left: ${w * 0.02}px; top: ${h * 0.01}px; color: #DC7850; font-family: monospace; font-size: 11px; font-weight: bold; pointer-events: none;`
canvas.appendChild(seq1SynthLabel)


/**
  GUI INITIALIZATION (Infrastructure handles all button/label/resize logic)
**/

// Initialize sequencer GUI with infrastructure function
const gui = initSequencerGUI({
  sequenceActions: sequenceActions,
  sequences: seqSynths,
  sendToCollab: sendToCollab,
  isRemoteUpdateRef: isRemoteUpdateRef
})

// Extract GUI elements for backward compatibility
const seqToggleGrid = gui.seqToggleGrid
const seq1g = seqToggleGrid.seq1
const seq2g = seqToggleGrid.seq2
const seq3g = seqToggleGrid.seq3
const seq4g = seqToggleGrid.seq4

// Wire enable toggle to VCA
gui.enable_toggle.element.on('change', function(value) {
  vca.factor.value = value ? 1 : 0
  console.log('VCA Enabled:', value)
})


/**
  COLLABORATION - PATTERN UPDATE HANDLERS
**/

// Listen for pattern updates from collaborators
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


console.log('═══════════════════════════════════════════════')
console.log('4-SEQUENCE CONTROLLER initialized')
console.log('═══════════════════════════════════════════════')
console.log('Synth controls via initNexus() for:', seq1.name)
console.log('Sequences loaded:', { seq1, seq2, seq3, seq4 })
console.log('')
console.log('SEQUENCE FUNCTIONS:')
console.log('  setSequence(seq, slot, pattern, rate)')
console.log('    → Updates AND plays immediately')
console.log('    → Example: setSequence("seq1", "1c", "0 1 2 3", "16n")')
console.log('')
console.log('  updateSequence(seq, slot, pattern, rate)')
console.log('    → Updates pattern (plays on next button click)')
console.log('')
console.log('  getPattern(seq, slot) → returns {pattern, rate}')
console.log('  listPatterns() → shows all current patterns')
console.log('  pushState() → sync synth GUI knobs/sliders')
console.log('')
console.log('COLLABORATION:')
console.log('  Room:', chClient.roomJoined || 'Not connected')
console.log('  Username:', chClient.username || 'Not set')
console.log('  chClient.joinRoom("room-name")')
console.log('  chClient.username = "YourName"')
console.log('═══════════════════════════════════════════════')
