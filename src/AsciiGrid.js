export class AsciiGrid {
    constructor() {
        
        this.handler = (num, value) => {
            console.log(`AskeyGrid: key ${num}, value ${value}`);
        };
        this.activeKeys = {};
        this.pressedKeys = []

        this.keyMap = this.buildKeyMap();

        this.keyDown = this.keyDown.bind(this);
        this.keyUp = this.keyUp.bind(this);

        this.enable()
    }

    // Define your custom key-to-grid-number mapping
    buildKeyMap() {
        const layout = [
            ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],      // row 0
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],      // row 1
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],      // row 2
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],      // row 3
            ['Tab', 'Shift', 'Enter', ' ', 'Backspace'],            // row 4 — optional control keys
        ];

        const map = {};
        let num = 0;
        for (let row = 0; row < layout.length; row++) {
            for (let col = 0; col < layout[row].length; col++) {
                const key = layout[row][col];
                map[key.toLowerCase()] = num++;
            }
        }
        return map;
    }

    keyDown(event) {
        if (!this.enabled) return;

        const key = event.key.toLowerCase();
        if (!this.activeKeys[key] && key in this.keyMap) {
            this.pressedKeys.push(this.keyMap[key])
            this.activeKeys[key] = true;
            this.handler(this.keyMap[key], 1);
        }
    }

    keyUp(event) {
        if (!this.enabled) return;

        const key = event.key.toLowerCase();
        if (this.activeKeys[key]) {
            this.pressedKeys = this.pressedKeys.filter(x=> x!= this.keyMap[key])
            this.activeKeys[key] = false;
            this.handler(this.keyMap[key], 0);
        }
    }

    enable() {
        if (!this.enabled) {
            this.enabled = true;
            document.addEventListener('keydown', this.keyDown);
            document.addEventListener('keyup', this.keyUp);
        }
    }

    disable() {
        if (this.enabled) {
            this.enabled = false;
            document.removeEventListener('keydown', this.keyDown);
            document.removeEventListener('keyup', this.keyUp);
        }
    }

    setHandler(handler) {
        this.handler = handler;
    }

    pressed() {
        return this.pressedKeys//Object.keys(this.activeKeys).filter(k => this.activeKeys[k]);
    }
}