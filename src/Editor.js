import { useState, useEffect, useRef } from 'react';
import { timingStrategyManager } from './timing/TimingStrategyManager.js';
import { handleTimingInitialization } from './timing/TimingModalDialog.js';
//codemirror
import CodeMirror from '@uiw/react-codemirror';
import { historyField } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { Decoration, ViewPlugin, EditorView } from "@codemirror/view";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { autocompletion, completeFromList } from "@codemirror/autocomplete";


//tone
import { FM4, FM2Op, FMOperator, Vocoder,Reverb, Delay, Distortion, Chorus, Twinkle, MidiOut, NoiseVoice, Resonator, ToneWood, DelayOp, Caverns, AnalogDelay, DrumSynth, Drummer, Quadrophonic, QuadPanner, Rumble, Daisy, Daisies, DatoDuo, ESPSynth, Polyphony, Stripe, Diffuseur, KP, Sympathy, Feedback, Kick, DrumSampler, Simpler, Snare, Cymbal, Player } from './synths/index.js';


import { drumPatterns } from './lib/drumPatterns.js';
import { MultiVCO } from './MultiVCO.js'
import p5 from 'p5';
import Groove from './Groove.js';
import { setp5Theme } from './p5Elements.js';
import * as Tone from 'tone';
import * as TheoryModule from './TheoryModule.js';
//import ml5 from 'ml5';
import Canvas from "./Canvas.js";
import { Oscilloscope, Spectroscope, Spectrogram, PlotTransferFunction, MultiRowSeqGui } from './visualizers/index.js';
import * as waveshapers from './synths/waveshapers.js'
import { stepper, expr } from './Utilities.js'
import { EnvelopeLoop } from './synths/EnvelopeLoop.js'
import { GraphVisualizer } from './visualizers/Grapher.js'


import WebSocketClient from './collabSocket';
// import { CollabHubClient, CollabHubTracker, CollabHubDisplay } from './CollabHub.js';
import { CollabSlobClient } from './CollabSlob.js';
import {makeCollaborativeObject, ctx} from './CollabLink.js'

import MidiKeyboard from './midi/MidiKeyboard.js';
import { asciiCallbackInstance } from './AsciiKeyboard.js';
import { AsciiGrid } from './AsciiGrid.js';
import webExportHTMLContentGenerator from './webExport/WebExportGenerator.ts';
import {MidiDevice} from './midi/MidiDevice.js';
import {ControlSource} from './midi/ControlSource.js';
const midi = require('./midi/Midi.js');
const LZString = require('lz-string');


//Save history in browser
const stateFields = { history: historyField };

// List of available themes
const themeNames = ['gruvboxDark', 'gruvboxLight', 'okaidia', 'bbedit',
    'basicDark', 'basicDarkInit', 'basicLight', 'basicLightInit'];

// Load the theme dynamically based on the theme name
const loadTheme = async (themeName) => {
    try {
        let themeModule;
        switch (themeName) {
            case 'gruvboxDark':
            case 'gruvboxLight':
                themeModule = await import('@uiw/codemirror-theme-gruvbox-dark');
                return themeName === 'gruvboxDark' ? themeModule.gruvboxDark : themeModule.gruvboxLight;
            case 'okaidia':
                themeModule = await import('@uiw/codemirror-theme-okaidia');
                return themeModule.okaidia;
            case 'bbedit':
                themeModule = await import('@uiw/codemirror-theme-bbedit');
                return themeModule.bbedit;
            case 'basicDark':
            case 'basicDarkInit':
            case 'basicDarkStyle':
            case 'basicLight':
            case 'basicLightInit':
            case 'basicLightStyle':
            case 'defaultSettingsBasicDark':
            case 'defaultSettingsBasicLight':
                themeModule = await import('@uiw/codemirror-theme-basic');
                return themeModule[themeName];
            default:
                throw new Error(`Theme ${themeName} not found`);
        }
    } catch (error) {
        console.error(`Selected theme "${themeName}" does not exist. Try using a number like setTheme(2).`)
        const fallbackModule = await import('@uiw/codemirror-theme-gruvbox-dark');
        return fallbackModule.okaidia; // Fallback theme
    }
}; //loadTheme

// Define effects to add and clear decorations
const addDecorationEffect = StateEffect.define();
const clearAllDecorationsEffect = StateEffect.define();

// Define a StateField to manage the decorations
const decorationsField = StateField.define({
    create() {
        return Decoration.none;
    },
    update(decorations, transaction) {
        decorations = decorations.map(transaction.changes);
        for (let effect of transaction.effects) {
            if (effect.is(addDecorationEffect)) {
                decorations = decorations.update({ add: [effect.value] });
            } else if (effect.is(clearAllDecorationsEffect)) {
                decorations = Decoration.none;  // Clear all decorations
            }
        }
        return decorations;
    },
    provide: f => EditorView.decorations.from(f)
});


//using websockets for code sharing
// Define your WebSocket URL (adjust if needed)
const wsUrl = 'ws://localhost:8080';

function Editor(props) {
    window.p5 = p5;
    window.Tone = Tone;
    window.Theory = TheoryModule.Theory;
    window.groove = Groove

    // Initialize timing strategy manager with default Tone.js transport
    useEffect(() => {

        // Make the timing strategy manager available globally
        window.timing = timingStrategyManager;

        // Add helper functions for easy timing strategy switching
        window.useToneJsTiming = () => {
            console.log('Switching to Tone.js timing strategy');
            return timingStrategyManager.setStrategy(timingStrategyManager.STRATEGIES.TONE_JS);
        };

        window.useTimingObjectTiming = async () => {
            console.log('Switching to Timing Object timing strategy');

            // Use the handleTimingInitialization helper from TimingModalDialog.js
            const result = await handleTimingInitialization(
                // Simple initialization function
                async () => {
                    return timingStrategyManager.setStrategy(timingStrategyManager.STRATEGIES.TIMING_OBJECT);
                },

                // Success callback
                () => console.log('Successfully switched to Timing Object strategy'),

                // Error callback
                (error) => {
                    console.error('Error initializing Timing Object:', error);
                },

                'Timing Object'
            );
        };

        window.useMidiClockTiming = () => {
            console.log('Switching to MIDI Clock timing strategy');
            return timingStrategyManager.setStrategy(timingStrategyManager.STRATEGIES.MIDI_CLOCK);
        };

        window.getCurrentTimingStrategy = () => {
            return timingStrategyManager.getActiveStrategy();
        };
    }, []);
    window.ws = waveshapers
    //window.ml5 = ml5;
    window.Oscilloscope = Oscilloscope;
    window.Spectroscope = Spectroscope;
    window.Spectrogram = Spectrogram;
    window.plotTransferFunction = PlotTransferFunction;
    window.MultiRowSeqGui = MultiRowSeqGui;
    // window.CollabHub = CollabHubDisplay;

    window.enableAsciiInput = asciiCallbackInstance.enable.bind(asciiCallbackInstance);
    window.disableAsciiInput = asciiCallbackInstance.disable.bind(asciiCallbackInstance);
    window.setAsciiHandler = asciiCallbackInstance.setHandler.bind(asciiCallbackInstance);
    window.AsciiGrid = AsciiGrid
    //window.disableAsciiGrid = asciiGridInstance.disable.bind(asciiGridInstance);
    //window.setAsciiGridHandler = asciiGridInstance.setHandler.bind(asciiGridInstance);
    
    window.enableAsciiRepeat = () => asciiCallbackInstance.allowRepeat = true;
    window.disableAsciiRepeat = () => asciiCallbackInstance.allowRepeat = false;
    // window.enableRecording = asciiCallbackInstance.enableLogging.bind(asciiCallbackInstance);
    // window.disableRecording = asciiCallbackInstance.disableLogging.bind(asciiCallbackInstance);
    // window.loadRecording = asciiCallbackInstance.loadLogs.bind(asciiCallbackInstance);
    // window.playbackRecording = asciiCallbackInstance.replayPerformance.bind(asciiCallbackInstance);
    // window.printLogs = asciiCallbackInstance.printLogs.bind(asciiCallbackInstance);
    // //const fileInputRef = useRef(null);
    // Set the file input reference to the AsciiCallback instance
    //asciiCallbackInstance.fileInput = fileInputRef.current;
    //asciiCallbackInstance.fileInput.addEventListener('change', asciiCallbackInstance.handleFileChange);

    //midi    
    window.MidiDevice = MidiDevice;
    window.ControlSource = ControlSource;
    window.setMidiInput = midi.setMidiInput;
    window.setMidiOutput = midi.setMidiOutput;
    window.setNoteOnHandler = midi.midiHandlerInstance.setNoteOnHandler.bind(midi.midiHandlerInstance);
    window.setNoteOffHandler = midi.midiHandlerInstance.setNoteOffHandler.bind(midi.midiHandlerInstance);
    window.setCCHandler = midi.midiHandlerInstance.setCCHandler.bind(midi.midiHandlerInstance);
    window.sendCC = midi.midiHandlerInstance.sendCC.bind(midi.midiHandlerInstance);
    window.sendNote = midi.midiHandlerInstance.sendNoteOn.bind(midi.midiHandlerInstance);
    window.sendNoteOff = midi.midiHandlerInstance.sendNoteOff.bind(midi.midiHandlerInstance);
    window.timingStrategyManager = timingStrategyManager;
    window.link = makeCollaborativeObject

    //synths
    window.NoiseVoice = NoiseVoice
    window.DatoDuo = DatoDuo
    window.ESPSynth = ESPSynth
    window.Resonator = Resonator
    window.ToneWood = ToneWood
    window.DelayOp = DelayOp
    window.Caverns = Caverns
    window.AnalogDelay = AnalogDelay
    window.Rumble = Rumble
    window.Polyphony = Polyphony
    window.Daisies = Daisies
    window.Daisy = Daisy
    window.Stripe = Stripe
    window.Diffuseur = Diffuseur
    window.KP = KP
    window.Sympathy = Sympathy
    window.MultiVCO = MultiVCO
    window.Kick = Kick
    window.Cymbal = Cymbal
    window.DrumSampler = DrumSampler
    window.Simpler = Simpler
    window.Snare = Snare;
    window.Reverb = Reverb;
    window.Player = Player;
    window.Chorus = Chorus;
    window.Distortion = Distortion;
    window.Delay = Delay;
    window.Vocoder = Vocoder;
    window.Graph = GraphVisualizer;
    window.FMOperator = FMOperator;
    window.FM2Op = FM2Op;
    window.FM4 = FM4;
    // window.Player = Player;

    window.Feedback = Feedback;
    window.MidiOut = MidiOut;
    window.Quadrophonic = Quadrophonic;
    window.QuadPanner = QuadPanner;
    window.Drummer = Drummer;
    window.DrumSynth = DrumSynth;
    window.Twinkle = Twinkle;
    window.EnvelopeLoop = EnvelopeLoop;
    // window.Feedback = Feedback;

    window.create_sequencer_gui = create_sequencer_gui;

    //utilities
    window.stepper = stepper
    window.expr = expr
    window.enableHighlight = (x) => { setHighlightEnable(x) }
    // lib
    window.drumPatterns = drumPatterns;
    window.expr = (func, len = 32) => {
        return Array.from({ length: len }, (_, i) => {
            return func(i)
        })
    }
    window.autocomplete = (val) => { setUseAutoComplete(val) }
    // window.displayCode = (val) => {
    //     displayRemoteCode.current = val;
    //     console.log('Remote code display enabled.');
    // };
    if (!Object.prototype.hasOwnProperty.call(window, 't')) {
        Object.defineProperty(window, 't', {
            get() {
                return window.Theory.now;
            },
            configurable: true
        });
        console.log('t is defined')
    } else { }//console.log('tght is already defined')}




    var curLineNum = 0;

    //math
    window.tri = (i) => { return Math.abs(i % 1 - .5) * 4 - 1 }
    window.pi = 3.141592
    window.rand = (min, max = null) => {
        if (max = null) return floor(Math.random() * min)
        else return floor(Math.random() * (max - min)) + min
    }
    const {
        sign, floor, ceil, round, max, min, pow, sqrt, abs, sin, cos, tan, log, exp, PI, random
    } = Math;

    /************************************************
     * 
     * Code caching and URL decoding
     * 
     *************************************************/
    // Save history in browser
    const serializedState = localStorage.getItem(`${props.page}EditorState`);

    //console.log(serializedState)
    // Decoding the URL and reloading the page
    function urlDecode() {
        const URLParams = new URLSearchParams(window.location.search);
        const compressedCode = URLParams.get('code');
        let encodedContent = LZString.decompressFromEncodedURIComponent(compressedCode)
        if (encodedContent) {
            console.log(encodedContent)
            // encodedContent = encodedContent
            //     .replace(/-/g, '+')
            //     .replace(/_/g, '/');
            // // Adding the padding to the encoding
            // while (encodedContent.length % 4 !== 0) {
            //     encodedContent += '=';
            // }
            localStorage.setItem(`${props.page}Value`, encodedContent);
            const url = window.location.origin + window.location.pathname;
            window.location.assign(url);
        }
    }

    urlDecode();
    //console.log('test')
    const value = localStorage.getItem(`${props.page}Value`) || props.starterCode;

    function create_sequencer_gui(gui) {
        let num_pads = 8
        gui.createCanvas(700, 200);
        let noteToggles_1 = [];
        let noteOn_1 = [true, true, true, true, true, true, true, true];
        for (let i = 0; i < num_pads; i++) {
            noteToggles_1.push(gui.Toggle({
                callback: function (x) {
                    noteOn_1[i] = x == 0 ? false : true;  // Toggle noteOn for the sequence
                },
                label: " ",
                x: 11 + 11 * i,  // Position the toggle switches
                y: 15,
                border: 10,
                borderColor: [255, 0, 0],
                size: .7
            }));
            noteToggles_1[i].set(0);  // Default all to "off"
        }
        let noteOn_2 = [true, true, true, true, true, true, true, true];  // toggle states for sequence steps
        let noteToggles_2 = [];
        for (let i = 0; i < num_pads; i++) {
            noteToggles_2.push(gui.Toggle({
                callback: function (x) {
                    noteOn_2[i] = x == 0 ? false : true;
                },
                label: " ",
                x: 11 + 11 * i,
                y: 39,
                border: 10,
                borderColor: [0, 128, 0],
                size: .7
            }));
            noteToggles_2[i].set(0);  // default all to "on"
        }
        let noteOn_3 = [true, true, true, true, true, true, true, true];
        let noteToggles_3 = [];
        for (let i = 0; i < num_pads; i++) {
            noteToggles_3.push(gui.Toggle({
                label: " ",
                callback: function (x) {
                    noteOn_3[i] = x == 0 ? false : true;
                },
                label: " ",
                x: 11 + 11 * i,
                y: 35 + 28,
                border: 10,
                borderColor: [0, 0, 255],
                size: .7
            }));
            noteToggles_3[i].set(0);  // default all to "off"
        }
        let noteOn_4 = [true, true, true, true, true, true, true, true];
        let noteToggles_4 = [];
        for (let i = 0; i < num_pads; i++) {
            noteToggles_4.push(gui.Toggle({
                callback: function (x) {
                    noteOn_4[i] = x == 0 ? false : true;
                },
                label: " ",
                x: 11 + 11 * i,
                y: 39 + 24 * 2,
                border: 10,
                borderColor: [128, 0, 128],
                size: .7
            }));
            noteToggles_4[i].set(0);  // default all to "off"
        }
        let noteOns = [noteOn_1, noteOn_2, noteOn_3, noteOn_4];
        let noteToggles = [noteToggles_1, noteToggles_2, noteToggles_3, noteToggles_4];
        return [noteOns, noteToggles];
    }

    /************************************************
     * 
     * Handle Themes
     * 
     *************************************************/

    const [themeDef, setThemeDef] = useState(); // Default theme

    const setTheme = async (themeName) => {
        if (typeof themeName === 'number') themeName = themeNames[themeName % themeNames.length]
        const selectedTheme = await loadTheme(themeName);
        console.log(`Current codebox theme: ${themeName}. \nChange theme with setTheme(number or string)`)
        setThemeDef(selectedTheme);
    };

    // p5 themes
    window.setp5Theme = setp5Theme;


    /************************************************
     * 
     * Creating a link
     * 
     *************************************************/

    const editorRef = useRef();
    const viewRef = useRef();
    const remoteUserMapRef = useRef(new Map());
    const userColorRef = useRef({});
    const colorPalette = [
      "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
      "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
      "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000",
      "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080"
    ];


    function initCollab(roomName = "changeit", debug = false) {
      window.chClient = new CollabSlobClient(debug === 'debug' || debug === true || debug === 'true');
      window.ctx = ctx;

      if (roomName === "changeit") roomName = 'room' + Math.floor(Math.random() * 100);
      window.chClient.joinRoom(roomName);
      //window.chClient.setUsername('user' + Math.floor(Math.random() * 100));

      window.chClient.on("sharedCode", (incoming) => {
        //console.log('incoming')
        const { senderID, content, lineNumber } = incoming.values;
        if (senderID === "server") return;

        // Sanitize userID for use in class names
        const safeID = senderID
        try{
            safeID = safeID.replace(/[^a-zA-Z0-9_-]/g, "_");
        } catch(e){console.log(e)}
        const color = checkForRemoteUser(safeID);

        ensureUserBackgroundCSS(safeID, color);

        if (!remoteUserMapRef.current.has(safeID)) {
          remoteUserMapRef.current.set(safeID, {
            lineNumber: remoteUserMapRef.current.size,
            content,
            color
          });

          // Add blank line if needed
          viewRef.current.dispatch({
            changes: { from: viewRef.current.state.doc.length, insert: "\n" }
          });
        } else {
          const userInfo = remoteUserMapRef.current.get(safeID);
          userInfo.content = content;
        }

        const userInfo = remoteUserMapRef.current.get(safeID);
        const line = viewRef.current.state.doc.line(userInfo.lineNumber + 1);
        viewRef.current.dispatch({
          changes: {
            from: line.from,
            to: line.to,
            insert: userInfo.content
          }
        });
      });
    }

    function checkForRemoteUser(userID) {
      assignColor(userID);
      return userColorRef.current[userID];
    }

    function assignColor(userID) {
      if (userColorRef.current[userID]) return;

      const { h, s, l } = getNextColorFromID(userID);
      const colorString = `hsla(${h}, ${s}%, ${l}%, 0.3)`;
      userColorRef.current[userID] = getNextColorFromID(userID);

      setUserColors({ ...userColorRef.current });
    }

    function getNextColorFromID(userID) {
      let hash = 0;
      for (let i = 0; i < userID.length; i++) {
        hash = userID.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash) % colorPalette.length;

      //const hue = Math.floor(Math.random()*100)
      return colorPalette[hue]+"80"
      //return { h: hue, s: 70, l: 60 };
    }

    function ensureUserBackgroundCSS(userID, color) {
      const className = `bg-${userID}`;
      if (document.getElementById(className)) return;

      const style = document.createElement("style");
      style.id = className;
      style.innerHTML = `
        .cm-line.${className} {
          background-color: ${color}
        }
      `;
      document.head.appendChild(style);
    }

    // Plugin to highlight lines
    function colorLinePlugin(userMap) {
      return ViewPlugin.fromClass(class {
        decorations;

        constructor(view) {
          this.decorations = this.buildDecorations(view);
        }

        update(update) {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
          }
        }

        buildDecorations(view) {
          const decos = [];
          for (const [userID, { lineNumber }] of userMap.entries()) {
            if (lineNumber + 1 <= view.state.doc.lines) {
              const line = view.state.doc.line(lineNumber + 1);


                decos.push(
                  Decoration.line({
                    attributes: { class: `bg-${userID}` }
                  }).range(line.from)
                );
                //console.log(userID, `bg-${userID}`)
            }
          }
          return Decoration.set(decos);
        }
      }, {
        decorations: v => v.decorations
      });
    }

    const broadcastCursorLinePlugin = ViewPlugin.fromClass(class {
      constructor(view) {
        this.prevLine = this.getCurrentLine(view);
      }

      update(update) {
        if (!update.selectionSet) return;

        const currentLine = this.getCurrentLine(update.view);
        if (currentLine !== this.prevLine) {
          this.prevLine = currentLine;

          const lineText = update.state.doc.line(currentLine + 1).text;
          //console.log(lineText)
          if(!window.chClient)  return 
          const message = {
            senderID: window.chClient.username || "unknown",
            lineNumber: currentLine,
            content: lineText
          };
          window.chClient.control("sharedCode", message);
          console.log("sharedCode", message.content)
        }
      }

      getCurrentLine(view) {
        return view.state.doc.lineAt(view.state.selection.main.head).number - 1;
      }
    });

    // Init empty CodeMirror editor
    useEffect(() => {
      const state = EditorState.create({
        doc: '',
        extensions: [
          EditorView.editable.of(false),
          EditorView.lineWrapping,
          colorLinePlugin(remoteUserMapRef.current),
        ]
      });

      viewRef.current = new EditorView({
        state,
        parent: document.getElementById("remoteCodeDisplay"),
      });
    }, []);

    /************************************************
     * 
     * Main useEffect and code parsing
     * 
     *************************************************/

    //const value = 'let CHANNEL = 3'
    const [height, setHeight] = useState(false);
    const [code, setCode] = useState(value); //full string of user code
    const [editorView, setEditorView] = useState(null);
    const [highlightEnable, setHighlightEnable] = useState(); // Default theme
    var vars = {}; //current audioNodes
    var innerScopeVars = {}; //maps vars inside scope to a list of its instances
    window.innerScopeVars = innerScopeVars;
    const [refresh, setRefresh] = useState(false);

    const canvases = props.canvases;
    const [codeMinimized, setCodeMinimized] = useState(false);
    const [p5Minimized, setP5Minimized] = useState(false);
    const [maximized, setMaximized] = useState('');

    //remote users
    const [userColors, setUserColors] = useState({});
    const remoteEdits = useRef(new Map()); // key: userID → { lineNumber, content, color }

    // Ensure editorView is set properly when the editor is created
    const onCreateEditor = (view) => {
        setEditorView(view);  // Capture the editorView instance
        //console.log('EditorView created:', view);
    };


    useEffect(() => {
        setHighlightEnable(true)

        const container = document.getElementById('container');
        if (container) {
            setHeight(`${container.clientHeight}px`);
        }
        loadTheme('okaidia').then((loadedTheme) => {
            setTheme('okaidia');
        });

        Array.prototype.rotate = function (n) {
            // Ensure n is an integer, and handle negative rotation
            n = n % this.length;  // This ensures n stays within array bounds
            if (n < 0) n += this.length;  // For negative rotation, we add the array length

            // Perform the rotation
            return this.slice(n).concat(this.slice(0, n));
        };

        Array.prototype.peek = function (n) {
            // Ensure n is an integer, and handle negative rotation
            n = n % this.length;  // This ensures n stays within array bounds
            if (n < 0) n += this.length;  // For negative rotation, we add the array length

            // return the element at n
            return this[Math.floor(n)]
        };

        Array.prototype.poke = function (n, v) {
            // Ensure n is an integer, and handle negative rotation
            n = n % this.length;  // This ensures n stays within array bounds
            if (n < 0) n += this.length;  // For negative rotation, we add the array length
            let temp = this[n]
            //modify the array
            this[Math.floor(n)] = v
            //return the previous value of the changed element
            return temp
        };
        //const audioContext = new AudioContext({ latencyHint: 'interactive' });
        //Tone.setContext(audioContext);
        // Close the old context (optional, but recommended)
//Tone.getContext().rawContext.close();

// Create a new one with the desired latency behavior
const ctx = new (window.AudioContext || window.webkitAudioContext)({
  latencyHint: 'balanced',   // or 'balanced', 'playback', or a numeric seconds value
  sampleRate: 48000             // optional — can specify here too
});

// Tell Tone.js to use this new context
//Tone.setContext(new Tone.Context(ctx));
        window.audioContext = ctx//Tone.context.rawContext;
        //console.log("latencyHint:", Tone.context.rawContext.latencyHint);
        console.log("baseLatency:", Tone.context.rawContext.baseLatency);

        return () => {

        };
    }, []);

    function removeComments() {
        // Regular expression to match single-line and multi-line comments
        const commentRegex = /\/\/.*?$|\/\*[\s\S]*?\*\//gm;

        // Remove comments from the code using the regular expression
        const cleanedCode = code.replace(commentRegex, '');
        return cleanedCode;
    }

    function updateCode(string) {
        let acorn = require('acorn');
        let walk = require('acorn-walk');
        let ast = null;
        let incr = 0;
        let length1 = 'globalThis.'.length;
        let length2 = " = null".length;
        let varNames = [];
        let innerVars = [];
        let p5Code = "";


        // Match p5{...} blocks and extract the content
        const p5BlockRegex = /p5\s*{([^}]*)}/g;
        let match;
        while ((match = p5BlockRegex.exec(string)) !== null) {
            p5Code += match[1] + "\n";
            string = string.replace(match[0], ""); // Remove the p5{...} block from the string
        }

        try {
            ast = acorn.parse(string, { ecmaVersion: 'latest' });
        } catch (error) {
            console.log("Error parsing code: ", error);
        }
        function handleScopedVars(end) {
            let scopedVars = innerVars.pop();
            let newStr = "";
            for (let val of scopedVars) {
                newStr += `if(typeof ${val} !== 'undefined' && (${val}.context || ${val} instanceof AudioContext)){innerScopeVars['${val}'].push(${val});} `;
            }
            string = string.substring(0, end - 1) + newStr + string.substring(end - 1);
            incr += newStr.length;
        }

        //Take action when we see a VariableDeclaration Node
        const visitors = {

            VariableDeclaration(node, state, c) {
                //remove kind (let/var/const)
                //console.log('1',string)
                if (!state.innerScope) {
                    let kind = node.kind;
                    string = string.substring(0, node.start + incr) + string.substring(node.start + incr + kind.length);
                    incr -= kind.length;
                }
                //Continue walk to search for identifiers
                for (const declaration of node.declarations) {
                    let name = declaration.id.name;
                    let start = declaration.start;
                    let end = declaration.end;
                    //Add globalThis & push variable names
                    if (!state.innerScope && !state.forLoop) {
                        //console.log('3',string)
                        string = string.substring(0, start + incr) + "globalThis." + string.substring(start + incr);
                        incr += length1;
                        varNames.push(name);
                        if (Object.keys(vars).includes(name)) {
                            try {
                                vars[name].stop();
                            } catch {

                            }
                        }
                    }
                    else if (state.innerScope && (!state.forLoop || state.forOf)) {
                        innerVars[innerVars.length - 1].push(name);
                        if (!Object.keys(innerScopeVars).includes(name)) {
                            innerScopeVars[name] = [];
                        }
                    }
                    //In case of no assignment, set to var to null
                    let init = declaration.init;
                    if (!init && !state.forLoop) {
                        //console.log('5',string)
                        string = string.substring(0, end + incr) + " = null" + string.substring(end + incr);
                        incr += length2;
                    }
                    else if (init) {
                        if (init.body) {
                            let newState = {
                                innerScope: true,
                                forLoop: false
                            }
                            innerVars.push([]);
                            c(init.body, newState);
                            //Add vals of innerVar to innerScopeVars
                            handleScopedVars(init.body.end + incr);
                        }
                    }
                }
            },

            FunctionDeclaration(node, state, c) {
                //console.log('func', string)
                let name = node.id.name;
                let start = node.start + incr;
                let end = node.id.end + incr;
                let newCode = `globalThis.${name} = function`;
                string = string.substring(0, start) + newCode + string.substring(end);
                incr += newCode.length - (end - start);
                let newState = {
                    innerScope: true,
                    forLoop: false
                }
                innerVars.push([]);
                c(node.body, newState);
                handleScopedVars(node.end + incr);
            },

            ClassDeclaration(node, state, c) {
                //console.log('class', string)
                let name = node.id.name;
                let start = node.start + incr;
                let end = node.id.end + incr;
                let newCode = `globalThis.${name} = class`;
                string = string.substring(0, start) + newCode + string.substring(end);
                incr += newCode.length - (end - start);
                let newState = {
                    innerScope: true,
                    forLoop: false
                }
                innerVars.push([]);
                c(node.body, newState);
                handleScopedVars(node.end + incr);
            },

            ForStatement(node, state, c) {
                //console.log('for', string)
                let newState = {
                    innerScope: true,
                    forLoop: true
                }

                c(node.init, newState);
                newState.forLoop = false;
                innerVars.push([]);
                c(node.body, newState);
                handleScopedVars(node.end + incr);
            },

            ForOfStatement(node, state, c) {
                let newState = {
                    innerScope: true,
                    forLoop: true,
                    forOf: true
                }

                innerVars.push([]);
                c(node.left, newState);
                c(node.right, newState);
                handleScopedVars(node.end + incr);

                innerVars.push([]);
                newState.forOf = false;
                newState.forLoop = false;
                c(node.body, newState);
                handleScopedVars(node.end + incr);
            }
        }

        const initialState = {
            innerScope: false,
            forLoop: false
        };

        try {
            walk.recursive(ast, initialState, visitors);
        } catch (error) {
            console.log("Error parsing code: ", error);
        }
        return [string, p5Code, varNames];
    }

    function evaluate(string, p5Code) {
        try {
            //console.log('eval', string);
            eval(string);

            const edit = {
                execute: string, // Use the entire content as `fullText`
            };

            if (typeof window.gui !== 'undefined') {
                //if( p5Code.length > 2) window.gui.p5Code = p5Code;
            } else {
                //console.log(`Warning: p5 instance 'gui' does not exist.`);
            }
        } catch (error) {
            console.log("Error Evaluating Code", error);
        }
    }

    function updateVars(varNames) {
        let cleanedCode = removeComments();
        //console.log(node)
        function isAudioNode(node) {
            try { return node.context || node instanceof AudioContext; }
            catch (e) { console.log(e) }
        }
        for (const [key, instances] of Object.entries(innerScopeVars)) {
            if (!cleanedCode.includes(key)) {
                for (const instance of instances) {
                    try {
                        instance.stop();
                        //console.log('upd')
                    } catch (error) {
                        //not playing
                    }
                }
                delete innerScopeVars[key];
            }
        }
        //REMINDER: Issue may arise from scheduled sounds
        for (const varName of varNames) {
            //Add name, val pairs of ONLY audionodes to vars dictionary 
            let nameOfCurrentVariable = eval(varName)
            if (isAudioNode(nameOfCurrentVariable)) {
                vars[varName] = nameOfCurrentVariable;
            }
        }

        //Remove all vars that have been deleted from full code
        for (const [key, val] of Object.entries(vars)) {
            if (!(key in vars)) {
                if (!(cleanedCode.includes(key.substring(0, key.length - 4)))) {
                    try {
                        val.stop();
                    } catch (error) {
                        //val not playing sound
                    }
                }
                else {
                    vars[key] = val;
                }
            }
        }
    }

    function traverse(string) {
        const [updatedString, p5Code, varNames] = updateCode(string);
        evaluate(updatedString, p5Code);
        updateVars(varNames);
    }

    function evaluateLine() {
        try {
            var line = code.split('\n')[curLineNum - 1];
            traverse(line);
            //flashLine(editorView,curLineNum)
            if (highlightEnable) addLineDecoration(curLineNum - 1)
        } catch (error) {
            console.log(error);
        }
    }

    function evaluateBlock() {
        try {
            //add "//" inside innerscope
            const lines = removedSpaces();
            var linepos = curLineNum - 1;
            var line = lines[linepos];
            while (line !== undefined && line.replace(/\s/g, "") !== '') {
                linepos -= 1;
                line = lines[linepos];
            }
            var start = linepos + 1;
            linepos = curLineNum;
            line = lines[linepos];
            while (line !== undefined && line.replace(/\s/g, "") !== '') {
                linepos += 1;
                line = lines[linepos];
            }
            traverse(lines.slice(start, linepos).join('\n'));
            if (highlightEnable) flashBlock(start, linepos - 1, 1000)
        } catch (error) {
            console.log(error);
        }
    }

    const addLineDecoration = (lineNumber, duration = 1000) => {
        if (editorView) {
            const line = editorView.state.doc.line(lineNumber + 1);
            //console.log(line)
            // Create a blue background decoration (without fade-out initially)
            const deco = Decoration.line({ class: "line-highlight" }).range(line.from);

            // Apply the highlight immediately
            const transaction = editorView.state.update({
                effects: addDecorationEffect.of(deco)
            });
            editorView.dispatch(transaction);

            // Add the fade-out class after a short delay to trigger the fade-out effect
            setTimeout(() => {
                const elements = document.getElementsByClassName('line-highlight');
                for (let el of elements) {
                    el.classList.add('fade-out');  // Add the fade-out class after the highlight
                }
            }, 300); // Small delay to allow the initial highlight to appear instantly

            // Remove the highlight after the specified duration
            setTimeout(() => {
                const clearTransaction = editorView.state.update({
                    effects: clearAllDecorationsEffect.of(null) // Remove decoration
                });
                editorView.dispatch(clearTransaction);
            }, duration);
        }
    };

    // Add decoration to a block of lines
    const flashBlock = (startLine, endLine, duration = 1000) => {

        if (editorView) {
            const decorations = [];

            // Loop through each line in the block and create a decoration
            for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
                const line = editorView.state.doc.line(lineNumber + 1);  // CodeMirror uses 1-based line numbers
                const deco = Decoration.line({ class: "line-highlight" }).range(line.from);

                // Apply each decoration as its own transaction
                const transaction = editorView.state.update({
                    effects: addDecorationEffect.of(deco)
                });
                editorView.dispatch(transaction);
            }

            // Add fade-out class after a delay (longer delay might be needed for smooth appearance)
            setTimeout(() => {
                const elements = document.getElementsByClassName('line-highlight');
                for (let el of elements) {
                    el.classList.add('fade-out');  // Add fade-out class to each highlighted line
                }
            }, 200); // Small delay to apply the fade-out class

            // Set a timeout to remove the block decoration after the duration
            setTimeout(() => {
                const clearTransaction = editorView.state.update({
                    effects: clearAllDecorationsEffect.of(null) // Remove the block decoration
                });
                editorView.dispatch(clearTransaction);
            }, duration);
        }
    };

    function removedSpaces() {
        let lines = code.split("\n");
        let openBraces = 0;
        let closedBraces = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].replace(/\s/g, "") === '') {
                if (openBraces > closedBraces) {
                    lines[i] = "//";
                }
            }
            else {
                if (lines[i].includes("{")) {
                    openBraces += 1;
                }
                if (lines[i].includes("}")) {
                    closedBraces += 1;
                }
            }
        }
        return lines;
    }

    //CODEMIRROR HANDLERS
    //save history in browser and update code value
    const handleCodeChange = (value, viewUpdate) => {

        if (refresh) {
            setRefresh(false);
        }

        if (editorView) {
            const currentDoc = editorView.state.doc.toString(); // Get the current content
            //console.log(currentDoc);
        }

        localStorage.setItem(`${props.page}Value`, value);
        setCode(value);
        //viewUpdate.view.dom.clientHeight = document.getElementById('main').clientHeight;
        const state = viewUpdate.state.toJSON(stateFields);
        localStorage.setItem(`${props.page}EditorState`, JSON.stringify(state));

        if (viewUpdate.changes) {
          try {
            const lineChanges = [];
            viewUpdate.changes.iterChanges((from, to, inserted) => {
              const doc = viewUpdate.state.doc;

              const startLine = doc.lineAt(from).number - 1; // 0-based
              const endLine = doc.lineAt(to).number - 1;

              for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
                const lineContent = doc.line(lineNumber + 1).text;
                lineChanges.push({ lineNumber, content: lineContent });
              }
            });

            // ✅ Send the changes over the network
            if( window.chClient) {
                //console.log(window.chClient.username)
                lineChanges.forEach((edit) => {
                  const message = {
                    senderID: window.chClient.username, // optional
                    lineNumber: edit.lineNumber,
                    content: edit.content,
                  }

                  
                window.chClient.control("sharedCode", message);
                //console.log('sent', message)
                });
                
            };
          } catch (e) {
            //console.error("Change iteration failed:", e);
          }
        }
    };



    //Handle Live Mode Key Funcs
    const handleKeyDown = (event) => {
        if (event.altKey && event.shiftKey && event.key === 'Enter') {
            // if (prevLineNum !== curLineNum) {
            //     setRemoveEnter(true);
            // }
            evaluateBlock();
        }
        // else if (event.ctrlKey) {
        //     setPrevLineNum(curLineNum);
        // }
        else if (event.altKey && event.key === 'Enter') {
            evaluateLine();
        }
    };


    const handleStatistics = (data) => {
        curLineNum = data.line.number;
    }

    //GUI HANDLERS
    //Handle Mode Changes + Play & Stop
    const playClicked = () => {
        // stopClicked();
        traverse(code);
    }

    //Handle refresh/max/min buttons
    const refreshClicked = () => {
        setRefresh(true);
        localStorage.setItem(`${props.page}Value`, props.starterCode);
    }

    /************************************************
     * 
     * autocompletion
     * 
     *************************************************/

    const usefulCompletions = ["frequency", "factor", "Oscillator", "Filter", "Tone", "value"];
    const [useAutoComplete, setUseAutoComplete] = useState(true);

    function getClassMethods(obj) {
        let functions = Object.keys(obj);

        let currentPrototype = Object.getPrototypeOf(obj);
        if (typeof obj === "function" && obj.prototype) {
            // Input is a class/constructor
            currentPrototype = obj.prototype;
        }

        while (currentPrototype && currentPrototype !== Object.prototype) {
            // Get own property names of the current prototype
            const propertyNames = Object.getOwnPropertyNames(currentPrototype)
                .filter(name => name !== "constructor");

            functions = functions.concat(propertyNames);

            // Move up the prototype chain
            currentPrototype = Object.getPrototypeOf(currentPrototype);
        }

        return Array.from(new Set(functions)); // Remove duplicates
    }


    function getMethodCompletions(object) {
        let methods = (getClassMethods(object)).map((method) => ({
            label: method,
            type: "function",
            //detail: `${method}() - Method from MyClass`,
        }));
        //console.log(params);
        return methods;
    }

    function sortCompletions(suggestions) {
        suggestions.sort((a, b) => {
            // Check if labels begin with "_"
            const aIsUnderscore = a.label.startsWith('_');
            const bIsUnderscore = b.label.startsWith('_');

            // Move items starting with "_" to the end
            if (aIsUnderscore && !bIsUnderscore) return 1;
            if (!aIsUnderscore && bIsUnderscore) return -1;

            // If both labels start (or do not start) with "_", keep original order
            return 0;
        });

        // Now go through custom useful suggestions
        usefulCompletions.forEach((element) => {
            suggestions.sort((a, b) => {
                const aIsUseful = a.label == element;
                const bIsUseful = b.label == element;

                if (aIsUseful && !bIsUseful) return -1;
                if (!aIsUseful && bIsUseful) return 1;

                return 0;
            });
        });

    }

    function objectFunctionCompleter(context) {
        if (!useAutoComplete) {
            return null;
        }

        const word = context.matchBefore(/([\sa-zA-Z0-9().]+)\.([a-zA-Z0-9()]*)$/); // Match "objectName.method"
        if (!word || (word.from === word.to && !context.explicit)) return null;

        const [_, objectName, typedMethod] = word.text.match(/([\sa-zA-Z0-9().]+)\.([a-zA-Z0-9()]*)$/) || [];
        // console.log(objectName);

        if (!objectName) return null; // No valid object name detected

        const typed = typedMethod;

        // Helper function to attempt evaluation of an object name and return suggestions
        function tryGetSuggestions(evalExpression) {
            try {
                const suggestions = getMethodCompletions(eval(evalExpression)).filter((item) =>
                    item.label.startsWith(typed)
                );

                //get suggestions defined in each class
                let definedSuggestions = [];
                try {
                    definedSuggestions = eval(evalExpression).autocompleteList.filter((item) =>
                        item.startsWith(typed)
                    );
                    definedSuggestions = definedSuggestions.map(label => ({
                        label: label,
                        type: 'function'
                    }));
                    if (definedSuggestions == undefined) {
                        definedSuggestions = [];
                    }
                } catch (error) {

                }

                sortCompletions(suggestions);
                return {
                    from: word.from + objectName.length + 1, // Start suggestions after the dot
                    options: definedSuggestions.concat(suggestions),
                    filter: false
                };
            } catch (error) {
                return null;
            }
        }

        // Attempt to get suggestions using progressively simpler expressions
        return (
            tryGetSuggestions(objectName) ||
            tryGetSuggestions(objectName.split(" ").pop()) ||
            tryGetSuggestions(objectName.split("(").pop()) ||
            (console.debug("Unable to autocomplete"), null)
        );
    }//object function completer

    function presetNameCompleter(context) {
      if (!useAutoComplete) return null;

      // Match objectName.loadPreset("partial OR 'partial OR partial
      const match = context.matchBefore(/([a-zA-Z0-9_$]+)\.loadPreset\(["']?([\w\-]*)$/);
      if (!match) return null;

      const [, objectName, typed = ""] = match.text.match(/([a-zA-Z0-9_$]+)\.loadPreset\(["']?([\w\-]*)$/) || [];
      if (!objectName) return null;

      let presetKeys = [];

      try {
        const synth = eval(objectName);
        if (!synth?.presets) return null;
        presetKeys = Object.keys(synth.presets);
      } catch (e) {
        console.warn(`Unable to evaluate object '${objectName}' for preset completion:`, e);
        return null;
      }

      const userTypedQuote = /['"]/.test(match.text[match.text.indexOf('loadPreset') + 11] || '');

      return {
        from: match.from + `${objectName}.loadPreset(`.length,
        options: presetKeys.map(name => ({
          label: name,
          type: 'preset',
          apply: userTypedQuote ? name : `"${name}"`
        })),
        filter: true
      };
    }

    const combinedCompleter = async (context) => {
      return (
        presetNameCompleter(context) ||
        objectFunctionCompleter(context)
      );
    };


    /************************************************
     * 
     * Code Exporting
     * 
     *************************************************/
    function exportCode() {
        const selectedOption = document.getElementById('exportOptions').value;
        //const codeContent = document.getElementById('codeContent').innerText;

        switch (selectedOption) {
            case 'link':
                exportAsLink();
                break;
            case 'textFile':
                exportAsTextFile();
                break;
            case 'webPage':
                exportAsWebPage();
                break;
            default:
                alert('Please select an export option.');
        }
        document.getElementById('exportOptions').value = "default";
    }

    function exportAsLink(code) {
        const liveCode = localStorage.getItem(`${props.page}Value`);
        const compressedCode = LZString.compressToEncodedURIComponent(liveCode)
        // .replace(/\+/g, '-')
        // .replace(/\//g, '_')
        // .replace(/=+$/, ''); // Removes padding
        const url = `https://ianhattwick.com/creativitas/?code=${compressedCode}`;
        //const url = `http://localhost:3000/m361/?code=${compressedCode}`;
        navigator.clipboard.writeText(url);
        console.log('URL copied to clipboard');
    }

    //Export webpage code
    const exportAsTextFile = () => {
        const blob = new Blob([localStorage.getItem(`${props.page}Value`)], { type: 'text/plain' });
        let filename = prompt('Enter the filename:', 'mySynth.txt');
        if (!filename) {
            filename = 'mySynth.txt';  // Default filename if the user cancels the prompt
        }
        console.log(localStorage.getItem(`${props.page}Value`))

        const url = URL.createObjectURL(blob);
        // Create an invisible anchor element
        //console.log(url)
        const a = document.createElement('a');
        a.style.display = 'none';
        // Set the anchor's href attribute to the URL
        a.href = url;
        // Set the anchor's download attribute to specify the filename
        a.download = filename; // Set the default filename
        // Append the anchor element to the document
        //console.log(a)
        document.body.appendChild(a);
        // Simulate a click event on the anchor to trigger the download
        a.click();
        // Remove the anchor element from the document
        document.body.removeChild(a);
        // Revoke the URL to free up resources
        URL.revokeObjectURL(url);
        console.log(`Exporting file with name: ${filename}`);
    };
    //end export dialog support

    async function exportAsWebPage() {
        const code = localStorage.getItem(`${props.page}Value`);

        // Create HTML template with required dependencies
        const htmlContent = await webExportHTMLContentGenerator(code);

        // Create a Blob with the HTML content
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        // Create a link element and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'creativitas-export.html';
        document.body.appendChild(a);
        a.click();

        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /************************************************
     * 
     * Resize Canvas
     * 
     *************************************************/
    const codeMinClicked = () => {
        setCodeMinimized(!codeMinimized);
        for (let id of canvases) {
            try {
                window[id].divResized(codeMinimized ? '-w' : '+w');
            }
            catch {
            }
        }
    }

    const canvasMinClicked = () => {
        setP5Minimized(!p5Minimized);
    }

    const handleMaximizeCanvas = (canvasId) => {
        if (maximized === canvasId) {
            setMaximized('');
        }
        else {
            setMaximized(canvasId);
        }
    };

    const clearCanvases = () => {
        for (const id of canvases) {
            let canvas = document.getElementById(id);
            canvas.innerHTML = "";
        }
    }

    /************************************************
     * 
     * HTML
     * 
     *************************************************/
    return (
        <div id="flex" className="flex-container" >
            {!codeMinimized &&
                <div className="flex-child" >
                    <span className="span-container">
                        <span className="span-container">
                            <button className="button-container" onClick={playClicked}>Run</button>
                            <MidiKeyboard />
                            <button className="button-container" onClick={refreshClicked}>Starter Code</button>

                            {/* Timing Controls */}
                            <div className="timing-controls">
                                {/* Timing Strategy Selector */}
                                <select
                                    className="timing-strategy-selector"
                                    onChange={async (e) => {
                                        const strategy = e.target.value;
                                        if (strategy === 'tone_js') {
                                            window.useToneJsTiming();
                                        } else if (strategy === 'timing_object') {
                                            await window.useTimingObjectTiming();
                                        } else if (strategy === 'midi_clock') {
                                            window.useMidiClockTiming();
                                        }
                                    }}
                                    defaultValue={timingStrategyManager.getActiveStrategy()}
                                >
                                    <option value="tone_js">Tone.js Timing</option>
                                    <option value="timing_object">Timing Object</option>
                                    <option value="midi_clock">MIDI Clock</option>
                                </select>

                                {/* Start/Stop Buttons */}
                                <button
                                    className="button-container timing-button"
                                    onClick={() => {
                                        timingStrategyManager.start();
                                        console.log('Timing manager started');
                                    }}
                                >
                                    Start
                                </button>
                                <button
                                    className="button-container timing-button"
                                    onClick={() => {
                                        timingStrategyManager.stop();
                                        console.log('Timing manager stopped');
                                    }}
                                >
                                    Stop
                                </button>
                            </div>
                        </span>
                        <span className="span-container">

                            {/* Export options */}
                            <select id="exportOptions" onChange={exportCode} defaultValue="default">
                                <option value="default" disabled>Export Code</option>
                                <option value="link">Link to Code</option>
                                <option value="textFile">Text File</option>
                                <option value="webPage">Web Page</option>
                            </select>
                            { /* <input type="file" ref={fileInputRef} style={{ display: 'none' }} /> */}

                            {!p5Minimized &&
                                <button className="button-container" onClick={codeMinClicked}>-</button>
                            }
                            <button className="button-container" onClick={canvasMinClicked}>{p5Minimized ? '<=' : '+'}</button>
                        </span>
                    </span>
                    <div id="container" >
                        {height !== false &&
                            <CodeMirror
                                id="codemirror"
                                value={refresh ? props.starterCode : value}
                                initialState={
                                    serializedState
                                        ? {
                                            json: JSON.parse(serializedState || ''),
                                            fields: stateFields,
                                        }
                                        : undefined
                                }
                                options={{
                                    mode: 'javascript',
                                }}
                                theme={themeDef}
                                extensions={[javascript({ jsx: true }), decorationsField, autocompletion({ override: [combinedCompleter] }), broadcastCursorLinePlugin]}
                                onChange={handleCodeChange}
                                onKeyDown={handleKeyDown}
                                onStatistics={handleStatistics}
                                height={height}
                                onCreateEditor={onCreateEditor}
                            />
                        }
                    </div>
                </div>
            }

          
          {!p5Minimized &&
                <div id="canvases" className="flex-child">
                <div id="remoteCodeDisplay"></div>
                    <span className="span-container">
                        {codeMinimized &&
                            <button className="button-container" onClick={codeMinClicked}>{"=>"}</button>
                        }
                    </span>
                    {canvases.map((id) => (
                        <Canvas key={id} id={id} onMaximize={handleMaximizeCanvas} maximized={maximized} canvasLength={canvases.length} />
                    ))}
                </div>
            }

          
        </div>

    );
}

export default Editor;