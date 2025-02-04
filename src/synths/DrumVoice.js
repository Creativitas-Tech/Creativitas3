import * as Tone from 'tone';
import {Parameter} from './ParameterModule.js'
import dlayout from './layouts/drumLayout.json';
import { DrumTemplate } from './DrumTemplate';

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


        // Oscillator and AM stage
        this.frequency = new Tone.Signal(this.params.toneFrequency)
        this.harmonicity = new Tone.Multiply(1); // Modulation depth
        this.frequency.connect( this.harmonicity)
        this.vco = new Tone.Oscillator(this.params.toneFrequency, "sine").start();
        this.frequency.connect(this.vco.frequency)
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
        this.waveshaper = new Tone.WaveShaper(x => Math.sin(x * Math.PI));
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
        this.pitchEnvelope.releaseCurve = 'linear'
        this.pitchEnvelope.decayCurve = 'linear'

        this.toneVca = new Tone.Multiply()
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
        this.toneVca.connect(this.finalFilter);
        this.noiseVca.connect(this.finalFilter);
        this.finalFilter.connect(this.output);
        this.vcfEnvDepth = new Tone.Multiply();
        this.vcfEnvDepth.connect(this.finalFilter.frequency)
        this.env.connect(this.vcfEnvDepth)

        let paramDefinitions = [
            {name:'type',type:'vco',value:'square',radioOptions:['square','saw','tri','sine'],callback:(x,time=null)=>{
                  switch(x){
                  case 'square': this.vco.type = 'square'; break;
                    case 'saw': this.vco.type = 'sawtooth'; break;
                      case 'tri': this.vco.type = 'triangle'; break;
                        case 'sine': this.vco.type = 'sine'; break;
                  }
                }
              },
            {name:'drive2',type:'vco',min:0.,max:2,curve:2,callback:(x,time=null)=>this.drive.gain.value = x},
            {name:'fm',type:'vcf',min:0.,max:10,curve:2,callback:(x,time=null)=>this.modIndex.value = x},
            {name:'am',type:'vcf',min:0.,max:2,curve:2,callback:(x,time=null)=>this.amDepth.gain.value = x},
            {name:'harm',type:'vcf',min:1.,max:20,curve:1,callback:(x,time=null)=>this.harmonicity.factor.value = (x)},
            {name:'cutoff',type:'vcf',min:50.,max:10000,curve:2,callback:(x,time=null)=>this.cutoffSig.value = x},
            {name:'Q',type:'vcf',min:0.,max:20,curve:0.7,callback:(x,time=null)=>this.finalFilter.Q.value = x},
            {name:'noiseG',type:'vca',min:0.,max:1.5,curve:2,callback:(x,time=null)=>this.noiseGain.gain.value = x},
            {name:'toneG',type:'vca',min:0.,max:1.5,curve:2,callback:(x,time=null)=>this.drive.gain.value = x},
            {name:'vol',type:'vca',min:0.,max:2,curve:2,callback:(x,time=null)=>this.output.factor.value = x},
            {name:'drop',type:'vco',min:0.,max:5000,curve:2,callback:(x,time=null)=>this.pitchEnvDepth.factor.value = x},
            {name:'decay',type:'env',min:0.,max:5,curve:2,callback:(x,time=null)=>{ this.env.decay = x; this.env.release = x }},
            {name:'pDecay',type:'env',min:0.,max:1,curve:2,callback:(x,time=null)=>{ this.pitchEnvelope.decay = x; this.pitchEnvelope.release = x }},
            {name:'nDecay',type:'env',min:0.,max:5,curve:2,callback:(x,time=null)=>{ this.noiseEnv.decay = x; this.noiseEnv.release = x }},
            {name:'nFreq',type:'vcf',min:100.,max:10000,curve:2,callback:(x,time=null)=>{ this.noiseCutoff.value = x; }},
            {name:'nEnv',type:'env',min:0.,max:5000,curve:3,callback:(x,time=null)=>this.noiseVcfEnvDepth.factor.value = x},
            {name:'vcfEnv',type:'vcf',min:0.,max:5000,curve:3,callback:(x,time=null)=>this.vcfEnvDepth.factor.value = x},
            // {name:'adsr',type:'env',min:0,max:1,curve:2,value:[.01,.1,.5,.5],
            //     labels:['attack','decay','sustain','release'],
            //     callback:(x,i=null)=>{ this.setADSR('env',x, i) }
            // },
            // {name:'noise',type:'env',min:0,max:1,curve:2,value:[.01,.1,.5,.5],
            //     labels:['attack','decay','sustain','release'],
            //     callback:(x,i=null)=>{ this.setADSR('noise',x, i) }
            // },
            // {name:'pitch',type:'env',min:0,max:1,curve:2,value:[.01,.1,.5,.5],
            //     labels:['attack','decay','sustain','release'],
            //     callback:(x,i=null)=>{ this.setADSR('pitch',x, i) }
            // },
        ]

        this.param = this.generateParameters(paramDefinitions)
        this.createAccessors(this, this.param);

        //for autocomplete
        this.autocompleteList = paramDefinitions.map(def => def.name);;
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

    // // Getters and setters
    // get toneFrequency() {
    //     return this.params.toneFrequency;
    // }
    // set toneFrequency(value) {
    //     this.params.toneFrequency = value;
    //     this.frequency.value = value;
    //     this.modVco.frequency.value = value * this.params.amRatio;
    // }

    // get amRatio() {
    //     return this.params.amRatio;
    // }
    // set amRatio(value) {
    //     this.params.amRatio = value;
    //     this.modVco.frequency.value = this.params.toneFrequency * value;
    // }

    // get toneGain2() {
    //     return this.params.toneGain;
    // }
    // set toneGain2(value) {
    //     this.params.toneGain = value;
    //     this.toneGain.gain.value = value;
    // }

    // get noiseShape() {
    //     return this.params.noiseShape;
    // }
    // set noiseShape(value) {
    //     this.params.noiseShape = value;
    //     this.noiseFilter.type = value;
    // }

    // get noiseLevel() {
    //     return this.params.noiseLevel;
    // }
    // set noiseLevel(value) {
    //     this.params.noiseLevel = value;
    //     this.noiseGain.gain.value = value;
    // }

    // get toneLevel() {
    //     return this.params.toneLevel;
    // }
    // set toneLevel(value) {
    //     this.params.toneLevel = value;
    //     this.output.factor.value = value;
    // }

    // get toneDecay() {
    //     return this.params.toneDecay;
    // }
    // set toneDecay(value) {
    //     this.params.toneDecay = value;
    //     this.env.decay = value;
    //     this.pitchEnvelope.decay = value
    // }
    // get pitchEnv() {
    //     return this.params.pitchEnv;
    // }
    // set pitchEnv(value) {
    //     this.params.pitchEnv = value;
    //     this.pitchEnvDepth.factor.value = value;
    // }

    // get noiseDecay() {
    //     return this.params.noiseDecay;
    // }
    // set noiseDecay(value) {
    //     this.params.noiseDecay = value;
    //     this.noiseEnv.decay = value;
    // }

    // get cutoff() {
    //     return this.params.cutoff;
    // }
    // set cutoff(value) {
    //     this.params.cutoff = value;
    //     this.finalFilter.frequency.value = value;
    //     this.noiseFilter.frequency.value = value;
    // }

    // get resonance() {
    //     return this.params.resonance;
    // }
    // set resonance(value) {
    //     this.params.resonance = value;
    //     this.finalFilter.Q.value = value;
    // }

    // get volume() {
    //     return this.params.volume;
    // }
    // set volume(value) {
    //     this.params.volume = value;
    //     this.output.factor.factor.value = value;
    // }

    // Trigger a drum hit
    trigger(time = Tone.now()) {
        this.env.triggerAttackRelease(.05, time);
        this.noiseEnv.triggerAttackRelease(.05, time);
        this.pitchEnvelope.triggerAttackRelease(.05, time);
    }

    triggerAttackRelease(val=48, vel = 100, dur = 0.01, time = null) {
        //console.log('AR ',val,vel,dur,time)
        vel = vel / 127;
        if (time) {
            this.frequency.setValueAtTime(Tone.Midi(val).toFrequency(), time);
            this.env.triggerAttackRelease(.01, time);
            this.noiseEnv.triggerAttackRelease(.01, time);
            this.pitchEnvelope.triggerAttackRelease(.01
                , time);
        } else {
            //this.frequency.value = Tone.Midi(val).toFrequency();
            //this.env.triggerAttackRelease(dur);
        }
    }

    //GUI
  // Initialize GUI
  initGui(gui=null) {
    //console.log('init', this.param)
    this.gui = gui
    const layout = dlayout.layout;

    // Group parameters by type
    const groupedParams = {};
    Object.values(this.param).forEach((param) => {
        if (!groupedParams[param.type]) groupedParams[param.type] = [];
        groupedParams[param.type].push(param);
    });

    // Create GUI for each group
    Object.keys(groupedParams).forEach((groupType) => {
        const groupLayout = layout[groupType];
        if (!groupLayout) return;
        if (groupType === 'hidden') return;
      


        let indexOffset = 0
        groupedParams[groupType].forEach((param, index) => {
          const isGroupA = groupLayout.groupA.includes(param.name);

          // Calculate size and control type
          const controlType = isGroupA ? groupLayout.controlTypeA : groupLayout.controlTypeB;
          const size = isGroupA ? groupLayout.sizeA : groupLayout.sizeB;
          // Calculate offsets
          let xOffset = 0//groupLayout.offsets.x * (index % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
          let yOffset = 0//groupLayout.offsets.y * Math.floor(index / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
          if( Array.isArray( param._value )){
            param._value.forEach((_, i) => {
              // Calculate offsets
             xOffset = groupLayout.offsets.x * ((index+indexOffset) % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
             yOffset = groupLayout.offsets.y * Math.floor((index+indexOffset) / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
            
              // Calculate absolute positions
              const x = groupLayout.boundingBox.x + xOffset;
              const y = groupLayout.boundingBox.y + yOffset;
              this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color, i });
              indexOffset++
            })
          } else{
            xOffset = groupLayout.offsets.x * ((index+indexOffset) % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
            yOffset = groupLayout.offsets.y * Math.floor((index+indexOffset) / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
          
            // Calculate absolute positions
            const x = groupLayout.boundingBox.x + xOffset;
            const y = groupLayout.boundingBox.y + yOffset;
            // Create GUI element
            this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color });    
          }

        });
    });
}

 // Create individual GUI element
    createGuiElement(param, { x, y, size, controlType, color, i=null }) {
    //console.log('createG', param, x,y,size,controlType, i)
    if (controlType === 'knob') {
        param.guiElements.push(this.gui.Knob({
            label: i ? param.labels[i] : param.name,
            min: param.min,
            max: param.max,
            value: param._value,
            size: size , // Scale size
            curve: param.curve,
            x,
            y,
            accentColor: color,
            callback: (value) => param.set(value,i,true),
        }));
    } else if (controlType === 'fader') {
        param.guiElements.push(this.gui.Fader({
            label: i ? param.labels[i] : param.name,
            min: param.min,
            max: param.max,
            curve: param.curve,
            size: param.size, // Scale size
            x,
            y,
            accentColor: color,
            callback: (value) => param.set(value,i,true),
        }));
    } else if (controlType === 'radioButton') {
        if (!Array.isArray(param.radioOptions) || param.radioOptions.length === 0) {
            console.warn(`Parameter "${param.name}" has no options defined for radioBox.`);
            return null;
        }

        return this.gui.RadioButton({
            label: i ? param.labels[i] : param.name,
            radioOptions: param.radioOptions,
            x:x,
            y:y+10,
            size:.5,
            accentColor: color,
            callback: (selectedOption) => param.set(selectedOption),
        });
    }
}
}