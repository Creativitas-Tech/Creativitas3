import * as Tone from 'tone';

export class DrumSynth {
    constructor(options = {}) {
        const defaults = {
            toneFrequency: 50,
            pitchEnv: 100,
            amRatio: 1.0,
            toneGain: 0.5,
            noiseShape: "bandpass",
            noiseLevel: 0.5,
            toneLevel: 0.5,
            toneDecay: 0.2,
            noiseDecay: 0.3,
            cutoff: 2000,
            resonance: 1,
            volume: 0.5,
        };
        this.params = { ...defaults, ...options };

        // Oscillator and AM stage
        this.osc = new Tone.Oscillator(this.params.toneFrequency, "sine").start();
        this.oscFrequency = new Tone.Signal(this.params.toneFrequency)
        this.oscFrequency.connect(this.osc.frequency)
        this.modOsc = new Tone.Oscillator(this.params.toneFrequency * this.params.amRatio, "sine").start();
        this.modGain = new Tone.Gain(0.5); // Modulation depth
        this.modOsc.connect(this.modGain);
        this.modGain.connect(this.osc.volume); // AM stage

        // Waveshaper and gain for tone
        this.toneGain = new Tone.Gain(this.params.toneGain);
        this.waveshaper = new Tone.WaveShaper(x => Math.sin(x * Math.PI));
        this.osc.connect(this.waveshaper);
        this.waveshaper.connect(this.toneGain);

        // Noise generator
        this.noise = new Tone.Noise("white").start();
        this.noiseFilter = new Tone.Filter(this.params.cutoff, this.params.noiseShape);
        this.noiseGain = new Tone.Gain(this.params.noiseLevel);
        this.noise.connect(this.noiseFilter);
        this.noiseFilter.connect(this.noiseGain);

        // Envelopes
        this.toneEnv = new Tone.AmplitudeEnvelope({
            attack: 0.0,
            decay: this.params.toneDecay,
            sustain: 1,
            release:this.params.toneDecay,
        });
        this.noiseEnv = new Tone.AmplitudeEnvelope({
            attack: 0.0,
            decay: this.params.noiseDecay,
            sustain: 1,
            release: this.params.noiseDecay,
        });
        this.pitchEnvelope = new Tone.Envelope({
            attack: 0.0,
            decay: this.params.toneDecay,
            sustain: 1,
            release: this.params.toneDecay,
        });
        this.pitchEnvDepth = new Tone.Multiply(this.params.pitchEnv)
        this.pitchEnvelope.connect(this.pitchEnvDepth)
        this.pitchEnvDepth.connect(this.osc.frequency)

        this.toneGain.connect(this.toneEnv);
        this.noiseGain.connect(this.noiseEnv);

        // Final filter and output
        this.finalFilter = new Tone.Filter();
        this.finalFilter.frequency.value = this.params.cutoff
        this.finalFilter.type =  "lowpass"
        this.finalFilter.Q.value =  this.params.resonance
        this. output = new Tone.Multiply(this.params.volume);
        this.toneEnv.connect(this.finalFilter);
        this.noiseEnv.connect(this.finalFilter);
        this.finalFilter.connect(this.output);
    }

    // Getters and setters
    get toneFrequency() {
        return this.params.toneFrequency;
    }
    set toneFrequency(value) {
        this.params.toneFrequency = value;
        this.oscFrequency.value = value;
        this.modOsc.frequency.value = value * this.params.amRatio;
    }

    get amRatio() {
        return this.params.amRatio;
    }
    set amRatio(value) {
        this.params.amRatio = value;
        this.modOsc.frequency.value = this.params.toneFrequency * value;
    }

    get toneGain2() {
        return this.params.toneGain;
    }
    set toneGain2(value) {
        this.params.toneGain = value;
        this.toneGain.gain.value = value;
    }

    get noiseShape() {
        return this.params.noiseShape;
    }
    set noiseShape(value) {
        this.params.noiseShape = value;
        this.noiseFilter.type = value;
    }

    get noiseLevel() {
        return this.params.noiseLevel;
    }
    set noiseLevel(value) {
        this.params.noiseLevel = value;
        this.noiseGain.gain.value = value;
    }

    get toneLevel() {
        return this.params.toneLevel;
    }
    set toneLevel(value) {
        this.params.toneLevel = value;
        this.output.factor.value = value;
    }

    get toneDecay() {
        return this.params.toneDecay;
    }
    set toneDecay(value) {
        this.params.toneDecay = value;
        this.toneEnv.decay = value;
        this.pitchEnvelope.decay = value
    }
    get pitchEnv() {
        return this.params.pitchEnv;
    }
    set pitchEnv(value) {
        this.params.pitchEnv = value;
        this.pitchEnvDepth.factor.value = value;
    }

    get noiseDecay() {
        return this.params.noiseDecay;
    }
    set noiseDecay(value) {
        this.params.noiseDecay = value;
        this.noiseEnv.decay = value;
    }

    get cutoff() {
        return this.params.cutoff;
    }
    set cutoff(value) {
        this.params.cutoff = value;
        this.finalFilter.frequency.value = value;
        this.noiseFilter.frequency.value = value;
    }

    get resonance() {
        return this.params.resonance;
    }
    set resonance(value) {
        this.params.resonance = value;
        this.finalFilter.Q.value = value;
    }

    get volume() {
        return this.params.volume;
    }
    set volume(value) {
        this.params.volume = value;
        this.output.factor.factor.value = value;
    }

    // Trigger a drum hit
    trigger(time = Tone.now()) {
        this.toneEnv.triggerAttackRelease(.05, time);
        this.noiseEnv.triggerAttackRelease(.05, time);
        this.pitchEnvelope.triggerAttackRelease(.05, time);
    }
}