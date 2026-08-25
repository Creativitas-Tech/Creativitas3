import * as Tone from 'tone';
import {Theory} from '../TheoryModule.js'
import { NexusButton } from '../nexus/Button.js'
import { NexusDial } from '../nexus/Dial.js'
import { NexusSlider } from '../nexus/Slider.js'
import { NexusNumberBox } from '../nexus/NumberBox.js'
import { NexusRadioButton } from '../nexus/RadioButton.js'
import { initConsole, deinitConsole, hasConsole, consoleWrite } from '../visualizers/Console.js';

/*** Create Object ***/
export class SQ1 {
    constructor() {
        this.name = 'SQ1'
        this.backgroundColor = [50,.5,.5]

        this.seqMode = 'linear'
        this.buttonMode = 'step'
        this.gateLength = 0.5
        this.enables = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
        this.vals = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]

        this.division = '16n'
        this.index = 0
        this.seqLength = 16
        this.started = false

        this.synthTrigger = ()=>{}


        this.scale = [0,2,4,5,7,9,11,12]
        this.octave = 4
        this.loop = new Tone.Loop(time=>{
            if( !this.started ) return

            if(this.enables[this.index]){
                const note = this.scale[ this.vals[this.index] ] + this.octave*12
                // console.log(note,127,this.gateLength,time)
                this.loopFunction(note,127,this.gateLength,time)
            }
            
            this.buttons[this.index].colors['border'] = '#000'
            this.buttons[this.index].colors['accent'] = '#f00'
            this.buttons[this.index].updateColors()
            
            this.index = this.incIndex(this.index, this.seqLength, this.seqMode)
            
            this.buttons[this.index].colors['border'] = '#aaa'
            this.buttons[this.index].colors['accent'] = '#aaa'
            this.buttons[this.index].updateColors()

        }, this.division)
    }
    loopFunction (freq, amp, dur=0.01, time=null){
        this.synthTrigger(freq, amp, dur, time)
      }//loopFunction

      incIndex (index,length,mode ){
        if(mode === 'linear'){
            return (index+1) % length
        }
      }

      start(){
        this.started = true 
        this.index = 0
        this.loop.start()
        Tone.Transport.start()
      }
      stop(){
        this.started = false
        this.loop.stop()
      }
      connect(synth){
        try{
            this.synthTrigger = synth.triggerAttackRelease.bind(synth)
        } catch(e){
            console.log('e')
        }
      }

      /**
     * Initialize the GUI with NexusUI
     */
    initGui(gui) {
        this.guiContainer = document.getElementById('Canvas');
        if (!this.guiContainer) {
            console.error('NexusUI container #Canvas not found in DOM');
            return;
        }
        
        // Track created labels for cleanup
        this.nexusLabels = [];
        
        this.printToConsole(`[initNexus] Initializing NexusUI GUI for ${this.name || 'synth'}`);

        this.buttons = []
        this.dials = []

        let columnWidth = .1
        let rowHeight = .30
        let buttonDim = [1,0.5]
        let knobDim = 1

        for(let i=0; i<16;i++){
            const pixelX = .2 + columnWidth*(i%8)
            const pixelY = 0.3 + rowHeight*Math.floor(i/8)

            const button = new NexusButton({
                x:pixelX, 
                y:pixelY+.2, 
                width:buttonDim[0],
                height:buttonDim[1], 
                showValue:false,
                mode: 'toggle'
            })
            button.mapTo((v) => this.enables[i] = Math.floor(v));
            this.buttons.push( button )

            //DIAL
            const dial = new NexusDial({
                x:pixelX, 
                y:pixelY, 
                width:knobDim,
                height:knobDim, 
                showValue:false
            });
            // IMPORTANT: Set min/max BEFORE value to ensure proper clamping
            dial.min = 0
            dial.max = 7
            dial.value = 0
            
            // Set up the callback
            dial.mapTo((v) => this.vals[i] = Math.floor(v));
            this.dials.push(dial);
        }
        
        // Apply theme colors to all Nexus elements
        if (this.backgroundColor) {
            document.body.style.backgroundColor = `rgb(${this.backgroundColor[0]}, ${this.backgroundColor[1]}, ${this.backgroundColor[2]})`;
        }
        
        this.printToConsole(`[initNexus] GUI initialization complete`);
    }

    printToConsole( data ){
        if( hasConsole ) consoleWrite( data )
        console.log(data)
    }
}