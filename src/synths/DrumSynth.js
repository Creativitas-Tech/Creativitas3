import p5 from 'p5';
import * as Tone from 'tone';
import {Parameter} from './ParameterModule.js'
import presets from './synthPresets/DrumSynthPresets.json';
import dlayout from './layouts/drumLayout.json';
import { DrumTemplate } from './DrumTemplate';
import paramDefinitions from './params/drumSynthParams.js';
import { sketch } from '../p5Library.js'
import Groove from '../Groove.js'

export class DrumSynth extends DrumTemplate{
    constructor(options = {}) {
        super()
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
        //this.layout = dlayout
        this.name = 'DrumSynth'
        this.presets = presets
		this.synthPresetName = "DrumSynthPresets"
		//this.accessPreset()


        // Oscillator and AM stage
        this.frequency = new Tone.Signal(this.params.toneFrequency)
        this.tuning = new Tone.Multiply(1)
        this.harmonicity = new Tone.Multiply(1); // Modulation depth
        this.frequency.connect( this.harmonicity)
        this.vco = new Tone.Oscillator(this.params.toneFrequency, "sine").start();
        this.frequency.connect(this.tuning)
        this.tuning.connect(this.vco.frequency)
        this.modVco = new Tone.Oscillator(this.params.toneFrequency * this.params.amRatio, "sine").start();
        this.harmonicity.connect( this. modVco.frequency)
        this.amDepth = new Tone.Gain(0.); // Modulation depth
        this.fmDepth = new Tone.Gain(0.); // Modulation depth
        this.modVco.connect(this.amDepth);
        this.modVco.connect(this.fmDepth);
        this.modIndex = new Tone.Signal()
        this.indexMult = new Tone.Multiply()
        this.modIndex.connect(this.indexMult.factor)
        this.harmonicity.connect(this.indexMult)        
        this.vcoCarrier = new Tone.Signal(1)
        this.vcoCarrier.connect(this.vco.volume)
        this.amDepth.connect(this.vco.volume); // AM stage
        this.indexMult.connect(this.fmDepth.gain)
        this.fmDepth.connect(this.vco.frequency)

        // Waveshaper and gain for tone
        this.drive = new Tone.Gain(this.params.toneGain);
        this.waveshaper = new Tone.WaveShaper(value=> Math.tanh(value*4));
        this.vco.connect(this.drive);
        this.drive.connect(this.waveshaper)

        // Noise generator
        this.noise = new Tone.Noise("white").start();
        this.noiseFilter = new Tone.Filter(this.params.cutoff, this.params.noiseShape);
        this.noiseFilter.type = 'bandpass'
        this.noiseGain = new Tone.Gain(this.params.noiseLevel);
        this.noise.connect(this.noiseFilter);
        this.noiseFilter.connect(this.noiseGain);
        this.noiseVcfEnvDepth = new Tone.Multiply()
        this.noiseVcfEnvDepth.connect(this.noiseFilter.frequency)

        // Envelopes
        this.env = new Tone.Envelope({
            attack: 0.0,
            decay: this.params.toneDecay,
            sustain: 0,
            release:this.params.toneDecay,
        });
        this.noiseEnv = new Tone.Envelope({
            attack: 0.0,
            decay: this.params.noiseDecay,
            sustain: 0,
            release: this.params.noiseDecay,
        });
        this.pitchEnvelope = new Tone.Envelope({
            attack: 0.0,
            decay: this.params.toneDecay,
            sustain: 0,
            release: this.params.toneDecay,
        });
        this.pitchEnvDepth = new Tone.Multiply(this.params.pitchEnv)
        this.pitchEnvelope.connect(this.pitchEnvDepth)
        this.pitchEnvDepth.connect(this.vco.frequency)
        this.pitchEnvDepth.connect(this.harmonicity)
        //this.pitchEnvelope.releaseCurve = 'linear'
        //this.pitchEnvelope.decayCurve = 'linear'

        this.toneVca = new Tone.Multiply()
        this.toneGain = new Tone.Gain(1)
        this.env.connect(this.toneVca.factor)
        this.waveshaper.connect(this.toneVca);
        this.noiseVca = new Tone.Multiply()
        this.noiseEnv.connect(this. noiseVca.factor)
        this.noiseGain.connect(this.noiseVca);
        this.noiseCutoff = new Tone.Signal(2000)
        this.noiseCutoff.connect( this.noiseFilter.frequency)
        this.noiseEnv.connect(this.noiseVcfEnvDepth)

        // Final filter and output
        this.finalFilter = new Tone.Filter();
        this.cutoffSig = new Tone.Signal(this.params.cutoff)
        this.cutoffSig.connect(this.finalFilter.frequency)
        this.finalFilter.type =  "lowpass"
        this.finalFilter.Q.value =  this.params.resonance
        this.output = new Tone.Multiply(this.params.volume);
        this.toneVca.connect(this.toneGain);
        this.toneGain.connect(this.finalFilter);
        this.noiseVca.connect(this.finalFilter);
        this.finalFilter.connect(this.output);
        this.vcfEnvDepth = new Tone.Multiply();
        this.vcfEnvDepth.connect(this.finalFilter.frequency)
        this.env.connect(this.vcfEnvDepth)

        

        // Bind parameters with this instance
        this.paramDefinitions = paramDefinitions(this)
        this.param = this.generateParameters(this.paramDefinitions)
        this.createAccessors(this, this.param);

        //for autocomplete
        this.autocompleteList = this.paramDefinitions.map(def => def.name);;
        //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
        setTimeout(()=>{this.loadPreset('default')}, 500);
    }

    setADSR(voice, val, i){
        //console.log(voice,val)
        let obj = this.env
        if(voice == 'tone') obj = this.env
        else if(voice == 'noise') obj = this.noiseEnv
        else if(voice == 'pitch') obj = this.pitchEnvelope
        else if(val == null) {
            obj = this.env
            val = voice
        }
        if( Array.isArray(val) && i == null){
            if( val.length<=4)  {
                obj.attack = val[0]
                obj.decay = val[1]
                obj.sustain = val[2]
                obj.release = val[3]
            }
        } else if( i != null){
            if(i==0) obj.attack = val
            if(i==1) obj.decay = val
            if(i==2) obj.sustain = val
            if(i==3) obj.release = val
        }
    }

    // Trigger a drum hit
    trigger(time = Tone.now()) {
        this.env.triggerAttackRelease(.01, time);
        this.noiseEnv.triggerAttackRelease(.01, time);
        this.pitchEnvelope.triggerAttackRelease(.01, time);
    }

    triggerAttackRelease(val=48, vel = 100, dur = 0.01, time = null) {
        //console.log('AR ',val,vel,dur,time)
        vel = vel / 127;
        if (time) {
            this.frequency.setValueAtTime(Tone.Midi(val).toFrequency(), time);
            this.env.triggerAttackRelease(.01, time);
            this.noiseEnv.triggerAttackRelease(.01, time);
            this.pitchEnvelope.triggerAttackRelease(.01 , time);
        } else {
            //this.frequency.value = Tone.Midi(val).toFrequency();
            //this.env.triggerAttackRelease(dur);
        }
    }
}