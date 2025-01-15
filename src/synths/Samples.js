//
const baseUrl = 'https://specy.github.io/genshinMusic/assets/audio/';
const type = '/0.mp3';
const files = [
  'Aurora', 'Bells', 'Contrabass', 'Drum', 'DunDun',
  'Flute', 'Guitar', 'HandPan', 'Harp', 'Horn', 'Kalimba', 
  'LightGuitar', 'Lyre', 'MantaOcarina', 'Ocarina',
  'Old-Zither', 'Panflute', 'Piano', 'Pipa', 'SFX_TR-909',
  'ToyUkulele', 'Trumpet', 'Vintage-Lyre', 'WinterPiano', 'Xylophone', 'Zither'
];

// Create a dictionary to map file names to URLs and pitches
const soundDict = {};

files.forEach((fileName, index) => {
    const url = baseUrl + fileName + type;
    soundDict[fileName] = { url: url, basePitch: 60 }; // Assume MIDI 60 as base pitch for simplicity
});

console.log(soundDict);


// Function to create and load a sampler for a specific file
function loadSampler(index) {
    const num = index % files.length;  // Wrap around if index exceeds files array length
    const fileName = files[num];
    const fileUrl = baseUrl + fileName + type; // Construct the full URL
   
    // Print to check values
    console.log(`Loading ${fileName} with URL: ${fileUrl}`);
    
    // Create a sampler and load the sample into the specified note (MIDI 60)
    const sampler = new Tone.Sampler({
        urls: {
            [60]: fileUrl  // Map middle C to the sample URL
        }
    }).toDestination();

    return sampler;
}
