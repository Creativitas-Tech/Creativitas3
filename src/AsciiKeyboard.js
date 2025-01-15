//Sometimes you have to ask chatGPT to start from scratch :-)

class AsciiCallback {
    constructor() {
        this.asciiOn = false;
        this.handler = (key, upOrDown) => {
            console.log('Ascii', key, upOrDown,
                '\nadd a new handler like: \nsetAsciiHandler((num,state)=>{\nconsole.log(num, state)})');
        };
        this.activeKeys = {};
        
        // Bind the event handlers
        this.keyDown = this.keyDown.bind(this);
        this.keyUp = this.keyUp.bind(this);
    }

    keyDown(event) {
        if (!this.asciiOn) return;

        const keyCode = event.keyCode;
        let key = keyCode
        if( keyCode == 32 ) key = 'Space'
        else key = event.key;
        if (!this.activeKeys[key]) {
            this.activeKeys[key] = true;
            this.handler(key, 'down');
        }
    }

    keyUp(event) {
        if (!this.asciiOn) return;

        const keyCode = event.keyCode;
        let key = keyCode
        if( keyCode == 32 ) key = 'Space'
        else key = event.key;
        if (this.activeKeys[key]) {
            this.activeKeys[key] = false;
            this.handler(key, 'up');
        }
    }

    enable() {
        if (!this.asciiOn) {
            this.asciiOn = true;
            document.addEventListener('keydown', this.keyDown);
            document.addEventListener('keyup', this.keyUp);
        }
    }

    disable() {
        if (this.asciiOn) {
            this.asciiOn = false;
            document.removeEventListener('keydown', this.keyDown);
            document.removeEventListener('keyup', this.keyUp);
        }
    }

    setHandler(newHandler) {
        this.handler = newHandler;
    }
}

export const asciiCallbackInstance = new AsciiCallback();

