// 

class MidiPort{
    constructor(port_number = 0){
        this.midiDevice = this.enableThisPort()
        this.createCCs()
        this.createNotes()

        return this.midiDevice
    }
    createCCs(){
        for(let i=0;i<128;i++) {
            const name = 'cc'+i
            this.name = new MidiCC(i)
        }
    }
    createNotes(){
        for(let i=0;i<128;i++) {
            const name = 'note'+i
            this.name = new MidiNote(i)
        }
    }

}

class MidiCC{
    constructor(num){
        this.num = num
        this.display = None
    }
    on(val){
        //call on incoming data
        this.onDisplay()
    }
    onDisplay(val){
        //display value somewhere
    }
}

class MidiNote{
    constructor(note){
        this.num = num
    }
    on(vel){
        //
    }
    off(vel){
        //
    }
}

export default MidiPort;