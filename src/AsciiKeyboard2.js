//Sometimes you have to ask chatGPT to start from scratch :-)

class AsciiCallback {
    constructor() {
        this.asciiOn = false;
        this.loggingOn = false;
        this.listener = false;

        this.handler = (key, upOrDown) => {
            console.log('Ascii', key, upOrDown,
                '\nadd a new handler like: \nsetAsciiHandler((num,state)=>{\nconsole.log(num, state)})');
        };
        this.activeKeys = {};
        this.logs = [];
        this.fileInput = null;
        
        // Bind the event handlers
        this.keyDown = this.keyDown.bind(this);
        this.keyUp = this.keyUp.bind(this);
        this.handleFileChange = this.handleFileChange.bind(this);
    }

    keyDown(event) {
        const keyCode = event.keyCode;
        let key = keyCode
        if( keyCode == 32 ) key = 'Space'
        else key = event.key;
        if (!this.activeKeys[key]) {
            this.activeKeys[key] = true;
            if (this.asciiOn) this.handler(key, 'down');
            if (this.loggingOn) this.logInteraction(key, 'down');
        }
    }

    keyUp(event) {
        const keyCode = event.keyCode;
        let key = keyCode
        if( keyCode == 32 ) key = 'Space'
        else key = event.key;
        if (this.activeKeys[key]) {
            if (this.asciiOn) this.activeKeys[key] = false;
            if (this.loggingOn) this.logInteraction(key, 'up');
        }
    }

    logInteraction(key, state) {
        const timestamp = new Date().toISOString();
        this.logs.push({ key, state, timestamp });
    }

    exportLogs() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.logs));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "performance_logs.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    enable() {
        if (!this.asciiOn) {
            this.asciiOn = true;
            this.listener = true;
            if(this.listener == false) this.enableEventListener();
        }
    }

    disable() {
        if (this.asciiOn) {
            this.asciiOn = false;
            if(this.listener == true) this.disableEventListener();
        }
    }

    enableLogging() {
        if (!this.loggingOn) {
            this.loggingOn = true;
            if(this.listener == false) this.enableEventListener();
            console.log("recording begun")
        }
    }

    disableLogging() {
        if (this.loggingOn) {
            this.loggingOn = false;
            if(this.listener == true) this.disableEventListener();
            this.exportLogs();
            console.log("recording ended")
        }
    }

    enableEventListener(){
        if(this.listener == false){
            this.listener = true
            document.addEventListener('keydown', this.keyDown);
            document.addEventListener('keyup', this.keyUp);
        }     
    }

    disableEventListener(){
        if(this.listener == true){
            this.listener = false
            document.removeEventListener('keydown', this.keyDown);
            document.removeEventListener('keyup', this.keyUp);
        }     
    }

    setHandler(newHandler) {
        this.handler = newHandler;
    }

    loadLogs() {
        if (this.fileInput) {
            this.fileInput.click();
        }
    }

    printLogs(){
        console.log(this.logs)
    }

    handleFileChange(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            this.logs = JSON.parse(e.target.result);
            console.log('Logs loaded:', this.logs);
        };
        reader.readAsText(file);
    }

    replayPerformance() {
        if (this.logs.length === 0) {
            console.log("no recording loaded")
            return;
        }
        console.log("playback begun")

        this.logs.forEach((log, index) => {
            setTimeout(() => {
                const event = new KeyboardEvent(log.state === 'down' ? 'keydown' : 'keyup', {
                    key: log.key,
                    code: log.key,
                    keyCode: log.key === 'Space' ? 32 : log.key.charCodeAt(0),
                    which: log.key === 'Space' ? 32 : log.key.charCodeAt(0),
                    metaKey: log.key === 'execute'
                });
                document.dispatchEvent(event);
                console.log(event)
            }, new Date(log.timestamp) - new Date(this.logs[0].timestamp));
        });
    }
}

export const asciiCallbackInstance = new AsciiCallback();

