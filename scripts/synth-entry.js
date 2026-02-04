// Export all modules - webpack will handle the global exposure

import '../src/Editor-Initalizer.js';

// Core modules
export * from '../src/AsciiKeyboard.js';
// export * from '../src/CollabHub.js';
export * from '../src/CollabSlob.js';
export * from '../src/midi/Midi.js';
export * from '../src/p5Elements.js';
export * from '../src/p5Library.js';
export * from '../src/TheoryModule.js';
export * from '../src/timing/TimingStrategyManager.js';
export * from '../src/timing/TimingModalDialog.js'; // Added for web export timing UI
export * from '../src/MultiVCO.js';
export * from '../src/Ornament.js';
export * from '../src/Seq.js';
export * from '../src/Turing.js';
export * from '../src/Utilities.js';

// Synths
export * from '../src/synths/AnalogDelay.js';
export * from '../src/synths/Caverns.js';
export * from '../src/synths/Chorus.js';
export * from '../src/synths/Cymbal.js';
export * from '../src/synths/Daisies.js';
export * from '../src/synths/DatoDuo.js';
export * from '../src/synths/Delay.js';
export * from '../src/synths/DelayOp.js';
export * from '../src/synths/Diffuseur.js';
export * from '../src/synths/Distortion.js';
export * from '../src/synths/Drone.js';
export * from '../src/synths/DrumSampler.js';
export * from '../src/synths/DrumTemplate.js';
export * from '../src/synths/DrumVoice.js';
export * from '../src/synths/Drummer.js';
export * from '../src/synths/ESPSynth.js';
export * from '../src/synths/Feedback.js';
export * from '../src/synths/FM4.js';
export * from '../src/synths/KP.js';
export * from '../src/synths/Kick.js';
export * from '../src/synths/MidiOut.js';
export * from '../src/synths/MonophonicTemplate.js';
export * from '../src/synths/NoiseVoice.js';
export * from '../src/synths/Panner.js';
export * from '../src/synths/ParameterModule.js';
export * from '../src/synths/PercussionVoice.js';
export * from '../src/synths/Player.js';
export * from '../src/synths/Polyphony.js';
export * from '../src/synths/Quadrophonic.js';
export * from '../src/synths/Resonator.js';
export * from '../src/synths/Reverb.js';
export * from '../src/synths/Rumble.js';
export * from '../src/synths/Samples.js';
export * from '../src/synths/SimpleSeq.js';
export * from '../src/synths/Simpler.js';
export * from '../src/synths/Snare.js';
export * from '../src/synths/Stripe.js';
export * from '../src/synths/Sympathy.js';
export * from '../src/synths/ToneWood.js';
export * from '../src/synths/Twinkle.js';
export * from '../src/synths/waveshapers.js';
export * from '../src/synths/Vocoder.js';

// Visualizers
export * from '../src/visualizers/Oscilloscope.js';
export * from '../src/visualizers/Spectroscope.js';
export * from '../src/visualizers/Spectrogram.js';
export * from '../src/visualizers/PlotTransferFunction.js';
export * from '../src/visualizers/VisualizeArray.js';
export * from '../src/visualizers/CircularVisualizer.js';

// Nexus
export * from '../src/nexus/Button.js';
export * from '../src/nexus/Dial.js';
export * from '../src/nexus/NexusElement.js';
export * from '../src/nexus/NumberBox.js';
export * from '../src/nexus/parentNexus.js';
export * from '../src/nexus/RadioButton.js';
export * from '../src/nexus/Slider.js';
export * from '../src/nexus/Switch.js';

// Generators
export * from '../src/generators/MarkovChain.js';

export * from '../src/midi/MidiKeyboard2.js';
