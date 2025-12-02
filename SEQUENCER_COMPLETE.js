//  SYSTEM NAME: 4-SEQUENCE CONTROLLER (NexusUI Version)
//  AUTHOR: CONVERTED FROM P5 GUI FORMAT  
//  DATE: DEC 2, 2025

//  Alt(option)-Enter: Evaluate Line
//  Alt(option)-Shift-Enter: Evaluate Block

/**
  INITIALIZATION: PART I  
**/

initCollab()
chClient.username = 'Change name'

// TONE.JS AUDIO CHAIN
const vco = new Tone.Oscillator().start()
const vcf = new Tone.Filter()
const vca = new Tone.Multiply()
const output = new Tone.Multiply(0.1).toDestination()
const env = new Tone.Envelope()

vcf.connect(vca)
vca.connect(output)
env.connect(vca.factor)


/**
  SYNTH INSTANCES: PART II 
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
  HELPER FUNCTIONS: PART III
**/

const startPattern = (synth, pattern, rate) => {
  synth.stop()
  synth.start()
  synth.sequence(pattern, rate)
}


/**
  SEQUENCE ACTIONS: PART IV
**/

const sequenceActions = {
  seq1: {
    '1c': () => startPattern(seq1, '0 2 4 6 4 2', '2n'),
    '2c': () => startPattern(seq1, '0... 0... 1 2 3 4 5 6 7 8', '8n'),
    '3c': () => startPattern(seq1, '0 5 2 7 4 9 2 11', '8n'),
    stop: () => seq1.stop()
  },
  seq2: {
    '1b': () => startPattern(seq2, '0 2 4 6 4 2', '2n'),
    '2b': () => startPattern(seq2, '0... 0... 1 2 3 4 5 6 7 8', '8n'),
    '3b': () => startPattern(seq2, '0 4 3 7 5 9 7 4', '8n'),
    stop: () => seq2.stop()
  },
  seq3: {
    '1d': () => startPattern(seq3, 'O*.o X.*x .xO* X*^.', '16n'),
    '2d': () => startPattern(seq3, '***^***^'),
    '3d': () => startPattern(seq3, '1232'),
    stop: () => seq3.stop()
  },
  seq4: {
    '1a': () => startPattern(seq4, '0 1 1 1 5 6 5 6', '8n'),
    '2a': () => startPattern(seq4, '0 1 2 3 4 5 6 7', '8n'),
    '3a': () => startPattern(seq4, '0 4 0 7 5 3 2 1', '8n'),
    stop: () => seq4.stop()
  }
}


/**
  GUI INITIALIZATION: PART V
**/

// CANVAS SETUP
const canvas = document.getElementById('Canvas')
canvas.style.backgroundColor = '#1a1a2e'
canvas.style.margin = '0'
canvas.style.padding = '0'
canvas.style.width = '100%'
canvas.style.height = '100%'
canvas.style.border = 'none'
canvas.style.position = 'relative'
canvas.style.overflow = 'hidden'

// Hide header if present
try {
  const p5Container = canvas.parentElement
  if (p5Container) {
    p5Container.style.padding = '0'
    const header = p5Container.querySelector('.span-container')
    if (header) header.style.display = 'none'
  }
} catch (e) {}

const w = canvas.clientWidth || window.innerWidth
const h = canvas.clientHeight || window.innerHeight


/**
  SYNTH GUI (initNexus): PART VI
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

// Add synth label
const seq1SynthLabel = document.createElement('div')
seq1SynthLabel.textContent = 'TWINKLE'
seq1SynthLabel.style.cssText = `position: absolute; left: ${w * 0.02}px; top: ${h * 0.01}px; color: #DC7850; font-family: monospace; font-size: 11px; font-weight: bold; pointer-events: none;`
canvas.appendChild(seq1SynthLabel)

seq1.initNexus()


/**
  SEQUENCER BUTTON GRID: PART VII
**/

// Grid configuration - positioned below synth controls
const buttonSize_w = w * 0.08
const buttonSize_h = h * 0.07
const spacingX = w * 0.10
const spacingY = h * 0.10
const numCols = 4
const numRows = 4

const totalGridWidth = (numCols - 1) * spacingX + buttonSize_w
const totalGridHeight = (numRows - 1) * spacingY + buttonSize_h

const labelSpace = w * 0.12
const availableWidth = w - labelSpace
const startX = labelSpace + (availableWidth - totalGridWidth) / 2
const startY = h * 0.32  // Below synth controls

const gridOrigin = { x: startX, y: startY }
const gridSpacing = { x: spacingX, y: spacingY }
const buttonSize = { width: buttonSize_w, height: buttonSize_h }

const seqToggleGrid = { seq1: [], seq2: [], seq3: [], seq4: [] }


/**
  SEQUENCE 1 BUTTONS
**/

const seq1_1c = new Button(gridOrigin.x + 0 * gridSpacing.x, gridOrigin.y + 0 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq1_1c.mode = 'toggle'
seq1_1c.state = false
seq1_1c.colorize('accent', '#AEC6CF')
seq1_1c.colorize('fill', '#303030')
seq1_1c.element.on('change', function(v) {
  if (v) {
    seq1_2c.state = false; seq1_3c.state = false; seq1_stop.state = false
    sequenceActions.seq1['1c']()
  }
})
seqToggleGrid.seq1[0] = seq1_1c

const seq1_2c = new Button(gridOrigin.x + 1 * gridSpacing.x, gridOrigin.y + 0 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq1_2c.mode = 'toggle'
seq1_2c.state = false
seq1_2c.colorize('accent', '#AEC6CF')
seq1_2c.colorize('fill', '#303030')
seq1_2c.element.on('change', function(v) {
  if (v) {
    seq1_1c.state = false; seq1_3c.state = false; seq1_stop.state = false
    sequenceActions.seq1['2c']()
  }
})
seqToggleGrid.seq1[1] = seq1_2c

const seq1_3c = new Button(gridOrigin.x + 2 * gridSpacing.x, gridOrigin.y + 0 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq1_3c.mode = 'toggle'
seq1_3c.state = false
seq1_3c.colorize('accent', '#AEC6CF')
seq1_3c.colorize('fill', '#303030')
seq1_3c.element.on('change', function(v) {
  if (v) {
    seq1_1c.state = false; seq1_2c.state = false; seq1_stop.state = false
    sequenceActions.seq1['3c']()
  }
})
seqToggleGrid.seq1[2] = seq1_3c

const seq1_stop = new Button(gridOrigin.x + 3 * gridSpacing.x, gridOrigin.y + 0 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq1_stop.mode = 'toggle'
seq1_stop.state = false
seq1_stop.colorize('accent', '#FF6961')
seq1_stop.colorize('fill', '#303030')
seq1_stop.element.on('change', function(v) {
  if (v) {
    seq1_1c.state = false; seq1_2c.state = false; seq1_3c.state = false
    sequenceActions.seq1.stop()
  }
})
seqToggleGrid.seq1[3] = seq1_stop


/**
  SEQUENCE 2 BUTTONS
**/

const seq2_1b = new Button(gridOrigin.x + 0 * gridSpacing.x, gridOrigin.y + 1 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq2_1b.mode = 'toggle'
seq2_1b.state = false
seq2_1b.colorize('accent', '#B4D7A8')
seq2_1b.colorize('fill', '#303030')
seq2_1b.element.on('change', function(v) {
  if (v) {
    seq2_2b.state = false; seq2_3b.state = false; seq2_stop.state = false
    sequenceActions.seq2['1b']()
  }
})
seqToggleGrid.seq2[0] = seq2_1b

const seq2_2b = new Button(gridOrigin.x + 1 * gridSpacing.x, gridOrigin.y + 1 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq2_2b.mode = 'toggle'
seq2_2b.state = false
seq2_2b.colorize('accent', '#B4D7A8')
seq2_2b.colorize('fill', '#303030')
seq2_2b.element.on('change', function(v) {
  if (v) {
    seq2_1b.state = false; seq2_3b.state = false; seq2_stop.state = false
    sequenceActions.seq2['2b']()
  }
})
seqToggleGrid.seq2[1] = seq2_2b

const seq2_3b = new Button(gridOrigin.x + 2 * gridSpacing.x, gridOrigin.y + 1 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq2_3b.mode = 'toggle'
seq2_3b.state = false
seq2_3b.colorize('accent', '#B4D7A8')
seq2_3b.colorize('fill', '#303030')
seq2_3b.element.on('change', function(v) {
  if (v) {
    seq2_1b.state = false; seq2_2b.state = false; seq2_stop.state = false
    sequenceActions.seq2['3b']()
  }
})
seqToggleGrid.seq2[2] = seq2_3b

const seq2_stop = new Button(gridOrigin.x + 3 * gridSpacing.x, gridOrigin.y + 1 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq2_stop.mode = 'toggle'
seq2_stop.state = false
seq2_stop.colorize('accent', '#FF6961')
seq2_stop.colorize('fill', '#303030')
seq2_stop.element.on('change', function(v) {
  if (v) {
    seq2_1b.state = false; seq2_2b.state = false; seq2_3b.state = false
    sequenceActions.seq2.stop()
  }
})
seqToggleGrid.seq2[3] = seq2_stop


/**
  SEQUENCE 3 BUTTONS
**/

const seq3_1d = new Button(gridOrigin.x + 0 * gridSpacing.x, gridOrigin.y + 2 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq3_1d.mode = 'toggle'
seq3_1d.state = false
seq3_1d.colorize('accent', '#FFD580')
seq3_1d.colorize('fill', '#303030')
seq3_1d.element.on('change', function(v) {
  if (v) {
    seq3_2d.state = false; seq3_3d.state = false; seq3_stop.state = false
    sequenceActions.seq3['1d']()
  }
})
seqToggleGrid.seq3[0] = seq3_1d

const seq3_2d = new Button(gridOrigin.x + 1 * gridSpacing.x, gridOrigin.y + 2 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq3_2d.mode = 'toggle'
seq3_2d.state = false
seq3_2d.colorize('accent', '#FFD580')
seq3_2d.colorize('fill', '#303030')
seq3_2d.element.on('change', function(v) {
  if (v) {
    seq3_1d.state = false; seq3_3d.state = false; seq3_stop.state = false
    sequenceActions.seq3['2d']()
  }
})
seqToggleGrid.seq3[1] = seq3_2d

const seq3_3d = new Button(gridOrigin.x + 2 * gridSpacing.x, gridOrigin.y + 2 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq3_3d.mode = 'toggle'
seq3_3d.state = false
seq3_3d.colorize('accent', '#FFD580')
seq3_3d.colorize('fill', '#303030')
seq3_3d.element.on('change', function(v) {
  if (v) {
    seq3_1d.state = false; seq3_2d.state = false; seq3_stop.state = false
    sequenceActions.seq3['3d']()
  }
})
seqToggleGrid.seq3[2] = seq3_3d

const seq3_stop = new Button(gridOrigin.x + 3 * gridSpacing.x, gridOrigin.y + 2 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq3_stop.mode = 'toggle'
seq3_stop.state = false
seq3_stop.colorize('accent', '#FF6961')
seq3_stop.colorize('fill', '#303030')
seq3_stop.element.on('change', function(v) {
  if (v) {
    seq3_1d.state = false; seq3_2d.state = false; seq3_3d.state = false
    sequenceActions.seq3.stop()
  }
})
seqToggleGrid.seq3[3] = seq3_stop


/**
  SEQUENCE 4 BUTTONS
**/

const seq4_1a = new Button(gridOrigin.x + 0 * gridSpacing.x, gridOrigin.y + 3 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq4_1a.mode = 'toggle'
seq4_1a.state = false
seq4_1a.colorize('accent', '#D4A5D9')
seq4_1a.colorize('fill', '#303030')
seq4_1a.element.on('change', function(v) {
  if (v) {
    seq4_2a.state = false; seq4_3a.state = false; seq4_stop.state = false
    sequenceActions.seq4['1a']()
  }
})
seqToggleGrid.seq4[0] = seq4_1a

const seq4_2a = new Button(gridOrigin.x + 1 * gridSpacing.x, gridOrigin.y + 3 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq4_2a.mode = 'toggle'
seq4_2a.state = false
seq4_2a.colorize('accent', '#D4A5D9')
seq4_2a.colorize('fill', '#303030')
seq4_2a.element.on('change', function(v) {
  if (v) {
    seq4_1a.state = false; seq4_3a.state = false; seq4_stop.state = false
    sequenceActions.seq4['2a']()
  }
})
seqToggleGrid.seq4[1] = seq4_2a

const seq4_3a = new Button(gridOrigin.x + 2 * gridSpacing.x, gridOrigin.y + 3 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq4_3a.mode = 'toggle'
seq4_3a.state = false
seq4_3a.colorize('accent', '#D4A5D9')
seq4_3a.colorize('fill', '#303030')
seq4_3a.element.on('change', function(v) {
  if (v) {
    seq4_1a.state = false; seq4_2a.state = false; seq4_stop.state = false
    sequenceActions.seq4['3a']()
  }
})
seqToggleGrid.seq4[2] = seq4_3a

const seq4_stop = new Button(gridOrigin.x + 3 * gridSpacing.x, gridOrigin.y + 3 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq4_stop.mode = 'toggle'
seq4_stop.state = false
seq4_stop.colorize('accent', '#FF6961')
seq4_stop.colorize('fill', '#303030')
seq4_stop.element.on('change', function(v) {
  if (v) {
    seq4_1a.state = false; seq4_2a.state = false; seq4_3a.state = false
    sequenceActions.seq4.stop()
  }
})
seqToggleGrid.seq4[3] = seq4_stop


/**
  SEQUENCE LABELS: PART VIII
**/

const labelRightEdge = startX - (w * 0.02)
const labelWidth = w * 0.10
const labelLeftPx = labelRightEdge - labelWidth
const labelStyle = `position: absolute; font-family: monospace; font-size: 12px; pointer-events: none; user-select: none; text-align: right; width: ${labelWidth}px; left: ${labelLeftPx}px;`

const getRowTopPx = (rowIndex) => startY + (rowIndex * spacingY) + (buttonSize_h / 2) - 7

const seq1_label = document.createElement('div')
seq1_label.textContent = 'seq 1'
seq1_label.style.cssText = labelStyle + `top: ${getRowTopPx(0)}px; color: #AEC6CF;`
canvas.appendChild(seq1_label)

const seq2_label = document.createElement('div')
seq2_label.textContent = 'seq 2'
seq2_label.style.cssText = labelStyle + `top: ${getRowTopPx(1)}px; color: #B4D7A8;`
canvas.appendChild(seq2_label)

const seq3_label = document.createElement('div')
seq3_label.textContent = 'seq 3'
seq3_label.style.cssText = labelStyle + `top: ${getRowTopPx(2)}px; color: #FFD580;`
canvas.appendChild(seq3_label)

const seq4_label = document.createElement('div')
seq4_label.textContent = 'seq 4'
seq4_label.style.cssText = labelStyle + `top: ${getRowTopPx(3)}px; color: #D4A5D9;`
canvas.appendChild(seq4_label)


/**
  ENABLE TOGGLE: PART IX
**/

const toggleWidth = w * 0.07
const toggleHeight = h * 0.03
const gridCenterX = startX + (totalGridWidth / 2)
const toggleX = gridCenterX - (toggleWidth / 2)
const toggleY = startY - (h * 0.08)

const enable_toggle = new Switch(toggleX, toggleY, toggleWidth, toggleHeight)
enable_toggle.element.on('change', function(value) {
  vca.factor.value = value ? 1 : 0
  console.log('VCA Enabled:', value)
})

const enable_label = document.createElement('div')
enable_label.textContent = 'enable'
const enableLabelWidth = 60
enable_label.style.cssText = `position: absolute; color: #8796EB; font-family: monospace; font-size: 11px; pointer-events: none; user-select: none; left: ${gridCenterX - enableLabelWidth/2}px; top: ${toggleY - 18}px; width: ${enableLabelWidth}px; text-align: center;`
canvas.appendChild(enable_label)


/**
  BACKWARD COMPATIBILITY: PART X
**/

const seq1g = seqToggleGrid.seq1
const seq2g = seqToggleGrid.seq2
const seq3g = seqToggleGrid.seq3
const seq4g = seqToggleGrid.seq4

console.log('4-SEQUENCE CONTROLLER initialized')
console.log('Synth controls via initNexus() for:', seq1.name)
console.log('Sequences loaded:', { seq1, seq2, seq3, seq4 })
