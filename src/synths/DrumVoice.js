import * as Tone from 'tone';
import { DrumTemplate } from './DrumTemplate';
import {parseStringSequence, parseStringBeat} from '../TheoryModule'
import {Parameter} from './ParameterModule.js'
import { Seq } from '../Seq'
import { Theory } from '../TheoryModule';
import Groove from '../Groove.js'
import paramDefinitions from './params/drumVoiceParams.js';
import layout from './layouts/EffectLayout.json';

export class DrumVoice extends DrumTemplate{
  constructor(){
    super()
    this.layout= layout
    this.guiHeight = 0.4

    this.chokeRatio = .1
    this.decayTime = 1
    this.duration = 1
    this.startPoint = 0
    this.accent = 1.5
    this.ghost = .3

    this.env = new Tone.Envelope(0.0, 1, 1, 10)
    this.vca = new Tone.Multiply()
    this.output = new Tone.Multiply(1)
    this._dry = new Tone.Multiply(0)
    this.voice = new Tone.Player().connect(this.vca)
    this.vca.connect(this.output)
    this.voice.connect(this._dry)
    this.env.connect(this.vca.factor)

    // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    //console.log(this.paramDefinitions)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    
  }

  loadSamples(name){ this.load(name)}
  load(sampleName){
    const match = sampleName.match(/^([a-zA-Z]+)(\d+)$/);
    if (!match){
        console.log('Error: drum voice, incorrent name. Should be `kick0` or similar')
        return
    }

    this.name = match[1];
    const num = parseInt(match[2], 10);

    this.drumFolders = [
        "acoustic-kit",
        "LINN",
        'breakbeat8',
        'breakbeat9',
        'KPR77',

        'CR78',
        'breakbeat13',
        'Kit8',
        'Kit3',
        "TheCheebacabra1"
        ]

    this.baseUrl = "https://tonejs.github.io/audio/drum-samples/".concat(this.drumFolders[num]).concat('/');
    //console.log(this.baseUrl.concat(this.name).concat('.mp3') )
    try{
      this.voice.load( this.baseUrl.concat(this.name).concat('.mp3') )
    } catch(e){
      console.log('unable to load sample - try calling load(`kick0`)')
    }
    this.duration = this.voice.buffer.duration
  }

    setDecayTime(decay=null, choke=null){
        if (decay != null) this.decayTime = decay * this.duration
        if (choke != null) this.chokeRatio = choke
        this.env.release = this.decayTime*this.chokeRatio
    }

  triggerSample(amplitude, decay,time){
    //console.log(amplitude,decay,time, this.voice)
    try{
      //this.env.release = decay == 0 ? this.decayTime * this.chokeRatio : this.decayTime
      this.voice.volume.setValueAtTime( Tone.gainToDb(amplitude), time)
      this.voice.start(time, this.startPoint)
      //this.voice.start()
      this.env.triggerAttackRelease(0.001, time)
    } catch(e){
        //console.log('time error', e)
    }
  }
    trigger(amplitude, decay,time){
      this.env.release =  this.decayTime
      this.env.decay =  this.decayTime 
      this.triggerSample(amplitude, decay,time)
    }
    triggerAccent(amplitude, decay,time){
      this.env.release =  this.decayTime
      this.env.decay =  this.decayTime 
      this.triggerSample(amplitude * this.accent.value, decay,time)
    }
    triggerGhost(amplitude, decay,time){
      this.env.release =  this.decayTime
      this.env.decay =  this.decayTime 
      this.triggerSample(amplitude * this.ghost.value, decay,time)
    }
    triggerChoke(amplitude, decay,time){
      this.env.release =  this.decayTime * this.chokeRatio
      this.env.decay =  this.decayTime * this.chokeRatio
      this.triggerSample(amplitude, decay,time)
    }
}
