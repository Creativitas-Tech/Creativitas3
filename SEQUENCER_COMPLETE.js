//  SYSTEM NAME: 4-SEQUENCE CONTROLLER (NexusUI Version)
//  AUTHOR: CONVERTED FROM P5 GUI FORMAT  
//  DATE: NOV 22, 2025

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
seq1.connect(output)
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

// GRID CONFIGURATION
const gridOrigin = { x: 200, y: 100 }
const gridSpacing = { x: 120, y: 80 }
const buttonSize = { width: 80, height: 40 }

// STORAGE FOR BUTTON REFERENCES
const seqToggleGrid = {
  seq1: [],
  seq2: [],
  seq3: [],
  seq4: []
}


/**
  SEQUENCE 1 BUTTONS: PART VI
**/

const seq1_1c = new Button(gridOrigin.x + 0 * gridSpacing.x, gridOrigin.y + 0 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq1_1c.mode = 'toggle'
seq1_1c.state = false
seq1_1c.colorize('accent', '#AEC6CF')
seq1_1c.colorize('fill', '#303030')
seq1_1c.element.on('change', function(v) {
  if (v) {
    seq1_2c.state = false
    seq1_3c.state = false
    seq1_stop.state = false
    sequenceActions.seq1['1c']()
    console.log('sequence 1: 1C activated')
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
    seq1_1c.state = false
    seq1_3c.state = false
    seq1_stop.state = false
    sequenceActions.seq1['2c']()
    console.log('sequence 1: 2C activated')
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
    seq1_1c.state = false
    seq1_2c.state = false
    seq1_stop.state = false
    sequenceActions.seq1['3c']()
    console.log('sequence 1: 3C activated')
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
    seq1_1c.state = false
    seq1_2c.state = false
    seq1_3c.state = false
    sequenceActions.seq1.stop()
    console.log('sequence 1: STOP activated')
  }
})
seqToggleGrid.seq1[3] = seq1_stop


/**
  SEQUENCE 2 BUTTONS: PART VII
**/

const seq2_1b = new Button(gridOrigin.x + 0 * gridSpacing.x, gridOrigin.y + 1 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq2_1b.mode = 'toggle'
seq2_1b.state = false
seq2_1b.colorize('accent', '#AEC6CF')
seq2_1b.colorize('fill', '#303030')
seq2_1b.element.on('change', function(v) {
  if (v) {
    seq2_2b.state = false
    seq2_3b.state = false
    seq2_stop.state = false
    sequenceActions.seq2['1b']()
    console.log('sequence 2: 1B activated')
  }
})
seqToggleGrid.seq2[0] = seq2_1b

const seq2_2b = new Button(gridOrigin.x + 1 * gridSpacing.x, gridOrigin.y + 1 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq2_2b.mode = 'toggle'
seq2_2b.state = false
seq2_2b.colorize('accent', '#AEC6CF')
seq2_2b.colorize('fill', '#303030')
seq2_2b.element.on('change', function(v) {
  if (v) {
    seq2_1b.state = false
    seq2_3b.state = false
    seq2_stop.state = false
    sequenceActions.seq2['2b']()
    console.log('sequence 2: 2B activated')
  }
})
seqToggleGrid.seq2[1] = seq2_2b

const seq2_3b = new Button(gridOrigin.x + 2 * gridSpacing.x, gridOrigin.y + 1 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq2_3b.mode = 'toggle'
seq2_3b.state = false
seq2_3b.colorize('accent', '#AEC6CF')
seq2_3b.colorize('fill', '#303030')
seq2_3b.element.on('change', function(v) {
  if (v) {
    seq2_1b.state = false
    seq2_2b.state = false
    seq2_stop.state = false
    sequenceActions.seq2['3b']()
    console.log('sequence 2: 3B activated')
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
    seq2_1b.state = false
    seq2_2b.state = false
    seq2_3b.state = false
    sequenceActions.seq2.stop()
    console.log('sequence 2: STOP activated')
  }
})
seqToggleGrid.seq2[3] = seq2_stop


/**
  SEQUENCE 3 BUTTONS: PART VIII
**/

const seq3_1d = new Button(gridOrigin.x + 0 * gridSpacing.x, gridOrigin.y + 2 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq3_1d.mode = 'toggle'
seq3_1d.state = false
seq3_1d.colorize('accent', '#AEC6CF')
seq3_1d.colorize('fill', '#303030')
seq3_1d.element.on('change', function(v) {
  if (v) {
    seq3_2d.state = false
    seq3_3d.state = false
    seq3_stop.state = false
    sequenceActions.seq3['1d']()
    console.log('sequence 3: 1D activated')
  }
})
seqToggleGrid.seq3[0] = seq3_1d

const seq3_2d = new Button(gridOrigin.x + 1 * gridSpacing.x, gridOrigin.y + 2 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq3_2d.mode = 'toggle'
seq3_2d.state = false
seq3_2d.colorize('accent', '#AEC6CF')
seq3_2d.colorize('fill', '#303030')
seq3_2d.element.on('change', function(v) {
  if (v) {
    seq3_1d.state = false
    seq3_3d.state = false
    seq3_stop.state = false
    sequenceActions.seq3['2d']()
    console.log('sequence 3: 2D activated')
  }
})
seqToggleGrid.seq3[1] = seq3_2d

const seq3_3d = new Button(gridOrigin.x + 2 * gridSpacing.x, gridOrigin.y + 2 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq3_3d.mode = 'toggle'
seq3_3d.state = false
seq3_3d.colorize('accent', '#AEC6CF')
seq3_3d.colorize('fill', '#303030')
seq3_3d.element.on('change', function(v) {
  if (v) {
    seq3_1d.state = false
    seq3_2d.state = false
    seq3_stop.state = false
    sequenceActions.seq3['3d']()
    console.log('sequence 3: 3D activated')
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
    seq3_1d.state = false
    seq3_2d.state = false
    seq3_3d.state = false
    sequenceActions.seq3.stop()
    console.log('sequence 3: STOP activated')
  }
})
seqToggleGrid.seq3[3] = seq3_stop


/**
  SEQUENCE 4 BUTTONS: PART IX
**/

const seq4_1a = new Button(gridOrigin.x + 0 * gridSpacing.x, gridOrigin.y + 3 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq4_1a.mode = 'toggle'
seq4_1a.state = false
seq4_1a.colorize('accent', '#AEC6CF')
seq4_1a.colorize('fill', '#303030')
seq4_1a.element.on('change', function(v) {
  if (v) {
    seq4_2a.state = false
    seq4_3a.state = false
    seq4_stop.state = false
    sequenceActions.seq4['1a']()
    console.log('sequence 4: 1A activated')
  }
})
seqToggleGrid.seq4[0] = seq4_1a

const seq4_2a = new Button(gridOrigin.x + 1 * gridSpacing.x, gridOrigin.y + 3 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq4_2a.mode = 'toggle'
seq4_2a.state = false
seq4_2a.colorize('accent', '#AEC6CF')
seq4_2a.colorize('fill', '#303030')
seq4_2a.element.on('change', function(v) {
  if (v) {
    seq4_1a.state = false
    seq4_3a.state = false
    seq4_stop.state = false
    sequenceActions.seq4['2a']()
    console.log('sequence 4: 2A activated')
  }
})
seqToggleGrid.seq4[1] = seq4_2a

const seq4_3a = new Button(gridOrigin.x + 2 * gridSpacing.x, gridOrigin.y + 3 * gridSpacing.y, buttonSize.width, buttonSize.height)
seq4_3a.mode = 'toggle'
seq4_3a.state = false
seq4_3a.colorize('accent', '#AEC6CF')
seq4_3a.colorize('fill', '#303030')
seq4_3a.element.on('change', function(v) {
  if (v) {
    seq4_1a.state = false
    seq4_2a.state = false
    seq4_stop.state = false
    sequenceActions.seq4['3a']()
    console.log('sequence 4: 3A activated')
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
    seq4_1a.state = false
    seq4_2a.state = false
    seq4_3a.state = false
    sequenceActions.seq4.stop()
    console.log('sequence 4: STOP activated')
  }
})
seqToggleGrid.seq4[3] = seq4_stop


/**
  SEQUENCE LABELS: PART X
**/

// Create text labels using DOM elements
const labelStyle = 'position: absolute; color: #8796EB; font-family: monospace; font-size: 12px; pointer-events: none; user-select: none;'

const seq1_label = document.createElement('div')
seq1_label.textContent = 'sequence 1'
seq1_label.style.cssText = labelStyle + `left: ${gridOrigin.x - 100}px; top: ${gridOrigin.y + 10}px;`
document.getElementById('Canvas').appendChild(seq1_label)

const seq2_label = document.createElement('div')
seq2_label.textContent = 'sequence 2'
seq2_label.style.cssText = labelStyle + `left: ${gridOrigin.x - 100}px; top: ${gridOrigin.y + 1 * gridSpacing.y + 10}px;`
document.getElementById('Canvas').appendChild(seq2_label)

const seq3_label = document.createElement('div')
seq3_label.textContent = 'sequence 3'
seq3_label.style.cssText = labelStyle + `left: ${gridOrigin.x - 100}px; top: ${gridOrigin.y + 2 * gridSpacing.y + 10}px;`
document.getElementById('Canvas').appendChild(seq3_label)

const seq4_label = document.createElement('div')
seq4_label.textContent = 'sequence 4'
seq4_label.style.cssText = labelStyle + `left: ${gridOrigin.x - 100}px; top: ${gridOrigin.y + 3 * gridSpacing.y + 10}px;`
document.getElementById('Canvas').appendChild(seq4_label)


/**
  ENABLE TOGGLE: PART XI
**/

const enable_toggle = new Switch(gridOrigin.x + 500, gridOrigin.y, 60, 30)
enable_toggle.element.on('change', function(value) {
  vca.factor.value = value ? 1 : 0
  console.log('VCA Enabled:', value)
})

const enable_label = document.createElement('div')
enable_label.textContent = 'enable'
enable_label.style.cssText = labelStyle + `left: ${gridOrigin.x + 500}px; top: ${gridOrigin.y - 20}px;`
document.getElementById('Canvas').appendChild(enable_label)


/**
  BACKWARD COMPATIBILITY: PART XII
**/

const seq1g = seqToggleGrid.seq1
const seq2g = seqToggleGrid.seq2
const seq3g = seqToggleGrid.seq3
const seq4g = seqToggleGrid.seq4

console.log('4-SEQUENCE CONTROLLER initialized')
console.log('Sequences loaded:', { seq1, seq2, seq3, seq4 })
console.log('NexusUI Version - Ready to perform!')
