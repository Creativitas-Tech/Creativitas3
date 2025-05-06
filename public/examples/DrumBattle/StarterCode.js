Theory.tempo = 180
enableAsciiInput();

// Audio objects and connections
const gui = new p5(sketch, Canvas)
const d = new DrumSampler("LINN")
const output = new Tone.Multiply(.1).toDestination()
const verb = new Diffuseur()
d.connect(output)
d.connect(verb)
verb.connect(output)

// Load drum kit and start
d.loadKit('LINN')
d.sequence('*', '4n', 0)
d.gui = gui
d.start()

// Key mapping configuration
const triggerKeys = {
  "q": { drum: 'O', label: "kick: q" },
  "a": { drum: 'X', label: "snare: a" },
  "z": { drum: '^', label: "open hat: z" },
  "w": { drum: '1', label: "tom 1: w" },
  "s": { drum: '2', label: "tom 2: s" },
  "x": { drum: '3', label: "tom 3: x" }
};

const sequencingKeys = {
  "m": { drum: '*', duration: '32n', label: "closed hat (32n): m" },
  ",": { drum: '*', duration: '16n', label: "closed hat (16n): ," },
  ".": { drum: '*', duration: '8n', label: "closed hat (8n): ." },
  "k": { drum: '1', duration: '32n', label: "tom 1 (32n): k" },
  "l": { drum: '1', duration: '16n', label: "tom 1 (16n): l" },
  ";": { drum: '1', duration: '8n', label: "tom 1 (8n): ;" },
  "o": { drum: '^', duration: '32n', label: "open hat (32n): o" },
  "p": { drum: '^', duration: '16n', label: "open hat (16n): p" },
  "[": { drum: '^', duration: '8n', label: "open hat (8n): [" }
};

// Assign sequence numbers to each key
let sequenceCounter = 1;
Object.keys(sequencingKeys).forEach(key => {
  sequencingKeys[key].sequence = sequenceCounter++;
});
// Give trigger the last sequence
const triggerSequencer = sequenceCounter;


let config;
// Key handlers
const handleOn = (key) => {
  if (triggerKeys[key]) {
    d.triggerDrum(triggerKeys[key].drum, Tone.getTransport().immediate());
    keyMappingElements[key].textColor = [255, 0, 0];
  } else if (sequencingKeys[key]) {
    config = sequencingKeys[key];
    d.sequence(config.drum, config.duration, config.sequence);
    keyMappingElements[key].textColor = [255, 0, 0];
  }
}

const handleOff = (key) => {
  if (sequencingKeys[key]) {
    d.sequence('.', '8n', sequencingKeys[key].sequence);
  }
  if (keyMappingElements[key]) {
    keyMappingElements[key].textColor = [0, 0, 0];
  }
}

// GUI elements
const toggleDrumSampler = (state) => {
  if (state) {
    d.sequence('*', '4n', 0)
  } else {
    d.sequence('.', '4n', 0)
  }
}

const hatToggle = d.gui.Toggle({
  label: "BG closed\nhat"
});
hatToggle.x = 20;
hatToggle.y = 10;
hatToggle.size = 0.8;
hatToggle.textSize = 1;
hatToggle.rawValue = 1;
hatToggle.callback = toggleDrumSampler;

// Section headers
const presets = d.gui.Text({
  label: "Presets:",
});
presets.x = 77;
presets.y = 11.5;
presets.textSize = 1.75;
presets.border = 0;

const keyboardMap = d.gui.Text({
  label: "Keyboard Mappings",
});
keyboardMap.x = 87;
keyboardMap.y = 19;
keyboardMap.textSize = 1.75;
keyboardMap.border = 0;

const triggerMap = d.gui.Text({
  label: "Triggers (tap):",
});
triggerMap.x = 81.3;
triggerMap.y = 24;
triggerMap.textSize = 1.75;
triggerMap.border = 0;

const sequencingMap = d.gui.Text({
  label: "Sequencing (hold):",
});
sequencingMap.x = 92.3;
sequencingMap.y = 24;
sequencingMap.textSize = 1.75;
sequencingMap.border = 0;

// Create individual text elements for each key mapping
const keyMappingElements = {};

// Helper function to create text elements
const createKeyElement = (key, config, x, y, index) => {
  const element = d.gui.Text({
    label: config.label
  });
  element.x = x;
  element.y = y + (index * 3);
  element.textSize = 1.5;
  element.border = 0;
  
  // Store reference to the element
  keyMappingElements[key] = element;
  
  return element;
};

// Create text elements for trigger keys
let triggerIndex = 0;
Object.entries(triggerKeys).forEach(([key, config]) => {
  createKeyElement(key, config, 81.3, 30, triggerIndex++);
});

// Create text elements for sequencing keys
let sequencingIndex = 0;
Object.entries(sequencingKeys).forEach(([key, config]) => {
  createKeyElement(key, config, 92.3, 30, sequencingIndex++);
});

// Set up key press handler
setAsciiHandler((key, state) => { 
  switch (state) {
    case "down": handleOn(key); break;
    case "up": handleOff(key); break;
  }    
});

d.initGui(gui)
// Set opacity of preset-dropdown
d.gui_elements[d.gui_elements.length - 1].style = 2
