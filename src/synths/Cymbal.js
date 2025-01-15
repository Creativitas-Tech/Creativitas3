import p5 from 'p5';
import * as Tone from 'tone';
import { DrumTemplate } from './DrumTemplate';

/**
 * Class representing a cymbal drum synth.
 * 
 * Synth architecture:
 * - 3 oscillators
 * - 3 noise sources
 * - 2 bandpass filters
 * - 2 amplitude envelopes
 * 
 * @extends DrumTemplate
 * @constructor
 * @param {GUI} gui - The p5 GUI instance to create GUI elements.
 */

export class Cymbal extends DrumTemplate {
  
  constructor(gui = null) {
    super();

    this.gui = gui;
    this.name = "Cymbal";

    // Initialize oscillators
    this.oscillators = [];
    this.defaultFrequencies = [893, 2079, 1546];
    this.oscWaveforms = ['sine', 'square', 'triangle', 'sawtooth'];
    for (let i = 0; i < 3; i++) {
      const osc = new Tone.Oscillator({
        type: 'square'
      }).start();
      this.oscillators.push(osc);
    }

    // Initialize noise sources
    this.noises = [];
    this.noiseTypes = ['white', 'pink', 'brown'];
    for (let i = 0; i < 3; i++) {
      const noise = new Tone.Noise('white').start();
      this.noises.push(noise);
    }

    // Mix the oscillators and noise sources
    this.oscMixer = new Tone.Gain(1);
    this.oscillators.forEach(osc => osc.connect(this.oscMixer));
    this.noises.forEach(n => n.connect(this.oscMixer));

    // Filter out lower band and envelope
    this.lowerBandFilter = new Tone.Filter({ type: 'bandpass' });
    this.lowerBandEnv = new Tone.AmplitudeEnvelope({
      attack: 0.01, decay: 0.4, sustain: 0.0, release: 0.1
    });
    this.lowerBandVCA = new Tone.Gain(1);
    // Connect mixer to the lower band filter. Chain filter to envelope and VCA
    this.oscMixer.chain(this.lowerBandFilter, this.lowerBandEnv, this.lowerBandVCA);


    // Filter out upper band, split into two bands, and envelope
    this.upperBandFilter = new Tone.Filter({ type: 'bandpass' });
    this.upperBandFilter1 = new Tone.Filter({ type: 'bandpass' });
    this.upperBandFilter2 = new Tone.Filter({ type: 'bandpass' });
    this.upperBandEnv1 = new Tone.AmplitudeEnvelope({
      attack: 0.01, decay: 0.2, sustain: 0.0, release: 0.1
    });
    this.upperBandEnv2 = new Tone.AmplitudeEnvelope({
      attack: 0.01, decay: 0.3, sustain: 0.0, release: 0.1
    });
    this.upperBandVCA1 = new Tone.Gain(1);
    this.upperBandVCA2 = new Tone.Gain(1);
    // Connect mixer to the upper band filter. Chain filter to envelope and VCA
    this.oscMixer.connect(this.upperBandFilter);
    this.upperBandFilter.chain(this.upperBandFilter1, this.upperBandEnv1, this.upperBandVCA1);
    this.upperBandFilter.chain(this.upperBandFilter2, this.upperBandEnv2, this.upperBandVCA2);

    // Connect VCAs to the ouput node
    this.output = new Tone.Gain(1);
    this.lowerBandVCA.connect(this.output);
    this.upperBandVCA1.connect(this.output);
    this.upperBandVCA2.connect(this.output);

    this.output.toDestination();


    // Initialize GUI if provided
    if (this.gui !== null) {
      this.initGui();
    }
  }

  initGui(gui = this.gui) {
    if (gui === null) {
      console.error('Provide a GUI instance to create GUI elements');
      return;
    }

    for (let i = 0; i < 3; i++) {
      const osc = this.oscillators[i];
      const freq = gui.Knob({
        label: 'freq ' + i,
        mapto: osc.frequency,
        x: 40 + 8 * i,
        y: 12,
        size: 0.5,
        min: 20,
        max: 2500,
        curve: 2,
        value: this.defaultFrequencies[i]
      });

      const oscWaveform = gui.Radio({
        label: 'waveform ' + i,
        radioOptions: this.oscWaveforms,
        callback: (waveform) => {
          osc.type = waveform;
        },
        size: 1,
        x: 7,
        y: 12 + i * 20,
        horizontal: true,
        value: 'square'
      });
    }

    for (let i = 0; i < 3; i++) {
      const noise = this.noises[i];
      const noiseType = gui.Radio({
        label: 'noise ' + i,
        radioOptions: this.noiseTypes,
        callback: (type) => {
          noise.type = type;
        },
        size: 1,
        x: 90,
        y: 12 + i * 16,
        horizontal: true,
        value: 'white'
      });
    }

    const lowerBandFreq = gui.Knob({
      label: 'low band freq',
      mapto: this.lowerBandFilter.frequency,
      x: 20,
      y: 50,
      size: 0.5,
      min: 100,
      max: 5000,
      curve: 2,
      value: 579
    });
    const lowerBandQ = gui.Knob({
      label: 'low band Q',
      mapto: this.lowerBandFilter.Q,
      x: 30,
      y: 50,
      size: 0.5,
      min: 0.5,
      max: 5,
      curve: 2,
      value: 1.45
    });

    const lowerBandDecay = gui.Knob({
      label: 'low decay',
      mapto: this.lowerBandEnv.decay,
      x: 20,
      y: 70,
      size: 0.5,
      min: 0.01,
      max: 1,
      curve: 2,
      value: 0.4
    });
    const lowerBandRelease = gui.Knob({
      label: 'low release',
      mapto: this.lowerBandEnv.release,
      x: 30,
      y: 70,
      size: 0.5,
      min: 0.01,
      max: 1,
      curve: 2,
      value: 0.1
    });

    const upperBandFreq = gui.Knob({
      label: 'up band freq',
      mapto: this.upperBandFilter.frequency,
      x: 57,
      y: 50,
      size: 0.5,
      min: 1000,
      max: 10000,
      curve: 2,
      value: 5976
    });
    const upperBandQ = gui.Knob({
      label: 'up band Q',
      mapto: this.upperBandFilter.Q,
      x: 67,
      y: 50,
      size: 0.5,
      min: 0.5,
      max: 5,
      curve: 2,
      value: 1.4
    });

    const upperBandFreq1 = gui.Knob({
      label: 'up1 band freq',
      mapto: this.upperBandFilter1.frequency,
      x: 45,
      y: 60,
      size: 0.5,
      min: 1000,
      max: 10000,
      curve: 2,
      value: 6795
    });
    const upperBandFreq2 = gui.Knob({
      label: 'up2 band freq',
      mapto: this.upperBandFilter2.frequency,
      x: 70,
      y: 60,
      size: 0.5,
      min: 1000,
      max: 10000,
      curve: 2,
      value: 8735
    });
    const upperBandQ1 = gui.Knob({
      label: 'up1 band Q',
      mapto: this.upperBandFilter1.Q,
      x: 55,
      y: 60,
      size: 0.5,
      min: 0.5,
      max: 5,
      curve: 2,
      value: 1.39
    });
    const upperBandQ2 = gui.Knob({
      label: 'up2 band Q',
      mapto: this.upperBandFilter2.Q,
      x: 80,
      y: 60,
      size: 0.5,
      min: 0.5,
      max: 5,
      curve: 2,
      value: 0.67
    });

    const upperBandDecay1 = gui.Knob({
      label: 'up1 decay',
      mapto: this.upperBandEnv1.decay,
      x: 45,
      y: 70,
      size: 0.5,
      min: 0.01,
      max: 1,
      curve: 2,
      value: 0.2
    });
    const upperBandRelease1 = gui.Knob({
      label: 'up1 release',
      mapto: this.upperBandEnv1.release,
      x: 55,
      y: 70,
      size: 0.5,
      min: 0.01,
      max: 1,
      curve: 2,
      value: 0.1
    });
    const upperBandDecay2 = gui.Knob({
      label: 'up2 decay',
      mapto: this.upperBandEnv2.decay,
      x: 70,
      y: 70,
      size: 0.5,
      min: 0.01,
      max: 1,
      curve: 2,
      value: 0.3
    });
    const upperBandRelease2 = gui.Knob({
      label: 'up2 release',
      mapto: this.upperBandEnv2.release,
      x: 80,
      y: 70,
      size: 0.5,
      min: 0.01,
      max: 1,
      curve: 2,
      value: 0.1
    });

    // Trigger button for the cymbal sound
    const triggerButton = gui.Button({
      label: 'trig',
      callback: () => this.trigger(),
      size: 2,
      border: 20,
      borderColor: [255, 0, 0],
      x: 48,
      y: 36
    });
  }

  trigger() {
    this.lowerBandEnv.triggerAttackRelease(0.01);
    this.upperBandEnv1.triggerAttackRelease(0.01);
    this.upperBandEnv2.triggerAttackRelease(0.01);
  }
}
