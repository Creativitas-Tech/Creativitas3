class MidiVal {
    constructor() {
        this.value = 0;
        this.display = null;
    }
    triggerFunc(){
        //
    }
    on(func) { this.triggerFunc = func }
    cb(){}
}

class MidiCC {
    constructor(num) {
        this.num = num;
        this.value = 0;
        this.on = (val, device) => {};
        this.display = null;
    }
    trigger(val, device) {
        this.value = val;
        if (this.on) this.on(val, device);
        if (device.showVisuals && this.display) this.display(val, this.num, device);
    }
    cb(){}
}

class MidiNote {
    constructor(num) {
        this.num = num;
        this.velocity = 0;
        this.isDown = false;
        this.display = null;
    }
    triggerOn(vel, device=null) {
        this.velocity = vel;
        this.isDown = true;
        //if (device.showVisuals && this.display) this.display(vel, this.num, device, "on");
    }
    triggerFunc(note,vel){
        //
    }
    triggerOff(vel, device=null) {
        this.velocity = 0;  
        this.isDown = false;
        //if(!device) return
        //if (this.off) this.off(vel, device);
        //if (device.showVisuals && this.display) this.display(vel, this.num, device, "off");
    }
    on(func) { this.triggerFunc = func }
    cb(){}

}

export class MidiPort {
    /**
     * @param {string|number} nameOrIndex - The name of the MIDI device or its index in the list.
     */
    constructor(name, input, output) {
        this.name = name
        this.input = input;
        this.output = output;
        this.inputID = input ? input.id : null;
        if (this.input) {
            this.input.onmidimessage = this._onMessage.bind(this);
        }
        // Handle Output Namespace
        this.send = {
            cc: (num, val, channel = 0) => this.sendCC(num, val, channel),
            note: (num, vel, channel = 0) => this.sendNote(num, vel, channel)
        };
        
        this.ccs = {};
        this.notes = {};
        this.note = new MidiVal()
        this.cc = new MidiVal()

        this._createIOObjects()
        this.verbose = true

        this.noteHandler = ()=>{}
        this.ccHandler = ()=>{}
        this.clockHandler = ()=>{}
    }

    _createIOObjects() {
        for (let i = 0; i < 128; i++) {
            this[`cc${i}`] = new MidiCC(i);
            this[`note${i}`] = new MidiNote(i);
            this.ccs[i] = this[`cc${i}`];
            this.notes[i] = this[`note${i}`];
        }
    }
    /*
Hex   Binary      Decimal   Meaning    Channel
0x80  1000 xxxx   128       Note Off   0–15
0x90   1001 xxxx  144       Note On   0–15
0xA0   1010 xxxx  160       Polyphonic Aftertouch   0–15
0xB0   1011 xxxx  176       Control Change (CC)   0–15
0xC0   1100 xxxx  192       Program Change   0–15
0xD0   1101 xxxx  208       Channel Pressure   0–15
0xE0   1110 xxxx  224       Pitch Bend   0–15
0xF0   1111 xxxx  240       System messages   N/A
*/

    _onMessage(msg) {
        const [status, data1, data2] = msg.data;
        const type = status & 0xf0;
        const channel = (status & 0x0f) + 1;
        if(0) console.log('raw', type, channel, data1, data2)
        //if(1) console.log('raw', msg.data)

        if (type === 0xb0) {
            this.ccs[data1]?.cb(data2, this);
            this.cc.cb(data1, data2)
            if(this.verbose) console.log('cc', data1, data2)
            //this.CCHandler(data1,data2)
        }
        else if (type === 0x90 && data2 > 0) {

            this.notes[data1]?.cb(data2);
            this.note.cb(data1, data2)
            if(this.verbose) console.log('note on', data1, data2)
            // this.notes[data1]?.on(data2)
            //this.noteOnHandler(data1,data2)
        }
        else if (type === 0x80 || (type === 0x90 && data2 === 0)) {
            this.notes[data1]?.cb(0);
            this.note.cb(data1, data2)
            if(this.verbose) console.log('note off', data1, data2)
            //this.notes[data1]?.triggerOff(data2, this);
            //this.noteOnHandler(data1,0)
        }
        else if (type === 192 ) {
            //this.notes[data1]?.triggerFunc(0, this);
            if(this.verbose) console.log('program change', data1)
            //this.notes[data1]?.triggerOff(data2, this);
            //this.noteOnHandler(data1,0)
        }
        else{
            try{
                if(this.verbose) console.log('other', type, channel, data1, data2)
            } catch(e){
                console.log(msg, e)
            }
        }
    }

    onNote(func) {
        console.log(func)
        this.noteHandler = func
    }
    onCC(func) {
        this.CCHandler = func
    }
    onClock(func) {
        this.clockHandler = func
    }

    // --- Output Methods ---

    sendCC(num, val, channel = 0) {
        if (!this.output) return;
        // 0xB0 is CC, + channel (0-15)
        this.output.send([0xb0 + channel, num, val]);
    }

    sendNote(num, vel, channel = 0) {
        if (!this.output) return;
        const status = vel > 0 ? 0x90 : 0x80;
        //console.log([status + channel, num, vel])
        this.output.send([status + channel, num, vel]);
    }
    
    // Helper to send raw bytes if needed
    sendRaw(data) {
        if (this.output) this.output.send(data);
    }

    // Add this inside your MidiPort class
    setProgrammerMode(model = 'MINI_MK3') {
        if (!this.output) return;

        let msg;
        switch(model.toUpperCase()) {
            case 'X':
            case 'MINI_MK3':
                msg = [0xF0, 0x00, 0x20, 0x29, 0x02, 0x0C, 0x0E, 0x01, 0xF7];
                break;
            case 'PRO_MK3':
                msg = [0xF0, 0x00, 0x20, 0x29, 0x02, 0x0E, 0x0E, 0x01, 0xF7];
                break;
            case 'MK2':
                msg = [0xF0, 0x00, 0x20, 0x29, 0x02, 0x18, 0x22, 0x01, 0xF7];
                break;
            default:
                console.error("Unknown Launchpad model");
                return;
        }

        try {
            this.output.send(msg);
            console.log("Launchpad Mini MK3: Programmer Mode Sent");
        } catch (e) {
            console.error("SysEx failed. Did you forget {sysex: true}?", e);
        }
    }

}

export default MidiPort;