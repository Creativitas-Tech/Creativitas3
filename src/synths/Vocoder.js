/*
Vocoder

Single vco monosynth
* vco->vcf->vca->output

*/

import * as Tone from 'tone';
// import VocoderPresets from './synthPresets/VocoderPresets.json';
import { MonophonicTemplate } from './MonophonicTemplate.js';
import {Parameter} from './ParameterModule.js'
import basicLayout from './layouts/basicLayout.json';
import paramDefinitions from './params/vocoderParams.js';

export class Vocoder extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
		this.presets = {}
		this.synthPresetName = "VocoderPresets"
		this.accessPreset()
    this.isGlide = false
    this.name = "Vocoder"


    // Assume you already have an input and it's connected to the audio context
    this.mic = new Tone.UserMedia();
    this.inputGain = new Tone.Gain(1)
    this.mic.open();
    this.mic.connect(this.inputGain);

    // Carrier source (can be noise or oscillator)
    //this.carrier = new Tone.Noise("white").start();
    this.carrier = new Tone.PulseOscillator(100).start()
    this.noise = new Tone.Noise({volume:-48}).start()
    this.carrierGain = new Tone.Gain(0.5)
    this.output = new Tone.Gain(1)
    this.carrierGain.connect(this.output)
    this.external = new Tone.Multiply(1)

    // Use a set of bandpass filters and VCAs to reconstruct the signal
    this.numBands = 16;
    this.analysisBands = []
    this.bands = [];
    this.logFrequencies = [...Array(this.numBands)].map((_, i) =>
      100 * Math.pow(2, i * (Math.log2(5000 / 100) / (this.numBands - 1)))
    ); // log-spaced from 100 Hz to 8 kHz

    this.centerFrequencies = this.logFrequencies
    this.moogFrequencies = [50,159,200,252,317,400,504,635,800,1008,1270,1600,2016,2504,3200,4032,5080]
    this.rolandFrequencies = [100, 140, 200, 280, 400, 560, 800, 1000, 1300, 1600, 2000, 2500, 3200, 4000, 4500, 5000]
    this.emsFrequencies = [70, 100, 140, 200, 280, 400, 560, 800, 1120, 1400, 1800, 2240, 2800, 3600, 5000, 7500]
    this.sennheiserFrequencies = [80, 120, 180, 250, 350, 500, 700, 1000, 1400, 1800, 2500, 3200, 4000, 5000, 6000, 7000]

    this.centerFrequencies.forEach(freq => {
      const filterA = new Tone.Filter({frequency:freq, type:"bandpass",Q:10});
      const follower = new Tone.Follower(0.05); // attack/release in seconds
      filterA.connect(follower)
      this.inputGain.connect(filterA)
      this.analysisBands.push({ filterA, follower, freq });

      const filter = new Tone.Filter({frequency:freq, type:"bandpass",Q:10});
      const gain = new Tone.Gain(0).connect(this.carrierGain);
      this.carrier.connect(filter);
      this.external.connect(filter);
      this.noise.connect(filter);
      filter.connect(gain);
      follower.connect(gain.gain)
      this.bands.push({ filter, gain, freq });
    });

    // // Update gains based on FFT values
    // this.loop = new Tone.Loop((time) => {
    //   const spectrum = this.fft.getValue(); // returns an array of decibel values
    //   this.bands.forEach(({ gain, freq }, i) => {
    //     // Map frequency to closest bin
    //     const index = Math.round((freq / (Tone.context.sampleRate / 2)) * (fftSize / 2));
    //     const amp = Tone.dbToGain(spectrum[index] || -Infinity);
    //     //console.log(freq,index,amp)
    //     gain.gain.rampTo( amp, .02);
    //   });
    //   //console.log(this.bands[4]['gain'].gain.value)
    // }, 0.025); // you may need to experiment with timing resolution

    // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
    setTimeout(()=>{this.loadPreset('default')}, 500);
  }//constructor

  setQs(newQ) {
    this.analysisBands.forEach(b => b.filterA.Q.value = newQ);
    this.bands.forEach(b => b.filter.Q.value = newQ);
  }

  setFrequencies(newFrequencies) {
    this.centerFrequencies = newFrequencies;

    newFrequencies.forEach((freq, i) => {
      if (this.analysisBands[i]) {
        this.analysisBands[i].filterA.frequency.value = freq;
        this.analysisBands[i].freq = freq;
      }
      if (this.bands[i]) {
        this.bands[i].filter.frequency.value = freq;
        this.bands[i].freq = freq;
      }
    });
  }

  setFollowerAttackRelease(attack, release) {
    this.analysisBands.forEach((b, i) => {
      // b.follower is not stored — you'll want to do that in your loop.
      if (b.follower) {
        b.follower.attack = attack;
        b.follower.release = release;
      }
    });
  }
}