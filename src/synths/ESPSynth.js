/*
 * 6 voice subtractive synthesizer
 *
 * 
*/

import p5 from 'p5';
import * as Tone from 'tone';
import {MultiVCO} from '../MultiVCO.js'
import {stepper} from  '../Utilities.js'
// import ESPSynthPresets from './synthPresets/ESPSynthPresets.json';
import { MonophonicTemplate } from './MonophonicTemplate.js';

export class ESPSynth extends MonophonicTemplate {
    constructor (gui = null, waves = ['triangle', 'sawtooth', 'square', 'square', 'square', 'noise'], pitches = [1, 1, 1, 0.5, 0.25, 1]) {
        super()
        this.gui = gui
    	this.presets = {};
		this.synthPresetName = "ESPSynthPresets"
		this.accessPreset()
        this.name = "ESPSynth"
        //console.log(this.name, " loaded, available preset: ", ESPSynthPresets)

        this.frequency = new Tone.Signal()
        this.pitchshift = new Tone.Multiply()
        this.vco = new MultiVCO(waves, pitches)
        this.lfo = new Tone.LFO().start()
        this.vibratoSwitch = new Tone.Multiply()
        this.wahSwitch = new Tone.Multiply()
        this.vcf = new Tone.Filter()
        this.cutoff = new Tone.Signal()
        this.env = new Tone.Envelope()
        this.vcfVelocityDepth = new Tone.Signal(1)
        this.vcaVelocityDepth = new Tone.Signal(1)
        this.vcfEnvDepth = new Tone.Multiply()
        this.vcfVelocity = new Tone.Multiply(1)
        this.vcaEnvDepth = new Tone.Multiply()
        this.vcaVelocity = new Tone.Multiply(1)
        this.vca = new Tone.Multiply()
        this.output = new Tone.Multiply(1)

        //connect input signal to multiVCO
        this.frequency.connect(this.pitchshift)
        this.pitchshift.connect(this.vco.frequency)
        this.pitchshift.value = 1

        //connect vco to vcf
        this.vco.connect(this.vcf)
        this.cutoff.connect(this.vcf.frequency)
        this.vcf.rolloff = -24
        this.vcf.Q.value = 1

        //enable the lfo to impact pitch or filter
        this.lfo.connect(this.vibratoSwitch) //switch between 0 and 1
        this.vibratoSwitch.connect(this.vco.frequency)
        this.lfo.connect(this.wahSwitch)
        this.wahSwitch.connect(this.vcf.frequency)

        //Set up filter envelope

        this.env.connect(this.vcfEnvDepth)
        this.vcfEnvDepth.connect(this.vcfVelocity)
        this.vcfVelocity.connect(this.vcf.frequency)
        this.vcfVelocityDepth.connect(this.vcfVelocity.factor)

        //connect vcf to vca
        this.vcf.connect(this.vca)

        //set up amplitude envelope
        this.vcaEnvDepth.factor.value = 1
        this.env.connect(this.vcaEnvDepth)
        this.vcaEnvDepth.connect(this.vcaVelocity)
        this.vcaVelocity.connect(this.vca.factor)
        this.vcaVelocityDepth.connect(this.vcaVelocity.factor)

        //effects chain

        //distortion
        this.dist = new Tone.Distortion()
        // this.distgain = new Tone.Multiply(1)
        // this.distout = new Tone.Add()
        // this.vca.connect(this.distout)
        // this.vca.connect(this.distgain)
        // this.distgain.connect(this.dist)
        // this.dist.connect(this.distout)
        this.vca.connect(this.dist)

        //chorus
        this.chor = new Tone.Chorus(2.5, 5, 0.9)
        this.dist.connect(this.chor)
        // this.chorgain = new Tone.Multiply(1)
        // this.chorout = new Tone.Add()
        // this.distout.connect(this.chorout)
        // this.distout.connect(this.chorgain)
        // this.chorgain.connect(this.chor)
        // this.chor.connect(this.chorout)

        // this.chorout.connect(this.output)
        this.chor.connect(this.output)

        //velocity
        this.velo = 10
        this.amp = this.velo/127

        this.vcfDynamicRange = 0  //at low values, there's low dynamic range
        this.vcaDynamicRange = 0  //at high values, there's high dynamic range

        if (this.gui !== null) {
            this.initGui()
            this.hideGui();
            setTimeout(()=>{this.loadPreset('default')}, 500);
        }
    }

    octaveMapping = (x)=> {
        if (x !== undefined) {
            if (x === '4') return 2;
            else if (x === '8') return 1;
            else if (x === '16') return 0.5;
        }
        else return 1
    }

    lfoControl = (x)=> {
        if (x !== undefined) {
            let controlVal = Math.abs(x-0.5) * 2
            let lfoDepth = 50
            if (x < 0.47) {
                //this.lfo.min = -lfoDepth * stepper(controlVal, 0, 1, [[0,0],[0.6,0.2],[1,1]])
                this.lfo.min = -lfoDepth * controlVal
                // this.lfo.max = lfoDepth * stepper(controlVal, 0, 1, [[0,0],[0.6,0.2],[1,1]])
                this.lfo.max = lfoDepth * controlVal
                this.vibratoSwitch.value = 1
                this.wahSwitch.value = 0
            }
            else if (x >= 0.47 && x <= 0.49) {
                this.vibratoSwitch.value = 0
                this.wahSwitch.value = 0
            }
            else if (x > 0.49) {
                this.lfo.min =  0
                //this.lfo.max = lfoDepth * stepper(controlVal, 0, 1, [[0,0],[0.6,0.2],[1,1]])
                this.lfo.max = lfoDepth * controlVal
                this.vibratoSwitch.value = 0
                this.wahSwitch.value = 100 * controlVal
            }
        }
    }


    //envelopes
    triggerAttack (freq, amp, time=null){ 
        freq = Tone.Midi(freq).toFrequency()
        amp = amp/127
        if(time){
            this.env.triggerAttack(time)
            this.frequency.setValueAtTime(freq, time)
            this.vcfVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcfDynamicRange],[1,1]]),.03)
            this.vcaVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcaDynamicRange],[1,1]]),.03)
        } else{
            this.env.triggerAttack()
            this.frequency.value = freq
            this.vcfVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcfDynamicRange],[1,1]]),.03)
            this.vcaVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcaDynamicRange],[1,1]]),.03)
        }
    }

    triggerRelease (time=null){
        if(time) {
            this.env.triggerRelease(time)
        }
        else {
            this.env.triggerRelease()
        }
    }

    triggerAttackRelease (freq, amp, dur=0.01, time=null){
    freq = Tone.Midi(freq).toFrequency()
    amp = amp/127
    if(time){
        this.env.triggerAttackRelease(dur, time)
        this.frequency.setValueAtTime(freq, time)
        // this.vcfVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcfDynamicRange],[1,1]]),.01)
        // this.vcaVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcaDynamicRange],[1,1]]),.01)
        this.vcfVelocityDepth.setValueAtTime(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcfDynamicRange],[1,1]]),time)
        this.vcaVelocityDepth.setValueAtTime(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcaDynamicRange],[1,1]]),time)
    } else{
        this.env.triggerAttackRelease(dur)
        this.frequency.value = freq
        this.vcfVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcfDynamicRange],[1,1]]),.01)
        this.vcaVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcaDynamicRange],[1,1]]),.01)
    }
    }//attackRelease

    connect(destination) {
        if (destination.input) {
            this.output.connect(destination.input);
        } else {
            this.output.connect(destination);
        }
    }

    //parameter setters
    setADSR(a,d,s,r){
        this.env.attack = a>0.001 ? a : 0.001
        this.env.decay = d>0.01 ? d : 0.01
        this.env.sustain = Math.abs(s)<1 ? s : 1
        this.env.release = r>0.01 ? r : 0.01
    }

    setOutputGain(out){
        this.output.factor.value = out
    } 

    setVcoGain(num,val){
        this.vco.setGain(num, val)
    }

    initGui(gui = this.gui) {
        this.gui = gui
        this.octave_radio =  this.gui.RadioButton({
            label:'octave',
            radioOptions: ['4','8','16'],
            callback: x=>this.pitchshift.value = this.octaveMapping(x),
            x: 5, y:50,size:1, orientation:'vertical'
        })
        this.octave_radio.set('8');
        this.octave_radio.accentColor = [122,132,132]
        this.octave_radio.borderColor = [178,192,191]

        this.triangle_fader = this.gui.Slider({
            label:'tri',
            callback: (x)=>{this.setVcoGain(0, x)},
            x: 11, y: 50, size: 1.5,
            min:0.0001, max: 2,
            orientation: 'vertical',
            showValue: false,
        })
        this.triangle_fader.accentColor = [255,162,1]
        this.triangle_fader.borderColor = [20, 20, 20]
        this.triangle_fader.set(1)

        this.saw_fader = this.gui.Slider({
            label:'saw',
            callback: (x)=>{this.setVcoGain(1, x)},
            x: 17, y: 50, size: 1.5,
            min:0.0001, max: 2,
            orientation: 'vertical',
            showValue: false,
        })
        this.saw_fader.accentColor = [255,162,1]
        this.saw_fader.borderColor = [20, 20, 20]
        this.saw_fader.set(1)

        this.square_fader = this.gui.Slider({
            label:'squ',
            callback: (x)=>{this.setVcoGain(2, x)},
            x: 23, y: 50, size: 1.5,
            min:0.0001, max: 2,
            orientation: 'vertical',
            showValue: false,
        })
        this.square_fader.accentColor = [255,162,1]
        this.square_fader.borderColor = [20, 20, 20]
        this.square_fader.set(1)
        
        this.octave_down_fader = this.gui.Slider({
            label:'-1',
            callback: (x)=>{this.setVcoGain(3, x)},
            x: 29, y: 50, size: 1.5,
            min:0.0001, max: 2,
            orientation: 'vertical',
            showValue: false,
        })
        this.octave_down_fader.accentColor = [255,162,1]
        this.octave_down_fader.borderColor = [20, 20, 20]
        this.octave_down_fader.set(1)
        
        this.two_octave_down_fader = this.gui.Slider({
            label:'-2',
            callback: (x)=>{this.setVcoGain(4, x)},
            x: 35, y: 50, size: 1.5,
            min:0.0001, max: 2,
            orientation: 'vertical',
            showValue: false,
        })
        this.two_octave_down_fader.accentColor = [255,162,1]
        this.two_octave_down_fader.borderColor = [20, 20, 20]
        this.two_octave_down_fader.set(1)
        
        this.noise_fader = this.gui.Slider({
            label:'noise',
            callback: (x)=>{this.setVcoGain(5, x)},
            x: 41, y: 50, size: 1.5,
            min:0.0001, max: 2,
            orientation: 'vertical',
            showValue: false,
        })
        this.noise_fader.accentColor = [255,162,1]
        this.noise_fader.borderColor = [20, 20, 20]
        this.noise_fader.set(1)
        
        this.lfo_intensity_knob = this.gui.Knob({
            label:'vib/wah',
            callback: (x)=>{this.lfoControl(x)},
            x: 20, y: 23, size:1.1,
            showValue: false,
            min:0.0001, max: 0.95
        })
        this.lfo_intensity_knob.set( 0.48 )
        this.lfo_intensity_knob.borderColor = [178,192,191]
        this.lfo_intensity_knob.accentColor = [255,162,1]
        this.lfo_intensity_knob.border = 5
        this.lfoControl(0.48)
        
        this.lfo_speed_knob = this.gui.Knob({
            label:'speed',
            callback: (x)=>{this.lfo.frequency.value = x},
            x: 35, y: 23, size:1.1,
            showValue: false,
            min:0.01, max: 20,curve:2.5
        })
        this.lfo_speed_knob.set( 10 )
        this.lfo.frequency.value = 10
        this.lfo_speed_knob.borderColor = [178,192,191]
        this.lfo_speed_knob.accentColor = [255,162,1]
        this.lfo_speed_knob.border = 5
        

        this.cutoff_frequency_knob = this.gui.Knob({
            label:'frequency',
            // callback: (x)=>{this.cutoff.value = stepper(x, 50, 2500, [[0,0],[0.95,0.75], [1,1]])},
            callback: (x)=>{this.cutoff.value = x},
            x: 53, y: 25, size:1.4,
            showValue: false,
            min:50, max: 2500, curve:2
        })
        this.cutoff_frequency_knob.set( 1200 )
        this.cutoff.value = 1200
        this.cutoff_frequency_knob.borderColor = [178,192,191]
        this.cutoff_frequency_knob.accentColor = [255,162,1]
        this.cutoff_frequency_knob.border = 5
        
        
        this.resonance_knob = this.gui.Knob({
            label:'resonance',
            callback: (x)=>{ this.vcf.Q.value = x},
            x: 53, y: 72, size:1.4,
            min:0.99999, max: 18, curve: 2,
            showValue: false,
        })
        this.resonance_knob.set( 1 )
        this.vcf.Q.value = 1
        this.resonance_knob.borderColor = [178,192,191]
        this.resonance_knob.accentColor = [255,162,1]
        this.resonance_knob.border = 5
        
        this.asdr_int_knob = this.gui.Knob({
            label:'VCF Env Depth',
            callback: (x)=>{this.vcfEnvDepth.factor.value = x},
            x: 66, y: 34, size:0.85, curve: 3,
            min:0, max: 5000,
            showValue: false,
        })
        this.asdr_int_knob.set( 0.01 )
        this.asdr_int_knob.borderColor = [178,192,191]
        this.asdr_int_knob.accentColor = [255,162,1]
        this.asdr_int_knob.border = 5
        
        this.volume_knob = this.gui.Knob({
            label:'volume',
            callback: (x)=>{this.output.factor.value = x},
            x: 66, y: 68, size:0.85,
            min:0.0001, max: 1.5,
            showValue: false,
        })
        this.volume_knob.set( 1 )
        this.output.factor.value = 1
        this.volume_knob.borderColor = [178,192,191]
        this.volume_knob.accentColor = [255,162,1]
        this.volume_knob.border = 5
        
        this.velocity_filter_knob = this.gui.Knob({
            label:'velo filter',
            callback: (x)=>{this.vcfDynamicRange = x},
            x: 77, y: 15, size:0.85,
            min:0.01, max: 0.99,
            showValue: false,
        })
        this.velocity_filter_knob.set( 0.99 )
        this.velocity_filter_knob.borderColor = [178,192,191]
        this.velocity_filter_knob.accentColor = [255,162,1]
        this.velocity_filter_knob.border = 5
        
        this.velocity_volume_knob = this.gui.Knob({
            label:'velo volume',
            callback: (x)=>{this.vcaDynamicRange = x},
            x: 77, y: 83, size:0.85,
            min:0.01, max: 0.99,
            showValue: false,
        })
        this.velocity_volume_knob.set( 0.99 )
        this.velocity_volume_knob.borderColor = [178,192,191]
        this.velocity_volume_knob.accentColor = [255,162,1]
        this.velocity_volume_knob.border = 5
        
        this.attack_fader = this.gui.Slider({
            label:'A',
            //callback: (x)=>{this.env.attack = stepper(x, 0, 10, [[0,0],[0.01,0.01], [0.4, 0.03], [0.7, 0.25], [0.85, 0.5], [1,1]])},
            callback: (x)=>{this.env.attack = x},
            x: 76, y: 36, size: 1, curve: 2,
            min:0.01, max: 10,
            orientation: 'vertical',
            showValue: false,
        })
        this.attack_fader.accentColor = [255,162,1]
        this.attack_fader.borderColor = [20, 20, 20]
        this.env.attack = 0.1
        this.attack_fader.set(0.1)
        
        this.decay_fader = this.gui.Slider({
            label:'D',
            //callback: (x)=>{this.env.decay = stepper(x, 0, 10, [[0,0],[0.01,0.01], [0.4, 0.03], [0.7, 0.25], [0.85, 0.5], [1,1]])},
            callback: (x)=>{this.env.decay = x},
            x: 82, y: 36, size: 1, curve: 2,
            min:0.01, max: 10,
            orientation: 'vertical',
            showValue: false,
        })
        this.decay_fader.accentColor = [255,162,1]
        this.decay_fader.borderColor = [20, 20, 20]
        this.env.decay = 0.1
        this.decay_fader.set(0.1)
        
        this.sustain_fader = this.gui.Slider({
            label:'S',
            callback: (x)=>{this.env.sustain = x},
            x: 88, y: 36, size: 1,
            min:0.0001, max: 1,
            orientation: 'vertical',
            showValue: false,
        })
        this.sustain_fader.accentColor = [255,162,1]
        this.sustain_fader.borderColor = [20, 20, 20]
        this.sustain_fader.set(1)
        this.env.sustain = 1
        
        this.release_fader = this.gui.Slider({
            label:'R',
            //callback: (x)=>{this.env.release = stepper(x, 0, 20, [[0,0],[0.01,0.01], [0.4, 0.03], [0.7, 0.25], [0.85, 0.5], [1,1]])},
            callback: (x)=>{this.env.release = x},
            x: 94, y: 36, size: 1,
            min:0.1, max: 20, curve:2,
            orientation: 'vertical',
            showValue: false,
        })
        this.release_fader.accentColor = [255,162,1]
        this.release_fader.borderColor = [20, 20, 20]
        this.release_fader.set(1)
        this.env.release = 1
        
        this.chorus_filter_knob = this.gui.Knob({
            label:'chorus',
            callback: (x)=>{this.chor.wet.value = x},
            x: 91, y: 15, size:0.85,
            min:0.0001, max: 1,
            showValue: false,
        })
        this.chorus_filter_knob.set( 0.0001 )
        //this.chorgain.factor.value = 0.0001
        this.chorus_filter_knob.borderColor = [178,192,191]
        this.chorus_filter_knob.accentColor = [255,162,1]
        this.chorus_filter_knob.border = 5
        
        this.dist_volume_knob = this.gui.Knob({
            label:'Overdrive',
            callback: (x)=>{this.dist.distortion = x},
            x: 91, y: 83, size:0.85,
            min:0.0001, max: 1,
            showValue: false,
        })
        this.dist_volume_knob.set( 0.0001 )
        this.dist_volume_knob.borderColor = [178,192,191]
        this.dist_volume_knob.accentColor = [255,162,1]
        this.dist_volume_knob.border = 5

        this.gui_elements = [this.octave_radio, this.triangle_fader, this.saw_fader, this.square_fader,
            this.octave_down_fader, this.two_octave_down_fader, this.noise_fader, this.lfo_intensity_knob,
            this.lfo_speed_knob, this.cutoff_frequency_knob, this.resonance_knob, this.asdr_int_knob,
            this.volume_knob, this.velocity_filter_knob, this.velocity_volume_knob, this.attack_fader,
            this.decay_fader, this.sustain_fader, this.release_fader, this.chorus_filter_knob, 
            this.dist_volume_knob]
    }
}

