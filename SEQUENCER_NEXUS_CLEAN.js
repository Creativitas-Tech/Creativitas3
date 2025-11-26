/**
SYSTEM NAME: 4-SEQUENCE CONTROLLER (NexusUI Version)
CONVERTED FROM: p5 GUI format
DATE: NOV 18, 2025
**/

/*
  Alt(option)-Enter: Evaluate Line
  Alt(option)-Shift-Enter: Evaluate Block
*/

initCollab()
chClient.username = 'Change name'

// TONE.JS AUDIO CHAIN
const vco = new Tone.Oscillator().start()
const vcf = new Tone.Filter()
const vca = new Tone.Multiply()
const output = new Tone.Multiply(0.1).toDestination()
vcf.connect(vca)
vca.connect(output)
const env = new Tone.Envelope()
env.connect(vca.factor)

// SYNTH INSTANCES
const seq1 = new Twinkle()
const seq2 = new Daisy()
const seq3 = new DrumSampler()
seq3.loadPreset('breakbeat')
const seq4 = new Player('PintoBass.wav')

// ROUTING
seq1.connect(output)
seq2.connect(vca)
seq3.connect(vca)
seq4.connect(vca)

Theory.tempo = 90

// HELPER FUNCTION
const startPattern = (synth, pattern, rate) => {
  synth.stop()
  synth.start()
  synth.sequence(pattern, rate)
}

// SEQUENCE ACTIONS MAPPING
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

// GRID CONFIGURATION (match p5 proportions)
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

// SEQUENCE ROW DATA
const sequenceRows = [
  { id: 'seq1', label: 'sequence 1', options: ['1c', '2c', '3c', 'stop'] },
  { id: 'seq2', label: 'sequence 2', options: ['1b', '2b', '3b', 'stop'] },
  { id: 'seq3', label: 'sequence 3', options: ['1d', '2d', '3d', 'stop'] },
  { id: 'seq4', label: 'sequence 4', options: ['1a', '2a', '3a', 'stop'] }
]

// CREATE BUTTONS FOR ALL SEQUENCES
// ROW 0 - SEQUENCE 1
const row0 = sequenceRows[0]
const toggle_0_0 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_0_0._rowId = row0.id
toggle_0_0._option = row0.options[0]
toggle_0_0._rowLabel = row0.label
toggle_0_0._accentColor = '#AEC6CF'
toggle_0_0.element.style.position = 'absolute'
toggle_0_0.element.style.left = (gridOrigin.x + 0 * gridSpacing.x) + 'px'
toggle_0_0.element.style.top = (gridOrigin.y + 0 * gridSpacing.y) + 'px'
toggle_0_0.colorize('accent', '#AEC6CF')
toggle_0_0.colorize('fill', '#303030')
toggle_0_0.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq1[1].state = false
    seqToggleGrid.seq1[2].state = false
    seqToggleGrid.seq1[3].state = false
    sequenceActions.seq1['1c']()
    console.log('sequence 1: 1C activated')
  }
})
seqToggleGrid.seq1[0] = toggle_0_0

const toggle_0_1 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_0_1._rowId = row0.id
toggle_0_1._option = row0.options[1]
toggle_0_1._rowLabel = row0.label
toggle_0_1._accentColor = '#AEC6CF'
toggle_0_1.element.style.position = 'absolute'
toggle_0_1.element.style.left = (gridOrigin.x + 1 * gridSpacing.x) + 'px'
toggle_0_1.element.style.top = (gridOrigin.y + 0 * gridSpacing.y) + 'px'
toggle_0_1.colorize('accent', '#AEC6CF')
toggle_0_1.colorize('fill', '#303030')
toggle_0_1.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq1[0].state = false
    seqToggleGrid.seq1[2].state = false
    seqToggleGrid.seq1[3].state = false
    sequenceActions.seq1['2c']()
    console.log('sequence 1: 2C activated')
  }
})
seqToggleGrid.seq1[1] = toggle_0_1

const toggle_0_2 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_0_2._rowId = row0.id
toggle_0_2._option = row0.options[2]
toggle_0_2._rowLabel = row0.label
toggle_0_2._accentColor = '#AEC6CF'
toggle_0_2.element.style.position = 'absolute'
toggle_0_2.element.style.left = (gridOrigin.x + 2 * gridSpacing.x) + 'px'
toggle_0_2.element.style.top = (gridOrigin.y + 0 * gridSpacing.y) + 'px'
toggle_0_2.colorize('accent', '#AEC6CF')
toggle_0_2.colorize('fill', '#303030')
toggle_0_2.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq1[0].state = false
    seqToggleGrid.seq1[1].state = false
    seqToggleGrid.seq1[3].state = false
    sequenceActions.seq1['3c']()
    console.log('sequence 1: 3C activated')
  }
})
seqToggleGrid.seq1[2] = toggle_0_2

const toggle_0_3 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_0_3._rowId = row0.id
toggle_0_3._option = row0.options[3]
toggle_0_3._rowLabel = row0.label
toggle_0_3._accentColor = '#FF6961'
toggle_0_3.element.style.position = 'absolute'
toggle_0_3.element.style.left = (gridOrigin.x + 3 * gridSpacing.x) + 'px'
toggle_0_3.element.style.top = (gridOrigin.y + 0 * gridSpacing.y) + 'px'
toggle_0_3.colorize('accent', '#FF6961')
toggle_0_3.colorize('fill', '#303030')
toggle_0_3.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq1[0].state = false
    seqToggleGrid.seq1[1].state = false
    seqToggleGrid.seq1[2].state = false
    sequenceActions.seq1.stop()
    console.log('sequence 1: STOP activated')
  }
})
seqToggleGrid.seq1[3] = toggle_0_3

// ROW 1 - SEQUENCE 2
const row1 = sequenceRows[1]
const toggle_1_0 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_1_0._rowId = row1.id
toggle_1_0._option = row1.options[0]
toggle_1_0._rowLabel = row1.label
toggle_1_0._accentColor = '#AEC6CF'
toggle_1_0.element.style.position = 'absolute'
toggle_1_0.element.style.left = (gridOrigin.x + 0 * gridSpacing.x) + 'px'
toggle_1_0.element.style.top = (gridOrigin.y + 1 * gridSpacing.y) + 'px'
toggle_1_0.colorize('accent', '#AEC6CF')
toggle_1_0.colorize('fill', '#303030')
toggle_1_0.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq2[1].state = false
    seqToggleGrid.seq2[2].state = false
    seqToggleGrid.seq2[3].state = false
    sequenceActions.seq2['1b']()
    console.log('sequence 2: 1B activated')
  }
})
seqToggleGrid.seq2[0] = toggle_1_0

const toggle_1_1 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_1_1._rowId = row1.id
toggle_1_1._option = row1.options[1]
toggle_1_1._rowLabel = row1.label
toggle_1_1._accentColor = '#AEC6CF'
toggle_1_1.element.style.position = 'absolute'
toggle_1_1.element.style.left = (gridOrigin.x + 1 * gridSpacing.x) + 'px'
toggle_1_1.element.style.top = (gridOrigin.y + 1 * gridSpacing.y) + 'px'
toggle_1_1.colorize('accent', '#AEC6CF')
toggle_1_1.colorize('fill', '#303030')
toggle_1_1.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq2[0].state = false
    seqToggleGrid.seq2[2].state = false
    seqToggleGrid.seq2[3].state = false
    sequenceActions.seq2['2b']()
    console.log('sequence 2: 2B activated')
  }
})
seqToggleGrid.seq2[1] = toggle_1_1

const toggle_1_2 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_1_2._rowId = row1.id
toggle_1_2._option = row1.options[2]
toggle_1_2._rowLabel = row1.label
toggle_1_2._accentColor = '#AEC6CF'
toggle_1_2.element.style.position = 'absolute'
toggle_1_2.element.style.left = (gridOrigin.x + 2 * gridSpacing.x) + 'px'
toggle_1_2.element.style.top = (gridOrigin.y + 1 * gridSpacing.y) + 'px'
toggle_1_2.colorize('accent', '#AEC6CF')
toggle_1_2.colorize('fill', '#303030')
toggle_1_2.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq2[0].state = false
    seqToggleGrid.seq2[1].state = false
    seqToggleGrid.seq2[3].state = false
    sequenceActions.seq2['3b']()
    console.log('sequence 2: 3B activated')
  }
})
seqToggleGrid.seq2[2] = toggle_1_2

const toggle_1_3 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_1_3._rowId = row1.id
toggle_1_3._option = row1.options[3]
toggle_1_3._rowLabel = row1.label
toggle_1_3._accentColor = '#FF6961'
toggle_1_3.element.style.position = 'absolute'
toggle_1_3.element.style.left = (gridOrigin.x + 3 * gridSpacing.x) + 'px'
toggle_1_3.element.style.top = (gridOrigin.y + 1 * gridSpacing.y) + 'px'
toggle_1_3.colorize('accent', '#FF6961')
toggle_1_3.colorize('fill', '#303030')
toggle_1_3.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq2[0].state = false
    seqToggleGrid.seq2[1].state = false
    seqToggleGrid.seq2[2].state = false
    sequenceActions.seq2.stop()
    console.log('sequence 2: STOP activated')
  }
})
seqToggleGrid.seq2[3] = toggle_1_3

// ROW 2 - SEQUENCE 3
const row2 = sequenceRows[2]
const toggle_2_0 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_2_0._rowId = row2.id
toggle_2_0._option = row2.options[0]
toggle_2_0._rowLabel = row2.label
toggle_2_0._accentColor = '#AEC6CF'
toggle_2_0.element.style.position = 'absolute'
toggle_2_0.element.style.left = (gridOrigin.x + 0 * gridSpacing.x) + 'px'
toggle_2_0.element.style.top = (gridOrigin.y + 2 * gridSpacing.y) + 'px'
toggle_2_0.colorize('accent', '#AEC6CF')
toggle_2_0.colorize('fill', '#303030')
toggle_2_0.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq3[1].state = false
    seqToggleGrid.seq3[2].state = false
    seqToggleGrid.seq3[3].state = false
    sequenceActions.seq3['1d']()
    console.log('sequence 3: 1D activated')
  }
})
seqToggleGrid.seq3[0] = toggle_2_0

const toggle_2_1 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_2_1._rowId = row2.id
toggle_2_1._option = row2.options[1]
toggle_2_1._rowLabel = row2.label
toggle_2_1._accentColor = '#AEC6CF'
toggle_2_1.element.style.position = 'absolute'
toggle_2_1.element.style.left = (gridOrigin.x + 1 * gridSpacing.x) + 'px'
toggle_2_1.element.style.top = (gridOrigin.y + 2 * gridSpacing.y) + 'px'
toggle_2_1.colorize('accent', '#AEC6CF')
toggle_2_1.colorize('fill', '#303030')
toggle_2_1.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq3[0].state = false
    seqToggleGrid.seq3[2].state = false
    seqToggleGrid.seq3[3].state = false
    sequenceActions.seq3['2d']()
    console.log('sequence 3: 2D activated')
  }
})
seqToggleGrid.seq3[1] = toggle_2_1

const toggle_2_2 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_2_2._rowId = row2.id
toggle_2_2._option = row2.options[2]
toggle_2_2._rowLabel = row2.label
toggle_2_2._accentColor = '#AEC6CF'
toggle_2_2.element.style.position = 'absolute'
toggle_2_2.element.style.left = (gridOrigin.x + 2 * gridSpacing.x) + 'px'
toggle_2_2.element.style.top = (gridOrigin.y + 2 * gridSpacing.y) + 'px'
toggle_2_2.colorize('accent', '#AEC6CF')
toggle_2_2.colorize('fill', '#303030')
toggle_2_2.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq3[0].state = false
    seqToggleGrid.seq3[1].state = false
    seqToggleGrid.seq3[3].state = false
    sequenceActions.seq3['3d']()
    console.log('sequence 3: 3D activated')
  }
})
seqToggleGrid.seq3[2] = toggle_2_2

const toggle_2_3 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_2_3._rowId = row2.id
toggle_2_3._option = row2.options[3]
toggle_2_3._rowLabel = row2.label
toggle_2_3._accentColor = '#FF6961'
toggle_2_3.element.style.position = 'absolute'
toggle_2_3.element.style.left = (gridOrigin.x + 3 * gridSpacing.x) + 'px'
toggle_2_3.element.style.top = (gridOrigin.y + 2 * gridSpacing.y) + 'px'
toggle_2_3.colorize('accent', '#FF6961')
toggle_2_3.colorize('fill', '#303030')
toggle_2_3.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq3[0].state = false
    seqToggleGrid.seq3[1].state = false
    seqToggleGrid.seq3[2].state = false
    sequenceActions.seq3.stop()
    console.log('sequence 3: STOP activated')
  }
})
seqToggleGrid.seq3[3] = toggle_2_3

// ROW 3 - SEQUENCE 4
const row3 = sequenceRows[3]
const toggle_3_0 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_3_0._rowId = row3.id
toggle_3_0._option = row3.options[0]
toggle_3_0._rowLabel = row3.label
toggle_3_0._accentColor = '#AEC6CF'
toggle_3_0.element.style.position = 'absolute'
toggle_3_0.element.style.left = (gridOrigin.x + 0 * gridSpacing.x) + 'px'
toggle_3_0.element.style.top = (gridOrigin.y + 3 * gridSpacing.y) + 'px'
toggle_3_0.colorize('accent', '#AEC6CF')
toggle_3_0.colorize('fill', '#303030')
toggle_3_0.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq4[1].state = false
    seqToggleGrid.seq4[2].state = false
    seqToggleGrid.seq4[3].state = false
    sequenceActions.seq4['1a']()
    console.log('sequence 4: 1A activated')
  }
})
seqToggleGrid.seq4[0] = toggle_3_0

const toggle_3_1 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_3_1._rowId = row3.id
toggle_3_1._option = row3.options[1]
toggle_3_1._rowLabel = row3.label
toggle_3_1._accentColor = '#AEC6CF'
toggle_3_1.element.style.position = 'absolute'
toggle_3_1.element.style.left = (gridOrigin.x + 1 * gridSpacing.x) + 'px'
toggle_3_1.element.style.top = (gridOrigin.y + 3 * gridSpacing.y) + 'px'
toggle_3_1.colorize('accent', '#AEC6CF')
toggle_3_1.colorize('fill', '#303030')
toggle_3_1.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq4[0].state = false
    seqToggleGrid.seq4[2].state = false
    seqToggleGrid.seq4[3].state = false
    sequenceActions.seq4['2a']()
    console.log('sequence 4: 2A activated')
  }
})
seqToggleGrid.seq4[1] = toggle_3_1

const toggle_3_2 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_3_2._rowId = row3.id
toggle_3_2._option = row3.options[2]
toggle_3_2._rowLabel = row3.label
toggle_3_2._accentColor = '#AEC6CF'
toggle_3_2.element.style.position = 'absolute'
toggle_3_2.element.style.left = (gridOrigin.x + 2 * gridSpacing.x) + 'px'
toggle_3_2.element.style.top = (gridOrigin.y + 3 * gridSpacing.y) + 'px'
toggle_3_2.colorize('accent', '#AEC6CF')
toggle_3_2.colorize('fill', '#303030')
toggle_3_2.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq4[0].state = false
    seqToggleGrid.seq4[1].state = false
    seqToggleGrid.seq4[3].state = false
    sequenceActions.seq4['3a']()
    console.log('sequence 4: 3A activated')
  }
})
seqToggleGrid.seq4[2] = toggle_3_2

const toggle_3_3 = new Nexus.Button('#Canvas', { size: [buttonSize.width, buttonSize.height], mode: 'toggle', state: false })
toggle_3_3._rowId = row3.id
toggle_3_3._option = row3.options[3]
toggle_3_3._rowLabel = row3.label
toggle_3_3._accentColor = '#FF6961'
toggle_3_3.element.style.position = 'absolute'
toggle_3_3.element.style.left = (gridOrigin.x + 3 * gridSpacing.x) + 'px'
toggle_3_3.element.style.top = (gridOrigin.y + 3 * gridSpacing.y) + 'px'
toggle_3_3.colorize('accent', '#FF6961')
toggle_3_3.colorize('fill', '#303030')
toggle_3_3.on('change', function(v) {
  if (v) {
    seqToggleGrid.seq4[0].state = false
    seqToggleGrid.seq4[1].state = false
    seqToggleGrid.seq4[2].state = false
    sequenceActions.seq4.stop()
    console.log('sequence 4: STOP activated')
  }
})
seqToggleGrid.seq4[3] = toggle_3_3

// ENABLE TOGGLE
const enable_toggle = new Nexus.Toggle('#Canvas', { size: [60, 30], state: false })
enable_toggle.element.style.position = 'absolute'
enable_toggle.element.style.left = (gridOrigin.x + 500) + 'px'
enable_toggle.element.style.top = gridOrigin.y + 'px'
enable_toggle.colorize('accent', '#8200C8')
enable_toggle.colorize('fill', '#303030')
enable_toggle.on('change', function(value) {
  vca.factor.value = value ? 1 : 0
  console.log('VCA Enabled:', value)
})

// ASSIGN TO VARIABLES FOR BACKWARD COMPATIBILITY
const seq1g = seqToggleGrid.seq1
const seq2g = seqToggleGrid.seq2
const seq3g = seqToggleGrid.seq3
const seq4g = seqToggleGrid.seq4

console.log('4-SEQUENCE CONTROLLER initialized')
console.log('Sequences loaded:', { seq1, seq2, seq3, seq4 })
console.log('NexusUI Version - Ready to perform!')
