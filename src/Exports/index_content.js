export const index_html = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Web Audio Synth</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.js"></script>
    <script src="
    https://cdn.jsdelivr.net/npm/tone@14.7.77/build/Tone.min.js
    "></script>
</head>
<body>

    <!-- Create a canvas element with the id "canvas1" -->
    <canvas id="canvas1"></canvas>

    <!-- Include p5Elements.js -->
    <script type="module" src="./libraries/p5Elements.js"></script>

    <!-- Include the oscilloscope.js file from one level above -->
    <script type="module" src="./libraries/oscilloscope.js"></script>

    <!-- Include MidiKeyboard.js -->
    <script type="module" src="./libraries/MidiKeyboard.js"></script>

    <!-- Include p5Library.js -->
    <script type="module" src="./libraries/p5Library.js"></script>

    <!-- Include p5Themes.json (assuming it's in the same directory) -->
    <script type="module" src="./libraries/p5Themes.json"></script>

    <!-- Include Midi.js -->
    <script type="module" src="./libraries/Midi.js"></script>

    <!-- Include the script.js file -->
    <script type="module" src="script.js"></script>
</body>
</html>

`