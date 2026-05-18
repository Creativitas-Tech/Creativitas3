/*
Output
*/

import * as Tone from 'tone';
import { EffectTemplate } from './EffectTemplate';
import {Parameter} from './ParameterModule.js'
import basicLayout from './layouts/EffectLayout.json';
import paramDefinitions from './params/outputParams.js';
 
export class OutputClass extends EffectTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui;
    this.presets = {};
    this.name = "Output"
    this.layout = basicLayout;
    this.backgroundColor = [0,0,50]

    this.input = new Tone.Gain(.5);
    this.output = new Tone.Gain(.3).toDestination();

    this.input.connect(this.output)

    // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    //console.log(this.paramDefinitions)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
  }//constructor

  
}