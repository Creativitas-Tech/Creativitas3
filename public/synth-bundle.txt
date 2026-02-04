//Sometimes you have to ask chatGPT to start from scratch :-)

class AsciiCallback {
    constructor() {
        this.asciiOn = false;
        this.allowRepeat = false;
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
        if (!this.activeKeys[key] || this.allowRepeat) {
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

const asciiCallbackInstance = new AsciiCallback();



/*
React web client library for Collab-Hub https://www.collab-hub.io
Modified by Artem Laptiev

Original p5.ch - p5 library for Collab-Hub - https://github.com/Collab-Hub-io/p5.CollabHub
Created by Nick Hwang, Anthony T. Marasco, Eric Sheffield
Version v0.1.0 alpha | June 18, 2022
*/

;

class CollabHubClient {

    constructor() {
        console.log('ch')
        this.socket = io("https://collabhub-server-90d79b565c8f.herokuapp.com/slob");
        this.controls = {};
        this.handlers = {};
        this.username = "";
        this.roomJoined = undefined;
        this.clientId = this._generateClientId(); // Unique identifier for this client instance
 
        // Callbacks
        this.controlsCallback = (incoming) => { };
        this.eventsCallback = (incoming) => { };
        this.chatCallback = (incoming) => { };

        // Setup event listeners
        this.initializeSocketEvents();
    }

    _generateClientId() {
        return 'client_' + Math.random().toString(36).substring(2, 15);
    }

    initializeSocketEvents() {

        // chat and user management
        this.socket.on("serverMessage", (incoming) => {
            // console.info(incoming.message);
        });

        this.socket.on("chat", (incoming) => {
            // TODO HACK checking messages to receive my user name
            if (incoming.chat === "Connected with id: " + this.socket.id) {
                this.username = incoming.id;
                // console.info("My user name is: " + incoming.id);
            }
            // console.log(`${incoming.id}: "${incoming.chat}"`);

            // Only process chat messages that weren't sent by this client
            if (incoming.header && incoming.header.clientId !== this.clientId) {
                this.chatCallback(incoming);
            }
        });

        this.socket.on("otherUsers", (incoming) => {
            let userList = "";
            let iterations = incoming.users.length;
            for (let u of incoming.users) {
                userList += --iterations ? `${u}, ` : u;
            }
            // console.info(`Connected users: ${userList}`);
        });

        // controls
        this.socket.on("control", (incoming) => {
            if (this.roomJoined) {                      // Kind of HACK, ignore controls before joining a room
                // Check if this control was sent by this client
                console.log("INCOMING IN COLLABHUB.JS", incoming);
                if (incoming.header && incoming.header.clientId !== this.clientId) {
                    console.log("Not us, continuing");
                    let newHeader = incoming.header,
                        newValues = incoming.values;

                    //reformat header into string
                    const characters = [];
                    for (let i = 0; i < Object.keys(newHeader).length; i++) {
                        if (newHeader.hasOwnProperty(i) && typeof newHeader[i] === 'string') {
                            characters.push(newHeader[i]);
                        }
                    }

                    newHeader = characters.join('');
                    this.controls[newHeader.name] = newValues;
                    if (newHeader.name in this.handlers) {
                        this.handlers[newHeader.name](incoming);
                    }
                    this.controlsCallback(incoming);
                }
            }
        });

        this.socket.on("availableControls", (incoming) => {
            // console.info("Available controls:");
            for (let e of incoming.controls) {
                delete e.observers;
                delete e.mode;
                // console.log(e);
            }
        });

        this.socket.on("observedControls", (incoming) => {
            // console.info("Observed controls:");
            for (let e of incoming.controls) {
                delete e.observers;
                delete e.mode;
                // console.log(e);
            }
        });

        this.socket.on("myControls", (incoming) => {
            // console.info("My controls:");
            for (let e of incoming.controls) {
                delete e.observers;
                delete e.mode;
                // console.log(e);
            }
        });

        // events

        this.socket.on("event", (incoming) => {
            if (this.roomJoined) {                      // Kind of HACK, ignore events before joining a room
                // Check if this event was sent by this client
                if (incoming.header && incoming.header.clientId !== this.clientId) {
                    let newHeader = incoming.header;
                    if (newHeader.name in this.handlers) {
                        this.handlers[newHeader.name](incoming);
                    }
                    // console.log("Incoming event", incoming);
                    this.eventsCallback(incoming);
                }
            }
        });

        this.socket.on("availableEvents", (incoming) => {
            // console.info("Available events:");
            for (let e of incoming.events) {
                delete e.observers;
                delete e.mode;
                // console.log(e);
            }
        });

        this.socket.on("observedEvents", (incoming) => {
            // console.info("Observed events:");
            for (let e of incoming.events) {
                delete e.observers;
                delete e.mode;
                // console.log(e);
            }
        });

        this.socket.on("myEvents", (incoming) => {
            // console.info("My events:");
            for (let e of incoming.events) {
                delete e.observers;
                delete e.mode;
                // console.log(e);
            }
        });

        // rooms

        this.socket.on("availableRoomsList", (incoming) => {
            let roomList = "";
            let iterations = incoming.rooms.length;
            for (let r of incoming.rooms) {
                roomList += --iterations ? `${r}, ` : r;
            }
            // console.info(`Available rooms: ${roomList}`);
        });

    }

    // callbacks

    setControlsCallback(f) { this.controlsCallback = f; }
    setEventsCallback(f) { this.eventsCallback = f; }
    setChatCallback(f) { this.chatCallback = f; }

    // sending data

    control(...args) {
        if (this.roomJoined) {
            let mode = args[0] === "publish" || args[0] === "pub" ? "publish" : "push",
                headerName = mode === "publish" ? args[1] : args[0],
                values = mode === "publish" ? args[2] : args[1],
                target = mode === "publish" ? args[3] ? args[3] : this.roomJoined : args[2] ? args[2] : this.roomJoined;

            const header = {
                name: headerName,
                clientId: this.clientId
            };
            
            const outgoing = {
                mode: mode,
                header: header,
                values: values,
                target: target
            };
            console.log("control", outgoing)
            this.socket.emit("control", outgoing);
        } else {
            console.info("Join a room to send controls.");
        }
    }

    event(...args) {
        if (this.roomJoined) {
            let mode = args[0] === "publish" || args[0] === "pub" ? "publish" : "push",
                headerName = mode === "publish" ? args[1] : args[0],
                target = mode === "publish" ? args[2] ? args[2] : this.roomJoined : args[1] ? args[1] : this.roomJoined;
            
            const header = {
                name: headerName,
                clientId: this.clientId
            };
            
            const outgoing = {
                mode: mode,
                header: header,
                target: target
            };
            this.socket.emit("event", outgoing);
        } else {
            console.info("Join a room to send events.");
        }
    }

    chat(m, t) {
        if (this.roomJoined) {
            const header = {
                clientId: this.clientId
            };
            
            const outgoing = {
                chat: m,
                header: header
            };
            t ? outgoing.target = t : outgoing.target = this.roomJoined;
            this.socket.emit("chat", outgoing);
        } else {
            console.info("Join a room to chat.");
        }
    }

    setUsername(u) {
        this.socket.emit("addUsername", { username: u });
        this.username = u;
    }

    // requesting/using data

    getControl(h) {
        let data = h in this.controls ? this.controls[h] : 0;
        return data;
    }

    on(h, f) {
        this.handlers[h] = f;
    }

    getUsers() {
        this.socket.emit("otherUsers");
    }

    // room management

    joinRoom(roomName) {
        if (this.roomJoined) {
            this.leaveRoom(this.roomJoined);
        }

        let outgoing = { room: roomName };
        this.socket.emit("joinRoom", outgoing);

        this.roomJoined = roomName;     // room joined, can start receiving controls/events
        console.log('Joined room ' + this.roomJoined)
    }

    leaveRoom(roomName) {
        let outgoing = { room: roomName };
        this.socket.emit("leaveRoom", outgoing);
    }

    getRooms() {
        this.socket.emit("getAvailableRooms");
    }

    // control management

    observeControl(header) {
        let outgoing = { header: header };
        this.socket.emit("observeControl", outgoing);
    }

    unobserveControl(header) {
        let outgoing = { header: header };
        this.socket.emit("unobserveControl", outgoing);
    }

    observeAllControls(bool) {
        let outgoing = { observe: bool };
        this.socket.emit("observeAllControl", outgoing);
        this.socket.emit("getMyControls");
    }

    clearControl(header) {
        let outgoing = { header: header };
        this.socket.emit("clearControl", outgoing);
        this.socket.emit("getMyControls");
    }

    // event management

    observeEvent(header) {
        let outgoing = { header: header };
        this.socket.emit("observeEvent", outgoing);
    }

    unobserveEvent(header) {
        let outgoing = { header: header };
        this.socket.emit("unobserveEvent", outgoing);
    }

    observeAllEvents(bool) {
        let outgoing = { observe: bool };
        this.socket.emit("observeAllEvents", outgoing);
        this.socket.emit("getMyEvents");
    }

    clearEvent(header) {
        let outgoing = { header: header };
        this.socket.emit("clearEvent", outgoing);
        this.socket.emit("getMyEvents");
    }
}


class CollabHubTracker {
    constructor(collabHubClient) {
        this.ch = collabHubClient;
        this.recentControls = {};
        this.recentEvents = [];
        this.recentChat = [];

        this.controlsTimeOut = 300000;
        this.eventsTimeOut = 4000;
        this.chatTimeOut = 60000;
        this.chatMaxDisplay = 20;

        // set callbacks
        this.ch.setControlsCallback(this.handleControl.bind(this));
        this.ch.setEventsCallback(this.handleEvent.bind(this));
        this.ch.setChatCallback(this.handleChat.bind(this));

        // start tracking
        this.update();
        setInterval(this.update.bind(this), 1000);
    }


    update() {
        // clean old data
        for (let key in this.recentControls) {
            if (Date.now() - this.recentControls[key].time > this.controlsTimeOut) {
                delete this.recentControls[key];
            }
        }

        this.recentEvents.forEach((event, index) => {
            if (Date.now() - event.time > this.eventsTimeOut) {
                this.recentEvents.splice(index, 1);
            }
        })

        this.recentChat.forEach((message, index) => {
            if (Date.now() - message.time > this.chatTimeOut) {
                this.recentChat.splice(index, 1);
            }
        })
    }

    handleChat(incoming) {
        this.recentChat.push({
            message: incoming.chat,
            from: incoming.id,
        });
        if (this.recentChat.length > this.chatMaxDisplay) {
            this.recentChat.shift();
        }
        // console.log('CHAT: ', this.recentChat);
    }

    handleControl(incoming) {
        this.recentControls[incoming.header] = {
            value: incoming.values,
            from: incoming.from,
            time: Date.now()
        };
        // console.log('CONTROLS: ', this.recentControls);
    }

    handleEvent(incoming) {
        this.recentEvents.unshift({
            header: incoming.header,
            from: incoming.from,
            time: Date.now()
        });
        // console.log('EVENTS: ', this.recentEvents);
    }
}


class CollabHubDisplay {

    constructor(_target) {
        this.ch = window.chClient;

        //this.target = document.querySelector(target);
        this.target = document.getElementById(_target)

        // Set the dimensions based on the target container
        const width = this.target.offsetWidth;
        const height = this.target.offsetHeight;

        // Create the canvas
        const html = '<div><div style="margin-bottom: 5px;"><input type="text" id="roomName" name="roomName" placeholder="Enter room"></input><button id="joinRoomButton">Join Room</button><input type="text" id="newUserName" name="newUserName" placeholder="Enter new username" style="margin-left: 5px;"></input><button id="changeUserName">Change username</button></div><div class="collab-container"><div class="collab-item" id="collab-controls"> </div><div class="collab-item" id="collab-events"> </div><div class="collab-item"> <div class="collab-chat-container"><div id="collab-chat"></div><div class="collab-chat-input"><input type="text" id="newChatMessage" name="newChatMessage" placeholder="New message"></input><button id="sendChatMessage">Send</button></div></div></div></div></div>';

        // Append the canvas element to the target container
        this.target.innerHTML = html;

        function updateControls() {
            const controlsContainer = document.getElementById('collab-controls');

            if (!controlsContainer) return;

            // Get the current displayed controls
            const displayedControls = controlsContainer.querySelectorAll('.control');

            // Check for new controls to add or existing controls to update
            Object.keys(window.chTracker.recentControls).forEach(key => {
                let { value, from, time } = window.chTracker.recentControls[key];

                // if value is a float, round to 2 decimal places
                if (typeof value === 'number') {
                    value = Math.round(value * 100) / 100;
                }

                const controlId = `controls-${key}`;
                const existingControl = document.getElementById(controlId);

                if (existingControl) {
                    // Update the value if it has changed
                    const valueElement = existingControl.querySelector('.value');
                    const fromElement = existingControl.querySelector('.from');
                    if (valueElement.innerText != value || fromElement.innerText != `(${from})`) {
                        valueElement.innerText = value;
                        fromElement.innerText = `(${from})`;

                        // Change text weight to bold
                        existingControl.style.fontWeight = 'bold';
                        setTimeout(() => {
                            existingControl.style.fontWeight = 'normal';
                        }, 2000); // Change back to normal after 2 seconds
                    }
                } else {
                    // Add new control
                    const controlElement = document.createElement('div');
                    controlElement.className = 'property control hidden'; // Initially hidden for fade-in effect
                    controlElement.id = controlId;
                    controlElement.innerHTML = `
                <span class="name">${key}:</span>
                <span class="value">${value}</span>
                <span class="from">(${from})</span>
                `;
                    controlsContainer.appendChild(controlElement);

                    // Trigger reflow to enable transition
                    //   controlElement.offsetHeight;

                    // Fade in the element
                    controlElement.classList.remove('hidden');

                    // Change text weight to bold
                    controlElement.style.fontWeight = 'bold';
                    setTimeout(() => {
                        controlElement.style.fontWeight = 'normal';
                    }, 2000); // Change back to normal after 2 seconds
                }
            });

            // Check for controls to remove
            displayedControls.forEach(control => {
                const key = control.id.replace('controls-', '');
                if (!window.chTracker.recentControls[key]) {
                    // Fade out and remove the element
                    control.classList.add('hidden');
                    setTimeout(() => {
                        control.remove();
                    }, 300); // Adjust timing to match your transition duration
                }
            });
        }


        function updateEvents() {
            const eventsContainer = document.getElementById('collab-events');

            if (!eventsContainer) return;

            // Get the current displayed events
            const displayedEvents = eventsContainer.querySelectorAll('.event');

            // Check for new events to add or existing events to update
            window.chTracker.recentEvents.forEach((event, index) => {
                let { header, time, from } = event;

                const eventId = `events-${index}`;
                const existingEvent = document.getElementById(eventId);

                if (existingEvent) {
                    // Update the value if it has changed
                    const headerElement = existingEvent.querySelector('.header');
                    const fromElement = existingEvent.querySelector('.from');
                    if (headerElement.innerText != header || fromElement.innerText != `(${from})`) {
                        headerElement.innerText = header;
                        fromElement.innerText = `(${from})`;

                        // Change text weight to bold
                        existingEvent.style.fontWeight = 'bold';
                        setTimeout(() => {
                            existingEvent.style.fontWeight = 'normal';
                        }, 2000); // Change back to normal after 2 seconds
                    }
                } else {
                    // Add new event
                    const eventElement = document.createElement('div');
                    eventElement.className = 'property event hidden'; // Initially hidden for fade-in effect
                    eventElement.id = eventId;
                    eventElement.innerHTML = `
                <span class="header">${header}</span>
                <span class="from">(${from})</span>
                `;
                    eventsContainer.appendChild(eventElement);

                    // Trigger reflow to enable transition
                    //   eventElement.offsetHeight;

                    // Fade in the element
                    eventElement.classList.remove('hidden');

                    // Change text weight to bold
                    eventElement.style.fontWeight = 'bold';
                    setTimeout(() => {
                        eventElement.style.fontWeight = 'normal';
                    }, 2000); // Change back to normal after 2 seconds
                }
            });

            // Check for events to remove
            displayedEvents.forEach(event => {
                const key = event.id.replace('events-', '');
                if (!window.chTracker.recentEvents[key]) {
                    // Fade out and remove the element
                    event.classList.add('hidden');
                    setTimeout(() => {
                        event.remove();
                    }, 300); // Adjust timing to match your transition duration
                }
            });
        }

        // sample window.chTracker.reventChat:
        // {
        //   "message"
        //   "from"
        // }
        function updateChat() {
            const chatContainer = document.getElementById('collab-chat');

            if (!chatContainer) return;

            // Get the current displayed chat
            const displayedChat = chatContainer.querySelectorAll('.chat');

            // Check for new chat to add or existing chat to update
            window.chTracker.recentChat.forEach((chat, index) => {
                let { message, from } = chat;

                const chatId = `chat-${index}`;
                const existingChat = document.getElementById(chatId);

                if (!existingChat) {
                    // Add new chat
                    const chatElement = document.createElement('div');
                    chatElement.className = 'property chat hidden'; // Initially hidden for fade-in effect
                    chatElement.id = chatId;
                    chatElement.innerHTML = `
                <span class="message"><span style="font-weight: bold;">${from}:</span> ${message}</span>
                `;
                    chatContainer.appendChild(chatElement);

                    // Trigger reflow to enable transition
                    //   chatElement.offsetHeight;

                    // Fade in the element
                    chatElement.classList.remove('hidden');
                }
            });

            // Check for chat to remove
            displayedChat.forEach(chat => {
                const key = chat.id.replace('chat-', '');
                if (!window.chTracker.recentChat[key]) {
                    // Fade out and remove the element
                    chat.classList.add('hidden');
                    setTimeout(() => {
                        chat.remove();
                    }, 300); // Adjust timing to match your transition duration
                }
            });
        }


        // Initial display of controls
        updateControls();
        updateEvents();
        updateChat();

        // Example: Simulate update or deletion of properties in a loop
        setInterval(() => {
            // Update controls display
            updateControls();
            updateEvents();
            updateChat();
        }, 100); // Repeat every 0.5 seconds


        // send message handler
        function sendMessage() {
            let newChatMessageEl = document.getElementById('newChatMessage')
            window.chClient.chat(newChatMessageEl.value)
            newChatMessageEl.placeholder = 'New message'
            newChatMessageEl.value = ''
        }

        document.getElementById('sendChatMessage').addEventListener('click', sendMessage);
        document.getElementById('newChatMessage').addEventListener('keypress', (event) => {
            if (event.keyCode === 13) {
                sendMessage();
            }
        });

        // join room handler
        function joinRoom() {
            let roomNameEl = document.getElementById('roomName')
            window.chClient.joinRoom(roomNameEl.value)
            roomNameEl.placeholder = 'Joined ' + roomNameEl.value
            roomNameEl.value = ''
        }

        document.getElementById('joinRoomButton').addEventListener('click', joinRoom);
        document.getElementById('roomName').addEventListener('keypress', (event) => {
            if (event.keyCode === 13) {
                joinRoom();
            }
        });

        // change username handler
        function changeUserName() {
            let newUserNameEl = document.getElementById('newUserName')
            window.chClient.setUsername(newUserNameEl.value)
            newUserNameEl.placeholder = 'New user: ' + newUserNameEl.value
            newUserNameEl.value = ''
        }

        document.getElementById('changeUserName').addEventListener('click', changeUserName);
        document.getElementById('newUserName').addEventListener('keypress', (event) => {
            if (event.keyCode === 13) {
                changeUserName();
            }
        });

    }

    setControlsCallback(f) { this.ch.setControlsCallback(f) }
    setEventsCallback(f) { this.ch.setEventsCallback(f) }
    setChatCallback(f) { this.ch.setChatCallback(f) }

    // sending data

    control(...args) { this.ch.control(...args); }
    event(...args) { this.ch.event(...args); }
    chat(m, t) { this.ch.chat(m, t); }
    setUsername(u) { this.ch.setUsername(u); }

    // requesting/using data

    getControl(h) { return this.ch.getControl(h); }

    on(h, f) { this.ch.on(h, f); }

    getUsers() { this.ch.getUsers(); }

    // room management

    joinRoom(roomName) { this.ch.joinRoom(roomName); }
    leaveRoom(roomName) { this.ch.leaveRoom(roomName); }
    getRooms() { this.ch.getRooms(); }

    // control management

    observeControl(header) { this.ch.observeControl(header); }
    unobserveControl(header) { this.ch.unobserveControl(header); }
    observeAllControls(bool) { this.ch.observeAllControls(bool); }
    clearControl(header) { this.ch.clearControl(header); }

    // event management

    observeEvent(header) { this.ch.observeEvent(header); }
    unobserveEvent(header) { this.ch.unobserveEvent(header); }
    observeAllEvents(bool) { this.ch.observeAllEvents(bool); }
    clearEvent(header) { this.ch.clearEvent(header); }
}


window.p5Themes = {
    "default": {
      "border": 6,
      "backgroundColor": [240, 240, 240], 
      "borderColor": [100, 100, 100],     
      "accentColor": [0, 128, 255],       
      "textColor": [0, 0, 0],             
      "labelFont": "Arial",
      "valueFont": "Helvetica",
      "mainFont": "Verdana",
      "titleFont": "Verdana",
      "borderRadius": 5,
      "showValue" :true
    },
    "dark": {
      "border": 3,
      "backgroundColor": [20, 20, 20],     
      "borderColor": [50, 50, 50],        
      "accentColor": [255, 0, 0],         
      "textColor": [255, 255, 255],       
      "labelFont": "Helvetica",
      "valueFont": "Arial",
      "mainFont": "Verdana",
      "titleFont": "Verdana",
      "borderRadius": 8
    },
    "custom": {
      "border": 2,
      "backgroundColor": [255, 255, 200], 
      "borderColor": [0, 128, 0],         
      "accentColor": [255, 165, 0],       
      "textColor": [0, 0, 0],             
      "labelFont": "Georgia",
      "valueFont": "Courier New",
      "mainFont": "Palatino",
      "titleFont": "Verdana",
      "borderRadius": 10
    }
  
};;

/*
p5Elements.js
created by Kayli Requenez F23
*/

;
;

let activeTheme = themes['default']; // Default theme preset


function debug() {
    console.log('esy')
    console.log(activeTheme)
}

//************** THEME DEFINITIONS *************/
// Function to list available themes
function listThemes() {
    console.log(Object.keys(themes))
}

function setp5Theme(p,themeName) {
    //console.log(p, themeName, themes)
    if (!themes[themeName]) {
        console.error(`Theme '${themeName}' not found.`);
        return;
    }
    activeTheme = themes[themeName]; // Default theme preset
    Object.assign(p, activeTheme);
    return themes[themeName]
}

// Function to update theme parameters
function setThemeParameters(parameters) {
    if (activeTheme) {
        // Merge the provided parameters with the active theme
        activeTheme = { ...activeTheme, ...parameters };
    } else {
        console.error(`Active theme '${activeTheme}' not found.`);
    }
}

// Function to get the current theme values in JSON format
function exportTheme() {
    console.log(`exporting ` + activeTheme);
    console.log(JSON.stringify(activeTheme, null, 2))
    return JSON.stringify(activeTheme, null, 2);
}

//************** INITIALIZE **************

function initialize(p, div, height) {
    p.div = div;
    p.createCanvas(div.offsetWidth, div.offsetWidth * .4 * height).parent(div).style('position', 'relative');
    p.width = div.offsetWidth;
    p.height = div.offsetWidth * .4 * height;
    p.elements = {};

    if (div && div.id) {
        const registerOnView = (view) => {
            if (!view) {
                return;
            }
            if (!view.__creativitasCanvasRegistry) {
                Object.defineProperty(view, '__creativitasCanvasRegistry', {
                    value: {},
                    configurable: true,
                    enumerable: false,
                    writable: true,
                });
            }
            view.__creativitasCanvasRegistry[div.id] = p;
        };

        if (typeof window !== 'undefined') {
            registerOnView(window);
        }

        const hostView = div.ownerDocument?.defaultView;
        if (hostView && hostView !== window) {
            registerOnView(hostView);
        }
    }

    return [p.width, p.height]
}

p5.prototype.initialize = function (div, height) {
    return initialize(this, div, height);
};

function resizeP5(string, scaleWidth, scaleHeight) {
    var regex = /(\w+)\.(\w+)\((.*?)\)/;
    var match = string.match(regex);

    if (match) {
        // Extract the canvas, function name, and items inside the parentheses
        var canvasName = match[1]
        var functionName = match[2];
        let items = match[3].split(',').map(item => item.trim());

        // New values
        for (let i = 0; i < (functionName === 'arc' ? 4 : items.length); i++) {
            if (functionName === 'circle' && i > 1) {
                items[i] *= (scaleWidth + scaleHeight) / 2;
            }
            else {
                if (i % 2 === 0) {
                    items[i] *= scaleWidth;
                }
                else {
                    items[i] *= scaleHeight;
                }
            }
        }

        // Replace the items with new values
        return string.replace(match[0], canvasName + '.' + functionName + '(' + items.join(', ') + ')');
    }
    return string;
}

function divResized(p, maxClicked, canvasLength) {
    let prevWidth = p.width;
    let prevHeight = p.height;
    const doc = (p && p.canvas && p.canvas.ownerDocument) || document;
    p.resizeCanvas(0, 0);

    const canvasesCont = doc.getElementById("canvases") || p.div;
    const controlsCont = doc.getElementById("controls");
    const flexCont = doc.getElementById('flex') || (canvasesCont && canvasesCont.parentElement) || (p.div && p.div.parentElement);

    const controlsHeight = controlsCont ? controlsCont.offsetHeight : 0;
    const canvasesHeight = canvasesCont ? canvasesCont.offsetHeight : (p.div ? p.div.offsetHeight : prevHeight);
    const flexWidth = flexCont ? flexCont.offsetWidth : (p.div ? p.div.offsetWidth : prevWidth);
    const divWidth = p.div ? p.div.offsetWidth : prevWidth;
    //const divHeight = p.div ? p.div.offsetHeight : prevHeight;
    const divHeight =  prevHeight;

    if (maxClicked === '+h') {
        p.height = canvasesHeight - controlsHeight;
        p.width = divWidth;
    }
    else if (maxClicked === '-h') {
        const safeLength = canvasLength && canvasLength > 0 ? canvasLength : 1;
        p.height = canvasesHeight / safeLength - controlsHeight;
        p.width = prevWidth;
    }
    else if (maxClicked === '+w') {
        p.width = flexWidth;
        p.height = divHeight;
    }
    else if (maxClicked === '-w') {
        p.width = flexWidth / 2;
        p.height = prevHeight;
    }
    else {
        p.width = divWidth;
        p.height = divHeight;
    }

    p.width = Math.max(p.width, 1);
    p.height = Math.max(p.height, 1);

    let scaleWidth = prevWidth ? p.width / prevWidth : 1;
    let scaleHeight = prevHeight ? p.height / prevHeight : 1;
    p.resizeCanvas(p.width, p.height);
    for (let [key, element] of Object.entries(p.elements)) {
        if (typeof (element) === "string") {
            p.elements[key] = resizeP5(element, scaleWidth, scaleHeight);
        }
        else {
            element.resize(scaleWidth, scaleHeight);
        }
    }
    p.drawElements();
};

p5.prototype.divResized = function (maxClicked = false, canvasLength = null) {
    divResized(this, maxClicked, canvasLength);
};

function drawGrid(p) {
    let margin = 10;
    let spacingX = Math.ceil((p.width - 2 * margin) / 3) - 5;
    let spacingY = Math.ceil((p.height - 2 * margin) / 3) - 5;
    p.textSize(12);
    let bgColorSum = p.backgroundColor.reduce((a, b) => a + b)
    //let isBlack = p.red(p.backgroundColor) === 0 && p.green(p.backgroundColor) === 0 && p.blue(p.backgroundColor) === 0;
    p.fill(bgColorSum < 382 ? 255 : 0);
    p.noStroke();
    for (let i = 0; i < 4; i++) {
        let x = margin + i * spacingX;
        let y = margin + i * spacingY;
        p.text(x, x, margin);
        p.text(y, margin, y);
    }
}

let updateCanvas = 1;

//************** DRAW ELEMENTS //**************

function drawBackground(p) {
    if (updateCanvas > 0) {
        updateCanvas = 1
        let bg = [p.backgroundColor[0],p.backgroundColor[1],p.backgroundColor[2]]
        //console.log(...bg)
        p.background(...bg);
    }
}

p5.prototype.drawBackground = function () {
    drawBackground(this);
};

function drawElements(p) {
    if (updateCanvas > 0) {
        updateCanvas = 1
        //drawGrid(p);
        for (let element of Object.values(p.elements)) {
            if (typeof (element) === "string") {
                //when would this be called?
                eval(element);
            }
            else {
                //draw gui elements
                element.draw();
            }
        }
    }
}

p5.prototype.drawElements = function () {
    drawElements(this);
};

const scaleOutput = function (input, inLow, inHigh, outLow, outHigh, curve) {
    if (curve === undefined) curve = 1;
    let val = (input - inLow) * (1 / (inHigh - inLow));
    val = Math.pow(val, curve);
    return val * (outHigh - outLow) + outLow;
}

const unScaleOutput = function (input, outLow, outHigh, inLow, inHigh, curve) {
    if (curve === undefined) curve = 1;
    else curve = 1 / curve;
    let val = (input - inLow) * (1 / (inHigh - inLow));
    val = Math.pow(val, curve);
    return val * (outHigh - outLow) + outLow;
}

/*
 * returns an element by querying its id
 * - the id of an element is unique
 * - multiple elements with the same label are id as label, label1, etc.
*/
// Function to retrieve an element by its label
const getElementByLabel = (p, label) => {
    const elementArray = Object.values(p.elements);
    for (const element of elementArray) {
        console.log(element.id)
        if (element.id === label) {
            return element;
        }
    }
    return null; // Return null if no matching element is found
};

p5.prototype.getElementByLabel = function (label) {
    getElementByLabel(this, label);
};



/********************** COLORS & FONTS ***********************/
const setColor = function (name, value) {
    if (name === 'border') activeTheme.borderColor = value
    else if (name === 'accent') activeTheme.accentColor = value
    else if (name === 'background') {
        activeTheme.backgroundColor = value
    }
    else if (name === 'text') activeTheme.textColor = value

    else if (typeof (name) === 'string' && Array.isArray(value)) {
        if (value.length = 3) {
            activeTheme[name] = value;
            console.error(`new Color added: ${name}`);
        } else console.error('second argument must be an array of three values in RGB format')
    }
    else console.error(`incorrect color values: ${name}, ${value} `)
}

const getColor = function (p,name) {
    
    if (name === 'border') return activeTheme.borderColor
    if (name === 'accent') return activeTheme.accentColor
    if (name === 'background') { 
        let bg = [p.backgroundColor[0],p.backgroundColor[1],p.backgroundColor[2]]
        return  bg
    }
    if (name === 'text') return activeTheme.textColor
    //console.log(name)
    if (Array.isArray(name)) {
        return name
    } else {
        console.error(`Invalid color property: ${name}`);
        return [0, 0, 0]
    }
}

const GuiFonts = {
    label: 'Helvetica',
    value: 'Courier',
    text: 'Times New Roman',
    title: 'Verdana',
};

const setFont = function (name, value) {
    if (name === 'label') activeTheme.labelFont = value
    else if (name === 'value') activeTheme.valueFont = value
    else if (name === 'text') activeTheme.mainFont = value
    else if (name === 'title') activeTheme.titleFont = value

    else if (typeof (name) === 'string' && typeof (value) === 'string') {
        activeTheme[name] = value;
        console.error(`new Font added: ${name}`);
    }
    else console.error(`incorrect font values: ${name}, ${value} `)
}

const getFont = function (name) {
    if (name === 'label') return activeTheme.labelFont
    if (name === 'value') return activeTheme.valueFont
    if (name === 'text') return activeTheme.mainFont
    if (name === 'title') return activeTheme.titleFont

    if (typeof (name) === 'string') {
        return name
    } else {
        console.error(`Invalid font property: ${name}`);
        return 'Geneva'
    }
}

/**************************************** ELEMENT ******************************************/
let elementXPosition = 0;
let elementYPosition = 25;
let prevElementSize = 0;
let prevYElementSize = 0;
class Element {
    constructor(p, options) {
        this.p = p;
        this.ch = window.chClient;
        //console.log(this.ch)
        this.theme = activeTheme;
        this.label = options.label || "myElement";
        this.id = this.label;
        this.hide = false;
        let i = 1;
        while (this.id in p.elements) {
            this.id += i;
            i++;
        }
        //appearance
        this.style = options.style || 1;
        this.size = options.size || 1;
        this.textSize = options.textSize || 1;
        this.border = options.border || 'theme' || 6;
        this.borderColor = options.borderColor || 'border';
        this.accentColor = options.accentColor || 'accent';
        this.borderRadius = options.borderRadius || activeTheme.borderRadius || 0;

        //text
        this.textColor = options.textColor || 'text';
        this.showLabel = typeof (options.showLabel) === 'undefined' ? true : options.showLabel; //|| activeTheme.showLabel
        this.showValue = typeof (options.showValue) === 'undefined' ? true : options.showValue; //|| activeTheme.showValue
        this.labelFont = options.labelFont || 'label'
        this.valueFont = options.valueFont || 'value'
        this.mainFont = options.mainFont || 'text'
        this.labelX = options.labelX || 0
        this.labelY = options.labelY || 0
        this.valueX = options.valueX || 0
        this.valueY = options.valueY || 0
        this.textX = options.textX || 0
        this.textY = options.textY || 0

        //position
        let currentGap = (prevElementSize + this.size) / 2
        elementXPosition += (8 * currentGap + 5);
        if (elementXPosition > (100 - this.size * 8)) {
            elementXPosition = this.size / 2 * 8 + 5
            elementYPosition += (20 * prevYElementSize + 10)
            prevYElementSize = this.size
        }
        this.x = options.x || elementXPosition;
        this.y = options.y || elementYPosition;
        prevElementSize = this.size
        prevYElementSize = this.size > prevYElementSize ? this.size : prevYElementSize;
        this.cur_x = (this.x / 100) * this.p.width
        this.cur_y = (this.y / 100) * this.p.height
        this.cur_size = (this.size / 6) * this.p.width
        this.x_box = this.cur_size;
        this.y_box = this.cur_size;

        //parameter values
        this.active = 0;
        this.isInteger = options.isInteger || false;
        this.min = options.min || 0;
        this.max = options.max || 1;
        this.curve = options.curve || 1;
        if (typeof (options.mapto) == 'string') this.mapto = eval(options.mapto)
        else this.mapto = options.mapto || null;
        this.callback = options.callback || null;
        if (this.mapto || this.callback) this.maptoDefined = 'true'
        else this.maptoDefined = 'false'
        this.value = options.value != undefined ? options.value : scaleOutput(0.5, 0, 1, this.min, this.max, this.curve);
        this.prevValue = this.value
        this.rawValue = unScaleOutput(this.value, 0, 1, this.min, this.max, this.curve);
        p.elements[this.id] = this;

        //collab-hub sharing values
        this.linkName = typeof options.link === 'string' ? options.link : null; // share params iff link is defined
        this.linkFunc = typeof options.link === 'function' ? options.link : null;

        // set listener for updates from collab-hub (for linkName only)
        if (this.linkName) {
            this.ch.on(this.linkName, (incoming) => {
                this.forceSet(incoming.values);
            })
        }

        this.mapValue(this.value, this.mapto);
        this.runCallBack()
    }

    setLink(name){
        //collab-hub sharing values
        this.linkName = typeof name === 'string' ? name : null; // share params iff link is defined
        this.linkFunc = typeof name === 'function' ? name : null;
        console.log('set element linkName to ', this.linkName)
        // set listener for updates from collab-hub (for linkName only)
        if (this.linkName) {
            this.ch.on(this.linkName, (incoming) => {
                this.forceSet(incoming.values);
            })
        }
    }

    getParam(param, val) { return val === 'theme' ? activeTheme[param] : val }

    isPressed() {
        if (this.hide === true) return;
        //console.log('isPressed', this.label, this.p.mouseX,this.cur_x , this.p.mouseY, this.cur_y);
        if (this.p.mouseX < (this.cur_x + this.x_box / 2) &&
            this.p.mouseX > (this.cur_x - this.x_box / 2) &&
            this.p.mouseY > (this.cur_y - this.y_box / 2) &&
            this.p.mouseY < (this.cur_y + this.y_box / 2)) {
            this.active = 1
            //console.log('pressedas', this.label, this.p.mouseX.toFixed(1), this.p.mouseY.toFixed(1), this.cur_x.toFixed(1), this.cur_y.toFixed(1), this.x_box, this.y_box)
            //console.log(this.p.width, this.p.height)
        }
    }

    isReleased() {
        if (this.hide === true) return;
        if (this.active === 1) this.active = 0
    }

    resize(scaleWidth, scaleHeight) {
        // Keep element positions as percentages; cur_x/cur_y are derived during draw.
        // Base resize intentionally does nothing so subclasses can scale visual size only.
    }

    drawLabel(x, y) {
        this.p.textSize(this.textSize * 10 * this.p.width / 600);
        this.p.stroke(this.setColor(this.textColor))
        this.p.strokeWeight(0.00001 * this.textSize * 20 * this.p.width/600);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.fill(this.setColor(this.textColor));
        this.p.textFont(getFont(this.labelFont))
        this.p.text(this.label, x + (this.labelX / 100) * this.p.width, y + (this.labelY / 100) * this.p.height);
    }

    drawValue(x, y) {
        try{
            let output = this.value
            //console.log(this.value,x,y)
            this.p.stroke(this.setColor(this.textColor))
            this.p.textSize(this.textSize * 10 * this.p.width/600);
            this.p.strokeWeight(0.00001 * this.textSize * 20);
            this.p.textAlign(this.p.CENTER, this.p.CENTER);
            this.p.fill(this.setColor(this.textColor));
            this.p.textFont(getFont(this.valueFont))
            if(this.isInteger) output = output.toFixed(0)
            else{
                if (Math.abs(this.max) < 1) output = output.toFixed(3)
                else if (Math.abs(this.max) < 5) output = output.toFixed(2)
                else if (Math.abs(this.max) < 100) output = output.toFixed(1)
                else output = output.toFixed(1)
            }
            this.p.text(output, x + (this.valueX / 100) * this.p.width, y + (this.valueY / 100) * this.p.height);
        } catch(e){}
    }

    drawText(text, x, y) {
        this.p.textSize(this.textSize * 10 * this.p.width/600);
        this.p.stroke(this.setColor(this.textColor))
        this.p.strokeWeight(0.00001 * this.textSize * 20);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.fill(getColor(this.p,this.textColor));
        this.p.textFont(getFont(this.mainFont))
        this.p.text(text, x + (this.textX / 100) * this.p.width, y + (this.textY / 100) * this.p.height);
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    setColor(arg) {
        if (typeof (arg) === 'string') {
            return getColor(this.p,arg)
        }
        else if (Array.isArray(arg)) {
            if (arg.length === 3) return arg
        }
        console.log(this.label, typeof (arg), 'invalid color')
        return [0, 0, 0]
    }

    mapValue(output, destination) {
        //console.log(output, destination)
        if(this.isInteger) {
            output = Math.floor(output)
            if(output === this.prevValue) return
        }
        if (destination) {
            try {
                destination.value.rampTo(output, .1);
            } catch {
                try {
                    destination.value = output;
                } catch {
                    try {
                        //console.log(destination, output)
                        destination = output;
                    } catch (error) {
                        console.log('Error setting Mapto to value: ', error);
                    }
                }
            }
        } //else if (this.maptoDefined === 'false') { console.log(this.label, 'no destination defined') }
    }

    runCallBack() {
        //console.log(this.value, this.callback)
        if (this.callback) {
            let output = this.value
            if(this.isInteger) {
                output = Math.floor(output)
                if(output === this.prevValue) return
            }
            try {
                this.callback(output);
            } catch {
                try {
                    this.callback();
                } catch (error) {
                    console.log('Error with Callback Function: ', error);
                }
            }
        } else if (this.maptoDefined === 'false') { console.log(this.label, 'no destination defined') }

        // send updates to collab-hub
        if (this.sendName) {
            this.ch.control(this.sendName, this.value);
        }
    }

    set(value) {
        //console.log(value)
        if (typeof (value) === 'string') {
            this.value = value;
        } 
        else {
            this.value = value
            this.rawValue = unScaleOutput(value, 0, 1, this.min, this.max, this.curve);
            this.mapValue(this.value, this.mapto);
        }

        this.runCallBack()

        // send updates to collab-hub
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) {
            this.linkFunc();
        }
    }

    forceSet(value) {
        // sets value without sending data to collab-hub
        if (typeof (value) === 'string') {
            this.value = value;
        }
        else {
            this.value = value;
            if(!Array.isArray(this.value)) this.rawValue = unScaleOutput(value, 0, 1, this.min, this.max, this.curve);
            if(!Array.isArray(this.value)) this.mapValue(this.value, this.mapto);
        }

        this.runCallBack();
    }
    ccSet(value){
        // sets value without sending data to collab-hub
        if (typeof (value) === 'string') {
            this.value = value;
        }
        else {
            this.value = value;
            this.rawValue = unScaleOutput(value, 0, 1, this.min, this.max, this.curve);
            //this.mapValue(this.value, this.mapto);
        }

        //this.runCallBack();
    }
}

/**************************************** KNOB ******************************************/
class Knob extends Element {
    constructor(p, options) {
        super(p, options);
        this.incr = options.incr || 0.01;
        this.degrees = options.degrees || 320;
        this.startAngle = this.p.PI * (4 / 8 + (360 - this.degrees) / 360);
        this.endAngle = this.p.PI * (4 / 8 - (360 - this.degrees) / 360) + 2 * this.p.PI;

        // send initial val to collab-hub
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) this.linkFunc();
    }

    resize(scaleWidth, scaleHeight) {
        super.resize(scaleWidth, scaleHeight);
        if (Math.max(Math.abs(1 - scaleWidth)) > Math.max(Math.abs(1 - scaleHeight))) this.size *= scaleWidth;
        else this.size *= scaleHeight;
    }

    draw() {
        //console.log(this.rawValue)
        if (this.hide === true) return;
        // Calculate the angle based on the knob's value
        this.startAngle = this.p.PI * (4 / 8 + (360 - this.degrees) / 360);
        this.endAngle = this.p.PI * (4 / 8 - (360 - this.degrees) / 360) + 2 * this.p.PI;
        let angle = this.p.map(this.rawValue, 0, 1, 0, this.endAngle - this.startAngle);

        this.cur_x = (this.x / 100) * this.p.width
        this.cur_y = (this.y / 100) * this.p.height
        this.cur_size = (this.size / 6) * this.p.width / 2
        this.x_box = this.cur_size
        this.y_box = (this.size / 6) * this.p.height
        this.y_box = this.y_box >20 ? this.y_box : 20
        let border = this.getParam('border', this.border)

        // clear the previously drawn knob
        // this.p.fill(p,getColor('background'));
        // let  strokeWeight = this.border;
        // this.p.strokeWeight(strokeWeight);
        // this.p.stroke(getColor(p,'background'));
        // this.p.arc(cur_x, cur_y, cur_size*1.2, cur_size*1.2,0,2*this.p.PI);

        // Display the label string beneath the knob
        this.p.textSize(this.textSize * 10 * this.p.width/600);
        let textWidthValue = this.p.textWidth(this.label);
        let textHeightValue = this.p.textAscent() + this.p.textDescent();
        if (this.showLabel) this.drawLabel(this.cur_x, this.cur_y + this.cur_size / 2 + textHeightValue * .5)
        if (this.showValue) this.drawValue(this.cur_x, this.cur_y + this.cur_size / 2 + textHeightValue * (this.showLabel ? 1.5 : .5))

        // Draw the inactive knob background
        this.p.noFill();
        this.p.strokeWeight(border);
        this.p.stroke(this.setColor(this.borderColor))
        this.p.arc(this.cur_x, this.cur_y, this.cur_size, this.cur_size, this.p.constrain(this.startAngle + angle + (border / 30 / this.size / 2), this.startAngle, this.endAngle), this.endAngle);

        // Draw the active knob background
        this.p.stroke(this.setColor(this.accentColor));
        this.p.arc(this.cur_x, this.cur_y, this.cur_size, this.cur_size, this.startAngle, this.p.constrain(this.startAngle + angle - (border / 30 / this.size / 2), this.startAngle, this.endAngle));

        // Draw the knob value indicator as a line
        let indicatorLength = this.cur_size / 2 // Length of the indicator line
        let indicatorX = this.cur_x + this.p.cos(this.startAngle + angle) * indicatorLength;
        let indicatorY = this.cur_y + this.p.sin(this.startAngle + angle) * indicatorLength;
        this.p.stroke(this.setColor(this.accentColor));
        this.p.line(this.cur_x, this.cur_y, indicatorX, indicatorY);
    }

    isDragged() {
        if (this.hide === true) return;
        if (this.active) {

            if (this.p.movedY != 0) {
                if (this.p.keyIsDown(this.p.ALT)) this.rawValue -= this.p.movedY * this.incr / 10;
                else this.rawValue -= this.p.movedY * this.incr;
            }

            if (this.rawValue > 1) this.rawValue = 1
            if (this.rawValue < 0) this.rawValue = 0
            this.value = scaleOutput(this.rawValue, 0, 1, this.min, this.max, this.curve)
            this.mapValue(this.value, this.mapto);

            this.runCallBack()
            //console.log('knob', this.linkName)
            // send updates to collab-hub
            if (this.linkName) {
                //console.log('link')
                this.ch.control(this.linkName, this.value);
            }
            if (this.linkFunc) this.linkFunc();

            let output = this.value
            if(this.isInteger) {
                output = Math.floor(output)
                if(output === this.prevValue) return
            }
            this.prevValue = output
        }
    }
}

p5.prototype.Knob = function (options = {}) {
    return new Knob(this, options);
};

p5.prototype.Dial = function (options = {}) {
    return new Knob(this, options);
};

/**************************************** FADER ******************************************/
class Fader extends Element {
    constructor(p, options) {
        super(p, options);
        this.incr = options.incr || 0.01;
        this.orientation = options.orientation === 'horizontal' ? 'horizontal' : 'vertical';
        this.isHorizontal = this.orientation === 'horizontal'
        this.value = this.value || 0.5
        this.dragging = false;
        this.size = options.size || 1

        // send initial val to collab-hub
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) this.linkFunc();
    }

    resize(scaleWidth, scaleHeight) {
        super.resize(scaleWidth, scaleHeight);
        this.size *= this.isHorizontal ? scaleWidth : scaleHeight;
    }

    draw() {
        if (this.hide === true) return;
        this.isHorizontal = this.orientation === 'horizontal'
        this.cur_size = (this.size / 6) * this.p.width / 2
        let border = this.getParam('border', this.border)

        let x_corner = (this.x / 100) * this.p.width
        let y_corner = (this.y / 100) * this.p.height
        if (this.isHorizontal) {
            this.x_box = this.cur_size
            this.y_box = border * 3 * this.size
            this.cur_x = (this.x / 100) * this.p.width + this.cur_size / 2
            this.cur_y = (this.y / 100) * this.p.height + border
        }
        else {
            this.y_box = this.cur_size
            this.x_box = border * 3 * this.size
            this.cur_x = (this.x / 100) * this.p.width + border
            this.cur_y = (this.y / 100) * this.p.height + this.cur_size / 2
        }
        let strokeWeight = border * this.size;
        this.thickness = border // cur_size * .1; //Indicator thickness
        let rectThickness = this.thickness * .95;

        // Display the label and value strings
        this.p.textSize(this.textSize * 10 * this.p.width/600);
        let textWidthValue = this.p.textWidth(this.label);
        let textHeightValue = this.p.textAscent() + this.p.textDescent();
        let curTextY = this.isHorizontal ? this.cur_y + border * 2 + textHeightValue * .5 : this.cur_y + this.cur_size / 2 + border + textHeightValue * .5
        if (this.showLabel) this.drawLabel(this.cur_x, curTextY)
        if (this.showValue) this.drawValue(this.cur_x, curTextY + (this.showLabel ? 1 : 0) * textHeightValue)
        //console.log('fader', this.cur_x, curTextY)

        //Display Actual Fader
        this.p.noFill();
        this.p.stroke(this.setColor(this.borderColor))
        this.p.strokeWeight(border * 1.5);
        if (this.isHorizontal) this.p.rect(x_corner, y_corner, this.cur_size, border * 2);
        else this.p.rect(x_corner, y_corner, border * 2, this.cur_size);
        // this.p.stroke(p,getColor(this.accentColor))
        // if (this.isHorizontal) this.p.rect(this.cur_x, this.cur_y, this.cur_size, border);
        // else this.p.rect(this.cur_x, this.cur_y, rectThickness, this.cur_size);

        //Clear beneath Display Indicator
        this.p.fill( getColor(this.p, 'background'))
        this.p.stroke(this.setColor('background'))
        this.pos = this.p.map(this.rawValue, 0, 1, this.isHorizontal ? x_corner : y_corner + this.cur_size - this.thickness, this.isHorizontal ? x_corner + this.cur_size - this.thickness : y_corner);
        let clearSize = border * .25
        if (this.isHorizontal) this.p.rect(this.pos - clearSize, y_corner, this.thickness + clearSize * 2, this.thickness * 2);
        else this.p.rect(x_corner, this.pos - clearSize, this.thickness * 2, this.thickness + clearSize * 2);
        //Display indicator
        this.p.fill(this.setColor(this.accentColor));
        this.p.stroke(this.setColor(this.accentColor))
        this.pos = this.p.map(this.rawValue, 0, 1, this.isHorizontal ? x_corner : y_corner + this.cur_size - this.thickness, this.isHorizontal ? x_corner + this.cur_size - this.thickness : y_corner);
        if (this.isHorizontal) this.p.rect(this.pos, y_corner, this.thickness, this.thickness * 2);
        else this.p.rect(x_corner, this.pos, this.thickness * 2, this.thickness);
    }

    isDragged() {
        if (this.hide === true) return;
        if (this.active) {
            if (this.isHorizontal) {
                if (this.p.movedX !== 0) {
                    if (this.p.keyIsDown(this.p.ALT)) this.rawValue += this.p.movedX * this.incr / 10;
                    else this.rawValue += this.p.movedX * this.incr / this.size;
                }
            }
            else {
                if (this.p.movedY !== 0) {
                    if (this.p.keyIsDown(this.p.ALT)) this.rawValue -= this.p.movedY * this.incr / 10;
                    else this.rawValue -= this.p.movedY * this.incr / this.size;
                }
            }
            if (this.rawValue > 1) this.rawValue = 1
            if (this.rawValue < 0) this.rawValue = 0
            this.value = scaleOutput(this.rawValue, 0, 1, this.min, this.max, this.curve)
            this.mapValue(this.value, this.mapto);

            this.runCallBack()

            // send updates to collab-hub
            if (this.linkName) {
                this.ch.control(this.linkName, this.value);
            }
            if (this.linkFunc) this.linkFunc();
        }
    }
}

p5.prototype.Fader = function (options = {}) {
    return new Fader(this, options);
};

p5.prototype.Slider = function (options = {}) {
    return new Fader(this, options);
};

/**************************************** PAD ******************************************/
// This is fixed now - value is an array [x,y]

class Pad extends Element {
    constructor(p, options) {
        super(p, options);
        this.incr = options.incr || 0.01;
        this.value = options.value || [0.5,0.5]
        this.rawValue = options.value || [0.5,0.5]
        this.dragging = false;
        this.sizeX = options.sizeX || options.size || 5
        this.sizeY = options.sizeY || options.size || 5
        this.labelX = 0
        this.labelY = 0
        // if (typeof (options.mapto) == 'string') this.mapto = eval(options.mapto)
        // else this.mapto = options.mapto || null;
        // if (typeof (options.maptoY) == 'string') this.maptoY = eval(options.maptoY)
        // else this.maptoY = options.maptoY || null;

        // send initial val to collab-hub
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) this.linkFunc();

        //console.log('pad', this.value, this.rawValue)
    }

    resize(scaleWidth, scaleHeight) {
        super.resize(scaleWidth, scaleHeight);
        //this.size *= this.isHorizontal ? scaleWidth : scaleHeight;
    }

    draw() {
        if (this.hide === true) return;
        this.cur_size = (this.size / 6) * this.p.width / 2
        this.cur_sizeX = (this.sizeX / 6) * this.p.width / 2
        this.cur_sizeY = (this.sizeY / 6) * this.p.width / 2
        let border = this.getParam('border', this.border)

        let x_corner = (this.x / 100) * this.p.width - this.cur_sizeX / 2
        let y_corner = (this.y / 100) * this.p.height - this.cur_sizeY / 2

        this.x_box = this.cur_sizeX * 2
        this.y_box = this.cur_sizeY * 2
        this.cur_x = (this.x / 100) * this.p.width //+ this.cur_sizeX/2
        this.cur_y = (this.y / 100) * this.p.height //+ this.cur_sizeY/2

        //console.log(this.cur_x, this.cur_y, this.x_box,this.y_box)

        let strokeWeight = border
        this.thickness = border // cur_size * .1; //Indicator thickness
        let rectThickness = this.thickness * .95;

        //Display Pad
        this.p.fill(this.setColor(this.borderColor));
        this.p.stroke(this.setColor(this.borderColor))
        this.p.strokeWeight(border * 1.5);
        this.p.rect(x_corner, y_corner, this.cur_sizeX, this.cur_sizeY);

        //Display indicator
        this.p.fill(this.setColor(this.accentColor));
        this.p.stroke(this.setColor(this.accentColor))
        let indicatorX = x_corner + this.rawValue[0] * (this.cur_sizeX - 0 * border)
        let indicatorY = y_corner + this.rawValue[1] * (this.cur_sizeY - 0 * border)
        //this.pos = this.p.map(this.value, 0,1,  x_corner  + this.cur_size - this.thickness, this.isHorizontal ? x_corner + this.cur_size - this.thickness : y_corner);
        this.p.circle(indicatorX, indicatorY, (this.cur_sizeX + this.cur_sizeY) / 30)


        // Display the label and values
        // let textHeightValue = this.p.textAscent() + this.p.textDescent();
        // if (this.showLabel) this.drawLabel(this.cur_x, this.cur_y - this.cur_sizeY / 2 - textHeightValue)

        // Display the label and value strings
        this.p.textSize(this.textSize * 10 * this.p.width/600);
        let textWidthValue = this.p.textWidth(this.label);
        let textHeightValue = this.p.textAscent() + this.p.textDescent();

        let curTextY = this.cur_y + this.cur_sizeY/2  + textHeightValue * 1 
        if (this.showLabel) this.drawLabel(this.cur_x , curTextY)
        //console.log(this.showLabel, this.cur_x+ this.textX, curTextY+ this.textY)
        //if (this.showValue) this.drawValue(this.cur_x, curTextY + (this.showLabel ? 1 : 0) * textHeightValue)
 
    }

    isDragged() {
        if (this.hide === true) return;
        if (this.active) {
            if( !Array.isArray(this.value)) this.value = [0,0]
            
            if (this.p.movedX !== 0) {
                if (this.p.keyIsDown(this.p.ALT)) this.rawValue[0] += this.p.movedX * this.incr / 10;
                else this.rawValue[0] += this.p.movedX * this.incr / this.sizeX;
            }

            if (this.p.movedY !== 0) {
                if (this.p.keyIsDown(this.p.ALT)) this.rawValue[1] += this.p.movedY * this.incr / 10;
                else this.rawValue[1] += this.p.movedY * this.incr / this.sizeY;
            }

            if (this.rawValue[0] > 1) this.rawValue[0] = 1
            if (this.rawValue[0] < 0) this.rawValue[0] = 0
            //console.log(this.rawValue, this.value)
            this.value[0] = scaleOutput(this.rawValue[0], 0, 1, this.min, this.max, this.curve)
            
            //this.mapValue(this.value[0], this.maptoX);

            if (this.rawValue[1] > 1) this.rawValue[1] = 1
            if (this.rawValue[1] < 0) this.rawValue[1] = 0
            this.value[1] = scaleOutput(this.rawValue[1], 0, 1, this.min, this.max, this.curve)
            //this.mapValue(this.value[1], this.maptoY);
            //console.log(this.value, this.mapto)
            this.mapValue(this.value, this.mapto);
            this.runCallBack()

            // send updates to collab-hub
            if (this.linkName) {
                this.ch.control(this.linkName, this.value);
            }
            if (this.linkFunc) this.linkFunc();
        }
    }



}

p5.prototype.Pad = function (options = {}) {
    return new Pad(this, options);
};

p5.prototype.JoyStick = function (options = {}) {
    return new Pad(this, options);
};

/**************************************** BUTTON ******************************************/
class Button extends Element {
    constructor(p, options) {
        super(p, options);
        this.value = options.value || 0
        this.rawValue = this.value
        this.cornerRadius = options.cornerRadius || 1

        // send initial val to collab-hub
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) this.linkFunc();
    }

    resize(scaleWidth, scaleHeight) {
        super.resize(scaleWidth, scaleHeight)
        const useWidth = Math.abs(1 - scaleWidth) >= Math.abs(1 - scaleHeight);
        this.size *= useWidth ? scaleWidth : scaleHeight;
    }

    draw() {
        if (this.hide === true) return;
        this.cur_x = (this.x / 100) * this.p.width
        this.cur_y = (this.y / 100) * this.p.height
        this.cur_size = (this.size / 6) * this.p.width / 2
        this.x_box = this.cur_size
        this.y_box = this.cur_size
        let border = this.getParam('border', this.border)

        if (this.rawValue) {
            this.p.fill(this.setColor(this.accentColor))
            this.p.stroke(this.setColor(this.borderColor));
            this.p.strokeWeight(border / 2);
            this.p.rect(this.cur_x - this.cur_size / 2, this.cur_y - this.cur_size / 2, this.cur_size, this.cur_size, this.cur_size / 2 * this.cornerRadius);
        }
        else {
            this.p.noFill()
            this.p.stroke(this.setColor(this.borderColor));
            this.p.strokeWeight(border / 2);
            this.p.rect(this.cur_x - this.cur_size / 2, this.cur_y - this.cur_size / 2, this.cur_size, this.cur_size, this.cur_size / 2 * this.cornerRadius);
        }

        // Display the label string inside the button
        if (this.showLabel) this.drawLabel(this.cur_x, this.cur_y)//if(this.showValue) this.drawValue(this.cur_x, this.cur_y+6*(2+this.size*2.5) )
    }

    isPressed() {
        if (this.hide === true) return;
        if (this.p.mouseX < (this.cur_x + this.x_box / 2) &&
            this.p.mouseX > (this.cur_x - this.x_box / 2) &&
            this.p.mouseY > (this.cur_y - this.y_box / 2) &&
            this.p.mouseY < (this.cur_y + this.y_box / 2)) {
            this.active = 1
            // Calculate the value
            let newValue = scaleOutput(1, 0, 1, this.min, this.max, this.curve);
            // Use the set method to update the value and trigger all necessary actions
            //console.log('Button isPressed - calling set() with value:', newValue);
            this.set(newValue);
            if (this.maptoDefined === 'false') postButtonError('Buttons')

        }
    }

    isReleased() {
        if (this.hide === true) return;
        if (this.active === 1) {
            this.active = 0
            // Calculate the value
            let newValue = scaleOutput(0, 0, 1, this.min, this.max, this.curve);
            // Use the set method to update the value and trigger all necessary actions
            console.log('Button isReleased - calling set() with value:', newValue);
            this.set(newValue);
        }
    }

    forceSet(value) {
        // sets value without sending data to collab-hub
        if (value) {
            this.active = 1
            this.rawValue = 1
            this.value = scaleOutput(this.rawValue, 0, 1, this.min, this.max, this.curve)
            this.mapValue(this.value, this.mapto);

            this.runCallBack();
            if (this.maptoDefined === 'false') postButtonError('Buttons')

        } else {
            this.active = 0
            this.rawValue = 0
            this.value = scaleOutput(this.rawValue, 0, 1, this.min, this.max, this.curve)
        }
    }
}

p5.prototype.Button = function (options = {}) {
    return new Button(this, options);
};

function postButtonError(name) {
    if (name === 'Buttons') console.log(name + ' generally work by defining a callback function. For buttons, the value is 1 on every press.')
    if (name === 'Toggle buttons') console.log(name + ' generally work by defining a callback function. The value for toggle buttons alternates between 1 and 0.')
    if (name === 'RadioButtons') console.log(name + ' generally work by defining a callback function. The value for radio buttons is the text string of the selected button.')

    if (name === 'Buttons') console.log(`An example of defining a callback for a button is: 
callback: function(val){ env.triggerAttackRelease(0.1) }`)
    if (name === 'Toggle buttons') console.log(`An example of defining a callback for a toggle is: 
callback: function(val){ 
    if(val==1) vco.type = 'square'; 
    else vco.type = 'sawtooth'; 
}`)
    if (name === 'RadioButtons') console.log(`An example of defining a callback for a radio button is: 
callback: function(val){ vco.type = val }`)
}

/**************************************** MOMENTARY ******************************************/
class Momentary extends Button {
    constructor(p, options) {
        super(p, options);
        this.value = options.value || 0
        this.rawValue = this.value
    }

    isReleased() {
        if (this.hide === true) return;
        if (this.active === 1) {
            this.active = 0
            this.rawValue = 0
            this.value = scaleOutput(this.rawValue, 0, 1, this.min, this.max, this.curve)
            this.mapValue(this.value, this.mapto);
            this.runCallBack();
        }
    }
}

p5.prototype.Momentary = function (options = {}) {
    return new Momentary(this, options);
};

/**************************************** TOGGLE ******************************************/
class Toggle extends Button {
    constructor(p, options) {
        super(p, options);
        this.state = options.state || false;

        // send initial val to collab-hub
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) this.linkFunc();
    }

    isPressed() {
        if (this.hide === true) return;
        if (this.p.mouseX < (this.cur_x + this.x_box / 2) &&
            this.p.mouseX > (this.cur_x - this.x_box / 2) &&
            this.p.mouseY > (this.cur_y - this.y_box / 2) &&
            this.p.mouseY < (this.cur_y + this.y_box / 2)) {
            this.active = 1
            this.rawValue = this.rawValue ? 0 : 1
            this.value = scaleOutput(this.rawValue, 0, 1, this.min, this.max, this.curve)
            this.mapValue(this.value, this.mapto);
            this.runCallBack();
            if (this.maptoDefined === 'false') postButtonError('Toggle buttons')

            // send updates to collab-hub
            if (this.linkName) {
                this.ch.control(this.linkName, this.value);
            }
            if (this.linkFunc) this.linkFunc();
        }
    }

    isReleased() {
        if (this.hide === true) return;
        if (this.active === 1) {
            this.active = 0
        }
    }

    forceSet(value) {
        // sets value without sending data to collab-hub
        this.rawValue = value
        this.value = scaleOutput(this.rawValue, 0, 1, this.min, this.max, this.curve)
        this.mapValue(this.value, this.mapto);

        this.runCallBack();
        if (this.maptoDefined === 'false') postButtonError('Toggle buttons')
    }
}

p5.prototype.Toggle = function (options = {}) {
    return new Toggle(this, options);
};

/**************************************** RADIO BUTTON ******************************************/
class RadioButton extends Button {
    constructor(p, options) {
        super(p, options);
        this.radioOptions = options.radioOptions || ['on', 'off'];
        this.orientation = options.orientation || 'vertical';
        this.isHorizontal = this.orientation === 'horizontal'
        this.value = options.value || this.radioOptions[0]; //default first radioOption
        this.radioHeight = this.cur_size / 2;
        this.radioWidth = this.cur_size * 2;
        this.border = options.border || activeTheme.radioBorder || 2

        // send initial val to collab-hub
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) this.linkFunc();
    }

    draw() {
        if (this.hide === true) return;
        this.radioClicked = {};

        this.isHorizontal = this.orientation === 'horizontal'
        this.cur_size = (this.size / 6) * this.p.width / 2

        this.radioHeight = this.cur_size / 2;
        this.radioWidth = this.cur_size * 2;
        let border = this.getParam('border', this.border)


        //calculate widest radioOption for radioButton width
        this.p.textSize(this.textSize * 10 * this.p.width / 600); 
        let textWidth = 0
        for (let i = 0; i < this.radioOptions.length; i++) {
            let width = this.p.textWidth(this.radioOptions[i]);
            if (width > textWidth) textWidth = width
        }
        this.cur_size = textWidth
        this.radioWidth = this.cur_size * 1.5;

        if (this.isHorizontal) {
            this.cur_x = (this.x / 100) * this.p.width
            this.cur_y = (this.y / 100) * this.p.height

            this.x_corner = this.cur_x - this.radioWidth * this.radioOptions.length / 2
            this.y_corner = this.cur_y - this.radioHeight / 2

            this.x_box = this.radioWidth * this.radioOptions.length
            this.y_box = this.radioHeight
        }
        else {
            this.cur_x = (this.x / 100) * this.p.width
            this.cur_y = (this.y / 100) * this.p.height

            this.x_corner = this.cur_x - this.radioWidth / 2
            this.y_corner = this.cur_y - this.radioHeight * this.radioOptions.length / 2

            this.y_box = this.radioHeight * this.radioOptions.length
            this.x_box = this.radioWidth
        }

        if (this.showLabel) this.drawLabel(this.cur_x,
            this.isHorizontal ? this.cur_y + this.radioHeight : this.cur_y + this.radioHeight * (this.radioOptions.length / 2 + 0.5)
        )

        for (let i = 0; i < this.radioOptions.length; i++) {
            let option = this.radioOptions[i];
            let x = this.isHorizontal ? this.x_corner + i * this.radioWidth : this.x_corner;
            let y = this.isHorizontal ? this.y_corner : this.y_corner + this.radioHeight * i;

            this.p.fill(this.value === option ? this.setColor(this.accentColor) : this.setColor(this.borderColor));
            this.p.stroke(0);
            this.p.strokeWeight(border);
            this.p.rect(x, y, this.radioWidth, this.radioHeight);

            this.drawText(option, x + this.radioWidth / 2, y + this.radioHeight / 2)
            this.radioClicked[this.radioOptions[i]] = () => {
                if (this.isHorizontal) return this.p.mouseX >= x && this.p.mouseX <= x + this.radioSize
                else return this.p.mouseY >= y && this.p.mouseY <= y + this.radioSize / 2
            };
        }
    }


    isPressed() {
        if (this.hide === true) {
            return;
        }

        if (this.p.mouseX < (this.cur_x + this.x_box / 2) &&
            this.p.mouseX > (this.cur_x - this.x_box / 2) &&
            this.p.mouseY > (this.cur_y - this.y_box / 2) &&
            this.p.mouseY < (this.cur_y + this.y_box / 2)) {

            let newValue;
            if (this.isHorizontal) {
                let position = (this.cur_x + this.x_box / 2) - this.p.mouseX;
                position = Math.floor(position / this.radioWidth);
                position = this.radioOptions.length - position - 1;
                newValue = this.radioOptions[position];
            } else {
                let position = (this.cur_y + this.y_box / 2) - this.p.mouseY;
                position = Math.floor(position / this.radioHeight);
                position = this.radioOptions.length - position - 1;
                newValue = this.radioOptions[position];
            }

            // Directly set the value to ensure it sticks
            this.value = newValue;
            this.active = 1;

            // Run the callback to trigger any associated actions
            this.runCallBack();
            //console.log('rb', this.value, this.linkName)

            // Send the update to collab-hub if needed
            if (this.linkName) {
                this.ch.control(this.linkName, this.value);
            }

            if (this.linkFunc) {
                this.linkFunc();
            }


            if (this.maptoDefined === 'false') postButtonError('RadioButtons');
        }
    }

    isReleased() {
        //so super isReleased not called
    }

    // Override forceSet to properly handle radio button values
    forceSet(value) {
        // Check if the value is one of the valid radio options
        if (this.radioOptions.includes(value)) {
            this.value = value;
            this.runCallBack();
        } else {
            // For numeric values (from CollabHub), try to map to a radio option
            if (typeof value === 'number' && value >= 0 && value < this.radioOptions.length) {
                this.value = this.radioOptions[value];
                this.runCallBack();
            }
        }
    }
}

p5.prototype.RadioButton = function (options = {}) {
    return new RadioButton(this, options);
};

p5.prototype.Radio = function (options = {}) {
    return new RadioButton(this, options);
};

/**************************************** DROPDOWN MENU ******************************************/

class Dropdown extends Button {
    constructor(p, options) {
        super(p, options);
        this.dropdownOptions = options.dropdownOptions || ['on', 'off'];
        this.value = options.value || this.dropdownOptions[0]; // Default to the first dropdown option
        this.isOpen = false; // Track whether the dropdown is open
        this.cur_size = this.size || 30; // Increase the size for better readability
        this.border = options.border || activeTheme.radioBorder || 2;
        this.accentColor = options.accentColor || [200, 50, 0]; // Default accent color

        // Send initial value to collab-hub if linked
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) this.linkFunc();
    }

    draw() {
        if (this.hide === true) return;

        this.cur_x = (this.x / 100) * this.p.width;
        this.cur_y = (this.y / 100) * this.p.height;

        this.p.textSize(this.cur_size * 0.9 * this.p.width / 600); // Larger text size
        let textWidth = this.p.textWidth(this.value);
        this.boxWidth = Math.max(textWidth + 20, 100); // Ensure a minimum width for the dropdown
        this.boxHeight = this.cur_size;

        // Draw the main dropdown box
        this.p.fill(255); // Background color
        this.p.stroke(0); // Border color
        this.p.strokeWeight(this.border);
        this.p.rect(this.cur_x, this.cur_y, this.boxWidth, this.boxHeight);

        this.drawText(this.value, this.cur_x + this.boxWidth / 2, this.cur_y + this.boxHeight / 2);

        if (this.isOpen) {
            for (let i = 0; i < this.dropdownOptions.length; i++) {
                let option = this.dropdownOptions[i];
                let y = this.cur_y + (i + 1) * (this.boxHeight + 2); // Increase spacing between options

                if (this.value === option) {
                    this.p.fill(this.accentColor); // Selected option background
                } else {
                    this.p.fill(200); // Unselected option background color (light grey)
                }

                this.p.stroke(0);
                this.p.rect(this.cur_x, y, this.boxWidth, this.boxHeight);
                this.p.fill(0); // Text color
                this.drawText(option, this.cur_x + this.boxWidth / 2, y + this.boxHeight / 2);
            }
        }
    }

    isPressed() {
        if (this.hide === true) return;

        if (this.p.mouseX >= this.cur_x && this.p.mouseX <= this.cur_x + this.boxWidth &&
            this.p.mouseY >= this.cur_y && this.p.mouseY <= this.cur_y + this.boxHeight) {
            this.isOpen = !this.isOpen; // Toggle dropdown open/close state
        } else if (this.isOpen) {
            // Check if click is on one of the options
            for (let i = 0; i < this.dropdownOptions.length; i++) {
                let y = this.cur_y + (i + 1) * (this.boxHeight + 2); // Calculate the position of each option
                if (this.p.mouseX >= this.cur_x && this.p.mouseX <= this.cur_x + this.boxWidth &&
                    this.p.mouseY >= y && this.p.mouseY <= y + this.boxHeight) {
                    this.value = this.dropdownOptions[i];
                    this.isOpen = false;
                    this.runCallBack();
                    this.mapValue(this.value, this.mapto);
                    if (this.maptoDefined === 'false') postButtonError('Dropdown');

                    // Send updates to collab-hub if linked
                    if (this.linkName) {
                        this.ch.control(this.linkName, this.value);
                    }
                    if (this.linkFunc) this.linkFunc();
                    return; // Exit after selecting an option
                }
            }

            // Close dropdown if clicked outside
            this.isOpen = false;
        } else {
            this.isOpen = false; // Close dropdown if clicked outside
        }
    }

    isReleased() {
        // Override to prevent calling the superclass method
    }
}

p5.prototype.Dropdown = function (options = {}) {
    return new Dropdown(this, options);
};



/**************************************** LINES ******************************************/
class Line extends Element {
    constructor(p, x1, y1, x2, y2, options) {
        super(p, options);
        this.x1 = x1 || 0
        this.x2 = x2 || 0
        this.y1 = y1 || 0
        this.y2 = y2 || 0
        this.showLabel = options.showLabel || 'false'
        this.border = options.border || 2
        this.color = options.color || activeTheme.lineColor || 'border'
    }

    resize(scaleWidth, scaleHeight) {
        super.resize(scaleWidth, scaleHeight)
        const useWidth = Math.abs(1 - scaleWidth) >= Math.abs(1 - scaleHeight);
        this.size *= useWidth ? scaleWidth : scaleHeight;
    }

    draw() {
        if (this.hide === true) return;
        let x1 = (this.x1 / 100) * this.p.width
        let x2 = (this.x2 / 100) * this.p.width
        let y1 = (this.y1 / 100) * this.p.height
        let y2 = (this.y2 / 100) * this.p.height
        let border = this.getParam('border', this.border)

        this.p.fill(this.setColor(this.color));
        this.p.stroke(this.setColor(this.color));
        this.p.strokeWeight(border * 2);
        this.p.line(x1, y1, x2, y2)
    }

    isPressed() { }
    pressed() { }
    isReleased() { }
}

p5.prototype.Line = function (x1, y1, x2, y2, options = {}) {
    return new Line(this, x1, y1, x2, y2, options);
};

/**************************************** TEXT ******************************************/
class Text extends Element {
    constructor(p, options) {
        super(p, options);
        this.border = options.border || activeTheme['border'] || 0
        this.textSize = options.size || activeTheme['textSize'] || options.textSize || 1
    }

    resize(scaleWidth, scaleHeight) {
        super.resize(scaleWidth, scaleHeight)
        const useWidth = Math.abs(1 - scaleWidth) >= Math.abs(1 - scaleHeight);
        // For Text, scale the font size, not the widget size box
        this.textSize *= useWidth ? scaleWidth : scaleHeight;
    }

    draw() {
        if (this.hide === true) return;
        this.cur_x = (this.x / 100) * this.p.width
        this.cur_y = (this.y / 100) * this.p.height
        this.cur_size = (this.size / 6) * this.p.width / 2
        let border = this.getParam('border', this.border)
        let borderRadius = this.getParam('borderRadius', this.borderRadius)

        this.drawText(this.label, this.cur_x, this.cur_y)

        if (border > 0) {
            let textWidthValue = this.p.textWidth(this.label);
            let textHeightValue = this.p.textAscent() + this.p.textDescent();
            this.p.noFill()
            this.p.stroke(this.setColor(this.borderColor));
            this.p.strokeWeight(border);
            this.p.rect(this.cur_x - textWidthValue / 2 - 2 - borderRadius / 2, this.cur_y - textHeightValue / 2 - 1,
                textWidthValue + 4 + borderRadius, textHeightValue + 1,
                borderRadius, borderRadius)
        }
    }

    isPressed() { }
    pressed() { }
    isReleased() { }
}

p5.prototype.Text = function (options = {}) {
    return new Text(this, options);
};




;

;

const sketch = (p, config = {}) => {
    let grey = p.color(220, 229, 234);
    let div;
    p.setColor = setColor;
    p.setFont = setFont;
    p.debug = debug
    p.backgroundColor = [0,0,0]

    //theme functions
    p.setTheme = setp5Theme
    p.listThemes = listThemes
    p.setThemeParameters = setThemeParameters
    p.exportTheme = exportTheme
    //p.theme = setp5Theme('default')

    p.p5Code = '';

    p.Debug = function(){ p.debug(); }

    p.setup = function () {
        let divID = p.canvas.parentElement.id;
        let div = document.getElementById(p.canvas.parentElement.id);
        if( config.height === undefined) config.height = 1
        let dim =  p.initialize(div, config.height)

        p.activeTheme = themes['dark']
        p.width = dim[0]
        p.height = dim[1]
        //console.log(p.width, p.height)
        p.frame = 0
        p.x = 0
        p.y = 0
        p.capture = null
    };

    p.draw = function () {
        p.drawBackground();        

        try {
            eval(p.p5Code);
        } catch (error) {
            console.log("Error in p5Code: ", error);
        }
        p.frame += 1

        p.drawElements();
        
    };

    p.mousePressed = function () {
        for (const element of Object.values(p.elements)) {
            if (typeof (element) !== 'string') {
                try {
                    element.isPressed();
                } catch (e) {
                    //no pressed function
                }
            }
        }
    }

    p.mouseReleased = function () {
        for (const element of Object.values(p.elements)) {
            if (typeof (element) !== 'string') {
                try {
                    element.isReleased();
                } catch (e) {
                    //no releaed function
                }
            }
        }
    }

    p.mouseClicked = function () {
        for (const element of Object.values(p.elements)) {
            if (typeof (element) !== 'string') {
                try {
                    element.isClicked();
                } catch (e) {
                    //no clicked function
                }
            }
        }
    }

    p.mouseDragged = function () {
        for (const element of Object.values(p.elements)) {
            if (typeof (element) !== 'string') {
                try {
                    element.isDragged();
                } catch (e) {
                    //no clicked function
                }
            }
        }
    }

    p.windowResized = function () {
        //p.divResized();
    };

    p.openWebcam = function(width, height) {
      p.capture = p.createCapture(p.VIDEO);
      p.capture.size(width, height);
      p.capture.hide();
      console.log("Webcam opened with resolution:", width, "x", height);
    }
};


let _ = -123456
function orn (note, pattern=1, scalar=1, length=4){
    // TODO: Ask Ian why
    // Check if the note is a string in the format of a note name (e.g., C4, D#3)
    if (typeof note === 'string' && /^[A-Ga-g][#b]?\d/.test(note)) {
        // For note names, just return the original note without ornamentation
        return [note];
    }

	note = Number(note)
	const patts = [
		[0,1,2,3],
		[0,2,1,3],
		[0,1,-1,0],
		[1,0,-1,0],
		[1,'.','.',0],
		[1,0,'.','.'],
		['.',0,0,0],
		['.',0,'.',0]
	]
	let arr = []
	pattern = pattern % patts.length
	for(let i=0;i<length;i++){
		arr.push( note + patts[pattern][i%patts[pattern].length]*scalar)
	}
	return arr
}


/**
 * The MusicGenerator class handles the generation and manipulation of musical elements such as chords, harmony, scales,
 * harmonic progressions, rhythmic attributes like tempo, beat, and time signature, and provides setters and getters
 * to interact with these properties.
 *
 * @class
 * 
 * @property {string} tonic - The tonic or root note (setter: `setTonic`), which can be set using `tonic`, `root`, or `key`.
 * @property {string} root - Alias for `tonic`, allows setting the root note (setter: `setTonic`).
 * @property {string} key - Alias for `tonic`, allows setting the key (setter: `setTonic`).
 * @property {string[]} progression - The chord progression (setter: `setProgression`).
 * @property {number} tempo - The tempo of the piece in beats per minute (BPM), controlled via Tone.js's `Tone.Transport.bpm`.
 * @property {string} scale - The scale type (e.g., 'major', 'minor') used for the chord progression.
 * @property {string} chord - The current chord in the progression.
 * @property {string} timeSignature - The time signature of the piece (e.g., '4/4').
 * @property {number} harmonicTempo - The harmonic tempo, or how quickly harmonic changes occur (in BPM).
 * @property {number} beat - The current beat in the measure.
 * @property {number} bar - The current bar of the piece.
 * @property {number} beatsPerBar - The number of beats in each bar.
 * 
 * @example
 * // Create an instance of the MusicGenerator class
 * const Theory = new MusicGenerator();
 * 
 * // Set the tonic
 * Theory.tonic = 'C';
 * 
 * // Set the progression
 * Theory.progression = ['I', 'IV', 'V'];
 * 
 * // Set the tempo
 * Theory.tempo = 120;
 * 
 */


;


class MusicGenerator {
  constructor() {
    this._tonic = 'C';
    this.tonicNumber = 0; // MIDI note of tonic, 0-11
    this.keyType = 'major';
    this.octave = 4;
    this.voicing = 'closed';
    this.previousChord = [];

    this._scale = 'major'; // Private variable for scale
    this._chord = 'I'; // Private variable for chord
    this._timeSignature = '4/4'; // Private variable for time signature
    this._harmonicTempo = 120; // Private variable for harmonic tempo
    this._beat = 0; // Private variable for beat
    this._bar = 0; // Private variable for bar
    this._beatsPerBar = 4;
    this._startingBar = 0;
    this._startingBeat = 0;
    this._barOffset = 0; // Store the tick offset to reset the index
    this._prevBarOffset = 0;
    this._ticks = 0

    this.pulsePerChord = 16;
    this.harmonicRhythm = 8;
    this.progressionChords = [];
    this._progression = [];

    this.scale = [0,2,4,5,7,9,11]
    this.scaleRatios = Array.from({ length: 12 }, (_, i) => Math.pow(2, i / 12));
    this.A4 = 440;
    this.A4_MIDI = 69;
    
    this.voicings = {
      "closed": [0, 2, 4, 6],
      "open": [0, 4, 6, 9],
      "drop2": [-3, 0, 2, 6],
      "drop3": [-1, 0, 3, 4]
    };
    this.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    this.noteToInterval = {
      'C': 0, 'B#': 12, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 
      'Fb': 4, 'E#': 5, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 
      'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11
    };
    this.chordIntervals = {
      "major": [0, 4, 7],
      "minor": [0, 3, 7],
      "dominant7": [0, 4, 7, 10],
      "minor7": [0, 3, 7, 10],
      "major7": [0, 4, 7, 11],
      "minorMaj7": [0, 3, 7, 11],
      "diminished": [0, 3, 6],
      "diminished7": [0, 3, 6, 9],
      "add9": [0, 4, 7, 14] // Major triad with added ninth
    };
    this.chordScales = {
      "major": [0, 2, 4, 5, 7, 9, 11],
      "minor": [0, 2, 3, 5, 7, 8, 10], // aeolian
      "lydianDominant": [0, 2, 4, 6, 7, 9, 10], //lydian dominant?
      "mixolydian": [0,2,4,5,7,9,10], //for V7
      "phrygianDominant": [0,1,4,5,7,8,10], //for minor V7
      "minor7": [0, 2, 3, 5, 7, 9, 10], //dorian
      "major7": [0, 2, 4, 5, 7, 9, 11],
      "minorMaj7": [0, 2, 3, 5, 7, 9, 11], //melodic minor
      "diminished": [0, 2, 3, 5, 6, 8, 9, 11],
      "diminished7": [0, 2, 3, 5, 6, 8, 9, 11],
      "add9": [0, 2, 4, 5, 7, 9, 11],
      "dorian": [0,2,3,5,7,9,10], //minor natural-6
      "phrygian": [0,1,3,5,7,8,10], //minor flat-2
      "lydian": [0,2,4,6,7,9,11], //major sharp-4
      "locrian": [0,1,3,5,6,8,10], //half-diminished
      "chromatic": [0,1,2,3,4,5,6,7,8,9,10,11] 
    };
    this.MajorScaleDegrees = {
      'I': 0, 'bII': 1, 'II': 2, 'bIII': 3,'III': 4, 'IV': 5, '#IV': 6, 
      'bV': 6,'V': 7,'#V': 8, 'bVI': 8,'VI': 9, 'bVII': 10,'VII': 11,
      'i': 0, 'bii': 1, 'ii': 2, 'biii': 3,'iii': 4, 'iv': 5, '#iv': 6, 
      'bv': 6,'v': 7, 'bvi': 8,'vi': 9, 'bvii': 10,'vii': 11 
    };
    this.MinorScaleDegrees = {
      'I': 0, 'bII': 1, 'II': 2, 'III': 3,'#III': 4, 'IV': 5, '#IV': 6, 
      'bV': 6,'V': 7,'#V': 8, 'VI': 8,'#VI': 9, 'VII': 10,'#VII': 11,
      'i': 0, 'bii': 1, 'ii': 2, 'iii': 3,'#iii': 4, 'iv': 5, '#iv': 6, 
      'bv': 6,'v': 7, 'vi': 8,'#vi': 9, 'bvii': 10,'vii': 11
    };
  }

  set tonic(value) {this.setTonic(value);}
  get tonic() {return this._tonic;}
  set root(value) {this.setTonic(value);}
  get root() {return this._tonic;}
  set key(value) {this.setTonic(value);}
  get key() { return this._tonic; }
  set progression(value) {this.setProgression(value);}
  get progression() {return this._progression;}
  set tempo(value) {Tone.Transport.bpm.value = value;}
  get tempo() {return Tone.Transport.bpm.value;}
  
  set scale(value) { this._scale = value;}
  get scale() { return this._scale;}
  set chord(value) { this._chord = value;}
  get chord() {   return this._chord; }
  set timeSignature(value) {  this._timeSignature = value; }
  get timeSignature() { return this._timeSignature; }
  set harmonicTempo(value) {  this._harmonicTempo = value; }
  get harmonicTempo() {   return this._harmonicTempo;  }

  //Tone.transport time setters
  //Transport info https://tonejs.github.io/docs/r13/Transport
  set beat(value) { 
    let pos = this.transportToArray(Tone.Transport.position)
    pos[1] = value
    Tone.Transport.position = this.arrayToTransport(pos)  
  }
  get beat() {   return  this.transportToArray(Tone.Transport.position)[1] }
  set bar(value) {  
    let pos = this.transportToArray(Tone.Transport.position)
    pos[0] = value
    Tone.Transport.position = this.arrayToTransport(pos)   
  }
  get bar() {  return this.transportToArray(Tone.Transport.position)[0] } 
  set beatsPerBar(value) {  
    this._beatsPerBar = value; 
    Tone.Transport.timeSignature = value
  }
  get beatsPerBar() {  return this._beatsPerBar; }
  set ticks(value) {  this._ticks = value }
  get ticks() {  return this.getTicks()+2; }
  set start(value=0){}
  get now() {
    const time = Tone.Transport.position.split(':').map(Number); // Split and convert to numbers
    return time[0] * 4 + time[1] + (time[2] || 0) / 4; // Handle undefined time[2]
  }

  getIndex(subdiv) { return Math.floor(this.ticks / Tone.Time(subdiv).toTicks()) }

  start(num=0){
    Tone.Transport.position = this.arrayToTransport([num,0,0])
    Tone.Transport.start()
  }
  stop(){ Tone.Transport.stop()}

  transportToArray(position){ return position.split(':').map(Number);}
  arrayToTransport(arr){return arr.join(':')}

  onBar(cb, bar){
    Tone.Transport.schedule(cb, this.arrayToTransport([bar,0,0]))
  }
  /**
 * Sets the tonic (root note) of the scale or chord and updates related properties like key type and octave.
 * Accepts either a string representing a musical note (e.g., "C4", "G#3") or a MIDI note number.
 *
 * If the input is a string, the tonic is derived from the note part, and the key type is determined based on 
 * whether the note is uppercase (for major keys) or lowercase (for minor keys). The octave is set from 
 * the numeric part of the string.
 *
 * If the input is a number, it is treated as a MIDI note number, and both the tonic and octave are computed.
 *
 * @param {string|number} val - The tonic value. Can be a musical note (e.g., "C4", "g#") or a MIDI note number.
 *
 * @example
 * // Set tonic using a musical note string
 * setTonic('C4'); // Sets tonic to 'C', key type to 'major', octave to 4
 * 
 * @example
 * // Set tonic using a MIDI note number
 * setTonic(60); // Sets tonic to 'C', key type remains unchanged, octave to 4
 */
  setTonic(val) {
    if (typeof val === 'string') {
      const noteRegex = /[A-Ga-g][#b]?/;
      const numberRegex = /\d+/;
  
      const noteMatch = val.match(noteRegex);
      const numberMatch = val.match(numberRegex);
      const prevKeyType = this.keyType
  
      if (noteMatch) {
        this._tonic = noteMatch[0].toUpperCase();
        this.keyType = noteMatch[0] === noteMatch[0].toUpperCase() ? 'major' : 'minor';
        if(this.keyType !== prevKeyType) this.progression = []
      }
  
      if (numberMatch) {
        this.octave = parseInt(numberMatch[0], 10);
      }
    } else if (typeof val === 'number') {
      this.octave = Math.floor(val / 12) - 1;
      const noteIndex = val % 12;
      this._tonic = this.notes[noteIndex];
    }
  
    this.tonicNumber = this.noteToInterval[this._tonic];
    console.log(`Tonic: ${this._tonic}, Number: ${this.tonicNumber}, Key Type: ${this.keyType}, Octave: ${this.octave}`);
  }

  /**
  * Sets the chord progression and validates the input.
  * The progression can be passed as either a string or an array of strings representing chords.
  * 
  * If provided as a string, it will split the string into an array by spaces or commas. Each chord
  * in the progression is validated by checking its Roman numeral and corresponding scale type.
  * 
  * If the progression is valid, it is stored and the corresponding chord objects are generated.
  * In case of an error, a message is logged indicating the problematic chord element.
  *
  * @param {string|string[]} val - The chord progression, either as a string (e.g., "I IV V") or an array of chord strings.
  *
  * @example
  * // Set progression using a string
  * setProgression('I IV V');
  * 
  * @example
  * // Set progression using an array of chords
  * setProgression(['I', 'IV', 'V']);
  */
  setProgression(val) {
    let newProgression = [];
    let error = -1;
  
    if (val.constructor !== Array) {
      val = val.replaceAll(',', ' ').split(' ');
    }
  
    for (let i = 0; i < val.length; i++) {
      let chord = val[i];
      try {
        if (val[i] !== '') {
          const romanNumeral = chord.match(/[iIvVb#]+/)[0];
          const quality = this.getChordType(chord);
          console.log(chord, quality)
          if (typeof this.MajorScaleDegrees[romanNumeral] !== "number") error = i;
          if (this.chordScales[quality].constructor !== Array) error = i;
          if (error < 0) newProgression.push(chord);
        }
      } catch {
        console.log("error with element ", val[i]);
        error = 0;
      }
    }
  
    if (error < 0) {
      this._progression = newProgression;
      this.progressionChords = [];
      for (let i = 0; i < this._progression.length; i++) {
        this.progressionChords.push(new Chord(this._progression[i]));
      }
    } else {
      console.log("error in progression element", val[error]);
    }
  }

  setVoicing(name) {
    if (this.voicings.hasOwnProperty(name)) this.voicing = name;
    else console.log('invalid voicing name ', name);
    console.log('current voicing: ', this.voicing);
  }

  getChord(index) {
    let index2 = this.getChordIndex();
    if (this.progressionChords.length < 1) this.progressionChords.push(this.keyType === 'minor' ? new Chord('i') : new Chord('I'));
    return this.progressionChords[Math.floor(index2 % this.progressionChords.length)];
  }

  getChordIndex() {
    let index = Math.floor((this.ticks + 2) / (Tone.Time('4n').toTicks() * this._beatsPerBar));
    return index;
  }

  getChordType(name) {
    const suffix = name.replace(/[iIvVb#]+/, '');
    let majorMinor = name.match(/[iIvV]+/)[0];

    if(!majorMinor) majorMinor = 'I'

    const defaultMode = this.getDefaultMode(majorMinor, this.keyType)
    //console.log(name, this.keyType, defaultMode)
      //look for a specific scale defined in suffix
    for (const key of Object.keys(this.chordScales)) {
      if (suffix.toLowerCase().includes(key.toLowerCase())) {
        console.log('key', key)
        return key;
      }
    }
    //look for special cases
    if (suffix.includes('dim'))  return 'diminished';
    if (suffix.includes('m6'))  return 'dorian';
    if (suffix.includes('min6'))  return 'dorian';
    if (suffix.includes('m13'))  return 'dorian';
    if (suffix.includes('min13'))  return 'dorian';
    if (suffix.includes('m7b9'))  return 'phrygian';
    if (suffix.includes('7b9'))  return 'phrygianDominant';
    if (suffix.includes('Maj7#11'))  return 'lydian';
    if (suffix.includes('m7b5'))  return 'locrian';
    if (suffix.includes('7b5'))  return 'lydianDominant';
    if (suffix.includes('Maj7')) {
      const isMajor = majorMinor === majorMinor.toUpperCase() 
      if(defaultMode === 'lydian') return defaultMode
      return isMajor === true ? 'major7' : 'minorMaj7'
    }
    if (suffix.includes('7')) {
      // if(defaultMode !== 'none') return defaultMode
      // else 
    return majorMinor === majorMinor.toUpperCase() ? 'mixolydian' : 'minor7'; 
    }
    if (suffix.includes('2')) return 'major9';

    if( defaultMode !== 'none') return defaultMode
    return majorMinor === majorMinor.toUpperCase() ? 'major' : 'minor';
  }

  getDefaultMode(numeral, key){
    if (key === 'major'){
      switch(numeral){
      case 'I': return 'major'
      case 'ii': return 'dorian'
      case 'iii': return 'phrygian'
      case 'IV': return 'lydian'
      case 'V': return 'mixolydian'
      case 'vi': return 'minor'
      case 'vii': return 'locrian'
      }
    }
    if (key === 'minor'){
      switch(numeral){
      case 'i': return 'minor'
      case 'ii': return 'locrian'
      case 'III': return 'major'
      case 'iv': return 'dorian'
      case 'v': return 'phrygian'
      case 'V': return 'phrygianDominant'
      case 'VI': return 'lydian'
      case 'VII': return 'mixolydian'
      }
    }
    return 'none'
  }

  /************************************
 * Time keeping
 * ************************************/
  getTicks(){
    const currentTicks = Tone.Transport.ticks - this._barOffset
    if(currentTicks < 0) return Tone.Transport.ticks - this._prevBarOffset
    else return currentTicks
  }
  // resetBar(){
  //   let index = Math.floor((Tone.Transport.ticks + 8) / Tone.Time('1n').toTicks());
  // }

  // calcTicks(val){

  // }


  resetBar(val) {
    const currentTicks = Tone.Transport.ticks;
    const ticksInBar = Tone.Time('4n').toTicks() * this._beatsPerBar; // Get tick value for a quarter note

    // Calculate the next quarter note by rounding up to the nearest quarter note
    const nextBar = Math.ceil(currentTicks / ticksInBar) * ticksInBar ;

    // Store the offset to be subtracted from future index calculations
    this._barOffset = nextBar + val*ticksInBar - val*ticksInBar;

    //console.log(`Bar reset. Next downbeat tick: ${nextBar}, current tick: ${currentTicks}`);
  }

  /************************************
 * Helper functions
 * ************************************/

  getChordRoot(name){
    //parse chord name
    const romanNumeral = name.match(/[iIvVb#]+/)[0];

    //set keyType
    if (!romanNumeral) {
      console.log('incorrect chord name ${name}')
      return this.tonicNumber
    }
    let degree = 0
    
    if (this.keyType == 'major') {
      degree =  this.MajorScaleDegrees[romanNumeral];
      if(degree == undefined) degree = this.MinorScaleDegrees[romanNumeral];
      if(degree == undefined) degree = 0
    }
    else {
      degree =  this.MinorScaleDegrees[romanNumeral];
      if(degree == undefined) degree = this.MajorScaleDegrees[romanNumeral];
      if(degree == undefined) degree = 0
    }
    if(degree == undefined) degree = 0

    return degree % 12
  }

  //return midi note numbers for current chord
  getChordTones(root, quality, scale){
    let chord = []
    let len = 3
    if( /\d/.test(quality)) len = 4
    for(let i=0;i<len;i++) chord[i] = scale[i*2]+root
  }

  getInterval(num,scale){
    let len = scale.length
    if (typeof num === 'number') num = JSON.stringify(num)

      //parse num to look for # and b notes
      const match = num.match(/^([^\d-]+)?(-?\d+)$/);

      //get scale degree
      num = Number(match[2])
      let _octave = Math.floor(num/len)
      if(num<0) num = 7+num%7
      num = scale[num%len] + _octave*12
      

      //apply accidentals
      if(match[1]== '#')num+=1
      else if (match[1] == 'b') num-=1

      num += this.tonicNumber
      return num
  }

  minimizeMovement(chord, previousChord) {
    let distance = Math.abs(chord[0]%12-previousChord[0]%12)
    let lowNote = 0

    for(let i=1;i<chord.length;i++){
      if(Math.abs(chord[i]%12-previousChord[0]%12) < distance){
        distance = Math.abs(chord[i]%12-previousChord[0]%12)
          lowNote = i
      }
    }

    while(chord[lowNote] < previousChord[0]-2)chord = chord.map(x=>x+12)
   
    for(let i=0;i<chord.length;i++){
      if(chord[i] < previousChord[0])chord[i]+=12
    }

    return chord.sort((a, b) => a - b);
  }



    mtof(midiNote) {
      const stepsPerOctave = this.scaleRatios.length;

      // Offset from C4 instead of A4
      const semitoneOffset = midiNote - 60;
      const octaveOffset = Math.floor(semitoneOffset / stepsPerOctave);
      const degree = ((semitoneOffset % stepsPerOctave) + stepsPerOctave) % stepsPerOctave;

      //console.log(midiNote, semitoneOffset, octaveOffset, degree)
      // Frequency of C4 (the 1:1 ratio point)
      const c4Freq = 440 * Math.pow(2, (60 - 69) / 12);

      const freq = c4Freq * Math.pow(2, octaveOffset) * this.scaleRatios[degree];
      //console.log(freq,Math.pow(2, octaveOffset), this.scaleRatios[degree])
      return freq;
    }

    setTemperament(ratios) {
    this.scaleRatios = ratios;
  }

    setA4(freq) {
    this.A4 = freq;
  }
}

const Theory = new MusicGenerator()

/****************** 
 * CHORD Class
 * Methods
 * - constructor(name,octave,voicing)
 * - getChordTones(lowNote): gets array of MIDI notes
 * - getInterval(degree): midi note number of scale degree
 * - setChord: set custom chord
 * 
 * Parameters
 * - notes: midi note numbers of current chord degrees
 * - root: midi note
 * - octave
 * - voicing: name 'closed' or interval pattern [0,2,4]
 * - scale: name 'major' or custom e.g. [0,2,4,5,7,9,11]
 *  * ******************/

/**
 * Class representing a musical chord.

 */
class Chord {
  /**
   * Create a chord.
  
   * @param {string} name - The name of the chord (e.g., "Cmaj7", "Dm7").
   * @param {number} [_octave=octave] - The octave in which the chord is played.
   * @param {string} [_voicing=voicing] - The voicing to use for the chord.
   */
  constructor(name, _octave = Theory.octave, _voicing = Theory.voicing) {
    this.name = name;
    this.octave = _octave;
    this.voicing = _voicing;
    this.rootValue = Theory.getChordRoot(name); //integer 0-11
    this.quality = Theory.getChordType(name) //'Maj7'
    this.scale = Theory.chordScales[this.quality];
    if(this.name == 'V7') this.scale = Theory.chordScales['mixolydian']
    this.chordTones = this.getChordTones(this.rootValue,this.quality,this.scale);
    this.length = this.chordTones.length
  }
  /**
   * Calculate the interval for the chord within a specified range.
   * @param {number} num - The scale degree or interval number.
   * @param {number} [min=48] - The minimum MIDI note number for the interval.
   * @param {number} [max=null] - The maximum MIDI note number for the interval. Defaults to min + 12.
   * @returns {number} - The MIDI note number for the interval.
   */
  interval(num, min = 12, max = null){
    if(max === null) max = min + 12
    return this.getInterval(num,min,max)
  }

  getInterval(num, min = 0, max = 127){ 
    num = Theory.getInterval(num, this.scale) + this.rootValue + this.octave*12 
    if(num<min) {
      const count = Math.floor((min-num)/12)+1
      for(let i=0;i<count;i++)num += 12
        //console.log('min', count)
    }
    else if(num>max) {
      const count = Math.floor((num-max)/12)+1
      for(let i=0;i<count;i++)num -= 12
        //console.log('max', count)
    }
    return num
  }

  /**
   * Get the root note of the chord adjusted for a specified low note.
  
   * @param {number} [lowNote=36] - The lowest note to start the chord from.
   * @returns {number} - The root note as a MIDI note number.
   */
  root(lowNote = 36){
    return this.rootValue + lowNote
  }

  /**
   * Get the chord tones starting from a specified low note.
  
   * @param {number} [lowNote=48] - The lowest note to start the chord from.
   * @returns {number[]} - An array of MIDI note numbers representing the chord tones.
   */
  tones(lowNote = 48){
    return this.getChordTones(lowNote)
  }

  getChordTones(lowNote=48, highNote = null) {
    if(highNote === null) highNote  = lowNote + 12
    const chordTones = this.getChord(this.name, lowNote, this.voicing)
    //console.log(chordTones)
    return chordTones;
  }

  /**
   * Set a custom chord with specified notes.
  
   * @param {number[]} customChord - An array of MIDI note numbers representing the custom chord.
   */
  setChord(customChord) {
    this.notes = customChord;
  }

  applyVoicing(chordTones) {
    const voicingOffsets = Theory.voicings[this.voicing];
    return Theory.chordTones.map((tone, index) => tone + (voicingOffsets[index] || 0));
  }

  getChord(name,  lowNote = null, _voicing = null){

    if(_voicing == null) _voicing = Theory.voicing

    // Adjust the chord tones based on the voicing type
    //let chord = applyVoicing(name, _voicing, this.scale);

    let chord = [this.scale[0], this.scale[2], this.scale[4]];

    //check for numeric extensions
    const regex = /\d/;
    if( regex.test(name) && this.scale.length >= 7 ) {
      const match = name.match(/\d+/); // Match one or more digits
      if (match) {
        chord.push( this.scale [parseInt(match[0], 10)%7]); // Convert the matched string to a number
      }
    }
    chord = chord.map(x=> x+ this.octave*12 + this.rootValue)// + Theory.tonicNumber)

    // Adjust the chord tones to be as close as possible to the previous chord
    if (Theory.previousChord.length > 0) {
      if(lowNote){ Theory.previousChord[0] = lowNote}
      chord = Theory.minimizeMovement(chord, Theory.previousChord);
    }

    Theory.previousChord = chord;
    return chord.map(x=> x + Theory.tonicNumber)
  }
}

/************************************
 * String parsing functions
 * ************************************/
/** parseStringSequence

 * 
 * takes an input string and:
 * - replaces groups like *@4 with ****
 * - splits the string into an array of strings, one string per beat
 * - preserves characters inside [] inside one beat
 */

function parseStringSequence(str){
    str = str.replace(/\s/g, ""); // Remove all whitespace

    //replace the expression  *@4 with ****
    str = str.replace(/(.)@(\d+)/g, (match, p1, p2) => {
        // p1 is the character before the @
        // p2 is the number after the @, so repeat p1 p2 times
        return p1.repeat(Number(p2));
    });

    //split original string into an array of strings
    //items within [] are one entry of the array
    const regex = /\[.*?\]|./g;
    str.match(regex);
    str = str.match(regex);
    //console.log('pitch', str)
    return str
}

function parsePitchStringSequence(str) {
  const firstChar = str.replace(/\[/g, "")[0];
  const usesPitchNames = /^[A-Ga-g?]$/.test(firstChar);

  if( usesPitchNames ) str = str.replace(/\s+/g, "");

  // Tokenizers
  const pitchRegex = /\[.*?\]|[A-Ga-g][#b]?\d*|@\d+|\.|\?|~|\*/g;
  const numRegex   = /\[.*?\]|-?\d+|@\d+|\.|\?|~|\*/g;

  const regex = usesPitchNames ? pitchRegex : numRegex;

  let arr = str.match(regex) ?? [];

  // Expand @N: repeat the previous token N-1 additional times
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][0] === "@") {
      const repeatCount = parseInt(arr[i].slice(1), 10) - 1;
      const prev = arr[i - 1];

      if (repeatCount > 0 && prev !== undefined) {
        arr.splice(i, 1, ...new Array(repeatCount).fill(prev));
        i += repeatCount - 1;
      } else {
        // If malformed (e.g. starts with @), just remove it
        arr.splice(i, 1);
        i -= 1;
      }
    }
  }

  return arr;
}

//handles rhythm sequences
function splitBeat(str) {
    const inside = str.slice(1, -1);   // remove outer brackets
    const out = [];
    let i = 0;

    while (i < inside.length) {
        // preserve inner bracket groups: [ ... ]
        if (inside[i] === '[') {
            const start = i;
            i++; 
            while (i < inside.length && inside[i] !== ']') i++;
            //i++; // include the closing bracket
            out.push(inside.slice(start, i));
            continue;
        }

        // otherwise split into single characters
        out.push(inside[i]);
        i++;
    }

    return out;
}

function parseStringBeat(curBeat, time){
  // console.log(curBeat)
  let outArr = []
  //handle when a beat contains more than one element
    const bracketCheck = /^\[.*\]$/;
    if (bracketCheck.test(curBeat)) {
      curBeat = splitBeat(curBeat)

      for(let i=0;i<curBeat.length;i++){
        outArr.push([curBeat[i],i/curBeat.length])
      }

    } else { //for beats with only one element
      outArr.push([curBeat, 0])
        //callback(curBeat, time);
    }
    return  outArr 
}

//handles pitch sequences
/* DEEP SEEK
function parsePitchStringBeat(curBeat, time, parentStart=0, parentDuration=1){
  console.log('____', curBeat, parentStart, parentDuration)
  try{
    if (typeof curBeat === 'number')  curBeat = curBeat.toString();
    const firstElement = curBeat.replace(/\[/g, "")[0]
    const usesPitchNames = /^[a-ac-zA-Z]$/.test(firstElement);

    // Check if the input is a single value (not an array)
    if (!curBeat.startsWith('[')) {
      return [[curBeat, 0]];
    }

    // Remove outer brackets and split into top-level elements
    const elements = curBeat.slice(1, -1).trim().split(/\s+/);
    console.log('el', elements)
    const outArr = [];

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      // Handle subarrays recursively (e.g., "[3 4]")
      if (element.startsWith('[')) {
        // Find the full subarray string (handles nested brackets)
        let subArrayStr = element;
        let bracketCount = (element.match(/\[/g) || []).length;
        let j = i + 1;

        while (bracketCount > 0 && j < elements.length) {
          subArrayStr += ' ' + elements[j];
          bracketCount += (elements[j].match(/\[/g) || []).length;
          bracketCount -= (elements[j].match(/\]/g) || []).length;
          j++;
        }
        subArrayStr += ']'

        // Calculate the subarray's slot in the parent
        console.log('sub', parentStart, elements.length, elements, (i / (elements.length-1)), parentDuration)
        const subArraySlotStart = parentStart + (i / (elements.length-1)) * parentDuration;
        const subArraySlotDuration = parentDuration / (elements.length-1);

        // Parse the subarray internally (timings relative to its own slot)
        const subArrayElements = subArrayStr.slice(1, -1).trim().split(/\s+/);
        for (let k = 0; k < subArrayElements.length; k++) {
          const subElement = subArrayElements[k];
          const subElementTime = subArraySlotStart + (k / subArrayElements.length) * subArraySlotDuration;
          outArr.push([subElement, subElementTime]);
        }
        i = j - 1; // Skip processed elements
      }
      // Handle simple values (e.g., "2")
      else {
        const noteTime = parentStart + (i / elements.length) * parentDuration;
        outArr.push([element, noteTime]);
      }
    }
      console.log(outArr)
      return  outArr 
    }
  catch(e){
    console.log('error with parsePitchStringBeat')
    return ['.']
  }
}
*/

function parsePitchStringBeat(curBeat, time){
  //console.log('pitch', curBeat)
  try{
    if (typeof curBeat === 'number')  curBeat = curBeat.toString();
    const firstElement = curBeat.replace(/\[/g, "")[0]
    const usesPitchNames = /^[a-ac-zA-Z]$/.test(firstElement);
    let outArr = []
    //handle when a beat contains more than one element
      const bracketCheck = /^\[.*\]$/;
      if (bracketCheck.test(curBeat)) {
        //remove brackets and split into arrays by commas
        curBeat =curBeat.slice(1, -1).split(',');
        //console.log(curBeat)
        curBeat.forEach(arr => {
          let regex = /\[.*?\]|[A-Ga-g][#b]?\d*|@(\d+)|./g;
          if( !usesPitchNames){ //true if first element is a number
            regex = /\[.*?\]|-?\d+|@\d+|\.|\?|~|\*/g;
          } 
          arr = arr.match(regex)

           for (let i = 0; i < arr.length; i++) {
                if (arr[i].startsWith("@")) {
                    const repeatCount = parseInt(arr[i].slice(1), 10)-1; // Get the number after '@'
                    const elementToRepeat = arr[i - 1]; // Get the previous element
                    const repeatedElements = new Array(repeatCount).fill(elementToRepeat); // Repeat the element
                    arr.splice(i, 1, ...repeatedElements); // Replace '@' element with the repeated elements
                    i += repeatCount - 1; // Adjust index to account for the newly inserted elements
                }
            }
            // console.log(arr)
            
            const length = arr.length;
            for (let i = 0; i < length; i++) {
                const val = arr[i];
                outArr.push([val,i/length])
            }
        });
        //console.log(outArr)
      } else { //for beats with only one element
        outArr.push([curBeat, 0])
      }
      return  outArr 
    }
  catch(e){
    console.log('error with parsePitchStringBeat', curBeat)
    return ['.']
  }
}


/**
 * Converts a pitch name (e.g., "C4", "g#", "Bb3") to a MIDI note number.

 *
 * @param {string} name - The pitch name to convert. This can include a pitch class (A-G or a-g), 
 *                        an optional accidental (# or b), and an optional octave number.
 *                        If no octave number is provided, uppercase letters default to octave 3,
 *                        and lowercase letters default to octave 4.
 * @returns {number} - The corresponding MIDI note number.
 */
function pitchNameToMidi(name) {
    const pitchClasses = Theory.noteToInterval

    // Normalize input to remove spaces
    name = name.trim()
    
    // Determine the pitch class and accidental if present
    let pitchClass = name.match(/[A-G]?[a-g]?[#b]?/)[0];

    // Determine the octave:
    // - Uppercase letters (C-B) should be octave 3
    // - Lowercase letters (c-a) should be octave 4
    let octave;
    if (/[A-G]/.test(name[0])) {
        octave = 3;
    } else {
        octave = 4;
    }

    //convert first character to uppercase
    pitchClass = pitchClass.charAt(0).toUpperCase() + pitchClass.slice(1)

    // Adjust for any explicit octave provided (e.g., "C4" or "c5")
    let explicitOctave = name.match(/\d+$/);
    if (explicitOctave) octave = parseInt(explicitOctave[0], 10)

    // Adjust the MIDI note for flats (# and b are already handled in pitchClasses)
    let midiNote = pitchClasses[pitchClass] + (octave+1) * 12;

    return midiNote;
}

/**
 * Converts an to a MIDI note number, taking into account the current chord.

 *
 * @param {string} interval - The interval to convert. This will include a integer number, 
 *                        and an optional accidental (# or b).
 * @returns {number} - The corresponding MIDI note number.
 */
function intervalToMidi(interval, min=12, max = 127) {
    // Normalize input to remove spaces
  //console.log(interval)
  let degree = 0
  let accidental = null
  let midiNote = -1
    if (typeof interval === 'string') {
      interval = interval.trim()
    
    // Determine the pitch class and accidental if present
     degree = interval.match(/\[.*?\]|-?\d+|@(\d+)|\./g)[0];
     accidental = interval.match(/[b#]+/g);
   }
   else degree = interval

    //console.log(degree,accidental Theory.getChord())

    try{  midiNote = Theory.getChord().interval(degree,min,max)}
    catch(e){ console.log('bad interval: ', degree)}

    //console.log('th', midiNote, accidental)
    if (accidental !== null) {
      if (Array.isArray(accidental)) {
        for (const sign of accidental) {
          if (sign === "#") midiNote += 1;
          else if (sign === "b") midiNote -= 1;
        }
      } else {
        if (accidental === "#") midiNote += 1;
        else if (accidental === "b") midiNote -= 1;
      }
    }

    // Adjust the MIDI note for flats (# and b are already handled in pitchClasses)
    //let midiNote = pitchClasses[pitchClass] + (octave+1) * 12;
    //return 60

    //console.log(interval, midiNote, Theory.getChord())

    return midiNote //+ Theory.tonicNumber;
}

//parses a symbol and makes sure it is in correct order
function rearrangeAccidentals(arr, usesPitchNames) {

    // Regular expression to separate sign, letters, numbers, and accidentals
    const match = arr.match(/^(-?)([A-Za-ac-z]*)(\d*)([#b]*)$/);
    console.log(arr, usesPitchNames, match)
    if (match) {
        const [, sign, letters, numbers, accidentals] = match;
        //console.log(`letters ${accidentals}${numbers} ${usesPitchNames}`);
        if (usesPitchNames) {
            // For pitch names: letter/accidental/octaveNumber
            //console.log(`letters ${sign}${letters}${accidentals}${numbers}`);
            return `${letters}${accidentals}${numbers}`;
        } else {
            // For scale degrees: sign,number,accidental
            //console.log(`numbers ${sign}${letters}${numbers}${accidentals}`);
            return `${sign}${numbers}${accidentals}`;
        }
    }

    // Return the original string if no match
    return arr;
}



// MidiKeyboard2.js
function MidiKeyboard2(midiHandler) {

    let activeKeys = {};
    let octave = 4;
    let midiOn = false;
    let notesOn = new Set();

    const keyToNote = {
        32: { midi: '.' },
        90: { midi: 60 }, 83: { midi: 61 }, 88: { midi: 62 },
        68: { midi: 63 }, 67: { midi: 64 }, 86: { midi: 65 },
        71: { midi: 66 }, 66: { midi: 67 }, 72: { midi: 68 },
        78: { midi: 69 }, 74: { midi: 70 }, 77: { midi: 71 },
        188: { midi: 72 }, 76: { midi: 73 }, 190: { midi: 74 },
        186: { midi: 75 }, 191: { midi: 76 },

        81: { midi: 72 }, 50: { midi: 73 }, 87: { midi: 74 },
        51: { midi: 75 }, 69: { midi: 76 }, 82: { midi: 77 },
        53: { midi: 78 }, 84: { midi: 79 }, 54: { midi: 80 },
        89: { midi: 81 }, 55: { midi: 82 }, 85: { midi: 83 },
        73: { midi: 84 }, 57: { midi: 85 }, 79: { midi: 86 },
        48: { midi: 87 }, 80: { midi: 88 }
    };

    function enable() {
        if (midiOn) return;
        midiOn = true;
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);
    }

    function disable() {
        if (!midiOn) return;
        midiOn = false;

        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("keyup", handleKeyUp);

        for (let note of notesOn) {
            midiHandler.handleNoteOff(note, 0);
        }
        notesOn.clear();
    }

    function toggle() {
        midiOn ? disable() : enable();
    }

    function handleKeyDown(event) {
        if (!midiOn) return;
        const keyCode = event.keyCode;

        if (activeKeys[keyCode]) return;
        activeKeys[keyCode] = true;

        if (keyCode === 37) return decreaseOctave();
        if (keyCode === 39) return increaseOctave();

        const map = keyToNote[keyCode];
        if (!map) return;
        if (map.midi === '.') {
            midiHandler.handleNoteOn('.', 100);
            return;
        }

        const midiNote = map.midi + (octave - 4) * 12;

        if (midiNote < 128) {
            notesOn.add(midiNote);
            midiHandler.handleNoteOn(midiNote, 100);
        }
    }

    function handleKeyUp(event) {
        if (!midiOn) return;
        const keyCode = event.keyCode;

        activeKeys[keyCode] = false;

        const map = keyToNote[keyCode];
        if (!map) return;
        if (map.midi === '.') {
            midiHandler.handleNoteOff('.', 100);
            return;
        }

        const midiNote = map.midi + (octave - 4) * 12;

        if (midiNote < 128) {
            notesOn.delete(midiNote);
            midiHandler.handleNoteOff(midiNote, 0);
        }
    }

    function increaseOctave() {
        if (octave < 7) octave++;
    }

    function decreaseOctave() {
        if (octave > 1) octave--;
    }

    return {
        enable,
        disable,
        toggle,
        get activeNotes() { return Array.from(notesOn); }
    };
}


// browser global
if (typeof window !== "undefined") {
    window.MidiKeyboard2 = MidiKeyboard2;
}

// node if (typeof module !== "undefined") {
    module.exports = MidiKeyboard2;
}

// NexusUI wrapper base class
// Uses the global Nexus object from the nexusui npm package

// Static flag to track if Canvas has been initialized
let canvasInitialized = false;

/**
 * Initialize the Canvas container for NexusUI elements
 * Call this once before creating NexusUI elements, or it will be called automatically
 * @param {string} backgroundColor - Optional background color (default: '#1a1a2e')
 */
function initNexusCanvas(backgroundColor = '#1a1a2e') {
    const container = document.getElementById('Canvas');
    if (!container) {
        console.error('initNexusCanvas: #Canvas container not found!');
        return null;
    }
    
    // Set up Canvas styling for NexusUI
    container.style.backgroundColor = backgroundColor;
    container.style.margin = '0';
    container.style.padding = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    
    canvasInitialized = true;
    return container;
}

class NexusElement{
    constructor(element_type, x = 0, y = 0, width = 100, height = 100) {
        this.element_type = element_type;

        // Get the Canvas container - this is where NexusUI elements should appear
        const container = document.getElementById('Canvas');
        if (!container) {
            console.error('NexusElement: #Canvas container not found!');
            return;
        }
        
        // Auto-initialize Canvas if not already done
        if (!canvasInitialized) {
            initNexusCanvas();
        }

        // Initialize the Nexus element - NexusUI will create its own wrapper
        const Nexus = window.Nexus;
        
        // Create a unique container div for this element inside Canvas
        const elementContainer = document.createElement('div');
        elementContainer.style.position = 'absolute';
        elementContainer.style.left = x + 'px';
        elementContainer.style.top = y + 'px';
        container.appendChild(elementContainer);
        
        // Create the NexusUI element inside our positioned container
        this.element = new Nexus[this.element_type](elementContainer, {
            size: [width, height]
        });
        
        // Store reference to our container for cleanup
        this.container = container;
        this.elementContainer = elementContainer;

        const containerWidth = container.clientWidth || window.innerWidth;
        const containerHeight = container.clientHeight || window.innerHeight;

        // Store position as percentages for responsive resizing
        this.xPercent = x / containerWidth;
        this.yPercent = y / containerHeight;
        this.widthPercent = width / containerWidth;
        this.heightPercent = height / containerHeight;

        // Apply initial position (already set, but ensures consistency)
        this.updatePositionAndSize();
        
        // Use ResizeObserver to handle container resizing (e.g. split pane drag)
        if (container) {
            this.resizeObserver = new ResizeObserver(() => {
                window.requestAnimationFrame(() => {
                    if (!this.element || !this.element.element || !document.body.contains(this.element.element)) {
                        if (this.resizeObserver) this.resizeObserver.disconnect();
                        return;
                    }
                    this.updatePositionAndSize();
                });
            });
            this.resizeObserver.observe(container);
        } else {
            // Fallback to window resize if container not found immediately
            window.addEventListener("resize", () => this.updatePositionAndSize());
        }
    }

    mapTo(callback){
        this.element.on("change", callback)
        //callback must be written as (element_output) => {function}
    }

    updatePositionAndSize() {
        // Update pixel values based on percentages and current container size
        const container = this.container || document.getElementById('Canvas');
        if (!container) return;
        
        const newWidth = container.clientWidth || window.innerWidth;
        const newHeight = container.clientHeight || window.innerHeight;

        // Position our wrapper container
        if (this.elementContainer) {
            this.elementContainer.style.left = (this.xPercent * newWidth) + "px";
            this.elementContainer.style.top = (this.yPercent * newHeight) + "px";
        }
        
        // Resize the NexusUI element
        if (this.element && this.element.resize) {
            this.element.resize(
                this.widthPercent * newWidth,
                this.heightPercent * newHeight
            );
        }
    }

    colorize(property, color) {
        if (this.element && this.element.colorize) {
            this.element.colorize(property, color);
        }
    }

    // Destroy the element and clean up
    destroy(){
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.element && this.element.destroy) {
            this.element.destroy();
        }
        // Remove our container div
        if (this.elementContainer && this.elementContainer.parentNode) {
            this.elementContainer.parentNode.removeChild(this.elementContainer);
        }
    }

        //Dynamic sizing and positioning

        set x(value) {
            const container = this.container || document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            this.xPercent = value / containerWidth;
            this.updatePositionAndSize();
        }
    
        set y(value) {
            const container = this.container || document.getElementById('Canvas');
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            this.yPercent = value / containerHeight;
            this.updatePositionAndSize();
        }
    
        set width(value) {
            const container = this.container || document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            this.widthPercent = value / containerWidth;
            this.updatePositionAndSize();
        }
    
        set height(value) {
            const container = this.container || document.getElementById('Canvas');
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            this.heightPercent = value / containerHeight;
            this.updatePositionAndSize();
        }
    
        // Getters for convenience
        get x() {
            const container = this.container || document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            return this.xPercent * containerWidth;
        }
    
        get y() {
            const container = this.container || document.getElementById('Canvas');
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            return this.yPercent * containerHeight;
        }
    
        get width() {
            const container = this.container || document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            return this.widthPercent * containerWidth;
        }
    
        get height() {
            const container = this.container || document.getElementById('Canvas');
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            return this.heightPercent * containerHeight;
        }

        set size([newWidth, newHeight]) {
            const container = this.container || document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            this.widthPercent = newWidth / containerWidth;
            this.heightPercent = newHeight / containerHeight;
            this.updatePositionAndSize();
        }
    
        get size() {
            const container = this.container || document.getElementById('Canvas');
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            return [
                this.widthPercent * containerWidth,
                this.heightPercent * containerHeight
            ];
        }
    }

;

class NexusButton extends NexusElement {
    constructor(x = 0, y = 0, width = 150, height = 300) {
        // Pass the type "Dial" to the parent constructor
        super('Button', x, y, width, height);
    }

    flip(){
        this.element.flip()
    }

    //button functions
    turnOn(){
        this.element.turnOn()
    }

    turnOff(){
        this.element.turnOff()
    }

    get mode() {
        return this._mode;
    }

    set mode(type){
        this._mode = type;
        this.element.mode = type
    }

    get state(){
        return this._state
    }

    set state(pressed){
        this._state = pressed;
        this.element.state = pressed
    }

}

;

class NexusDial extends NexusElement {
    constructor(x = 0, y = 0, width = 100, height = 100, showValue = false) {
        // Pass the type "Dial" to the parent constructor
        super('Dial', x, y, width, height);
        
        this._showValue = showValue;
        this._valueDisplay = null;
        
        if (showValue) {
            this._createValueDisplay(width);
        }
    }
    
    _createValueDisplay(width) {
        if (!this.elementContainer) return;
        
        const valueDiv = document.createElement('div');
        valueDiv.style.cssText = `
            position: absolute;
            left: 0;
            bottom: -16px;
            width: ${width}px;
            text-align: center;
            color: #888888;
            font-family: monospace;
            font-size: 10px;
            pointer-events: none;
            user-select: none;
        `;
        valueDiv.textContent = '0.00';
        this.elementContainer.appendChild(valueDiv);
        this._valueDisplay = valueDiv;
        
        // Update value display when dial changes
        this.element.on('change', (v) => {
            this._updateValueDisplay(v);
        });
    }
    
    _updateValueDisplay(value) {
        if (this._valueDisplay && typeof value === 'number') {
            // Format based on value range
            if (Math.abs(value) >= 100) {
                this._valueDisplay.textContent = Math.round(value).toString();
            } else if (Math.abs(value) >= 10) {
                this._valueDisplay.textContent = value.toFixed(1);
            } else {
                this._valueDisplay.textContent = value.toFixed(2);
            }
        }
    }
    
    // Enable or disable value display
    set showValue(show) {
        this._showValue = show;
        if (show && !this._valueDisplay) {
            this._createValueDisplay(this.width);
            this._updateValueDisplay(this.element.value);
        } else if (!show && this._valueDisplay) {
            this._valueDisplay.remove();
            this._valueDisplay = null;
        }
    }
    
    get showValue() {
        return this._showValue;
    }

    // ccSet is called by Parameter.set() to update the GUI without triggering callback
    ccSet(value) {
        // Validate value to prevent NaN errors
        if (this.element && typeof value === 'number' && !isNaN(value) && isFinite(value)) {
            // Clamp value to min/max range
            const clampedValue = Math.max(this._min || 0, Math.min(this._max || 1, value));
            this.element.value = clampedValue;
            this._updateValueDisplay(clampedValue);
        }
    }


    // setMode(mode) {
    //     this.element.mode = mode; // "relative" or "absolute"
    // }

    get mode() {
        return this._mode;
    }

    set mode(type){
        this._mode = type;
        this.element.mode = type
    }

    get value() {
        return this.element.value;
    }
    set value(value) {
        this.element.value = value;
    }

    get step(){
        return this._step
    }

    set step(increment){
        this._step = increment;
        this.element.step = increment
    }

    get max() {
        return this._max;
    }
    set max(value) {
        this._max = value;
        this.element.max = value
    }

    get min() {
        return this._min;
    }
    set min(value) {
        this._min = value;
        this.element.min = value
    }

}

window.basicLayout = {

    "vco": {
      "color": [150, 0, 0],
      "boundingBox": { "x": 10, "y": 10, "width": 30, "height": 50 },
      "offsets": { "x": 12, "y": 30 },
      "groupA": ["type", "rolloff"],
      "controlTypeA": "radioButton",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.75,
      "theme": "dark"
    },
    "vcf": {
      "color": [100, 0, 150],
      "boundingBox": { "x": 30, "y": 10, "width": 40, "height": 50 },
      "offsets": { "x": 10, "y": 30 },
      "groupA": ["cutoff"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.6
    },
    "vca": {
      "color": [100, 50, 100],
      "boundingBox": { "x": 70, "y": 10, "width": 30, "height": 50 },
      "offsets": { "x": 12, "y": 30 },
      "groupA": ["level"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.6
    },
    "env": {
      "color": [20, 100, 100],
      "boundingBox": { "x": 10, "y": 60, "width": 50, "height": 50 },
      "offsets": { "x": 6, "y": 300 },
      "groupA": [],
      "controlTypeA": "knob",
      "controlTypeB": "fader",
      "sizeA": 0.8,
      "sizeB": 1.2
    },
    "lfo": {
      "color": [20, 0, 100],
      "boundingBox": { "x": 50, "y": 70, "width": 50, "height": 50 },
      "offsets": { "x": 12, "y": 30 },
      "groupA": ["rate"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.6
    }
  
};;

  ;

class TextField {
    constructor(numLines = 10, _target = 'Canvas') {
    const container = document.getElementById(_target);
    if (!container) {
      console.error(`No element found with id "${_target}"`);
      return;
    }


    this.numLines = numLines;
    this.lines = Array(numLines).fill('');
    this.cursorPosition = {
      'line':-1,
      'start':-1,
      'end':-1
    }
    
    // Create the div
    this.div = document.createElement('div');
    Object.assign(this.div.style, {
      //position: 'absolute',
      //bottom: '0',
      //left: '0',
      //width: '100%',
      background: 'rgba(0,0,0,0.6)',
      color: '#0f0',
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      lineHeight: '18px',
      whiteSpace: 'pre',
      overflow: 'hidden',
      padding: '4px',
      //boxSizing: 'border-box',
      pointerEvents: 'none',
    });

    container.appendChild(this.div);

        this.lineHeight = 20;
        this.lines = [];

        this._color =  [
            '#FF5733',  // Base orange
            '#33A1FF',  // Light blue (complementary)
            '#FF33B1',  // Magenta (opposite on color wheel)
            '#33FF57',  // Bright green (vibrant contrast)
            '#5733FF',  // Purple (contrasting tone)
            '#FFBD33',  // Warm yellow (vibrant and complementary)
            '#33FFBD',  // Mint green (cool contrast)
            '#FF3380'   // Pink (near complementary)
        ];

        this._backgroundColor = '#3C3D37'
        this._activeColor = '#ECDFCC'; // Default color

        this.div.style.fontFamily = 'Consolas, monospace';
        this.div.style.fontSize = '18px';
        this.div.style.color = '#ffcc00';
        this.div.style.backgroundColor = '#000';
    }

    // Write text to a given line index
    writeLine(lineNum, text) {
      // Expand the array as needed
      while (this.lines.length <= lineNum) this.lines.push('');
      this.lines[lineNum] = text;
      this.trimTrailingEmptyLines();
      this.render();
    }

  clearLine(lineNum) {
    if (lineNum < 0 || lineNum >= this.lines.length) return;
    this.lines[lineNum] = '';
    this.trimTrailingEmptyLines();
    this.render();
  }

  clear() {
    this.lines = [];
    this.render();
  }

  trimTrailingEmptyLines() {
    // Remove undefined or empty lines at the end
    while (this.lines.length > 0 && !this.lines[this.lines.length - 1]) {
      this.lines.pop();
    }
  }

    // Redraw all lines
    // render() {
    //   this.div.textContent = this.lines.join('\n');
    // }
  render() {
    let highlightPos = [this.cursorPosition.start,this.cursorPosition.end]
    let highlightLine = this.cursorPosition.line
    this.ensureStyle()

    const esc = (s) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    let html = "";
    for (let i = 0; i < this.lines.length; i++) {
      const line = String(this.lines[i] ?? "");
      
      if ( i === highlightLine &&
        highlightPos[0] >= 0 &&
        highlightPos[0] <= line.length &&
        highlightPos[1] >= highlightPos[0]
      ) {
        html +=
          esc(line.slice(0, highlightPos[0])) +
          `<span class="seq-cursor">${esc(line.slice(highlightPos[0], highlightPos[1]))}</span>` +
          esc(line.slice(highlightPos[1]));
      } else {
        html += esc(line);
      }
      if (i < this.lines.length - 1) html += "\n";
    }
    //console.log(html)
    this.div.innerHTML = html;
  }

  ensureStyle() {
    if (this._hasStyle) return;

    const style = document.createElement("style");
    style.textContent = `
      .seq-cursor {
        background: rgba(255,255,255,0.25);
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
    this._hasStyle = true;
  }
 
}


/**
 * PianoRollDisplay
 * ----------------
 * A lightweight, time-windowed piano roll visualizer for sequenced MIDI-style data.
 *
 * CONSTRUCTOR ARGUMENTS
 * - numBeats:        Number of beats displayed horizontally in the window.
 * - height:          Height of the display in pixels.
 * - color:           Base color used to draw note events.
 * - backgroundColor: Background color of the roll.
 *
 * CORE METHODS
 * - place(note, subdivision, duration, velocity)
 *   Adds a note event at a specific time position and pitch.
 *   The note is immediately drawn onto the main canvas (no full redraw).
 *
 * - clear(beatNumber = null)
 *   Clears previously drawn notes.
 *   If beatNumber is null, all events are cleared.
 *   If beatNumber is provided, only notes intersecting that beat are removed.
 *
 * 
 * 
The visualizer uses **multiple stacked canvases**:

1. **Grid Canvas**  
   Drawn once (or when configuration changes). Renders the background color and vertical grid lines at beat and subdivision boundaries.

2. **Note Canvas**  
   Receives individual note drawings when `place()` is called. Notes persist until explicitly cleared.
   Also clears beats on the canvas when the cursor arrives at a new beat.

3. **Cursor Canvas**  
   Updated frequently. Cleared and redrawn every subdivision (e.g. every 16th note) to show the current playhead position without disturbing the grid or notes.

This separation keeps redraw costs low and ensures stable, predictable visuals during real-time playback.

 * NOTE DRAWING FLOW
 * - Notes are drawn individually when place() is called.
 * - Notes are rendered directly onto the main (note) canvas.
 * - No full canvas redraw is required for new notes.
 * - Old notes are removed by clearing beats ahead of the playhead.
 *
 * DESIGN INTENT
 * - Separation of static (grid) and dynamic (cursor + notes) layers
 *   keeps redraw cost low and timing predictable.
 * - Beat-relative clearing ensures the playhead always advances into
 *   empty space, avoiding stale visual artifacts.
 * 
 * TO DO
 * - right now, all notes in the coming beat are drawn at the same time.
 * - it would be nice to get timing information to delay drawing
 *    future notes.
 * - maybe make the notes a bit prettier?
 */

;
;


class PianoRoll {
  constructor({
    target = 'Canvas',
    numBeats = 8,
    height = 1,
    color = "#fff",
    backgroundColor = "#1b1c1e",

    // practical defaults
    pxPerBeat = 20,
    subdivPerBeat = 1,   // 4 = 16ths, 8 = 32nds, etc.
    noteMin = -7,        // C2
    noteMax = 7         // C6
  } = {}) {
    this.numBeats = numBeats;
    this.beat = 0
    this.height = height*200;
    this.color = color;
    this.backgroundColor = backgroundColor;

    this.pxPerBeat = pxPerBeat;
    this.subdivPerBeat = subdivPerBeat;
    this.noteMin = noteMin;
    this.noteMax = noteMax;

    this.events = [];

    const container = document.getElementById(target);
    this.containerDiv = document.createElement("div");
    container.appendChild(this.containerDiv);

	this.canvas = document.createElement("canvas");
  this.cursorCanvas = document.createElement("canvas");
  this.gridCanvas = document.createElement("canvas");
	this.ctx = this.canvas.getContext("2d");
  this.cursorCtx = this.cursorCanvas.getContext("2d");
  this.gridCtx = this.gridCanvas.getContext("2d");

  this.containerDiv.style.position = "relative";

  Object.assign(this.canvas.style, {
    position: "absolute", left: "0", top: "0", width: "100%", height: "100%", display: "block",
  });
  Object.assign(this.cursorCanvas.style, {
    position: "absolute", left: "0", top: "0", width: "100%", height: "100%", display: "block",
    pointerEvents: "none",
  });
  Object.assign(this.gridCanvas.style, {
    position: "absolute", left: "0", top: "0", width: "100%", height: "100%", display: "block",
    pointerEvents: "none",
  });

	this.containerDiv.appendChild(this.canvas);
  this.containerDiv.appendChild(this.cursorCanvas);
  this.containerDiv.appendChild(this.gridCanvas);

    this.canvas.style.display = "block";
    this.canvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.canvas.style.height = `${this.height}px`;

    this.cursorCanvas.style.display = "block";
    this.cursorCanvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.cursorCanvas.style.height = `${this.height}px`;

    this.gridCanvas.style.display = "block";
    this.gridCanvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.gridCanvas.style.height = `${this.height}px`;
    
    // set backing resolution
    this._resizeBackingStore();

    this.makeLoop()

    this._ro = new ResizeObserver(() => {
      this._resizeBackingStore();
      //this.redrawBase();
      //this.redrawCursor();
    });
    this._ro.observe(this.containerDiv);
  }

  setConfig({
    numBeats = this.numBeats,
    height = this.height,
    color = this.color,
    backgroundColor = this.backgroundColor
  } = {}) {
    this.numBeats = numBeats;
    this.height = height<10 ? height*200 : this.height;
    this.color = color;
    this.backgroundColor = backgroundColor;

    this.containerDiv.appendChild(this.canvas);
    this.containerDiv.appendChild(this.cursorCanvas);
    this.containerDiv.appendChild(this.gridCanvas);

    this.canvas.style.display = "block";
    this.canvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.canvas.style.height = `${this.height}px`;

    this.cursorCanvas.style.display = "block";
    this.cursorCanvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.cursorCanvas.style.height = `${this.height}px`;

    this.gridCanvas.style.display = "block";
    this.gridCanvas.style.width = `${this.numBeats * this.pxPerBeat}px`;
    this.gridCanvas.style.height = `${this.height}px`;

    // set backing resolution
    this._resizeBackingStore();
  }

  makeLoop(){
  	this.loop = new Tone.Loop(()=>{
  		this.beat = (Theory.ticks/Tone.Time('4n').toTicks())
  		let nextBeat = (this.beat + 1/4 + 1) % this.numBeats;
      //console.log('next', nextBeat)
      nextBeat = Math.floor(nextBeat*4)/4
      //setTimeout(()=>this.clear(nextBeat), 25);
      this.clear(nextBeat)
      this.render(nextBeat)
  	},'16n').start()

    this.cursorLoop = new Tone.Loop(()=>{
      this.renderCursor()
    },'16n').start()
  }

  setBeatColor(r = 255, g = 255, b = 255) {
	  this.color =
	    "#" +
	    [r, g, b]
	      .map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
	      .join("");
	}

  place(note, subdivision, duration=.5, velocity = 127, color = '#fff') {
    // note: MIDI number
    // subdivision: position in "subdivisions" from start of window (0..numBeats*subdivPerBeat)
    // duration: in subdivisions
    // velocity: 0..1 (used for alpha)
    //console.log(note, subdivision, duration, velocity)
    //console.log(note, subdivision)
  	subdivision = subdivision % this.numBeats
  	
  	if(note === '.') return

    let events = []
    events.push({
      note,
      subdivision,
      duration: Math.max(0, duration),
      velocity: Math.max(0, Math.min(1, velocity/127)),
      color
    });
    this.events.push({
      note,
      subdivision,
      duration: Math.max(0, duration),
      velocity: Math.max(0, Math.min(1, velocity/127)),
      color
    });

    // const ctx = this.ctx;
    // let w = this.cssW
    // const h = this.cssH

    // // notes
    // ctx.globalAlpha = 1;
    // const noteSpan = Math.max(1, this.noteMax - this.noteMin + 1);
    // const rowH = h / noteSpan;
    // const pxPerSub = (this.pxPerBeat / this.subdivPerBeat) 


    for (const e of events) {
      this.renderEvent(e)
      // if (e.duration <= 0) continue;

      // const x = e.subdivision * pxPerSub;
      // const width = e.duration * pxPerSub;

      // if (x > w || x + width < 0) continue;

      // const noteClamped = Math.max(this.noteMin, Math.min(this.noteMax, e.note));
      // const yIndex = (this.noteMax - noteClamped); // high notes at top
      // const y = yIndex * rowH;
      // const h = rowH
      // w = width
      // const xx = x;
      // const yy = y + 1;

      // ctx.globalAlpha = 0.2 + 0.8 * e.velocity;
      // //ctx.fillStyle = e.color;
      // ctx.lineWidth = 1 ;
      // ctx.strokeStyle = "rgba(0,0,0,0.5)";

      // ctx.globalAlpha = 1;

      //   //e.color = {h:0, s:0, v:0.75}
      //   const sat = e.color.s * (0.3 + 0.7 * e.velocity);
      //   const light = 30 + 40 * e.color.v;              // stable brightness

      //   ctx.globalAlpha = 1;
      //   ctx.fillStyle = `hsl(${e.color.h}, ${sat * 100}%, ${light}%)`;
      //   //console.log('hsv', e.color.h, sat * 100, light)
      //   if (ctx.roundRect) {
      //     const r = Math.min(2, h / 2, w / 2);
      //     ctx.beginPath();
      //     ctx.roundRect(xx, yy, w, h, r);
      //     ctx.fill();
      //     ctx.stroke();
      //   } else {
      //     ctx.fillRect(xx, yy, w, h);
      //     ctx.strokeRect(xx + 0.5, yy + 0.5, w - 1, h - 1);
      //   }
    }

    //this.render();
  }

  renderEvent(e){
    const ctx = this.ctx;
    let w = this.cssW
    let h = this.cssH

    // notes
    ctx.globalAlpha = 1;
    const noteSpan = Math.max(1, this.noteMax - this.noteMin + 1);
    const rowH = h / noteSpan;
    const pxPerSub = (this.pxPerBeat / this.subdivPerBeat) 

    if (e.duration <= 0) return;

      const x = e.subdivision * pxPerSub;
      const width = e.duration * pxPerSub;

      if (x > w || x + width < 0) return;

      const noteClamped = Math.max(this.noteMin, Math.min(this.noteMax, e.note));
      const yIndex = (this.noteMax - noteClamped); // high notes at top
      const y = yIndex * rowH;
      h = rowH
      w = width
      const xx = x;
      const yy = y + 1;

      ctx.globalAlpha = 0.2 + 0.8 * e.velocity;
      //ctx.fillStyle = e.color;
      ctx.lineWidth = 1 ;
      ctx.strokeStyle = "rgba(0,0,0,0.5)";

      ctx.globalAlpha = 1;

        //e.color = {h:0, s:0, v:0.75}
        let sat = e.color.s * (0.1 + 0.9 * Math.pow(e.velocity,2));
        let light = 30 + 40 * e.color.v;              // stable brightness

        if( e.color.s < 0.1) light = light * (0.3 + 0.7 * e.velocity);
        ctx.globalAlpha = 1;
        ctx.fillStyle = `hsl(${e.color.h}, ${sat * 100}%, ${light}%)`;
        //console.log('hsv', e.color.h, sat * 100, light)
        if (ctx.roundRect) {
          const r = Math.min(2, h / 2, w / 2);
          ctx.beginPath();
          ctx.roundRect(xx, yy, w, h, r);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(xx, yy, w, h);
          ctx.strokeRect(xx + 0.5, yy + 0.5, w - 1, h - 1);
        }
    

  }

	advanceToBeat(currentBeat) {
	  const nextBeat = (currentBeat + 1) % this.numBeats;
	  this.clear(nextBeat);
	  //console.log('beat', currentBeat, nextBeat)
	}

  clear(beatNumber = null) {
    if (beatNumber === null) {
      this.events.length = 0;
      //this.render();
      return;
    }

    const startSub = (beatNumber) ;
    const endSub = (beatNumber + 1/4 ) ;
    //console.log('sub', startSub, endSub)

    this.events = this.events.filter(e => {
      const eStart = e.subdivision;
      const eEnd = e.subdivision + e.duration;
      // keep events that do NOT intersect that beat
      return (eEnd <= startSub) || (eStart >= endSub);
    });

    //this.render();
  }

  render(nextBeat) {
    const ctx = this.ctx;
    const w = this.cssW
    const h = this.cssH

    // background
    ctx.globalAlpha = 1;

    const start = nextBeat % this.numBeats * this.pxPerBeat 
    const width = this.pxPerBeat/4

    //console.log(nextBeat, start, width)

    // If you want to “erase” to backgroundColor:
    ctx.fillStyle = this.backgroundColor;   // '#000' if black
    ctx.fillRect(start, 0, width, h);
    //ctx.fillRect(0, 0, w, h);

    // // notes drawn in place()

  }

  renderCursor() {
    const ctx = this.cursorCtx;
    const dpr = window.devicePixelRatio || 1;

    // clear the entire cursor backing store, regardless of transforms
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);
    ctx.restore();

    // draw in CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const h = this.cssH;
    const curStep = Math.floor(Theory.ticks / Tone.Time("16n").toTicks());

    const stepW = this.pxPerBeat / 4; // 16ths
    const x = (curStep % (this.numBeats * 4)) * stepW;

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#770";
    ctx.fillRect(Math.round(x), 0, Math.round(stepW), h);
  }

  renderGrid() {
    const ctx = this.gridCtx;
    const dpr = window.devicePixelRatio || 1;

    const w = this.cssW;
    let h = this.cssH;
    // ctx.globalAlpha = 1;
    // ctx.fillStyle = this.backgroundColor;
    // ctx.fillRect(0, 0, this.cssW, this.cssH);

    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    

    h = this.cssH;
    const subMultiplier = 2
    const totalSubs = subMultiplier * this.numBeats * this.subdivPerBeat;
    const pxPerSub = this.pxPerBeat / this.subdivPerBeat / subMultiplier;

    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#fff";
    for (let b = 0; b <= this.numBeats; b++) ctx.fillRect(Math.round(b * this.pxPerBeat), 0, 1, h);

    ctx.globalAlpha = 0.05;
    for (let s = 0; s <= totalSubs; s++) ctx.fillRect(Math.round(s * pxPerSub), 0, 1, h);
  }

  //only when needing to redraw everything
  renderNotes(){
    const ctx = this.ctx;
    //ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (const e of this.events) {
      this.renderEvent(e)
    }
  }

  _resizeBackingStore() {
    const dpr = this._dpr();

    const rect = this.containerDiv.getBoundingClientRect();
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, this.height); // or use this.height if you want fixed height
    this.cssW = cssW
    this.cssH = cssH

    this.containerDiv.style.position = "relative";

    for (const [el, z] of [
      [this.gridCanvas, 1],
      [this.canvas, 0],       // notes
      [this.cursorCanvas, 2],
    ]) {
      el.style.position = "absolute";
      el.style.left = "0";
      el.style.top = "0";
      el.style.display = "block";
      el.style.zIndex = String(z);
      el.style.pointerEvents = "none"; // optional
    }

    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.cursorCanvas.width = Math.floor(cssW * dpr);
    this.cursorCanvas.height = Math.floor(cssH * dpr);
    this.gridCanvas.width = Math.floor(cssW * dpr);
    this.gridCanvas.height = Math.floor(cssH * dpr);

    // now pxPerBeat should be CSS pixels per beat (not derived from canvas.width)
    this.pxPerBeat = cssW / this.numBeats;


    for (const c of [this.canvas, this.cursorCanvas, this.gridCanvas]) {
      c.style.width = `${cssW}px`;
      c.style.height = `${cssH}px`;
      c.width  = Math.round(cssW * dpr);
      c.height = Math.round(cssH * dpr);
    }

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cursorCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.gridCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.renderGrid()

    const ctx = this.ctx;

    const w = this.cssW;
    let h = this.cssH;
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    this.enableRangeDrag()
 }

  _dpr() {
    return window.devicePixelRatio || 1;
  }

  //CLICK & DRAG
  // Call once after canvases are created + appended
  enableRangeDrag() {
    const el = this.cursorCanvas; // top layer receives input
    el.style.pointerEvents = "auto";

    this._drag = {
      active: false,
      startY: 0,
      startMin: this.noteMin,
      startMax: this.noteMax,
    };

    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      this._drag.active = true;
      this._drag.startY = e.clientY;
      this._drag.startMin = this.noteMin;
      this._drag.startMax = this.noteMax;
    });

    el.addEventListener("pointermove", (e) => {
      if (!this._drag.active) return;

      let dy = e.clientY - this._drag.startY;
      dy = -dy
      const span = this._drag.startMax - this._drag.startMin;
      const pxPerNote = this.cssH / (span + 1);

      // drag up => higher notes (increase min/max)
      const deltaNotes = Math.round(-dy / pxPerNote);

      this.setNoteRange(this._drag.startMin + deltaNotes, this._drag.startMax + deltaNotes);
    });

    el.addEventListener("pointerup", () => { this._drag.active = false; });
    el.addEventListener("pointercancel", () => { this._drag.active = false; });
  }

  setNoteRange(min, max) {
    const span = this.noteMax - this.noteMin; // preserve current span

    // If caller passes both, keep them; otherwise keep span.
    if (max == null) max = min + span;

    // clamp + preserve span
    min = Math.max(-36, Math.min(127 - span, min));
    max = min + span;

    this.noteMin = min;
    this.noteMax = max;

    // grid depends on row height, so redraw it too
    this.renderGrid();
    this.render();       // whatever you use to redraw notes layer
    this.renderCursor();
    this.renderNotes()
  }
}

// Seq.js
//current sequencer module feb 2025

;
;
;

;
;
;

class Seq {
     constructor(synth, arr = [0], subdivision = '8n', phraseLength = 'infinite', num = 0, callback = null) {
        this.synth = synth; // Reference to the synthesizer
        this.vals = Array.isArray(arr) ? arr : parsePitchStringSequence(arr);
        //parameters
        this._subdivision = synth._subdivision; // Local alias
        this._octave = synth._octave;                // Local alias
        this._duration = synth._duration;             // Local alias
        this._roll = synth._roll;               // Local alias
        this._velocity = synth._velocity;            // Local alias
        this._orn = synth._orn;            // Local alias
        this._lag = synth._lag;            // Local alias
        this._pedal = synth._pedal;
        this._rotate = synth._rotate;   //actual permanent rotate amount, about the thoery.tick
        this._offset = synth._offset;   //internal variable for calculating rotation specifically for play
        this._transform = synth._transform;      // Local alias
        this._orn = synth._orn
        this.pianoRoll = synth._pianoRoll
        //internal variables
        this.phraseLength = phraseLength === 'infinite' ? 'infinite' : phraseLength * this.vals.length;
        this.enable = 1;
        this.min = 24;
        this.max = 127;
        this.loopInstance = null;
        this.num = num;
        this.callback = callback;
        this.parent = null;
        this.index = 0;
        this.nextBeat = '.'
        this.prevVals = Array.isArray(arr) ? arr : parsePitchStringSequence(arr); //for gui tracking
        this.guiElements = {}
        this.guiElements["knobs"]=[]
        this.guiElements["toggles"]=[]
        this.userCallback = null
        this.drawing = null
        
        this.events = new Array(8)
        this.color = '#fff'

        //(note, pattern=1, scalar=1, length=4)
        this.ornaments = [
            [1,1,1],
            [2,2,2],
            [1,2,3],
            [2,1,2],
            [1,1,8],
            [1,2,4],
            [2,1,4],
            [4,1,4]
        ]

        this.createLoop();
    }

    get subdivision() { return this._subdivision;}
    set subdivision(val) {
        this._subdivision = val;
        this.setSubdivision(val); // Update loop timing if needed
    }
    get octave() {return this._octave; }
    set octave(val) {this._octave = val; }
    get duration() {return this._duration;}
    set duration(val) {  this._duration = val; }
    get roll() {  return this._roll; }
    set roll(val) {    this._roll = val; }
    get velocity() { return this._velocity; }
    set velocity(val) {  this._velocity = val; }
    get orn() { return this._orn; }
    set orn(val) {  this._orn = val; }
    get lag() { return this._lag; }
    set lag(val) {  this._lag = val; }
    get rotate() { return this._rotate; }
    set rotate(val) {  this._rotate = val; }
    get offset() { return this._offset;}
    set offset(val) {this._offset = val}
    get transform() {  return this._transform;}
    set transform(val) {
        if (typeof val !== 'function') {
            throw new TypeError('Transform must be a function');
        }
        this._transform = val;
    }

    //pedaling
    pedal(state = "full"){
        this._pedal = state
    }
    star(){
        this.synth.releaseAll()
    }
    clearPedal(){ 
        this._pedal = "off"
        this.star()
    }
    lift(){ this.clearPedal() }


    sequence(arr, subdivision = '8n', phraseLength = 'infinite') {
        this.vals = Array.isArray(arr) ? arr : parsePitchStringSequence(arr);
        //console.log('vals', this.vals)
        this.prevVals = Array.isArray(arr) ? arr : parsePitchStringSequence(arr);
        if(phraseLength !== 'infinite') this.phraseLength = phraseLength * this.vals.length;
        else this.phraseLength = phraseLength
        this.subdivision = subdivision;

        this.createLoop();
        //this.start()
        this.updateGui()
    }

    updateGui(){
        this.prevVals = [...this.vals];
        for(let i = 0; i<this.guiElements["knobs"].length; i++){
            if(i<this.vals.length){
                if(this.vals[i]=='.' && this.guiElements["toggles"].length > i){
                    this.guiElements["toggles"][i].forceSet(0);
                }else{
                    if(!isNaN(Number(this.vals[i]))){
                        this.guiElements["knobs"][i].forceSet( Number(this.vals[i]) )
                        // console.log("setting knob", this.guiElements["knobs"][i], "to", this.vals[i])
                    }
                    if(this.guiElements["toggles"].length > i){
                        this.guiElements["toggles"][i].forceSet(1);
                    }
                }
            }
        }
    }

    drumSequence(arr, subdivision = '8n', phraseLength = 'infinite') {
        this.vals = Array.isArray(arr) ? arr : parseStringSequence(arr);
        if(phraseLength !== 'infinite') this.phraseLength = phraseLength * this.vals.length;
        else this.phraseLength = phraseLength
        this.subdivision = subdivision;

        this.start()   
    }

    createLoop() {
        // Create a Tone.Loop
        if (this.loopInstance) {
            //this.loopInstance.stop();
            this.loopInstance.dispose();  // or .cancel() + .dispose()
        }    
        //console.log('createLoop', this.subdivision)
        this.loopInstance = new Tone.Loop(time => {
            //console.log('loop', time)
            
            this.index = Math.floor(Theory.ticks / Tone.Time(this.subdivision).toTicks());
            this.rawIndex = this.index
            this.index = (this.index + this._rotate) % this.vals.length//ask ian if he wants offset to only be implemented for play with limited amount of loops, or as an infinite variable
            // console.log('ind ', this.index)
            if(this._offset !== null){//this makes offset an inperminent variable exceptfor infinite case
                console.log(this._offset)
                this.index = this._offset % this.vals.length                 
                this._offset += 1
                if (this.phraseLength !== 'infinite' && this.offset >= this.vals.length*this.phraseLength)
                    {this._offset = null}
            }
            if (this.enable === 0) return;
            let curBeat = this.vals[this.index];
            if (curBeat == undefined) curBeat = '.'

            curBeat = this.checkForRandomElement(curBeat);

            let event = parsePitchStringBeat(curBeat, time);
            //console.log('1', event)
            event = this.applyOrnamentation(event)
            event = event.map(([x, y]) => [this.perform_transform(x), y])
            console.log(event)
            // Roll chords
            const event_timings = event.map(subarray => subarray[1]);
            let roll = this.getNoteParam(this.roll, this.index);
            roll = roll * Tone.Time(this.subdivision)
            for (let i = 1; i < event.length; i++) {
                if (event_timings[i] === event_timings[i - 1]) event[i][1] = event[i - 1][1] + roll;
            }

            //main callback for triggering notes
            //console.log(event, time, this.index, this.num)
            //if( this._pedal === "legato" ) this.synth.releaseAll()
            for (const val of event) this.synth.parseNoteString(val, time, this.index, this.num);
            //console.log('loop', time, event, this.callback)
            if(this.userCallback){
                this.userCallback();
            }

            if(this.drawing){
                this.updateDrawing(curBeat, time, this.index, this.num);
            }
            if(this.pianoRoll){
                for (const val of event){
                    this.updatePianoRoll(val,time,this.index,this.num)
                }
            }

            //check for sequencing params
            // try{
            // for(params in this.synth.param){
            //     if(Array.isArray(params)) this.synth.setValueAtTime
            // }}
            //console.log('len ', this.phraseLength)
            if (this.phraseLength === 'infinite') return;
            this.phraseLength -= 1;
            if (this.phraseLength < 1) this.stop();
        }, this.subdivision).start(0);

        this.setSubdivision(this.subdivision);

        Tone.Transport.start();
    }

    //new: ornaments are arrays of modifiers to be applied
    //to every element of a sequence.
    applyOrnamentation(event) {
        if (typeof event === 'string') return event; // e.g., '.' or 'r'
        //console.log(event)

        //check if there is an array of ornaments
        let ornIndex;
        if (Array.isArray(this._orn[0])) {
            ornIndex = this._orn[this.index % this._orn.length];
        } else {
            ornIndex = 0;
        }

        // Ensure index is valid
        const ornament = this.ornaments[ornIndex % this.ornaments.length];
        if (!ornament) return event;

        let [pattern, scalar, length] = ornament;

        const ornamentedEvent = [];

        const uniqueTimeSteps = [...new Set(event.map(e => e[1]))];
        const numSourceNotes = uniqueTimeSteps.length;
        const noteSpacing = 1 / length;

        for (let [pitch, t] of event) {
            if (pitch === '.' || !(typeof pitch === 'number' || /^-?\d+$/.test(pitch))) {
                ornamentedEvent.push([pitch, t]);
                //console.log('orn',pitch)
            } else {
                // Apply ornament
                const ornNotes = this._orn;
                const ornLength = ornNotes.length

                ornNotes.forEach((ornPitch, i) => {
                    const ornEvent = typeof ornPitch === 'number' ? Number(pitch)+ornPitch : ornPitch 

                    const timeOffset = i / ornLength / numSourceNotes;
                    ornamentedEvent.push([ornEvent, t + timeOffset]);
                    
                });
            }
        }
        //console.log(ornamentedEvent)
        return ornamentedEvent;
    }

    // applyOrnamentation(event) {
    //     if (typeof event === 'string') return event; // e.g., '.' or 'r'
    //     //console.log(event)
    //     let ornIndex;
    //     if (Array.isArray(this._orn)) {
    //         ornIndex = this._orn[this.index % this._orn.length];
    //     } else {
    //         ornIndex = this._orn;
    //     }

    //     // Ensure index is valid
    //     const ornament = this.ornaments[ornIndex % this.ornaments.length];
    //     if (!ornament) return event;

    //     let [pattern, scalar, length] = ornament;

    //     const ornamentedEvent = [];

    //     const uniqueTimeSteps = [...new Set(event.map(e => e[1]))];
    //     const numSourceNotes = uniqueTimeSteps.length;
    //     const noteSpacing = 1 / length;

    //     for (let [pitch, t] of event) {
    //         if (pitch === '.' || !(typeof pitch === 'number' || /^-?\d+$/.test(pitch))) {
    //             ornamentedEvent.push([pitch, t]);
    //             //console.log('orn',pitch)
    //         } else {
    //             // Apply ornament
    //             const ornNotes = orn(pitch, pattern, scalar, length);

    //             ornNotes.forEach((ornPitch, i) => {
    //                 if (ornPitch !== '.') {
    //                     const timeOffset = (i * noteSpacing) / numSourceNotes;
    //                     ornamentedEvent.push([ornPitch, t + timeOffset]);
    //                 }
    //             });
    //         }
    //     }

    //     return ornamentedEvent;
    // }

    checkForRandomElement(curBeat) {
        if (typeof curBeat === 'number') {
            return curBeat;
        }

        if (typeof curBeat === 'string' && curBeat.includes('?')) {
            let validElements = [];

            this.vals.forEach(item => {
                if (typeof item === 'string') {
                    const letterPattern = /[#b]?[A-Ga-g]/g;
                    const symbolPattern = /[oOxX\*\^]/g;
                    const numberPattern = /(-?\d+)/g;
                    const symbolNumberPattern = /([oOxX\*\^])\s*(1|2|3)/g;

                    let letterMatches = item.match(letterPattern);
                    if (letterMatches) {
                        validElements.push(...letterMatches);
                    }

                    let symbolMatches = item.match(symbolPattern);
                    if (symbolMatches) {
                        validElements.push(...symbolMatches);

                        let symbolNumberMatches = item.match(symbolNumberPattern);
                        if (symbolNumberMatches) {
                            symbolNumberMatches.forEach(match => {
                                const [symbol, number] = match.split(/\s*/);
                                validElements.push(number);
                            });
                        }
                    }

                    let otherNumbers = item.match(numberPattern);
                    if (otherNumbers) {
                        validElements.push(...otherNumbers);
                    }
                }
            });

            function getRandomElement() {
                return validElements[Math.floor(Math.random() * validElements.length)];
            }

            curBeat = curBeat.replace(/\?/g, () => getRandomElement());
        }

        return curBeat;
    }

    getNoteParam(val, index) {
        if (Array.isArray(val)) return val[index % val.length];
        else return val;
    }

    setNoteParam(val, arr) {
        for (let i = 0; i < arr.length; i++) arr[i] = val;
        return arr;
    }

    start() {
        this.enable = 1;
        //this.phraseLength = 'infinite'
        //if (this.loopInstance) this.loopInstance.start(0);
    }

    stop() {
        this.enable = 0;
        this.synth.releaseAll()
        //if (this.loopInstance) this.loopInstance.stop();
    }

    play(num=this.vals.length){// is this being used?
        this.phraseLength = num
        this.enable = 1;
        //if (this.loopInstance) this.loopInstance.start();
    }

    expr(func, len = 32, subdivision = '16n') {
        this.createExpr(func, len, subdivision)
        return
        const arr = Array.from({ length: len }, (_, i) => {
            return func(i);
        });

        this.vals = arr.map(element => {
            return typeof element === 'string' ? element : Array.isArray(element) ? JSON.stringify(element) : element;
        });
        this.updateGui()

        this.phraseLength = 'infinite';
        this.sequence(this.vals, subdivision);
    }

    euclid(hits, beats, rotate){
        //console.log('euclid', hits, beats, rotate)
        let pattern = [];
        let bucket = 0;

      for (let i = 0; i < beats; i++) {
        bucket += hits;
        if (bucket >= beats) {
          bucket -= beats;
          pattern.push(1); // play a hit
        } else {
          pattern.push(0); // rest
        }
      }
      const valLength = this.vals.length
      for(let i = valLength; i<pattern.length;i++){
        this.vals.push(this.vals[i%valLength])
      }
      
      pattern = pattern.rotate(-1+rotate)
      //console.log(pattern, this.vals)
      for(let i=0;i<this.vals.length;i++){
        if(pattern[i%pattern.length] == 0)this.vals[i] = '.'
      }
    }

    //createExpr calculates the expression one beat at a time
    createExpr(func, len=32, subdivision = '16n') {
        // Create a Tone.Loop
        const log = false
        this.calcNextBeat(func, len, log)
        this.subdivision = subdivision
        if (this.loopInstance) {
            //this.loopInstance.stop();
            this.loopInstance.dispose();  // or .cancel() + .dispose()
        }        
        this.loopInstance = new Tone.Loop(time => {
            //console.log('loop', time)
            this.index = Math.floor(Theory.ticks / Tone.Time(this.subdivision).toTicks());
            this.rawIndex = Math.floor(Theory.ticks / Tone.Time(this.subdivision).toTicks());
            this.index = this.index % len
            //console.log('ind ', this.index)
            if (this.enable === 0) return;
            
            let event = parsePitchStringBeat(this.nextBeat, time);
            //console.log('1', event)
            event = this.applyOrnamentation(event)
            event = event.map(([x, y]) => [this.perform_transform(x), y])
            //console.log(event)
            // Roll chords
            const event_timings = event.map(subarray => subarray[1]);
            let roll = this.getNoteParam(this.roll, this.index);
            roll = roll * Tone.Time(this.subdivision)
            for (let i = 1; i < event.length; i++) {
                if (event_timings[i] === event_timings[i - 1]) event[i][1] = event[i - 1][1] + roll;
            }

            //main callback for triggering notes
            //console.log(event, time, this.index, this.num)
            for (const val of event) this.synth.parseNoteString(val, time, this.index, this.num);
            //console.log('loop', time, event, this.callback)
            if(this.userCallback){
                this.userCallback();
            }

            if(this.drawing){
                this.updateDrawing(event, time, this.index, this.num);
            }
            if(this.pianoRoll){
                for (const val of event){
                    this.updatePianoRoll(val,time,this.index,this.num)
                }
            }

            //check for sequencing params
            // try{
            // for(params in this.synth.param){
            //     if(Array.isArray(params)) this.synth.setValueAtTime
            // }}
            //console.log('len ', this.phraseLength)
            this.calcNextBeat(func, len, log)

            //if(this.drawing){
                this.updateDrawing(event, time, this.index, this.num);
            //}



            if (this.phraseLength === 'infinite') return;
            this.phraseLength -= 1;
            if (this.phraseLength < 1) this.stop();
        }, this.subdivision).start(0);

        this.setSubdivision(this.subdivision);

        Tone.Transport.start();
    }
    calcNextBeat(func, length, log){
        let i = (this.index + 1) % length
            let curBeat = func(i)

            //console.log(curBeat, i, func)
            //let curBeat = this.vals[this.index ];
            if (curBeat == undefined) curBeat = '.'

            curBeat = this.checkForRandomElement(curBeat);
            this.nextBeat = curBeat
            if(log) console.log(this.nextBeat)

    }

    setSubdivision(sub = '8n') {
        this._subdivision = sub;
        if (this.loopInstance) {
            this.loopInstance.interval = Tone.Time(this.subdivision);
        }
    }

    perform_transform(input) {

        if(typeof input === 'string') return this.transformString(input)
        
         // If it's a number or numeric string
        if (!isNaN(Number(input))) {
            return this.transform(Number(input));
        }
    }

    transformString(inputStr){
        if (typeof inputStr !== 'string') return '.';

        const isNote = str => /^[A-Ga-g][#b]?\d/.test(str);
        const isNumeric = str => !isNaN(Number(str));
        const isRest = str => str === '.' || str === 'x';
        
        // Recursive parser
        const parseTokens = (tokens) => {
            let result = [];
            while (tokens.length > 0) {
                const token = tokens.shift();

                if (token === '[') {
                    const nested = parseTokens(tokens);
                    result.push('[' + nested.join(' ') + ']');
                } else if (token === ']') {
                    break;
                } else if (isNote(token) || isRest(token)) {
                    result.push(token);
                } else if (isNumeric(token)) {
                    const val = this.transform(Number(token));
                    result.push(String(val));
                } else {
                    // fallback, unhandled token
                    result.push(token);
                }
            }

            return result;
        };

        // Tokenize by splitting on spaces while preserving brackets
        const tokens = inputStr.match(/\[|\]|\S+/g); // grabs [ ] or any non-space group
        if (!tokens) return inputStr;

        const transformedTokens = parseTokens(tokens);
        return transformedTokens.join(' ');
    }

    setTransform(func){
        this.transform = func;
    }
    dispose() {
        this.stop();
        if (this.loopInstance) {
            this.loopInstance.dispose();
        }
        this.parent = null;
        this.sequence = null;
        this.callback = null;
    }

    pushSeqState(){
        for(let i = 0; i<this.guiElements["knobs"].length; i++){
                this.guiElements["knobs"][i].ch.control(this.guiElements["knobs"][i].linkName, this.guiElements["knobs"][i].value)
                this.guiElements["toggles"][i].ch.control(this.guiElements["toggles"][i].linkName, this.guiElements["toggles"][i].value)
        }
    }

    setMinMax(min, max){
        for(let i = 0; i<this.guiElements["knobs"].length; i++){
                this.guiElements["knobs"][i].min = min;
                this.guiElements["knobs"][i].max = max;
        }
    }


        /**
         * Initialize the GUI
         * @returns {void}
         * 
         * TO USE: mySynth.seq[0].seqGui(3, 1, "linkName")
         * 
         * Can update link name with: mySynth.seq[0].changeGuiLink("newLink")
         * 
         * TODO: numRows doesn't work
         */
        seqGui(numSteps=8, chlink=null) {
            let guiContainer = document.getElementById('Canvas');
            const sketchWithSize = (p) => sketch(p, { height: 1 });
            let gui = new p5(sketchWithSize, guiContainer);
            this.guiElements["knobs"] = [];
            this.guiElements["toggles"] = [];
            let numRows = 1;
            
            for(let i = 0; i < numSteps; i++) {
                //if the sequencer already has a value, populate the knob with that
                let curval = 0;
                let stringVal = null
                //set value if it's a number
                if(i<this.vals.length){
                    curval = Number(this.vals[i]);
                    if(isNaN(curval)){
                        stringVal = this.vals[i];
                        curval = 0;
                    }
                }
                let knob = gui.Knob({ 
                    label: i+1,
                    min: -25,
                    max: 25,
                    value: curval,
                    x:Math.floor(100/(numSteps+1))*(i+1),
                    y:Math.floor(100/(numRows*2+1)*2),
                    callback: (value) => this.knobCallback(i, value)
                });
                this.guiElements["knobs"].push(knob);

                //add back correct non-number value to vals (has been changed because of callback)
                if(i<this.vals.length & stringVal!=null){
                    this.vals[i] = stringVal;
                }

                //console.log("before toggle", i, this.vals)
                let toggle = gui.Toggle({ 
                    label: i+1,
                    value: i<this.vals.length ? this.vals[i]!='.' : 1,
                    x:Math.floor(100/(numSteps+1))*(i+1),
                    y:Math.floor(100/(numRows*2+1)),
                    callback: (value) => this.toggleCallback(i, value)
                });
                //console.log("after toggle", i, this.vals)
                this.guiElements["toggles"].push(toggle);

                if(chlink != null){
                    console.log("chlink:", chlink)
                    try{
                        toggle.linkName = chlink+"toggle"+String(i);
                        toggle.ch.on(toggle.linkName, (incoming) => {
                            toggle.forceSet(incoming.values);
                        })
                        knob.linkName = chlink+"knob"+String(i);
                        knob.ch.on(knob.linkName, (incoming) => {
                            knob.forceSet(incoming.values);
                        })
                    }catch{
                        console.log("CollabHub link failed! Please call initCollab() first.")
                    }
                }
            }

            gui.setTheme(gui, 'dark' )
        }

    changeGuiLink(newLink){
        for(let i = 0; i<this.guiElements["knobs"].length; i++){
            this.guiElements["knobs"][i].linkName = newLink+"knob"+String(i)
            this.guiElements["knobs"][i].ch.on(this.guiElements["knobs"][i].linkName, (incoming) => {
                this.guiElements["knobs"][i].forceSet(incoming.values);
            })
            
            this.guiElements["toggles"][i].linkName = newLink+"toggle"+String(i)
            this.guiElements["toggles"][i].ch.on(this.guiElements["toggles"][i].linkName, (incoming) => {
                this.guiElements["toggles"][i].forceSet(incoming.values);
            })
        }
    }

    knobCallback(stepNum, val){
        if(this.vals[stepNum]!='.'){
            this.vals[stepNum] = Math.floor(val);
        }
        this.prevVals[stepNum] = val
    }

    toggleCallback(stepNum, val){
        if(val == 0){
            this.vals[stepNum] = '.'
        }else{
            this.vals[stepNum] = this.prevVals[stepNum];
        }
    }

    updateSeqGui(){}

    updateDrawing(val, time, index, num){
        const curBeat = Math.floor(Theory.ticks/Tone.Time('4n').toTicks())%8
        this.events[curBeat] = val
        let front = this.events.slice(0,curBeat).join(' ')
        if( front.length > 0 ) front = front + ' '
        const mid = this.events.slice(curBeat,curBeat+1).join(' ') + ' '
        const end = this.events.slice(curBeat+1,8).join(' ')

        if( this.drawing instanceof TextField){
            this.drawing.cursorPosition.line = 0
            this.drawing.cursorPosition.start = front.length
            this.drawing.cursorPosition.end = front.length+mid.length
            
            this.drawing.writeLine(0, front  + mid + end)
        }
    }

    updatePianoRoll(event,time,index,num){
        //test this.color for hex format
        let colorType = this.colorKind(this.color)
        if( colorType === 'css') {
            this.color = this.cssColorToHex(this.color)
            colorType = 'hex'
            //console.log('updated', this.color)
        }if( colorType === 'hex') {
            this.color = this.hexToRgb(this.color)
            colorType = 'rgb'
            //console.log('updated', this.color)
        }if( colorType === 'rgb') {
            this.color = this.rgbToHsv(this.color)
            colorType = 'hsv'
            //console.log('updated', this.color)
        }

        const globalBeat = Math.floor(Theory.ticks/Tone.Time('4n').toTicks())
        const curBeat = Tone.Time(this.subdivision)/Tone.Time('4n') 
        const note = Math.floor(event[0])
        const subDiv = event[1]
        const velocity = Array.isArray(this.velocity) ? this.velocity[this.index%this.velocity.length] : this.velocity
        const duration = Array.isArray(this.duration) ? this.duration[this.index%this.duration.length] : this.duration
        //console.log(event, this.rawIndex, (curBeat),index+subDiv)
        this.pianoRoll.place(note, curBeat*(this.rawIndex+subDiv), duration, velocity, this.color)
        //this.pianoRoll.advanceToBeat(globalBeat)
    }

    colorKind(c) {
      if (typeof c === "string") return (c[0] === "#") ? "hex" : "css";

      if (c && typeof c === "object") {
        const has = (k) => Object.prototype.hasOwnProperty.call(c, k);

        if (has("h") && has("s") && has("v")) return "hsv";
        if (has("r") && has("g") && has("b")) return "rgb";
      }

      return "unknown";
    }

    hexToRgb(hex) {
      hex = hex.replace("#", "");

      if (hex.length === 3) {
        hex = hex.split("").map(c => c + c).join("");
      }

      const num = parseInt(hex, 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    }

    rgbToHsv(color) {
      const r = color.r/255;
      const g =  color.g/255;
      const b = color.b/ 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;

      let h = 0;
      if (d !== 0) {
        switch (max) {
          case r: h = ((g - b) / d) % 6; break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h *= 60;
        if (h < 0) h += 360;
      }

      const s = max === 0 ? 0 : d / max;
      const v = max;

      return { h, s, v };
    }

    cssColorToHex(color) {
      const ctx = document.createElement("canvas").getContext("2d");

      // Let the browser parse the color
      ctx.fillStyle = color;
      const computed = ctx.fillStyle; // normalized string

      // Now it's either rgb(...) or #rrggbb
      if (computed.startsWith("#")) {
        // already hex
        if (computed.length === 4) {
          // expand #rgb → #rrggbb
          return "#" + [...computed.slice(1)].map(c => c + c).join("");
        }
        return computed;
      }

      // rgb(r, g, b) or rgba(r, g, b, a)
      const m = computed.match(/\d+/g);
      if (!m) return null;

      const [r, g, b] = m.map(Number);

      return (
        "#" +
        [r, g, b]
          .map(v => v.toString(16).padStart(2, "0"))
          .join("")
      );
    }

}

    

/*
*/

;


class Parameter {
  constructor(parent,options, gui = null, layout = basicLayout) {
    //console.log(options)
    this.parent = parent
    this.name = options.name || 'param'
    this.min = options.min || 0;
    this.max = options.max || 1;
    this.curve = options.curve || 1; // Curve for value scaling
    this.rawValue = Array.isArray(options.value) ? options.value 
        : this.unScaleValue(options.value || 0.5, 0, 1, this.min, this.max, this.curve); // Normalized to real
    this.normalizedValue = 0
    this.group = options.group || 'default'; // Group assignment
    this._value = Array.isArray(options.value) ? options.value
        : options.value !== undefined ? options.value
        : this.scaleValue(0.5, 0, 1, this.min, this.max, this.curve);
    this.callback = options.callback || function () {};
    this.control = null; // GUI control
    this.gui = gui; // GUI framework
    this.layout = layout || basicLayout; // Layout info
    this.type = options.type || 'vcf'
    this.radioOptions = options.radioOptions || null; // Store available options for radioBox
    this.guiElements = []; // Store references to GUI elements for array values
    this.labels = options.labels || null;
    this.seq = null
    this.set(this._value)
    this.subdivision = '4n'
    //mapping
    this.sourceContributions = new Map();  // source → value
    this.sources = [];  // [{ source, handler }]
  };

  get(index = null) {
    if (Array.isArray(this._value)) {
        return index !== null ? this._value[index] : this._value;
    }
    return this._value;
  }
  set =  (newValue, index = null, calledByGui=false, time = null) => {
    //console.log('paramset', this._value, this.name, newValue, index, calledByGui,time)
    if (Array.isArray(this._value)) {
        if (Array.isArray(newValue)) {
            // Set entire array
            this._value = [...newValue];
            //this.callback(newValue, time);
            //newValue.forEach((val, i) => this.callback(val,  time));
        } else if (index !== null) {
            // Set specific index
            this._value[index] = newValue;
            this.callback(newValue, time);
        } else {
            // Fill array with single value
            this._value.fill(newValue);
            this._value.forEach((val, i) => this.callback(val, time));
        }
    } else {
        // Scalar value
        this._value = newValue;
        //console.log(this.callback)
        this.callback(newValue, time);
    }

    // Update GUI if attached
    // Update GUI elements
    if(calledByGui==false && this.type !== 'hidden'){
      if (Array.isArray(this._value)) {
          this.guiElements.forEach((gui, i) => gui.ccSet(this._value[i]));
      } else if (this.guiElements.length > 0) {
          this.guiElements[0].ccSet (this._value);
      }
    }
  }
  
  //define sequencer controls
    sequence(valueArray,subdivision){
        //console.log('p', subdivision)
        if (this.seq) {
            this.seq.dispose(); // Dispose of existing sequence
        }
        this.seq = new Seq(
            this,
            valueArray,
            subdivision,
            'infinite',
            0,
            ((v, time) => {
                //console.log(v,time)
                this.parent.param[this.name].set(Number(v[0]),null,false, time)}).bind(this)
            // Ensure time is passed
        );
    }
    stop(){
        if (this.seq) {
            this.seq.dispose();
            this.seq = null;
        }
    }

  // Attach a GUI control to this parameter
  attachControl(control) {
    this.control = control;
    control.onChange = (newValue) => {
      this.value = newValue; // Update the parameter when the control changes
    };
  }

  createGui() {
        const { x, y, width, height } = this.layout;
        const groupColor = this.getGroupColor(this.group);

        this.control = this.gui.Knob({
            label: this.name,
            min: this.min,
            max: this.max,
            size: width,
            x:x,
            y:y,
            accentColor: groupColor,
            callback: (value) => this.set(value),
        });

        // Sync initial value
        this.control.setValue(this.get());
    }

    //parameter mapping function
    from(source, {
      transform = null,
      smoothing = 0,
      index = null,
      priority = 0,
    } = {}) {
      let prev = null;

      // Resolve transform only once
      if (!transform) {
        transform = (val) => this.scaleValue(val, 0, 127, this.min, this.max, this.curve);
      }
      this.transform = transform

      const handler = (val) => {
          const v = (val) 
          if (smoothing > 0) {
            v = prev == null ? v : prev + smoothing * (v - prev);
            prev = v;
          }

          this.sourceContributions.set(source, v);
          this.updateFromSources(index);
        };

      source.connect(handler);
      this.sources.push({ source, handler });
    }

    updateFromSources(index = null) {
      const sum = Array.from(this.sourceContributions.values())
        .reduce((a, b) => a + b, 0);

        const val = this.transform(sum)
      // Clamp to parameter's min/max
      //const clamped = Math.max(this.min, Math.min(this.max, sum));
      this.set(val, index, false);
    }

    getGroupColor(group) {
        const colors = {
            vco: [200, 0, 0],
            vcf: [0, 200, 0],
            env: [0, 0, 200],
            default: [100, 100, 100],
        };
        return colors[group] || colors.default;
    }

  /**
   * Set the parameter value in real-world units (e.g., hertz or amplitude).
   * @param {number} realValue - The real-world value of the parameter.
   */
  setRealValue(realValue) {
    this.value = realValue;
    this.rawValue = this.unScaleValue(realValue, this.min, this.max, 0, 1, this.curve);
  }

  /**
   * Get the parameter value in real-world units (e.g., hertz or amplitude).
   * @returns {number} - The real-world value of the parameter.
   */
  getRealValue() {
    return this.value;
  }

  /**
   * Set the parameter value in normalized units (0-1).
   * @param {number} normalizedValue - The normalized value (0-1).
   */
  setNormalizedValue(normalizedValue) {
    this.rawValue = normalizedValue;
    this.value = this.scaleValue(normalizedValue, 0, 1, this.min, this.max, this.curve);
  }

  /**
   * Get the parameter value in normalized units (0-1).
   * @returns {number} - The normalized value (0-1).
   */
  getNormalizedValue() {
    return this.rawValue;
  }

  /**
   * Scale a normalized value (0-1) to a real-world value based on min, max, and curve.
   * @param {number} value - The normalized value (0-1).
   * @param {number} min - The minimum real-world value.
   * @param {number} max - The maximum real-world value.
   * @param {number} curve - The curve factor to adjust scaling.
   * @returns {number} - The scaled real-world value.
   */
  scaleValue(value, min, max, realMin, realMax, curve) {
      // Normalize value to 0–1 using min/max
      const norm = (value - min) / (max - min);
      // Clamp to 0–1 so out-of-range input doesn't explode
      //const clamped = Math.max(0, Math.min(1, norm));
      // Apply curve and scale to realMin–realMax
      return realMin + Math.pow(norm, curve) * (realMax - realMin);
    }

  /**
   * Convert a real-world value back into a normalized value (0-1) based on min, max, and curve.
   * @param {number} value - The real-world value.
   * @param {number} min - The minimum real-world value.
   * @param {number} max - The maximum real-world value.
   * @param {number} curve - The curve factor to adjust scaling.
   * @returns {number} - The normalized value (0-1).
   */
  unScaleValue(value, realMin, realMax, min, max, curve) {
    return Math.pow((value - realMin) / (realMax - realMin), 1 / curve);
  }
}


//this file may not be used
//nexusElement is also defined in parentNexus
;
;

class NexusElement{
    constructor(element_type, x = 0, y = 0, width = 100, height = 100) {
        this.element_type = element_type;

        // Initialize the Nexus element
        // Access Nexus object provided by module import
        if (!Nexus || !Nexus[this.element_type]) {
            console.error(`NexusUI interface "${this.element_type}" is not available.`);
            return;
        }

        this.element = new Nexus[this.element_type]("#nexus", {
            size: [width, height]
        });
        
        // Set positioning style for the element
        this.element.element.style.position = 'absolute';

        this.xPercent = x / window.innerWidth;
        this.yPercent = y / window.innerHeight;
        this.widthPercent = width / window.innerWidth;
        this.heightPercent = height / window.innerHeight;

        this.updatePositionAndSize();
        //window.addEventListener("resize", () => this.updatePositionAndSize());
    }

    mapTo(callback){
        if (!this.element) {
            return;
        }

        this.element.on("change", callback)
        //callback must be written as (element_output) => {function}
    }

    updatePositionAndSize() {
        if (!this.element) {
            return;
        }

        // Update pixel values based on percentages and current window size
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

        this.element.element.style.left = this.xPercent * newWidth + "px";
        this.element.element.style.top = this.yPercent * newHeight + "px";
        this.element.resize(
            this.widthPercent * newWidth,
            this.heightPercent * newHeight
        );
    }

    generateParameters(paramDefinitions) {
        const params = {};
        paramDefinitions.forEach((def) => {
          const param = new Parameter(def);
          params[def.name] = param;
        });
        return params;
      }
    
      createAccessors(parent, params) {
        Object.keys(params).forEach((key) => {
          Object.defineProperty(parent, key, {
            get: () => params[key].value,
            set: (newValue) => {
              params[key].value = newValue;
            },
          });
        });
      }
    
      get() {
      let output = 'Parameters:\n';
      for (let key in this.param) {
        const param = this.param[key];
        output += `${param.name}: ${param.value}\n`;
      }
      console.log(output);
    }

        colorize(property, color) {
                if (!this.element) {
                    return;
                }
                this.element.colorize(property, color);
            }
        // for linking number boxes to other elements

        //general, destroys any element
        destroy(){
            if (!this.element) {
                return;
            }
            this.element.destroy()
        }

        //Dynamic sizing and positioning

        set x(value) {
            this.xPercent = value / window.innerWidth;
            this.updatePositionAndSize();
        }
    
        set y(value) {
            this.yPercent = value / window.innerHeight;
            this.updatePositionAndSize();
        }
    
        set width(value) {
            this.widthPercent = value / window.innerWidth;
            this.updatePositionAndSize();
        }
    
        set height(value) {
            this.heightPercent = value / window.innerHeight;
            this.updatePositionAndSize();
        }
    
        // Getters for convenience
        get x() {
            return this.xPercent * window.innerWidth;
        }
    
        get y() {
            return this.yPercent * window.innerHeight;
        }
    
        get width() {
            return this.widthPercent * window.innerWidth;
        }
    
        get height() {
            return this.heightPercent * window.innerHeight;
        }

        set size([newWidth, newHeight]) {
            // Convert absolute size to percentages relative to the window size
            this.widthPercent = newWidth / window.innerWidth;
            this.heightPercent = newHeight / window.innerHeight;
            this.updatePositionAndSize();
        }
    
        get size() {
            // Return the absolute size based on current window size
            return [
                this.widthPercent * window.innerWidth,
                this.heightPercent * window.innerHeight
            ];
        }
    }

NexusElement;


;

class NexusNumberBox extends NexusElement {
    constructor(x = 0, y = 0, width = 75, height = 25) {
        // Pass the type "Dial" to the parent constructor
        super('Number', x, y, width, height);
    }

    link(source) {
        this.element.link(source.element);
    }

    get value(){
        return this._value
    }

    set value(number){
        this._value = number;
        this.element.value = number
    }

    get max() {
        return this._max;
    }
    set max(value) {
        this._max = value;
        this.element.max = value
    }

    get min() {
        return this._min;
    }
    set min(value) {
        this._min = value;
        this.element.min = value
    }

}

;

/**
 * RadioButton - A group of toggle buttons where only one can be active
 * Uses NexusUI TextButton components arranged horizontally or vertically
 * 
 * @param {number} x - X position in pixels
 * @param {number} y - Y position in pixels
 * @param {string[]} options - Array of option labels/values
 * @param {Object} config - Configuration object
 * @param {number} config.buttonWidth - Width of each button (default 60)
 * @param {number} config.buttonHeight - Height of each button (default 25)
 * @param {string} config.orientation - 'horizontal' or 'vertical' (default 'horizontal')
 * @param {boolean} config.showLabel - Whether to show parameter label (default false)
 * @param {string} config.label - Label text if showLabel is true
 */
class NexusRadioButton {
    constructor(x = 0, y = 0, options = ['A', 'B', 'C'], config = {}) {
        // Handle legacy 4th parameter as string (orientation)
        const normalizedConfig = typeof config === 'string' 
            ? { orientation: config } 
            : config;
        
        const {
            buttonWidth = 60,
            buttonHeight = 25,
            orientation = 'horizontal',
            showLabel = false,
            label = ''
        } = normalizedConfig;
        
        this.options = options;
        this.orientation = orientation;
        this.selectedIndex = 0;
        this.selectedValue = options[0];
        this.buttons = [];
        this.callbacks = [];
        this.label = label;
        this.showLabel = showLabel;
        
        // Get the Canvas container
        const container = document.getElementById('Canvas');
        if (!container) {
            console.error('RadioButton: #Canvas container not found!');
            return;
        }
        
        // Auto-initialize Canvas if needed
        initNexusCanvas();
        
        // Store reference to container
        this.container = container;
        
        // Calculate dimensions
        const containerWidth = container.clientWidth || window.innerWidth;
        const containerHeight = container.clientHeight || window.innerHeight;
        
        // Button sizing from config
        const spacing = 5;
        
        // Create container div for the radio group
        this.elementContainer = document.createElement('div');
        this.elementContainer.style.position = 'absolute';
        this.elementContainer.style.left = x + 'px';
        this.elementContainer.style.top = y + 'px';
        container.appendChild(this.elementContainer);
        
        // Add label if showLabel is true
        if (showLabel && label) {
            const labelDiv = document.createElement('div');
            labelDiv.textContent = label;
            labelDiv.style.cssText = `
                color: #AAAAAA;
                font-family: monospace;
                font-size: 11px;
                margin-bottom: 4px;
                pointer-events: none;
                user-select: none;
            `;
            this.elementContainer.appendChild(labelDiv);
            this.labelElement = labelDiv;
        }
        
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.flexDirection = orientation === 'horizontal' ? 'row' : 'column';
        buttonsContainer.style.gap = spacing + 'px';
        this.elementContainer.appendChild(buttonsContainer);
        this.buttonsContainer = buttonsContainer;
        
        // Store percentages for responsive resizing
        this.xPercent = x / containerWidth;
        this.yPercent = y / containerHeight;
        
        // Create buttons for each option
        const Nexus = window.Nexus;
        
        options.forEach((option, index) => {
            const btnContainer = document.createElement('div');
            btnContainer.style.position = 'relative';
            buttonsContainer.appendChild(btnContainer);
            
            // Use Button (momentary) instead of TextButton (toggle) to avoid double-click issues
            const btn = new Nexus.TextButton(btnContainer, {
                size: [buttonWidth, buttonHeight],
                state: false,
                text: option,
                alternateText: option,
                mode: 'button'  // Momentary mode - doesn't toggle state
            });
            
            // Style the button - highlight first one as selected
            const isSelected = index === 0;
            btn.colorize('fill', isSelected ? '#6060a0' : '#303030');
            btn.colorize('accent', '#8080c0');
            btn.colorize('text', '#ffffff');
            
            // Handle click - triggers on press
            btn.on('change', (v) => {
                if (v && !this._isUpdating) {
                    this.select(index);
                }
            });
            
            this.buttons.push(btn);
        });
        
        // Set up resize observer
        this.resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(() => {
                if (!this.elementContainer || !document.body.contains(this.elementContainer)) {
                    if (this.resizeObserver) this.resizeObserver.disconnect();
                    return;
                }
                this.updatePosition();
            });
        });
        this.resizeObserver.observe(container);
    }
    
    /**
     * Select an option by index
     */
    select(index, triggerCallbacks = true) {
        if (index < 0 || index >= this.options.length) return;
        if (this._isUpdating) return;  // Prevent recursion
        
        this._isUpdating = true;  // Set guard flag
        
        this.selectedIndex = index;
        this.selectedValue = this.options[index];
        
        // Use stored accent color or default
        const activeColor = this.accentColor || '#6060a0';
        const inactiveColor = '#303030';
        
        // Update button colors only (don't touch state to avoid text toggle)
        this.buttons.forEach((btn, i) => {
            const isSelected = i === index;
            btn.colorize('fill', isSelected ? activeColor : inactiveColor);
        });
        
        this._isUpdating = false;  // Clear guard flag
        
        // Trigger callbacks (unless suppressed, e.g. during ccSet)
        if (triggerCallbacks) {
            this.callbacks.forEach(cb => cb(this.selectedValue, index));
        }
    }
    
    /**
     * Select an option by value (without triggering callbacks - for ccSet)
     */
    selectByValue(value, triggerCallbacks = false) {
        const index = this.options.indexOf(value);
        if (index !== -1) {
            this.select(index, triggerCallbacks);
        }
    }
    
    /**
     * Get current value
     */
    get value() {
        return this.selectedValue;
    }
    
    /**
     * Set value
     */
    set value(val) {
        this.selectByValue(val);
    }
    
    /**
     * Register a callback for when selection changes
     */
    on(event, callback) {
        if (event === 'change') {
            this.callbacks.push(callback);
        }
    }
    
    /**
     * Alias for on('change', callback)
     */
    mapTo(callback) {
        this.on('change', callback);
    }
    
    /**
     * ccSet - for Parameter module compatibility
     */
    ccSet(value) {
        this.selectByValue(value);
    }
    
    /**
     * Update position on resize
     */
    updatePosition() {
        const container = this.container || document.getElementById('Canvas');
        if (!container || !this.elementContainer) return;
        
        const newWidth = container.clientWidth || window.innerWidth;
        const newHeight = container.clientHeight || window.innerHeight;
        
        this.elementContainer.style.left = (this.xPercent * newWidth) + 'px';
        this.elementContainer.style.top = (this.yPercent * newHeight) + 'px';
    }
    
    /**
     * Colorize all buttons and label
     */
    colorize(property, color) {
        this.buttons.forEach((btn, i) => {
            if (property === 'accent') {
                btn.colorize('accent', color);
                if (i === this.selectedIndex) {
                    btn.colorize('fill', color);
                }
            } else {
                btn.colorize(property, color);
            }
        });
        // Store accent color for future selections
        if (property === 'accent') {
            this.accentColor = color;
            // Also color the label
            if (this.labelElement) {
                this.labelElement.style.color = color;
            }
        }
    }
    
    /**
     * Destroy the radio button group
     */
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.buttons.forEach(btn => btn.destroy());
        if (this.elementContainer && this.elementContainer.parentNode) {
            this.elementContainer.parentNode.removeChild(this.elementContainer);
        }
    }
}


;

class NexusSlider extends NexusElement {
    constructor(x = 0, y = 0, width = 200, height = 50) {
        super('Slider', x, y, width, height);
    }

    // ccSet is called by Parameter.set() to update the GUI without triggering callback
    ccSet(value) {
        // Validate value to prevent NaN errors
        if (this.element && typeof value === 'number' && !isNaN(value) && isFinite(value)) {
            // Clamp value to min/max range
            const clampedValue = Math.max(this._min || 0, Math.min(this._max || 1, value));
            this.element.value = clampedValue;
        }
    }

  
    // setMode(mode) {
    //     this.element.mode = mode; // "relative" or "absolute"
    // }

    get mode() {
        return this._mode;
    }

    set mode(type){
        this._mode = type;
        this.element.mode = type
    }

    get value() {
        return this.element.value;
    }
    set value(value) {
        this.element.value = value;
    }

    get step(){
        return this._step
    }

    set step(increment){
        this._step = increment;
        this.element.step = increment
    }

    get max() {
        return this._max;
    }
    set max(value) {
        this._max = value;
        this.element.max = value
    }

    get min() {
        return this._min;
    }
    set min(value) {
        this._min = value;
        this.element.min = value
    }

}

;

class NexusSwitch extends NexusElement {
    constructor(x = 0, y = 0, width = 75, height = 25) {
        // Pass the type "Dial" to the parent constructor
        super('Toggle', x, y, width, height);
    }

    flip(){
        this.element.flip()
    }

    get state(){
        return this._state
    }

    set state(flipped){
        this._state = flipped;
        this.element.state = flipped
    }
}

/*
This class mimics the midi keyboard react component.
It is a hassle to find a way to programmatically convert the component to usable html and js,
so here is an alternative
*/
class MidiKeyboard {
    constructor() {
        this.midiOn = false;
        this.notesOn = new Set();
        this.activeKeys = {};
        this.octave = 4;
        this.keyToNote = {
            90: { "midi": 60, "pitch": "C" },     // Z
            83: { "midi": 61, "pitch": "C#/Db" }, // S
            88: { "midi": 62, "pitch": "D" },     // X
            68: { "midi": 63, "pitch": "D#/Eb" }, // D
            67: { "midi": 64, "pitch": "E" },     // C
            86: { "midi": 65, "pitch": "F" },     // V
            71: { "midi": 66, "pitch": "F#/Gb" }, // G
            66: { "midi": 67, "pitch": "G" },     // B
            72: { "midi": 68, "pitch": "G#/Ab" }, // H
            78: { "midi": 69, "pitch": "A" },     // N
            74: { "midi": 70, "pitch": "A#/Bb" }, // J
            77: { "midi": 71, "pitch": "B" },     // M
            188: { "midi": 72, "pitch": "C" },    // ,
            76: { "midi": 73, "pitch": "C#/Db" }, // L
            190: { "midi": 74, "pitch": "D" },    // .
            186: { "midi": 75, "pitch": "D#/Eb" }, // ;
            191: { "midi": 76, "pitch": "E" },    // /

            // second octave
            81: { "midi": 72, "pitch": "C" },     // Q
            50: { "midi": 73, "pitch": "C#/Db" }, // 2
            87: { "midi": 74, "pitch": "D" },     // W
            51: { "midi": 75, "pitch": "D#/Eb" }, // 3
            69: { "midi": 76, "pitch": "E" },     // E
            82: { "midi": 77, "pitch": "F" },     // R
            53: { "midi": 78, "pitch": "F#/Gb" }, // 5
            84: { "midi": 79, "pitch": "G" },     // T
            54: { "midi": 80, "pitch": "G#/Ab" }, // 6
            89: { "midi": 81, "pitch": "A" },     // Y
            55: { "midi": 82, "pitch": "A#/Bb" }, // 7
            85: { "midi": 83, "pitch": "B" },     // U
            73: { "midi": 84, "pitch": "C" },     // I
            57: { "midi": 85, "pitch": "C#/Db" }, // 9
            79: { "midi": 86, "pitch": "D" },     // O
            48: { "midi": 87, "pitch": "D#/Eb" }, // 0
            80: { "midi": 88, "pitch": "E" }      // P
        };

        this.init();
    }

    init() {
        // Add event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // Get DOM elements
        // WARNING: These are assumed to be defined
        this.keyboardButton = document.getElementById('keyboard-button');
        this.keyboardIcon = document.getElementById('keyboard-icon');
        this.notesDisplay = document.getElementById('notes-display');

        // Add click handler
        this.keyboardButton.addEventListener('click', this.toggleMidi.bind(this));
    }

    handleKeyDown(event) {
        if (this.midiOn) {
            const keyCode = event.keyCode;
            if (!this.activeKeys[keyCode]) {
                this.activeKeys[keyCode] = true;
                try {
                    let note = this.keyToNote[keyCode];
                    let midiNote = note["midi"] + (this.octave - 4) * 12;
                    if (midiNote <= 127) {
                        this.notesOn.add(midiNote);
                        this.updateNotesDisplay();
                        if (window.midiHandlerInstance) {
                            window.midiHandlerInstance.handleNoteOn(midiNote, 100);
                        }
                    }
                } catch (error) {
                    if (keyCode === 37) {
                        this.decreaseOctave();
                    } else if (keyCode === 39) {
                        this.increaseOctave();
                    }
                }
            }
        }
    }

    handleKeyUp(event) {
        if (this.midiOn) {
            const keyCode = event.keyCode;
            this.activeKeys[keyCode] = false;
            try {
                let note = this.keyToNote[keyCode];
                let midiNote = note["midi"] + (this.octave - 4) * 12;
                if (midiNote <= 127) {
                    this.notesOn.delete(midiNote);
                    this.updateNotesDisplay();
                    if (window.midiHandlerInstance) {
                        window.midiHandlerInstance.handleNoteOff(midiNote, 0);
                    }
                }
            } catch (error) {
                // Ignore errors for non-mapped keys
            }
        }
    }

    toggleMidi() {
        this.midiOn = !this.midiOn;
        this.keyboardIcon.className = `icon ${this.midiOn ? 'active' : 'inactive'}`;
    }

    increaseOctave() {
        if (this.octave < 7) {
            this.octave++;
        }
    }

    decreaseOctave() {
        if (this.octave > 1) {
            this.octave--;
        }
    }

    updateNotesDisplay() {
        this.notesDisplay.innerHTML = Array.from(this.notesOn)
            .map(note => `<div class="note-pill">${note}</div>`)
            .join('');
    }
}

// Initialize the keyboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.midiKeyboard = new MidiKeyboard();
});


/*
DelayOp

Delays
* input->hpf->feedbackDelay->drive->waveShaper->lpf->panner->output
* 
* 

methods:


properties:

- 
*/

;
;

class DelayOp{
  constructor(){
    //signal
    this.input = new Tone.Multiply(1)
    this.hpf = new Tone.OnePoleFilter({type:'highpass',frequency:100})
    this.delay = new Tone.FeedbackDelay()
    this.drive = new Tone.Multiply(0.8)
    this. waveShaper = new Tone.WaveShaper((x)=>{
      return Math.tanh(x*16) *.9
    })
    this.lpf = new Tone.Filter({frequency:2000})
    this.panner = new Tone.Panner(0)
    this.output = new Tone.Multiply(1)
    //mod
    this.delayTime = new Tone.Signal(.1)
    //connections
    this.input.connect(this.hpf)
    this.hpf.connect(this.delay)
    this.delay.connect(this.drive)
    this.drive.connect(this.waveShaper)
    this.waveShaper.connect(this.lpf)
    this.lpf.connect(this.panner)
    this.panner.connect(this.output)
    //mod connections
    this.delayTime.connect(this.delay.delayTime)
  }
  connect(destination) {
    if (destination.input) {
      this.output.connect(destination.input);
    } else {
      this.output.connect(destination);
    }
  }
}

const paramDefinitions = (synth) => [
    {
      name:'time', min:0.0001, max:1, curve:2,
      type: 'input',value:.125,
      callback: function(value, time=null) {
        //synth.delay.delayTime.value = value
        //synth.delayR.delayTime.value = value*synth._delayRatio
        //synth.delay.delayTime.rampTo(value, .1)
        //synth.delayR.delayTime.rampTo(value*synth._delayRatio, .1)
        synth.setTime(value, time)
      }
    },
    {
      name:'feedback', min:0.0, max:1.2, curve:.7,
      type: 'input',value:0,
      callback: function(value) {
        synth.feedbackMult.factor.value = value/10; 
        synth.feedbackMultR.factor.value = value/10
      }
    },
    {
      name:'damping', type: 'param',
      min:100, max:10000, curve:2,value:2000,
      callback: function(value) {
        synth.vcf.frequency.value = value; 
        synth.vcf.frequency.value = value*0.9;
      },
    },
    {
      name:'hpf', type: 'param',
      min:10, max:2000, curve:2,value:500,
      callback: function(value) {
        synth.highpass.frequency.value = value
      }
    },
    {
      name:'dry', value:0, min:0.0, max:1.2, curve:2,
      type:'hidden',
      callback: function(value) {
        synth.drySig.factor.value = value
      }
    },
    {
      name:'gain', min:0.1, max:1, curve:0.8, value:.5,
      type:'param',
      callback: function(value) {
        synth.ws_input.factor.rampTo(value, .1)
      }
    },
    {
      name:'rate', min:0.1, max:10, curve:2, value:.3,
      type:'param',
      isSignal: 'true', connectTo: synth=>synth.lfo.frequency,
      callback: function(value) {
        synth.lfo.frequency.rampTo(value, .1)
      }
    },
    {
      name:'depth', min:0., max:.1, curve:3, value:.001,
      type:'param',
      isSignal: 'true', connectTo: synth=>synth.lfoDepth.factor,
      callback: function(value) {
        synth.lfoDepth.factor.rampTo(value, .1)
      }
    },
    {
      name:'amp', min:0.0, max:1.2, curve:2,value:1,
      type:'hidden',
      callback: function(value) {
        synth.output.factor.value = value
      },
    },
    {
      name:'spread', value:1, min:0.5, max:1, curve:1,
      type:'output',
      callback: function(value) {
        synth._delayRatio = value
        synth.time = synth.delay.delayTime.value
      }
    },
    {
      name:'level', min:0.0, max:1.2, curve:2,value:.15,
      type:'output',
      callback: function(value) {
        synth.wetSig.factor.value = value
      }
    }
  ]


// EffectTemplate.js

;
;
;



;


/**
 * Effects Template
 * 
 * contains the following core features:
 * - constructor
 * - preset management
 * - parameter management
 * - gooey creation
 * - snapshot creation
 * - collaboration linking
 *
 * @constructor
 */
class EffectTemplate {
    constructor() {
        this.presets = {};
        this.synthPresetName = ""
        this.gui_elements = [];
        this.gui = null;
        this.guiContainer = null;
        this.backgroundColor = [100,100,100]
        this.layout = basicLayout
        this.type = 'Effect';
        this.name = "";
        this.presetsData = null;
        this.curPreset = null;
        this.snapshots = {}
    }

    /**
     * Populate this.presets with presets fetched from the server
     * Using the name in this.synthPresetName
     */
    async accessPreset(){
    return      
        let presetData = {} 
        try {
            let response = await fetch('https://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/'+this.synthPresetName+'.json')
            let jsonString = ""
                if (!response.ok) {
                    // Handle HTTP errors (e.g., 404 Not Found, 500 Internal Server Error)
                    console.warn("Error accessing file");
                }else{
                    jsonString = await response.text();
                }
                presetData = JSON.parse(jsonString);
                //console.log("jsonString", jsonString);
                //console.log("presetData", presetData);
        } catch (error) {
            console.warn("Error parsing JSON:", error);
        }
        this.presets = await presetData;
        this.loadPreset("default");
    }
    
    /**
     * Save a preset by name
     * @param {string} name - Name of the preset to save
     * @returns {void}
     * @example synth.savePreset('default')
     */
    async savePreset (name) {
        const _preset = {};
        for (let element of Object.values(this.param)) {
            _preset[element.name] = element._value;
        }
        console.log(this.presets)
        // Update the presetsData in memory
        //console.log(this.presets);
        if (!this.presets[name]) {
            this.presets[name] = {};
        }
        this.presets[name] = _preset;

         try {
            const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/save', {
                method: 'POST', // Specify the HTTP method
                headers: {
                    'Content-Type': 'application/json' // Tell the server we're sending JSON
                },
                body: JSON.stringify({ // Convert your data to a JSON string for the body
                    name: this.synthPresetName,
                    data: this.presets
            })
            });

            const result = await response.json(); // Parse the server's JSON response

            if (response.ok) {
                console.log(`Save successful: ${result.message}`);
                return result.success;
            } else {
                console.warn(`Save failed: ${result.message}`);
                // You might want to throw an error here or handle specific status codes
                return false;
            }
        } catch (error) {
            console.error(`Error sending save request for '${name}':`, error);
            return false;
        }
        console.log(`Preset saved under ${this.name}/${name}`);
    };

    async deletePreset (name) {
        // Update the presetsData in memory
        //console.log(this.presets);
        if (this.presets[name]) {
            delete this.presets[name]
            try {
                const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/save', {
                    method: 'POST', // Specify the HTTP method
                    headers: {
                        'Content-Type': 'application/json' // Tell the server we're sending JSON
                    },
                    body: JSON.stringify({ // Convert your data to a JSON string for the body
                        name: this.synthPresetName,
                        data: this.presets
                })
                });

                const result = await response.json(); // Parse the server's JSON response

                if (response.ok) {
                    console.log(`Delete successful: ${result.message}`);
                    return result.success;
                } else {
                    console.warn(`Delete failed: ${result.message}`);
                    // You might want to throw an error here or handle specific status codes
                    return false;
                }
            } catch (error) {
                console.error(`Error sending delete request for '${name}':`, error);
                return false;
            }
        }

        console.log(`Preset deleted  under ${this.name}/${name}`);
    };

    async downloadAllPresets() {
    try {
        const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/download_presets');
        if (!response.ok) {
            console.error('Failed to download presets:', response.status, response.statusText);
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'synth_presets.zip'; // The filename the user will see
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url); // Clean up the object URL
        console.log('Presets folder downloaded successfully.');
    } catch (error) {
        console.error('Error downloading presets:', error);
    }
}

    /**
     * Load a preset by name
     * @param {string} name - Name of the preset to load
     * @returns {void}
     * @example synth.loadPreset('default')
     */
    loadPreset(name) {
        this.curPreset = name;
        const presetData = this.presets[this.curPreset];

        if (presetData) {
          //console.log("Loading preset", this.curPreset);
          for (let name in presetData) {
            try {
              if (this.param[name]?.set) {
                this.param[name].set(presetData[name]);
              }
            } catch (e) {
              console.log(name, presetData[name], e);
            }
          }
          
        } else {
            //console.log("No preset of name ", name);
        }
    }

    logPreset() {
        const presetData = this.presets[this.curPreset];

        if (presetData) {

          let output = 'Parameters:\n';
          for (let key in presetData) {
              const param = presetData[key];
              if (Array.isArray(param)) {
                  const formattedArray = param.map((value) => {
                      if (typeof value === "number") {
                          return Number(value.toFixed(2)); // Limit to 2 decimals
                      }
                      return value; // Keep non-numbers unchanged
                  });

                  output += `${key}: [${formattedArray.join(", ")}]\n`; // Add the array to output
              }
              else if(typeof param === 'number') output += `${key}: ${param.toFixed(2)}\n`;
              else output += `${key}: ${param}\n`;
          }
          console.log(output);
        }

        else {
            console.log("No preset of name ", this.curPreset);
        }
    }

    /**
     * Console log all available presets
     * @returns {void}
     * @example synth.listPresets()
     */
    listPresets() {
        console.log("Synth presets", this.presets);
    }

    generateParameters(paramDefinitions) {
        const params = {};
        paramDefinitions.forEach((def) => {
            const param = new Parameter(this,def);
            params[def.name] = param;
        });
        return params;
    }

    createAccessors(parent, params) {
        Object.keys(params).forEach((key) => {
            const param = params[key];
            let currentSeq = null; // Track active sequence

            if (typeof param.set !== 'function' || typeof param.get !== 'function') {
                throw new Error(`Parameter '${key}' does not have valid get/set methods`);
            }

            // Proxy handler to intercept method calls
            const proxyHandler = {
                get(target, prop,value=null) {
                    if (prop === 'sequence') return (valueArray, subdivision = '16n') => {
                        param.sequence(valueArray,subdivision)
                    };
                    if (prop === 'stop') return () => {
                        param.stop()
                    };
                    if (prop === 'set') return () => {
                        //console.log('set',target,prop,value)
                        const rawValue = (typeof value === 'function') ? value() : value.value;
                        if (currentSeq) {
                            currentSeq.dispose();
                            currentSeq = null;
                        }
                        //console.log(target,prop,rawValue)
                        param.set(value,null,false) 
                    };
                    return target.get(); // Return the current value
                },
                set(target, _, newValue) {
                    if (Array.isArray(newValue)) {
                        if (currentSeq) currentSeq.dispose();
                        currentSeq = new Seq(
                            parent,
                            newValue,
                            param.subdivision || '16n',
                            'infinite',
                            0,
                            (v, time) => param.set(Number(v[0]),null,false, time) // Ensure time is passed
                        );
                    } else {
                        if (currentSeq) {
                            currentSeq.dispose();
                            currentSeq = null;
                        }
                        param.set(newValue);
                    }
                    return true;
                }
            };

            // Define the parameter with a Proxy
            Object.defineProperty(parent, key, {
                get: () => new Proxy(param, proxyHandler),
                set: (newValue) => {
                    if (Array.isArray(newValue)) {
                        param.sequence(newValue)
                    } else {
                        param.stop()
                        param.set(newValue);
                    }
                },
            });
        });
    }//accessors

    // Method to trigger the sequence in the Proxy
    startSequence(paramName, valueArray, subdivision = '16n') {
        const param = this.param[paramName];

        if (param ) {
            param.sequence(valueArray, subdivision);
        } else {
            console.warn(`Param ${paramName} has no sequence method or doesn't exist.`);
        }
    }

    stopSequence(paramName) {
        const param = this.param[paramName];
        if (param.seq ) {
            param.stop(); 
        } else {
            console.warn(`Param ${paramName} has no stop method or doesn't exist.`);
        }
    }

    get() {
        let output = 'Parameters:\n';
        for (let key in this.param) {
            const param = this.param[key];
            let value = param._value
            //console.log(value)
            if( typeof value === 'number') {
                if(value > 100) value = value.toFixed()
                else if( value > 1) value = value.toFixed(1)
                else value = value.toFixed(3)
            }
            output += `${param.name}: ${value}\n`;
        }
        console.log(output);
    }
    print(){ this.get()}

    /**
     * Initialize the GUI
     * @returns {void}
     * @example 
     * const gui = new p5(sketch, 'Canvas1');
     * synth.initGui(gui, 10, 10)
     */
    initGui(gui = null) {
        this.guiContainer = document.getElementById('Canvas');
        const sketchWithSize = (p) => sketch(p, { height: .3 });
        this.gui = new p5(sketchWithSize, this.guiContainer);
        const layout = this.layout;
        //console.log(layout);

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

            let indexOffset = 0;

            groupedParams[groupType].forEach((param, index) => {
                const isGroupA = groupLayout.groupA.includes(param.name);
                const controlType = isGroupA ? groupLayout.controlTypeA : groupLayout.controlTypeB;
                const size = isGroupA ? groupLayout.sizeA : groupLayout.sizeB;

                // **Retrieve the current parameter value**
                const paramValue = param.get ? param.get() : param._value;

                if (Array.isArray(paramValue)) {
                    paramValue.forEach((value, i) => {
                        let xOffset = groupLayout.offsets.x * ((index + indexOffset) % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
                        let yOffset = groupLayout.offsets.y * Math.floor((index + indexOffset) / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));

                        const x = groupLayout.boundingBox.x + xOffset;
                        const y = groupLayout.boundingBox.y + yOffset;

                        this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color, i, value });
                        indexOffset++;
                    });
                } else {
                    let xOffset = groupLayout.offsets.x * ((index + indexOffset) % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
                    let yOffset = groupLayout.offsets.y * Math.floor((index + indexOffset) / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));

                    const x = groupLayout.boundingBox.x + xOffset;
                    const y = groupLayout.boundingBox.y + yOffset;

                    // Pass the **retrieved parameter value** to GUI
                    this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color, value: paramValue });
                }
            });
        });
        this.gui.setTheme( this.gui, 'dark' )
        this.gui.backgroundColor = this.backgroundColor
        setTimeout(this.loadPreset('default'),1000)
    }

    /**
     * Hide the GUI
     * @returns {void}
     */
    hideGui() {
        if (this.gui) {
            this.gui.remove(); // Properly destroy p5 instance
            this.gui = null;
        }
    }

    /**
     * Show the GUI
     * @returns {void}
     */
    showGui() {
        this.initGui()
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
                value: param._value,
                curve: param.curve,
                size: size , // Scale size
                x,
                y,
                accentColor: color,
                callback: (value) => param.set(value,i,true),
            }));
        } else if (controlType === 'radioButton') {
            // if (!Array.isArray(param.radioOptions) || param.radioOptions.length === 0) {
            //     console.warn(`Parameter "${param.name}" has no options defined for radioBox.`);
            //     return null;
            // }

            param.guiElements.push( this.gui.RadioButton({
                label: i  ? param.labels[i] : param.name,
                radioOptions: param.radioOptions,
                value: param._value, // Use provided value
                x: x+10,
                y,
                accentColor: color,
                orientation: 'horizontal',
                callback: (value) => param.set(value,i,true), // ✅ Correct callback for Polyphony
            }));
        } else if (controlType === 'dropdown') {
            // if (!Array.isArray(param.radioOptions) || param.radioOptions.length === 0) {
            //     console.warn(`Parameter "${param.name}" has no options defined for radioBox.`);
            //     return null;
            // }

            param.guiElements.push( this.gui.Dropdown({
                label: i ? param.labels[i] : param.name, 
                dropdownOptions: this.drumkitList,
                value: param._value,
                x:x,
                y:y+10,
                size:15,
                accentColor: color,
                callback:(x)=>{this.loadSamples(x)}
              }))
        } else if (controlType === 'text') {
            param.guiElements.push( this.gui.Text({
                label: param.max,
                value: param._value,
                x:x+2,
                y:y+10,
                border:0.01,
                textSize: size,
                accentColor: color,
                callback: (x) => {},
            }) );
        } else {
            console.log('no gui creation element for ', controlType)
        }
    }

    /**
     * Fast way to create a knob GUI element
     * @param {string} _label - Label for the knob
     * @param {number} _x - X position of the knob
     * @param {number} _y - Y position of the knob
     * @param {number} _min - Minimum value of the knob
     * @param {number} _max - Maximum value of the knob
     * @param {number} _size - Size of the knob
     * @param {string} _accentColor - Accent color of the knob
     * @param {function} callback - Callback function for the knob
     * @returns {object} - p5.gui knob object
     * @example
     * this.createKnob('Attack', 10, 10, 0.01, 1, 100, '#ff0000', (val) => {
     *    this.setADSR(val, this.gui.get('Decay').value(), this.gui.get('Sustain').value(), this.gui.get('Release').value());
     * });
     */


      createKnob(label, x, y, min, max, size, accentColor, callback) {
        return this.gui.Knob({
          label, min, max, size, accentColor,
          x: x + this.x, y: y + this.y,
          callback: callback,
          showLabel: 1, showValue: 0, // Assuming these are common settings
          curve: 2, // Adjust as needed
          border: 2 // Adjust as needed
        });
      }

    linkGui(name){
        //console.log(this.param)
        let objectIndex = 0
        Object.keys(this.param).forEach(key => {
          let subObject = this.param[key];
          if( subObject.guiElements[0] ) 
            subObject.guiElements[0].setLink( name + objectIndex )
          objectIndex++
        });
    }

    pushState(snap = null) {
      Object.keys(this.param).forEach(key => {
        const subObject = this.param[key];
        const value = snap ? snap[key]?.value : subObject._value;

        if (value !== undefined && subObject.guiElements?.[0]) {
          subObject.guiElements[0].set(value);
        }
      });
    }

    saveSnap(name) {
      this.snapshots[name] = {};

      Object.keys(this.param).forEach(key => {
        let subObject = this.param[key];
        this.snapshots[name][key] = {
          value: subObject._value // store raw value
        };
      });

      console.log(`Snapshot "${name}" saved.`);
    }

    loadSnap(name) {
      const snap = this.snapshots[name];
      if (!snap) {
        console.warn(`Snapshot "${name}" not found.`);
        return;
      }
      this.pushState(snap);
      console.log(`Snapshot "${name}" loaded.`);
    }

    listSnapshots() {
      console.log( Object.keys(this.snapshots) )
    }

    /**
     * Connects to Tone.js destination
     * @param {object} destination - Tone.js destination object
     * @returns {void}
     * @example 
     * const amp = new Tone.Gain(0.5).toDestination();
     * synth.connect(amp)
     */
    connect(destination) {
        if (destination.input) {
            this.output.connect(destination.input);
        } else {
            this.output.connect(destination);
        }
    }

    /**
     * Disconnects from Tone.js destination
     * @param {object} destination - Tone.js destination object
     * @returns {void}
     * @example
     * const amp = new Tone.Gain(0.5).toDestination();
     * synth.connect(amp)
     * synth.disconnect(amp)
     */
    disconnect(destination) {
        if (destination.input) {
            this.output.disconnect(destination.input);
        } else {
            this.output.disconnect(destination);
        }
    }

}


window.EffectLayout = {
    "input": {
      "color": [255, 255, 255],
      "boundingBox": { "x": 5, "y": 35, "width": 20, "height": 100 },
      "offsets": { "x": 10, "y": 20 },
      "groupA": ["name"],
      "controlTypeA": "text",
      "controlTypeB": "knob",
      "sizeA": 1.5,
      "sizeB": 0.5
    },
    "param": {
      "color": [200, 100, 150],
      "boundingBox": { "x": 25, "y": 35, "width": 60, "height": 100 },
      "offsets": { "x": 10, "y": 20 },
      "groupA": ["type"],
      "controlTypeA": "radioButton",
      "controlTypeB": "knob",
      "sizeA": 0.5,
      "sizeB": 0.5
    },
    "output": {
      "color": [100, 255, 255],
      "boundingBox": { "x": 80, "y": 35, "width": 20, "height": 100 },
      "offsets": { "x": 10, "y": 30 },
      "groupA": ["level"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.5,
      "sizeB": 0.5
    }
}    ;;

/**
 * AnalogDelay.js
 * 
 * Simple approximation of an analog delay
 * 
 * Signal path:
 * input -> hpf -> gain -> waveShaper -> lpf -> delay -> wet -> output
 *                                         <- feedback <-
 * input -> dry -> output
 * 
 * @class
 */
;
;
;

;
;
;

class AnalogDelay extends EffectTemplate {
  /**
   * Creates an instance of AnalogDelay.
   * @constructor
   * @param {number} [initialTime=0.1] - Initial delay time in seconds.
   * @param {number} [initialFB=0] - Initial feedback amount.
   */
  constructor(initialTime = 1, initialFB = 0) {
    super()
    this.name = 'analogDelay'
    this.layout= layout

    this.input = new Tone.Multiply(1);
    this.highpass = new Tone.Filter({ type: 'highpass', frequency: 20, Q: 0 });
    this.ws_input = new Tone.Multiply(0.125);
    this.waveShaper = new Tone.WaveShaper((x) => { return Math.tanh(x*10) });
    this.vcf = new Tone.Filter({ type: 'lowpass', frequency: 5000, Q: 0, slope: '-12' });
    this.vcfR = new Tone.Filter({ type: 'lowpass', frequency: 5000, Q: 0, slope: '-12' });
    this.delay = new Tone.Delay(initialTime, initialTime);
    this.delayR = new Tone.Delay(initialTime, initialTime);
    this._delayRatio = 0.75
    this.feedbackMult = new Tone.Multiply(initialFB);
    this.feedbackMultR = new Tone.Multiply(initialFB);
    this.merge = new Tone.Merge(2)
    this.wetSig = new Tone.Multiply(1);
    this.drySig = new Tone.Multiply(0);
    this.output = new Tone.Multiply(1);

    // Connecting signal path
    this.input.connect(this.drySig);
    this.input.connect(this.highpass);
    this.highpass.connect(this.ws_input);
    this.ws_input.connect(this.waveShaper);
    this.waveShaper.connect(this.vcf);
    this.waveShaper.connect(this.vcfR);
    this.vcf.connect(this.delay);
    this.vcfR.connect(this.delayR);
    this.delay.connect(this.feedbackMult);
    this.delayR.connect(this.feedbackMultR);
    this.feedbackMult.connect(this.waveShaper);
    this.feedbackMultR.connect(this.waveShaper);
    this.delay.connect(this.merge,0,0);
    this.delayR.connect(this.merge,0,1);
    this.merge.connect(this.wetSig);
    this.wetSig.connect(this.output);
    this.drySig.connect(this.output);

    this.lfo = new Tone.Oscillator(2).start()
    this.lfo.type = "triangle"
    this.lfoDepth = new Tone.Multiply()
    this.lfo.connect(this.lfoDepth)
    this.lfoDepth.connect(this.delay.delayTime)
    this.lfoDepth.connect(this.delayR.delayTime)


    this.paramDefinitions = paramDefinitions(this)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    setTimeout( ()=> this.time = .1, .1)
  }

  setTime(seconds, time = null) {
    if(0){
      this.delay.delayTime.linearRampToValueAtTime(seconds, time)
      this.delayR.delayTime.linearRampToValueAtTime(seconds*this._delayRatio, time)
    } else{
      this.delay.delayTime.rampTo(seconds, .2)
      this.delayR.delayTime.rampTo(seconds*this._delayRatio, .2)
      
    }
  }
}

/*
Caverns

Cascaded Delays
* input-> all DelayOps -> output
* delays are cascaded to all following delays
* DelayOp: input->hpf->feedbackDelay->drive->waveShaper->lpf->output

methods:
- connect
- setDelayTime
- setFeedback: sets internal fb & feedforward to following delays
- setLowpass
- setHighpass
- setDrive: input into soft clipper in delayOp
- setPanning: uses sine wave by default

properties:
- 
*/
;
;
;

class Caverns{
  constructor(color = [200,200,200]){
      this.input = new Tone.Multiply(1)
      this.delay = []
      for(let i=0;i<8;i++) this.delay.push(new DelayOp())
      this.cross = []
      for(let i=0;i<8;i++) this.cross.push(new Tone.Multiply())
      this.output = new Tone.Multiply(0.125)
      //connections
      for(let i=0;i<8;i++) {
        this.input.connect(this.delay[i].input)
        this.delay[i].connect(this.output)
        for(let j=i+1;j<8;j++) this.delay[i].connect(this.cross[j])
        //this.delay[i].connect(this.cross[i])
        this.cross[i].connect(this.delay[i].input)
      }
  }
  connect(destination) {
    if (destination.input) {
      this.output.connect(destination.input);
    } else {
      this.output.connect(destination);
    }
  }
  setDelayTime = function(val){
    for(let i=0;i<8;i++) this.delay[i].delayTime.value = val*(1.25**i)
  }
  setFeedback = function(val){
    for(let i=0;i<8;i++) {
      this.delay[i].delay.feedback.value = val
      //this.cross[i].factor.value = val
    }
  }
  setCross = function(val){
    for(let i=0;i<8;i++) {
      //this.delay[i].delay.feedback.value = val
      this.cross[i].factor.value = val
    }
  }
  setLowpass = function(val){
    for(let i=0;i<8;i++) {
      this.delay[i].lpf.frequency.value = val
    }
  }
  setHighpass = function(val){
    for(let i=0;i<8;i++) {
      this.delay[i].hpf.frequency = val
    }
  }
  setDrive = function(val){
    for(let i=0;i<8;i++) {
      this.delay[i].drive.factor.value = val
    }
  }
  setPanning = function(val){
    for(let i=0;i<8;i++) {
      this.delay[i].panner.pan.rampTo( Math.sin(i*val),.1)
    }
  }
}



const paramDefinitions = (synth) => [
  {
    name: "name",
    type: "input",
    value: 'Chorus',
    max: 'Chorus', default: 'Chorus'
  },
  {
    name: "rate",
    type: "param",
    min: 0.05, max: 10, curve:2,
    default: 0.3,
    callback: (value) => {
      synth.lfos.forEach(lfo => lfo.frequency.value = value);
    }
  },
  {
    name: "depth",
    type: "param",
    min: 0.00001, max: 0.01, curve:2,
    default: 0.004,
    callback: (value) => {
      synth.depths.forEach(gain => gain.gain.value = value);
    }
  },
  {
    name: "spread",
    type: "param",
    min: 0, max: 360, curve:2,
    default: 180,
    callback: (value) => {
      synth.lfos.forEach((lfo, i) => {
        lfo.phase = (value / synth.numVoices) * i;
      });
    }
  },
  {
    name: "tone",
    type: "param",
    min: 200, max: 8000, curve:2,
    default: 4000,
    callback: (value) => {
      if (synth.toneFilter) synth.toneFilter.frequency.value = value;
    }
  } , 
  {
    name: "mix",
    type: "output",
    min: 0, max: 1, curve: 2,
    default: 0.5,
    callback: (value) => {
      synth.dryGain.gain.value = 1 - value;
      synth.wetGain.gain.value = value;
    }
  },
  {
    name: "level",
    type: "output",
    min: 0, max: 1, curve: 2,
    default: 1.0,
    callback: (value) => {
      synth.output.gain.value = value;
    }
  }
];

;
;
;
// ;
;
;

class Chorus extends EffectTemplate {
  constructor(gui = null) {
    super();
    this.gui = gui;
    this.presets = {};
		this.synthPresetName = "ChorusPresets"
		this.accessPreset()
    this.name = "Chorus"
    this.layout = layout;
    this.backgroundColor = [100,0,100]

    this.input = new Tone.Gain();
    this.output = new Tone.Gain();
    this.wet = new Tone.Gain(0.5); // wet level control

    this.numVoices = 3;
    this.delays = [];
    this.lfos = [];
    this.depths = [];
    this.voiceGains = [];

    const baseDelay = 0.01; // 10ms
    const depth = 0.004;    // ±4ms
    const rate = 0.3;       // Hz

    for (let i = 0; i < this.numVoices; i++) {
      const delay = new Tone.Delay(baseDelay, 0.05);
      const lfo = new Tone.LFO({
        frequency: rate,
        min: -1,
        max: 1,
        phase: (360 / this.numVoices) * i
      }).start();

      const depthControl = new Tone.Gain(depth);
      lfo.connect(depthControl);
      depthControl.connect(delay.delayTime);

      this.delays.push(delay);
      this.lfos.push(lfo);
      this.depths.push(depthControl);
    }

    this.dryGain = new Tone.Gain(0.5); // starts at 50% mix
    this.wetGain = new Tone.Gain(0.5);

    this.input.fan(this.dryGain, ...this.delays.map(d => d)); // connect to dry and each delay

    this.dryGain.connect(this.output);
    this.wetGain.connect(this.output);

    // connect each delay to wet gain
    for (let i = 0; i < this.numVoices; i++) {
      const gain = new Tone.Gain(1 / this.numVoices);
      this.delays[i].connect(gain);
      gain.connect(this.wetGain);
    }

    // Parameter definitions
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    this.createAccessors(this, this.param);
    this.autocompleteList = this.paramDefinitions.map(def => def.name);

    setTimeout(() => {
      this.loadPreset('default');
    }, 500);
  }
}

// Seq.js

;
;

class TuringMachine {
  constructor(){
    this.seq = new Array(32).fill(0)
    this.bigKnob = 0
    this.index = 0
    this.len = 16
    this.init()
    this.val = 0
    this.pitchScalar = 1
    this.pitchVal = 0
    this.scale = [0,2,4,5,7,9,11,12]
  }
  init(){
    for(let i=0;i<32;i++)this.seq[i] = Math.random()>0.5
  }
  get(){
    if(Math.random()> Math.abs(this.bigKnob)) this.seq[this.index%this.len] = Math.random()>0.5
    this.val = this.seq[this.index%this.len]
    this.index++
   return this.val
  }
  set knob(val){
    this.len = this.bigKnob>0?16:8
    this.bigKnob = val>1?1: val<-1?-1: val
    this.len = this.bigKnob>0?32:16
  }
  pitch(){
    this.pitchVal = 0
    for(let i=0;i<8;i++)this.pitchVal+=(this.seq[(this.index+i)%8]*i)
    this.pitchVal = this.pitchVal*this.pitchScalar/32
    console.log(this.pitchVal)
    return this.scale[Math.floor(this.pitchVal)]
  }
  getStep(num){
    if(Array.isArray(num)) num = num.reduce((a,b)=>a+b)
    return this.seq[(this.index+num)%this.len]
  }
}


;

class ArrayVisualizer {
    constructor(parent, array, _target = 'Canvas', ratio = 4 / 10) {
        this.parent = parent
        this._array = array;
        this._target = document.getElementById(_target);
        this._ratio = ratio;
        this._type = 'horizontal'; // Default type
        this._color =  [
            '#FF5733',  // Base orange
            '#33A1FF',  // Light blue (complementary)
            '#FF33B1',  // Magenta (opposite on color wheel)
            '#33FF57',  // Bright green (vibrant contrast)
            '#5733FF',  // Purple (contrasting tone)
            '#FFBD33',  // Warm yellow (vibrant and complementary)
            '#33FFBD',  // Mint green (cool contrast)
            '#FF3380'   // Pink (near complementary)
        ];

        this._backgroundColor = '#3C3D37'
        this._activeColor = '#ECDFCC'; // Default color
        this._rows = 1; // Default to single row
        this._columns = array.length; // Default to length of array
        this._width = this._target.offsetWidth;
        this._height = this._width * this._ratio;
        this.elementWidth = this._width / this._columns;
        this.elementHeight = this._height / this._rows;
        //need to keep track of min and max acroos multiple frames
        //in order to catch when we draw multiply seqs
        this._min = 0
        this._max = 1
        this._minActive = 0
        this._maxActive = 1
        this._seqNum = 0
        this._displayLength = 8 //x dimension of drawing
        this._activeLength = 8 //length of longest array of last frame 
        
        this._subDivision = '16n'
        this._enabled = false
        this._svg = null
        this.index = 0

        // this.loop = new Tone.Loop(time=>{
        //     this.index = Math.floor(Tone.Transport.ticks / Tone.Time(this._subDivision).toTicks());
        //     this.visualize(this.index)
        // }, '16n')
    }

    createSVG() {
        // const existingSVG = this._target.querySelector('svg.array-visualizer-svg');
        // if (existingSVG) {
        //     this._target.removeChild(existingSVG);
        // }
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute('width', this._width);
        svg.setAttribute('height', this._height);
        svg.setAttribute('class', 'array-visualizer-svg');

        return svg;
    }

    clearSVG() {
        if (this._svg) {
            while (this._svg.firstChild) {
                this._svg.removeChild(this._svg.firstChild);
            }
        }

        const background = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        background.setAttribute('x', 0);
        background.setAttribute('y', 0);
        background.setAttribute('width', this._width);
        background.setAttribute('height', this._height);
        background.setAttribute('fill', this._backgroundColor);  // Set background color to white
        this._svg.appendChild(background);  // Append background before drawing elements

    }

    // Visualization logic based on the set type
    startVisualFrame(){
        this.clearSVG();

        //clear min and max values
        this._min = this._minActive
        this._max = this._maxActive
        this._minActive = null
        this._maxActive = null
        this._seqNum = 0
        this._displayLength = this._activeLength
        this._activeLength = 8
    }

    visualize(arr, index) {

        const isMultipleArrays = Array.isArray(arr) && arr.every(item => Array.isArray(item));
        if( arr.length > this._activeLength) this._activeLength = arr.length

        arr = this.transformArray(arr)
        this.calculateMinMax(arr)
       
        index = index % arr.length
        //console.log('drawing', index)
        switch (this._type) {
            case 'horizontal':
                this.drawHorizontalLines(index, arr);
                break;
            case 'vertical':
                this.drawVerticalBars(index, arr);
                break;
            case 'numbers':
                this.drawNumericValues(index, arr);
                break;
            default:
                console.error('Unknown visualization type');
        }
        this._seqNum+=1
    }

    calculateMinMax(arr) {
        // Filter the array to include only numbers and numeric strings
        const numericValues = arr
            .filter(item => !isNaN(item) && item !== '' && item !== null)  // Filter out non-numeric values
            .map(item => Number(item));  // Convert numeric strings to numbers

        // Calculate min and max
        const min = Math.min(...numericValues)-.6;
        const max = Math.max(...numericValues)+.6;

        //apply if there is a new min or max
        if(this._minActive === null || min < this._minActive ) this._minActive = min
        if(this._maxActive === null || max > this._maxActive ) this._maxActive = max
    }

    transformArray(arr) {
        const replacements = {
            'O': -1, 'o': 1,
            'X': 0, 'x': 0,
            '1': 3,
            '2': 2,
            '3': 1,
            '*': 4,
            '^': 5
        };
        const rep = ['*','O','o','x','X','^']
        let isDrum = false
        for( let i in rep) isDrum = arr.includes(rep[i]) ? true : isDrum
        if( isDrum) return arr.map(item => replacements[item] !== undefined ? replacements[item] : item);
        else return arr
    }

    // Enable the visualizer: create the SVG and allow drawing
    enable(seqs = null) {
        if(seqs !== null) this.parent.seqToDraw = seqs
        this.parent.drawingLoop.start()
        if (this._enabled) return; // Already enabled

        this._enabled = true;
        this._svg = this.createSVG();
        this._target.appendChild(this._svg);
        this.parent.drawingLoop.start()
    }

    // Disable the visualizer: remove the SVG and prevent drawing
    disable(seqs = null) {
        if (!this._enabled) return; // Already disabled

        this._enabled = false;
        if (this._target && this._svg && this._target.contains(this._svg)) {
            this._target.removeChild(this._svg); // Remove the SVG
        }
        this._svg = null; // Clear reference


    }

    // Getters and Setters for dynamic properties

    // Visualization type
    get type() { return this._type;}
    set type(value) { this._type = value; }

    // Visualization color
    get color() { return this._color; }
    set color(value) { this._color = value; }

    // Size ratio
    get ratio() { return this._ratio; }
    set ratio(value) {
        this._ratio = value;
        this._height = this._width * this._ratio;
        this._svg.setAttribute('height', this._height);
    }

    // Number of rows (for numbers mode)
    get rows() { return this._rows;}
    set rows(value) {  this._rows = value; }

    // Number of columns (for numbers mode)
    get columns() {return this._columns;  }
    set columns(value) { this._columns = value; }

    get enabled() { return this._enabled; }
    set enabled(value) {
        if (value)  this.enable();
        else this.disable();
    }

    // Drawing methods
    drawHorizontalLines(index, arr, elementWidth= this.elementWidth) {
        // Normalize array values between 0 and 1
        arr = arr.map(x => (x - this._min) / (this._max - this._min));

        arr.forEach((value, i) => {
            if(typeof value === 'number' && !isNaN(value)) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", 'line');

                // Calculate the X positions (using a small offset for visual separation)
                const x1 = i * elementWidth/this._displayLength;
                const x2 = (i + 1) * elementWidth/this._displayLength-2;

                // Y position is proportional to the normalized value
                const y = this._height * (1 - value);  // Subtract from height to flip Y axis (0 at bottom)
                let width = this._height/(this._max-this._min) -2
                if(width < 2 ) width = 2
                // Set line coordinates
                line.setAttribute('x1', x1);
                line.setAttribute('x2', x2);
                line.setAttribute('y1', y);
                line.setAttribute('y2', y);

                // Set color based on active index
                if (index === i)  line.setAttribute('stroke', this._activeColor);  // Highlight current index
                else  line.setAttribute('stroke', this._color[this._seqNum]);
                
                // Set line thickness proportional to the available space
                line.setAttribute('stroke-width', width);  // Slightly smaller than the element width

                this._svg.appendChild(line);
            }
        });
    }


    drawVerticalBars(index, arr, elementWidth= this.elementWidth) {
    // Normalize array values between 0 and 1
    arr = arr.map(x => (x - this._min) / (this._max - this._min));

    // Clear the SVG before redrawing
    this.clearSVG();

    arr.forEach((value, i) => {
        if(typeof value === 'number' && !isNaN(value)) {
            const bar = document.createElementNS("http://www.w3.org/2000/svg", 'rect');

            // Calculate the X position for each bar
            const x = i * (elementWidth / this._displayLength);

            // Height of the bar (proportional to the normalized value)
            const barHeight = value * this._height;

            // Y position: Subtract barHeight from the total height to align the bars at the bottom
            const y = this._height - barHeight;
            let barWidth =  elementWidth / this._displayLength*.98
            barWidth = barWidth>4 ? barWidth-2 : barWidth

            // Set the bar's attributes
            bar.setAttribute('x', x);
            bar.setAttribute('y', y);  // Aligns bars at the bottom
            bar.setAttribute('width', barWidth);  // Slightly smaller than the element width for spacing
            bar.setAttribute('height', barHeight);  // Height proportional to normalized value

            // Set the fill color based on the active index
            if (index === i) {
                bar.setAttribute('fill', this._activeColor);
            } else {
                bar.setAttribute('fill', this._color[this._seqNum]);
            }

            this._svg.appendChild(bar);
        }
    });
}


    drawNumericValues(index, arr, elementWidth= this.elementWidth, elementHeight= this.elementHeight) {
        const itemsPerRow = Math.ceil(this.this._displayLength / this._rows);

        arr.forEach((value, i) => {
            const row = Math.floor(index / itemsPerRow);
            const col = i % itemsPerRow;
            const text = document.createElementNS("http://www.w3.org/2000/svg", 'text');
            text.setAttribute('x', col * elementWidth + elementWidth / 2);
            text.setAttribute('y', row * elementHeight + elementHeight / 2);
            if( index == i) text.setAttribute('fill', this._activeColor);
            else text.setAttribute('fill', this._color);
            text.setAttribute('font-size', '16');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('alignment-baseline', 'middle');
            text.textContent = Math.round(value);
            this._svg.appendChild(text);
        });
    }

    // Destroy the visualizer instance and clean up resources
    destroy() {
        if (this._target && this._svg && this._target.contains(this._svg)) {
            this._target.removeChild(this._svg);
        }

        // Nullify references
        this._array = null;
        this._target = null;
        this._svg = null;
    }
    addCCValue(val) {
        // Convert BigInt or other inputs explicitly to Number
        val = Number(val);

        // Clamp to MIDI CC range
        val = Math.max(0, Math.min(127, val));

        // Normalize if needed: 0–127 → 0–1
        const normalized = val / 127;

        // Push to buffer and trim
        this._array.push(normalized);
        if (this._array.length > this._columns) {
            this._array.shift();
        }

        this.startVisualFrame();
        this.visualize(this._array, this.index++);
    }
}


;

class GrooveGenerator {
  constructor(size = 16, baseValue = '16n') {
    this.baseValue = baseValue;
    this.strength = 1.0;
    this.timing = new Array(2).fill(0);
    this.velocity = new Array(2).fill(1.0);
    this.preset = null;
    this._humanizerV = new EMAHumanizer(0.9); // separate class below
    this._humanizerT = new EMAHumanizer(0.97); // separate class below
  }

  // Humanization via Exponential Moving Average (EMA)
  humanize(amount = 0.01, velocityRange = 0.1) {
    for (let i = 0; i < this.velocity.size; i++) {
      this.velocity[i] = 1 + this._humanizerV.next() * velocityRange;
    }
    for (let i = 0; i < this.timing.size; i++) {
      this.timing[i] = this._humanizerT.next() * amount;
    }
  }

  // Get groove value for a given subdivision and index
  get(subdivision, index) {
  	const quarter = Tone.Time('4n')
  	// console.log(subdivision,index)
  	if( subdivision==='32n') index = Math.floor(index/2)
  	else if( subdivision === '16n') index = index
  	else if( subdivision === '8n') index = index*2
  	else if( subdivision === '4n') index = index*4
  	else if( subdivision === '2n') index = index*8
  	else index = 0	
  	//console.log(index, this.velocity[index%this.velocity.length])
    const timingOffset = this.timing[index%this.timing.length] * this.strength * quarter*0.25
    const velocityScale = this.velocity[index%this.velocity.length] * this.strength
    return { 
      timing: timingOffset,
      velocity: velocityScale
    };
  }

  setPreset(presetName) {
    if (this.preset && this.preset[presetName]) {
      const { timing, velocity } = this.preset[presetName];
      this.timing = [...timing];
      this.velocity = [...velocity];
    } else {
      console.warn(`Preset "${presetName}" not found.`);
    }
  }

  // Convert notation like "16n", "8n" into step scaling
  _subdivisionToRatio(subdivision) {
    const base = parseInt(this.baseValue.replace('n', ''));
    const target = parseInt(subdivision.replace('n', ''));
    return base / target;
  }
}

// Helper class for smoothed randomness
class EMAHumanizer {
  constructor(smoothness = 0.9) {
    this.smoothness = smoothness;
    this.value = 0;
  }

  next() {
    const change = (Math.random() * 2 - 1) * (1 - this.smoothness);
    this.value = this.value * this.smoothness + change;
    return this.value;
  }
}

// Export a singleton instance
const Groove = new GrooveGenerator();
Groove;

// consoleManager.js

let consoleDiv = null;

function initConsole(parentElement) {

  if (consoleDiv) return consoleDiv; // already created

  const div = document.createElement('div');
  div.className = 'app-console';
  div.style.fontFamily = 'monospace';
  div.style.whiteSpace = 'pre-wrap';
  div.style.overflowY = 'auto';
  div.style.maxHeight = '200px';
  div.style.borderTop = '1px solid #444';
  div.style.padding = '4px';
  div.style.background = '#111';
  div.style.color = '#eee';

  parentElement = document.getElementById('Canvas');
  parentElement.appendChild(div);
  consoleDiv = div;
  return consoleDiv;
}

function deinitConsole() {
  if (!consoleDiv) return;

  const parent = consoleDiv.parentNode;
  if (parent) parent.removeChild(consoleDiv);
  consoleDiv = null;
}

function hasConsole() {
  // also handles the case where the parent was removed externally
  if (!consoleDiv) return false;
  if (!document.body.contains(consoleDiv)) {
    consoleDiv = null;
    return false;
  }
  return true;
}

function consoleWrite(msg) {
  if (!hasConsole()) return;

  const line = document.createElement('div');
  line.textContent = String(msg);
  consoleDiv.appendChild(line);
  consoleDiv.scrollTop = consoleDiv.scrollHeight;
}

// MonophonicTemplate.js

;
;
;


;






;

;

/**
 * Represents a Monophonic Synth
 * 
 * Base class for synths. Includes:
 * - methods for loading and saving presets
 * - connect/disconnect
 * - setting ADSR values for env and vcf_env objects
 * - show/hide gui, and custom createKnob function
 *
 * ## Working with presets
 * - all synths can load presets saved in the synth/synthPresets folder.
 *
 * To add preset functionality to a synth:
 * - create the preset file `synths/synthPresets/yourSynthPresets.json`
 *     - your preset file needs an open/close brace {} in it
 *
 * - make sure to:
 *     - import your presets and assign to this.presets 
 *     - name your synth correctly in its constructor
 *     - pass the gui into the synth constructor
 *     - add this optional code to the end of the constructor to load
 *         default preset:
 *     if (this.gui !== null) {
 *         this.initGui()
 *         this.hideGui();
 *         setTimeout(()=>{this.loadPreset('default')}, 500);
 *     }
 *
 * When saving presets you will need to manually download and copy
 * the preset file into synth/synthPresets/
 *
 * @constructor
 */
class MonophonicTemplate {
    constructor() {
        this.presets = {};
        this.synthPresetName = ""
        this.gui_elements = [];
        this.gui = null;
        this.guiContainer = null;
        this.guiHeight = 1
        this.layout = basicLayout
        this.poly_ref = null;
        this.super = null;
        this.type = 'Synth';
        this.name = "";
        this.presetsData = null;
        this.curPreset = null;
        this.backgroundColor = [10,10,10]
        this.snapshots = {}

        // Sequencer related
        this.seq = []; // Array of Seq instances
        this.prevEventTiming = 0
        this.turingMachine = null;
        this.callback = (i, time) => { }
        this.callbackLoop = new Tone.Loop((time) => {
            this.index = Math.floor(Theory.ticks / Tone.Time('16n').toTicks());
            this.callback(this.index, time = null)
        }, '16n').start()
        // Sequencer parameters
        this._subdivision = '8n'; // Local alias
        this._octave = 0;                // Local alias
        this._duration = .1;             // Local alias
        this._roll = 0.0;               // Local alias
        this._velocity = 100;            // Local alias
        this._orn =[0];            // Local alias
        this._lag = 0;            // Local alias
        this._pedal = 0;
        this._rotate = 0;   //actual permanent rotate amount, about the thoery.tick
        this._offset = null;   //internal variable for calculating rotation specifically for play
        this._transform = (x) => x;      // Local alias
        this.pianoRoll = null

        // Drawing
        this.seqToDraw = 0;
        this.drawing = new ArrayVisualizer(this, [0], 'Canvas', .2);
        this.drawingLoop = new Tone.Loop(time => {
            if (this.drawing.enabled === true) {
                this.drawing.startVisualFrame();
                if (this.seq[this.seqToDraw]) {
                    const seq = this.seq[this.seqToDraw];
                    if (seq.vals.length > 0) {
                        const index = Math.floor(Theory.ticks / Tone.Time(seq.subdivision).toTicks());
                        this.drawing.visualize(seq.vals, index);
                    }
                }
            }
        }, '16n').start();
    }

    /**
     * Populate this.presets with presets fetched from the server
     * Using the name in this.synthPresetName
     */
    async accessPreset(){      
        let presetData = {} 
        try {
            let response = await fetch('https://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/'+this.synthPresetName+'.json')
            let jsonString = ""
                if (!response.ok) {
                    // Handle HTTP errors (e.g., 404 Not Found, 500 Internal Server Error)
                    console.warn("Error accessing file");
                }else{
                    jsonString = await response.text();
                }
                presetData = JSON.parse(jsonString);
                //console.log("jsonString", jsonString);
                //console.log("presetData", presetData);
        } catch (error) {
            console.warn("Error parsing JSON:", error);
        }
        this.presets = await presetData;
        //this.loadPreset("default");
    }
    
    /**
     * Save a preset by name
     * @param {string} name - Name of the preset to save
     * @returns {void}
     * @example synth.savePreset('default')
     */
    //async savePreset (name) {
    savePreset (name) {
        const _preset = {};
        for (let element of Object.values(this.param)) {
            _preset[element.name] = element._value;
        }
        this.printToConsole(this.presets)
        // Update the presetsData in memory
        //console.log(this.presets);
        if (!this.presets[name]) {
            this.presets[name] = {};
        }
        this.presets[name] = _preset;

        //  try {
        //     const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/save', {
        //         method: 'POST', // Specify the HTTP method
        //         headers: {
        //             'Content-Type': 'application/json' // Tell the server we're sending JSON
        //         },
        //         body: JSON.stringify({ // Convert your data to a JSON string for the body
        //             name: this.synthPresetName,
        //             data: this.presets
        //     })
        //     });

        //     const result = await response.json(); // Parse the server's JSON response

        //     if (response.ok) {
        //         console.log(`Save successful: ${result.message}`);
        //         return result.success;
        //     } else {
        //         console.warn(`Save failed: ${result.message}`);
        //         // You might want to throw an error here or handle specific status codes
        //         return false;
        //     }
        // } catch (error) {
        //     console.error(`Error sending save request for '${name}':`, error);
        //     return false;
        // }

        //old preset code below
        
        
        this.printToConsole(`Preset saved under ${this.name}/${name}`);
    };

    async deletePreset (name) {
        // Update the presetsData in memory
        //console.log(this.presets);
        if (this.presets[name]) {
            delete this.presets[name]
            try {
                const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/save', {
                    method: 'POST', // Specify the HTTP method
                    headers: {
                        'Content-Type': 'application/json' // Tell the server we're sending JSON
                    },
                    body: JSON.stringify({ // Convert your data to a JSON string for the body
                        name: this.synthPresetName,
                        data: this.presets
                })
                });

                const result = await response.json(); // Parse the server's JSON response

                if (response.ok) {
                    this.printToConsole(`Delete successful: ${result.message}`);
                    return result.success;
                } else {
                    console.warn(`Delete failed: ${result.message}`);
                    // You might want to throw an error here or handle specific status codes
                    return false;
                }
            } catch (error) {
                console.error(`Error sending delete request for '${name}':`, error);
                return false;
            }
        }

        this.printToConsole(`Preset deleted  under ${this.name}/${name}`);
    };

    async downloadAllPresets() {
    try {
        const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/download_presets');
        if (!response.ok) {
            console.error('Failed to download presets:', response.status, response.statusText);
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'synth_presets.zip'; // The filename the user will see
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url); // Clean up the object URL
        this.printToConsole('Presets folder downloaded successfully.');
    } catch (error) {
        console.error('Error downloading presets:', error);
    }
}

    /**
     * Load a preset by name
     * @param {string} name - Name of the preset to load
     * @returns {void}
     * @example synth.loadPreset('default')
     */
    loadPreset(name) {
        this.curPreset = name;
        const presetData = this.presets[this.curPreset];

        if (presetData) {
          //console.log("Loading preset", this.curPreset, presetData);
          for (let name in presetData) {
            try {
              if (this.param[name]?.set) {
                this.param[name].set(presetData[name]);
              }
            } catch (e) {
              this.printToConsole(name, presetData[name], e);
            }
          }
          //console.log(this.param.vco_mix)
        } else {
            this.printToConsole("No preset of name ", name);
        }
    }

    logPreset() {
        const presetData = this.presets[this.curPreset];

        if (presetData) {

          let output = 'Parameters:\n';
          for (let key in presetData) {
              const param = presetData[key];
              if (Array.isArray(param)) {
                  const formattedArray = param.map((value) => {
                      if (typeof value === "number") {
                          return Number(value.toFixed(2)); // Limit to 2 decimals
                      }
                      return value; // Keep non-numbers unchanged
                  });

                  output += `${key}: [${formattedArray.join(", ")}]\n`; // Add the array to output
              }
              else if(typeof param === 'number') output += `${key}: ${param.toFixed(2)}\n`;
              else output += `${key}: ${param}\n`;
          }
          this.printToConsole(output);
        }

        else {
            this.printToConsole("No preset of name ", this.curPreset);
        }
    }

    /**
     * Console log all available presets
     * @returns {void}
     * @example synth.listPresets()
     */
    listPresets() {
        this.printToConsole("Synth presets", this.presets);
    }

    /**
     * Trigger the attack phase of the envelope
     * @param {number} val - MIDI note value
     * @param {number} vel - MIDI velocity value
     * @param {number} time - Time to trigger the attack
     * @returns {void}
     * @example synth.triggerAttack(60, 100, Tone.now())
     */
    triggerAttack(val, vel = 100, time = null) {
        vel = vel / 127;
        if (time) {
            this.frequency.setValueAtTime(Tone.Midi(val).toFrequency(), time);
            this.env.triggerAttack(time);
        } else {
            this.frequency.value = Tone.Midi(val).toFrequency();
            this.env.triggerAttack();
        }
    }

    /**
     * Trigger the release phase of the envelope
     * @param {number} val - MIDI note value
     * @param {number} time - Time to trigger the release
     * @returns {void}
     * @example synth.triggerRelease(60, Tone.now())
     * @example synth.triggerRelease(60)
     */
    triggerRelease(val, time = null) {
        if (time) this.env.triggerRelease(time);
        else this.env.triggerRelease();
    }

    /**
     * Trigger the attack and release phases of the envelope
     * @param {number} val - MIDI note value
     * @param {number} vel - MIDI velocity value
     * @param {number} dur - Duration of the attack and release
     * @param {number} time - Time to trigger the attack and release
     * @returns {void}
     * @example synth.triggerAttackRelease(60, 100, 0.01, Tone.now())
     * @example synth.triggerAttackRelease(60, 100, 0.01)
     */
    triggerAttackRelease(val, vel = 100, dur = 0.01, time = null) {
        //console.log('AR ',val,vel,dur,time)
        vel = vel / 127;
        if (time) {
            this.frequency.setValueAtTime(Tone.Midi(val).toFrequency(), time);
            this.env.triggerAttackRelease(dur, time);
        } else {
            this.frequency.value = Tone.Midi(val).toFrequency();
            this.env.triggerAttackRelease(dur);
        }
    }

    releaseAll(time = null){
        // console.log("releaseAll")
        if(this.env) this.env.triggerRelease(0,time)
    }

    generateParameters(paramDefinitions) {
        // console.log(paramDefinitions)
        const params = {};
        paramDefinitions.forEach((def) => {
            //console.log(def)
            const param = new Parameter(this,def);
            //console.log(param)
            params[def.name] = param;
        });
        //console.log(params)
        return params;
    }

    createAccessors(parent, params) {
        Object.keys(params).forEach((key) => {
            const param = params[key];
            let currentSeq = null; // Track active sequence

            if (typeof param.set !== 'function' || typeof param.get !== 'function') {
                throw new Error(`Parameter '${key}' does not have valid get/set methods`);
            }

            // Proxy handler to intercept method calls
            const proxyHandler = {
                get(target, prop,value=null) {
                    if (prop === 'sequence') return (valueArray, subdivision = '16n') => {
                        param.sequence(valueArray,subdivision)
                    };
                    if (prop === 'stop') return () => {
                        param.stop()
                    };
                    if (prop === 'set') return () => {
                        //console.log('set',target,prop,value)
                        const rawValue = (typeof value === 'function') ? value() : value.value;
                        if (currentSeq) {
                            currentSeq.dispose();
                            currentSeq = null;
                        }
                        //console.log(target,prop,rawValue)
                        param.set(value,null,false) 
                    };
                    if (prop === 'from') {
                      return (source, options = {}) => {
                        param.from(source, options);
                      };
                    }
                    return target.get(); // Return the current value
                },
                set(target, _, newValue) {
                    if (Array.isArray(newValue)) {
                        // console.log(target, newValue)
                        if (currentSeq) currentSeq.dispose();
                        currentSeq = new Seq(
                            parent,
                            newValue,
                             '4n',
                            'infinite',
                            0,
                            ((v, time) => param.set(Number(v[0]),null,false, time)) // Ensure time is passed
                        );
                    } else {
                        if (currentSeq) {
                            currentSeq.dispose();
                            currentSeq = null;
                        }
                        param.set(newValue);
                    }
                    return true;
                }
            };

            // Define the parameter with a Proxy
            Object.defineProperty(parent, key, {
                get: () => new Proxy(param, proxyHandler),
                set: (newValue) => {
                    if (Array.isArray(newValue)) {
                        param.sequence(newValue, this.seq[0].subdivision)
                    } else {
                        param.stop()
                        param.set(newValue);
                    }
                },
            });
        });
    }//accessors

    // Method to trigger the sequence in the Proxy
    startSequence(paramName, valueArray, subdivision = '16n') {
        const param = this.param[paramName];

        if (param ) {
            param.sequence(valueArray, subdivision);
        } else {
            console.warn(`Param ${paramName} has no sequence method or doesn't exist.`);
        }
    }

    stopSequence(paramName) {
        const param = this.param[paramName];
        if (param.seq ) {
            param.stop(); 
        } else {
            //console.warn(`Param ${paramName} has no stop method or doesn't exist.`);
        }
    }

    get() {
        let output = '\t' + this.name + ' Parameters:\n';
        for (let key in this.param) {
            const param = this.param[key];
            let value = param._value
            //console.log(value)
            if( typeof value === 'number') {
                if(value > 100) value = value.toFixed()
                else if( value > 1) value = value.toFixed(1)
                else value = value.toFixed(3)
            }
            output += `${param.name}: ${value}\n`;
        }
        this.printToConsole(output);
    }
    print(){ this.get()}

    printToConsole( data ){
        if( hasConsole ) consoleWrite( data )
        console.log(data)
    }

    /**
     * Set the ADSR values for the envelope
     * @param {number} a - Attack time
     * @param {number} d - Decay time
     * @param {number} s - Sustain level
     * @param {number} r - Release time
     * @returns {void}
     * @example synth.setADSR(0.01, 0.1, 0.5, 0.1)
     */
    setADSR(a, d, s, r) {
        if (this.env) {
            this.attack = a > 0.001 ? a : 0.001;
            this.decay = d > 0.01 ? d : 0.01;
            this.sustain = Math.abs(s) < 1 ? s : 1;
            this.release = r > 0.01 ? r : 0.01;
        }
    }

    /**
     * Set the ADSR values for the filter envelope
     * @param {number} a - Attack time
     * @param {number} d - Decay time
     * @param {number} s - Sustain level
     * @param {number} r - Release time
     * @returns {void}
     * @example synth.setFilterADSR(0.01, 0.1, 0.5, 0.1)
     */
    setFilterADSR(a, d, s, r) {
        if (this.vcf_env) {
            this.vcf_env.attack = a > 0.001 ? a : 0.001;
            this.vcf_env.decay = d > 0.01 ? d : 0.01;
            this.vcf_env.sustain = Math.abs(s) < 1 ? s : 1;
            this.vcf_env.release = r > 0.01 ? r : 0.01;
        }
    }

    /**
     * Initialize the GUI
     * @returns {void}
     * @example 
     * const gui = new p5(sketch, 'Canvas1');
     * synth.initGui(gui, 10, 10)
     */
    initGui(gui = null) {
        this.guiContainer = document.getElementById('Canvas');
        const sketchWithSize = (p) => sketch(p, { height: this.guiHeight });
        //console.log(this.guiHeight)
        this.gui = new p5(sketchWithSize, this.guiContainer);
        const layout = this.layout;
        //console.log(layout);

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

            let indexOffset = 0;

            groupedParams[groupType].forEach((param, index) => {
                const isGroupA = groupLayout.groupA.includes(param.name);
                const controlType = isGroupA ? groupLayout.controlTypeA : groupLayout.controlTypeB;
                const size = isGroupA ? groupLayout.sizeA : groupLayout.sizeB;

                // **Retrieve the current parameter value**
                const paramValue = param.get ? param.get() : param._value;

                if (Array.isArray(paramValue)) {
                    paramValue.forEach((value, i) => {
                        let xOffset = groupLayout.offsets.x * ((index + indexOffset) % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
                        let yOffset = groupLayout.offsets.y * Math.floor((index + indexOffset) / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));

                        const x = groupLayout.boundingBox.x + xOffset;
                        const y = groupLayout.boundingBox.y + yOffset;

                        this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color, i, value });
                        indexOffset++;
                    });
                } else {
                    let xOffset = groupLayout.offsets.x * ((index + indexOffset) % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
                    let yOffset = groupLayout.offsets.y * Math.floor((index + indexOffset) / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));

                    const x = groupLayout.boundingBox.x + xOffset;
                    const y = groupLayout.boundingBox.y + yOffset;

                    // Pass the **retrieved parameter value** to GUI
                    this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color, value: paramValue });
                }
            });
        });
        this.gui.setTheme(this.gui, 'dark' )
        this.gui.backgroundColor = this.backgroundColor
        //setTimeout(this.loadPreset('default'),1000)
        //setTimeout(this.gui.setTheme(this.gui, 'dark' ),1000)
    }

    /**
     * Initialize the GUI with NexusUI
     * @returns {void}
     * @example     
     * synth.initNexus()
     */
    initNexus(gui = null) {
        this.guiContainer = document.getElementById('Canvas');
        if (!this.guiContainer) {
            console.error('NexusUI container #Canvas not found in DOM');
            return;
        }
        
        // Track created labels for cleanup
        this.nexusLabels = [];
        
        // Flag to indicate NexusUI GUI is initialized (not p5)
        this.gui = 'nexus';
        this.isNexusGui = true;
        const layout = this.layout;
        
        if (!layout) {
            console.error('No layout defined for this synth');
            return;
        }
        
        this.printToConsole(`[initNexus] Initializing NexusUI GUI for ${this.name || 'synth'}`);

        // Group parameters by type
        const groupedParams = {};
        Object.values(this.param).forEach((param) => {
            if (!groupedParams[param.type]) groupedParams[param.type] = [];
            groupedParams[param.type].push(param);
        });

        // Create GUI for each group
        Object.keys(groupedParams).forEach((groupType) => {
            const groupLayout = layout[groupType];
            if (!groupLayout) {
                // console.log(`[initNexus] No layout for group: ${groupType}`);
                return;
            }
            if (groupType === 'hidden') return;

            let indexOffset = 0;

            groupedParams[groupType].forEach((param, index) => {
                const isGroupA = groupLayout.groupA.includes(param.name);
                const controlType = isGroupA ? groupLayout.controlTypeA : groupLayout.controlTypeB;
                const size = isGroupA ? groupLayout.sizeA : groupLayout.sizeB;

                // **Retrieve the current parameter value**
                const paramValue = param.get ? param.get() : param._value;

                // Calculate items per row safely (avoid division by zero)
                const itemsPerRow = groupLayout.offsets.x > 0 
                    ? Math.max(1, Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x))
                    : 1;

                // Extract optional layout settings
                const orientation = groupLayout.orientation || 'horizontal';
                const showValue = groupLayout.showValue || false;

                if (Array.isArray(paramValue)) {
                    paramValue.forEach((value, i) => {
                        let xOffset = groupLayout.offsets.x * ((index + indexOffset) % itemsPerRow);
                        let yOffset = groupLayout.offsets.y * Math.floor((index + indexOffset) / itemsPerRow);

                        const x = groupLayout.boundingBox.x + xOffset;
                        const y = groupLayout.boundingBox.y + yOffset;

                        this.createNexusElement(param, { x, y, size, controlType, color: groupLayout.color, i, value, orientation, showValue });
                        indexOffset++;
                    });
                } else {
                    let xOffset = groupLayout.offsets.x * ((index + indexOffset) % itemsPerRow);
                    let yOffset = groupLayout.offsets.y * Math.floor((index + indexOffset) / itemsPerRow);

                    const x = groupLayout.boundingBox.x + xOffset;
                    const y = groupLayout.boundingBox.y + yOffset;

                    // Pass the **retrieved parameter value** to GUI
                    this.createNexusElement(param, { x, y, size, controlType, color: groupLayout.color, value: paramValue, orientation, showValue });
                }
            });
        });
        
        // Apply theme colors to all Nexus elements
        if (this.backgroundColor) {
            document.body.style.backgroundColor = `rgb(${this.backgroundColor[0]}, ${this.backgroundColor[1]}, ${this.backgroundColor[2]})`;
        }
        
        this.printToConsole(`[initNexus] GUI initialization complete`);
    }
    
    /**
     * Hide/destroy the NexusUI GUI
     * @returns {void}
     */
    hideNexus() {
        // Destroy all NexusUI elements from parameters
        Object.values(this.param).forEach((param) => {
            if (param.guiElements && param.guiElements.length > 0) {
                param.guiElements.forEach((element) => {
                    if (element && element.destroy) {
                        element.destroy();
                    }
                });
                param.guiElements = [];
            }
        });
        
        // Remove all created labels
        if (this.nexusLabels) {
            this.nexusLabels.forEach((label) => {
                if (label && label.parentNode) {
                    label.parentNode.removeChild(label);
                }
            });
            this.nexusLabels = [];
        }
        
        this.gui = null;
        this.isNexusGui = false;
    }

    /**
     * Hide the GUI
     * @returns {void}
     */
    hideGui() {
        // Check if using NexusUI
        if (this.isNexusGui || this.gui === 'nexus') {
            this.hideNexus();
            return;
        }
        
        // Otherwise assume p5 instance
        if (this.gui && this.gui.remove) {
            this.gui.remove(); // Properly destroy p5 instance
            this.gui = null;
        }
    }

    /**
     * Show the GUI
     * @returns {void}
     */
    showGui() {
        this.initGui()
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
                value: param._value,
                curve: param.curve,
                size: size , // Scale size
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

            param.guiElements.push(this.gui.RadioButton({
                label: i ? param.labels[i] : param.name,
                radioOptions: param.radioOptions,
                value: param._value,
                x:x,
                y:y+10,
                accentColor: color,
                callback: (selectedOption) => param.set(selectedOption,i,true),
            }));
        } else if (controlType === 'dropdown') {
            // if (!Array.isArray(param.radioOptions) || param.radioOptions.length === 0) {
            //     console.warn(`Parameter "${param.name}" has no options defined for radioBox.`);
            //     return null;
            // }

            param.guiElements.push( this.gui.Dropdown({
                label: i ? param.labels[i] : param.name, 
                dropdownOptions: this.drumkitList,
                value: param._value,
                x:x,
                y:y+10,
                size:15,
                accentColor: color,
                callback:(x)=>{this.loadSamples(x)}
              }))
        } else if (controlType === 'text') {
            param.guiElements.push( this.gui.Text({
                label: param.max,
                value: param._value,
                x:x+2,
                y:y+10,
                border:0.01,
                textSize: size,
                accentColor: color,
                callback: (x) => {},
            }) );
        } else {
            this.printToConsole('no gui creation element for ', controlType)
        }
    }

    // Helper to convert RGB array to hex color string
    rgbToHex(colorArray) {
        if (!colorArray || !Array.isArray(colorArray)) return '#FFFFFF';
        const [r, g, b] = colorArray;
        return '#' + [r, g, b].map(x => {
            const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    // Create individual GUI element using NexusUI wrappers
    createNexusElement(param, { x, y, size, controlType, color, i=null, value, orientation='horizontal', showValue=false }) {
        // console.log('createNexusElement', param.name, { x, y, size, controlType, color, i, value });
        
        // Convert p5 percentage coordinates (0-100) to pixel coordinates
        const container = document.getElementById('Canvas');
        const containerWidth = container ? container.clientWidth : window.innerWidth;
        const containerHeight = container ? container.clientHeight : window.innerHeight;
        
        // Convert from p5 percentage (0-100) to pixels
        const pixelX = (x / 100) * containerWidth;
        const pixelY = (y / 100) * containerHeight;
        
        // Calculate dial size - use a fixed base size scaled by the size parameter
        // Target: ~50-70px dials that scale slightly with container
        const baseDialSize = 55;  // Base dial size in pixels
        const width = Math.round(baseDialSize * size);
        const height = width;  // Keep square for dials
        
        // Get the actual value to use
        const paramValue = value !== undefined ? value : 
            (i !== null && Array.isArray(param._value) ? param._value[i] : param._value);
        
        // Convert RGB array to hex for NexusUI
        const hexColor = Array.isArray(color) ? this.rgbToHex(color) : color;
        
        // Create label element for parameter name and store for cleanup
        const createLabel = (labelText, labelX, labelY, labelWidth) => {
            const label = document.createElement('div');
            label.textContent = labelText;
            label.style.cssText = `
                position: absolute;
                left: 0px;
                top: -18px;
                color: ${hexColor || '#AAAAAA'};
                font-family: monospace;
                font-size: 11px;
                pointer-events: none;
                user-select: none;
                text-align: center;
                width: ${labelWidth}px;
            `;
            return label;
        };
        
        if (controlType === 'knob') {
            const dial = new NexusDial(pixelX, pixelY, width, height, showValue);
            
            // IMPORTANT: Set min/max BEFORE value to ensure proper clamping
            dial.min = param.min || 0;
            dial.max = param.max || 1;
            
            // Validate and clamp value
            let safeValue = paramValue;
            if (typeof safeValue !== 'number' || isNaN(safeValue) || !isFinite(safeValue)) {
                safeValue = dial.min;
            }
            safeValue = Math.max(dial.min, Math.min(dial.max, safeValue));
            dial.value = safeValue;
            
            // Update value display with initial value
            if (showValue) {
                dial._updateValueDisplay(safeValue);
            }
            
            // Apply color if provided
            if (hexColor) {
                dial.colorize("accent", hexColor);
            }
            
            // Create label above the dial - add to the dial's container
            const labelText = i !== null && param.labels ? param.labels[i] : param.name;
            const label = createLabel(labelText, 0, 0, width);
            if (dial.elementContainer) {
                dial.elementContainer.appendChild(label);
            }
            if (this.nexusLabels) {
                this.nexusLabels.push(label);
            }
            
            // Set up the callback
            dial.mapTo((v) => param.set(v, i, true));
            
            param.guiElements.push(dial);
            
        } else if (controlType === 'fader') {
            // Faders are vertical sliders - make them taller than wide
            const sliderWidth = width * 0.5;
            const sliderHeight = width * 2;
            
            const slider = new NexusSlider(pixelX, pixelY, sliderWidth, sliderHeight);
            
            // IMPORTANT: Set min/max BEFORE value to ensure proper clamping
            slider.min = param.min || 0;
            slider.max = param.max || 1;
            
            // Validate and clamp value
            let safeValue = paramValue;
            if (typeof safeValue !== 'number' || isNaN(safeValue) || !isFinite(safeValue)) {
                safeValue = slider.min;
            }
            safeValue = Math.max(slider.min, Math.min(slider.max, safeValue));
            slider.value = safeValue;
            
            // Apply color if provided
            if (hexColor) {
                slider.colorize("accent", hexColor);
            }
            
            // Create label above the slider - add to the slider's container
            const labelText = i !== null && param.labels ? param.labels[i] : param.name;
            const label = createLabel(labelText, 0, 0, sliderWidth);
            if (slider.elementContainer) {
                slider.elementContainer.appendChild(label);
            }
            if (this.nexusLabels) {
                this.nexusLabels.push(label);
            }
            
            // Set up the callback
            slider.mapTo((v) => param.set(v, i, true));
            
            param.guiElements.push(slider);
            
        } else if (controlType === 'radioButton') {
            // Get the options from the parameter's radioOptions
            const options = param.radioOptions || [];
            if (options.length === 0) {
                console.warn(`RadioButton has no options for param: ${param.name}`);
                return;
            }
            
            // Calculate button dimensions - smaller for vertical, wider for horizontal
            const buttonWidth = orientation === 'vertical' ? 55 : Math.max(40, width);
            const buttonHeight = 22;
            
            const radioBtn = new NexusRadioButton(pixelX, pixelY, options, {
                buttonWidth,
                buttonHeight,
                orientation: orientation,  // Use layout orientation
                showLabel: true,
                label: param.name
            });
            
            // Apply color if provided
            if (hexColor) {
                radioBtn.colorize('accent', hexColor);
            }
            
            // Set initial value
            const currentValue = paramValue !== undefined ? paramValue : options[0];
            radioBtn.ccSet(currentValue);
            
            // Set up the callback
            radioBtn.mapTo((v) => param.set(v, i, true));
            
            param.guiElements.push(radioBtn);
        } else if (controlType === 'dropdown') {
            // Dropdown not yet implemented in NexusUI wrappers
            console.warn(`Dropdown controlType not yet supported with NexusUI for param: ${param.name}`);
        } else if (controlType === 'text') {
            // Text display not yet implemented in NexusUI wrappers
            console.warn(`Text controlType not yet supported with NexusUI for param: ${param.name}`);
        } else {
            this.printToConsole('no gui creation element for ', controlType)
        }
    }

    /**
     * Fast way to create a knob GUI element
     * @param {string} _label - Label for the knob
     * @param {number} _x - X position of the knob
     * @param {number} _y - Y position of the knob
     * @param {number} _min - Minimum value of the knob
     * @param {number} _max - Maximum value of the knob
     * @param {number} _size - Size of the knob
     * @param {string} _accentColor - Accent color of the knob
     * @param {function} callback - Callback function for the knob
     * @returns {object} - p5.gui knob object
     * @example
     * this.createKnob('Attack', 10, 10, 0.01, 1, 100, '#ff0000', (val) => {
     *    this.setADSR(val, this.gui.get('Decay').value(), this.gui.get('Sustain').value(), this.gui.get('Release').value());
     * });
     */


    createKnob(label, x, y, min, max, size, accentColor, callback) {
        return this.gui.Knob({
          label, min, max, size, accentColor,
          x: x + this.x, y: y + this.y,
          callback: callback,
          showLabel: 1, showValue: 0, // Assuming these are common settings
          curve: 2, // Adjust as needed
          border: 2 // Adjust as needed
        });
    }

    createNexusKnob(label, x, y, min, max, size, accentColor, callback) {
        // Convert p5 percentage coordinates (0-100) to pixel coordinates
        const container = document.getElementById('Canvas');
        const containerWidth = container ? container.clientWidth : window.innerWidth;
        const containerHeight = container ? container.clientHeight : window.innerHeight;
        
        const pixelX = ((x + (this.x || 0)) / 100) * containerWidth;
        const pixelY = ((y + (this.y || 0)) / 100) * containerHeight;
        
        const dial = new NexusDial(pixelX, pixelY, size, size);
        dial.min = min;
        dial.max = max;
        
        if (accentColor) {
            dial.colorize("accent", accentColor);
        }
        
        dial.mapTo(callback);
        
        return dial;
    }

    linkGui(name){
        //console.log(this.param)
        let objectIndex = 0
        Object.keys(this.param).forEach(key => {
          let subObject = this.param[key];
          if( subObject.guiElements[0] ) 
            subObject.guiElements[0].setLink( name + objectIndex )
          objectIndex++
        });
    }

    pushState(snap = null) {
      Object.keys(this.param).forEach(key => {
        const subObject = this.param[key];
        const value = snap ? snap[key]?.value : subObject._value;

        if (value !== undefined && subObject.guiElements?.[0]) {
          subObject.guiElements[0].set(value);
        }
      });
    }

    saveSnap(name) {
      this.snapshots[name] = {};

      Object.keys(this.param).forEach(key => {
        let subObject = this.param[key];
        this.snapshots[name][key] = {
          value: subObject._value // store raw value
        };
      });

      this.printToConsole(`Snapshot "${name}" saved.`);
    }

    loadSnap(name) {
      const snap = this.snapshots[name];
      if (!snap) {
        console.warn(`Snapshot "${name}" not found.`);
        return;
      }
      this.pushState(snap);
      this.printToConsole(`Snapshot "${name}" loaded.`);
    }

    listSnapshots() {
      this.printToConsole( Object.keys(this.snapshots) )
    }

    /**
     * Connects to Tone.js destination
     * @param {object} destination - Tone.js destination object
     * @returns {void}
     * @example 
     * const amp = new Tone.Gain(0.5).toDestination();
     * synth.connect(amp)
     */
    connect(destination) {
        if (destination.input) {
            this.output.connect(destination.input);
        } else {
            this.output.connect(destination);
        }
    }

    /**
     * Disconnects from Tone.js destination
     * @param {object} destination - Tone.js destination object
     * @returns {void}
     * @example
     * const amp = new Tone.Gain(0.5).toDestination();
     * synth.connect(amp)
     * synth.disconnect(amp)
     */
    disconnect(destination) {
        if (destination.input) {
            this.output.disconnect(destination.input);
        } else {
            this.output.disconnect(destination);
        }
    }

    /**
     * Sequences the provided array of notes and initializes a Tone.Loop with the given subdivision.
     *
     * @param {string} arr - The sequence of notes as a string.
     * @param {string} [subdivision] - The rhythmic subdivision for the loop (e.g., '16n', '8n').
     * @param {string} num (default 0) - the sequence number. Up to 10 sequences per instance.
     */
    sequence(arr, subdivision = '8n', num = 0, phraseLength = 'infinite') {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, arr, subdivision, phraseLength, num, this);
        } else {
            this.seq[num].sequence(arr, subdivision, phraseLength);
        }
        this.start(num);
    }

    /**
     * Plays the provided sequence array initializes a Tone.Loop with the given subdivision.
     *
     * @param {string} arr - The sequence of notes as a string.
     * @param {number} iterations - The the number of times to play the sequence
     * @param {string} [subdivision] - The rhythmic subdivision for the loop (e.g., '16n', '8n').
     * @param {string} num (default 0) - the sequence number. Up to 10 sequences per instance.
     */
    setSeq(arr, subdivision = '8n', num = 0) {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, arr, subdivision, 'infinite', num, this.parseNoteString.bind(this));
        } else {
            this.seq[num].setSeq(arr, subdivision);
        }
    }

    play(arr, subdivision = '8n', num = 0, phraseLength = 1) {
        if (!this.seq[num]) {
            // this.seq[num]._offset = 0//make sure the new one starts at the beginning as well
            this.seq[num] = new Seq(this, arr, subdivision, phraseLength, num, this.parseNoteString.bind(this));
            this.seq[num]._offset = 0
        } else {
            this.seq[num]._offset = 0//there is a time delay between this and where the index is, but i can set it such as this so that I know that is started
            this.seq[num].sequence(arr, subdivision, phraseLength);
        }
        this.start(num);

        // if (this.seq[num]) {
        //     this.seq[num].play(length);
        // }
    }

    expr(func, len = 32, subdivision = '16n', num = 0) {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, [], subdivision, 'infinite', num, this);
        }
        this.seq[num].expr(func, len, subdivision);
        this.start(num);
    }

    euclid(seq, hits=4, beats=8, rotate=0, subdivision = '8n', num = 0){
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, seq, subdivision, 'infinite', num, this.parseNoteString.bind(this));
        } else {
            this.seq[num].sequence(seq, subdivision, 'infinite');
        }
        this.seq[num].euclid(hits, beats,rotate);
        this.start(num);
    }

    // cantus: array of numbers or strings (e.g. [0,1,2,'.',3])
    // returns: array of numbers or same strings
    counterpoint(cantus, beamWidth = 16, w = {}) {
      const W = {
        step: 1.0,
        similar: 0.6,
        contrary: -0.3,
        oblique: 0.0,
        ...w
      };

      const baseOffsets = [2, -5, 5, -2];

      const sgn = (x) => (x === 0 ? 0 : (x > 0 ? 1 : -1));

      const toIndex = (d, baseOct = 4) => {
        if (d === "." || d === "_" || d === "?") return d;
        const n = (typeof d === "number") ? d : Number(d);
        if (!Number.isFinite(n)) return NaN;
        return n + 7 * baseOct;
      };

      const propose = (cIdx, lastCp) => {
        const out = [];
        for (const off of baseOffsets) {
          for (let k = -2; k <= 2; k++) out.push(cIdx + off + 7 * k);
        }
        if (Number.isFinite(lastCp)) out.sort((a, b) => Math.abs(a - lastCp) - Math.abs(b - lastCp));
        return out;
      };

      // ---- rules/terms take a ctx object ----
      // ctx = { i, cantusRaw, cIdx, cpIdx, path, W }

      const hardRules = [
        // Example: you can add more later (no-op now)
        function ruleCandidateIsFinite(ctx) {
          return Number.isFinite(ctx.cpIdx);
        },
        function ruleCandidateRepeatsNote(ctx) {
            if( Number.isFinite(ctx.cpIdx) )
                return ctx.cpIdx !== ctx.path.lastCp;
            else return true
        }
      ];

      const costTerms = [
        function costSmallMelodicMotion(ctx) {
          const lastCp = ctx.path.lastCp;
          if (!Number.isFinite(lastCp)) return 0;
          return ctx.W.step * Math.abs(ctx.cpIdx - lastCp);
        },

        function costPreferContrary(ctx) {
          const lastCp = ctx.path.lastCp;
          const lastC = ctx.path.lastC;
          if (!Number.isFinite(lastCp) || !Number.isFinite(lastC)) return 0;

          const cMove = sgn(ctx.cIdx - lastC);
          const cpMove = sgn(ctx.cpIdx - lastCp);

          if (cMove === 0 || cpMove === 0) return ctx.W.oblique;
          if (cMove === cpMove) return ctx.W.similar;
          return ctx.W.contrary;
        }
      ];

      // ---- beam search ----
      let beam = [{ seq: [], cost: 0, lastCp: null, lastC: null }];

      for (let i = 0; i < cantus.length; i++) {
        const cIdx = toIndex(cantus[i], 4);
        const nextBeam = [];

        for (const path of beam) {
          // pass-through tokens: CP gets same token, no scoring
          if (typeof cIdx === "string") {
            nextBeam.push({
              seq: path.seq.concat(cIdx),
              cost: path.cost,
              lastCp: path.lastCp,
              lastC: path.lastC
            });
            continue;
          }

          // bad cantus value: mirror raw input
          if (!Number.isFinite(cIdx)) {
            nextBeam.push({
              seq: path.seq.concat(cantus[i]),
              cost: path.cost,
              lastCp: path.lastCp,
              lastC: path.lastC
            });
            continue;
          }

          const candidates = propose(cIdx, path.lastCp);

          for (const cpIdx of candidates) {
            const ctx = { i, cantusRaw: cantus[i], cIdx, cpIdx, path, W };

            // hard rules
            let ok = true;
            for (const rule of hardRules) {
              if (!rule(ctx)) { ok = false; break; }
            }
            if (!ok) continue;

            // costs
            let add = 0;
            for (const term of costTerms) add += term(ctx);

            nextBeam.push({
              seq: path.seq.concat(cpIdx),
              cost: path.cost + add,
              lastCp: cpIdx,
              lastC: cIdx
            });
          }
        }

        nextBeam.sort((a, b) => a.cost - b.cost);
        beam = nextBeam.slice(0, beamWidth);
        if (beam.length === 0) return null;
      }

      return beam[0].seq;
    }

    /************************************************/


    set velocity(val) {
        this._velocity = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].velocity = val
        }
    }

    set orn(val) {
        this._orn = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].orn = val
        }
    }

    set octave(val) {
        this._octave = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].octave = val
        }
    }

    set duration(val) {//turn into duration
        this._duration = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].duration = val
        }
    }

    set subdivision(val) {
        this._subdivision = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].subdivision = val
        }
    }

    set transform(val) {
        this._transform = val
        if (typeof val !== 'function') {
            console.warn(`Transform must be a function. Received: ${typeof val}`);
            return;
        }
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].transform = val
        }
    }
//roll already exists in seq
    set roll(val) {
        this._roll = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].roll = val
        }
    }

    set rotate(val) {
        this._rotate = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].rotate = val
        }
    }

    set offset(val) {
        this._offset = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].offset = val
        }
    }

    set pianoRoll(val) {
        this._pianoRoll = val
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].pianoRoll = this._pianoRoll
        }
    }

    /**
     * Sets the transformation for the loop.
     * 
     * @param {string} transform - The transformation to apply.
     */
    setTransform(transform, num = 'all') {
        if (num === 'all') {
            for (let seq of this.seq) {
                if (seq) seq.setTransform(transform);
            }
        } else {
            if (this.seq[num]) this.seq[num].setTransform(transform);
        }
    }

    //pedaling
    pedal(state = "full"){
        this._pedal = state
        for (let seq of this.seq) {
                if (seq) seq.pedal(state);
            }
    }
    star(){
        this.synth.releaseAll()
    }
    clearPedal(){ 
        this._pedal = "off"
        this.star()
        for (let seq of this.seq) {
                if (seq) seq.clearPedal();
            }
    }
    lift(){ this.clearPedal() }

    get duration() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setDuration(value);
                    }
                }
                return true; // Indicate success
            }
        });
    }

    get velocity() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setVelocity(value);
                    }
                }
                return true;
            }
        });
    }

    get octave() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setOctave(value);
                    }
                }
                return true;
            }
        });
    }

    get subdivision() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setSubdivision(value);
                    }
                }
                return true;
            }
        });
    }

    get roll() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setRoll(value);
                    }
                }
                return true;
            }
        });
    }

    get rotate() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setRotate(value);
                    }
                }
                return true;
            }
        });
    }

    get transform() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setTransform(value);
                    }
                }
                return true;
            }
        });
    }

    start(num = 'all') {
        if (num === 'all') {
            for (let seq of this.seq) {
                if (seq) seq.start();
            }
            this.drawingLoop.start();
        } else {
            if (this.seq[num]) this.seq[num].start();
        }
    }

    stop(num = 'all') {
        if (num === 'all') {
            for (let seq of this.seq) {
                if (seq) seq.stop();
            }
            this.drawingLoop.stop();
        } else {
            if (this.seq[num]) this.seq[num].stop();
        }
    }

    turing(val){

    }

    // Visualizations

    draw(arr = this.drawing.array, target = this.drawing.target, ratio = this.drawing.ratio) {
        this.drawing = new ArrayVisualizer(arr, target, ratio);
    }

    getSeqParam(val, index) {
        //console.log(val, index,)
        if (Array.isArray(val)) return val[index % val.length];
        else return val;
    }

    parseNoteString(val, time, index, num=null) {
       //console.log(val,time,index, num, isNaN(Number(val[0])))
        let lag = this.getSeqParam(this.seq[num].lag, index);
        let subdivision = this.getSeqParam(this.seq[num].subdivision, index);
        let groove = Groove.get(subdivision,index);
        const timeOffset = val[1] * (Tone.Time(subdivision)) + lag + groove.timing
        let curEventTiming = val[1] + index

        if (val[0] === "~") {  return; }
        else if (val[0] === "*") {
            this.releaseAll(time + timeOffset)
            return;
        }

        
        

        //handle pedaling
        let pedal = this.seq[num]._pedal
        if( pedal == "legato" && curEventTiming > this.prevEventTiming ) this.releaseAll(time + timeOffset)
        if( pedal == "star" ) this.releaseAll(time + timeOffset)

        if (val[0] === ".") return;
        if (!val || val.length === 0 ) return '.';

        const usesPitchNames = /^[a-gA-G]/.test(val[0][0]);
        //console.log(usesPitchNames, val[0])
        let note = '';
        if (usesPitchNames) note = pitchNameToMidi(val[0]);
        else note = intervalToMidi(val[0], this.min, this.max);

        if (note < 0) return;
        if (note >127) {
            this.printToConsole("MIDI note ", note, "ignored")
            return;
        }

        let octave = this.getSeqParam(this.seq[num].octave, index);
        let velocity = this.getSeqParam(this.seq[num].velocity, index);
        let duration = this.getSeqParam(this.seq[num].duration, index);
        
        
        
        
        velocity = velocity * groove.velocity
        if( Math.abs(velocity)>256) velocity = 256
        //console.log('pa', note, octave, velocity, duration, time, timeOffset)
        
         if( pedal === "full" || pedal === "legato"){
            try {
                //console.log('trig', this.triggerAttackRelease, note + octave * 12, velocity,duration,time+timeOffset)
                this.triggerAttack(
                    note + octave * Theory.scaleRatios.length,
                    velocity,
                    time + timeOffset
                );
            } catch (e) {
                this.printToConsole('invalid pedal note', note + octave * 12, velocity, duration, time + val[1] * Tone.Time(subdivision) + lag);
            }
        } else {
            try {
                //console.log('trig', note + octave * 12, velocity,duration,time+timeOffset)
                this.triggerAttackRelease(
                    note + octave * Theory.scaleRatios.length,
                    velocity,
                    duration,
                    time + timeOffset
                );
            } catch (e) {
                this.printToConsole('invalid note', note + octave * 12, velocity, duration, time + val[1] * Tone.Time(subdivision) + lag);
            }
        }
        this.prevEventTiming = curEventTiming
    }
}


// MonophonicTemplate.js
/*

Base class for drum synths. Inherits from MonophonicTemplate and includes:
*/

;
;

/**
 * Base class for drum synths.
 * extends MonophonicTemplate
 */
class DrumTemplate extends MonophonicTemplate {

    constructor() {
      super()
      this.type = 'Drum'
  }

    /**
     * Function to trigger the drum sound.
     */
    trigger() {
      this.env.triggerAttackRelease(0.001);
    }

}


;
;
;

/**
 * Class representing a cymbal drum synth.
 * 
 * Synth architecture:
 * - 3 oscillators
 * - 3 noise sources
 * - 2 bandpass filters
 * - 2 amplitude envelopes
 * 
 * @extends DrumTemplate
 * @constructor
 * @param {GUI} gui - The p5 GUI instance to create GUI elements.
 */

class Cymbal extends DrumTemplate {
  
  constructor(gui = null) {
    super();

    this.gui = gui;
    this.name = "Cymbal";

    // Initialize oscillators
    this.oscillators = [];
    this.defaultFrequencies = [893, 2079, 1546];
    this.oscWaveforms = ['sine', 'square', 'triangle', 'sawtooth'];
    for (let i = 0; i < 3; i++) {
      const osc = new Tone.Oscillator({
        type: 'square'
      }).start();
      this.oscillators.push(osc);
    }

    // Initialize noise sources
    this.noises = [];
    this.noiseTypes = ['white', 'pink', 'brown'];
    for (let i = 0; i < 3; i++) {
      const noise = new Tone.Noise('white').start();
      this.noises.push(noise);
    }

    // Mix the oscillators and noise sources
    this.oscMixer = new Tone.Gain(1);
    this.oscillators.forEach(osc => osc.connect(this.oscMixer));
    this.noises.forEach(n => n.connect(this.oscMixer));

    // Filter out lower band and envelope
    this.lowerBandFilter = new Tone.Filter({ type: 'bandpass' });
    this.lowerBandEnv = new Tone.AmplitudeEnvelope({
      attack: 0.01, decay: 0.4, sustain: 0.0, release: 0.1
    });
    this.lowerBandVCA = new Tone.Gain(1);
    // Connect mixer to the lower band filter. Chain filter to envelope and VCA
    this.oscMixer.chain(this.lowerBandFilter, this.lowerBandEnv, this.lowerBandVCA);


    // Filter out upper band, split into two bands, and envelope
    this.upperBandFilter = new Tone.Filter({ type: 'bandpass' });
    this.upperBandFilter1 = new Tone.Filter({ type: 'bandpass' });
    this.upperBandFilter2 = new Tone.Filter({ type: 'bandpass' });
    this.upperBandEnv1 = new Tone.AmplitudeEnvelope({
      attack: 0.01, decay: 0.2, sustain: 0.0, release: 0.1
    });
    this.upperBandEnv2 = new Tone.AmplitudeEnvelope({
      attack: 0.01, decay: 0.3, sustain: 0.0, release: 0.1
    });
    this.upperBandVCA1 = new Tone.Gain(1);
    this.upperBandVCA2 = new Tone.Gain(1);
    // Connect mixer to the upper band filter. Chain filter to envelope and VCA
    this.oscMixer.connect(this.upperBandFilter);
    this.upperBandFilter.chain(this.upperBandFilter1, this.upperBandEnv1, this.upperBandVCA1);
    this.upperBandFilter.chain(this.upperBandFilter2, this.upperBandEnv2, this.upperBandVCA2);

    // Connect VCAs to the ouput node
    this.output = new Tone.Gain(1);
    this.lowerBandVCA.connect(this.output);
    this.upperBandVCA1.connect(this.output);
    this.upperBandVCA2.connect(this.output);

    this.output.toDestination();


    // Initialize GUI if provided
    if (this.gui !== null) {
      this.initGui();
    }
  }

  initGui(gui = this.gui) {
    if (gui === null) {
      console.error('Provide a GUI instance to create GUI elements');
      return;
    }

    for (let i = 0; i < 3; i++) {
      const osc = this.oscillators[i];
      const freq = gui.Knob({
        label: 'freq ' + i,
        mapto: osc.frequency,
        x: 40 + 8 * i,
        y: 12,
        size: 0.5,
        min: 20,
        max: 2500,
        curve: 2,
        value: this.defaultFrequencies[i]
      });

      const oscWaveform = gui.Radio({
        label: 'waveform ' + i,
        radioOptions: this.oscWaveforms,
        callback: (waveform) => {
          osc.type = waveform;
        },
        size: 1,
        x: 7,
        y: 12 + i * 20,
        horizontal: true,
        value: 'square'
      });
    }

    for (let i = 0; i < 3; i++) {
      const noise = this.noises[i];
      const noiseType = gui.Radio({
        label: 'noise ' + i,
        radioOptions: this.noiseTypes,
        callback: (type) => {
          noise.type = type;
        },
        size: 1,
        x: 90,
        y: 12 + i * 16,
        horizontal: true,
        value: 'white'
      });
    }

    const lowerBandFreq = gui.Knob({
      label: 'low band freq',
      mapto: this.lowerBandFilter.frequency,
      x: 20,
      y: 50,
      size: 0.5,
      min: 100,
      max: 5000,
      curve: 2,
      value: 579
    });
    const lowerBandQ = gui.Knob({
      label: 'low band Q',
      mapto: this.lowerBandFilter.Q,
      x: 30,
      y: 50,
      size: 0.5,
      min: 0.5,
      max: 5,
      curve: 2,
      value: 1.45
    });

    const lowerBandDecay = gui.Knob({
      label: 'low decay',
      mapto: this.lowerBandEnv.decay,
      x: 20,
      y: 70,
      size: 0.5,
      min: 0.01,
      max: 1,
      curve: 2,
      value: 0.4
    });
    const lowerBandRelease = gui.Knob({
      label: 'low release',
      mapto: this.lowerBandEnv.release,
      x: 30,
      y: 70,
      size: 0.5,
      min: 0.01,
      max: 1,
      curve: 2,
      value: 0.1
    });

    const upperBandFreq = gui.Knob({
      label: 'up band freq',
      mapto: this.upperBandFilter.frequency,
      x: 57,
      y: 50,
      size: 0.5,
      min: 1000,
      max: 10000,
      curve: 2,
      value: 5976
    });
    const upperBandQ = gui.Knob({
      label: 'up band Q',
      mapto: this.upperBandFilter.Q,
      x: 67,
      y: 50,
      size: 0.5,
      min: 0.5,
      max: 5,
      curve: 2,
      value: 1.4
    });

    const upperBandFreq1 = gui.Knob({
      label: 'up1 band freq',
      mapto: this.upperBandFilter1.frequency,
      x: 45,
      y: 60,
      size: 0.5,
      min: 1000,
      max: 10000,
      curve: 2,
      value: 6795
    });
    const upperBandFreq2 = gui.Knob({
      label: 'up2 band freq',
      mapto: this.upperBandFilter2.frequency,
      x: 70,
      y: 60,
      size: 0.5,
      min: 1000,
      max: 10000,
      curve: 2,
      value: 8735
    });
    const upperBandQ1 = gui.Knob({
      label: 'up1 band Q',
      mapto: this.upperBandFilter1.Q,
      x: 55,
      y: 60,
      size: 0.5,
      min: 0.5,
      max: 5,
      curve: 2,
      value: 1.39
    });
    const upperBandQ2 = gui.Knob({
      label: 'up2 band Q',
      mapto: this.upperBandFilter2.Q,
      x: 80,
      y: 60,
      size: 0.5,
      min: 0.5,
      max: 5,
      curve: 2,
      value: 0.67
    });

    const upperBandDecay1 = gui.Knob({
      label: 'up1 decay',
      mapto: this.upperBandEnv1.decay,
      x: 45,
      y: 70,
      size: 0.5,
      min: 0.01,
      max: 1,
      curve: 2,
      value: 0.2
    });
    const upperBandRelease1 = gui.Knob({
      label: 'up1 release',
      mapto: this.upperBandEnv1.release,
      x: 55,
      y: 70,
      size: 0.5,
      min: 0.01,
      max: 1,
      curve: 2,
      value: 0.1
    });
    const upperBandDecay2 = gui.Knob({
      label: 'up2 decay',
      mapto: this.upperBandEnv2.decay,
      x: 70,
      y: 70,
      size: 0.5,
      min: 0.01,
      max: 1,
      curve: 2,
      value: 0.3
    });
    const upperBandRelease2 = gui.Knob({
      label: 'up2 release',
      mapto: this.upperBandEnv2.release,
      x: 80,
      y: 70,
      size: 0.5,
      min: 0.01,
      max: 1,
      curve: 2,
      value: 0.1
    });

    // Trigger button for the cymbal sound
    const triggerButton = gui.Button({
      label: 'trig',
      callback: () => this.trigger(),
      size: 2,
      border: 20,
      borderColor: [255, 0, 0],
      x: 48,
      y: 36
    });
  }

  trigger() {
    this.lowerBandEnv.triggerAttackRelease(0.01);
    this.upperBandEnv1.triggerAttackRelease(0.01);
    this.upperBandEnv2.triggerAttackRelease(0.01);
  }
}


window.DaisiesPresets = {
  "default": {
    "vco_mix": 0.4096000000000002,
    "detune": 1.9940090000000001,
    "cutoff": 120.9999999999993,
    "envDepth": 1057.9999999999998,
    "Q": 2.047999999999998,
    "keyTracking": 1,
    "highPass": 46.178999999999824,
    "attack": 0.005,
    "decay": 0.1716759999999987,
    "sustain": 0.6723999999999998,
    "release": 1.6809999999999994,
    "vcfAttack": 0.005,
    "vcfDecay": 1.159696,
    "vcfSustain": 0.6888999999999997,
    "vcfRelease": 0.840999999999999,
    "lfo": 1.801999999999989,
    "vibrato": 0,
    "tremolo": 0,
    "blend": 0.1
  },
  "ether": {
    "vco_mix": 0.6724000000000004,
    "detune": 1.9940090000000001,
    "cutoff": 168.99999999999915,
    "envDepth": 1250,
    "Q": 4.231999999999999,
    "keyTracking": 1,
    "highpass": 46.178999999999824,
    "attack": 0.005,
    "decay": 0.1716759999999987,
    "sustain": 0.4224999999999996,
    "release": 3.8440000000000003,
    "vcfAttack": 0.005,
    "vcfDecay": 1.159696,
    "vcfSustain": 0.2915999999999996,
    "vcfRelease": 2.809,
    "lfo": 4.801999999999989,
    "vibrato": 0.007290000000000004,
    "tremolo": 0,
    "blend": 0
  },
  "tremPad": {
    "vco_mix": 0.4355999999999999,
    "detune": 1.009409,
    "cutoff": 1023.999999999999,
    "envDepth": 1200.5,
    "Q": 4.802,
    "keyTracking": 1,
    "highpass": 46.178999999999824,
    "attack": 0.5,
    "decay": 9.9006989999999995,
    "sustain": 1,
    "release": 20,
    "vcfAttack": 0.5,
    "vcfDecay": 10,
    "vcfSustain": 1,
    "vcfRelease": 20,
    "lfo": 1.7999999999999925,
    "vibrato": 0,
    "tremolo": 0.5329000000000006,
    "blend": 0
  },
  "chime": {
    "vco_mix": 0.19359999999999997,
    "detune": 1.9940090000000001,
    "cutoff": 624.9999999999986,
    "envDepth": 1300.5,
    "Q": 2.047999999999998,
    "keyTracking": 0.6723999999999998,
    "highpass": 46.178999999999824,
    "attack": 0.005,
    "decay": 0.28933062867908127,
    "sustain": 0.52089999999999965,
    "release": 1.457068975770812,
    "vcfAttack": 0.005,
    "vcfDecay": 0.6305912279255007,
    "vcfSustain": 0.04839999999999971,
    "vcfRelease": 0.7609756133823595,
    "lfo": 2.047999999999991,
    "vibrato": 0.0032400000000000007,
    "tremolo": 0.24010000000000026,
    "blend": 0.25,
    "shape1": 0.009999999999999943,
    "shape2": 0.3721000000000001,
    "pan": 0.19359999999999955,
    "blend": 0
  },
  "softKeys": {
    "vco_mix": 0.449365565217724,
    "detune": 1,
    "shape1": 0.404,
    "shape2": 0.15999999999999992,
    "cutoff": 720.9999999999994,
    "envDepth": 1416.6605199250457,
    "Q": 0,
    "keyTracking": 0.38999999999999946,
    "highPass": 512.6189999999995,
    "attack": 0.10083199999999999,
    "decay": 0.7932159999999964,
    "sustain": 0,
    "release": 11.249999999999993,
    "vcfAttack": 0.009009499999999976,
    "vcfDecay": 10,
    "vcfSustain": 1,
    "vcfRelease": 20,
    "lfo": 3.2019999999999893,
    "vibrato": 0,
    "tremolo": 0.640312423743285,
    "blend": 0
  }
};;

const paramDefinitions = (synth) => [
    {
        name: 'vcoBlend', type: 'vco', min: 0, max: 1, curve: 0.75,
        value: 0.5,
        callback: function(x,time) {
            if(time) synth.crossfade_constant.setValueAtTime(x,time)
            else synth.crossfade_constant.rampTo( x, .005)
        }
    },
    {
        name: 'detune', type: 'vco', min: 1, max: 2, curve: 0.5,
        value: 0.998,
        callback: function(x,time) {
            if(time) synth.detune_scalar.setValueAtTime(x,time)
            else synth.detune_scalar.rampTo( x, .005)}
    },
    {
        name: 'shape1', type: 'vco', min: .1, max: .5,
        value: 0.4,
        callback: function(x) {
            synth.shapeVco(0, x*2+1)
        }
    },
    {
        name: 'shape2', type: 'vco', min: .1, max: .5,
        value: 0.7,
        callback: function(x) {
            synth.shapeVco(1, x*2+1)
        }
    },
    {
        name: 'cutoff', type: 'vcf', min: 0, max: 10000, curve: 1,
        value: 500,
        callback: function(x,time) {
            if(time) synth.cutoffSig.setValueAtTime(x,time)
            else synth.cutoffSig.rampTo( x, .005)
        }
    },
    {
        name: 'envDepth', type: 'vcf', min: 0, max: 5000, curve: .75,
        value: 500,
        callback: function(x,time) {
            if(time) synth.vcf_env_depth.factor.setValueAtTime(x,time)
            else synth.vcf_env_depth.factor.rampTo( x, .005)
        }
    },
    {
        name: 'Q', type: 'vcf', min: 0, max: 20, curve: .5,
        value: 0,
        callback: function(x,time) {
            if(time) synth.vcf.Q.setValueAtTime(x,time)
            else synth.vcf.Q.rampTo( x, .005)
        }
    },
    {
        //TODO: Should this be hidden?
        name: 'keyTracking', type: 'vcf', min: 0, max: 1, curve: 1,
        value: 0.5,
        callback: function(x,time) {
            if(time) synth.keyTracker.setValueAtTime(x,time)
            else synth.keyTracker.rampTo( x, .005)
        }
    },
    {
        name: 'highPass', type: 'vcf', min: 10, max: 3000, curve: 2,
        value: 100,
        callback: function(x) {
            synth.setHighpass(x)
        }
    },
    {
        name: 'attack', type: 'env', min: 0.005, max: 0.5, curve: 2,
        value: 0.01,
        callback: function(x) {
            synth.env.attack = x
        }
    },
    {
        name: 'decay', type: 'env', min: 0.01, max: 10, curve: 2,
        value: 0.2,
        callback: function(x) {
            synth.env.decay = x
        }
    },
    {
        name: 'sustain', type: 'env', min: 0, max: 1, curve: 1,
        value: 0.5,
        callback: function(x) {
            synth.env.sustain = x
        }
    },
    {
        name: 'release', type: 'env', min: 0, max: 20, curve: 2,
        value: 1,
        callback: function(x) {
            synth.env.release = x
        }
    },
    {
        name: 'vcfAttack', type: 'env', min: 0.005, max: 0.5, curve: 2,
        value: 0.01,
        callback: function(x) {
            synth.vcf_env.attack = x
        }
    },
    {
        name: 'vcfDecay', type: 'env', min: 0.01, max: 10, curve: 2,
        value: 0.5,
        callback: function(x) {
            synth.vcf_env.decay = x
        }
    },
    {
        name: 'vcfSustain', type: 'env', min: 0, max: 1, curve: 2,
        value: 0.2,
        callback: function(x) {
            synth.vcf_env.sustain = x
        }
    },
    {
        name: 'vcfRelease', type: 'env', min: 0, max: 20, curve: 2,
        value: 1,
        callback: function(x) {
            synth.vcf_env.release = x
        }
    },
    {
        name: 'lfoRate', type: 'lfo', min: 0, max: 20, curve: 1,
        value: 3,
        callback: function(x,time) {
            if(time) synth.lfoModule.frequency.setValueAtTime(x,time)
            else synth.lfoModule.frequency.value = x
        }
    },
    {
        name: 'vibrato', type: 'lfo', min: 0, max: .1, curve: .5,
        value: 0,
        callback: function(x,time) {
            if(time) synth.pitch_lfo_depth.factor.setValueAtTime(x,time)
            else synth.pitch_lfo_depth.factor.rampTo( Math.pow(x,3), .01)
        }
    },
    {
        name: 'tremolo', type: 'lfo', min: 0, max: 1, curve: .5,
        value: 0,
        callback: function(x,time) {
            if(time) synth.amp_lfo_depth.factor.setValueAtTime(x,time)
            else synth.amp_lfo_depth.factor.rampTo( x, .005)
        }
    },
    {
        name: 'blend', type: 'lfo', min: 0, max: 1, curve: .5,
        value: 0,
        callback: function(x,time) {
            if(time) synth.crossfade_lfo_depth.factor.setValueAtTime(x,time)
            else synth.crossfade_lfo_depth.factor.rampTo( x, .005)
        }
    },
    // Fix pan in polyphony template
    // {
    //     name: 'pan', type: 'vca', min: 0, max: 1, curve: .5,
    //     callback: function(x) {
    //         {synth.super.pan(x)}
    //     }
    // },
]


window.daisyLayout = {

    "vco": {
      "color": [255, 165, 0],
      "boundingBox": { "x": 5, "y": 15, "width": 50, "height": 30 },
      "offsets": { "x": 11, "y": 30 },
      "groupA": ["type"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.75,
      "theme": "dark"
    },
    "vcf": {
      "color": [0, 165, 255],
      "boundingBox": { "x": 50, "y": 15, "width": 50, "height": 50 },
      "offsets": { "x": 10, "y": 30 },
      "groupA": ["cutoff"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 1,
      "sizeB": 0.6
    },
    "vca": {
      "color": [100, 50, 100],
      "boundingBox": { "x": 70, "y": 10, "width": 30, "height": 50 },
      "offsets": { "x": 11, "y": 10 },
      "groupA": ["level"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.6
    },
    "env": {
      "color": [165, 0, 255],
      "boundingBox": { "x": 5, "y": 50, "width": 50, "height": 60 },
      "offsets": { "x": 11, "y": 30 },
      "groupA": [],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.7
    },
    "lfo": {
      "color": [200, 200, 180],
      "boundingBox": { "x": 50, "y": 80, "width": 50, "height": 50 },
      "offsets": { "x": 11, "y": 30 },
      "groupA": ["rate"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.6
    }
  
};;

/*
Daisies
Polyphonic Subtractive Synthesizer

Daisy:
* 2 OmniOscillators(vco_1, vco_2)->shape->waveShapers->mixer->vcf->hpf->panner->vca
* frequency->frequency_scalar->(detuneSig for vco_2)->vco_1.frequency
* frequencyCV->frequency_scalar.factor
* cutoff control: cutoff, cutoff_vc, keyTracking, vcf_env_depth
* lfo->vca_lfo_depth-<output.factor, pitch_lfo_depth->
* lfo->pitch_lfo_depth->frequency_scalar.factor
* env->velocity_depth(Multiply)->vca.factor
* velocity(Signal)->velocity_depth.factor
Daisies:
* daisy->hpf->output
*/


;
;
;

;
;
;


class Daisy extends MonophonicTemplate{
	constructor(){
		super()
		this.presets = DaisiesPresets
		this.synthPresetName = "DaisiesPresets"
		//this.accessPreset()
		this.name = "Daisy"
		this.layout = daisyLayout

		this.frequency = new Tone.Signal(100)
		this.frequencyCV = new Tone.Signal()
		this.frequency_scalar = new Tone.Multiply(1)
		this.detune_scalar = new Tone.Multiply(1)
		this.vco_1 = new Tone.Oscillator({type:"square"}).start()
		this.vco_2 = new Tone.Oscillator({type:"square"}).start()
		this.frequency.connect(this.frequency_scalar)
		this.frequencyCV.connect(this.frequency_scalar.factor)
		this.frequency_scalar.connect(this.vco_1.frequency)
		this.frequency_scalar.connect(this.detune_scalar)
		this.detune_scalar.connect(this.vco_2.frequency)

		this.crossfade = new Tone.CrossFade()
		this.crossfade_lfo_depth = new Tone.Multiply()
		this.vco_1.connect( this.crossfade.a)
		this.vco_2.connect( this.crossfade.b)

		this.vcf = new Tone.Filter({type:'lowpass', rolloff:-24, Q:0, cutoff:3000})
		this.crossfade.connect(this.vcf)
		this.crossfade_constant = new Tone.Signal(0)
		this.crossfade_lfo_depth.connect(this.crossfade.fade)
		this.crossfade_constant.connect(this.crossfade.fade)

		this.vca = new Tone.Multiply()
		this.lfo_vca = new Tone.Multiply(1)
		this.lfo_vca_constant = new Tone.Signal(1)
		this.panner = new Tone.Panner(0)
		this.hpf = new Tone.Filter({type:'highpass', rolloff:-12, Q:0, cutoff:20})
		this.output = new Tone.Multiply(1)
		this.vcf.connect(this.lfo_vca)
		this.lfo_vca.connect(this.vca)
		this.lfo_vca_constant.connect(this.lfo_vca.factor)
		this.vca.connect(this.panner)
		this.panner.connect(this.hpf)
		this.hpf.connect(this.output)

		//envelopes
		this.env = new Tone.Envelope()
		this.velocitySig = new Tone.Signal(1)
		this.velocity_depth = new Tone.Multiply(1)
		this.env.connect(this.velocity_depth)
		this.velocity_depth.connect(this.vca.factor)
		this.velocitySig.connect(this.velocity_depth.factor)

		//vcf
		this.cutoffSig = new Tone.Signal(1000)
		this.cutoffSig.connect(this.vcf.frequency)
		this.cutoffCV = new Tone.Signal()
		this.cutoffCV.connect(this.vcf.frequency)
		this.keyTracker = new Tone.Multiply(.1)
		this.frequency.connect(this.keyTracker)
		this.keyTracker.connect(this.vcf.frequency)
		this.vcf_env = new Tone.Envelope()
		this.vcf_env_depth = new Tone.Multiply()
		this.vcf_env.connect(this.vcf_env_depth)
		this.vcf_env_depth.connect(this.vcf.frequency)

		this.lfoModule = new Tone.Oscillator(.5).start()
		this.vca_constant = new Tone.Signal(1)
		this.amp_lfo_depth = new Tone.Multiply(0)
		this.lfoModule.connect(this.amp_lfo_depth)
		this.amp_lfo_depth.connect(this.lfo_vca.factor)
		this.pitch_lfo_depth = new Tone.Multiply(0)
		this.lfoModule.connect(this.pitch_lfo_depth)
		this.lfoModule.connect(this.crossfade_lfo_depth)
		this.frequency_constant = new Tone.Signal(1)
		this.pitch_lfo_depth.connect(this.frequency_scalar.factor)
		this.frequency_constant.connect(this.frequency_scalar.factor)

		//no PWM to prevent errors when vco is not set to pulse
		this.pwm_lfo_depth = new Tone.Multiply()
		this.lfoModule.connect(this.pwm_lfo_depth)

		//this.pwm_lfo_depth.connect(this.vco_1.width)
		//this.pwm_lfo_depth.connect(this.vco_2.width)

		//for autocomplete
		this.autocompleteList = ["test", "triggerAttack"];

		this.paramDefinitions = paramDefinitions(this)
		this.param = this.generateParameters(this.paramDefinitions)
		this.createAccessors(this, this.param);
  }

  //TRIGGER METHODS
  triggerAttack = function(val, vel=100, time=null){
  	let freq = Theory.mtof(val)
  	vel = vel/127
    if(time){
      this.frequency.setValueAtTime(freq,time)
      this.env.triggerAttack(time)
      this.vcf_env.triggerAttack(time)
      this.velocitySig.setValueAtTime(Math.pow(vel,2),time)
    } else{
      this.frequency.value = freq
      this.env.triggerAttack()
      this.vcf_env.triggerAttack()
      this.velocitySig.value =Math.pow(vel,2) 
    }
  }
  triggerRelease = function(val, time=null){
    if(time){
      this.env.triggerRelease(time)
      this.vcf_env.triggerRelease(time)
    } else{
      this.env.triggerRelease()
      this.vcf_env.triggerRelease()
    }
  }
  triggerAttackRelease = function(val, vel=100, dur=0.01, time=null){
    //val = Tone.Midi(val).toFrequency()
    val = Theory.mtof(val)
    
    vel = vel/127
    if(time){
      this.frequency.setValueAtTime(val,time)
      this.env.triggerAttackRelease(dur,time)
      this.vcf_env.triggerAttackRelease(dur,time)
      this.velocitySig.setValueAtTime(Math.pow(vel,2),time)
    } else{
      this.frequency.value = val
      this.env.triggerAttackRelease(dur)
      this.vcf_env.triggerAttackRelease(dur)
      this.velocitySig.value =Math.pow(vel,2) 
    }
  }//attackRelease

  triggerRawAttack (freq, vel=1, time=null){
  	if(vel > 1) vel = 1
    if(time){
      this.frequency.setValueAtTime(freq,time)
      this.env.triggerAttack(time)
      this.vcf_env.triggerAttack(time)
      this.velocitySig.setValueAtTime(Math.pow(vel,2),time)
    } else{
      this.frequency.value = freq
      this.env.triggerAttack()
      this.vcf_env.triggerAttack()
      this.velocitySig.value =Math.pow(vel,2) 
    }
  }
  triggerRawRelease (time=null){
    if(time){
      this.env.triggerRelease(time)
      this.vcf_env.triggerRelease(time)
    } else{
      this.env.triggerRelease()
      this.vcf_env.triggerRelease()
    }
  }
  triggerRawAttackRelease (val, vel=1, dur=0.01, time=null){
    if(vel > 1) vel = 1
    if(time){
      this.frequency.setValueAtTime(val,time)
      this.env.triggerAttackRelease(dur,time)
      this.vcf_env.triggerAttackRelease(dur,time)
      this.velocitySig.setValueAtTime(Math.pow(vel,2),time)
    } else{
      this.frequency.value = val
      this.env.triggerAttackRelease(dur)
      this.vcf_env.triggerAttackRelease(dur)
      this.velocitySig.value =Math.pow(vel,2) 
    }
  }//attackRelease

  shapeVco(vcoNum, shape, amp=2, curve=1, isEven=1 ){
  	//console.log(vcoNum,shape, this.vco_1)
		let partials = []
	  for(let i=0;i<64;i++){
	    partials.push(1/Math.pow(i+1,curve)*16*(i%2<(2-isEven))*Math.abs(1-Math.sin(i*Math.PI*shape+Math.PI/2)*amp))
	  }
	  if(vcoNum === 0) {
	  	//console.log(shape, this.vco_1.partials)
	  	this.vco_1.partials = partials
	  	//console.log('post ', this.vco_1.partials)
	  }
	  else this.vco_2.partials = partials 
  }

  setHighpass(val){
  		this.hpf.frequency.value = val
  }
}

/********************
 * polyphony
 ********************/

class Daisies extends MonophonicTemplate{
  constructor(gui = null, num = 8){
  	console.log('Daisies is obsolete: use Polyphony(Daisy) instead')
		}
}


/****
 * In this file:
 * stepper( input:number, min:number, max:number, steps:array of [in:out] points)
 * expr( func, len=32 ): returns a custom array built using func
 * /

/*
    * Helper function for creating a custom curve for this.gui elements
    *
    * input : input of the stepper function
    * min: minimmum value of the element
    * max: maximmum value of the element
    * steps: array of arrays in format [[0,0], [a,b], .... [1,1]] where each point is a step in the curve
    * 
    * x values are how much the this.gui element is turned
    * y values are the level the elements are at internally
    */

function stepper(input, min, max, steps) {
    let range = max - min
    let rawval = (input - min) / range
    const gui_values = []
    const internal_values = []
    for (let i = 0; i < steps.length ; i++) {
        gui_values.push(steps[i][0])
        internal_values.push(steps[i][1])
    }
    let index = 0
    while(index < gui_values.length) {
        if (rawval < gui_values[index]) {
            let slope = (internal_values[index] - internal_values[index - 1])/(gui_values[index] - gui_values[index-1])
            let rawCurved = internal_values[index-1] + slope * (rawval - gui_values[index - 1]) 
            let realCurved = (rawCurved * range) + min
            //console.log('input value', input)
            //console.log('curved value', realCurved)
            return realCurved
        }
        index++
    }
    return max
}

/***
 * 
 */

function expr( func, len = 32 ){
  const arr = Array.from({ length: len }, (_, i) => func(i))
  return arr
}
 

/*
DatoDuo
Monophonic subtractive synth
Modeled after the DatoDuo
*/

;
;


// ;
;

/**
 * Class representing the DatoDuo monophonic subtractive synthesizer.
 * Extends the MonophonicTemplate class.
 */
class DatoDuo extends MonophonicTemplate {
  /**
   * Create a DatoDuo synthesizer.
   * @param {object} [gui=null] - The GUI object for controlling the synthesizer.
   */
  constructor (gui = null) {
    super()
    this.gui = gui
    this.presets = {};
		this.synthPresetName = "DatoDuoPresets"
		this.accessPreset()
    this.isGlide = false
    this.name = "DatoDuo"
    //console.log(this.name, " loaded, available preset: ", DatoDuoPresets)

    this.frequency = new Tone.Signal()
    this.tonePitchShift = new Tone.Multiply()
    this.sawPitchShift = new Tone.Multiply()
    this.pulseWav = new Tone.PulseOscillator().start()
    this.sawWav = new Tone.Oscillator({type:'sawtooth'}).start()
    this.toneMixer = new Tone.Multiply()
    this.sawMixer = new Tone.Multiply()
    this.cutoff = new Tone.Signal()
    this.vcf_env = new Tone.Envelope()
    this.filterDepth = new Tone.Multiply()
    this.filterMultiplier = new Tone.Multiply()
    this.filter = new Tone.Filter()
    this.velocity = new Tone.Signal(1)
    this.velocityMult = new Tone.Multiply(1)
    this.env = new Tone.Envelope()
    this.amp = new Tone.Multiply()
    this.output = new Tone.Multiply(0.05).toDestination()

    //this.scope = new Oscilloscope('Canvas3')

    //connect the initial signal to multipliers for pitch shift
    //connect those to the oscillators
    this.frequency.connect(this.tonePitchShift)
    this.tonePitchShift.connect(this.pulseWav.frequency)
    this.frequency.connect(this.sawPitchShift)
    this.sawPitchShift.connect(this.sawWav.frequency)
    this.rampTime = .004

    this.frequency.value = 500;
    this.tonePitchShift.factor.value = 1;
    this.sawPitchShift.factor.value = 1;

    //connect the oscillators to a mixer and add them together
    this.pulseWav.connect(this.toneMixer)
    this.toneMixer.connect(this.filter)
    this.sawWav.connect(this.sawMixer)
    this.sawMixer.connect(this.filter)

    this.toneMixer.factor.value = .25
    this.sawMixer.factor.value = .25

    //Connect the filter (VCF)
    this.vcf_env.connect(this.filterDepth)
    this.cutoff.connect(this.filter.frequency)
    this.filterDepth.connect(this.filter.frequency)

    this.cutoff.value = 1500
    this.filterDepth.factor.value = 5000
    this.vcf_env.attack = 0.02
    this.vcf_env.decay = 0.01
    this.vcf_env.sustain = .0
    this.vcf_env.release = 0.2
    this.filter.rolloff = -24
    this.filter.Q.value = 1

    //Connect the ASDR (VCA)
    this.filter.connect(this.amp)

    this.velocity.connect(this.velocityMult.factor)
    this.env.connect(this.velocityMult)
    this.velocityMult.connect(this.amp.factor)
    this.env.attack = 0.01
    this.env.delay = 0.1
    this.env.sustain = 0
    this.env.release = 0.9
    this.env.releaseCurve = 'cosine'

    //effects chain

    this.dist = new Tone.Distortion(0.9)
    this.crusher = new Tone.BitCrusher(2)
    this.delay = new Tone.FeedbackDelay()


    this.distgain = new Tone.Multiply(1)
    this.crushgain = new Tone.Multiply(1)
    this.delaygain = new Tone.Multiply(1)
    this.delayFilter = new Tone.Filter()
    this.lfo = new Tone.LFO("8n", 400, 2000)

    //distortion
    this.amp.connect(this.dist)
    this.dist.connect(this.distgain)
    this.distgain.connect(this.crusher)

    //bitcrusher
    //this.distout.connect(this.crushout)
    //this.distout.connect(this.crushgain)
    //this.crushgain.connect(this.crusher)
    this.crusher.connect(this.output)

    //delay
    //this.crushout.connect(this.delayout)
    this.crusher.connect(this.delaygain)
    this.delaygain.connect(this.delay)
    this.delay.connect(this.delayFilter)
    this.lfo.connect(this.delayFilter.frequency)
    this.delayFilter.connect(this.output)

    this.kick = "audio/drums-003.mp3"
    this.snare = "audio/snare.mp3"
    this.kickPlayer = new Tone.Sampler({
      urls: {
        C4: "drums-003.mp3"
      },
      baseUrl: "/m080/audio/"
    }).toDestination()
    this.snarePlayer = new Tone.Sampler({
      urls: {
        C4: "snare.mp3"
      },
      baseUrl: "/m080/audio/"
    }).toDestination()
    this.kickPlayer.volume.value = -12
    this.snarePlayer.volume.value = -18
    // this.kickPlayer.playbackRate = 1
    // this.snarePlayer.playbackRate = 1


    // if (this.gui !== null) {
    //     this.initGui()
    //     this.hideGui();
    //     setTimeout(()=>{this.loadPreset('default')}, 500);
    // }
  }

  //envelopes
  triggerAttack (freq, amp, time=null){
    amp = Math.pow(amp / 127,2);
    freq = Tone.Midi(freq).toFrequency()
    if(time){
      this.env.triggerAttack(time)
      this.vcf_env.triggerAttack(time)
      if (this.isGlide) {
        this.frequency.linearRampToValueAtTime(freq,this.rampTime+ time)
      }
      else {
        this.frequency.setValueAtTime(freq, time)
      }
      this.velocity.rampTo(amp,.03)
    } else{
      this.env.triggerAttack()
      this.vcf_env.triggerAttack()
      this.frequency.value = freq
      this.velocity.rampTo(amp,.03)
    }
  }
  triggerRelease (time=null){
    if(time) {
      this.env.triggerRelease(time)
      this.vcf_env.triggerRelease(time)
    }
    else {
      this.env.triggerRelease()
      this.vcf_env.triggerRelease()
    }
  }
  // Override triggerAttackRelease method
    triggerAttackRelease(freq, amp, dur = 0.01, time = null) {
      //console.log('ar', freq)
        amp = Math.pow(amp / 127,2);
        freq = Tone.Midi(freq).toFrequency();
        if (time) {
            this.env.triggerAttackRelease(dur, time);
            this.vcf_env.triggerAttackRelease(dur, time);
            this.velocity.setValueAtTime(amp, time)
            if (this.isGlide) {
                this.frequency.linearRampToValueAtTime(freq, this.rampTime + time);
            } else {
                this.frequency.setValueAtTime(freq, time);
            }
        } else {
            this.env.triggerAttackRelease(dur);
            this.vcf_env.triggerAttackRelease(dur);
            if (this.isGlide) {
                this.frequency.exponentialRamp(freq, this.rampTime);
            } else {
                this.frequency.value = freq;
            }
            this.velocity.rampTo(amp, 0.03);
        }
    }//attackRelease


  //parameter setters
  setADSR(a,d,s,r){
    this.env.attack = a>0.001 ? a : 0.001
    this.env.decay = d>0.01 ? d : 0.01
    this.env.sustain = Math.abs(s)<1 ? s : 1
    this.env.release = r>0.01 ? r : 0.01
  }
  setFilterADSR(a,d,s,r){
    this.vcf_env.attack = a>0.001 ? a : 0.001
    this.vcf_env.decay = d>0.01 ? d : 0.01
    this.vcf_env.sustain = Math.abs(s)<1 ? s : 1
    this.vcf_env.release = r>0.01 ? r : 0.01
  }
  /**
   * Sets the detune value for the synthesizer.
   * @param {number} detune - The detune value.
   */
  setDetune(detune){
    this.sawPitchShift.factor.value = detune
  }
  setPulsewidth(width) {
    this.pulseWav.width = width;
  }
  setOutputGain(out){
    this.output.factor.value = out
  }

  /**
   * Initializes the GUI controls for the synthesizer.
   * @param {object} [gui=this.gui] - The GUI object to use.
   */
  initGui(gui = this.gui) {
    this.gui = gui

    this.distortion_toggle =  this.gui.Knob({
      label:'Distortion',
      callback: x=>{
        this.dist.distortion = x
        this.distgain.factor.value = 1-(x*.4)
      },
      //mapto: this.dist.distortion,
      x: 85, y:20, size: 0.8,
      min:0, max:.9,
      link: 'dist'
    })
    this.distortion_toggle.accentColor = [51,145,219]
    this.dist.wet.value = 1

    this.crusher_toggle =  this.gui.Knob({
      label:'bitcrusher',
      callback: x=>{this.crusher.bits.value = Math.floor(x)},
      //mapto: this.crusher.bits,
      x: 90, y:50, size: 0.8,
      min:2, max:16,
      link: 'crusher'
    })
    this.crusher_toggle.accentColor = [46,152,99]
    this.crusher.wet.value = 1

    this.glide_toggle =  this.gui.Momentary({
      label:'Glide',
      callback: (x)=>{this.isGlide = x}, //IDK how to implemement this in class
      x: 15, y:20, size: 0.8,
      link: 'glide'
    })
    this.glide_toggle.accentColor = [51,145,219]

    this.delayControl = function(x) {
      this.delay.feedback.value = stepper(x, 0 , 1 , [[0,0], [0.02, 0], [0.8,0.6], [1,1]])
      this.delay.wet.value = stepper(x , 0, 1, [[0,0], [0.02, 0], [0.04, 1], [1,1]])
      this.delaygain.factor.value = stepper(x , 0, 1, [[0,0], [0.02, 0], [0.04, 0.3], [0.4, 0.5], [1,1]])
      this.lfo.amplitude.value = stepper(x , 0, 1, [[0,0], [0.5, 0], [0.7, 0.5], [1,1]])
    }

    this.delay_knob = this.gui.Knob({
      label:'Delay Control',
      callback: (x)=>{this.delayControl(x)},
      x: 10, y: 50, size:0.8,
      min:0.001, max: 1, curve: 1,
      showValue: false,
      link: 'delayknob'
    })
    this.delay_knob.accentColor = [49,48,55]
    this.delay_knob.set( 0.0001 )

    this.wave_fader = this.gui.Slider({
      label:'wave',
      x: 39, y: 10, size: 2,
      min:0, max: 1,
      callback: (x)=>{this.pulseWav.width.value = stepper(x, 0, 1, [[0,0], [0.4, 0.6], [1,1]])},
      orientation: 'vertical',
      showValue: false, 
      link: 'wave',
      border: 12
    })
    this.wave_fader.accentColor = [247, 5, 5]
    this.wave_fader.borderColor = [20, 20, 20]
    this.wave_fader.set(0.5)

    this.freq_fader = this.gui.Slider({
      label:'freq',
      //callback: (x)=>{this.cutoff.value = stepper(x, 200, 1200, [[0,0], [0.6, 0.8], [1,1]])},
      callback: (x)=>{
        this.filterDepth.factor.value = x
        this.cutoff.value = x
      },
      x: 49, y: 10, size: 2,
      min:50, max: 2500, curve: 2,
      orientation: 'vertical',
      showValue: false,
      link: 'freq',
      border: 12
    })
    this.freq_fader.accentColor = [247, 5, 5]
    this.freq_fader.borderColor = [20, 20, 20]
    this.freq_fader.set(700)

    this.release_fader = this.gui.Slider({
      label:'release',
      callback: (x)=>{ 
        this.env.decay = stepper(x, 0.1, 5, [[0,0], [0.8, 0.5], [1,5]])
        this.env.release = stepper(x, 0.1, 30, [[0,0], [0.8, 0.5], [1,5]])
        this.vcf_env.decay = stepper(x, 0.1, 5, [[0,0], [0.8, 0.5], [1,5]])
        this.vcf_env.release = stepper(x, 0.1, 30, [[0,0], [0.8, 0.5], [1,5]])
      },
      x: 59, y: 10, size: 2,
      min:0.1, max: 1.5,
      orientation: 'vertical',
      showValue: false,
      link: 'release',
      border: 12
    })
    this.release_fader.accentColor = [247, 5, 5]
    this.release_fader.borderColor = [20, 20, 20]
    this.release_fader.set(0.8)

    this.resonance_knob = this.gui.Knob({
      label:'res',
      callback: (x)=>{ this.filter.Q.value = x},
      x: 49.5, y: 86, size:.5,
      min:0.99999, max: 30, curve: 2,
      showValue: false,
      link: 'res'
    })
    this.resonance_knob.accentColor = [49,48,55]
    this.resonance_knob.set( 1 )

    this.detune_knob = this.gui.Knob({
      label:'detune',
      callback: x=>{
        this.sawPitchShift.factor.value = stepper(x,0.99999,2,[[0,0],[.25,.02],[.45,.49],[.55,.51],[.75,.98],[1,1]])/2
        //console.log(stepper(x,0.99999,2,[[0,0],[.25,.02],[.45,.49],[.55,.51],[.75,.98],[1,1]]))
      },
      //mapto: this.tonePitchShift.factor,
      x: 22, y: 50, size:.5,
      min:0.99999, max: 2, curve: 1,
      showValue: false,
      link: 'detune'
    })
    this.detune_knob.accentColor = [49,48,55]
    this.detune_knob.set( 1 )

    this.speaker_knob = this.gui.Knob({
      label:'gain',
      callback: x=>{this.output.factor.value = x},
      x: 78, y: 50, size:.5,
      min:0, max: 0.1, curve: 2,
      showValue: false,
      link: 'gain'
    })
    this.speaker_knob.accentColor = [49,48,55]
    this.speaker_knob.set( 0.05 )

    //trigger playback of the loaded soundfile

    this.kick_trigger = this.gui.Button({
      label:'kick',
      callback: ()=>{ this.kickPlayer.triggerAttack( 'C4')},
      size: 1, border: 20,
      x:30, y:80, size: 1,
      link: 'kick'
    })
    this.kick_trigger.accentColor = [20,20,20]

    this.snare_trigger = this.gui.Button({
      label:'snare',
      callback: ()=>{ this.snarePlayer.triggerAttack( 'C4')},
      size: 1, border: 20,
      x:70, y:80, size: 1,
      link: 'snare',
    })
    this.snare_trigger.accentColor = [20,20,20]

    this.gui_elements = [this.distortion_toggle, this.crusher_toggle, 
      this.glide_toggle, this.delay_knob, this.wave_fader, 
      this.freq_fader, this.release_fader, this.resonance_knob,
      this.detune_knob, this.speaker_knob, this.kick_trigger,
      this.snare_trigger]

  }


  initPolyGui(superClass, gui) {
    this.gui = gui
    this.super = superClass
    this.distortion_toggle =  this.gui.Toggle({
      label:'Accent',
      callback: (x)=>{this.super.set('dist.wet' , x)},
      x: 85, y:20, size: 0.8,
      link: 'dist'
    })
    this.distortion_toggle.accentColor = [51,145,219]
    this.super.set('dist.wet.value' , 0)

    this.crusher_toggle =  this.gui.Toggle({
      label:'bitcrusher',
      callback: (x)=>{this.super.set('crusher.wet' , x)},
      x: 90, y:50, size: 0.8,
      link: 'crusher'
    })
    this.crusher_toggle.accentColor = [46,152,99]
    this.super.set('crusher.wet.value',  0)

    this.glide_toggle =  this.gui.Toggle({
      label:'Glide',
      callback: (x)=>{this.super.set('isGlide' , x)},
      x: 15, y:20, size: 0.8,
      link: 'glide'
    })
    this.glide_toggle.accentColor = [51,145,219]

    this.delayControl = function(x) {
      this.super.set('delay.feedback.value' , stepper(x, 0 , 1 , [[0,0], [0.02, 0], [0.8,0.6], [1,1]]))
      this.super.set('delay.wet.value' , stepper(x , 0, 1, [[0,0], [0.02, 0], [0.04, 1], [1,1]]))
      this.super.set('delaygain.factor.value' , stepper(x , 0, 1, [[0,0], [0.02, 0], [0.04, 0.3], [0.4, 0.5], [1,1]]))
      this.super.set('lfo.amplitude.value' , stepper(x , 0, 1, [[0,0], [0.5, 0], [0.7, 0.5], [1,1]]))
    }

    this.delay_knob = this.gui.Knob({
      label:'Delay Control',
      callback: (x)=>{this.delayControl(x)},
      x: 10, y: 50, size:0.8,
      min:0.001, max: 1, curve: 1,
      showValue: false,
      link: 'delayknob'
    })
    this.delay_knob.accentColor = [49,48,55]
    this.delay_knob.set( 0.0001 )

    this.wave_fader = this.gui.Slider({
      label:'wave',
      x: 39, y: 10, size: 2,
      min:0, max: 1,
      callback: (x)=>{this.super.set('pulseWav.width.value' , stepper(x, 0, 1, [[0,0], [0.4, 0.6], [1,1]]))},
      orientation: 'vertical',
      showValue: false, 
      link: 'wave',
      border: 12
    })
    this.wave_fader.accentColor = [247, 5, 5]
    this.wave_fader.borderColor = [20, 20, 20]
    this.wave_fader.set(0.5)

    this.freq_fader = this.gui.Slider({
      label:'freq',
      //callback: (x)=>{this.cutoff.value = stepper(x, 200, 1200, [[0,0], [0.6, 0.8], [1,1]])},
      callback: (x)=>{
        this.super.set('filterDepth.factor.value' , x)
        this.super.set('cutoff.value' , x)
      },
      mapto: this.cutoff,
      x: 49, y: 10, size: 2,
      min:50, max: 2500, curve: 2,
      orientation: 'vertical',
      showValue: false,
      link: 'freq',
      border: 12
    })
    this.freq_fader.accentColor = [247, 5, 5]
    this.freq_fader.borderColor = [20, 20, 20]
    this.freq_fader.set(700)

    this.release_fader = this.gui.Slider({
      label:'release',
      callback: (x)=>{ 
        this.super.set('env.decay' ,stepper(x, 0.01, 1, [[0,0], [0.8, 0.5], [1,5]]))
        this.super.set('env.release' , stepper(x, 0.1, 25, [[0,0], [0.8, 0.5], [1,5]]))
        this.super.set('vcf_env.decay' , stepper(x, 0.01, 1, [[0,0], [0.8, 0.5], [1,5]]))
        this.super.set('vcf_env.release' , stepper(x, 0.1, 25, [[0,0], [0.8, 0.5], [1,5]]))
      },
      x: 59, y: 10, size: 2,
      min:0.1, max: 25,
      orientation: 'vertical',
      showValue: false,
      link: 'release',
      border: 12
    })
    this.release_fader.accentColor = [247, 5, 5]
    this.release_fader.borderColor = [20, 20, 20]
    this.release_fader.set(0.8)

    this.resonance_knob = this.gui.Knob({
      label:'res',
      callback: (x)=>{ this.super.set('filter.Q.value' , x)},
      x: 49.5, y: 86, size:.25,
      min:0.99999, max: 30, curve: 2,
      showValue: false,
      link: 'res'
    })
    this.resonance_knob.accentColor = [49,48,55]
    this.resonance_knob.set( 1 )

    this.detune_knob = this.gui.Knob({
      label:'detune',
      callback: x=>{
        this.super.set('tonePitchShift.factor' , stepper(x,0.99999,2,[[0,0],[.25,.02],[.45,.49],[.55,.51],[.75,.98],[1,1]]))
        console.log(stepper(x,0.99999,2,[[0,0],[.25,.02],[.45,.49],[.55,.51],[.75,.98],[1,1]]))
      },
      //callback: (x)=>{ this.super.set('tonePitchShift.factor' , x)},
      x: 22, y: 50, size:.25,
      min:0.99999, max: 2, curve: 1,
      showValue: false,
      link: 'detune'
    })
    this.detune_knob.accentColor = [49,48,55]
    this.detune_knob.set( 1 )

    this.speaker_knob = this.gui.Knob({
      label:'gain',
      callback: (x)=>{ this.super.set('output.factor' , x)},
      x: 78, y: 50, size:.25,
      min:0, max: 0.1, curve: 2,
      showValue: false,
      link: 'gain'
    })
    this.speaker_knob.accentColor = [49,48,55]
    this.speaker_knob.set( 0.05 )

    //sampler - beatpads

    this.kick_trigger = this.gui.Button({
      label:'kick',
      callback: ()=>{ this.kickPlayer.triggerAttack( 'C4')},
      size: 1, border: 20,
      x:30, y:80, size: 1,
      link: 'kick'
    })
    this.kick_trigger.accentColor = [20,20,20]

    this.snare_trigger = this.gui.Button({
      label:'snare',
      callback: ()=>{ this.snarePlayer.triggerAttack( 'C4')},
      size: 1, border: 20,
      x:70, y:80, size: 1,
      link: 'snare',
    })
    this.snare_trigger.accentColor = [20,20,20]
  }
}

const paramDefinitions = (synth) => [
  {
    name: "name",
    type: "input",
    value: 'Delay',
    max: 'Delay', default: 'Delay'
  },
  {
    name: "hicut",
    type: "none",
    min: 20,
    max: 10000,
    default: 100,
    curve: 2,
    callback: (value) => {
      synth.highpass.frequency.rampTo(value, .1);
    }
  },
  {
    name: "time",
    type: "param",
    min: 0.05,
    max: 1,
    default: 0.3,
    curve: 2,
    callback: (value) => {
      synth.setTime(value); // function should set delayL/R times based on width
    }
  },
  {
    name: "feedback",
    type: "param",
    min: 0,
    max: 1,
    default: 0.2,
    curve: 2,
    callback: (value) => {
      value = value/3
      synth.feedbackAmount = value
      if(synth.feedbackPath === 'pre') synth.feedbackGainPre.gain.rampTo( value,.1);
      if(synth.feedbackPath === 'post') synth.feedbackGainPost.gain.rampTo( value,.1);
    }
  },
  {
    name: "drive",
    type: "none",
    min: 0,
    max: 1,
    default: 0.5,
    curve: 2,
    callback: (value) => {
      synth.input.gain.rampTo( value,.1);
    }
  },
  {
    name: "damping",
    type: "param",
    min: 100,
    max: 8000,
    default: 1000,
    curve: 2,
    callback: (value) => {
      synth.dampingFilter.frequency.rampTo( value, .1);
    }
  },
  {
    name: "type",
    type: "param", // assuming a discrete selector for 'clean' / 'dirty'
    radioOptions: ["clean", "BBD", "tape", "fold", "tube"],
    default: "clean",
    callback: (value) => {
      synth.setType(value); // swap feedback routing or add coloration
    }
  },
  {
    name: "distortionType",
    type: "none",
    default: "tanh",
    callback: (value) => {
      if (value == 0.5) { return }
      synth.shaper.curve = synth.transferFunctions[value];
    }
  },
  {
    name: "width",
    type: "output",
    min: 0,
    max: 1,
    default: 0.1,
    curve: 3,
    callback: (value) => {
      synth.setWidth(value/2); // function adjusts L/R delay spread
    }
  },
  {
  name: "level",
  type: "output",
  min: 0,
  max: 1,
  default: .2,
  curve: 2,
  callback: (value) => {
    synth.shaperGain.gain.rampTo(value*1.5, .1);
  }
}
]


/*
Delay.js

[Input] 
  ├──▶ [Level Gain]
  │
  └──▶ [Stereo Split]        │
         ├─▶ [Delay L]       │
         │     └─▶ [FB Gain]─┤
         │            ▲      │
         │         [LPF]     │
         │            ▲      │
         │         (Feedback from Delay L)
         │
         └─▶ [Delay R]
               └─▶ [FB Gain]
                      ▲
                   [LPF]
                      ▲
               (Feedback from Delay R)
  ▼
[Width Control]
  └───▶ [Output]
  */


;
;
;
// ;
;
;

class Delay extends EffectTemplate {
  constructor(gui = null) {
    super();
    this.gui = gui;
    this.presets = {};
		this.synthPresetName = "DelayPresets"
		this.accessPreset()
    this.name = "Delay"
    this.layout = layout;
    this.backgroundColor = [0,0,50]
    this.transferFunctions = this.generateCurves()
    this.widthValue = 0
    this.centerDelayTime = .1
    this.feedbackPath = 'post'
    this.feedbackAmount = 0
    this.timeSmoothing = .1 

    this.types = {
      "clean": {
        "distortionType": "soft",
        "feedbackPath": "post",
        "hicut": "100",
        "timeSmoothing": 0.0
      },
      "BBD": {
        "distortionType": "diode",
        "feedbackPath": "pre",
        "hicut": "200",
        "timeSmoothing": 0.1
      },
      "tape": {
        "distortionType": "tube",
        "feedbackPath": "pre",
        "hicut": "150",
        "timeSmoothing": 0.5
      },
      "fold": {
        "distortionType": "triangleFold",
        "feedbackPath": "post",
        "hicut": "200",
        "timeSmoothing": 0.001
      },
      "ambient": {
        "distortionType": "tanh",
        "feedbackPath": "post",
        "hicut": "400",
        "timeSmoothing": 1
      },
      "tube": {
        "distortionType": "sigmoid",
        "feedbackPath": "pre",
        "hicut": "20",
        "timeSmoothing": 0.5
      }
    }

    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);

    // Controls
    this.shaperGain = new Tone.Gain(0.5);
    this.shaper = new Tone.WaveShaper(this.transferFunctions['tanh']);
    this.highpass = new Tone.Filter({type:'highpass', rolloff:-12,Q:0,frequency:100})
    this.feedbackGainPre = new Tone.Gain(0);
    this.feedbackGainPost = new Tone.Gain(0);
    this.dampingFilter = new Tone.Filter(1000, 'lowpass');

    // Delay times
    const baseTime = .1; // in seconds
    const width = 0;
    const offset = baseTime * width * 0.3; // 30% offset for stereo spread

    this.delayL = new Tone.Delay(.1,1.5);
    this.delayR = new Tone.Delay(.1,1.5);

    this.input.connect(this.highpass)
    this.highpass.connect(this.shaper)
    this.shaper.connect(this.shaperGain)
    this.shaperGain.connect(this.dampingFilter)
    // Feedback path
    this.feedbackGainPre.connect(this.dampingFilter);
    this.feedbackGainPost.connect(this.dampingFilter);
    this.dampingFilter.fan(this.delayL, this.delayR); // feedback returns to both delays

    this.delayL.connect(this.feedbackGainPre);
    this.delayR.connect(this.feedbackGainPre);
    this.delayL.connect(this.feedbackGainPost);
    this.delayR.connect(this.feedbackGainPost);

    // Routing
    this.splitter = new Tone.Split();
    this.merger = new Tone.Merge();

    this.dampingFilter.connect(this.splitter);
    this.splitter.connect(this.delayL,0,0);
    this.splitter.connect(this.delayR,1,0);

    this.delayL.connect(this.merger,0,0);
    this.delayR.connect(this.merger,0,1);

    this.merger.connect(this.output);

    // Parameter definitions
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    this.createAccessors(this, this.param);
    this.autocompleteList = this.paramDefinitions.map(def => def.name);
    this.presetList = Object.keys(this.presets)
  }

  generateCurves(resolution = 1024) {
    const curves = {};

    // Helper
    const makeCurve = (fn) => {
      const curve = new Float32Array(resolution);
      for (let i = 0; i < resolution; i++) {
        const x = (i / (resolution - 1)) * 2 - 1; // from -1 to +1
        curve[i] = fn(x);
      }
      return curve;
    };

    curves.soft = makeCurve(x => x / (1 + Math.abs(x)));
    curves.tanh = makeCurve(x => Math.tanh(x));
    curves.hard = makeCurve(x => Math.max(-0.6, Math.min(0.6, x)));
    curves.fold = makeCurve(x => Math.sin(8 * x));
    curves.tube = makeCurve(x => (x < 0 ? Math.tanh(3 * x) : Math.pow(x, 0.6)));
    curves.arctangent = makeCurve(x => Math.atan(x * 3) / Math.atan(3));
    curves.sigmoid = makeCurve(x => 2 / (1 + Math.exp(-3 * x)) - 1);
    curves.triangleFold = makeCurve(x => 1 - 2 * Math.abs(Math.round(x) - x));
    curves.wrap = makeCurve(x => ((x * 2 + 1) % 2) - 1);
    curves.diode = makeCurve(x => x < 0 ? 0.3 * x : x);
    curves.parabias = makeCurve(x => x < 0 ? x : x - x * x);
    curves.step8 = makeCurve(x => Math.round(x * 8) / 8);
    curves.cubic = makeCurve(x => x - (1 / 3) * Math.pow(x, 3));
    curves.supersine = makeCurve(x => Math.sin(x * Math.PI * 0.5));
    curves.root = makeCurve(x => Math.sign(x) * Math.sqrt(Math.abs(x)));

    return curves;
  }

  setTime(seconds) {
    this.centerDelayTime = seconds
    let timeL = this.centerDelayTime * (1+this.widthValue);
    let timeR = this.centerDelayTime * (1-this.widthValue);
    if(timeL < 0 )timeL = 0
    if(timeR < 0 )timeR = 0
    this.delayL.delayTime.rampTo( timeL, this.timeSmoothing)
    this.delayR.delayTime.rampTo( timeR, this.timeSmoothing)
  }

  setWidth(value) {
    this.widthValue = value
    this.setTime(this.centerDelayTime)
  }

  setType = function(typeName) {
    const typeDef = this.types[typeName];
    if (!typeDef) return;

    // Set distortion curve
    if (typeDef.distortionType && this.transferFunctions[typeDef.distortionType]) {
      this.shaper.curve = this.transferFunctions[typeDef.distortionType];
    }

    // Set feedback path routing (if implemented)
    if (typeDef.feedbackPath) {
      this.feedbackPatch = typeDef.feedbackPath; // You must define this function
      this.feedbackGainPre.gain.value = 0
      this.feedbackGainPost.gain.value = 0
      this.feedback = this.feedbackAmount*3
    }

    // Set highpass (hicut) filter
    if (typeDef.hicut) {
      this.highpass.frequency.rampTo(parseFloat(typeDef.hicut), 0.1);
    }

    // Set smoothing when changing delay times
    if (typeDef.timeSmoothing) {
      this.timeSmoothing = parseFloat(typeDef.timeSmoothing)
    }

    // Optional: store current type
    this.currentType = typeName;
  };
}

/*
Diffuseur

convolution reverb
* input->eq3->convolver->output

methods:
- load(url) loads an IR
- filterIR: applies a lowpass to the IR, destructive
- highpassIR: applies a highpass to the IR, destructive
- stretchIR: stretches the IR
- ampIR: amplifies the IR into a softclipper
- setEQ(low,mid,hi) in dB
- setEQBand(low,hi)

properties:
- gain.factor.value
*/

;
;

class Diffuseur {
  constructor(gui = null) {
    this.gui = gui;
    this.input = new Tone.Multiply(1);
    this.eq = new Tone.EQ3
    this.convolver = new Tone.Convolver();
    this.output = new Tone.Multiply(1);
    // Buffer
    this.buffer = null;
    // Audio connections
    this.input.connect(this.eq);
    this.eq.connect( this.convolver);
    this.convolver.connect(this.output);

    this.sampleFiles = {
          plate: './audio/plate_reverb.mp3',
          spring: './audio/spring_reverb.mp3',
          hall:   './audio/hall_reverb.mp3',
          ampeg: './audio/ampeg_amp.mp3',
          marshall: './audio/marshall_amp.mp3',
          vox:   './audio/voxAC30_amp.mp3',
          dreadnought: './audio/dreadnought_guitar.mp3',
          taylor: './audio/taylor_guitar.mp3',
          guitar:   './audio/custom_guitar.mp3',
          bell3:  'berklee/bell_mallet_2.mp3',
          horn: 'berklee/casiohorn2.mp3',
          chotone:  'berklee/chotone_c4_!.mp3',
          voice:  'berklee/femalevoice_aa_Db4.mp3',
          kalimba:  'berklee/Kalimba_1.mp3',
          dreamyPiano:  'salamander/A5.mp3',
          softPiano:  'salamander/A4.mp3',
          piano:  'salamander/A3.mp3',
          casio: 'casio/C2.mp3'
        }
  }

  load(url = null) {
    if(url === null){
      // Create a file input element programmatically
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*'; // Accept only audio files

        // Handle file selection
        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) {
                console.log("No file selected");
                return;
            }

            // Use FileReader to read the file as a Data URL
            const fileReader = new FileReader();
            fileReader.onload = () => {
                this.buffer = new Tone.Buffer(fileReader.result)
                this.convolver.buffer = this.buffer
                console.log("Audio loaded into diffuseur");
                return
            };
            fileReader.readAsDataURL(file);
            
        };

        // Trigger the file dialog
        fileInput.click();
    }

    // If the `url` is a number, treat it as an index into the `sampleFiles` object
    if (typeof url === 'number') {
        // Convert the keys of the `sampleFiles` object to an array
        const fileKeys = Object.keys(this.sampleFiles);
        url = Math.floor(url) % fileKeys.length; // Calculate a valid index
        url = fileKeys[url]; // Reassign `url` to the corresponding filename
    }

    // Check if the `url` exists in `sampleFiles`
    if (url in this.sampleFiles) {
        console.log(`Diffuseur loading ${url}`);
        this.sample = url; // Store the selected sample
    } else {
        console.error(`The sample "${url}" is not available.`);
        return;
    }

    // Load the buffer and assign it to `this.buffer` and `this.convolver.buffer`
    return new Promise((resolve, reject) => {
        new Tone.Buffer(this.sampleFiles[url], (buffer) => {
            this.buffer = buffer;
            this.convolver.buffer = buffer;
            resolve();
        }, reject);
    });
}


  async filterIR(filterFreq) {
    if (!this.buffer) {
      console.error('Buffer not loaded.');
      return;
    }
    
    const context = Tone.getContext().rawContext;
    const duration = this.buffer.duration;
    const offlineContext = new OfflineAudioContext(2, duration * context.sampleRate, context.sampleRate);
    
    // Use the buffer directly from Tone.Buffer
    const decodedData = this.buffer.get();

    const source = offlineContext.createBufferSource();
    source.buffer = decodedData; // Use the buffer directly.
    
    // Example transformation: apply a filter (this could be more complex, including stretching)
    const filter = offlineContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    
    source.connect(filter);
    filter.connect(offlineContext.destination);
    
    source.start(0);
    
    return new Promise((resolve, reject) => {
      offlineContext.startRendering().then((renderedBuffer) => {
        // Use the rendered buffer as a new Tone.Buffer
        const newBuffer = new Tone.Buffer(renderedBuffer);
        this.buffer = newBuffer
        this.convolver.buffer = newBuffer; // Load it into the convolver
        resolve();
      }).catch(reject);
    });
  }//filter

  async stretchIR(stretchAmt) {
    if (!this.buffer) {
      console.error('Buffer not loaded.');
      return;
    }
    
    const context = Tone.getContext().rawContext;
    const duration = this.buffer.duration;
    const offlineContext = new OfflineAudioContext(2, duration * stretchAmt * context.sampleRate, context.sampleRate);
    
    // Use the buffer directly from Tone.Buffer
    const decodedData = this.buffer.get();

    const source = offlineContext.createBufferSource();
    source.buffer = decodedData; // Use the buffer directly.

    // Apply time-stretching by adjusting the playback rate
    source.playbackRate.value = 1/stretchAmt; // Adjust the playback rate based on the stretchVal
    source.connect(offlineContext.destination);
    source.start(0);
    
    return new Promise((resolve, reject) => {
      offlineContext.startRendering().then((renderedBuffer) => {
        // Use the rendered buffer as a new Tone.Buffer
        const newBuffer = new Tone.Buffer(renderedBuffer);
        this.buffer = newBuffer
        this.convolver.buffer = newBuffer; // Load it into the convolver
        resolve();
      }).catch(reject);
    });
  }//stretch

  async highpassIR(filterFreq) {
    if (!this.buffer) {
      console.error('Buffer not loaded.');
      return;
    }
    
    const context = Tone.getContext().rawContext;
    const duration = this.buffer.duration;
    const offlineContext = new OfflineAudioContext(2, duration * context.sampleRate, context.sampleRate);
    
    // Use the buffer directly from Tone.Buffer
    const decodedData = this.buffer.get();

    const source = offlineContext.createBufferSource();
    source.buffer = decodedData; // Use the buffer directly.
    
    // Example transformation: apply a filter (this could be more complex, including stretching)
    const filter = offlineContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = filterFreq;
    
    source.connect(filter);
    filter.connect(offlineContext.destination);
    
    source.start(0);
    
    return new Promise((resolve, reject) => {
      offlineContext.startRendering().then((renderedBuffer) => {
        // Use the rendered buffer as a new Tone.Buffer
        const newBuffer = new Tone.Buffer(renderedBuffer);
        this.buffer = newBuffer
        this.convolver.buffer = newBuffer; // Load it into the convolver
        resolve();
      }).catch(reject);
    });
  }//highpass

  //NOTE: changing amp and waveshaping never worked as expected
  // async ampIR(gainVal) {
  //   if (!this.buffer) {
  //     console.error('Buffer not loaded.');
  //     return;
  //   }
    
  //   const context = Tone.getContext().rawContext;
  //   const duration = this.buffer.duration;
  //   const offlineContext = new OfflineAudioContext(2, duration * context.sampleRate, context.sampleRate);
    
  //   // Use the buffer directly from Tone.Buffer
  //   const decodedData = this.buffer.get();

  //   const source = offlineContext.createBufferSource();
  //   source.buffer = decodedData; // Use the buffer directly.
    
  //   // Create a Multiply node
  //   const gain = offlineContext.createGain();
  //   gain.gain.value = gainVal
  //   console.log(gainVal, gain.gain.value)

  //   // Correct setup for WaveShaper node
  //   const waveShaper = offlineContext.createWaveShaper();
  //   waveShaper.curve = this.generateWaveShaperCurve(256); // Example length, adjust as needed
  //   waveShaper.oversample = '4x'; // Optional: Apply oversampling to reduce aliasing


  //   // Connect the nodes
  //   source.connect(gain);
  //   source.connect(waveShaper);
  //   waveShaper.connect(offlineContext.destination);
    
  //   source.start(0);
    
  //   return new Promise((resolve, reject) => {
  //     offlineContext.startRendering().then((renderedBuffer) => {
  //       // Use the rendered buffer as a new Tone.Buffer
  //       const newBuffer = new Tone.Buffer(renderedBuffer);
  //       this.buffer = newBuffer
  //       this.convolver.buffer = newBuffer; // Load it into the convolver
  //       resolve();
  //     }).catch(reject);
  //   });
  // }//amp

  // generateWaveShaperCurve(length = 256) {
  //   const curve = new Float32Array(length);
  //   for (let i = 0; i < length; i++) {
  //     let x = (i * 2) / length - 1; //convert to -1,1
  //     //curve[i] = Math.tanh(x*128); // Adjust this function as needed
  //     curve[i] = x>0 ? 1 : -0; 
  //     //curve[i] = x
  //   }
  //   console.log(curve)
  //   return curve;
  // }

  setEQ(low,mid,hi){
    this.eq.high.value = hi
    this.eq.mid.value = mid
    this.eq.low.value = low
  }
  setEQBand(low,hi){
    if(low < 10 || hi < 10){
      console.log('EQ bands are in Hz')
      return;
    }
    this.eq.highFrequency.value = hi
    this.eq.lowFrequency.value = low
  }

  listSamples(){
        const fileKeys = Object.keys(this.sampleFiles);
        console.log(fileKeys)
    }


  /**
   * Connect the output to a destination.
   * @param {Tone.Signal | AudioNode} destination - The destination to connect to.
   */
  connect(destination) {
    if (destination.input) {
      this.output.connect(destination.input);
    } else {
      this.output.connect(destination);
    }
  }

  /**
   * Disconnect the output from a destination.
   * @param {Tone.Signal | AudioNode} destination - The destination to disconnect from.
   */
  disconnect(destination) {
    if (destination.input) {
      this.output.disconnect(destination.input);
    } else {
      this.output.disconnect(destination);
    }
  }
}


const paramDefinitions = (synth) => [
  {
    name: "name",
    type: "input",
    value: 'Dist',
    max: 'Dist', default: 'Dist'
  },
  {
    name: "drive",
    type: "input",
    min: 0,
    max: 1,
    curve: 2,
    default: .2,
    value: 0.1,
    callback: (value) => {
      synth.driveGain.gain.rampTo( (value/5)*100, .1);
      synth.outputCut.value = -Math.sqrt(value)*.1 * synth.outputFactor 
      //console.log(-Math.sqrt(value)*.9 * synth.outputFactor )
      synth.dry.gain.rampTo(value>0.2 ? 0 : (0.2-value)/0.2, .1)
    }
  },
  {
    name: "lowcut",
    type: "none",
    min: 20,
    max: 1000,
    curve: 2,
    default: 80,
      value: 100,
    callback: (value) => {
      //synth.highpassA.frequency.rampTo( value,.1);
    }
  },
  {
    name: "lpf",
    type: "none",
    min: 100,
    max: 16000,
    curve: 2,
    default: 8000,
    value: 8000,
    callback: (value) => {
      //synth.lowpassFilter.frequency.rampTo( value,.1)
    }
  },
  {
    name: "hpf",
    type: "none",
    min: 20,
    max: 2000,
    curve: 2,
    default: 150,
    value: 150,
    callback: (value) => {
      //synth.highpassB.frequency.rampTo( value,.1)
    }
  },
  {
    name: "bias",
    type: "param",
    min: -1,
    max: 1,
    curve: 1,
    default: 0,
    value: 0,
    callback: (value) => {
      synth.biasSignal.value = value;
    }
  },
  {
    name: "shelf",
    type: "param",
    min: 0,
    max: 1,
    curve: 1,
    value: 1000,
    callback: (value) => {
      //console.log('shelf', value) 
      if (typeof value !== 'number' || isNaN(value)) {
        //console.warn("Invalid drive value:", value);
        return;
      }     
      value = Math.pow(value,2)*36-24
      //synth.toneShelf.gain.rampTo( value,.1)
      
    }
  },
  {
    name: "type",
    type: "param",
    radioOptions: ["soft", "tanh", "hard", "fold", "tube"],
    default: "tanh",
    value: "tanh",
    callback: (value) => {
      if (value == 0.5) { return }
      synth.shaper1.curve = synth.transferFunctions[value];
      synth.shaper2.curve = synth.transferFunctions[value];
    }
  },
  {
    name: "feedback",
    type: "output",
    min: 0,
    max: 1,
    default: 0,
    curve: 3,
    value: 0,
    callback: (value) => {
      synth.feedbackGain.gain.value = value;
    }
  },
  {
    name: "level",
    type: "output",
    min: 0,
    max: 1.5,
    curve: 2,
    default: 1,
      value: 1,
    callback: (value) => {
      synth.outputLevel.value = value;
      synth.outputFactor = value
    }
  }
];

/*
Distortion fx

input->highpassA->feedbackReturn->drive->lowpass->shaper1->
->highpassB->biasAdder->shaper2->toneShelf->(output,feedbackSend)
feedbackSend->feedbackDelay->feedbackGain->feedbackReturn

*/



;
;
;
// ;
;
;

class Distortion extends EffectTemplate {
  constructor(gui = null) {
    super();
    this.gui = gui;
    this.presets = {};
		this.synthPresetName = "DistortionPresets"
		//this.accessPreset()
    this.name = "Distortion";
    this.layout = layout;
    this.backgroundColor = [100,0,0]
    this.transferFunctions = this.generateDistortionCurves()
    this.outputFactor = 1

    this.input = new Tone2.Gain();
    this.dry = new Tone2.Gain()
    this.outputCut = new Tone2.Signal(0)
    this.outputLevel = new Tone2.Signal(1)
    this.output = new Tone2.Gain();

    // --- Filters and gain stages ---
    this.highpassA = new Tone2.Filter(80, "highpass");
    this.driveGain = new Tone2.Gain(5); // drive control
    this.lowpassFilter = new Tone2.Filter(8000, "lowpass");

    this.shaper1 = new Tone2.WaveShaper(this.transferFunctions['tanh']);
    this.highpassB = new Tone2.Filter(150, "highpass");

    this.biasSignal = new Tone2.Signal(0);
    this.biasAdder = new Tone2.Add();

    this.shaper2 = new Tone2.WaveShaper();

    this.toneShelf = new Tone2.Filter(1000, "highshelf");
    this.feedbackSend = new Tone2.Gain();
    this.feedbackDelay = new Tone2.Delay({'delayTime':0,'maxDelay':0.001})
    this.feedbackGain = new Tone2.Gain(0);
    this.feedbackReturn = new Tone2.Add();

    // Signal chain
    this.input.connect(this.highpassA);
    this.input.connect(this.dry)

    this.highpassA.connect(this.feedbackReturn);
    this.feedbackReturn.connect(this.driveGain);
    this.driveGain.connect(this.lowpassFilter);
    this.lowpassFilter.connect(this.shaper1);
    this.shaper1.connect(this.highpassB);

    this.highpassB.connect(this.biasAdder);
    this.biasSignal.connect(this.biasAdder.addend);
    this.biasAdder.connect(this.shaper2);
    this.shaper2.connect(this.toneShelf);
    
    this.outputCut.connect(this.output.gain)
    this.outputLevel.connect(this.output.gain)
    this.toneShelf.connect(this.output);
    this.dry.connect(this.output)

    // Feedback loop
    this.toneShelf.connect(this.feedbackSend);
    this.feedbackSend.connect(this.feedbackDelay);
    this.feedbackDelay.connect(this.feedbackGain);
    this.feedbackGain.connect(this.feedbackReturn.addend);

    // Parameter definitions
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    this.createAccessors(this, this.param);
    this.autocompleteList = this.paramDefinitions.map(def => def.name);
    this.presetList = Object.keys(this.presets)
    // setTimeout(() => {
    //   this.loadPreset('default');
    // }, 500);
  }


  generateDistortionCurves(resolution = 1024) {
    const curves = {};

    // Helper
    const makeCurve = (fn) => {
      const curve = new Float32Array(resolution);
      for (let i = 0; i < resolution; i++) {
        const x = (i / (resolution - 1)) * 2 - 1; // from -1 to +1
        curve[i] = fn(x);
      }
      return curve;
    };

    curves.soft = makeCurve(x => x / (1 + Math.abs(x)));
    curves.tanh = makeCurve(x => Math.tanh(x));
    curves.hard = makeCurve(x => Math.max(-0.6, Math.min(0.6, x)));
    curves.fold = makeCurve(x => Math.sin(3 * x));
    curves.tube = makeCurve(x => (x < 0 ? Math.tanh(3 * x) : Math.pow(x, 0.6)));
    curves.arctangent = makeCurve(x => Math.atan(x * 3) / Math.atan(3));
    curves.sigmoid = makeCurve(x => 2 / (1 + Math.exp(-3 * x)) - 1);
    curves.triangleFold = makeCurve(x => 1 - 2 * Math.abs(Math.round(x) - x));
    curves.wrap = makeCurve(x => ((x * 2 + 1) % 2) - 1);
    curves.diode = makeCurve(x => x < 0 ? 0.3 * x : x);
    curves.parabias = makeCurve(x => x < 0 ? x : x - x * x);
    curves.step8 = makeCurve(x => Math.round(x * 8) / 8);
    curves.cubic = makeCurve(x => x - (1 / 3) * Math.pow(x, 3));
    curves.supersine = makeCurve(x => Math.sin(x * Math.PI * 0.5));
    curves.root = makeCurve(x => Math.sign(x) * Math.sqrt(Math.abs(x)));

    return curves;
  }
}

/*
Drone
3 oscillator synth with cross-modulation




*/

;
;
// ;
;

class Drone extends MonophonicTemplate{
	constructor(){
		super()
    	this.presets = {};
		this.synthPresetName = "DronePresets"
		this.accessPreset()
		this.name = 'Drone'

		this.frequency = new Tone.Signal(100)
		this.frequencyCV = new Tone.Signal()
		this.frequency_scalar = new Tone.Multiply(1)
		this.detune_scalar = new Tone.Multiply(1)
		this.vco_1 = new Tone.PulseOscillator().start()
		this.vco_2 = new Tone.PulseOscillator().start()
		this.frequency.connect(this.frequency_scalar)
		this.frequencyCV.connect(this.frequency_scalar.factor)
		this.frequency_scalar.connect(this.vco_1.frequency)
		this.frequency_scalar.connect(this.detune_scalar)
		this.detune_scalar.connect(this.vco_2.frequency)

		this.crossfade = new Tone.CrossFade()
		this.crossfade_lfo_depth = new Tone.Multiply()
		this.vco_1.connect( this.crossfade.a)
		this.vco_2.connect( this.crossfade.b)

		this.vcf = new Tone.Filter({type:'lowpass', rolloff:-24, Q:0, cutoff:3000})
		this.crossfade.connect(this.vcf)
		this.crossfade_constant = new Tone.Signal(0)
		this.crossfade_lfo_depth.connect(this.crossfade.fade)
		this.crossfade_constant.connect(this.crossfade.fade)

		this.vca = new Tone.Multiply()
		this.lfo_vca = new Tone.Multiply(1)
		this.lfo_vca_constant = new Tone.Signal(1)
		this.panner = new Tone.Panner(0)
		this.output = new Tone.Multiply(.25)
		this.vcf.connect(this.lfo_vca)
		this.lfo_vca.connect(this.vca)
		this.lfo_vca_constant.connect(this.lfo_vca.factor)
		this.vca.connect(this.panner)
		this.panner.connect(this.output)

		//envelopes
		this.env = new Tone.Envelope()
		this.velocity = new Tone.Signal(1)
		this.velocity_depth = new Tone.Multiply(1)
		this.env.connect(this.velocity_depth)
		this.velocity_depth.connect(this.vca.factor)
		this.velocity.connect(this.velocity_depth.factor)

		//vcf
		this.cutoffSig = new Tone.Signal(1000)
		this.cutoffSig.connect(this.vcf.frequency)
		this.cutoffCV = new Tone.Signal()
		this.cutoffCV.connect(this.vcf.frequency)
		this.keyTracking = new Tone.Multiply(.1)
		this.frequency.connect(this.keyTracking)
		this.keyTracking.connect(this.vcf.frequency)
		this.vcf_env = new Tone.Envelope()
		this.vcf_env_depth = new Tone.Multiply()
		this.vcf_env.connect(this.vcf_env_depth)
		this.vcf_env_depth.connect(this.vcf.frequency)

		this.lfo = new Tone.Oscillator(.5).start()
		this.vca_constant = new Tone.Signal(1)
		this.amp_lfo_depth = new Tone.Multiply(0)
		this.lfo.connect(this.amp_lfo_depth)
		this.amp_lfo_depth.connect(this.lfo_vca.factor)
		this.pitch_lfo_depth = new Tone.Multiply(0)
		this.lfo.connect(this.pitch_lfo_depth)
		this.lfo.connect(this.crossfade_lfo_depth)
		this.frequency_constant = new Tone.Signal(1)
		this.pitch_lfo_depth.connect(this.frequency_scalar.factor)
		this.frequency_constant.connect(this.frequency_scalar.factor)

		//no PWM to prevent errors when vco is not set to pulse
		this.pwm_lfo_depth = new Tone.Multiply()
		this.lfo.connect(this.pwm_lfo_depth)

		//this.pwm_lfo_depth.connect(this.vco_1.width)
		//this.pwm_lfo_depth.connect(this.vco_2.width)
  }

  //TRIGGER METHODS
  triggerAttack = function(val, vel=100, time=null){
  	let freq = Tone.Midi(val).toFrequency()
  	vel = vel/127
    if(time){
      this.frequency.setValueAtTime(freq,time)
      this.env.triggerAttack(time)
      this.vcf_env.triggerAttack(time)
      this.velocity.setValueAtTime(Math.pow(vel,2),time)
    } else{
      this.frequency.value = freq
      this.env.triggerAttack()
      this.vcf_env.triggerAttack()
      this.velocity.value =Math.pow(vel,2) 
    }
  }
  triggerRelease = function(val, time=null){
    if(time){
      this.env.triggerRelease(time)
      this.vcf_env.triggerRelease(time)
    } else{
      this.env.triggerRelease()
      this.vcf_env.triggerRelease()
    }
  }
  triggerAttackRelease = function(val, vel=100, dur=0.01, time=null){
    val = Tone.Midi(val).toFrequency()
    vel = vel/127
    if(time){
      this.frequency.setValueAtTime(val,time)
      this.env.triggerAttackRelease(dur,time)
      this.vcf_env.triggerAttackRelease(dur,time)
      this.velocity.setValueAtTime(Math.pow(vel,2),time)
    } else{
      this.frequency.value = val
      this.env.triggerAttackRelease(dur)
      this.vcf_env.triggerAttackRelease(dur)
      this.velocity.value =Math.pow(vel,2) 
    }
  }//attackRelease

  shapeVco(vcoNum, shape, amp=2, curve=1, isEven=1 ){
  	//console.log(vcoNum,shape)
		let partials = []
	  for(let i=0;i<64;i++){
	    partials.push(1/Math.pow(i+1,curve)*16*(i%2<(2-isEven))*Math.abs(1-Math.sin(i*Math.PI*shape+Math.PI/2)*amp))
	  }
	  if(vcoNum === 0) {
	  	//console.log(shape, this.vco_1.partials)
	  	this.vco_1.partials = partials
	  	//console.log('post ', this.vco_1.partials)
	  }
	  else this.vco_2.partials = partials 
  }

  setHighpass(val){
  	if(this.super !== null){
  		this.super.hpf.frequency.value = val
  	}
  }

  initGui(gui, x=10,	y=10){
  	// if(this.gui_elements.length > 0){
  	// 	console.log("initGui is called when a synth is created.\n Call synth.showGui() to see it.")
  	// 	return;
  	// }
  	this.gui = gui
  	this.x = x
  	this.y = y
  	this.vco_mix = this.createKnob('vco_mix', 5, 5, 0, 1, 0.75, [200,50,0],x=>this.crossfade_constant.value= x);
  	this.detune = this.createKnob('detune', 15, 5, 1, 2, 0.75, [200,50,0],x=>this.detune_scalar.factor.value = x);
  	this.cutoff = this.createKnob('cutoff', 25, 5, 0, 10000, 0.75, [200,50,0],x=>this.cutoffSig.value = x);
  	this.vcf_env_knob = this.createKnob('vcf env', 35, 5, 0, 5000, 0.75, [200,50,0],x=>this.vcf_env_depth.factor.value = x);
  	this.vcf_Q_knob = this.createKnob('Q', 45, 5, 0, 20, 0.75, [200,50,0],x=>this.vcf.Q.value = x);
  	this.keyTracking_knob = this.createKnob('key vcf', 55, 5, 0, 1, 0.75, [200,50,0],x=>this.keyTracking.factor.value = x);
  	this.highpass_knob = this.createKnob('hpf', 65, 5, 10, 3000, 0.75, [200,50,0],x=>this.setHighpass(x));
  	this.attack_knob = this.createKnob('a', 5, 45, 0.005, .5, 0.5, [200,50,0],x=>this.env.attack = x);
  	this.decay_knob = this.createKnob('d', 15, 45, 0.01, 10, 0.5, [200,50,0],x=>this.env.decay = x);
  	this.sustain_knob = this.createKnob('s', 25, 45, 0, 1, 0.5, [200,50,0],x=>this.env.sustain = x);
  	this.release_knob = this.createKnob('r', 35, 45, 0, 20, 0.5, [200,50,0],x=>this.env.release = x);
  	this.vcf_attack_knob = this.createKnob('a', 5, 70, 0.005, .5, 0.5, [200,50,0],x=>this.vcf_env.attack = x);
  	this.vcf_decay_knob = this.createKnob('d', 15, 70, 0.01, 10, 0.5, [200,50,0],x=>this.vcf_env.decay = x);
  	this.vcf_sustain_knob = this.createKnob('s', 25, 70, 0, 1, 0.5, [200,50,0],x=>this.vcf_env.sustain = x);
  	this.vcf_release_knob = this.createKnob('r', 35, 70 , 0, 20, 0.5, [200,50,0],x=>this.vcf_env.release = x);
  	this.lfo_freq_knob = this.createKnob('lfo', 45, 65, 0, 20, 0.5, [200,50,0],x=>this.lfo.frequency.value = x);
  	this.lfo_vibrato = this.createKnob('vibrato', 55, 65, 0, .1, 0.5, [200,50,0],x=>this.pitch_lfo_depth.factor.value = x);
  	this.lfo_tremolo = this.createKnob('tremolo', 65, 65, 0, 1, 0.5, [200,50,0],x=>this.amp_lfo_depth.factor.value = x);
  	this.lfo_blend_knob = this.createKnob('blend', 75, 65, 0, 1, 0.5, [200,50,0],x=>this.crossfade_lfo_depth.factor.value = x);

  	//this.pan_knob = this.createKnob('pan', 85, 65, 0, 1, 0.5, [200,50,0],x=>this.crossfade_lfo_depth.factor.value = x);
  	this.vco1_shape_knob = this.createKnob('shape1', 75, 25, 0,1, 0.6, [200,50,0],x=>this.shapeVco(0, x*2+1));
  	this.vco2_shape_knob = this.createKnob('shape2', 85, 25, 0,1, 0.6, [200,50,0],x=>this.shapeVco(1, x*2+1));
  	
  	this.pan_knob = this.createKnob('pan', 85, 65, 0, 1, 0.5, [200,50,0],x=>{this.super.pan(x)});


  	this.gui_elements = [ this.vco_mix, this.detune, this.cutoff, this.vcf_env_knob, this.vcf_Q_knob, this.keyTracking_knob, 
  		this.highpass_knob, 
  		this.attack_knob, this.decay_knob, this.sustain_knob, this.release_knob, this.vcf_attack_knob, this.vcf_decay_knob, this.vcf_sustain_knob, this.vcf_release_knob, this.lfo_freq_knob, this.lfo_vibrato, this.lfo_tremolo, this.lfo_blend_knob
  		, this.pan_knob, this.vco1_shape_knob, this.vco2_shape_knob
  		];
  }
}


const paramDefinitions = (synth) => [
  {
    name:'rate',type: 'input',
    value:1, min:-10,max:10,curve:1,callback:x=>{
      synth.voice.playbackRate = Math.abs(x)
      if(x<0) synth.voice.reverse = true
    }
  },

  {
    name: 'volume', type: 'output', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.output.factor.value = x
  },
  {
    name:'amp',type: 'hidden',
    min:0,max:1,curve:2,callback:x=>synth.output.factor.value = x
  },
  {
    name:'ghost',type: 'hidden',
    min:0,max:1,curve:2,callback:x=>synth.ghost = x
  },
  {
    name:'accent',type: 'hidden',
    min:0,max:4,curve:2,callback:x=>synth.accent = x
  },

  {
    name:'decay',type: 'param',value:1,
    min:0.0,max:1,curve:3,callback:x=> {
      synth.decayTime = x * synth.duration
      synth.setDecayTime()
    }
  },
  {
    name:'choke',type: 'param',value:1,
    min:0.,max:1,curve:2,callback:x=> {
      synth.chokeRatio = x
      synth.setDecayTime()
    }
  },
  
  {
    name:'dry',type: 'output',value:0,
    min:0,max:1,curve:2,callback:x=>synth._dry.factor.value = x
  },
];

paramDefinitions;

;
;



;

;
;

class DrumVoice extends DrumTemplate{
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


window.DrumSamplerPresets = {
  "default": {
    "Kick": 0.5,
    "Snare": 0.5,
    "Hihat": 0.4,
    "Toms": 0.5,
    "decay": 1,
    "decay1": 1,
    "decay12": 1,
    "Output": 2,
    "Dry Kick": 0.5,
    "rate": 1,
    "rate1": 1,
    "rate12": 1,
    "1 Rate": 1,
    "2 Rate": 1,
    "3 Rate": 1,
    "Threshold": -32.5,
    "Ratio": 1,
    "Distort": 0.1,
    "Closed Decay": 0.16839999999999972,
    "Open Decay": 1.9801,
    "kit": "Acoustic"
  },
  "electro": {
    "Kick": 0.7,
    "Snare": 0.5,
    "Hihat": 0.3,
    "Toms": 0.5,
    "Output": 3,
    "Dry Kick": 0.3,
    "Kick Rate": 1,
    "Snare Rate": 1,
    "Hihat Rate": 1.4,
    "Tom1 Rate": 1,
    "Tom2 Rate": 1,
    "Tom3 Rate": 1,
    "Threshold": -32.5,
    "Ratio": 4.5,
    "Distort": 0.3,
    "Hat Decay": 0.505,
    "kit": "Techno",
    "Kick1": 1,
    "Snare1": 1,
    "Hihat1": 0.8999999999999999,
    "Toms1": 0.23000000000000007,
    "Output1": 0.9599999999999991,
    "Dry Kick1": 0.1399999999999997,
    "Kick Rate1": 0.8999999999999999,
    "Snare Rate1": 0.8799999999999999,
    "Hihat Rate1": 1.1,
    "Tom1 Rate1": 1.4000000000000004,
    "Tom2 Rate1": 1.3000000000000003,
    "Tom3 Rate1": 1.12,
    "Threshold1": -28.649999999999995,
    "Ratio1": 7.459999999999997,
    "Distort1": 0.17,
    "Hat Decay1": 0.11889999999999983,
    "kit1": "CR78"
  },
  "breakbeat": {
    "Kick": 0.5,
    "Snare": 0.5,
    "Hihat": 0.5,
    "Toms": 0.5,
    "Output": 2,
    "Dry Kick": 0,
    "Kick Rate": 1,
    "Snare Rate": 1,
    "Hihat Rate": 1,
    "Tom1 Rate": 1,
    "Tom2 Rate": 1,
    "Tom3 Rate": 1,
    "Threshold": -32.5,
    "Ratio": 10.5,
    "Distort": 0.5,
    "Hat Decay": 0.505,
    "Kick1": 1,
    "Snare1": 1,
    "Hihat1": 0.7199999999999998,
    "Toms1": 0.7900000000000005,
    "Output1": 2.3999999999999995,
    "Dry Kick1": 0,
    "Kick Rate1": 1.06,
    "Snare Rate1": 1.12,
    "Hihat Rate1": 0.8399999999999999,
    "Tom1 Rate1": 1.1600000000000001,
    "Tom2 Rate1": 1.1400000000000001,
    "Tom3 Rate1": 1.1,
    "Threshold1": -28.649999999999995,
    "Ratio1": 12.210000000000006,
    "Distort1": 0.04,
    "Hat Decay1": 0.19809999999999958,
    "kit": "breakbeat8"
  },
  "techno": {
    "Kick": 1,
    "Snare": 1,
    "Hihat": 0.6999999999999997,
    "Toms": 0.6099999999999997,
    "decay": 0.2599999999999998,
    "decay1": 0.04999999999999981,
    "decay12": 0.004,
    "Output": 0.9999999999999991,
    "Dry Kick": 0,
    "rate": 0.8599999999999999,
    "rate1": 0.819999999999999,
    "rate12": 1,
    "1 Rate": 2,
    "2 Rate": 2,
    "3 Rate": 2,
    "Threshold": -29.20000000000002,
    "Ratio": 9.36,
    "Distort": 0.1999999999999997,
    "Closed Decay": 0.07859999999999995,
    "Open Decay": 2,
    "kit": "Techno"
  },
  "snappy": {
    "Kick": 0.5,
    "Snare": 0.5,
    "Hihat": 0.5,
    "Toms": 0.5,
    "Output": 2,
    "Dry Kick": 0.5,
    "Kick Rate": 1,
    "Snare Rate": 1,
    "Hihat Rate": 1,
    "Tom1 Rate": 1,
    "Tom2 Rate": 1,
    "Tom3 Rate": 1,
    "Threshold": -32.5,
    "Ratio": 10.5,
    "Distort": 0.5,
    "Hat Decay": 0.505,
    "kit": "LINN",
    "Kick1": 1,
    "Snare1": 0.7299999999999998,
    "Hihat1": 0.5399999999999996,
    "Toms1": 0.4499999999999995,
    "Output1": 3.3199999999999994,
    "Dry Kick1": 0,
    "Kick Rate1": 1.1400000000000001,
    "Snare Rate1": 1.3800000000000003,
    "Hihat Rate1": 1.1400000000000001,
    "Tom1 Rate1": 1.6800000000000006,
    "Tom2 Rate1": 0.52,
    "Tom3 Rate1": 0.21999999999999936,
    "Threshold1": -28.649999999999995,
    "Ratio1": 1,
    "Distort1": 0.09999999999999999,
    "Hat Decay1": 0.08919999999999953,
    "kit1": "KPR77"
  },
  "linn": {
    "Kick": 1,
    "Snare": 1,
    "Hihat": 0.51,
    "Toms": 1,
    "decay": 0.2599999999999998,
    "decay1": 0.45000000000000007,
    "decay12": 0.5,
    "Output": 1.2799999999999994,
    "Dry Kick": 0,
    "rate": 0.8799999999999999,
    "rate1": 1.2000000000000002,
    "rate12": 0.7999999999999998,
    "1 Rate": 1,
    "2 Rate": 1,
    "3 Rate": 1,
    "Threshold": -29.20000000000002,
    "Ratio": 6.129999999999996,
    "Distort": 0.09999999999999969,
    "Closed Decay": 0.059,
    "Open Decay": 1.1045000000000003,
    "kit": "LINN"
  }
};;

const paramDefinitions = (synth) => [
  {
    name: 'kick_vca', type: 'kick', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.kick.output.factor.value = x
  },
  {
    name: 'kick_start', type: 'hidden', min: 0, max: .1, value: 0, curve: 1,
    callback: x => synth.kick.startPoint= x
  },
  {
    name: 'snare_vca', type: 'snare', min: 0, max: 1, value: .7, curve: 1,
    callback: x => synth.snare.output.factor.value = x
  },
  {
    name: 'snare_start', type: 'hidden', min: 0, max: .1, value: 0, curve: 1,
    callback: x => synth.snare.startPoint= x
  },
  {
    name: 'hat_vca', type: 'hihat', min: 0, max: 1, value: .5, curve: 1,
    callback: x => synth.hat.output.factor.value = x
  },
  {
    name: 'hat_start', type: 'hidden', min: 0, max: .1, value: 0, curve: 1,
    callback: x => synth.hat.startPoint= x
  },
  {
    name: 'toms_vca', type: 'toms', min: 0, max: 1, value: .7, curve: 1,
    callback: x => {
      synth.p1.output.factor.value = x;
      synth.p2.output.factor.value = x;
      synth.p3.output.factor.value = x;
    }
  },
  {
    name: 'toms_start', type: 'hidden', min: 0, max: .1, value: 0, curve: 1,
    callback: x=>{
      synth.p1.startPoint= x
      synth.p2.startPoint= x
      synth.p3.startPoint= x
    }
  },
  {
    name: 'kick_rate', type: 'kick', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.kick.rate = x
  },
  {
    name: 'kick_decay', type: 'kick', min: 0, max: 1, value: 1, curve: 2,
    callback: x => synth.kick.decay = x *  synth.kick.duration
  },
  {
    name: 'snare_rate', type: 'snare', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.snare.rate = x
  },
  {
    name: 'snare_decay', type: 'snare', min: 0.01, max: 1, value: 1, curve: 2,
    callback: x => synth.snare.decay = x * synth.snare.duration
  },
  
  {
    name: 'dryKick', type: 'kick', min: 0, max: 1, value: 0, curve: 1,
    callback: x => synth.dry_kick.factor.value = x
  },
  {
    name: 'hat_rate', type: 'hihat', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.hat.rate = x
  },
  {
    name: 'closed_decay', type: 'hihat', min: 0.01, max: 1, value: 0.25, curve: 2,
    callback: x => synth.hat.choke = x
  },
  {
    name: 'open_decay', type: 'hihat', min: 0.01, max: 1, value: 1, curve: 2,
    callback: x => synth.hat.decay = x  * synth.snare.duration
  },
  {
    name: 'tom1_rate', type: 'toms', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.p1.rate = x
  },
  {
    name: 'tom2_rate', type: 'toms', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.p2.rate = x
  },
  {
    name: 'tom3_rate', type: 'toms', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.p3.rate = x
  },
  {
    name: 'toms_decay', type: 'toms', min: 0.01, max: 1, value: 1, curve: 2,
    callback: x => {
      synth.p1.decay = x * synth.p1.duration;
      synth.p2.decay = x * synth.p2.duration;
      synth.p3.decay = x * synth.p3.duration;
    }
  },

  {
    name: 'comp_threshold', type: 'output', min: -60, max: -5, value: -5, curve: 1,
    callback: x => synth.comp.threshold.value = x
  },
  {
    name: 'comp_ratio', type: 'output', min: 1, max: 20, value: 1, curve: 1,
    callback: x => synth.comp.ratio.value = x
  },
  {
    name: 'gain', type: 'output', min: 0, max: 1, value: 0.2, curve: 1,
    callback: x => synth.distortion.distortion = x
  },
  {
    name: 'output_gain', type: 'output', min: 0, max: 4, value: 1, curve: 1,
    callback: x => synth.output.factor.value = x
  },
  // {
  //   name: 'drumkit', type: 'dropdown', value: synth.defaultKit || '', radioOptions: synth.drumkitList,
  //   callback: x => {
  //       console.log("dropdown load", x)
  //       synth.loadSamples(x)
  //   }
  // }
];

paramDefinitions;

window.drumSamplerLayout = {

    "toms": {
      "color": [200, 255, 255],
      "boundingBox": { "x": 10, "y": 10, "width": 70, "height": 20 },
      "offsets": { "x": 10, "y": 25 },
      "groupA": ["type"],
      "controlTypeA": "radioButton",
      "controlTypeB": "knob",
      "sizeA": 0.6,
      "sizeB": 0.5,
      "theme": "dark"
    },
    "hihat": {
      "color": [200, 255, 255],
      "boundingBox": { "x": 10, "y": 35, "width": 50, "height": 20 },
      "offsets": { "x": 10, "y": 25 },
      "groupA": ["cutoff"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.6,
      "sizeB": 0.5
    },
    "snare": {
      "color": [200, 255, 255],
      "boundingBox": { "x": 10, "y": 60, "width": 50, "height": 20 },
      "offsets": { "x": 10, "y": 25 },
      "groupA": ["level"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.6,
      "sizeB": 0.5
    },
    "kick": {
      "color": [200, 255, 255],
      "boundingBox": { "x": 10, "y": 85, "width": 50, "height": 20 },
      "offsets": { "x": 10, "y": 25 },
      "groupA": [],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.6,
      "sizeB": 0.6
    },
    "output": {
      "color": [200, 255, 255],
      "boundingBox": { "x": 90, "y": 10, "width": 10, "height": 100 },
      "offsets": { "x": 8, "y": 25 },
      "groupA": ["kit"],
      "controlTypeA": "dropdown",
      "controlTypeB": "knob",
      "sizeA": 0.5,
      "sizeB": 0.6
    },
    "dropdown": {
      "color": [20, 25, 25],
      "boundingBox": { "x": 60, "y": 2, "width": 50, "height": 20 },
      "offsets": { "x": 8, "y": 25 },
      "groupA": ["kit"],
      "controlTypeA": "dropdown",
      "controlTypeB": "knob",
      "sizeA": 15,
      "sizeB": 15
    }
};;

/**
 * 
 * player -> vca -> comp -> distortion -> output
 * 
 * each voice has its own env and vca
 * 
 * hihat simulates open and closed:
 * 
 * hihat -> hatVca (for open/closed) -> hihat_vca (overall level) -> comp, etc.
 * openEnv -> openHatChoke(vca) -> hatVca.factor
 * closedEnv -> hatVca.factor
 * 
 * kick has a dry output pre-comp and distortion
 */

;
;

;
;
;



;

;
;
/**
 * DrumSampler class extends DrumTemplate to create a drum sampler with various sound manipulation features.
 * It loads and triggers different drum samples based on the selected kit.
 * 
 * extends DrumTemplate
 */
class DrumSampler extends DrumTemplate{
  constructor(kit = "default") {
    super()
    this.backgroundColor = [150,50,50]
    
    this.presets = DrumSamplerPresets;
		this.synthPresetName = "DrumSamplerPresets"
		//this.accessPreset()
    this.name = "DrumSampler"
    this.layout = layout
    this.defaultKit = "CR78"


    this.kit = kit
    this.drumkitList = ["LINN", "Techno", "TheCheebacabra1", "TheCheebacabra2", "acoustic-kit", "breakbeat13", "breakbeat8", "breakbeat9", "4OP-FM", "Bongos", "CR78", "KPR77", "Kit3", "Kit8"]
    //
    
    this.comp = new Tone.Compressor(-20,4)
    this.distortion = new Tone.Distortion(.5)
    this.output = new Tone.Multiply(0.8);
    this.dry_kick = new Tone.Multiply(0.)

    this.comp.connect(this.distortion)
    this.distortion.connect(this.output)

    //drum voices
    this.kick = new DrumVoice()
    this.kick.output.connect(this.dry_kick)
    this.dry_kick.connect(this.output)
    this.kick.output.connect(this.comp)
    this.hat = new DrumVoice()
    this.hat.output.connect(this.comp)
    this.snare = new DrumVoice()
    this.snare.output.connect(this.comp)
    this.p1 = new DrumVoice()
    this.p1.output.connect(this.comp)
    this.p2 = new DrumVoice()
    this.p2.output.connect(this.comp)
    this.p3 = new DrumVoice()
    this.p3.output.connect(this.comp)

    for(let i=0;i<10;i++) {
        this.subdivision[i] = '16n'
        this.createSequence(i)
    }
    // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    //console.log(this.paramDefinitions)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    
    this.loadKit('acoustic')

  }//constructor

  /**
   * Load a specific drum kit.
   * - duplicates loadSamples()
   * @param {string} kit - The name of the drum kit to load.
   */
  loadKit(kit){ this.loadSamples(kit)}
  listKits(){console.log(this.drumkitList)}
  loadSamples(kit){
    //console.log("kit", kit)
    //this.kit = kit
    this.drumFolders = {
      "4OP-FM": "4OP-FM", "FM": "4OP-FM",
      "Bongos": "Bongos", "Bongo": "Bongos",
      "CR78": "CR78", 
      "KPR77": "KPR77",
      "Kit3": "Kit3","kit3": "Kit3", 
      "Kit8": "Kit8", "kit8": "Kit8", 
      "LINN": "LINN", "linn": "LINN", 
      "R8": "R8",
      "Stark": "Stark", "stark": "Stark", 
      "Techno": "Techno", "techno": "Techno", 
      "TheCheebacabra1": "TheCheebacabra1", "Cheese1": "TheCheebacabra1",
      "TheCheebacabra2": "TheCheebacabra2",  "Cheese2": "TheCheebacabra2",
      "acoustic-kit": "acoustic-kit", "acoustic": "acoustic-kit", "Acoustic": "acoustic-kit",
      "breakbeat13": "breakbeat13", 
      "breakbeat8": "breakbeat8", 
      "breakbeat9": "breakbeat9",
    }

     if (kit in this.drumFolders) {
      console.log(`Drumsampler loading ${kit}`);
      this.baseUrl = "https://tonejs.github.io/audio/drum-samples/".concat(this.drumFolders[kit]);
    } else if(kit === 'default'){
        this.baseUrl = "./audio/drumDefault";
    } else {
      console.error(`The kit "${kit}" is not available.`);
      return
    }

    //console.log("load sample", this.baseUrl)
    try{
      this.snare.voice.load( this.baseUrl.concat("/snare.mp3") )
      this.hat.voice.load( this.baseUrl.concat("/hihat.mp3") )
      this.p1.voice.load( this.baseUrl.concat("/tom1.mp3") )
      this.p2.voice.load( this.baseUrl.concat("/tom2.mp3") )
      this.p3.voice.load( this.baseUrl.concat("/tom3.mp3") )
      this.kick.voice.load( this.baseUrl.concat("/kick.mp3") )
    
      setTimeout( ()=>{
        this.snare.duration = this.snare.voice.buffer.duration
        this.hat.duration = this.hat.voice.buffer.duration
        this.p1.duration = this.p1.voice.buffer.duration
        this.p2.duration = this.p2.voice.buffer.duration
        this.p3.duration = this.p3.voice.buffer.duration
        this.kick.duration = this.kick.voice.buffer.duration
      }, 500)
    } catch(e){
      console.log('unable to load samples - try calling loadPreset(`default`)')
    }
  }

  /**
   * Set up and start a sequenced playback of drum patterns.
   * 
   * @param {string} arr - A string representing the drum pattern.
   * @param {string} subdivision - The rhythmic subdivision to use for the sequence (e.g., '8n', '16n').
   */
  sequence(arr, subdivision = '8n', num = 0, phraseLength = 'infinite') {
        if (!this.seq[num]) {
          //console.log(num, this.seq[num])
            this.seq[num] = new Seq(this, '0', subdivision, phraseLength, num, this.triggerDrum.bind(this));
            this.seq[num].parent = this
            this.seq[num].vals = parseStringSequence(arr)
            this.seq[num].loopInstance.stop()
            this.seq[num].createLoop = this.newCreateLoop
            this.seq[num].createLoop()
        } else {
            //console.log('update seq')
            this.seq[num].drumSequence(arr, subdivision, phraseLength);
        }
    }
    createSequence(num){
      this.seq[num] = new Seq(this, '0', '16n', 'infinite', num, this.triggerDrum.bind(this));
      this.seq[num].parent = this
      this.seq[num].vals = ['.']
      this.seq[num].loopInstance.stop()
      this.seq[num].createLoop = this.newCreateLoop
      this.seq[num].createLoop()
    }
    expr(func, len = 32, subdivision = '16n', num = 0) {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, [], subdivision, 'infinite', num, this.parseNoteString.bind(this));
        }
        this.seq[num].expr(func, len, subdivision);
        this.start(num);
    }

    euclid(seq, hits=4, beats=8, rotate=0, subdivision = '8n', num = 0){
        if (!this.seq[num]) {
            this.sequence(seq, subdivision='8n', num, 'infinite');
        } else {
            this.seq[num].drumSequence(seq, subdivision, 'infinite');
        }
        this.seq[num].euclid(hits, beats,rotate);
        this.start(num);
    }


  /**
     * plays the provided sequence array initializes a Tone.Loop with the given subdivision.
     *
     * @param {string} arr - The sequence of notes as a string.
     * @param {number} iterations - The the number of times to play the sequence
     * @param {string} [subdivision] - The rhythmic subdivision for the loop (e.g., '16n', '8n').
     * @param {string} num (default 0) - the sequence number. Up to 10 sequences per instance.
     */
    setSeq(arr, subdivision = '8n', num = 0){
        this.seq[num] = parseStringSequence(arr)

        if (subdivision) this.setSubdivision(subdivision, num) 
    }

    newCreateLoop (){
        // Create a Tone.Loop
      //console.log('loop made')
            this.loopInstance = new Tone.Loop(time => {
              //console.log(this.num)
                if(this.enable=== 0) return
                this.index = Math.floor(Tone.Transport.ticks / Tone.Time(this.subdivision).toTicks());
                let curBeat = this.vals[this.index % this.vals.length];

                curBeat = this.checkForRandomElement(curBeat);

                const event = parseStringBeat(curBeat, time);
                //console.log(event,curBeat, this.vals,time,this.index, this.subdivision)
                for (const val of event) {
                  this.parent.triggerDrum(val[0], time + val[1] * (Tone.Time(this.subdivision)), this.index, this.num);
                }
                
            }, this.subdivision).start(0);

            this.setSubdivision(this.subdivision);
            // Start the Transport
            Tone.Transport.start();
            //console.log("loop started")
        
        
        this.loopInstance.start()
        Tone.Transport.start()
    }

  triggerDrum = (val, time=Tone.immediate(), index = 0, num=0)=>{
    // console.log(val,time,index,num)
    val = val[0]

    let octave = this.getSeqParam(this.seq[num].octave, index);
    let velocity = this.getSeqParam(this.seq[num].velocity, index);
    let duration = this.getSeqParam(this.seq[num].duration, index);
    let subdivision = this.getSeqParam(this.seq[num].subdivision, index);
    let lag = this.getSeqParam(this.seq[num].lag, index);

    let subdivisionTime = Tone.Time(subdivision).toSeconds();

    let groove = Groove.get(subdivision,index)
    // Calculate lag as a percentage of subdivision
    let lagTime = (lag) * subdivisionTime;
    //console.log(lag, subdivisionTime, lagTime)

    // Apply lag to time
    time = time + lagTime + groove.timing

    
    //console.log(groove)
    const timeOffset = val[1] * (Tone.Time(subdivision)) + lag + groove.timing
    velocity = (velocity/100) * groove.velocity
    if( Math.abs(velocity)>2) velocity = 2

    switch(val){
      case '.': break;
      case '0': case 0: this.kick.trigger(1*velocity,1,time); break; //just because. . . .
      case 'O': this.kick.trigger(1*velocity,1,time); break;
      case 'o': this.kick.triggerGhost(velocity,1,time); break;
      
      case 'X': this.snare.trigger(1*velocity,1,time); break;
      case 'x': this.snare.triggerGhost(velocity,1,time); break;
      case '*': this.hat.triggerChoke(.75*velocity,0.1,time); break;
      case '^': this.hat.trigger(.75*velocity,1,time); break;
      
      case '1': case 1: this.p1.trigger(1*velocity,1,time); break;
      case '2': case 2: this.p2.trigger(1*velocity,1,time); break;
      case '3': case 3: this.p3.trigger(1*velocity,1,time); break;
      default: console.log('triggerDrum(), no matching drum voice ', val, '\n')
    }   
  }

  //drawBeat doesn't really work but is an attempt to draw the 
    //sequence to a canvas using html
  drawBeat (canvasId) {
        const verticalOrder = ['^', '*', '1', '2', '3', 'x', 'X', 'o', 'O'];
        const verticalSpacing = 20; // Vertical spacing between each row
        const horizontalSpacing = 40; // Horizontal spacing between each character
        const canvas = document.getElementById(canvasId);
        const beat = this.seq.original
        canvas.innerHTML = ''; // Clear any existing content

        for (let i = 0; i < beat.length; i++) {
            const element = beat[i];
            const verticalIndex = verticalOrder.indexOf(element);

            if (verticalIndex !== -1) {
                const yPos = verticalIndex * verticalSpacing; // Calculate vertical position
                const xPos = i * horizontalSpacing; // Calculate horizontal position

                const beatElement = document.createElement('div');
                beatElement.className = 'beat';
                beatElement.style.transform = `translate(${xPos}px, ${yPos}px)`;
                beatElement.textContent = element;

                canvas.appendChild(beatElement);
            }
        }
      }

  /**
     * Load a preset by name
     * @param {string} name - Name of the preset to load
     * @returns {void}
     * @example synth.loadPreset('default')
     */
    loadPreset(name) {
        setTimeout(()=>{
          this.curPreset = name;
        const presetData = this.presets[this.curPreset];

        if (presetData) {
            //console.log("Loading preset ", this.curPreset, presetData);
            for (let id in presetData) {
                try {
                    for (let element of Object.values(this.gui_elements)) {
                        
                        if (element.id === id) {
                          //console.log(id, presetData[id])
                            if (element.type !== 'momentary') element.set(presetData[id]);
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        } else {
            //console.log("No preset of name ", name);
        }
      },1000)
    }
}


window.DrumSynthPresets = {
  "default": {
    "detune": 0.49999999999999956,
    "drive2": 0.1567999999999999,
    "fm": 0,
    "am": 0,
    "harm": 2.006999999999993,
    "cutoff": 3170.3199999999993,
    "Q": 0,
    "noiseG": 0.375,
    "toneG": 0.39015,
    "vol": 0.5,
    "drop": 199.9999999999999,
    "decay": 0.5779999999999995,
    "pDecay": 0.07784100000000005,
    "nDecay": 0.0605,
    "nFreq": 1764.1899999999994,
    "nEnv": 1191.6400000000012,
    "vcfEnv": 1945.0850000000016
  },
  "kick": {
    "detune": 0.49999999999999956,
    "drive2": 0.2738,
    "fm": 0,
    "am": 0,
    "harm": 2.006999999999993,
    "cutoff": 886.7949999999983,
    "Q": 3.108841807610066,
    "noiseG": 0.375,
    "toneG": 0.39015,
    "vol": 0.5,
    "drop": 17.999999999999968,
    "decay": 0.28799999999999937,
    "pDecay": 0.07784100000000005,
    "nDecay": 0.07200000000000001,
    "nFreq": 670.239999999999,
    "nEnv": 1191.6400000000012,
    "vcfEnv": 1945.0850000000016
  },
  "snare": {
    "detune": 1,
    "drive2": 0.2738,
    "fm": 1.0240000000000005,
    "am": 0,
    "harm": 2.006999999999999,
    "cutoff": 4384.22,
    "Q": 6.021722656131611,
    "noiseG": 0.40560000000000007,
    "toneG": 0.39015,
    "vol": 0.5,
    "drop": 0,
    "decay": 0.16199999999999942,
    "pDecay": 0.07784100000000005,
    "nDecay": 0.26450000000000023,
    "nFreq": 932.589999999999,
    "nEnv": 1191.6400000000012,
    "vcfEnv": 214.37500000000026
  },
  "hat": {
    "detune": 1,
    "drive2": 0.2738,
    "fm": 1.0240000000000005,
    "am": 0,
    "harm": 2.006999999999999,
    "cutoff": 10000,
    "Q": 0,
    "noiseG": 0.40560000000000007,
    "toneG": 0,
    "vol": 0.5,
    "drop": 0,
    "decay": 0.16199999999999942,
    "pDecay": 0.07784100000000005,
    "nDecay": 0.12800000000000006,
    "nFreq": 6278.590000000001,
    "nEnv": 109.7600000000001,
    "vcfEnv": 214.37500000000026
  },
  "ride": {
    "detune": 11,
    "drive2": 0.1457999999999999,
    "fm": 14,
    "am": 0,
    "harm": 23.43,
    "cutoff": 10000,
    "Q": 0,
    "noiseG": 1.5,
    "toneG": 0.42135000000000006,
    "vol": 0.5,
    "drop": 0,
    "decay": 2.3433629976826644,
    "pDecay": 1,
    "nDecay": 5,
    "nFreq": 6278.590000000001,
    "nEnv": 3767.8550000000046,
    "vcfEnv": 214.37500000000026
  },
  "splash": {
    "detune": 11,
    "drive2": 0.1457999999999999,
    "fm": 14,
    "am": 0,
    "harm": 23.43,
    "cutoff": 10000,
    "Q": 3.706805103404472,
    "noiseG": 1.5,
    "toneG": 0.15359999999999985,
    "vol": 0.5,
    "drop": 0,
    "decay": 1,
    "pDecay": 1,
    "nDecay": 3,
    "nFreq": 10000,
    "nEnv": 0,
    "vcfEnv": 5000
  },
  "crash": {
    "detune": 11,
    "drive2": 0.1457999999999999,
    "fm": 14,
    "am": 0,
    "harm": 23.43,
    "cutoff": 10000,
    "Q": 5.545158745241173,
    "noiseG": 1.5,
    "toneG": 0.15359999999999985,
    "vol": 0.5,
    "drop": 0,
    "decay": 1,
    "pDecay": 1,
    "nDecay": 10,
    "nFreq": 10000,
    "nEnv": 744.3850000000006,
    "vcfEnv": 0
  }
};;

window.drumLayout = {
    "vco": {
      "color": [150, 0, 0],
      "boundingBox": { "x": 5, "y": 20, "width": 30, "height": 50 },
      "offsets": { "x": 10, "y": 20 },
      "groupA": ["type"],
      "controlTypeA": "radioButton",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.75,
      "theme": "dark"
    },
    "vcf": {
      "color": [100, 0, 150],
      "boundingBox": { "x": 45, "y": 20, "width": 40, "height": 100 },
      "offsets": { "x": 10, "y": 30 },
      "groupA": ["cutoff"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.6
    },
    "vca": {
      "color": [100, 50, 100],
      "boundingBox": { "x": 90, "y": 20, "width": 20, "height": 100 },
      "offsets": { "x": 12, "y": 30 },
      "groupA": ["level"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.5,
      "sizeB": 0.5
    },
    "env": {
      "color": [50, 100, 100],
      "boundingBox": { "x": 5, "y": 60, "width": 100, "height": 50 },
      "offsets": { "x": 8, "y": 30 },
      "groupA": ["decay","pDecay","nDecay","nEnv"],
      "controlTypeA": "knob",
      "controlTypeB": "fader",
      "sizeA": 0.5,
      "sizeB": 1.0
    },
    "lfo": {
      "color": [20, 0, 100],
      "boundingBox": { "x": 50, "y": 70, "width": 50, "height": 50 },
      "offsets": { "x": 12, "y": 30 },
      "groupA": ["rate"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.6
    }
  
};;


const paramDefinitions = (synth) => [
    {
        name:'detune',type:'vco',
        min:0.,max:2,curve:1,
        isSignal: 'true', connectTo: synth.tuning.factor,
        callback:(x,time=null)=>{
            if(time) synth.tuning.factor.setValueAtTime(x,time)
            else synth.tuning.factor.value = x
        }
        },
    {
        name:'drive2',type:'vco',
        min:0.,max:2,curve:2,
        isSignal: 'true', connectTo: synth.drive.gain,
        callback:(x,time=null)=>{
            if(time) synth.drive.gain.setValueAtTime(x,time)
            else synth.drive.gain.value = x
         }   
        },
    {
        name:'fm',type:'vcf',
        min:0.,max:10,curve:2,
        isSignal: 'true', connectTo: synth.fmDepth.factor,
        callback:(x,time=null)=>{
            if(time) synth.modIndex.setValueAtTime(x,time)
            else synth.modIndex.value = x
        }
        },
    {
        name:'am',type:'vcf',
        min:0.,max:2,curve:2,
        isSignal: 'true', connectTo: synth.amDepth.factor,
        callback:(x,time=null)=>{
            if(time) synth.amDepth.gain.setValueAtTime(x,time)
            else synth.amDepth.gain.value = x
        }
        },
    {
        name:'harm',type:'vcf',
        min:1.,max:20,curve:1,
        isSignal: 'true', connectTo: synth.harmonicity.factor,
        callback:(x,time=null)=>{
            if(time) synth.harmonicity.factor.setValueAtTime(x,time)
            else synth.harmonicity.factor.value = (x)}
        },
    {
        name:'cutoff',type:'vcf',
        min:50.,max:10000,curve:2,
        isSignal: 'true', connectTo: synth.cutoffSig,
        callback:(x,time=null)=>{
            if(time) synth.cutoffSig.setValueAtTime(x,time)
            else synth.cutoffSig.value = x
            }
        },
    {
        name:'Q',type:'vcf',
        min:0.,max:20,curve:0.7,
        isSignal: 'true', connectTo: synth.finalFilter.Q,
        callback:(x,time=null)=>{
            if(time) synth.finalFilter.Q.setValueAtTime(x,time)
            else synth.finalFilter.Q.value = x
            }
        },
    {
        name:'noiseG',type:'vca',
        min:0.,max:1.5,curve:2,
        isSignal: 'true', connectTo: synth.noiseGain.gain,
        callback:(x,time=null)=>{
            if(time) synth.noiseGain.gain.setValueAtTime(x,time)
            else synth.noiseGain.gain.value = x
            }
        },
    {
        name:'toneG',type:'vca',
        min:0.,max:1.5,curve:2,
        isSignal: 'true', connectTo: synth.drive.gain,
        callback:(x,time=null)=>{
            if(time) synth.toneGain.gain.setValueAtTime(x,time)
            else synth.toneGain.gain.value = x
            }  
        },
    {
        name:'vol',type:'vca',
        min:0.,max:2,curve:2,
        isSignal: 'true', connectTo: synth.output.factor,
        callback:(x,time=null)=>{
            if(time) synth.output.factor.setValueAtTime(x,time)
            else synth.output.factor.value = x
            }
        },
    {
        name:'drop',type:'vco',
        min:0.,max:5000,curve:2,
        isSignal: 'true', connectTo: synth.pitchEnvDepth.factor,
        callback:(x,time=null)=>{
            if(time) synth.pitchEnvDepth.factor.setValueAtTime(x,time)
            else synth.pitchEnvDepth.factor.value = x
            }
        },
    {
        name:'decay',type:'env',
        min:0.,max:5,curve:2,
        isSignal: 'false', connectTo: synth.env.decay,
        callback:(x,time=null)=>{ synth.env.decay = x; synth.env.release = x }
        },
    {
        name:'pDecay',type:'env',
        min:0.,max:1,curve:2,
        isSignal: 'false', connectTo: synth.pitchEnvelope.decay,
        callback:(x,time=null)=>{ synth.pitchEnvelope.decay = x; synth.pitchEnvelope.release = x }
        },
    {
        name:'nDecay',type:'env',
        min:0.,max:5,curve:2,
        isSignal: 'false', connectTo: synth.noiseEnv.decay,
        callback:(x,time=null)=>{ synth.noiseEnv.decay = x; synth.noiseEnv.release = x }
        },
    {
        name:'nFreq',type:'vcf',
        min:100.,max:10000,curve:2,
        isSignal: 'true', connectTo: synth.noiseCutoff,
        callback:(x,time=null)=>{ 
            if(time) synth.noiseCutoff.setValueAtTime(x,time)
            else synth.noiseCutoff.value = x; }
        },
    {
        name:'nEnv',type:'env',
        min:0.,max:5000,curve:3,
        isSignal: 'true', connectTo: synth.noiseVcfEnvDepth.factor,
        callback:(x,time=null)=>{
            if(time) synth.noiseVcfEnvDepth.factor.setValueAtTime(x,time)
            else synth.noiseVcfEnvDepth.factor.value = x
            }
        },
    {
        name:'vcfEnv',type:'vcf',
        min:0.,max:5000,curve:3,
        isSignal: 'true', connectTo: synth.vcfEnvDepth.factor,
        callback:(x,time=null)=>{
            if(time) synth.vcfEnvDepth.factor.setValueAtTime(x,time)
            else synth.vcfEnvDepth.factor.value = x
            }
        },
    // {name:'adsr',type:'env',min:0,max:1,curve:2,value:[.01,.1,.5,.5],
    //     labels:['attack','decay','sustain','release'],
    //     callback:(x,i=null)=>{ synth.setADSR('env',x, i) }
    // },
    // {name:'noise',type:'env',min:0,max:1,curve:2,value:[.01,.1,.5,.5],
    //     labels:['attack','decay','sustain','release'],
    //     callback:(x,i=null)=>{ synth.setADSR('noise',x, i) }
    // },
    // {name:'pitch',type:'env',min:0,max:1,curve:2,value:[.01,.1,.5,.5],
    //     labels:['attack','decay','sustain','release'],
    //     callback:(x,i=null)=>{ synth.setADSR('pitch',x, i) }
    // },
];


paramDefinitions;

;
;

;
;
;
;



class DrumSynth extends DrumTemplate{
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
        //this.layout = dlayout
        this.name = 'DrumSynth'
        this.presets = presets
		this.synthPresetName = "DrumSynthPresets"
		//this.accessPreset()


        // Oscillator and AM stage
        this.frequency = new Tone.Signal(this.params.toneFrequency)
        this.tuning = new Tone.Multiply(1)
        this.harmonicity = new Tone.Multiply(1); // Modulation depth
        this.frequency.connect( this.harmonicity)
        this.vco = new Tone.Oscillator(this.params.toneFrequency, "sine").start();
        this.frequency.connect(this.tuning)
        this.tuning.connect(this.vco.frequency)
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
        this.waveshaper = new Tone.WaveShaper(value=> Math.tanh(value*4));
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
        //this.pitchEnvelope.releaseCurve = 'linear'
        //this.pitchEnvelope.decayCurve = 'linear'

        this.toneVca = new Tone.Multiply()
        this.toneGain = new Tone.Gain(1)
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
        this.toneVca.connect(this.toneGain);
        this.toneGain.connect(this.finalFilter);
        this.noiseVca.connect(this.finalFilter);
        this.finalFilter.connect(this.output);
        this.vcfEnvDepth = new Tone.Multiply();
        this.vcfEnvDepth.connect(this.finalFilter.frequency)
        this.env.connect(this.vcfEnvDepth)

        

        // Bind parameters with this instance
        this.paramDefinitions = paramDefinitions(this)
        this.param = this.generateParameters(this.paramDefinitions)
        this.createAccessors(this, this.param);

        //for autocomplete
        this.autocompleteList = this.paramDefinitions.map(def => def.name);;
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

    // Trigger a drum hit
    trigger(time = Tone.now()) {
        this.env.triggerAttackRelease(.01, time);
        this.noiseEnv.triggerAttackRelease(.01, time);
        this.pitchEnvelope.triggerAttackRelease(.01, time);
    }

    triggerAttackRelease(val=48, vel = 100, dur = 0.01, time = null) {
        //console.log('AR ',val,vel,dur,time)
        vel = vel / 127;
        if (time) {
            this.frequency.setValueAtTime(Tone.Midi(val).toFrequency(), time);
            this.env.triggerAttackRelease(.01, time);
            this.noiseEnv.triggerAttackRelease(.01, time);
            this.pitchEnvelope.triggerAttackRelease(.01 , time);
        } else {
            //this.frequency.value = Tone.Midi(val).toFrequency();
            //this.env.triggerAttackRelease(dur);
        }
    }
}

class SimpleSeq{
	constructor(value=0, number = 10){
		this.numSeqs = number
		this.seq = new Array(this.numSeqs).fill(value)
	}
	get(num=0,index=0){
		num = num % this.numSeqs
		if(Array.isArray( this.seq[num] )){
			return this.seq[num][index%this.seq[num].length]
		} else {
			return this.seq[num]
		}
	}
	set(num, val){ this.seq[num] = val}
	setAll(val) {this.seq = new Array(this.numSeqs).fill(val)}

	set val (x){this.setAll(x)}
	get val (){return this.seq[0]}
	set value (x){ this.setAll(x) }
}

/**
 * Drummer.js
 * 
 * Single drum voice
 * 
 * player -> vcf -> vca -> output
 * 
 * env -> gain -> vca.factor
 * accentEnv -> accentDepth -> vca.factor
 * 
 * uses the standard sequence type, with parameters for:
 * - velocity
 * - tuning: sample playback rate
 * - decay: base decay time for envelope
 * - choke: scalar for decay
 * - tone: multirange filter
 * - strike: position of sample to start playing
 * - accent: selectable volume boost
 * 
 * The sequence can either use a specified char to trigger playback
 * or use a float to set amplitude(velocity)
 * 
 * 
 */

;
;




/**
 * DrumSampler class extends DrumTemplate to create a drum sampler with various sound manipulation features.
 * It loads and triggers different drum samples based on the selected kit.
 * 
 * extends DrumTemplate
 */
class Drummer extends DrumTemplate{
  constructor(voice = "kick", kit = "acoustic") {
    super()
    this.name = "Drummer"
    this.voice = voice
    this.kit = kit
    this.drumkitList = ["LINN", "Techno", "TheCheebacabra1", "TheCheebacabra2", "acoustic-kit", "breakbeat13", "breakbeat8", "breakbeat9", "4OP-FM", "Bongos", "CR78", "KPR77", "Kit3", "Kit8"]
    //
    this.output = new Tone.Multiply(1);
    this.env = new Tone.Envelope(0.001, 1, 1, 10)
    this.vca = new Tone.Multiply()
    this.gain = new Tone.Multiply(1)
    this.drum = new Tone.Player()
    this.vcf = new Tone.Filter({type:'lowpass', rolloff:'-12',Q:0,frequency:10000})
    this.vcfEnvDepth = new Tone.Multiply()
    this.cutoffFreq = new Tone.Signal()
    this.accentEnv = new Tone.Envelope({attack:.003,decay:.1,sustain:0,release:.1})
    this.accentDepth = new Tone.Multiply()

    //connections
    this.drum.connect(this.vcf)
    this.vcf.connect(this.vca)
    this.vca.connect(this.output)

    this.cutoffFreq.connect(this.vcf.frequency)
    this.env.connect(this.vcfEnvDepth)
    this.accentEnv.connect(this.vcfEnvDepth)
    this.vcfEnvDepth.connect(this.vcf.frequency)

    this.env.connect( this.gain)
    this.gain.connect( this.vca.factor)
    this.accentEnv.connect(this.accentDepth)
    this.accentDepth.connect( this.vca.factor)

    //parameters
    this.velocity = new SimpleSeq(1)
    this.strike = new SimpleSeq(0)
    this.curStrike = 0
    this.damp = new SimpleSeq(0)
    this.chokeRatio = .5
    this.choke = new SimpleSeq(0)
    this.decay = new SimpleSeq(1)
    this.tone = new SimpleSeq(1)
    this.accent = new SimpleSeq(0)
    this.accentLevel = .2
    this.tuning = new SimpleSeq(1)
    this.subdivision = new SimpleSeq('16n')

    // let paramDefinitions = [
    //   {name:'volume',min:0.0,max:1,curve:2,callback:x=>this.output.factor.value = x},
    //   {name:'velocity',min:0.0,max:1,curve:2,callback:x=>this.velocityVal.setAll(x)},
    //   {name:'decay',min:0.0,max:1.,curve:2,callback:x=>this.decayTime.setAll(x)},
    //   {name:'damping',min:0,max:1,curve:2,callback:x=>this.dampValue.setAll(x)},
    //   {name:'choke',min:0,max:1,curve:2,callback:x=>this.chokeRatio=x},
    //   {name:'tone',min:0.0,max:1,curve:2,callback:x=>this.toneAmount.setAll(x)},
    //   {name:'accent',min:0.0,max:1,curve:2,callback:x=>this.accentLevel=x},
    //   {name:'tuning',min:0.0,max:2,curve:1,callback:x=>this.tuningAmount.setAll(x)},
    //   {name:'strike',min:0.0,max:1.,curve:2,callback:x=>this.strikePosition.setAll(x)}
    // ]

    // this.param = this.generateParameters(paramDefinitions)
    // this.createAccessors(this, this.param);

    this.sampleLength = 1
    //
    this.loadSamples(this.kit)
    this.prevTime = 0

  }//constructor


  /**
   * Load a specific drum kit.
   * - duplicates loadSamples()
   * @param {string} kit - The name of the drum kit to load.
   */
  loadKit(kit){ this.loadSamples(kit)}
  listKits(){console.log(this.drumkitList)}
  loadSamples(kit){
    this.kit = kit
    this.drumFolders = {
      "4OP-FM": "4OP-FM", "FM": "4OP-FM",
      "Bongos": "Bongos", "Bongo": "Bongos",
      "CR78": "CR78", 
      "KPR77": "KPR77",
      "Kit3": "Kit3","kit3": "Kit3", 
      "Kit8": "Kit8", "kit8": "Kit8", 
      "LINN": "LINN", "linn": "LINN", 
      "R8": "R8",
      "Stark": "Stark", "stark": "Stark", 
      "Techno": "Techno", "techno": "Techno", 
      "TheCheebacabra1": "TheCheebacabra1", "Cheese1": "TheCheebacabra1",
      "TheCheebacabra2": "TheCheebacabra2",  "Cheese2": "TheCheebacabra2",
      "acoustic-kit": "acoustic-kit", "acoustic": "acoustic-kit", "Acoustic": "acoustic-kit",
      "breakbeat13": "breakbeat13", 
      "breakbeat8": "breakbeat8", 
      "breakbeat9": "breakbeat9",
    }

     if (this.kit in this.drumFolders) {
      console.log(`Drumsampler loading ${this.kit}`);
    } else {
      console.error(`The kit "${this.kit}" is not available.`);
      return
    }

    this.baseUrl = "https://tonejs.github.io/audio/drum-samples/".concat(this.drumFolders[this.kit]);
    this.urls = {
      "C3": "/kick.mp3",
      "D3": "/snare.mp3",
      "F#3": "/hihat.mp3",
      "F3": "/tom1.mp3",
      "G3": "/tom2.mp3",
      "A3": "/tom3.mp3"
    }
    // Load the sample and store its length in ms
    this.drum = new Tone.Player({
        url: this.baseUrl.concat("/" + this.voice + ".mp3"),
        onload: () => {
            // Access the buffer duration and convert to milliseconds
            this.sampleLength = this.drum.buffer.duration; // duration in ms
            console.log("Sample length:", this.sampleLength, " seconds");
            this.drum.connect(this.vcf)
        }
    })
  }

  /**
   * Trigger a specific drum voice.
   * 
   * @param {string} voice - The name of the drum voice to trigger (e.g., "kick", "snare").
   * @param {number} vel - The velocity (amplitude) of the triggered voice.
   * @param {number} time - The time at which to trigger the voice.
   */
  trigger(vel, time){
    console.log('trig', vel)
    try{
      this.drum.volume.setValueAtTime( Tone.gainToDb(vel), time)
      this.drum.start( time, this.curStrike )
      this.env.triggerAttackRelease(.001, time)
    } catch(e){
      console.log('time error')
    }
  }
  
  parseNoteString(val, time, num, index){
    if(val[0] === ".") return

    let vel = val[0]
    let div = val[1]

    this.loopFunc(index, num, vel, time + div * (Tone.Time(this.subdivision[num])))
    return
        
        // const usesPitchNames = /^[a-ac-zA-Z]$/.test(val[0][0]);

        // let note = ''
        // //console.log(val[0], usesPitchNames)
        // //if( usesPitchNames ) note =  pitchNameToMidi(val[0])
        // if( usesPitchNames ) {
        //   console.log("drummer doesn't use pitches")
        //   return
        // }
        // //else note = intervalToMidi(val[0], this.min, this.max)
        // const div = val[1]
        // if(note < 0) return
        // //console.log(note, this.velocity[num], this.sustain[num], time)

        // //check for velocity,octave,sustain, and roll arrays
        // // let octave = this.getNoteParam(this.octave[num],index)
        // // let velocity = this.getNoteParam(this.velocity[num],index)
        // // let sustain = this.getNoteParam(this.sustain[num],index)
        // //let roll = getNoteParam(this.roll[num],this.index[num])
        // //console.log(note + octave*12, velocity, sustain)
        // try{
        //     this.trigger(velocity,time + div * (Tone.Time(this.subdivision[num])));
        // } catch(e){
        //     console.log('invalid note', note + octave*12, velocity, sustain)
        // }
    }

    getNoteParam(val,index){
        if( Array.isArray(val)) return val[index%val.length]
        else return val    
    }
    setNoteParam(val,arr){
        for(let i=0;i<arr.length;i++) arr[i] = val
        return arr
        // if( Array.isArray(val)) return val[index%val.length]
        // else Array(num).fill(val)
    }
    //convert tone value from 0-1 to Hz
    toneScalar(val,time){
      val = Math.pow(val,2)
      //console.log( val*2000,  10000-val*9900)
      this.vcfEnvDepth.factor.setValueAtTime( val*4000, time)
      this.cutoffFreq.setValueAtTime( (1-val)*10000, time)
    }
    /**
   * Trigger the drum voice.
   * @param {number} vel - The velocity (amplitude) of the triggered voice.
   * @param {number} time - The time at which to trigger the voice.
   */
    loopFunc(index, num=0, vel=127, time=Tone.now()){
      let velocity = vel * this.velocity.get(num,index)
      let curDecay = this.decay.get(num,index)
      this.env.release = this.sampleLength * curDecay
      if(this.choke.get(num,index)!= 1) curDecay*=this.chokeRatio
      this.toneScalar(this.damp.get(num,index),time)
      if(this.accent.get(num,index)) this.accentEnv.triggerAttackRelease(.05)
      this.curStrike = this.strike.get(num,index)
      //this.drum.playbackRate = this.tuning.get(num,index)
      this.trigger(velocity,time)
    }
}

/*
 *
 * Class to define a multiVCO which can produce multiple waves in series
 * Parameters are frequency, types of waves, and scalars to shift the pitch (0.5 for down an octave, 2 for up an octave)
 * 
*/

;
;

class MultiVCO{
    constructor(vcos = [], pitchshift = []){
        this.numInputs = vcos.length
        this.frequency = new Tone.Signal(1)
        this.output = this.numInputs === 0 ? new Tone.Multiply(1) : new Tone.Multiply(1/this.numInputs)

        this.freqScalars= []
        this.gainStages = []
        this.vco = []

        for(this.i=0;this.i<this.numInputs;this.i++) {
            this.freqScalars.push(new Tone.Multiply(pitchshift[this.i]))
            if (vcos[this.i] === 'noise') {
                this.vco.push(new Tone.Noise("white").start())
            }
            else {
                this.vco.push(new Tone.Oscillator({type:vcos[this.i]}).start())
            }
            this.gainStages.push(new Tone.Multiply(1))
            this.frequency.connect(this.freqScalars[this.i])
            if (vcos[this.i] !== 'noise') {
                this.freqScalars[this.i].connect(this.vco[this.i].frequency)
            }
            this.vco[this.i].connect(this.gainStages[this.i])
            this.gainStages[this.i].connect(this.output)
        }
    }

    addVoice = (vcoType)=> {
        this.freqScalars.push(new Tone.Multiply(1))
        if (vcoType === 'noise') {
            this.vco.push(new Tone.Noise("white").start())
        }
        else {
            this.vco.push(new Tone.Oscillator({type:vcoType}).start())
        }
        this.gainStages.push(new Tone.Multiply(1))
        this.frequency.connect(this.freqScalars[this.numInputs])
        if (vcoType !== 'noise') {
            this.freqScalars[this.numInputs].connect(this.vco[this.numInputs].frequency)
        }
        this.vco[this.numInputs].connect(this.gainStages[this.numInputs])
        this.gainStages[this.numInputs].connect(this.output)
        this.numInputs++
        this.output.factor.value = 1/this.numInputs
    }

    removeVoice = (index = 0)=> {
        this.vco[index].stop()
        this.frequency.disconnect(this.freqScalars[index])
        if (this.vco[index].type !== 'noise') {
            this.freqScalars[index].disconnect(this.vco[index].frequency)
        }
        this.vco[index].disconnect(this.gainStages[index])
        this.gainStages[index].disconnect(this.output)
        if (index < this.numInputs - 1) {
            for (let i = index; i < this.numInputs ; i++) {
                this.freqScalars[i] = this.freqScalars[i+1]
                this.gainStages[i] = this.gainStages[i+1]
                this.vco[i] = this.vco[i+1]
            }
        }
        this.freqScalars.pop()
        this.gainStages.pop()
        this.vco.pop()

        this.numInputs--
        this.output.factor.value = this.numInputs === 0 ? 1 : 1/this.numInputs
    }

    setPitchshift= (index, shift) =>{
        if (index >= this.numInputs || index < 0) {
            console.log("Index out of range")
        }
        else {
            this.freqScalars[index].factor.value = shift
        }
    }

    setGain = (index, level)=> {
        if (index >= this.numInputs || index < 0) {
            console.log("Index out of range")
        }
        else {
            this.gainStages[index].factor.value = level
        }
    }

    connect(destination) {
        if (destination.input) {
            this.output.connect(destination.input);
        } else {
            this.output.connect(destination);
        }
    }

    disconnect(destination) {
        if (destination.input) {
            this.output.disconnect(destination.input);
        } else {
            this.output.disconnect(destination);
        }
    }
}

/*
 * 6 voice subtractive synthesizer
 *
 * 
*/

;
;


// ;
;

class ESPSynth extends MonophonicTemplate {
    constructor (gui = null, waves = ['triangle', 'sawtooth', 'square', 'square', 'square', 'noise'], pitches = [1, 1, 1, 0.5, 0.25, 1]) {
        super()
        this.gui = gui
    	this.presets = {};
		this.synthPresetName = "ESPSynthPresets"
		this.accessPreset()
        this.name = "ESPSynth"
        //console.log(this.name, " loaded, available preset: ", ESPSynthPresets)

        this.frequency = new Tone.Signal()
        this.pitchshift = new Tone.Multiply()
        this.vco = new MultiVCO(waves, pitches)
        this.lfo = new Tone.LFO().start()
        this.vibratoSwitch = new Tone.Multiply()
        this.wahSwitch = new Tone.Multiply()
        this.vcf = new Tone.Filter()
        this.cutoff = new Tone.Signal()
        this.env = new Tone.Envelope()
        this.vcfVelocityDepth = new Tone.Signal(1)
        this.vcaVelocityDepth = new Tone.Signal(1)
        this.vcfEnvDepth = new Tone.Multiply()
        this.vcfVelocity = new Tone.Multiply(1)
        this.vcaEnvDepth = new Tone.Multiply()
        this.vcaVelocity = new Tone.Multiply(1)
        this.vca = new Tone.Multiply()
        this.output = new Tone.Multiply(1)

        //connect input signal to multiVCO
        this.frequency.connect(this.pitchshift)
        this.pitchshift.connect(this.vco.frequency)
        this.pitchshift.value = 1

        //connect vco to vcf
        this.vco.connect(this.vcf)
        this.cutoff.connect(this.vcf.frequency)
        this.vcf.rolloff = -24
        this.vcf.Q.value = 1

        //enable the lfo to impact pitch or filter
        this.lfo.connect(this.vibratoSwitch) //switch between 0 and 1
        this.vibratoSwitch.connect(this.vco.frequency)
        this.lfo.connect(this.wahSwitch)
        this.wahSwitch.connect(this.vcf.frequency)

        //Set up filter envelope

        this.env.connect(this.vcfEnvDepth)
        this.vcfEnvDepth.connect(this.vcfVelocity)
        this.vcfVelocity.connect(this.vcf.frequency)
        this.vcfVelocityDepth.connect(this.vcfVelocity.factor)

        //connect vcf to vca
        this.vcf.connect(this.vca)

        //set up amplitude envelope
        this.vcaEnvDepth.factor.value = 1
        this.env.connect(this.vcaEnvDepth)
        this.vcaEnvDepth.connect(this.vcaVelocity)
        this.vcaVelocity.connect(this.vca.factor)
        this.vcaVelocityDepth.connect(this.vcaVelocity.factor)

        //effects chain

        //distortion
        this.dist = new Tone.Distortion()
        // this.distgain = new Tone.Multiply(1)
        // this.distout = new Tone.Add()
        // this.vca.connect(this.distout)
        // this.vca.connect(this.distgain)
        // this.distgain.connect(this.dist)
        // this.dist.connect(this.distout)
        this.vca.connect(this.dist)

        //chorus
        this.chor = new Tone.Chorus(2.5, 5, 0.9)
        this.dist.connect(this.chor)
        // this.chorgain = new Tone.Multiply(1)
        // this.chorout = new Tone.Add()
        // this.distout.connect(this.chorout)
        // this.distout.connect(this.chorgain)
        // this.chorgain.connect(this.chor)
        // this.chor.connect(this.chorout)

        // this.chorout.connect(this.output)
        this.chor.connect(this.output)

        //velocity
        this.velo = 10
        this.amp = this.velo/127

        this.vcfDynamicRange = 0  //at low values, there's low dynamic range
        this.vcaDynamicRange = 0  //at high values, there's high dynamic range

        if (this.gui !== null) {
            this.initGui()
            this.hideGui();
            setTimeout(()=>{this.loadPreset('default')}, 500);
        }
    }

    octaveMapping = (x)=> {
        if (x !== undefined) {
            if (x === '4') return 2;
            else if (x === '8') return 1;
            else if (x === '16') return 0.5;
        }
        else return 1
    }

    lfoControl = (x)=> {
        if (x !== undefined) {
            let controlVal = Math.abs(x-0.5) * 2
            let lfoDepth = 50
            if (x < 0.47) {
                //this.lfo.min = -lfoDepth * stepper(controlVal, 0, 1, [[0,0],[0.6,0.2],[1,1]])
                this.lfo.min = -lfoDepth * controlVal
                // this.lfo.max = lfoDepth * stepper(controlVal, 0, 1, [[0,0],[0.6,0.2],[1,1]])
                this.lfo.max = lfoDepth * controlVal
                this.vibratoSwitch.value = 1
                this.wahSwitch.value = 0
            }
            else if (x >= 0.47 && x <= 0.49) {
                this.vibratoSwitch.value = 0
                this.wahSwitch.value = 0
            }
            else if (x > 0.49) {
                this.lfo.min =  0
                //this.lfo.max = lfoDepth * stepper(controlVal, 0, 1, [[0,0],[0.6,0.2],[1,1]])
                this.lfo.max = lfoDepth * controlVal
                this.vibratoSwitch.value = 0
                this.wahSwitch.value = 100 * controlVal
            }
        }
    }


    //envelopes
    triggerAttack (freq, amp, time=null){ 
        freq = Tone.Midi(freq).toFrequency()
        amp = amp/127
        if(time){
            this.env.triggerAttack(time)
            this.frequency.setValueAtTime(freq, time)
            this.vcfVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcfDynamicRange],[1,1]]),.03)
            this.vcaVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcaDynamicRange],[1,1]]),.03)
        } else{
            this.env.triggerAttack()
            this.frequency.value = freq
            this.vcfVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcfDynamicRange],[1,1]]),.03)
            this.vcaVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcaDynamicRange],[1,1]]),.03)
        }
    }

    triggerRelease (time=null){
        if(time) {
            this.env.triggerRelease(time)
        }
        else {
            this.env.triggerRelease()
        }
    }

    triggerAttackRelease (freq, amp, dur=0.01, time=null){
    freq = Tone.Midi(freq).toFrequency()
    amp = amp/127
    if(time){
        this.env.triggerAttackRelease(dur, time)
        this.frequency.setValueAtTime(freq, time)
        // this.vcfVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcfDynamicRange],[1,1]]),.01)
        // this.vcaVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcaDynamicRange],[1,1]]),.01)
        this.vcfVelocityDepth.setValueAtTime(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcfDynamicRange],[1,1]]),time)
        this.vcaVelocityDepth.setValueAtTime(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcaDynamicRange],[1,1]]),time)
    } else{
        this.env.triggerAttackRelease(dur)
        this.frequency.value = freq
        this.vcfVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcfDynamicRange],[1,1]]),.01)
        this.vcaVelocityDepth.rampTo(stepper(amp, 0, 1, [[0,0],[0.001, 1 - this.vcaDynamicRange],[1,1]]),.01)
    }
    }//attackRelease

    connect(destination) {
        if (destination.input) {
            this.output.connect(destination.input);
        } else {
            this.output.connect(destination);
        }
    }

    //parameter setters
    setADSR(a,d,s,r){
        this.env.attack = a>0.001 ? a : 0.001
        this.env.decay = d>0.01 ? d : 0.01
        this.env.sustain = Math.abs(s)<1 ? s : 1
        this.env.release = r>0.01 ? r : 0.01
    }

    setOutputGain(out){
        this.output.factor.value = out
    } 

    setVcoGain(num,val){
        this.vco.setGain(num, val)
    }

    initGui(gui = this.gui) {
        this.gui = gui
        this.octave_radio =  this.gui.RadioButton({
            label:'octave',
            radioOptions: ['4','8','16'],
            callback: x=>this.pitchshift.value = this.octaveMapping(x),
            x: 5, y:50,size:1, orientation:'vertical'
        })
        this.octave_radio.set('8');
        this.octave_radio.accentColor = [122,132,132]
        this.octave_radio.borderColor = [178,192,191]

        this.triangle_fader = this.gui.Slider({
            label:'tri',
            callback: (x)=>{this.setVcoGain(0, x)},
            x: 11, y: 50, size: 1.5,
            min:0.0001, max: 2,
            orientation: 'vertical',
            showValue: false,
        })
        this.triangle_fader.accentColor = [255,162,1]
        this.triangle_fader.borderColor = [20, 20, 20]
        this.triangle_fader.set(1)

        this.saw_fader = this.gui.Slider({
            label:'saw',
            callback: (x)=>{this.setVcoGain(1, x)},
            x: 17, y: 50, size: 1.5,
            min:0.0001, max: 2,
            orientation: 'vertical',
            showValue: false,
        })
        this.saw_fader.accentColor = [255,162,1]
        this.saw_fader.borderColor = [20, 20, 20]
        this.saw_fader.set(1)

        this.square_fader = this.gui.Slider({
            label:'squ',
            callback: (x)=>{this.setVcoGain(2, x)},
            x: 23, y: 50, size: 1.5,
            min:0.0001, max: 2,
            orientation: 'vertical',
            showValue: false,
        })
        this.square_fader.accentColor = [255,162,1]
        this.square_fader.borderColor = [20, 20, 20]
        this.square_fader.set(1)
        
        this.octave_down_fader = this.gui.Slider({
            label:'-1',
            callback: (x)=>{this.setVcoGain(3, x)},
            x: 29, y: 50, size: 1.5,
            min:0.0001, max: 2,
            orientation: 'vertical',
            showValue: false,
        })
        this.octave_down_fader.accentColor = [255,162,1]
        this.octave_down_fader.borderColor = [20, 20, 20]
        this.octave_down_fader.set(1)
        
        this.two_octave_down_fader = this.gui.Slider({
            label:'-2',
            callback: (x)=>{this.setVcoGain(4, x)},
            x: 35, y: 50, size: 1.5,
            min:0.0001, max: 2,
            orientation: 'vertical',
            showValue: false,
        })
        this.two_octave_down_fader.accentColor = [255,162,1]
        this.two_octave_down_fader.borderColor = [20, 20, 20]
        this.two_octave_down_fader.set(1)
        
        this.noise_fader = this.gui.Slider({
            label:'noise',
            callback: (x)=>{this.setVcoGain(5, x)},
            x: 41, y: 50, size: 1.5,
            min:0.0001, max: 2,
            orientation: 'vertical',
            showValue: false,
        })
        this.noise_fader.accentColor = [255,162,1]
        this.noise_fader.borderColor = [20, 20, 20]
        this.noise_fader.set(1)
        
        this.lfo_intensity_knob = this.gui.Knob({
            label:'vib/wah',
            callback: (x)=>{this.lfoControl(x)},
            x: 20, y: 23, size:1.1,
            showValue: false,
            min:0.0001, max: 0.95
        })
        this.lfo_intensity_knob.set( 0.48 )
        this.lfo_intensity_knob.borderColor = [178,192,191]
        this.lfo_intensity_knob.accentColor = [255,162,1]
        this.lfo_intensity_knob.border = 5
        this.lfoControl(0.48)
        
        this.lfo_speed_knob = this.gui.Knob({
            label:'speed',
            callback: (x)=>{this.lfo.frequency.value = x},
            x: 35, y: 23, size:1.1,
            showValue: false,
            min:0.01, max: 20,curve:2.5
        })
        this.lfo_speed_knob.set( 10 )
        this.lfo.frequency.value = 10
        this.lfo_speed_knob.borderColor = [178,192,191]
        this.lfo_speed_knob.accentColor = [255,162,1]
        this.lfo_speed_knob.border = 5
        

        this.cutoff_frequency_knob = this.gui.Knob({
            label:'frequency',
            // callback: (x)=>{this.cutoff.value = stepper(x, 50, 2500, [[0,0],[0.95,0.75], [1,1]])},
            callback: (x)=>{this.cutoff.value = x},
            x: 53, y: 25, size:1.4,
            showValue: false,
            min:50, max: 2500, curve:2
        })
        this.cutoff_frequency_knob.set( 1200 )
        this.cutoff.value = 1200
        this.cutoff_frequency_knob.borderColor = [178,192,191]
        this.cutoff_frequency_knob.accentColor = [255,162,1]
        this.cutoff_frequency_knob.border = 5
        
        
        this.resonance_knob = this.gui.Knob({
            label:'resonance',
            callback: (x)=>{ this.vcf.Q.value = x},
            x: 53, y: 72, size:1.4,
            min:0.99999, max: 18, curve: 2,
            showValue: false,
        })
        this.resonance_knob.set( 1 )
        this.vcf.Q.value = 1
        this.resonance_knob.borderColor = [178,192,191]
        this.resonance_knob.accentColor = [255,162,1]
        this.resonance_knob.border = 5
        
        this.asdr_int_knob = this.gui.Knob({
            label:'VCF Env Depth',
            callback: (x)=>{this.vcfEnvDepth.factor.value = x},
            x: 66, y: 34, size:0.85, curve: 3,
            min:0, max: 5000,
            showValue: false,
        })
        this.asdr_int_knob.set( 0.01 )
        this.asdr_int_knob.borderColor = [178,192,191]
        this.asdr_int_knob.accentColor = [255,162,1]
        this.asdr_int_knob.border = 5
        
        this.volume_knob = this.gui.Knob({
            label:'volume',
            callback: (x)=>{this.output.factor.value = x},
            x: 66, y: 68, size:0.85,
            min:0.0001, max: 1.5,
            showValue: false,
        })
        this.volume_knob.set( 1 )
        this.output.factor.value = 1
        this.volume_knob.borderColor = [178,192,191]
        this.volume_knob.accentColor = [255,162,1]
        this.volume_knob.border = 5
        
        this.velocity_filter_knob = this.gui.Knob({
            label:'velo filter',
            callback: (x)=>{this.vcfDynamicRange = x},
            x: 77, y: 15, size:0.85,
            min:0.01, max: 0.99,
            showValue: false,
        })
        this.velocity_filter_knob.set( 0.99 )
        this.velocity_filter_knob.borderColor = [178,192,191]
        this.velocity_filter_knob.accentColor = [255,162,1]
        this.velocity_filter_knob.border = 5
        
        this.velocity_volume_knob = this.gui.Knob({
            label:'velo volume',
            callback: (x)=>{this.vcaDynamicRange = x},
            x: 77, y: 83, size:0.85,
            min:0.01, max: 0.99,
            showValue: false,
        })
        this.velocity_volume_knob.set( 0.99 )
        this.velocity_volume_knob.borderColor = [178,192,191]
        this.velocity_volume_knob.accentColor = [255,162,1]
        this.velocity_volume_knob.border = 5
        
        this.attack_fader = this.gui.Slider({
            label:'A',
            //callback: (x)=>{this.env.attack = stepper(x, 0, 10, [[0,0],[0.01,0.01], [0.4, 0.03], [0.7, 0.25], [0.85, 0.5], [1,1]])},
            callback: (x)=>{this.env.attack = x},
            x: 76, y: 36, size: 1, curve: 2,
            min:0.01, max: 10,
            orientation: 'vertical',
            showValue: false,
        })
        this.attack_fader.accentColor = [255,162,1]
        this.attack_fader.borderColor = [20, 20, 20]
        this.env.attack = 0.1
        this.attack_fader.set(0.1)
        
        this.decay_fader = this.gui.Slider({
            label:'D',
            //callback: (x)=>{this.env.decay = stepper(x, 0, 10, [[0,0],[0.01,0.01], [0.4, 0.03], [0.7, 0.25], [0.85, 0.5], [1,1]])},
            callback: (x)=>{this.env.decay = x},
            x: 82, y: 36, size: 1, curve: 2,
            min:0.01, max: 10,
            orientation: 'vertical',
            showValue: false,
        })
        this.decay_fader.accentColor = [255,162,1]
        this.decay_fader.borderColor = [20, 20, 20]
        this.env.decay = 0.1
        this.decay_fader.set(0.1)
        
        this.sustain_fader = this.gui.Slider({
            label:'S',
            callback: (x)=>{this.env.sustain = x},
            x: 88, y: 36, size: 1,
            min:0.0001, max: 1,
            orientation: 'vertical',
            showValue: false,
        })
        this.sustain_fader.accentColor = [255,162,1]
        this.sustain_fader.borderColor = [20, 20, 20]
        this.sustain_fader.set(1)
        this.env.sustain = 1
        
        this.release_fader = this.gui.Slider({
            label:'R',
            //callback: (x)=>{this.env.release = stepper(x, 0, 20, [[0,0],[0.01,0.01], [0.4, 0.03], [0.7, 0.25], [0.85, 0.5], [1,1]])},
            callback: (x)=>{this.env.release = x},
            x: 94, y: 36, size: 1,
            min:0.1, max: 20, curve:2,
            orientation: 'vertical',
            showValue: false,
        })
        this.release_fader.accentColor = [255,162,1]
        this.release_fader.borderColor = [20, 20, 20]
        this.release_fader.set(1)
        this.env.release = 1
        
        this.chorus_filter_knob = this.gui.Knob({
            label:'chorus',
            callback: (x)=>{this.chor.wet.value = x},
            x: 91, y: 15, size:0.85,
            min:0.0001, max: 1,
            showValue: false,
        })
        this.chorus_filter_knob.set( 0.0001 )
        //this.chorgain.factor.value = 0.0001
        this.chorus_filter_knob.borderColor = [178,192,191]
        this.chorus_filter_knob.accentColor = [255,162,1]
        this.chorus_filter_knob.border = 5
        
        this.dist_volume_knob = this.gui.Knob({
            label:'Overdrive',
            callback: (x)=>{this.dist.distortion = x},
            x: 91, y: 83, size:0.85,
            min:0.0001, max: 1,
            showValue: false,
        })
        this.dist_volume_knob.set( 0.0001 )
        this.dist_volume_knob.borderColor = [178,192,191]
        this.dist_volume_knob.accentColor = [255,162,1]
        this.dist_volume_knob.border = 5

        this.gui_elements = [this.octave_radio, this.triangle_fader, this.saw_fader, this.square_fader,
            this.octave_down_fader, this.two_octave_down_fader, this.noise_fader, this.lfo_intensity_knob,
            this.lfo_speed_knob, this.cutoff_frequency_knob, this.resonance_knob, this.asdr_int_knob,
            this.volume_knob, this.velocity_filter_knob, this.velocity_volume_knob, this.attack_fader,
            this.decay_fader, this.sustain_fader, this.release_fader, this.chorus_filter_knob, 
            this.dist_volume_knob]
    }
}



;

class EnvelopeLoop extends Tone.Envelope {
  constructor({
    loop = false,
    loopInterval = null, // Optional custom interval
    ...options // Spread to catch all regular Tone.Envelope options
  } = {}) {
    super(options);

    // Internal state
    this.loop = loop;
    this.loopInterval = loopInterval;
    this._loopEvent = null; // Tone.Transport event for looping
    this._duration = 0
    this.prevTime = 0
    this.velocity = 100
  }

  /**
   * Set same curve for attack, decay, and release.
   * @param {Array|Float32Array} curveArray - Array of values (0 to 1).
   */
  setCurve(curveArray) {
    this.attackCurve = curveArray;
    this.decayCurve = curveArray;
    this.releaseCurve = curveArray;
  }

  createExponentialCurve (length = 128, exponent = 4) {
    let curve = new Array(length);
    for (let i = 0; i < length; i++) {
      let x = i / (length - 1); // normalized position 0 to 1
      curve[i] = Math.pow(x, exponent); // exponential shape
    }
    this.setCurve(curve);
  }

  /**
   * Trigger the envelope and start loop if enabled.
   * @param {Time} duration - The duration of the note.
   * @param {number} velocity - Optional velocity.
   */
  triggerAttackRelease(duration, time, velocity) {
    // Call the parent class method to handle envelope
    //console.log('AR', this.loop, time)
    this._duration = duration
    super.triggerAttackRelease(duration, time);

    // If looping, schedule next trigger
    if (this.loop) {
      this._scheduleLoop(duration, time);
      
      //super.triggerAttackRelease(duration, time+.1, velocity);
      //super.triggerAttackRelease(duration, time+.4, velocity);
      //super.triggerAttackRelease(duration, time+.6, velocity);
      //super.triggerAttackRelease(duration, time+.7, velocity);
    }
  }

  /**
   * Schedule next envelope if loop is enabled.
   * @param {Time} duration - Duration passed to triggerAttackRelease.
   * @param {Time} time - Start time.
   */
  _scheduleLoop(duration, time) {
    
    // Clear previous event if it exists
    if (this._loopEvent) {
      //this._loopEvent.stop()
      //this._loopEvent.cancel()
      //this._loopEvent.dispose()
      Tone.Transport.clear(this._loopEvent);
      this._loopEvent = null;
      console.log('cleared')
    }

    // Calculate when to retrigger
    const envelopeDuration = this._getEnvelopeDuration();
    const interval = this.loopInterval !== null ? this.loopInterval : envelopeDuration;
    const time2 = time + envelopeDuration
    //console.log('schedule', interval, time, time2)

    this.prevTime = time
    // Schedule the next trigger
    this.loopEvent(envelopeDuration,time)
    // this._loopEvent = Tone.context.setTimeout(()=>{
    //   this.loopEvent
    //   this._loopEvent = Tone.context.setTimeout(()=>{
    //   console.log('loop', this._duration, time+envelopeDuration, envelopeDuration, time+interval, this.velocity)
    //   super.triggerAttackRelease(this._duration, this.prevTime);
    // },envelopeDuration)
    // },envelopeDuration)



    // this._loopEvent = Tone.Transport.scheduleOnce((scheduledTime) => {
    //   console.log('loop')
    //   this.triggerAttackRelease(duration, scheduledTime); // Recursively retrigger
    // }, `@${this.toSeconds(time) + interval}`);

  }

  loopEvent(envelopeDuration,time){
    this._loopEvent = Tone.context.setTimeout(()=>{
      Tone.Transport.clear(this._loopEvent);
      this.prevTime = this.prevTime+envelopeDuration
      console.log('loop', this.prevTime, envelopeDuration)
      super.triggerAttackRelease(this._duration, this.prevTime);
      this.loopEvent(envelopeDuration,this.prevTime)
    },envelopeDuration)
  }
  /**
   * Calculate total duration of envelope stages (attack + decay + release).
   */
  _getEnvelopeDuration() {
    return this.attack + this.decay// + this.release + this._duration;
  }

  /**
   * Stop looping.
   */
  stopLoop() {
    if (this._loopEvent) {
      Tone.Transport.clear(this._loopEvent);
      this._loopEvent = null;
    }
  }

  /**
   * Dispose envelope and stop loop.
   */
  dispose() {
    this.stopLoop(); // Clean up looping event
    super.dispose(); // Call parent class dispose
  }
}

window.TwinklePresets = {
  "default": {
    "type": "square",
    "cutoff": 275.48799999999994,
    "Q": 0,
    "keyTrack": 0,
    "envDepth": 1457.5999999999976,
    "level": 0,
    "attack":  0.02506944444444445,
    "decay":  0.39062500000000155,
    "sustain":  0.08027777777777759,
    "release":  0.2669444444444446
  },
  "chirp": {
    "type": "saw",
    "cutoff": 380.278,
    "Q": 10.44300000000001,
    "keyTrack": 0,
    "envDepth": 2557.399999999998,
    "level": 0,
    "attack":  0.01000000000000004,
    "decay":    0.3500694444444451,
    "sustain":    0.08999999999999969,
    "release":    0.21777777777777863
  },
  "pluck": {
    "type": "square",
    "cutoff": 343.35200000000003,
    "Q": 11.532000000000012,
    "keyTrack": 0,
    "envDepth": 1306.3999999999974,
    "level": 0,
    "adsr": [
      0.01,
      0.4,
      0.5,
      0.8
    ]
  },
  "flute": {
    "type": "tri",
    "cutoff": 20,
    "Q": 0,
    "keyTrack": 0,
    "envDepth": 2197.4000000000037,
    "level": 0,
    "adsr": [
      0.8402777777777787,
      1,
      1,
      1
    ]
  },
  "drone": {
    "type": "saw",
    "cutoff": 435.3276799999999,
    "Q": 14.700000000000012,
    "keyTrack": 0,
    "envDepth": 8.600000000001046,
    "level": 0.5041000000000002,
    "adsr": [
      0.8402777777777787,
      1,
      1,
      1
    ]
  },
  "piano": {
    "type": "saw",
    "cutoff": 100,
    "Q": 0.0,
    "keyTrack": 1,
    "envDepth": 1200,
    "level": 0,
    "attack": 0.005,
    "decay": 0.5,
    "sustain": 0.3,
    "release": 0.1
  },
  "guitar": {
    "type": "square",
    "cutoff": 800,
    "Q": 0.3,
    "keyTrack": 0.3,
    "envDepth": 1800,
    "level": 0,
    "attack": 0.002,
    "decay": 0.7,
    "sustain": 0.05,
    "release": 0.1
  },
  "flute": {
    "type": "tri",
    "cutoff": 950,
    "Q": 11,
    "keyTrack": 1.0,
    "envDepth": 0,
    "level": 0,
    "attack": 0.2,
    "decay": 0.2,
    "sustain": 0.9,
    "release": 0.4
  },
  "brass": {
    "type": "saw",
    "cutoff": 600,
    "Q": 0.5,
    "keyTrack": 0.6,
    "envDepth": 1300,
    "level": 0,
    "attack": 0.1,
    "decay": 0.3,
    "sustain": 0.7,
    "release": 0.6
  },
  "bowedString": {
    "type": "square",
    "cutoff": 1100,
    "Q": 0.1,
    "keyTrack": 0.5,
    "envDepth": 1000,
    "level": 0,
    "attack": 0.4,
    "decay": 0.4,
    "sustain": 0.8,
    "release": 0.5
  },
  "banjo": {
    "type": "square",
    "cutoff": 1200,
    "Q": 4,
    "keyTrack": 0.4,
    "envDepth": 3000,
    "level": 0,
    "attack": 0.001,
    "decay": 0.15,
    "sustain": 0.0,
    "release": 0.15
  },
  "marimba": {
    "type": "tri",
    "cutoff": 400,
    "Q": 2,
    "keyTrack": 1,
    "envDepth": 4000,
    "level": 0.0,
    "attack": 0.001,
    "decay": 0.08,
    "sustain": 0.0,
    "release": 0.1
  }
};;

window.halfLayout = {
    "height":0.5,
    "vco": {
      "color": [150, 0, 0],
      "boundingBox": { "x": 10, "y": 30, "width": 30, "height": 100 },
      "offsets": { "x": 12, "y": 50 },
      "groupA": ["type"],
      "controlTypeA": "radioButton",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.75,
      "theme": "dark"
    },
    "vcf": {
      "color": [100, 0, 150],
      "boundingBox": { "x": 30, "y": 18 , "width": 40, "height": 50 },
      "offsets": { "x": 10, "y": 50 },
      "groupA": ["cutoff"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.6
    },
    "vca": {
      "color": [100, 50, 100],
      "boundingBox": { "x": 70, "y": 18, "width": 30, "height": 100 },
      "offsets": { "x": 12, "y": 50 },
      "groupA": ["level"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.6
    },
    "env": {
      "color": [20, 100, 100],
      "boundingBox": { "x": 50, "y": 15, "width": 100, "height": 0 },
      "offsets": { "x": 6, "y": 0 },
      "groupA": [],
      "controlTypeA": "knob",
      "controlTypeB": "fader",
      "sizeA": 0.8,
      "sizeB": 1
    },
    "lfo": {
      "color": [20, 0, 100],
      "boundingBox": { "x": 50, "y": 70, "width": 50, "height": 0 },
      "offsets": { "x": 12, "y": 30 },
      "groupA": ["rate"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.8,
      "sizeB": 0.6
    }
  
};;

const paramDefinitions = (synth) => [
    {
        name: 'harmonicity', type: 'vco', min: 1, max: 10, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.harmonicityRatio, 
        value: 2,
        callback: function(x,time) {
            x = Math.floor(x)
            if(time) synth.harmonicityRatio.setValueAtTime(x,time)
            else synth.harmonicityRatio.value =  x
        }
    },
    {
        name: 'modIndex', type: 'vco', min: 0, max: 10, curve: 2,
        value: .6,
        callback: function(x,time) {
            if(time) synth.indexOfModulation.setValueAtTime(x,time)
            else synth.indexOfModulation.rampTo( x, .005)}
    },
    {
        name: 'indexEnv', type: 'vcf', min: 0, max: 10, curve: 2,
        value: .5,
        callback: function(x, time) {
            if(time) synth.indexEnvDepth.setValueAtTime(x,time)
            else synth.indexEnvDepth.rampTo( x, .005)
        }
    },
    {
        name: 'attack', type: 'env', min: 0.005, max: 0.5, curve: 2,
        value: 0.01,
        callback: function(x) {
            synth.env.attack = x
        }
    },
    {
        name: 'decay', type: 'env', min: 0.01, max: 10, curve: 2,
        value: 0.1,
        callback: function(x) {
            synth.env.decay = x
        }
    },
    {
        name: 'sustain', type: 'env', min: 0, max: 1, curve: 1,
        value: 0.3,
        callback: function(x) {
            synth.env.sustain = x
        }
    },
    {
        name: 'release', type: 'env', min: 0.01, max: 20, curve: 2,
        value: 0.8,
        callback: function(x) {
            synth.env.release = x
        }
    }
]

paramDefinitions;

/*
FM.js

Note: due to the way we handle poly voice allocation,
the top level .env of a patch must be the main envelope
┌──────────────────────────┐
│        FMOperator        │
└──────────────────────────┘
Inputs:
- frequency (signal)
- modInput (signal)
- ratio (signal)
- index (signal)
- indexEnvDepth (signal)

Outputs:
- vca (audio)
- modVca (FM)
                           
                (Fundamental frequency input)
                             │
                             ▼
                     ┌────────────┐
                     │  Multiply  │◄── ratio
                     │ (f₀ * r)   │
                     └────────────┘
                             │
            base frequency ──┘
                             │
                             ▼
           ┌────────────────────────────────────┐
           │          Frequency Sum             │
           │                                    │
modInput──►┘                                    │
           │                                    │
           │                                    │
           ▼                                    ▼
      ┌──────────────────────────────┐ ┌─────────────────┐
      │   Add (base + modulated)     │ │   Mod Depth     │
      │   → final oscillator freq    │ │        (*)      │
      └──────────────────────────────┘ └─────────────────┘
                             │                  │
                             ▼                  ▼
                  ┌─────────────────┐ ┌─────────────────┐
                  │   Oscillator    │ │   Mod Depth     │
                  │   (sine wave)   │ │        (*)      │
                  └─────────────────┘ └─────────────────┘
                             │                   │
                             ▼                   ▼ to vca.factor
                  ┌─────────────────┐
                  │       VCA       │
                  │   (Multiply)    │
                  └─────────────────┘
                             │
                             ▼──► (to audio or next mod input)

*/

;
;
;

;
;

 
class FMOperator {
  constructor({
    ratio = 1,
    modDepth = 0,
    envDepth = 1,
    waveform = "sine"
  } = {}) {
    // === Core Parameters ===
    this.ratio = new Tone.Signal(ratio); //harmonicity
    this.index = new Tone.Signal(modDepth); //index when used as modulator
    this.envDepth = new Tone.Signal(envDepth); //amplitude when used as carrier
    this.indexEnvDepth = new Tone.Signal(0); //amplitude when used as carrier

    // === Input signals ===
    this.frequency = new Tone.Signal(440); // fundamental, in Hz
    this.modInput = new Tone.Signal(0);    // modulation from other ops

    // === Frequency computation ===
    // operator frequency = fundamental * ratio
    this.operatorFreq = new Tone.Multiply();
    this.frequency.connect(this.operatorFreq);
    this.ratio.connect(this.operatorFreq.factor);

    // sum: base frequency + modulation
    this.freqSum = new Tone.Signal();
    this.operatorFreq.connect(this.freqSum);
    this.modInput.connect(this.freqSum);

    // === Oscillator ===
    this.carrier = new Tone.Oscillator().start();

    // set oscillator frequency dynamically
    this.freqSum.connect(this.carrier.frequency);

    // === Amplitude Envelope ===
    this.env = new Tone.Envelope({
      attack: 0.01,
      decay: 0.1,
      sustain: 0.8,
      release: 0.3
    });

    // scale envelope by envDepth
    this.envScale = new Tone.Multiply();
    this.env.connect(this.envScale);
    this.envDepth.connect(this.envScale.factor);

    // === VCA (output stage) ===
    this.vca = new Tone.Multiply();
    this.carrier.connect(this.vca);
    this.envScale.connect(this.vca.factor);

    // === Freq Modulation ===
    //modEnvDepth = operatorFreq * modDepth
    this.envIndex = new Tone.Multiply();
    this.operatorFreq.connect(this.envIndex.factor);
    this.env.connect(this.envIndex);
    this.indexEnvDepthScalar = new Tone.Multiply()
    this.envIndex.connect(this.indexEnvDepthScalar)
    this.indexEnvDepth.connect(this.indexEnvDepthScalar.factor)

    //indexAmount = operatorFreq * index 
    this.indexAmount = new Tone.Multiply();
    this.index.connect(this.indexAmount)
    this.operatorFreq.connect(this.indexAmount.factor)

    // === Mod VCA (modulation output stage) ===
    //modVcaFactor = modEnvDepth + indexAmount
    this.modVca = new Tone.Multiply();
    this.indexAmount.connect(this.modVca.factor);
    this.indexEnvDepthScalar.connect(this.modVca.factor);
    this.carrier.connect(this.modVca);

    // === Feedback ===
    this.feedback = new Tone.Multiply()
    this.feedbackDelay = new Tone.Delay(0,0.001)
    this.feedbackMult = new Tone.Multiply()
    this.vca.connect(this.feedbackDelay)
    this.feedbackDelay.connect(this.feedback)
    this.feedback.connect(this.feedbackMult)
    this.frequency.connect(this.feedbackMult.factor)
    this.feedbackMult.connect(this.carrier.frequency)

    // === Public outputs ===
    this.output = this.vca;      // audio out
    this.modOut = this.modVca;      // modulation out (same as audio)
  }

  connect(destination) {
        if (destination.input) {
            this.output.connect(destination.input);
        } else {
            this.output.connect(destination);
        }
    }

    /**
     * Disconnects from Tone.js destination
     * @param {object} destination - Tone.js destination object
     * @returns {void}
     * @example
     * const amp = new Tone.Gain(0.5).toDestination();
     * synth.connect(amp)
     * synth.disconnect(amp)
     */
    disconnect(destination) {
        if (destination.input) {
            this.output.disconnect(destination.input);
        } else {
            this.output.disconnect(destination);
        }
    }
}

class FM extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
		this.presets = TwinklePresets
		this.synthPresetName = "TwinklePresets"
		//this.accessPreset()
    this.isGlide = false
    this.name = "FM"
    this.guiHeight = 0.5
    this.layout = basicLayout
    //console.log(this.name, " loaded, available preset: ", this.presets)

    // Initialize the main frequency control
    this.frequency = new Tone.Signal(200);

    // VCOs
    this.carrier = new FMOperator()
    this.modulator = new FMOperator()
    this.frequency.connect(this.carrier.frequency)
    this.frequency.connect(this.modulator.frequency)

    //FM
    this.modulator.modVca.connect(this.carrier.modInput)

    // VCF, VCA, output
    this.env = new Tone.Envelope()
    this.env.connect(this.carrier.vca.factor)
    this.vca = new Tone.Multiply(1)
    this.output = new Tone.Multiply(1)
    this.carrier.connect(this.output)

    //FM control
    this.indexOfModulation = new Tone.Signal()
    this.indexOfModulation.connect(this.modulator.index)
    this.harmonicityRatio = new Tone.Signal()
    this.harmonicityRatio.connect(this.modulator.ratio)
    this.indexEnvDepth = new Tone.Signal()
    this.indexEnvDepth.connect(this.modulator.indexEnvDepth)
    this.keyTrackingAmount = new Tone.Signal()
    this.keyTracker = new Tone.Multiply(.1)
    this.frequency.connect(this.keyTracker)
    this.keyTrackingAmount.connect(this.modulator.indexAmount)
    //this.keyTracker.connect(this.modulator.indexAmount)
    this.velocitySig = new Tone.Signal()

    // // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    //console.log(this.paramDefinitions)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
   this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    //setTimeout(()=>{this.loadPreset('default')}, 500);
  }//constructor

  //envelopes
  triggerAttack (freq, amp, time=null){
    freq = Tone.Midi(freq).toFrequency()
    amp = amp/127
    if(time){
      this.env.triggerAttack(time)
      this.modulator.env.triggerAttack(time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.linearRampToValueAtTime(amp, time + 0.01);
    } else {
      this.env.triggerAttack()
      this.modulator.env.triggerAttack()
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }
  triggerRelease (time=null){
    if(time) {
    	this.env.triggerRelease(time)
      this.modulator.env.triggerRelease(time)
    }
    else {
      this.env.triggerRelease()
      this.modulator.env.triggerRelease()
    }
  }
  triggerAttackRelease (freq, amp, dur=0.01, time=null){
    //console.log('AR ',freq,amp,dur,time)
    //freq = Tone.Midi(freq).toFrequency()
    freq = Theory.mtof(freq)
    
    amp = amp/127
    if(time){
      this.env.triggerAttackRelease(dur,time)
      this.modulator.env.triggerAttackRelease(dur,time)
      this.frequency.setValueAtTime(freq, time)
      //this.velocitySig.cancelScheduledValues(time);
      this.velocitySig.setTargetAtTime(amp, time, 0.005); // 0.03s time constant for smoother fade
      //this.velocitySig.linearRampToValueAtTime(amp, time + 0.005);
    } else{
      this.env.triggerAttackRelease(dur)
      this.modulator.env.triggerAttackRelease(dur)
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }//attackRelease
}

const paramDefinitions = (synth) => [
    {
        name: 'transient', type: 'vco', min: 0, max: 1, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.transientAmount, 
        value: .4,
        callback: function(x,time) {
            if (time) {
                synth.transientAmount.setValueAtTime(x, time);
            } else  synth.transientAmount.value = x; 
            synth.updateMacroMapping()
        }
    },
    {
        name: 'voicing', type: 'vco', min: 0, max: synth.operatorSets.length-1, curve: 1,
        value: 0.1,
        callback: function(x,time) {
            if( Math.floor(x) != synth.currentSet){
                synth.currentSet = Math.floor(x)
                synth.updateMacroMapping()
                console.log('FM Voicing: ', synth.operatorSets[synth.currentSet].name)
            }
        }
    },
    {
        name: 'modIndex', type: 'vco', min: 0, max: 10, curve: 3,
        value: 1.2,
        callback: function(x,time) {
            if(time) synth.indexOfModulation.setValueAtTime(x,time)
            else synth.indexOfModulation.rampTo( x, .005)
            synth.updateMacroMapping()
        }
    },
    {
        name: 'damping', type: 'vca', min: 0, max: 1, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.dampingAmount, 
        value: 1,
        callback: function(x,time) {
            if (time) {
                synth.dampingAmount.setValueAtTime(x, time);
            } else  synth.dampingAmount.value = x;
            synth.updateMacroMapping()
        }
    },
    {
        name: 'detune', type: 'vco', min: 0, max: 1, curve: 1,
        isSignal: 'true', connectTo: synth=>synth.detuneAmount, 
        value: 0,
        callback: function(x,time) {
            if (time) {
                synth.detuneAmount.setValueAtTime(x, time);
            } else  synth.detuneAmount.value = x;
            synth.updateMacroMapping()
        }
    },
    {
        name: 'indexEnv', type: 'vca', min: 0, max: 3, curve: 3,
        value: .3,
        callback: function(x, time) {
            synth.indexEnvDepthAmount.value = x
            synth.updateMacroMapping()
        }
    },
    // {
    //     //TODO: Should this be hidden?
    //     name: 'keyTracking', type: 'hidden', min: 0, max: 1, curve: 1,
    //     value: .1,
    //     callback: function(x,time) {
    //         if(time) synth.keyTrackingAmount.setValueAtTime(x,time)
    //         else synth.keyTrackingAmount.rampTo( x, .005)
    //     }
    // },
    {
        name: 'attack', type: 'env', min: 0.005, max: 0.5, curve: 2,
        value: 0.01,
        callback: function(x) {
            synth.env.attack = x
        }
    },
    {
        name: 'decay', type: 'env', min: 0.01, max: 10, curve: 2,
        value: 0.1,
        callback: function(x) {
            synth.env.decay = x
        }
    },
    {
        name: 'sustain', type: 'env', min: 0, max: 1, curve: 1,
        value: 0.43,
        callback: function(x) {
            synth.env.sustain = x
        }
    },
    {
        name: 'release', type: 'env', min: 0.01, max: 20, curve: 2,
        value: 12,
        callback: function(x) {
            synth.env.release = x
            synth.updateMacroMapping()
        }
    },
    {
        name: 'ratios', type: 'hidden',value:[1,1,2,4],
        callback: function(x) {
            //console.log(x)
            //synth.ratios = x
            synth.updateMacroMapping()
        }
    },
    // {
    //     name: 'vcfAttack', type: 'env', min: 0.005, max: 0.5, curve: 2,
    //     value: 0.01,
    //     callback: function(x) {
    //         synth.modulator.env.attack = x
    //     }
    // },
    // {
    //     name: 'vcfDecay', type: 'env', min: 0.01, max: 10, curve: 2,
    //     value: 0.1,
    //     callback: function(x) {
    //         synth.modulator.env.decay = x
    //     }
    // },
    // {
    //     name: 'vcfSustain', type: 'env', min: 0., max: 1, curve: 2,
    //     value: 0.1,
    //     callback: function(x) {
    //         synth.modulator.env.sustain = x
    //     }
    // },
    // {
    //     name: 'vcfRelease', type: 'env', min: 0.01, max: 20, curve: 2,
    //     value: 0.1,
    //     callback: function(x) {
    //         synth.modulator.env.release = x
    //     }
    // }
    // Fix pan in polyphony template
    // {
    //     name: 'pan', type: 'vca', min: 0, max: 1, curve: .5,
    //     callback: function(x) {
    //         {synth.super.pan(x)}
    //     }
    // },
]

paramDefinitions;

/*
FM4.js

Note: due to the way we handle poly voice allocation,
the top level .env of a patch must be the main envelope

*/

;
;
;

;
;



class FM4 extends MonophonicTemplate {
  constructor(gui = null) {
    super();
    this.gui = gui;
    this.name = "FM4";
    this.isGlide = false;
    this.guiHeight = 0.6;
    this.layout = basicLayout;

    // Fundamental frequency
    this.frequency = new Tone.Signal(200);

    // Operators
    this.carrier = new FMOperator();
    this.mod1 = new FMOperator(); // transient
    this.mod2 = new FMOperator(); // medium sustain
    this.mod3 = new FMOperator(); // long sustain

    // Frequency routing (all follow the same base frequency)
    [this.carrier, this.mod1, this.mod2, this.mod3].forEach(op =>
      this.frequency.connect(op.frequency)
    );

    // FM routing
    this.mod1.modVca.connect(this.carrier.modInput);
    this.mod2.modVca.connect(this.carrier.modInput);
    this.mod3.modVca.connect(this.carrier.modInput);

    // === Output path ===
    this.env = new Tone.Envelope();
    this.env_depth = new Tone.Multiply(1);
    this.env_depth.connect(this.carrier.vca.factor);
    this.env.connect(this.env_depth);
    this.vca = new Tone.Multiply()
    this.env.connect(this.vca.factor);

    this.output = new Tone.Multiply(1);
    this.vca.connect(this.output)
    this.carrier.connect(this.vca);

    // === Macro parameters ===
    this.harmonicityRatio = new Tone.Signal(1); // global harmonic multiplier
    this.transientAmount = new Tone.Signal(0.5); // transient index + release
    this.indexOfModulation = new Tone.Signal(0.5); // overall modulation depth
    this.dampingAmount = new Tone.Signal(0.5); // envelope damping for sustain mods
    this.detuneAmount = new Tone.Signal(0); // Hz or cents
    this.indexEnvDepthAmount = new Tone.Signal(0); // Hz or cents

    // === Velocity and key tracking ===
    this.velocitySig = new Tone.Signal();
    this.velocitySig.connect(this.env_depth.factor)
    this.keyTrackingAmount = new Tone.Signal();
    this.keyTracker = new Tone.Multiply(0.1);
    this.frequency.connect(this.keyTracker);
    this.keyTrackingAmount.connect(this.mod1.indexAmount); // optional, could patch to all

    // envelope scaling
    this.mod1.env.attack = 0.001
    this.mod1.env.sustain = 0.001
    this.mod2.env.attack = .01
    this.mod2.env.sustain = 0.001
    this.mod3.env.attack = 0.02
    this.mod3.env.sustain = 0.1

    // === operator macro sets ===
   this.operatorSets = [
      // 1 ───────────── Classic EP
      {
        name: "Classic EP",
        ratios: [1.0, 3.0, 2.0, 6.0],
        detunes: [0, 0.03, -0.02, 0.015],
        indexScalars: [1.0, 1.2, 0.8, 0.6],
        indexEnvDepths: [1.0, 1.3, 1.0, 0.8],
        envDecays: [1, 1, 1, 1.0].map(x=>x*4),
        attacks: [0., 0., 0.01, 0.02],
        feedbacks: [0.0, 0.0, 0.0, 0.0],
        algorithm: "3>2,1>0" // layered EP tone
      },

      // 2 ───────────── Bell Bright
      {
        name: "Bell Bright",
        ratios: [1.0, 2.5, 6.3, 9.0],
        detunes: [0, 0.1, -0.13, 0.1].map(x=>x*1),
        indexScalars: [1.0, .5,.4,.3].map(x=>x/2),
        indexEnvDepths: [1,.6,.5,.4].map(x=>x/3),
        envDecays: [0.1, 0.5, 0.9, 1.2].map(x=>x*4),
        attacks: [0.0, 0.0, 0.0, 0.02],
        feedbacks: [0.0, 0.03, 0.01, 0.01],
        algorithm: "1>2>3>0" // full chain, rich metallic bell
      },

      // 3 ───────────── Wood Marimba
      {
        name: "Wood Marimba",
        ratios: [1.0, 5.8, 2.9, 2],
        detunes: [0, 0.01, 0.01, -0.02],
        indexScalars: [1.0, 1.6, 1.0, 0.6].map(x=>x/2),
        indexEnvDepths: [1.2, 1.0, 0.8, 0.5].map(x=>x/2),
        envDecays: [0.15, 0.4, 0.8, 1.1],
        attacks: [0.005, 0.01, 0.02, 0.03],
        feedbacks: [0.01, 0.0, 0.0, 0.0],
        algorithm: "1>2>3,0" // pluck body + transient
      },

      // 4 ───────────── Acoustic Piano
      {
        name: "Acoustic Piano",
        ratios: [1.0, 8.0, 3.0, 2.0],
        detunes: [0, 0.015, -0.02, 0.025],
        indexScalars: [1.0, .6, 0.9, 1.2],
        indexEnvDepths: [1.0, 1.5, 1.0, 0.8],
        envDecays: [0.2, 0.35, 0.8, 1.3],
        attacks: [0.01, 0.005, 0.02, 0.04],
        feedbacks: [0.0015, 0.002, 0.0, 0.001],
        algorithm: "1>2>3>0" // deep cascade for hammer brightness
      },

      // 5 ───────────── Harp
      {
        name: "Harp",
        ratios: [1.0, 2.5, 5.0, 10.0],
        detunes: [0, 0.02, -0.015, 0.01],
        indexScalars: [1.0, 1.6, 1.2, 0.9].map(x=>x/2),
        indexEnvDepths: [1.4, 1.2, 0.9, 0.7].map(x=>x/2),
        envDecays: [0.1, 0.25, 0.6, 1.0],
        attacks: [0.001, 0.001, 0.01, 0.03],
        feedbacks: [0.0, .10, 0,0],
        algorithm: "1>3>2,0" // plucked clarity
      },

      // 6 ───────────── Guitar
      {
        name: "Guitar",
        ratios: [1.0, 5.05, 3.01, 2.0],
        detunes: [0, 0.01, 0.02, -0.015],
        indexScalars: [1.0, 1.4, 1.0, 0.7],
        indexEnvDepths: [1.2, 1.1, 0.9, 0.7],
        envDecays: [0.15, 0.3, 0.8, 1.0].map(x=>x*4),
        attacks: [0.008, 0.01, 0.02, 0.04],
        feedbacks: [0.01, .02, 0.0, 0.01],
        algorithm: "1>2>3,0" // 3-op body + clean carrier
      },

      // 7 ───────────── Slap Bass
      {
        name: "Slap Bass",
        ratios: [1.0, 1.0, 2.0, 4.0],
        detunes: [0, 0.005, -0.01, 0.008],
        indexScalars: [1.0, 2.0, 1.5, 0.8],
        indexEnvDepths: [1.8, 1.2, 0.9, 0.7],
        envDecays: [0.05, 0.25, 0.6, 1.0],
        attacks: [0.003, 0.005, 0.02, 0.03],
        feedbacks: [0.0, 0.03, 0.02, 0.01],
        algorithm: "3>2,1>0" // dual 2-op bass stack
      },

      // 8 ───────────── Flute
      {
        name: "Flute",
        ratios: [1.0, 4.0, 3.0, 2.0],
        detunes: [0, 0.003, -0.002, 0.004],
        indexScalars: [1.0, 0.6, 0.4, 0.3],
        indexEnvDepths: [0.8, 0.6, 0.5, 0.4],
        envDecays: [0.3, 0.5, 1.0, 1.5],
        attacks: [0.2, 0.1, 0.8, 0.1],
        feedbacks: [0.0, .0, 0.0, 0.0],
        algorithm: "3,1>2>0" // airy tone with soft harmonics
      },

      // 9 ───────────── Electric Guitar
      {
        name: "Electric Guitar",
        ratios: [1.0, 2.0, 4.0, 7.0],
        detunes: [0, 0.02, -0.015, 0.03],
        indexScalars: [1.0, 1.8, 1.2, 0.9],
        indexEnvDepths: [1.5, 1.2, 1.0, 0.8],
        envDecays: [0.1, 0.25, 0.7, 1.1],
        attacks: [0.006, 0.008, 0.02, 0.03],
        feedbacks: [0.02, 0.02, 0.01, 0.02],
        algorithm: "3>2,1>3,0" // fan-out shimmer
      },

      // 10 ───────────── Ambient Pad
      {
        name: "Ambient Pad",
        ratios: [1.0, 2.5, 2.01, 5.0],
        detunes: [0, 0.04, -0.02, 0.035].map(x=>x*2),
        indexScalars: [1.0, 0.9, 0.7, 0.5],
        indexEnvDepths: [0.8, 0.9, 0.7, 0.6],
        envDecays: [0.4, 0.8, 1.2, 1.6].map(x=>x*8),
        attacks: [0.2, 0.2, 0.5, 1].map(x=>x*2),
        feedbacks: [0.01, 0.002, 0.0, 0.0],
        algorithm: "3>2,1>0" // wide gentle spectrum
      }
    ];

    this.currentSet = 0; // index into operatorSets
    // initialize default mapping

    // === Param registration ===
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    //this.createAccessors(this, this.param);
    //this.autocompleteList = this.paramDefinitions.map(def => def.name);

    this.updateMacroMapping();
  }

  // === Macro mapping ===
  /*
  transientAmount scales the index, indexEnv, and decay of mod1
  ratios is the integer harmonicity of each oscillator
  indexScalars scales the index of each
  envDecays scales the decay of each
  detunes scales the detune of each oscillator
  indexEnvDepths scales the envDepth for each
  attacks scales the attack of each
  feedbacks sets the feedback of each operator
  */
  updateMacroMapping() {
    const h = this.harmonicityRatio.value;
    const tr = this.transientAmount.value;
    const idx = this.indexOfModulation.value;
    const dmp = this.dampingAmount.value;
    const det = this.detuneAmount.value;
    const env = this.indexEnvDepthAmount.value;
    const release = this.env.release;

    const set = this.operatorSets[this.currentSet];

    const { ratios, detunes, indexScalars, indexEnvDepths, envDecays, attacks, feedbacks } = set;

    // frequency ratios
    const r0 = h * ratios[0] + det * detunes[0];
    const r1 = h * ratios[1] + det * detunes[1];
    const r2 = h * ratios[2] + det * detunes[2];
    const r3 = h * ratios[3] + det * detunes[3];

    this.carrier.ratio.value = r0;
    this.mod1.ratio.value = r1;
    this.mod2.ratio.value = r2;
    this.mod3.ratio.value = r3;

    // indices
    this.mod1.index.value = idx * indexScalars[1] * (tr * 1) * (0.5 + 1 / r1);
    this.mod2.index.value = idx * indexScalars[2] * (0.2 + 1 / r2);
    this.mod3.index.value = idx * indexScalars[3] * (0.2 + 1 / r3);

    // index envelope depth
    this.mod1.indexEnvDepth.value = (tr * indexEnvDepths[1]) + 0.01;
    this.mod2.indexEnvDepth.value = env * indexEnvDepths[2] + 0.01;
    this.mod3.indexEnvDepth.value = env * indexEnvDepths[3] + 0.01;
    //console.log('envDepth', env, this.mod1.indexEnvDepth.value,this.mod2.indexEnvDepth.value,this.mod3.indexEnvDepth.value)

    // envelope shaping
    this.mod1.env.decay = envDecays[1] * (0.01 + tr * 0.35);
    this.mod1.env.release = envDecays[1] * (0.01 + tr * 0.5);
    this.mod2.env.decay = envDecays[2] * (0.3 + dmp * (0.8 + release / 2));
    this.mod2.env.sustain = dmp;
    this.mod2.env.release = envDecays[2] * (0.4 + dmp * (1.8 + release));
    this.mod3.env.sustain = dmp;
    this.mod3.env.decay = envDecays[3] * (0.5 + dmp * (1.2 + release / 2));
    this.mod3.env.release = envDecays[3] * (0.8 + dmp * (2.2 + release));
    //console.log('decay', this.mod1.env.decay,this.mod2.env.decay,this.mod3.env.decay)

    this.carrier.env.attack = attacks[0]
    this.mod1.env.attack = attacks[1] * (dmp<0.5 ? 0 : dmp)+0.001
    this.mod2.env.attack = attacks[2] * 1
    this.mod3.env.attack = attacks[3] * 2
    //console.log('attack', this.mod1.env.attack,this.mod2.env.attack,this.mod3.env.attack)

    this.carrier.feedback.factor.value = feedbacks[0]
    this.mod1.feedback.factor.value = feedbacks[1]
    this.mod2.feedback.factor.value = feedbacks[2]
    this.mod3.feedback.factor.value = feedbacks[3]
  }

  setOperatorSet(index) {
    this.currentSet = Math.max(0, Math.min(index, this.operatorSets.length - 1));
    this.updateMacroMapping();
    //console.log(`Operator set: ${this.operatorSets[this.currentSet].name}`);
    this.setAlgorithm()
  }

  setAlgorithm(algorithmString = null) {
    // If not provided, use the current operatorSet's algorithm
    if (!algorithmString) {
      const set = this.operatorSets[this.currentSet];
      if (!set || !set.algorithm) return;
      algorithmString = set.algorithm;
    }

    // --- Step 1: Clear all previous FM connections --- //
    [this.carrier, this.mod1, this.mod2, this.mod3].forEach(op => {
      const node = op?.modVca;
      if (node && node.numberOfOutputs > 0) {
        try {
          node.disconnect();
        } catch (e) {
          console.warn(`Could not disconnect ${op.name || 'operator'}`, e);
        }
      }
    });
    // --- Step 2: Helper mapping ---
    const ops = {
      0: this.carrier,
      1: this.mod1,
      2: this.mod2,
      3: this.mod3
    };

    // --- Step 3: Parse and connect ---
    // Split independent branches by commas
    const branches = algorithmString.split(",").map(str => str.trim());
    console.log(branches)
    for (let branch of branches) {
      // Split "3>2>1" into an array [3,2,1]
      const chain = branch.split(">").map(n => parseInt(n.trim())).filter(n => !isNaN(n));
      console.log(chain)
      // Connect sequentially down the chain
      for (let i = 0; i < chain.length; i++) {
        const source = ops[chain[i]];
        const target = ops[chain[i + 1]];
        //console.log(source, target)
        if (source && target) {
          source.modVca.connect(target.modInput);
          console.log(`Connected ${chain[i]} → ${chain[i+1]}`);
        } else if( source ){
          source.vca.connect(this.vca);
          console.log(`Connected ${chain[i]} → this.output`);
        
        }
      }
    }

    //console.log("Algorithm set to:", algorithmString);
  }

  // === Envelope triggering ===
  triggerAttack(freq, amp, time = null) {
    freq = Tone.Midi(freq).toFrequency();
    amp = amp / 127;

    const ops = [this.mod1, this.mod2, this.mod3];
    if (time) {
      this.env.triggerAttack(time);
      ops.forEach(op => op.env.triggerAttack(time));
      this.frequency.setValueAtTime(freq, time);
      this.velocitySig.setTargetAtTime(amp, time, 0.005);
    } else {
      this.env.triggerAttack();
      ops.forEach(op => op.env.triggerAttack());
      this.frequency.value = freq;
      this.velocitySig.rampTo(amp, 0.03);
    }
  }

  triggerRelease(time = null) {
    const ops = [this.mod1, this.mod2, this.mod3];
    if (time) {
      this.env.triggerRelease(time);
      ops.forEach(op => op.env.triggerRelease(time));
    } else {
      this.env.triggerRelease();
      ops.forEach(op => op.env.triggerRelease());
    }
  }

  triggerAttackRelease(freq, amp, dur = 0.01, time = null) {
    freq = Theory.mtof(freq);
    amp = amp / 127;
    const ops = [this.mod1, this.mod2, this.mod3];

    if (time) {
      this.env.triggerAttackRelease(dur, time);
      ops.forEach(op => op.env.triggerAttackRelease(dur, time));
      this.frequency.setValueAtTime(freq, time);
      this.velocitySig.setTargetAtTime(amp, time, 0.005);
    } else {
      this.env.triggerAttackRelease(dur);
      ops.forEach(op => op.env.triggerAttackRelease(dur));
      this.frequency.value = freq;
      this.velocitySig.rampTo(amp, 0.03);
    }
  }
  triggerRawAttack(freq, amp=1, time = null) {
    if(amp > 1) amp = 1
    const ops = [this.mod1, this.mod2, this.mod3];
    if (time) {
      this.env.triggerAttack(time);
      ops.forEach(op => op.env.triggerAttack(time));
      this.frequency.setValueAtTime(freq, time);
      this.velocitySig.setTargetAtTime(amp, time, 0.005);
    } else {
      this.env.triggerAttack();
      ops.forEach(op => op.env.triggerAttack());
      this.frequency.value = freq;
      this.velocitySig.rampTo(amp, 0.03);
    }
  }

  triggerRawRelease(time = null) {
    const ops = [this.mod1, this.mod2, this.mod3];
    if (time) {
      this.env.triggerRelease(time);
      ops.forEach(op => op.env.triggerRelease(time));
    } else {
      this.env.triggerRelease();
      ops.forEach(op => op.env.triggerRelease());
    }
  }

  triggerRawAttackRelease(freq, amp=1, dur = 0.01, time = null) {
    const ops = [this.mod1, this.mod2, this.mod3];
    if(amp > 1) amp = 1
    if (time) {
      this.env.triggerAttackRelease(dur, time);
      ops.forEach(op => op.env.triggerAttackRelease(dur, time));
      this.frequency.setValueAtTime(freq, time);
      this.velocitySig.setTargetAtTime(amp, time, 0.005);
    } else {
      this.env.triggerAttackRelease(dur);
      ops.forEach(op => op.env.triggerAttackRelease(dur));
      this.frequency.value = freq;
      this.velocitySig.rampTo(amp, 0.03);
    }
  }
}

/**
 * AnalogDelay.js
 * 
 * Simple approximation of an analog delay
 * 
 * Signal path:
 * input -> hpf -> gain -> waveShaper -> lpf -> delay -> wet -> output
 *                                         <- feedback <-
 * input -> dry -> output
 * 
 * @class
 */
;
;
//;

//import './userInterface.css';


class Feedback {
  /**
   * Uses a Tone.Delay() to allow for feedback loops.
   * @constructor
   * @param {number} [initialLevel=0.] - Initial feedback level.
   * @param {number} [initialTime=0.1] - Initial delay time in seconds.
   * @param {number} [initialFB=0] - Initial feedback amount.
   */
  constructor(initialLevel = 0, initialTime = 0.1, initialFB = 0) {
    this.input = new Tone.Multiply(initialLevel);
    this.delay = new Tone.Delay(initialTime);
    this._feedback = new Tone.Multiply(initialFB);
    this._output = new Tone.Multiply(1);

    // Connecting signal path
    this.input.connect(this.delay);
    this.delay.connect(this._feedback);
    this._feedback.connect(this.delay);
    this.delay.connect(this._output);

    let paramDefinitions = [
      {name:'inputGain',min:0.0,max:1,curve:2,callback:x=>this.input.factor.value = x},
      {name:'time',min:0.01,max:1,curve:2,callback:x=>this.delay.delayTime.value = x},
      {name:'feedback',min:0.0,max:1,curve:1,callback:x=>this._feedback.factor.value = x},
      {name:'outputGain',min:0,max:1,curve:2,callback:x=> this._output.factor.value = x},
      ]


    this.param = this.generateParameters(paramDefinitions)
    this.createAccessors(this, this.param);

    
  }

  generateParameters(paramDefinitions) {
    const params = {};
    paramDefinitions.forEach((def) => {
      const param = new Parameter(def);
      params[def.name] = param;
    });
    return params;
  }

  createAccessors(parent, params) {
    Object.keys(params).forEach((key) => {
      Object.defineProperty(parent, key, {
        get: () => params[key].value,
        set: (newValue) => {
          params[key].value = newValue;
        },
      });
    });
  }

  get() {
  let output = 'Parameters:\n';
  for (let key in this.param) {
    const param = this.param[key];
    output += `${param.name}: ${param.value}\n`;
  }
  //console.log(output);
}


  /**
   * Connect the output to a destination.
   * @param {Tone.Signal | AudioNode} destination - The destination to connect to.
   */
  connect(destination) {
    if (destination.input) {
      this._output.connect(destination.input);
    } else {
      this._output.connect(destination);
    }
  }

  /**
   * Disconnect the output from a destination.
   * @param {Tone.Signal | AudioNode} destination - The destination to disconnect from.
   */
  disconnect(destination) {
    if (destination.input) {
      this._output.disconnect(destination.input);
    } else {
      this._output.disconnect(destination);
    }
  }
}


const paramDefinitions = (synth) => [
    { 
        name: 'resonance', type: 'vco', 
        min: 0, max: 1, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.resonance, 
        callback: (val, time = null) => {
          if(val<0.2) val = (val/0.2)*0.9
          else if (val < 0.5) val = (val-0.2)/0.3 *0.08 + 0.9
          else val = (val-0.5)/0.5*0.01 + 0.99
          val = val<0 ? 0 : val>0.9999 ? 0.9999 : val
          //console.log('fb', val)
          if(time){
            synth.resonanceAmount.setValueAtTime(val, time)
          } else {
            synth.resonanceAmount.rampTo(val, .1)
          }
        }
    },
    { 
        name: 'damping', type: 'vca', 
        min: 20, max: 10000, curve: 2,
        isSignal: 'false', 
        callback: function(x, time = null) {

            synth.setDamping(x)

        }
    },
    { 
        name: 'detune', type: 'vco', 
        min: 0, max: 1, curve: 1,
        isSignal: 'false', 
        callback: function(x, time = null) {
            synth.setDetune(x)

        }
    },
    { 
        name: 'cutoff', type: 'vcf', 
        min: 20, max: 10000, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.lowpassCutoffSignal, 
        callback: function(x, time = null) {
            if (time) {
                synth.lowpassCutoffSignal.setValueAtTime(x, time);
            } else {
                synth.lowpassCutoffSignal.value = x;
            }
        }
    },
    { 
        name: 'highpass', type: 'vcf', 
        min: 20, max: 10000, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.highpassCutoffSignal, 
        callback: function(x, time = null) {
            if (time) {
                synth.highpassCutoffSignal.setValueAtTime(x, time);
            } else {
                synth.highpassCutoffSignal.rampTo(  x, .1);
            }
        }
    },
    { 
        name: 'Q', type: 'vcf', 
        min: 0, max: 30, curve: 2, 
        callback: function(x) { synth.lpf.Q.value = x; } 
    },
    /*
    { 
        name: 'keyTrack', type: 'hidden', 
        min: 0, max: 2, curve: 1, 
        callback: function(x) { synth.keyTracker.factor.value = x; } },
        */
    { 
        name: 'envDepth', type: 'vcf', 
        min: -1000, max: 5000, curve: 2, value:0,
        callback: function(x) { synth.lpf_env_depth.factor.value = x; } },
    { 
        name: 'level', type: 'vca', 
        min: 0, max: 1, curve: 1, default: 1, 
        callback: function(x) { synth.output.factor.rampTo(x, 0.01) } },
    { 
        name: 'attack', type: 'env', 
        min: 0, max: 1, curve: 2, value: 0.01, 
        callback: function(x) { synth.env.attack = x; } },
    { 
        name: 'decay', type: 'env', 
        min: 0, max: 1, curve: 2, value: 0.1, 
        callback: function(x) { synth.env.decay = x; } },
    { 
        name: 'sustain', type: 'env', 
        min: 0, max: 1, curve: 2, value: 0., 
        callback: function(x) { synth.env.sustain = x; } },
    { 
        name: 'release', type: 'env', 
        min: 0, max: 1, curve: 2, value: 0.5, 
        callback: function(x) { synth.env.release = x; } }
];

paramDefinitions;

/*
KP

Karplus-Strong synthesis
* noise->hpf->lpf->dry->gain
* lpf->vca->wet->delay->gain
* gain->waveshaper->output

methods:
- 
setResonance
setDamping
setFilterFreq
setFilterQ 
setADSR

properties:
- gain.factor.value
*/

;
;
;

;
;

class KP extends MonophonicTemplate{
	constructor(color = [200,200,200]){
      super()
      this.presets = TwinklePresets
      this.synthPresetName = "TwinklePresets"
      //this.accessPreset()
      this.isGlide = false
      this.backgroundColor = [200,50,50]
      this.name = "Twinkle"
      this.guiHeight = 1
      this.layout = basicLayout
      this.detuneVal = 0

      this.frequency = new Tone.Signal(100)

      this.impulse = new Tone.Noise().start()
      this.hpf = new Tone.Filter({frequency: 200, type:'highpass', Q: 0, rolloff:-24})
      this.lpf = new Tone.Filter({frequency: 1000, type:'lowpass', Q: 0, rolloff:-12})
      this.lpf2 = new Tone.Filter({frequency: 1000, type:'lowpass', Q: 0, rolloff:-12})
      this.dry = new Tone.Signal(0.)
      this.wet = new Tone.Multiply(1)
      this.vca= new Tone.Multiply(1)
      this.delay_1 = new Tone.LowpassCombFilter({resonance:.95,dampening:10000})
      this.delay_2 = new Tone.LowpassCombFilter({resonance:.95,dampening:10000})
      //control
      this.env = new Tone.Envelope()
      this.env_depth = new Tone.Multiply(1)
      this.velocitySig = new Tone.Signal(1)
      this.choke = new Tone.Signal()
      this.resonanceAmount = new Tone.Signal(.9)
      this.velocity_depth = new Tone.Multiply(1)
      this.lowpassCutoffSignal = new Tone.Signal(1000)
      this.highpassCutoffSignal = new Tone.Signal(1000)
      this.bandwidthSignal = new Tone.Signal(500)
      this.hpfBandWidthNegate = new Tone.Negate()
      this.hpf_env_depth = new Tone.Multiply()
      this.lpf_env_depth = new Tone.Multiply()
      this.detuneAmount = new Tone.Signal(0)
      this.output = new Tone.Multiply(1)
      //connections
      this.impulse.connect(this.hpf)
      this.hpf.connect(this.lpf)
      this.lpf.connect(this.vca)
      //this.dry.connect(this.vca.factor)
      this.vca.connect(this.wet)
      this.wet.connect(this.delay_1)
      this.wet.connect(this.delay_2)
      this.delay_1.connect(this.lpf2)
      this.delay_2.connect(this.lpf2)
      this.lpf2.connect(this.output)

      this.frequency.connect( this.delay_1.delayTime)
      //this.frequency.connect( this.detuneAmount)
      this.frequency.connect( this.delay_2.delayTime)
      this.detuneAmount.connect(this.delay_2.delayTime)

      this.resonanceAmount.connect(this.delay_1.resonance)
      this.resonanceAmount.connect(this.delay_2.resonance)
      this.choke.connect(this.delay_1.resonance)
      this.choke.connect(this.delay_2.resonance)
      this.env.connect(this.env_depth)
      this.env_depth.connect(this.velocity_depth)
      this.velocity_depth.connect(this.vca.factor)
      this.velocitySig.connect(this.velocity_depth.factor)
      
      //filter cutoffs
      this.highpassCutoffSignal.connect( this.hpf.frequency)
      this.lowpassCutoffSignal.connect( this.lpf.frequency)
      this.lowpassCutoffSignal.connect( this.lpf2.frequency)
      this.env.connect(this.hpf_env_depth)
      this.env.connect(this.lpf_env_depth)
      this.hpf_env_depth.connect( this.hpf.frequency)
      this.lpf_env_depth.connect( this.lpf.frequency)
      this.lpf_env_depth.connect( this.lpf2.frequency)
      // this.bandwidthSignal.connect( this.lpf.frequency)
      // this.bandwidthSignal.connect(this.hpfBandWidthNegate)
      // this.hpfBandWidthNegate.connect(this.hpf.frequency)
	

    // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    //console.log(this.paramDefinitions)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
    setTimeout(()=>{this.loadPreset('default')}, 500);

  }
  cutoff = function(val,time=null){
    if(time){
      this.lowpassCutoffSignal.setValueAtTime(val, time)
      this.highpassCutoffSignal.setValueAtTime(val, time)
    }
    else {
      this.lowpassCutoffSignal.rampTo( val , 0.01) 
      this.highpassCutoffSignal.rampTo( val , 0.01)
    }
  }
  bandwidth = function(val, time){
    if(time) this.bandwidthSignal.setValueAtTime(val, time)
    else this.bandwidthSignal.value = val
  }
  setFrequency = function(val,time=null){
    if(time){
    	this.frequency.setValueAtTime(1/val, time)
    }
    else {
    	this.frequency.rampTo( 1/val, .01)
    }
  }
  setDamping = function(val){
      this.delay_1.dampening = val
      this.delay_2.dampening = val
  }
  
  triggerAttack(val, vel = 100, time = null) {
        vel = vel / 127;
        if (time) {
            this.frequency.setValueAtTime(1 / Tone.Midi(val).toFrequency(), time);
            this.env.triggerAttack(time);
        } else {
            this.frequency.value = 1 / Tone.Midi(val).toFrequency();
            this.env.triggerAttack();
        }
    }
  triggerRelease = function(val, time=null){
    if(time) this.env.triggerRelease(time)
    else this.env.triggerRelease()
  }
  triggerAttackRelease(val, vel = 100, dur = 0.01, time = null) {
        //console.log('AR ',val,vel,dur,time)
        let amp = vel/127
        if (time) {
          this.frequency.setValueAtTime(this.frequency.value,time);
          this.frequency.exponentialRampToValueAtTime(1 / Tone.Midi(val).toFrequency(), time + 0.02);
            //this.frequency.linearRampToValueAtTime(1 / Tone.Midi(val).toFrequency(), time);
            this.velocitySig.setValueAtTime(amp, time); // 0.03s time constant for smoother fade
            this.env.triggerAttackRelease(dur, time);
            this.updateDetune(1 / Tone.Midi(val).toFrequency(), time)
        } else {
            this.frequency.rampTo( 1 / Tone.Midi(val).toFrequency() , .1);
            this.velocitySig.rampTo(amp, 0.005); // 0.03s time constant for smoother fade
            this.env.triggerAttackRelease(dur);
            this.updateDetune( 1 / Tone.Midi(val).toFrequency(), time)
        }
    }

    setDetune(val) {
      let normalizedVal = Math.max(0., Math.min(1, val));
      if( normalizedVal < 0.01) normalizedVal = 0
      this.detuneVal = this.detuneFocusCurve(normalizedVal)
      this.updateDetune(this.frequency.value, null)
    }

    updateDetune(val, time) {
    
      if( time) {
        this.detuneAmount.setValueAtTime (this.frequency.value * this.detuneVal, time)
        this.detuneAmount.exponentialRampToValueAtTime(val * this.detuneVal, time + 0.02);
           
      }
      else this.detuneAmount.value =  val * this.detuneVal
    }

    detuneFocusCurve(x) {
    // Center at 1, 1.5, 2 with slight flattening using tanh or logistic smoothing
    // Use a weighted sum of bumps
    const centerVals = [0, 0.5, 1];
    const numDivisions = centerVals.length - 1;
    const divisionSize = 1 / numDivisions;
    let outputVal = 0

    const sigmoid = (x) => 1 / (1 + Math.exp(-x * 8)); // steeper sigmoid

      for (let i = 0; i < numDivisions; i++) {
        const start = i * divisionSize;
        const end = (i + 1) * divisionSize;
        const center = centerVals[i + 1];

        if (x >= start && x < end) {
          const normalized = (x - start) / divisionSize; // maps to 0–1
          const curved = sigmoid(normalized * 2 - 1);     // sigmoid centered at 0
          let outputVal =  start + curved * divisionSize;          // remap to original range
          //if(outputVal < 0.00001) outputVal = 0
          return outputVal
        }
      }
      return x; // fallback
  }
}

class KP2 {
  constructor(num = 8, color = [200,200,200]){
    this.numVoices = num
    this.voice = []
    for(let i=0;i<this.numVoices;i++) this.voice.push(new KP())
    
    //waveShaper
    this.clip = new Tone.Multiply(0.125)
    this.waveShaper = new Tone.WaveShaper((x)=>{
      return Math.sin(x*Math.PI*2)
      //return Math.tanh(x*8)
    })
    this.waveShaper.oversample = "4x"

    //lpf on output
    this.lpf = new Tone.Filter({type:'lowpass', rolloff:-12, Q:0, frequency:5000})
    this.output = new Tone.Multiply(0.15)
    this.clip.connect(this.waveShaper)

    for(let i=0;i<this.numVoices;i++) this.voice[i].output.connect( this.clip)
    this.clip.connect(this.waveShaper)
    this.waveShaper.connect(this.lpf)
    this.lpf.connect(this.output)

    this.prevNote = 0
    this.v = 0
    this.voiceCounter = 0
    this.activeNotes = [-1,-1,-1,-1, -1,-1,-1,-1]
    this.noteOrder = [7,0,1,2,3,4,5,6]
  }
  // //trigger methods
  triggerAttack = function(val, vel=100, time=null){
    this.v = this.getNewVoice(val)
    if(time){
      this.voice[this.v].triggerAttack(val,vel,time)
    } else{
      this.voice[this.v].triggerAttack(val,vel)
    }
  }
  triggerRelease = function(val,  time=null){
    this.v = this.getActiveVoice(val)
    if(this.v < 0) return
    if(time){
      this.voice[this.v].triggerRelease(time)
    } else{
      this.voice[this.v].triggerRelease()
    }
  }
  triggerAttackRelease = function(val,vel=100, dur=0.01, time=null){
    this.v = this.getNewVoice(val)
    if(time){
      this.voice[this.v].triggerAttackRelease(val, vel, dur, time)
    } else{
      this.voice[this.v].triggerAttackRelease(val, vel, dur)
    }
  }//attackRelease
  // //voice management
  getNewVoice(num) {
    if (this.voiceCounter >= this.numVoices) {
      this.voiceCounter = 0; // Reset voice counter if it exceeds the number of voices
    }
    //console.log('new voice ', num, this.voiceCounter);

    //keep track of note order
    this.prevNote = this.noteOrder.shift();
    this.noteOrder.push(num);

    // Look for free notes
    for (let i = 0; i < this.numVoices; i++) {
      //if note is already playing free it
      if(this.activeNotes[i] == num ) this.triggerRelease(num)
      
    }
    for (let i = 0; i < this.numVoices; i++) {
    //look for free voice
      const index = (i + this.voiceCounter) % this.numVoices;
      if (this.activeNotes[index] < 0) {
        this.activeNotes[index] = num;
        this.voiceCounter = (index + 1) % this.numVoices; // Prepare for the next voice
        //console.log('free voice, assigned to voice', index)
        return index;
      }
    }

      this.voiceCounter = (this.voiceCounter + 1) % this.numVoices; // Prepare for the next voice
      return this.voiceCounter
    
    // // If no inactive voice, replace the oldest note
    // if (this.prevNote !== undefined) {
    //   const oldestNoteIndex = this.activeNotes.indexOf(this.prevNote);
    //   if (oldestNoteIndex !== -1) {
    //     this.activeNotes[oldestNoteIndex] = num;
    //     this.voiceCounter = (oldestNoteIndex + 1) % this.numVoices; // Update for the next voice
    //     console.log('steal voice', this.voiceCounter)
    //     return oldestNoteIndex;
    //   }
    // }

    // Fallback if the above logic didn't return
    //console.log('fallback', this.voiceCounter)
    const returnValue = this.voiceCounter;
    this.voiceCounter = (this.voiceCounter + 1) % this.numVoices;
    return returnValue;
  }
  getActiveVoice= function(num){    
    for(let i=0;i<this.numVoices;i++){
      if(this.activeNotes[i]==num){
        this.activeNotes[i] = -1
        //console.log('voice freed ', i)
        return i
      }
    }
    return -1
  }//getActiveVoice
  panic = function(){
    for(let i=0;i<this.numVoices;i++){
      this.voice[i].env.triggerRelease()
      //this.voice[i].vcf_env.triggerRelease()
      this.activeNotes[i]  = -1
    }
  }
  // //setters
  setResonance = function(val){
    for(let i=0;i<this.numVoices;i++) {
      this.voice[i].resonance.value = val
    }
  }
  setDamping = function(val){
    for(let i=0;i<this.numVoices;i++) {
      this.voice[i].delay_1.dampening = val
      this.voice[i].delay_2.dampening = val
    }
  }
  setCutoff = function(val){
    for(let i=0;i<this.numVoices;i++) this.voice[i].lowpassCutoffSignal.value = val
    this.lpf.frequency.value = val*2
  }
  setQ = function(val){
    for(let i=0;i<this.numVoices;i++) this.voice[i].lpf.Q.value = val
  }
  setHighpass = function(val){
    for(let i=0;i<this.numVoices;i++) this.voice[i].highpassCutoffSignal.value = val
  }
  setADSR = function(a,d,s,r){
    for(let i=0;i<this.numVoices;i++) {
      this.voice[i].env.attack = a
      this.voice[i].env.decay = d
      this.voice[i].env.sustain = s
      this.voice[i].env.release = r
    }
  }
  setDecay(val){
    val = val<0 ? 0.001 : val
    for(let i=0;i<this.numVoices;i++) {
      this.voice[i].env.release = val
      this.voice[i].env.decay = val
    }
  }
  setClip(val){
    this.clip.rampTo(val,0.02)
  }
  setChoke(val){
    for(let i=0;i<this.numVoices;i++) {
    this.voice[i].choke.rampTo(-val/2,0.2)
  }
  }
  setDetune(val){
    for(let i=0;i<this.numVoices;i++) {
      this.voice[i].detuneAmount.value = val
    }
  }
  setDry(val){
    for(let i=0;i<this.numVoices;i++) {
      this.voice[i].dry.value = val
    }
  }
  setEnvDepth(val){
    for(let i=0;i<this.numVoices;i++) {
      this.voice[i].env_depth.factor.value = val
    }
  }
  connect(destination) {
    if (destination.input) {
      this.output.connect(destination.input);
    } else {
      this.output.connect(destination);
    }
  }
}

/*
Kick

vco->shaper_gain->waveShaper->vca->output
env->pitch_drop->vco.frequency

basic kick drum voice:
methods:
trigger(time)

properties:

*/

;
;

class Kick{
  constructor(freq=60,decay=.4,tone=.2) {
    this.vco = new Tone.Oscillator().start()
    this. shaper_gain = new Tone.Multiply(tone)
    this. waveShaper = new Tone.WaveShaper((x)=>{
      return Math.tanh(x*16) *.9
    })
    this.vca = new Tone.Multiply()
    this.output = new Tone.Multiply(.5)
    //
    this.pitch_env = new Tone.Envelope()
    this.pitch_env_depth = new Tone.Multiply()
    this.frequency = new Tone.Signal(freq)
    this.env = new Tone.Envelope()
    //
    this.vco.connect( this.vca)
    this.vca.connect( this.shaper_gain)
    this.shaper_gain.connect( this.waveShaper)
    this.waveShaper.connect( this.output)
    //
    this.pitch_env.connect( this.pitch_env_depth)
    this.pitch_env_depth.connect( this.vco.frequency)
    this.frequency.connect( this.vco.frequency)
    this.env.connect(this.vca.factor)
    //
    this.env.decay = decay
    this.env.release = decay
    this.env.sustain = 0
    this.env.attack = .03
    //
    this.pitch_env.attack = 0.00
    this.pitch_env.decay = 1
    this.pitch_env.sustain = 0
    this.pitch_env.release = .1
  }
  trigger = function(time){
    if(time){
      this.env.triggerAttackRelease(0.01, time)
      this.pitch_env.triggerAttackRelease(0.01,time)
    }else {
      this.env.triggerAttackRelease(0.01)
      this.pitch_env.triggerAttackRelease(0.01)
    }
  }
  connect(destination) {
    if (destination.input) {
      this.output.connect(destination.input);
    } else {
      this.output.connect(destination);
    }
  }

  disconnect(destination) {
    if (destination.input) {
      this.output.disconnect(destination.input);
    } else {

      this.output.disconnect(destination);
    }
  }
}


var midi = null;
var muted = false;

var outputMidiID = null;

var midiMsgs = {};
var ccCallbacks = {};

/****** load webMIDI API ******/
//comment out to disable MIDI
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess()
        .then(onMIDISuccess)
        .catch(onMIDIFailure);
} else {
    console.log("Web MIDI API is not supported in this browser.");
    // Handle the situation gracefully, e.g., show a notification to the user
}

function onMIDISuccess(midiAccess) {
    console.log("MIDI ready!");
    midi = midiAccess;  // store in the global
    // Tone.Transport.start()
    console.log(getMidiIO())
    // initializeCodeBox();
    //setupClock();

    eval('globalThis.setMidiInput1 = setMidiInput;');
}

function onMIDIFailure(msg) {
    console.error(`Failed to get MIDI access - ${msg}`);
}

function setMidiInput(inputID) {
    //in case only one id is inputted, turn into array
    if (!Array.isArray(inputID)) inputID = [inputID];

    //reset inputs
    midi.inputs.forEach(function (key, val) { key.onmidimessage = null; })

    for (var id of inputID) {
        if (id in midi_input_ids & midi.inputs.get(midi_input_ids[id]) != null) {
            midi.inputs.get(midi_input_ids[id]).onmidimessage = handleMidiInput;
            console.log("MIDI input set to: " + midi_input_names[id]);
        } else { console.warn('Invalid input ID'); }
    }
}

function setMidiOutput(outputID) {
    if (Array.isArray(outputID)) {
        console.warn('Can only handle one MIDI output. Please enter one ID.')
    }
    if (outputID in midi_output_ids & midi.outputs.get(midi_output_ids[outputID]) != null) {
        outputMidiID = midi_output_ids[outputID];
        console.log("MIDI output set to: " + midi_output_names[outputID]);
        
        // Set the MIDI output in MidiHandler
        midiHandlerInstance.setOutput(midi.outputs.get(outputMidiID));
    } else { console.warn('Invalid output ID'); }
}

/****** load webMIDI API ******/
class MidiHandler {
    constructor() {
        this.noteOnHandler = (note, velocity=127, channel=1) => {
            console.log('Default Note On Handler:', note, velocity);
            console.log(`Define your own note on handler like this:\nsetNoteOnHandler(( note, vel, (optional:channel) ) => { <your code here> }) `)
        };
        this.noteOffHandler = (note, velocity=0, channel=1) => {
            console.log('Default Note Off Handler:', note, velocity);
            console.log(`Define your own note off handler like this:\nsetNoteOffHandler(( note, vel, (optional:channel) ) => { <your code here> }) `)
        };
        this.CCHandler = (controller, value, channel=1) => {
            console.log('Default CC Handler:', controller, value);
            console.log(`Define your own CC handler like this:\nsetCCHandler(( cc, value, (optionaL:channel) ) => { <your code here> }) `)
        };
        this.midiClockHandler = (message) => {
            // Default handler does nothing - will be replaced by MidiClockManager
            console.log('MIDI Clock message received', message.data[0]);
        };

        this.midiOutput = null; // Reference to the active MIDI output
    }

    // Set the MIDI output port
    setOutput(output) {
        this.midiOutput = output;
    }

    // Send Note On message
    sendNoteOn(note, velocity = 127, channel = 1) {
        console.log(note, velocity, channel)
        if (this.midiOutput) {
            const status = 0x90 | (channel - 1); // Note On status byte
            this.midiOutput.send([status, note, velocity]);
        } else {
            console.warn('No MIDI output is set.');
        }
    }

    // Send Note Off message
    sendNoteOff(note, velocity = 0, channel = 1) {
        console.log(note, velocity, channel)
        if (this.midiOutput) {
            const status = 0x80 | (channel - 1); // Note Off status byte
            this.midiOutput.send([status, note, velocity]);
        } else {
            console.warn('No MIDI output is set.');
        }
    }

    // Send Control Change (CC) message
    sendCC(controller, value, channel = 1) {
        if (this.midiOutput) {
            const status = 0xB0 | (channel - 1); // Control Change status byte
            this.midiOutput.send([status, controller, value]);
        } else {
            console.warn('No MIDI output is set.');
        }
    }

    handleNoteOn(note, velocity, channel) {
        this.noteOnHandler(note, velocity, channel);
    }
    handleNoteOff(note, velocity, channel) {
        this.noteOffHandler(note, velocity, channel);
    }
    handleCC(controller, value, channel) {
        this.CCHandler(controller, value, channel);
    }
    handleMidiClock(message) {
        this.midiClockHandler(message);
    }

    setNoteOnHandler(func) {
        this.noteOnHandler = func;
    }
    setNoteOffHandler(func) {
        this.noteOffHandler = func;
    }
    setCCHandler(func) {
        this.CCHandler = func;
    }
    setMidiClockHandler(func) {
        this.midiClockHandler = func;
    }
}
const midiHandlerInstance = new MidiHandler();

var midi_input_ids = {};
var midi_output_ids = {};
var midi_input_names = {};
var midi_output_names = {};

function getMidiIO() {
    var midiInputs = 'MIDI Inputs:\n';
    var midiOutputs = 'MIDI Outputs:\n';
    var inputID = null;
    var outputID = null;

    var num = 1;
    for (var output of midi.outputs) {
        midiOutputs += num + ': ' + output[1].name + '\n'; //+ \', ID: \'' + output[1].id + '\'\n';
        outputID = output[1].id;
        midi_output_ids[num] = outputID;
        midi_output_names[num] = output[1].name;
        num += 1;
    }

    num = 1;
    for (var input of midi.inputs) {
        midiInputs += num + ': ' + input[1].name + '\n'; // + \', ID: \'' + input[1].id + '\'\n';
        inputID = input[1].id;
        midi_input_ids[num] = inputID;
        midi_input_names[num] = input[1].name;
        num += 1;
    }
    return midiInputs + midiOutputs
}

function handleMidiInput(message) {
    // Check for MIDI clock messages (status byte >= 248)
    if (message.data[0] >= 248) {
        // Special case for System Real-Time Messages (clock, start, stop, etc.)
        midiHandlerInstance.handleMidiClock(message);
        return;
    }
    
    // Handle normal MIDI messages
    let channel = (message.data[0] & 15) + 1
    
    if (message.data[1] != null) {
        let status = message.data[0]
        //console.log('midi', status, message.data[1], message.data[2])
        if (status >= 128 && status <= 159) {
            let note = message.data[1]
            let velocity = message.data[2]
            //note off msg
            if (status >= 128 && status <= 143 || velocity < 1) {
                midiHandlerInstance.handleNoteOff(note, velocity, channel)
            }
            //note on msg
            else {
                midiHandlerInstance.handleNoteOn(note, velocity, channel)
            }
        } else if (status >= 176 && status <= 191) {
            let cc = message.data[1]
            let value = message.data[2]
            midiHandlerInstance.handleCC(cc, value, channel)
        }
    }
}


/*
MidiOut
 
 Overrides ParseNoteOut to send Midi messages

*/
;
;
//;
;
;


class MidiOut extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.isGlide = false
    this.name = "MidiOut"
    console.log(this.name, " loaded")
    this.midiOutput = midiHandlerInstance
    this.channel = 1

    
  }//constructor

  triggerAttackRelease(val, vel = 100, dur = 0.01, time = null) {
    //console.log('AR', val, vel, time);

    // Calculate absolute start and end times
    const startTime = time ? Tone.now() + Tone.Time(time).toSeconds() : Tone.now();
    const endTime = startTime + Tone.Time(dur).toSeconds();

    // Schedule Note On and Note Off messages for MIDI output
    if (this.midiOutput) {
        const channel = this.channel || 1; // Default to channel 1
        const midiNote = val;

        //this.midiOutput.sendNoteOn(midiNote, vel);
        Tone.Draw.schedule(() => {
            this.midiOutput.sendNoteOn( midiNote, vel);
        }, time);

        Tone.Draw.schedule(() => {
            this.midiOutput.sendNoteOff(midiNote, 0);
        }, time+dur);
    }
}

  // parseNoteString(val, time, num, index){
  //       //console.log(val) //[value, time as a fraction of a beat]
  //       if(val[0] === ".") return
  //       if (!val || val.length === 0 ) return '.';
        
  //       const usesPitchNames = /^[a-ac-zA-Z]$/.test(val[0][0]);

  //       let note = ''
  //       //console.log(val[0], usesPitchNames)
  //       if( usesPitchNames ) note =  pitchNameToMidi(val[0])
  //       else note = intervalToMidi(val[0], this.min, this.max)
  //       const div = val[1]
  //       if(note < 0) return
  //       //console.log(note, this.velocity[num], this.sustain[num], time)

  //       //check for velocity,octave,sustain, and roll arrays
  //       let octave = this.getNoteParam(this.octave[num],index)
  //       let velocity = this.getNoteParam(this.velocity[num],index)
  //       let sustain = this.getNoteParam(this.sustain[num],index)
  //       //let roll = getNoteParam(this.roll[num],this.index[num])
  //       //console.log(note + octave*12, velocity, sustain)
  //       try{
  //           this.triggerAttackRelease(note + octave*12, velocity, sustain, time + div * (Tone.Time(this.subdivision[num])));
  //       } catch(e){
  //           console.log('invalid note', note + octave*12, velocity, sustain)
  //       }
  //   }

  //   parseNoteString(val, time, index, num=null) {
  //      //console.log(val,time,index, num, isNaN(Number(val[0])))
  //       if (val[0] === ".") return;
  //       if (!val || val.length === 0 ) return '.';

  //       const usesPitchNames = /^[a-gA-G]/.test(val[0][0]);
  //       //console.log(usesPitchNames, val[0])
  //       let note = '';
  //       if (usesPitchNames) note = pitchNameToMidi(val[0]);
  //       else note = intervalToMidi(val[0], this.min, this.max);

  //       if (note < 0) return;
  //       if (note >127) {
  //           console.log("MIDI note ", note, "ignored")
  //           return;
  //       }

  //       let octave = this.getSeqParam(this.seq[num].octave, index);
  //       let velocity = this.getSeqParam(this.seq[num].velocity, index);
  //       let sustain = this.getSeqParam(this.seq[num].sustain, index);
  //       let subdivision = this.getSeqParam(this.seq[num].subdivision, index);
  //       let lag = this.getSeqParam(this.seq[num].lag, index);
  //       //handle in the Seq class
  //       //let rotate = this.getSeqParam(this.seq[num].rotate, index);
  //       //let offset = this.getSeqParam(this.seq[num].offset, index);

  //       let groove = Groove.get(subdivision,index);
        
  //       const timeOffset = val[1] * (Tone.Time(subdivision)) + lag + groove.timing
  //       velocity = velocity * groove.velocity
  //       if( Math.abs(velocity)>256) velocity = 256
  //       //console.log('pa', note, octave, velocity, sustain, time, timeOffset)
  //       try {
  //           //console.log('trig', this.triggerAttackRelease, note + octave * 12, velocity,sustain,time+timeOffset)
  //           this.triggerAttackRelease(
  //               note + octave * Theory.scaleRatios.length,
  //               velocity,
  //               sustain,
  //               time + timeOffset
  //           );
  //       } catch (e) {
  //           console.log('invalid note', note + octave * 12, velocity, sustain, time + val[1] * Tone.Time(subdivision) + lag);
  //       }
  //   }

}


// MonophonicTemplate.js

;
;


;




;


/**
 * Represents a Monophonic Synth
 * 
 * Base class for synths. Includes:
 * - methods for loading and saving presets
 * - connect/disconnect
 * - setting ADSR values for env and vcf_env objects
 * - show/hide gui, and custom createKnob function
 *
 * ## Working with presets
 * - all synths can load presets saved in the synth/synthPresets folder.
 *
 * To add preset functionality to a synth:
 * - create the preset file `synths/synthPresets/yourSynthPresets.json`
 *     - your preset file needs an open/close brace {} in it
 *
 * - make sure to:
 *     - import your presets and assign to this.presets 
 *     - name your synth correctly in its constructor
 *     - pass the gui into the synth constructor
 *     - add this optional code to the end of the constructor to load
 *         default preset:
 *     if (this.gui !== null) {
 *         this.initGui()
 *         this.hideGui();
 *         setTimeout(()=>{this.loadPreset('default')}, 500);
 *     }
 *
 * When saving presets you will need to manually download and copy
 * the preset file into synth/synthPresets/
 *
 * @constructor
 */
class MonophonicTemplate {
    constructor() {
        this.presets = {};
        this.synthPresetName = ""
        this.gui_elements = [];
        this.gui = null;
        this.guiContainer = null;
        this.guiHeight = 1
        this.layout = basicLayout
        this.poly_ref = null;
        this.super = null;
        this.type = 'Synth';
        this.name = "";
        this.presetsData = null;
        this.curPreset = null;
        this.backgroundColor = [10,10,10]
        this.snapshots = {}

        // Sequencer related
        this.seq = []; // Array of Seq instances
        this.turingMachine = null;
        this.callback = (i, time) => { }
        this.callbackLoop = new Tone.Loop((time) => {
            this.index = Math.floor(Theory.ticks / Tone.Time('16n').toTicks());
            this.callback(this.index, time = null)
        }, '16n').start()

        // Drawing
        this.seqToDraw = 0;
        this.drawing = new ArrayVisualizer(this, [0], 'Canvas', .2);
        this.drawingLoop = new Tone.Loop(time => {
            if (this.drawing.enabled === true) {
                this.drawing.startVisualFrame();
                if (this.seq[this.seqToDraw]) {
                    const seq = this.seq[this.seqToDraw];
                    if (seq.vals.length > 0) {
                        const index = Math.floor(Theory.ticks / Tone.Time(seq.subdivision).toTicks());
                        this.drawing.visualize(seq.vals, index);
                    }
                }
            }
        }, '16n').start();
    }

    /**
     * Populate this.presets with presets fetched from the server
     * Using the name in this.synthPresetName
     */
    async accessPreset(){      
        let presetData = {} 
        try {
            let response = await fetch('https://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/'+this.synthPresetName+'.json')
            let jsonString = ""
                if (!response.ok) {
                    // Handle HTTP errors (e.g., 404 Not Found, 500 Internal Server Error)
                    console.warn("Error accessing file");
                }else{
                    jsonString = await response.text();
                }
                presetData = JSON.parse(jsonString);
                //console.log("jsonString", jsonString);
                //console.log("presetData", presetData);
        } catch (error) {
            console.warn("Error parsing JSON:", error);
        }
        this.presets = await presetData;
        //this.loadPreset("default");
    }
    
    /**
     * Save a preset by name
     * @param {string} name - Name of the preset to save
     * @returns {void}
     * @example synth.savePreset('default')
     */
    //async savePreset (name) {
    savePreset (name) {
        const _preset = {};
        for (let element of Object.values(this.param)) {
            _preset[element.name] = element._value;
        }
        console.log(this.presets)
        // Update the presetsData in memory
        //console.log(this.presets);
        if (!this.presets[name]) {
            this.presets[name] = {};
        }
        this.presets[name] = _preset;

        //  try {
        //     const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/save', {
        //         method: 'POST', // Specify the HTTP method
        //         headers: {
        //             'Content-Type': 'application/json' // Tell the server we're sending JSON
        //         },
        //         body: JSON.stringify({ // Convert your data to a JSON string for the body
        //             name: this.synthPresetName,
        //             data: this.presets
        //     })
        //     });

        //     const result = await response.json(); // Parse the server's JSON response

        //     if (response.ok) {
        //         console.log(`Save successful: ${result.message}`);
        //         return result.success;
        //     } else {
        //         console.warn(`Save failed: ${result.message}`);
        //         // You might want to throw an error here or handle specific status codes
        //         return false;
        //     }
        // } catch (error) {
        //     console.error(`Error sending save request for '${name}':`, error);
        //     return false;
        // }

        //old preset code below
        
        
        console.log(`Preset saved under ${this.name}/${name}`);
    };

    async deletePreset (name) {
        // Update the presetsData in memory
        //console.log(this.presets);
        if (this.presets[name]) {
            delete this.presets[name]
            try {
                const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/save', {
                    method: 'POST', // Specify the HTTP method
                    headers: {
                        'Content-Type': 'application/json' // Tell the server we're sending JSON
                    },
                    body: JSON.stringify({ // Convert your data to a JSON string for the body
                        name: this.synthPresetName,
                        data: this.presets
                })
                });

                const result = await response.json(); // Parse the server's JSON response

                if (response.ok) {
                    console.log(`Delete successful: ${result.message}`);
                    return result.success;
                } else {
                    console.warn(`Delete failed: ${result.message}`);
                    // You might want to throw an error here or handle specific status codes
                    return false;
                }
            } catch (error) {
                console.error(`Error sending delete request for '${name}':`, error);
                return false;
            }
        }

        console.log(`Preset deleted  under ${this.name}/${name}`);
    };

    async downloadAllPresets() {
    try {
        const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/download_presets');
        if (!response.ok) {
            console.error('Failed to download presets:', response.status, response.statusText);
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'synth_presets.zip'; // The filename the user will see
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url); // Clean up the object URL
        console.log('Presets folder downloaded successfully.');
    } catch (error) {
        console.error('Error downloading presets:', error);
    }
}

    /**
     * Load a preset by name
     * @param {string} name - Name of the preset to load
     * @returns {void}
     * @example synth.loadPreset('default')
     */
    loadPreset(name) {
        this.curPreset = name;
        const presetData = this.presets[this.curPreset];

        if (presetData) {
          //console.log("Loading preset", this.curPreset, presetData);
          for (let name in presetData) {
            try {
              if (this.param[name]?.set) {
                this.param[name].set(presetData[name]);
              }
            } catch (e) {
              console.log(name, presetData[name], e);
            }
          }
          //console.log(this.param.vco_mix)
        } else {
            console.log("No preset of name ", name);
        }
    }

    logPreset() {
        const presetData = this.presets[this.curPreset];

        if (presetData) {

          let output = 'Parameters:\n';
          for (let key in presetData) {
              const param = presetData[key];
              if (Array.isArray(param)) {
                  const formattedArray = param.map((value) => {
                      if (typeof value === "number") {
                          return Number(value.toFixed(2)); // Limit to 2 decimals
                      }
                      return value; // Keep non-numbers unchanged
                  });

                  output += `${key}: [${formattedArray.join(", ")}]\n`; // Add the array to output
              }
              else if(typeof param === 'number') output += `${key}: ${param.toFixed(2)}\n`;
              else output += `${key}: ${param}\n`;
          }
          console.log(output);
        }

        else {
            console.log("No preset of name ", this.curPreset);
        }
    }

    /**
     * Console log all available presets
     * @returns {void}
     * @example synth.listPresets()
     */
    listPresets() {
        console.log("Synth presets", this.presets);
    }

    /**
     * Trigger the attack phase of the envelope
     * @param {number} val - MIDI note value
     * @param {number} vel - MIDI velocity value
     * @param {number} time - Time to trigger the attack
     * @returns {void}
     * @example synth.triggerAttack(60, 100, Tone.now())
     */
    triggerAttack(val, vel = 100, time = null) {
        vel = vel / 127;
        if (time) {
            this.frequency.setValueAtTime(Tone.Midi(val).toFrequency(), time);
            this.env.triggerAttack(time);
        } else {
            this.frequency.value = Tone.Midi(val).toFrequency();
            this.env.triggerAttack();
        }
    }

    /**
     * Trigger the release phase of the envelope
     * @param {number} val - MIDI note value
     * @param {number} time - Time to trigger the release
     * @returns {void}
     * @example synth.triggerRelease(60, Tone.now())
     * @example synth.triggerRelease(60)
     */
    triggerRelease(val, time = null) {
        if (time) this.env.triggerRelease(time);
        else this.env.triggerRelease();
    }

    /**
     * Trigger the attack and release phases of the envelope
     * @param {number} val - MIDI note value
     * @param {number} vel - MIDI velocity value
     * @param {number} dur - Duration of the attack and release
     * @param {number} time - Time to trigger the attack and release
     * @returns {void}
     * @example synth.triggerAttackRelease(60, 100, 0.01, Tone.now())
     * @example synth.triggerAttackRelease(60, 100, 0.01)
     */
    triggerAttackRelease(val, vel = 100, dur = 0.01, time = null) {
        console.log('AR ',val,vel,dur,time)
        vel = vel / 127;
        if (time) {
            this.frequency.setValueAtTime(Tone.Midi(val).toFrequency(), time);
            this.env.triggerAttackRelease(dur, time);
        } else {
            this.frequency.value = Tone.Midi(val).toFrequency();
            this.env.triggerAttackRelease(dur);
        }
    }

    generateParameters(paramDefinitions) {
        // console.log(paramDefinitions)
        const params = {};
        paramDefinitions.forEach((def) => {
            //console.log(def)
            const param = new Parameter(this,def);
            //console.log(param)
            params[def.name] = param;
        });
        //console.log(params)
        return params;
    }

    createAccessors(parent, params) {
        Object.keys(params).forEach((key) => {
            const param = params[key];
            let currentSeq = null; // Track active sequence

            if (typeof param.set !== 'function' || typeof param.get !== 'function') {
                throw new Error(`Parameter '${key}' does not have valid get/set methods`);
            }

            // Proxy handler to intercept method calls
            const proxyHandler = {
                get(target, prop,value=null) {
                    if (prop === 'sequence') return (valueArray, subdivision = '16n') => {
                        param.sequence(valueArray,subdivision)
                    };
                    if (prop === 'stop') return () => {
                        param.stop()
                    };
                    if (prop === 'set') return () => {
                        //console.log('set',target,prop,value)
                        const rawValue = (typeof value === 'function') ? value() : value.value;
                        if (currentSeq) {
                            currentSeq.dispose();
                            currentSeq = null;
                        }
                        //console.log(target,prop,rawValue)
                        param.set(value,null,false) 
                    };
                    if (prop === 'from') {
                      return (source, options = {}) => {
                        param.from(source, options);
                      };
                    }
                    return target.get(); // Return the current value
                },
                set(target, _, newValue) {
                    if (Array.isArray(newValue)) {
                        // console.log(target, newValue)
                        if (currentSeq) currentSeq.dispose();
                        currentSeq = new Seq(
                            parent,
                            newValue,
                             '4n',
                            'infinite',
                            0,
                            ((v, time) => param.set(Number(v[0]),null,false, time)) // Ensure time is passed
                        );
                    } else {
                        if (currentSeq) {
                            currentSeq.dispose();
                            currentSeq = null;
                        }
                        param.set(newValue);
                    }
                    return true;
                }
            };

            // Define the parameter with a Proxy
            Object.defineProperty(parent, key, {
                get: () => new Proxy(param, proxyHandler),
                set: (newValue) => {
                    if (Array.isArray(newValue)) {
                        param.sequence(newValue, this.seq[0].subdivision)
                    } else {
                        param.stop()
                        param.set(newValue);
                    }
                },
            });
        });
    }//accessors

    // Method to trigger the sequence in the Proxy
    startSequence(paramName, valueArray, subdivision = '16n') {
        const param = this.param[paramName];

        if (param ) {
            param.sequence(valueArray, subdivision);
        } else {
            console.warn(`Param ${paramName} has no sequence method or doesn't exist.`);
        }
    }

    stopSequence(paramName) {
        const param = this.param[paramName];
        if (param.seq ) {
            param.stop(); 
        } else {
            //console.warn(`Param ${paramName} has no stop method or doesn't exist.`);
        }
    }

    get() {
        let output = '\t' + this.name + ' Parameters:\n';
        for (let key in this.param) {
            const param = this.param[key];
            let value = param._value
            //console.log(value)
            if( typeof value === 'number') {
                if(value > 100) value = value.toFixed()
                else if( value > 1) value = value.toFixed(1)
                else value = value.toFixed(3)
            }
            output += `${param.name}: ${value}\n`;
        }
        console.log(output);
    }
    print(){ this.get()}

    /**
     * Set the ADSR values for the envelope
     * @param {number} a - Attack time
     * @param {number} d - Decay time
     * @param {number} s - Sustain level
     * @param {number} r - Release time
     * @returns {void}
     * @example synth.setADSR(0.01, 0.1, 0.5, 0.1)
     */
    setADSR(a, d, s, r) {
        if (this.env) {
            this.attack = a > 0.001 ? a : 0.001;
            this.decay = d > 0.01 ? d : 0.01;
            this.sustain = Math.abs(s) < 1 ? s : 1;
            this.release = r > 0.01 ? r : 0.01;
        }
    }

    /**
     * Set the ADSR values for the filter envelope
     * @param {number} a - Attack time
     * @param {number} d - Decay time
     * @param {number} s - Sustain level
     * @param {number} r - Release time
     * @returns {void}
     * @example synth.setFilterADSR(0.01, 0.1, 0.5, 0.1)
     */
    setFilterADSR(a, d, s, r) {
        if (this.vcf_env) {
            this.vcf_env.attack = a > 0.001 ? a : 0.001;
            this.vcf_env.decay = d > 0.01 ? d : 0.01;
            this.vcf_env.sustain = Math.abs(s) < 1 ? s : 1;
            this.vcf_env.release = r > 0.01 ? r : 0.01;
        }
    }

    /**
     * Initialize the GUI with NexusUI
     * @returns {void}
     * @example 
     * synth.initGui()
     */
    initGui(gui = null) {
        this.guiContainer = document.getElementById('Canvas');
        if (!this.guiContainer) {
            console.error('NexusUI container #Canvas not found in DOM');
            return;
        }
        
        // No need to create p5 instance for NexusUI
        this.gui = true; // Flag to indicate GUI is initialized
        const layout = this.layout;
        //console.log(layout);

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

            let indexOffset = 0;

            groupedParams[groupType].forEach((param, index) => {
                const isGroupA = groupLayout.groupA.includes(param.name);
                const controlType = isGroupA ? groupLayout.controlTypeA : groupLayout.controlTypeB;
                const size = isGroupA ? groupLayout.sizeA : groupLayout.sizeB;

                // **Retrieve the current parameter value**
                const paramValue = param.get ? param.get() : param._value;

                if (Array.isArray(paramValue)) {
                    paramValue.forEach((value, i) => {
                        let xOffset = groupLayout.offsets.x * ((index + indexOffset) % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
                        let yOffset = groupLayout.offsets.y * Math.floor((index + indexOffset) / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));

                        const x = groupLayout.boundingBox.x + xOffset;
                        const y = groupLayout.boundingBox.y + yOffset;

                        this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color, i, value });
                        indexOffset++;
                    });
                } else {
                    let xOffset = groupLayout.offsets.x * ((index + indexOffset) % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
                    let yOffset = groupLayout.offsets.y * Math.floor((index + indexOffset) / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));

                    const x = groupLayout.boundingBox.x + xOffset;
                    const y = groupLayout.boundingBox.y + yOffset;

                    // Pass the **retrieved parameter value** to GUI
                    this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color, value: paramValue });
                }
            });
        });
        
        // Apply theme colors to all Nexus elements
        if (this.backgroundColor) {
            document.body.style.backgroundColor = `rgb(${this.backgroundColor[0]}, ${this.backgroundColor[1]}, ${this.backgroundColor[2]})`;
        }
    }

    /**
     * Hide the GUI
     * @returns {void}
     */
    hideGui() {
        if (this.gui && this.guiContainer) {
            // Destroy all NexusUI elements
            Object.values(this.param).forEach((param) => {
                if (param.guiElements) {
                    param.guiElements.forEach((element) => {
                        if (element && element.destroy) {
                            element.destroy();
                        }
                    });
                }
            });
            this.gui = null;
        }
    }

    /**
     * Show the GUI
     * @returns {void}
     */
    showGui() {
        this.initGui()
    }

    // Create individual GUI element using NexusUI wrappers
    createGuiElement(param, { x, y, size, controlType, color, i=null }) {
        //console.log('createG', param, x,y,size,controlType, i)
        
        // Convert size from p5 units to pixel dimensions for NexusUI
        const width = size * 45;  // Adjust multiplier as needed
        const height = size * 45;
        
        if (controlType === 'knob') {
            const dial = new Dial(x, y, width, height);
            dial.min = param.min;
            dial.max = param.max;
            dial.value = i !== null && Array.isArray(param._value) ? param._value[i] : param._value;
            
            // Apply color if provided
            if (color) {
                dial.colorize("accent", color);
            }
            
            // Set up the callback
            dial.mapTo((value) => param.set(value, i, true));
            
            param.guiElements.push(dial);
            
        } else if (controlType === 'fader') {
            const slider = new Slider(x, y, width * 2, height);
            slider.min = param.min;
            slider.max = param.max;
            slider.value = i !== null && Array.isArray(param._value) ? param._value[i] : param._value;
            
            // Apply color if provided
            if (color) {
                slider.colorize("accent", color);
            }
            
            // Set up the callback
            slider.mapTo((value) => param.set(value, i, true));
            
            param.guiElements.push(slider);
            
        } else if (controlType === 'radioButton') {
            // RadioButton not yet implemented in NexusUI wrappers
            console.warn(`RadioButton controlType not yet supported with NexusUI`);
        } else if (controlType === 'dropdown') {
            // Dropdown not yet implemented in NexusUI wrappers
            console.warn(`Dropdown controlType not yet supported with NexusUI`);
        } else if (controlType === 'text') {
            // Text display not yet implemented in NexusUI wrappers
            console.warn(`Text controlType not yet supported with NexusUI`);
        } else {
            console.log('no gui creation element for ', controlType)
        }
    }

    /**
     * Fast way to create a knob GUI element
     * @param {string} _label - Label for the knob
     * @param {number} _x - X position of the knob
     * @param {number} _y - Y position of the knob
     * @param {number} _min - Minimum value of the knob
     * @param {number} _max - Maximum value of the knob
     * @param {number} _size - Size of the knob
     * @param {string} _accentColor - Accent color of the knob
     * @param {function} callback - Callback function for the knob
     * @returns {object} - p5.gui knob object
     * @example
     * this.createKnob('Attack', 10, 10, 0.01, 1, 100, '#ff0000', (val) => {
     *    this.setADSR(val, this.gui.get('Decay').value(), this.gui.get('Sustain').value(), this.gui.get('Release').value());
     * });
     */


    createKnob(label, x, y, min, max, size, accentColor, callback) {
        const dial = new Dial(x + (this.x || 0), y + (this.y || 0), size, size);
        dial.min = min;
        dial.max = max;
        
        if (accentColor) {
            dial.colorize("accent", accentColor);
        }
        
        dial.mapTo(callback);
        
        return dial;
    }

    linkGui(name){
        //console.log(this.param)
        let objectIndex = 0
        Object.keys(this.param).forEach(key => {
          let subObject = this.param[key];
          if( subObject.guiElements[0] ) {
            // Note: CollabHub integration would require implementing setLink in NexusElement
            // or manually setting up the callbacks to use ch.control()
            if (subObject.guiElements[0].setLink) {
                subObject.guiElements[0].setLink( name + objectIndex )
            } else {
                console.warn('setLink not implemented for NexusUI elements yet');
            }
          }
          objectIndex++
        });
    }

    pushState(snap = null) {
      Object.keys(this.param).forEach(key => {
        const subObject = this.param[key];
        const value = snap ? snap[key]?.value : subObject._value;

        if (value !== undefined && subObject.guiElements?.[0]) {
          // NexusUI elements use .value property directly
          subObject.guiElements[0].value = value;
        }
      });
    }

    saveSnap(name) {
      this.snapshots[name] = {};

      Object.keys(this.param).forEach(key => {
        let subObject = this.param[key];
        this.snapshots[name][key] = {
          value: subObject._value // store raw value
        };
      });

      console.log(`Snapshot "${name}" saved.`);
    }

    loadSnap(name) {
      const snap = this.snapshots[name];
      if (!snap) {
        console.warn(`Snapshot "${name}" not found.`);
        return;
      }
      this.pushState(snap);
      console.log(`Snapshot "${name}" loaded.`);
    }

    listSnapshots() {
      console.log( Object.keys(this.snapshots) )
    }

    /**
     * Connects to Tone.js destination
     * @param {object} destination - Tone.js destination object
     * @returns {void}
     * @example 
     * const amp = new Tone.Gain(0.5).toDestination();
     * synth.connect(amp)
     */
    connect(destination) {
        if (destination.input) {
            this.output.connect(destination.input);
        } else {
            this.output.connect(destination);
        }
    }

    /**
     * Disconnects from Tone.js destination
     * @param {object} destination - Tone.js destination object
     * @returns {void}
     * @example
     * const amp = new Tone.Gain(0.5).toDestination();
     * synth.connect(amp)
     * synth.disconnect(amp)
     */
    disconnect(destination) {
        if (destination.input) {
            this.output.disconnect(destination.input);
        } else {
            this.output.disconnect(destination);
        }
    }

    /**
     * Sequences the provided array of notes and initializes a Tone.Loop with the given subdivision.
     *
     * @param {string} arr - The sequence of notes as a string.
     * @param {string} [subdivision] - The rhythmic subdivision for the loop (e.g., '16n', '8n').
     * @param {string} num (default 0) - the sequence number. Up to 10 sequences per instance.
     */
    sequence(arr, subdivision = '8n', num = 0, phraseLength = 'infinite') {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, arr, subdivision, phraseLength, num, this.parseNoteString.bind(this));
        } else {
            this.seq[num].sequence(arr, subdivision, phraseLength);
        }
        this.start(num);
    }

    /**
     * Plays the provided sequence array initializes a Tone.Loop with the given subdivision.
     *
     * @param {string} arr - The sequence of notes as a string.
     * @param {number} iterations - The the number of times to play the sequence
     * @param {string} [subdivision] - The rhythmic subdivision for the loop (e.g., '16n', '8n').
     * @param {string} num (default 0) - the sequence number. Up to 10 sequences per instance.
     */
    setSeq(arr, subdivision = '8n', num = 0) {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, arr, subdivision, 'infinite', num, this.parseNoteString.bind(this));
        } else {
            this.seq[num].setSeq(arr, subdivision);
        }
    }

    play(arr, subdivision = '8n', num = 0, phraseLength = 1) {
        if (!this.seq[num]) {
            // this.seq[num]._offset = 0//make sure the new one starts at the beginning as well
            this.seq[num] = new Seq(this, arr, subdivision, phraseLength, num, this.parseNoteString.bind(this));
            this.seq[num]._offset = 0
        } else {
            this.seq[num]._offset = 0//there is a time delay between this and where the index is, but i can set it such as this so that I know that is started
            this.seq[num].sequence(arr, subdivision, phraseLength);
        }
        this.start(num);

        // if (this.seq[num]) {
        //     this.seq[num].play(length);
        // }
    }

    expr(func, len = 32, subdivision = '16n', num = 0) {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, [], subdivision, 'infinite', num, this.parseNoteString.bind(this));
        }
        this.seq[num].expr(func, len, subdivision);
        this.start(num);
    }

    euclid(seq, hits=4, beats=8, rotate=0, subdivision = '8n', num = 0){
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, seq, subdivision, 'infinite', num, this.parseNoteString.bind(this));
        } else {
            this.seq[num].sequence(seq, subdivision, 'infinite');
        }
        this.seq[num].euclid(hits, beats,rotate);
        this.start(num);
    }

    set velocity(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].velocity = val
        }
    }

    set orn(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].orn = val
        }
    }

    set octave(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].octave = val
        }
    }

    set duration(val) {//turn into duration
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].duration = val
        }
    }

    set subdivision(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].subdivision = val
        }
    }

    set transform(val) {
        if (typeof val !== 'function') {
            console.warn(`Transform must be a function. Received: ${typeof val}`);
            return;
        }
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].transform = val
        }
    }
//roll already exists in seq
    set roll(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].roll = val
        }
    }

    set rotate(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].rotate = val
        }
    }

    set offset(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].offset = val
        }
    }

    /**
     * Sets the transformation for the loop.
     * 
     * @param {string} transform - The transformation to apply.
     */
    setTransform(transform, num = 'all') {
        if (num === 'all') {
            for (let seq of this.seq) {
                if (seq) seq.setTransform(transform);
            }
        } else {
            if (this.seq[num]) this.seq[num].setTransform(transform);
        }
    }
    //possible implementation of rotate
    get duration() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setduration(value);
                    }
                }
                return true; // Indicate success
            }
        });
    }

    get velocity() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setVelocity(value);
                    }
                }
                return true;
            }
        });
    }

    get octave() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setOctave(value);
                    }
                }
                return true;
            }
        });
    }

    get subdivision() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setSubdivision(value);
                    }
                }
                return true;
            }
        });
    }

    get roll() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setRoll(value);
                    }
                }
                return true;
            }
        });
    }

    get rotate() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setRotate(value);
                    }
                }
                return true;
            }
        });
    }

    get transform() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setTransform(value);
                    }
                }
                return true;
            }
        });
    }

    start(num = 'all') {
        if (num === 'all') {
            for (let seq of this.seq) {
                if (seq) seq.start();
            }
            this.drawingLoop.start();
        } else {
            if (this.seq[num]) this.seq[num].start();
        }
    }

    stop(num = 'all') {
        if (num === 'all') {
            for (let seq of this.seq) {
                if (seq) seq.stop();
            }
            this.drawingLoop.stop();
        } else {
            if (this.seq[num]) this.seq[num].stop();
        }
    }

    turing(val){

    }

    // Visualizations

    draw(arr = this.drawing.array, target = this.drawing.target, ratio = this.drawing.ratio) {
        this.drawing = new ArrayVisualizer(arr, target, ratio);
    }

    getSeqParam(val, index) {
        //console.log(val, index,)
        if (Array.isArray(val)) return val[index % val.length];
        else return val;
    }

    parseNoteString(val, time, index, num=null) {
       //console.log(val,time,index, num, isNaN(Number(val[0])))
        if (val[0] === ".") return;
        if (!val || val.length === 0 ) return '.';

        const usesPitchNames = /^[a-gA-G]/.test(val[0][0]);
        //console.log(usesPitchNames, val[0])
        let note = '';
        if (usesPitchNames) note = pitchNameToMidi(val[0]);
        else note = intervalToMidi(val[0], this.min, this.max);

        if (note < 0) return;
        if (note >127) {
            console.log("MIDI note ", note, "ignored")
            return;
        }

        let octave = this.getSeqParam(this.seq[num].octave, index);
        let velocity = this.getSeqParam(this.seq[num].velocity, index);
        let duration = this.getSeqParam(this.seq[num].duration, index);
        let subdivision = this.getSeqParam(this.seq[num].subdivision, index);
        let lag = this.getSeqParam(this.seq[num].lag, index);
        //handle in the Seq class
        //let rotate = this.getSeqParam(this.seq[num].rotate, index);
        //let offset = this.getSeqParam(this.seq[num].offset, index);

        let groove = Groove.get(subdivision,index);
        
        const timeOffset = val[1] * (Tone.Time(subdivision)) + lag + groove.timing
        velocity = velocity * groove.velocity
        if( Math.abs(velocity)>256) velocity = 256
        //console.log('pa', note, octave, velocity, duration, time, timeOffset)
        try {
            //console.log('trig', this.triggerAttackRelease, note + octave * 12, velocity,duration,time+timeOffset)
            this.triggerAttackRelease(
                note + octave * Theory.scaleRatios.length,
                velocity,
                duration,
                time + timeOffset
            );
        } catch (e) {
            console.log('invalid note', note + octave * 12, velocity, duration, time + val[1] * Tone.Time(subdivision) + lag);
        }
    }
}


// MonophonicTemplate.js

;
;


;




;


/**
 * Represents a Monophonic Synth
 * 
 * Base class for synths. Includes:
 * - methods for loading and saving presets
 * - connect/disconnect
 * - setting ADSR values for env and vcf_env objects
 * - show/hide gui, and custom createKnob function
 *
 * ## Working with presets
 * - all synths can load presets saved in the synth/synthPresets folder.
 *
 * To add preset functionality to a synth:
 * - create the preset file `synths/synthPresets/yourSynthPresets.json`
 *     - your preset file needs an open/close brace {} in it
 *
 * - make sure to:
 *     - import your presets and assign to this.presets 
 *     - name your synth correctly in its constructor
 *     - pass the gui into the synth constructor
 *     - add this optional code to the end of the constructor to load
 *         default preset:
 *     if (this.gui !== null) {
 *         this.initGui()
 *         this.hideGui();
 *         setTimeout(()=>{this.loadPreset('default')}, 500);
 *     }
 *
 * When saving presets you will need to manually download and copy
 * the preset file into synth/synthPresets/
 *
 * @constructor
 */
class MonophonicTemplate {
    constructor() {
        this.presets = {};
        this.synthPresetName = ""
        this.gui_elements = [];
        this.gui = null;
        this.guiContainer = null;
        this.guiHeight = 1
        this.layout = basicLayout
        this.poly_ref = null;
        this.super = null;
        this.type = 'Synth';
        this.name = "";
        this.presetsData = null;
        this.curPreset = null;
        this.backgroundColor = [10,10,10]
        this.snapshots = {}

        // Sequencer related
        this.seq = []; // Array of Seq instances
        this.turingMachine = null;
        this.callback = (i, time) => { }
        this.callbackLoop = new Tone.Loop((time) => {
            this.index = Math.floor(Theory.ticks / Tone.Time('16n').toTicks());
            this.callback(this.index, time = null)
        }, '16n').start()

        // Drawing
        this.seqToDraw = 0;
        this.drawing = new ArrayVisualizer(this, [0], 'Canvas', .2);
        this.drawingLoop = new Tone.Loop(time => {
            if (this.drawing.enabled === true) {
                this.drawing.startVisualFrame();
                if (this.seq[this.seqToDraw]) {
                    const seq = this.seq[this.seqToDraw];
                    if (seq.vals.length > 0) {
                        const index = Math.floor(Theory.ticks / Tone.Time(seq.subdivision).toTicks());
                        this.drawing.visualize(seq.vals, index);
                    }
                }
            }
        }, '16n').start();
    }

    /**
     * Populate this.presets with presets fetched from the server
     * Using the name in this.synthPresetName
     */
    async accessPreset(){      
        let presetData = {} 
        try {
            let response = await fetch('https://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/'+this.synthPresetName+'.json')
            let jsonString = ""
                if (!response.ok) {
                    // Handle HTTP errors (e.g., 404 Not Found, 500 Internal Server Error)
                    console.warn("Error accessing file");
                }else{
                    jsonString = await response.text();
                }
                presetData = JSON.parse(jsonString);
                //console.log("jsonString", jsonString);
                //console.log("presetData", presetData);
        } catch (error) {
            console.warn("Error parsing JSON:", error);
        }
        this.presets = await presetData;
        //this.loadPreset("default");
    }
    
    /**
     * Save a preset by name
     * @param {string} name - Name of the preset to save
     * @returns {void}
     * @example synth.savePreset('default')
     */
    //async savePreset (name) {
    savePreset (name) {
        const _preset = {};
        for (let element of Object.values(this.param)) {
            _preset[element.name] = element._value;
        }
        console.log(this.presets)
        // Update the presetsData in memory
        //console.log(this.presets);
        if (!this.presets[name]) {
            this.presets[name] = {};
        }
        this.presets[name] = _preset;

        //  try {
        //     const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/save', {
        //         method: 'POST', // Specify the HTTP method
        //         headers: {
        //             'Content-Type': 'application/json' // Tell the server we're sending JSON
        //         },
        //         body: JSON.stringify({ // Convert your data to a JSON string for the body
        //             name: this.synthPresetName,
        //             data: this.presets
        //     })
        //     });

        //     const result = await response.json(); // Parse the server's JSON response

        //     if (response.ok) {
        //         console.log(`Save successful: ${result.message}`);
        //         return result.success;
        //     } else {
        //         console.warn(`Save failed: ${result.message}`);
        //         // You might want to throw an error here or handle specific status codes
        //         return false;
        //     }
        // } catch (error) {
        //     console.error(`Error sending save request for '${name}':`, error);
        //     return false;
        // }

        //old preset code below
        
        
        console.log(`Preset saved under ${this.name}/${name}`);
    };

    async deletePreset (name) {
        // Update the presetsData in memory
        //console.log(this.presets);
        if (this.presets[name]) {
            delete this.presets[name]
            try {
                const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/synth_presets/save', {
                    method: 'POST', // Specify the HTTP method
                    headers: {
                        'Content-Type': 'application/json' // Tell the server we're sending JSON
                    },
                    body: JSON.stringify({ // Convert your data to a JSON string for the body
                        name: this.synthPresetName,
                        data: this.presets
                })
                });

                const result = await response.json(); // Parse the server's JSON response

                if (response.ok) {
                    console.log(`Delete successful: ${result.message}`);
                    return result.success;
                } else {
                    console.warn(`Delete failed: ${result.message}`);
                    // You might want to throw an error here or handle specific status codes
                    return false;
                }
            } catch (error) {
                console.error(`Error sending delete request for '${name}':`, error);
                return false;
            }
        }

        console.log(`Preset deleted  under ${this.name}/${name}`);
    };

    async downloadAllPresets() {
    try {
        const response = await fetch('http://collabhub-server-90d79b565c8f.herokuapp.com/download_presets');
        if (!response.ok) {
            console.error('Failed to download presets:', response.status, response.statusText);
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'synth_presets.zip'; // The filename the user will see
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url); // Clean up the object URL
        console.log('Presets folder downloaded successfully.');
    } catch (error) {
        console.error('Error downloading presets:', error);
    }
}

    /**
     * Load a preset by name
     * @param {string} name - Name of the preset to load
     * @returns {void}
     * @example synth.loadPreset('default')
     */
    loadPreset(name) {
        this.curPreset = name;
        const presetData = this.presets[this.curPreset];

        if (presetData) {
          //console.log("Loading preset", this.curPreset, presetData);
          for (let name in presetData) {
            try {
              if (this.param[name]?.set) {
                this.param[name].set(presetData[name]);
              }
            } catch (e) {
              console.log(name, presetData[name], e);
            }
          }
          //console.log(this.param.vco_mix)
        } else {
            console.log("No preset of name ", name);
        }
    }

    logPreset() {
        const presetData = this.presets[this.curPreset];

        if (presetData) {

          let output = 'Parameters:\n';
          for (let key in presetData) {
              const param = presetData[key];
              if (Array.isArray(param)) {
                  const formattedArray = param.map((value) => {
                      if (typeof value === "number") {
                          return Number(value.toFixed(2)); // Limit to 2 decimals
                      }
                      return value; // Keep non-numbers unchanged
                  });

                  output += `${key}: [${formattedArray.join(", ")}]\n`; // Add the array to output
              }
              else if(typeof param === 'number') output += `${key}: ${param.toFixed(2)}\n`;
              else output += `${key}: ${param}\n`;
          }
          console.log(output);
        }

        else {
            console.log("No preset of name ", this.curPreset);
        }
    }

    /**
     * Console log all available presets
     * @returns {void}
     * @example synth.listPresets()
     */
    listPresets() {
        console.log("Synth presets", this.presets);
    }

    /**
     * Trigger the attack phase of the envelope
     * @param {number} val - MIDI note value
     * @param {number} vel - MIDI velocity value
     * @param {number} time - Time to trigger the attack
     * @returns {void}
     * @example synth.triggerAttack(60, 100, Tone.now())
     */
    triggerAttack(val, vel = 100, time = null) {
        vel = vel / 127;
        if (time) {
            this.frequency.setValueAtTime(Tone.Midi(val).toFrequency(), time);
            this.env.triggerAttack(time);
        } else {
            this.frequency.value = Tone.Midi(val).toFrequency();
            this.env.triggerAttack();
        }
    }

    /**
     * Trigger the release phase of the envelope
     * @param {number} val - MIDI note value
     * @param {number} time - Time to trigger the release
     * @returns {void}
     * @example synth.triggerRelease(60, Tone.now())
     * @example synth.triggerRelease(60)
     */
    triggerRelease(val, time = null) {
        if (time) this.env.triggerRelease(time);
        else this.env.triggerRelease();
    }

    /**
     * Trigger the attack and release phases of the envelope
     * @param {number} val - MIDI note value
     * @param {number} vel - MIDI velocity value
     * @param {number} dur - Duration of the attack and release
     * @param {number} time - Time to trigger the attack and release
     * @returns {void}
     * @example synth.triggerAttackRelease(60, 100, 0.01, Tone.now())
     * @example synth.triggerAttackRelease(60, 100, 0.01)
     */
    triggerAttackRelease(val, vel = 100, dur = 0.01, time = null) {
        console.log('AR ',val,vel,dur,time)
        vel = vel / 127;
        if (time) {
            this.frequency.setValueAtTime(Tone.Midi(val).toFrequency(), time);
            this.env.triggerAttackRelease(dur, time);
        } else {
            this.frequency.value = Tone.Midi(val).toFrequency();
            this.env.triggerAttackRelease(dur);
        }
    }

    generateParameters(paramDefinitions) {
        // console.log(paramDefinitions)
        const params = {};
        paramDefinitions.forEach((def) => {
            //console.log(def)
            const param = new Parameter(this,def);
            //console.log(param)
            params[def.name] = param;
        });
        //console.log(params)
        return params;
    }

    createAccessors(parent, params) {
        Object.keys(params).forEach((key) => {
            const param = params[key];
            let currentSeq = null; // Track active sequence

            if (typeof param.set !== 'function' || typeof param.get !== 'function') {
                throw new Error(`Parameter '${key}' does not have valid get/set methods`);
            }

            // Proxy handler to intercept method calls
            const proxyHandler = {
                get(target, prop,value=null) {
                    if (prop === 'sequence') return (valueArray, subdivision = '16n') => {
                        param.sequence(valueArray,subdivision)
                    };
                    if (prop === 'stop') return () => {
                        param.stop()
                    };
                    if (prop === 'set') return () => {
                        //console.log('set',target,prop,value)
                        const rawValue = (typeof value === 'function') ? value() : value.value;
                        if (currentSeq) {
                            currentSeq.dispose();
                            currentSeq = null;
                        }
                        //console.log(target,prop,rawValue)
                        param.set(value,null,false) 
                    };
                    if (prop === 'from') {
                      return (source, options = {}) => {
                        param.from(source, options);
                      };
                    }
                    return target.get(); // Return the current value
                },
                set(target, _, newValue) {
                    if (Array.isArray(newValue)) {
                        // console.log(target, newValue)
                        if (currentSeq) currentSeq.dispose();
                        currentSeq = new Seq(
                            parent,
                            newValue,
                             '4n',
                            'infinite',
                            0,
                            ((v, time) => param.set(Number(v[0]),null,false, time)) // Ensure time is passed
                        );
                    } else {
                        if (currentSeq) {
                            currentSeq.dispose();
                            currentSeq = null;
                        }
                        param.set(newValue);
                    }
                    return true;
                }
            };

            // Define the parameter with a Proxy
            Object.defineProperty(parent, key, {
                get: () => new Proxy(param, proxyHandler),
                set: (newValue) => {
                    if (Array.isArray(newValue)) {
                        param.sequence(newValue, this.seq[0].subdivision)
                    } else {
                        param.stop()
                        param.set(newValue);
                    }
                },
            });
        });
    }//accessors

    // Method to trigger the sequence in the Proxy
    startSequence(paramName, valueArray, subdivision = '16n') {
        const param = this.param[paramName];

        if (param ) {
            param.sequence(valueArray, subdivision);
        } else {
            console.warn(`Param ${paramName} has no sequence method or doesn't exist.`);
        }
    }

    stopSequence(paramName) {
        const param = this.param[paramName];
        if (param.seq ) {
            param.stop(); 
        } else {
            //console.warn(`Param ${paramName} has no stop method or doesn't exist.`);
        }
    }

    get() {
        let output = '\t' + this.name + ' Parameters:\n';
        for (let key in this.param) {
            const param = this.param[key];
            let value = param._value
            //console.log(value)
            if( typeof value === 'number') {
                if(value > 100) value = value.toFixed()
                else if( value > 1) value = value.toFixed(1)
                else value = value.toFixed(3)
            }
            output += `${param.name}: ${value}\n`;
        }
        console.log(output);
    }
    print(){ this.get()}

    /**
     * Set the ADSR values for the envelope
     * @param {number} a - Attack time
     * @param {number} d - Decay time
     * @param {number} s - Sustain level
     * @param {number} r - Release time
     * @returns {void}
     * @example synth.setADSR(0.01, 0.1, 0.5, 0.1)
     */
    setADSR(a, d, s, r) {
        if (this.env) {
            this.attack = a > 0.001 ? a : 0.001;
            this.decay = d > 0.01 ? d : 0.01;
            this.sustain = Math.abs(s) < 1 ? s : 1;
            this.release = r > 0.01 ? r : 0.01;
        }
    }

    /**
     * Set the ADSR values for the filter envelope
     * @param {number} a - Attack time
     * @param {number} d - Decay time
     * @param {number} s - Sustain level
     * @param {number} r - Release time
     * @returns {void}
     * @example synth.setFilterADSR(0.01, 0.1, 0.5, 0.1)
     */
    setFilterADSR(a, d, s, r) {
        if (this.vcf_env) {
            this.vcf_env.attack = a > 0.001 ? a : 0.001;
            this.vcf_env.decay = d > 0.01 ? d : 0.01;
            this.vcf_env.sustain = Math.abs(s) < 1 ? s : 1;
            this.vcf_env.release = r > 0.01 ? r : 0.01;
        }
    }

    /**
     * Initialize the GUI with NexusUI
     * @returns {void}
     * @example 
     * synth.initGui()
     */
    initGui(gui = null) {
        this.guiContainer = document.getElementById('Canvas');
        if (!this.guiContainer) {
            console.error('NexusUI container #Canvas not found in DOM');
            return;
        }
        
        // No need to create p5 instance for NexusUI
        this.gui = true; // Flag to indicate GUI is initialized
        const layout = this.layout;
        //console.log(layout);

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

            let indexOffset = 0;

            groupedParams[groupType].forEach((param, index) => {
                const isGroupA = groupLayout.groupA.includes(param.name);
                const controlType = isGroupA ? groupLayout.controlTypeA : groupLayout.controlTypeB;
                const size = isGroupA ? groupLayout.sizeA : groupLayout.sizeB;

                // **Retrieve the current parameter value**
                const paramValue = param.get ? param.get() : param._value;

                if (Array.isArray(paramValue)) {
                    paramValue.forEach((value, i) => {
                        let xOffset = groupLayout.offsets.x * ((index + indexOffset) % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
                        let yOffset = groupLayout.offsets.y * Math.floor((index + indexOffset) / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));

                        const x = groupLayout.boundingBox.x + xOffset;
                        const y = groupLayout.boundingBox.y + yOffset;

                        this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color, i, value });
                        indexOffset++;
                    });
                } else {
                    let xOffset = groupLayout.offsets.x * ((index + indexOffset) % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
                    let yOffset = groupLayout.offsets.y * Math.floor((index + indexOffset) / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));

                    const x = groupLayout.boundingBox.x + xOffset;
                    const y = groupLayout.boundingBox.y + yOffset;

                    // Pass the **retrieved parameter value** to GUI
                    this.createGuiElement(param, { x, y, size, controlType, color: groupLayout.color, value: paramValue });
                }
            });
        });
        
        // Apply theme colors to all Nexus elements
        if (this.backgroundColor) {
            document.body.style.backgroundColor = `rgb(${this.backgroundColor[0]}, ${this.backgroundColor[1]}, ${this.backgroundColor[2]})`;
        }
    }

    /**
     * Hide the GUI
     * @returns {void}
     */
    hideGui() {
        if (this.gui && this.guiContainer) {
            // Destroy all NexusUI elements
            Object.values(this.param).forEach((param) => {
                if (param.guiElements) {
                    param.guiElements.forEach((element) => {
                        if (element && element.destroy) {
                            element.destroy();
                        }
                    });
                }
            });
            this.gui = null;
        }
    }

    /**
     * Show the GUI
     * @returns {void}
     */
    showGui() {
        this.initGui()
    }

    // Create individual GUI element using NexusUI wrappers
    createGuiElement(param, { x, y, size, controlType, color, i=null }) {
        //console.log('createG', param, x,y,size,controlType, i)
        
        // Convert size from p5 units to pixel dimensions for NexusUI
        const width = size * 45;  // Adjust multiplier as needed
        const height = size * 45;
        
        if (controlType === 'knob') {
            const dial = new Dial(x, y, width, height);
            dial.min = param.min;
            dial.max = param.max;
            dial.value = i !== null && Array.isArray(param._value) ? param._value[i] : param._value;
            
            // Apply color if provided
            if (color) {
                dial.colorize("accent", color);
            }
            
            // Set up the callback
            dial.mapTo((value) => param.set(value, i, true));
            
            param.guiElements.push(dial);
            
        } else if (controlType === 'fader') {
            const slider = new Slider(x, y, width * 2, height);
            slider.min = param.min;
            slider.max = param.max;
            slider.value = i !== null && Array.isArray(param._value) ? param._value[i] : param._value;
            
            // Apply color if provided
            if (color) {
                slider.colorize("accent", color);
            }
            
            // Set up the callback
            slider.mapTo((value) => param.set(value, i, true));
            
            param.guiElements.push(slider);
            
        } else if (controlType === 'radioButton') {
            // RadioButton not yet implemented in NexusUI wrappers
            console.warn(`RadioButton controlType not yet supported with NexusUI`);
        } else if (controlType === 'dropdown') {
            // Dropdown not yet implemented in NexusUI wrappers
            console.warn(`Dropdown controlType not yet supported with NexusUI`);
        } else if (controlType === 'text') {
            // Text display not yet implemented in NexusUI wrappers
            console.warn(`Text controlType not yet supported with NexusUI`);
        } else {
            console.log('no gui creation element for ', controlType)
        }
    }

    /**
     * Fast way to create a knob GUI element
     * @param {string} _label - Label for the knob
     * @param {number} _x - X position of the knob
     * @param {number} _y - Y position of the knob
     * @param {number} _min - Minimum value of the knob
     * @param {number} _max - Maximum value of the knob
     * @param {number} _size - Size of the knob
     * @param {string} _accentColor - Accent color of the knob
     * @param {function} callback - Callback function for the knob
     * @returns {object} - p5.gui knob object
     * @example
     * this.createKnob('Attack', 10, 10, 0.01, 1, 100, '#ff0000', (val) => {
     *    this.setADSR(val, this.gui.get('Decay').value(), this.gui.get('Sustain').value(), this.gui.get('Release').value());
     * });
     */


    createKnob(label, x, y, min, max, size, accentColor, callback) {
        const dial = new Dial(x + (this.x || 0), y + (this.y || 0), size, size);
        dial.min = min;
        dial.max = max;
        
        if (accentColor) {
            dial.colorize("accent", accentColor);
        }
        
        dial.mapTo(callback);
        
        return dial;
    }

    linkGui(name){
        //console.log(this.param)
        let objectIndex = 0
        Object.keys(this.param).forEach(key => {
          let subObject = this.param[key];
          if( subObject.guiElements[0] ) {
            // Note: CollabHub integration would require implementing setLink in NexusElement
            // or manually setting up the callbacks to use ch.control()
            if (subObject.guiElements[0].setLink) {
                subObject.guiElements[0].setLink( name + objectIndex )
            } else {
                console.warn('setLink not implemented for NexusUI elements yet');
            }
          }
          objectIndex++
        });
    }

    pushState(snap = null) {
      Object.keys(this.param).forEach(key => {
        const subObject = this.param[key];
        const value = snap ? snap[key]?.value : subObject._value;

        if (value !== undefined && subObject.guiElements?.[0]) {
          // NexusUI elements use .value property directly
          subObject.guiElements[0].value = value;
        }
      });
    }

    saveSnap(name) {
      this.snapshots[name] = {};

      Object.keys(this.param).forEach(key => {
        let subObject = this.param[key];
        this.snapshots[name][key] = {
          value: subObject._value // store raw value
        };
      });

      console.log(`Snapshot "${name}" saved.`);
    }

    loadSnap(name) {
      const snap = this.snapshots[name];
      if (!snap) {
        console.warn(`Snapshot "${name}" not found.`);
        return;
      }
      this.pushState(snap);
      console.log(`Snapshot "${name}" loaded.`);
    }

    listSnapshots() {
      console.log( Object.keys(this.snapshots) )
    }

    /**
     * Connects to Tone.js destination
     * @param {object} destination - Tone.js destination object
     * @returns {void}
     * @example 
     * const amp = new Tone.Gain(0.5).toDestination();
     * synth.connect(amp)
     */
    connect(destination) {
        if (destination.input) {
            this.output.connect(destination.input);
        } else {
            this.output.connect(destination);
        }
    }

    /**
     * Disconnects from Tone.js destination
     * @param {object} destination - Tone.js destination object
     * @returns {void}
     * @example
     * const amp = new Tone.Gain(0.5).toDestination();
     * synth.connect(amp)
     * synth.disconnect(amp)
     */
    disconnect(destination) {
        if (destination.input) {
            this.output.disconnect(destination.input);
        } else {
            this.output.disconnect(destination);
        }
    }

    /**
     * Sequences the provided array of notes and initializes a Tone.Loop with the given subdivision.
     *
     * @param {string} arr - The sequence of notes as a string.
     * @param {string} [subdivision] - The rhythmic subdivision for the loop (e.g., '16n', '8n').
     * @param {string} num (default 0) - the sequence number. Up to 10 sequences per instance.
     */
    sequence(arr, subdivision = '8n', num = 0, phraseLength = 'infinite') {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, arr, subdivision, phraseLength, num, this.parseNoteString.bind(this));
        } else {
            this.seq[num].sequence(arr, subdivision, phraseLength);
        }
        this.start(num);
    }

    /**
     * Plays the provided sequence array initializes a Tone.Loop with the given subdivision.
     *
     * @param {string} arr - The sequence of notes as a string.
     * @param {number} iterations - The the number of times to play the sequence
     * @param {string} [subdivision] - The rhythmic subdivision for the loop (e.g., '16n', '8n').
     * @param {string} num (default 0) - the sequence number. Up to 10 sequences per instance.
     */
    setSeq(arr, subdivision = '8n', num = 0) {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, arr, subdivision, 'infinite', num, this.parseNoteString.bind(this));
        } else {
            this.seq[num].setSeq(arr, subdivision);
        }
    }

    play(arr, subdivision = '8n', num = 0, phraseLength = 1) {
        if (!this.seq[num]) {
            // this.seq[num]._offset = 0//make sure the new one starts at the beginning as well
            this.seq[num] = new Seq(this, arr, subdivision, phraseLength, num, this.parseNoteString.bind(this));
            this.seq[num]._offset = 0
        } else {
            this.seq[num]._offset = 0//there is a time delay between this and where the index is, but i can set it such as this so that I know that is started
            this.seq[num].sequence(arr, subdivision, phraseLength);
        }
        this.start(num);

        // if (this.seq[num]) {
        //     this.seq[num].play(length);
        // }
    }

    expr(func, len = 32, subdivision = '16n', num = 0) {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, [], subdivision, 'infinite', num, this.parseNoteString.bind(this));
        }
        this.seq[num].expr(func, len, subdivision);
        this.start(num);
    }

    euclid(seq, hits=4, beats=8, rotate=0, subdivision = '8n', num = 0){
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, seq, subdivision, 'infinite', num, this.parseNoteString.bind(this));
        } else {
            this.seq[num].sequence(seq, subdivision, 'infinite');
        }
        this.seq[num].euclid(hits, beats,rotate);
        this.start(num);
    }

    set velocity(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].velocity = val
        }
    }

    set orn(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].orn = val
        }
    }

    set octave(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].octave = val
        }
    }

    set duration(val) {//turn into duration
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].duration = val
        }
    }

    set subdivision(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].subdivision = val
        }
    }

    set transform(val) {
        if (typeof val !== 'function') {
            console.warn(`Transform must be a function. Received: ${typeof val}`);
            return;
        }
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].transform = val
        }
    }
//roll already exists in seq
    set roll(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].roll = val
        }
    }

    set rotate(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].rotate = val
        }
    }

    set offset(val) {
        for(let i=0;i<10;i++){
            if(this.seq[i])this.seq[i].offset = val
        }
    }

    /**
     * Sets the transformation for the loop.
     * 
     * @param {string} transform - The transformation to apply.
     */
    setTransform(transform, num = 'all') {
        if (num === 'all') {
            for (let seq of this.seq) {
                if (seq) seq.setTransform(transform);
            }
        } else {
            if (this.seq[num]) this.seq[num].setTransform(transform);
        }
    }
    //possible implementation of rotate
    get duration() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setDuration(value);
                    }
                }
                return true; // Indicate success
            }
        });
    }

    get velocity() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setVelocity(value);
                    }
                }
                return true;
            }
        });
    }

    get octave() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setOctave(value);
                    }
                }
                return true;
            }
        });
    }

    get subdivision() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setSubdivision(value);
                    }
                }
                return true;
            }
        });
    }

    get roll() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setRoll(value);
                    }
                }
                return true;
            }
        });
    }

    get rotate() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setRotate(value);
                    }
                }
                return true;
            }
        });
    }

    get transform() {
        const self = this;
        return new Proxy([], {
            set(target, prop, value) {
                const index = parseInt(prop);
                if (!isNaN(index)) {
                    if (self.seq[index]) {
                        self.seq[index].setTransform(value);
                    }
                }
                return true;
            }
        });
    }

    start(num = 'all') {
        if (num === 'all') {
            for (let seq of this.seq) {
                if (seq) seq.start();
            }
            this.drawingLoop.start();
        } else {
            if (this.seq[num]) this.seq[num].start();
        }
    }

    stop(num = 'all') {
        if (num === 'all') {
            for (let seq of this.seq) {
                if (seq) seq.stop();
            }
            this.drawingLoop.stop();
        } else {
            if (this.seq[num]) this.seq[num].stop();
        }
    }

    turing(val){

    }

    // Visualizations

    draw(arr = this.drawing.array, target = this.drawing.target, ratio = this.drawing.ratio) {
        this.drawing = new ArrayVisualizer(arr, target, ratio);
    }

    getSeqParam(val, index) {
        //console.log(val, index,)
        if (Array.isArray(val)) return val[index % val.length];
        else return val;
    }

    parseNoteString(val, time, index, num=null) {
       //console.log(val,time,index, num, isNaN(Number(val[0])))
        if (val[0] === ".") return;
        if (!val || val.length === 0 ) return '.';

        const usesPitchNames = /^[a-gA-G]/.test(val[0][0]);
        //console.log(usesPitchNames, val[0])
        let note = '';
        if (usesPitchNames) note = pitchNameToMidi(val[0]);
        else note = intervalToMidi(val[0], this.min, this.max);

        if (note < 0) return;
        if (note >127) {
            console.log("MIDI note ", note, "ignored")
            return;
        }

        let octave = this.getSeqParam(this.seq[num].octave, index);
        let velocity = this.getSeqParam(this.seq[num].velocity, index);
        let duration = this.getSeqParam(this.seq[num].duration, index);
        let subdivision = this.getSeqParam(this.seq[num].subdivision, index);
        let lag = this.getSeqParam(this.seq[num].lag, index);
        //handle in the Seq class
        //let rotate = this.getSeqParam(this.seq[num].rotate, index);
        //let offset = this.getSeqParam(this.seq[num].offset, index);

        let groove = Groove.get(subdivision,index);
        
        const timeOffset = val[1] * (Tone.Time(subdivision)) + lag + groove.timing
        velocity = velocity * groove.velocity
        if( Math.abs(velocity)>256) velocity = 256
        //console.log('pa', note, octave, velocity, duration, time, timeOffset)
        try {
            //console.log('trig', this.triggerAttackRelease, note + octave * 12, velocity,duration,time+timeOffset)
            this.triggerAttackRelease(
                note + octave * Theory.scaleRatios.length,
                velocity,
                duration,
                time + timeOffset
            );
        } catch (e) {
            console.log('invalid note', note + octave * 12, velocity, duration, time + val[1] * Tone.Time(subdivision) + lag);
        }
    }
}


const paramDefinitions = (synth) => [
    // { 
    //     name: 'type', type: 'vco', value: 'white', 
    //     radioOptions: ['white','pink'], 
    //     callback: function(x) {
    //         switch (x) {
    //             case 'white': synth.source.type = 'white'; break;
    //             case 'pink': synth.source.type = 'pink'; break;
    //             case 'tri': synth.source.type = 'white'; break;
    //             case 'sine': synth.source.type = 'white'; break;
    //         }
    //     }
    // },
    { 
        name: 'rolloff', type: 'vco', value: '-24', 
        radioOptions: [-12,-24,-48], 
        callback: function(x) {
            synth.vcf.rolloff = x
            // switch (x) {
            //     case '-12': synth.vcf.rolloff = -12; break;
            //     case 'pink': synth.source.type = 'pink'; break;
            //     case 'tri': synth.source.type = 'white'; break;
            //     case 'sine': synth.source.type = 'white'; break;
            // }
        }
    },
    { 
        name: 'cutoff', type: 'vcf', 
        min: 20, max: 10000, curve: 2,value: 1000,
        isSignal: 'true', connectTo: synth=>synth.vcf.frequency 
    
    },
    { 
        name: 'Q', type: 'vcf', 
        min: 0, max: 30, curve: 2, value: 0,
        callback: function(x) { synth.vcf.Q.value = x; } 
    },
    // { 
    //     name: 'bandwidth', type: 'vcf', 
    //     min: 0, max: 1, curve: 2, value:1,
    //     callback: function(x) { synth.setBandwidth(x); } 
    // },
    /*
    { 
        name: 'keyTrack', type: 'hidden', 
        min: 0, max: 2, curve: 1, 
        callback: function(x) { synth.keyTracker.factor.value = x; } },
        */
    { 
        name: 'envDepth', type: 'vcf', 
        min: -1000, max: 5000, curve: 2, 
        callback: function(x) { 
            synth.vcf_env_depth.factor.value = x; 
        } },
    { 
        name: 'level', type: 'vca', 
        min: 0, max: 1, curve: 2, value: 0, 
        callback: function(x) { synth.direct.factor.rampTo(x, 0.01) } },
    { 
        name: 'attack', type: 'env', 
        min: 0, max: 1, curve: 2, value: 0.01, 
        callback: function(x) { synth.env.attack = x; } },
    { 
        name: 'decay', type: 'env', 
        min: 0, max: 1, curve: 2, value: 0.1, 
        callback: function(x) { synth.env.decay = x; } },
    { 
        name: 'sustain', type: 'env', 
        min: 0, max: 1, curve: 2, value: 0.5, 
        callback: function(x) { synth.env.sustain = x; } },
    { 
        name: 'release', type: 'env', 
        min: 0, max: 1, curve: 2, value: 0.5, 
        callback: function(x) { synth.env.release = x; } }
];

paramDefinitions;

/*
NoiseVoice

noise->gain->waveshaper->hpf->lpf->vca->output

basic noise oscillator with:
* integrated HPF and LPF
* VCA w/ env
* direct output level
* gui

*/

;

;
// ;
;

;
;


class NoiseVoice extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
		this.presets = {}
		this.synthPresetName = "NoiseVoicePresets"
		this.accessPreset()
    this.isGlide = false
    this.name = "NoiseVoice"

      this.source = new Tone.Noise().start() 
      this.gain = new Tone.Multiply(0.5)
      this.waveshaper = new Tone.WaveShaper((input) => {
        // thresholding
        // if (input < -0.5 || input > 0.5) {
        //     // Apply some shaping outside the range -0.5 to 0.5
        //     return (input);
        // } else return 0;
        //return input
        return Math.tanh(input*8)
      })  
      this.vcf =  new Tone.Filter({frequency: 200, type:'bandpass', Q: 4, rolloff: -48})
      this.vca= new Tone.Multiply(0)
      this.output= new Tone.Multiply(1)
      //control
      this.env = new Tone.Envelope({
        attack:0.01, decay:.1, sustain:0,release:.1
      })
      this.velocitySig = new Tone.Signal(1)
      this.velocity_depth = new Tone.Multiply(1)
      this.env_depth = new Tone.Multiply(1)
      this.direct = new Tone.Multiply()
      this.baseCutoff = new Tone.Signal(0)
      this.cutoffSignal = new Tone.Signal(1000)
      this.vcf_env_depth = new Tone.Multiply()
      //audio connections
      this.source.connect(this.vcf)
      this.gain.connect(this.waveshaper)
      this.waveshaper.connect(this.vca)
      this.vcf.connect(this.gain)
      this.waveshaper.connect(this.direct)
      this.vca.connect(this.output)
      this.env.connect(this.velocity_depth)
      this.velocity_depth.connect(this.vca.factor)
      this.velocitySig.connect(this.velocity_depth.factor)
      this.velocity_depth.connect(this.env_depth)
      this.env_depth.connect( this.vca.factor)
      this.direct.connect(this.output)
      //filter cutoffs
      this.baseCutoff.connect(this.vcf.frequency)
      this.cutoffSignal.connect( this.vcf.frequency)
      this.env.connect(this.vcf_env_depth)
      //this.vcf_env_depth.connect( this.vcf.frequency)

      // Bind parameters with this instance
      this.paramDefinitions = paramDefinitions(this)
      //console.log(this.paramDefinitions)
      this.param = this.generateParameters(this.paramDefinitions)
      this.createAccessors(this, this.param);

      //for autocomplete
      this.autocompleteList = this.paramDefinitions.map(def => def.name);;
      //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
      //setTimeout(()=>{this.loadPreset('default')}, 500);
    }

  triggerAttack (val, vel=100, time=null){
    if(time){
      this.env.triggerAttack(time)
      this.vcf.cutoff.setValueAtTime(Tone.Midi(val).toFrequency(), time)
    } else{
      this.env.triggerAttack()
      this.vcf.cutoff.value = Tone.Midi(val).toFrequency()
    }
  }
  triggerRelease (time=null){
    if(time) this.env.triggerRelease(time)
    else this.env.triggerRelease()
  }
  triggerAttackRelease (val, vel=100, dur=0.01, time=null){
   // console.log(val, vel, dur, time)
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.cutoffSignal.setValueAtTime(Tone.Midi(val).toFrequency(), time)
      //console.log(val, vel, dur, this.vcf.cutoff.value)
    } else{
      this.env.triggerAttackRelease(dur)
      this.vcf.cutoff.value = Tone.Midi(val).toFrequency()
    }
  }//attackRelease
}

/*
class NoiseVoice extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
    this.presets = {}
    this.synthPresetName = "NoiseVoicePresets"
    this.accessPreset()
    this.isGlide = false
    this.name = "NoiseVoice"

      this.source = new Tone.Noise().start() 
      this.gain = new Tone.Multiply(0.5)
      this.waveshaper = new Tone.WaveShaper((input) => {
        // thresholding
        // if (input < -0.5 || input > 0.5) {
        //     // Apply some shaping outside the range -0.5 to 0.5
        //     return (input);
        // } else return 0;
        return input
        //return Math.tanh(input*8)
      })  
      this.hpf =  new Tone.Filter({frequency: 200, type:'highpass', Q: 0})
      this.lpf = new Tone.Filter({frequency: 1000, type:'lowpass', Q: 0})
      this.vca= new Tone.Multiply(0)
      this.output= new Tone.Multiply(1)
      //control
      this.env = new Tone.Envelope({
        attack:0.01, decay:.1, sustain:0,release:.1
      })
      this.velocitySig = new Tone.Signal(1)
      this.velocity_depth = new Tone.Multiply(1)
      this.env_depth = new Tone.Multiply(1)
      this.direct = new Tone.Multiply()
      this.baseCutoff = new Tone.Signal(0)
      this.cutoffSignal = new Tone.Signal(1000)
      this.hpf_band = new Tone.Multiply()
      this.lpf_band = new Tone.Multiply()
      this.hpf_env_depth = new Tone.Multiply()
      this.lpf_env_depth = new Tone.Multiply()
      //audio connections
      this.source.connect(this.gain)
      this.gain.connect(this.waveshaper)
      this.waveshaper.connect(this.hpf)
      this.hpf.connect(this.lpf)
      this.lpf.connect(this.vca)
      this.lpf.connect(this.direct)
      this.vca.connect(this.output)
      this.env.connect(this.velocity_depth)
      this.velocity_depth.connect(this.vca.factor)
      this.velocitySig.connect(this.velocity_depth.factor)
      this.velocity_depth.connect(this.env_depth)
      this.env_depth.connect( this.vca.factor)
      this.direct.connect(this.output)
      //filter cutoffs
      this.baseCutoff.connect(this.hpf.frequency)
      this.baseCutoff.connect(this.lpf.frequency)
      this.cutoffSignal.connect( this.hpf.frequency)
      this.cutoffSignal.connect( this.lpf.frequency)
      this.cutoffSignal.connect( this.hpf_band)
      this.cutoffSignal.connect( this.lpf_band)
      this.hpf_band.connect(this.hpf.frequency)
      this.lpf_band.connect(this.lpf.frequency)
      this.env.connect(this.hpf_env_depth)
      this.env.connect(this.lpf_env_depth)
      this.hpf_env_depth.connect( this.hpf.frequency)
      this.lpf_env_depth.connect( this.lpf.frequency)

      // Bind parameters with this instance
      this.paramDefinitions = paramDefinitions(this)
      //console.log(this.paramDefinitions)
      this.param = this.generateParameters(this.paramDefinitions)
      this.createAccessors(this, this.param);

      //for autocomplete
      this.autocompleteList = this.paramDefinitions.map(def => def.name);;
      //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
      //setTimeout(()=>{this.loadPreset('default')}, 500);
    }
  setCutoff (val,time=null){
    if(time)this.cutoffSignal.setValueAtTime(val, time)
    else this.cutoffSignal.value = val  
  }
  setResonance (val, which = 'both', time=null){
    if(time){
      if(which === 'both' || which === 'lpf') this.lpf.Q.setValueAtTime(val, time)
      if(which === 'both' || which === 'hpf') this.hpf.Q.setValueAtTime(val, time)
    }
    else {
      if(which === 'both' || which === 'lpf') this.lpf.Q.value = val  
      if(which === 'both' || which === 'hpf') this.hpf.Q.value = val  
    }
  }
  setBandwidth(val, which = 'both', time = null) {
    if (val < 0 || !isFinite(val)) return; // disallow negative or invalid

    const hpfVal = 1 - Math.pow(0.5, val); // grows from 0 → 1 as val increases
    const lpfVal = Math.pow(0.5, val);     // shrinks from 1 → 0 as val increases

    if (time != null) {
      if (which === 'both' || which === 'hpf') this.hpf_band.factor.setValueAtTime(hpfVal, time);
      if (which === 'both' || which === 'lpf') this.lpf_band.factor.setValueAtTime(lpfVal, time);
    } else {
      if (which === 'both' || which === 'hpf') this.hpf_band.factor.value = hpfVal;
      if (which === 'both' || which === 'lpf') this.lpf_band.factor.value = lpfVal;
    }
  }
  triggerAttack (val, vel=100, time=null){
    if(time){
      this.env.triggerAttack(time)
      this.setCutoff(Tone.Midi(val).toFrequency(), time)
    } else{
      this.env.triggerAttack()
      this.setCutoff(Tone.Midi(val).toFrequency())
      console.log('att', val)
    }
  }
  triggerRelease (time=null){
    if(time) this.env.triggerRelease(time)
    else this.env.triggerRelease()
  }
  triggerAttackRelease (val, vel=100, dur=0.01, time=null){
    // console.log(val, vel, dur)
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.setCutoff(Tone.Midi(val).toFrequency(), time)
    } else{
      this.env.triggerAttackRelease(dur)
      this.setCutoff(Tone.Midi(val).toFrequency())
    }
  }//attackRelease
}
*/

const paramDefinitions = (synth) => [
    { 
        name: 'angle', type: 'vco', value: 0, 
        min:0, max:359, curve:1,
        isSignal: 'false', connectTo: null,
        callback: function(x, time = null) {synth.setAngle(x,1,time);}
    },
    { 
        name: 'gain', type: 'vca', 
        min: 0, max: 1, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.input.factor, 
        callback: function(x, time = null) {
            if (time) {
                synth.input.setValueAtTime(x, time);
            } else {
                synth.input.rampTo( x, .1 );
            }
        }
    },
];

paramDefinitions;

;
//;
;

;
;

class QuadPanner extends MonophonicTemplate{
    constructor() {
        super()
        this.context = window.audioContext;
        this.name = 'panner'

        // Create the ChannelMergerNode with the specified number of channels
        this.channelMerger = this.context.createChannelMerger(4);

        // Configure the audio context destination for multi-channel output
        let maxChannelCount = window.audioContext.destination.maxChannelCount;
        window.audioContext.destination.channelCount = maxChannelCount;
        window.audioContext.destination.channelCountMode = "explicit";
        window.audioContext.destination.channelInterpretation = "discrete";
        
        // Create and connect a channel merger
        //this.channelMerger.channelCount = 1;
        this.channelMerger.channelCountMode = "explicit";
        this.channelMerger.channelInterpretation = "discrete";
        this.channelMerger.connect(window.audioContext.destination);
   
        this.input = new Tone.Multiply(1)

        this.channel = []
        for(let i=0;i<4;i++){
            this.channel.push(new Tone.Multiply(.5))
            this.input.connect(this.channel[i])
            this.channel[i].connect(this.channelMerger, 0,i);
        }
        // Make the channelMerger available for external connections
        this._x = 0
        this._y = 0
        this.output = this.channelMerger;

        // Bind parameters with this instance
        this.paramDefinitions = paramDefinitions(this)
        this.param = this.generateParameters(this.paramDefinitions)
        this.createAccessors(this, this.param);

        //for autocomplete
        this.autocompleteList = this.paramDefinitions.map(def => def.name);;
        
    }

    // Set x-axis (left-right) panning using the LR panner
    x(value=.5) {
        this._x = value
        this.pan(this._x,this._y)
    }

    // Set y-axis (front-back) panning using the FB panner
    y(value=.5) {
        this._y = value
        this.pan(this._x,this._y)
    }

    pan(x = 0.5, y = 0.5, time=null) {
        x = Math.max(-1, Math.min(1, x));
        y = Math.max(-1, Math.min(1, y));
        let curve = 0.7;
        let base_amp = -70;

        // Calculate gain values
        const gainFL = Math.pow((1 - x) * (1 - y), curve); // Front-Left
        const gainFR = Math.pow((1 + x) * (1 - y), curve); // Front-Right
        const gainBL = Math.pow((1 - x) * (1 + y), curve); // Back-Left
        const gainBR = Math.pow((1 + x) * (1 + y), curve); // Back-Right

        // Smooth transition over 10 ms
        const rampTime = 0.01; // 10 ms in seconds
        if(time==null){
            this.channel[0].factor.rampTo(gainFL, rampTime);
            this.channel[1].factor.rampTo(gainFR, rampTime);
            this.channel[2].factor.rampTo(gainBR, rampTime);
            this.channel[3].factor.rampTo(gainBL, rampTime);
        } else{
            this.channel[0].factor.setValueAtTime(gainFL, time);
            this.channel[1].factor.setValueAtTime(gainFR, time);
            this.channel[2].factor.setValueAtTime(gainBR, time);
            this.channel[3].factor.setValueAtTime(gainBL, time);
        }

        // Optionally log values for debugging
        // console.log(x, y, gainFL, gainFR, gainBL, gainBR);
    }

    setAngle(angle, depth = 1, time = null) {
        // Convert angle from degrees to radians
        const radians = (angle * Math.PI) / 180;

        // Calculate x and y positions based on the angle and depth
        const x = Math.cos(radians) * depth;
        const y = Math.sin(radians) * depth;

        // Set x and y positions
        this._x = x;
        this._y = y;

        // Call the pan function with the calculated positions
        this.pan(this._x, this._y, time);
    }

    // Dispose of all nodes
    dispose() {
        this.lrPanner.dispose();
        this.fbPanner.dispose();
        this.splitter.disconnect();
        this.channelMerger.disconnect();
        console.log("SimpleQuadPanner disposed.");
    }

}

/*
Percussion Voice

*/

;
;

class Percussion{
    constructor(type) {
        console.log(type)
    }

    trigger = function(time){
        if(time){
            this.env.triggerAttackRelease(0.01, time)
            this.pitch_env.triggerAttackRelease(0.01,time)
        }else {
            this.env.triggerAttackRelease(0.01)
            this.pitch_env.triggerAttackRelease(0.01)
        }
    }

    connect(destination) {
        if (destination.input) {
            this.output.connect(destination.input);
        } else {
            this.output.connect(destination);
        }
    }

    disconnect(destination) {
        if (destination.input) {
            this.output.disconnect(destination.input);
        } else {
            this.output.disconnect(destination);
        }
    }
}


window.allKnobsLayout = {
    "input": {
      "color": [255, 255, 255],
      "boundingBox": { "x": 5, "y": 35, "width": 20, "height": 100 },
      "offsets": { "x": 10, "y": 20 },
      "groupA": ["name"],
      "controlTypeA": "text",
      "controlTypeB": "knob",
      "sizeA": 1.5,
      "sizeB": 0.5
    },
    "param": {
      "color": [200, 100, 150],
      "boundingBox": { "x": 25, "y": 35, "width": 60, "height": 100 },
      "offsets": { "x": 10, "y": 20 },
      "groupA": ["type"],
      "controlTypeA": "radioButton",
      "controlTypeB": "knob",
      "sizeA": 0.5,
      "sizeB": 0.5
    },
    "output": {
      "color": [100, 255, 255],
      "boundingBox": { "x": 80, "y": 35, "width": 20, "height": 100 },
      "offsets": { "x": 10, "y": 30 },
      "groupA": ["level"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.5,
      "sizeB": 0.5
    }
}    ;;

const paramDefinitions = (synth) => [
    {
        name: 'volume',
        type: 'output',
        value: 0.5,
        min: 0,
        max: 1,
        curve: 0.75,
        callback: function(x) {
          synth.output.factor.value = x*3;
        }
      },
      {
        name: 'playbackrate', type: 'input',
        value: 1, 
        min: -2,
        max: 2,
        curve: 1,
        callback: function(x, time = null) {
            if(x<0) synth.player.reverse = true
            else synth.player.reverse = false
          if(time){
            synth._playbackRate = Math.abs(x);
            synth.player.playbackRate = Math.abs(x);
          }
          else{
              synth._playbackRate = Math.abs(x);
              synth.player.playbackRate = Math.abs(x);
          }
        }
      },
      {
        name: 'startTime', type: 'hidden',
        value: 0,
        min: 0,
        max: 1000,
        curve: 1,
        callback: function(x) {
          synth._start = x;
        }
      },
       {
        name: 'endTime', type: 'hidden',
        value: 10,
        min: 0,
        max: 2000,
        curve: 1,
        callback: function(x) {
          synth._end = x;
        }
      },
    {
        name: 'cutoff',
        type: 'param',
        value: 20000,
        min: 20,
        max: 10000,
        curve: 2,
        callback: function(value, time=null) {
            //if(time) synth.cutoffSig.linearRampToValueAtTime(value,time+0.002)
            if(time) synth.cutoffSig.setValueAtTime(value)
          else synth.cutoffSig.rampTo(value, .1)
        }
      },
      {
        name: 'fadein', type: 'param',
        value: 0.001,
        min: 0,
        max: 1,
        curve: 3,
        callback: function(x) {
          synth.player.fadeIn = x;
        }
      },
    {
        name: 'fadeout', type: 'param',
        value: 0.001,
        min: 0,
        max: 1,
        curve: 3,
        callback: function(x) {
          synth.player.fadeOut = x;
        }
      },
    {
        name: 'highpass', type: 'param',
        value: 10,
        min: 10,
        max: 10000,
        curve: 2,
        callback: function(value) {
          synth.hpf.frequency.rampTo(  value, 0.01);
        }
      },
    {
        name: 'Q', type: 'hidden',
        value: 0,
        min: 0.0,
        max: 20,
        curve: 2,
        callback: function(value) {
          synth.vcf.Q.value = value;
        }
      },
     {
        name: 'filterType', type: 'hidden',
        value: 'lowpass',
        callback: function(value) {
          synth.vcf.type = value;
        }
      },
    {
        name: 'filterEnvDepth', type: 'hidden',
        value: 0,
        min: 0.0,
        max: 5000,
        curve: 2,
        callback: function(value) {
          synth.vcfEnvDepth.factor.value = value;
        }
      },
    {
        name: 'loopstart',type: 'hidden',
        value: 0,
        min: 0,
        max: 1,
        curve: 1,
        callback: function(x) {
          synth.player.loopStart = x;
        }
      },
    {
        name: 'loopend',type: 'hidden',
        value: 2,
        min: 0,
        max: 2,
        curve: 1,
        callback: function(x) {
          synth.player.loopEnd = x;
        }
      },
    {
        name: 'loop',type: 'hidden',
        value: false,
        callback: function(x) {
          synth.player.loop = x > 0;
        }
      },
    {
        name: 'divisions', type: 'input',
        value: 16,
        min: 0,
        max: 64,
        curve: 1,
        callback: function(x) {
          synth._baseUnit = Math.floor(x);
        }
      },
    {
        name: 'sequenceTime', type: 'hidden',
        value: true,
        min: 0,
        max: 1,
        curve: 1,
        callback: function(x) {
          synth.seqControlsPitch = !x;
        }
      },
     {
        name: 'baseNote', type: 'hidden',
        min: 0,
        max: 127,
        curve: 1,
        callback: function(x) {
          synth._baseNote = x;
        }
      },
       {
        name: 'Reverse', type: 'hidden',
        value: false,
        min: 0,
        max: 1,
        curve: 1,
        callback: function(x) {
          synth.player.reverse = x > 0 ? true : false;
        }
      }

];

paramDefinitions;

/*
 * Simple Sampler
 *
 * 
*/
;
//;
;



// ;

;
;


class CustomPlayer extends Tone.Player {
    constructor(options) {
    super(options);
    this._activeSource = null; // store one source at a time
  }
    set playbackRate(rate) {
        this._playbackRate = rate;
        let now = this.now();
        //if(time) now = time
        this._activeSources.forEach((source) => {
            source.playbackRate.setValueAtTime(rate, now);
        });
    }
}


class Player extends MonophonicTemplate {
    constructor (file) {
        super()
         this.layout = layout
		this.presets = {}
		this.synthPresetName = "PlayerPresets"
		// this.accessPreset()
        this.name = "Player"
        this.guiHeight = .25
        
        //audio objects
        this.player = new CustomPlayer()
        this.hpf = new Tone.Filter({type:'highpass', Q:0, frequency:10, rolloff:-12})
        this.vcf = new Tone.Filter({type:'lowpass', Q:0,rolloff:-12})
        this.vca = new Tone.Multiply(1)
        this.output = new Tone.Multiply(1)
        this.cutoffSig = new Tone.Signal(10000)

        //vcf setup
        this.cutoffSig.connect(this.vcf.frequency)
        this.vcf.frequency.value = 10000
        this.vcf.rolloff = -12
        this.vcf.Q.value = 1

        //Set up filter envelope
        this.filterEnv = new Tone.Envelope()
        this.vcfEnvDepth = new Tone.Multiply()
        this.filterEnv.connect(this.vcfEnvDepth)
        this.vcfEnvDepth.connect(this.vcf.frequency)

        //connect vcf to vca
        this.player.connect(this.hpf)
        this.hpf.connect(this.vcf)
        this.vcf.connect(this.vca)
        this.vca.connect(this.output)

        this.sample = ''
        this.sampleDuration = 0
        this._baseUnit = 16
        this.seqControlsPitch = false
        this._start = 0
        this._end = 100
        this._playbackRate = 1
        this._baseNote = 60
        this._stopID = 0

        this.sampleFiles = {
          bell: ['C4', 'berklee/bell_1.mp3'],
          bell1:   ['C4', 'berklee/bell_1a.mp3'],
          bell2:   ['C4', 'berklee/bell_2a.mp3'],
          bell3:   ['C4', 'berklee/bell_mallet_2.mp3'],
          horn:['C4', 'berklee/casiohorn2.mp3'],
          chotone:  ['C4', 'berklee/chotone_c4_!.mp3'],
          voice: ['C4', 'berklee/femalevoice_aa_Db4.mp3'],
          kalimba: ['C4', 'berklee/Kalimba_1.mp3'],
          dreamyPiano: ['A5', 'salamander/A5.mp3'],
          softPiano: ['A4', 'salamander/A4.mp3'],
          piano: [45, 'salamander/A3.mp3'],
          casio:['C4', 'casio/C2.mp3']
        }

        if(file) this.loadSample(file)

            // Bind parameters with this instance
        this.paramDefinitions = paramDefinitions(this)

        this.param = this.generateParameters(this.paramDefinitions)
        this.createAccessors(this, this.param);

        //for autocomplete
        this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    
    }

    /**
   * Load a specific sample.
   * @param {string} file - The name of the sample to load.
   */
    load(file = null){this.loadSample(file)}
    loadSample(file = null){
        if(file === null) {
            this.loadAudioBuffer()
            return
        }

        // If the file is a number, treat it as an index into the sampleFiles object
        if (typeof file === 'number') {
            // Convert the keys of the sampleFiles object to an array
            const fileKeys = Object.keys(this.sampleFiles);
            file = Math.floor(file)%fileKeys.length
            file = fileKeys[file];
        }

        this.baseUrl = "https://tonejs.github.io/audio/"
        let url = []
        let note = []
        if (file in this.sampleFiles) {
          console.log(`Player loading ${file}`);
          this.sample = file
           url = this.sampleFiles[this.sample][1]
           note = this.sampleFiles[this.sample][0]
        } else {
            url = file
            note = 0
            this.baseUrl = "./audio/"; // Relative to your script's location
        }
        
        //console.log(note, this.baseUrl.concat(url))
        this.player.load(this.baseUrl.concat(url))
        .then(() => {
            const duration = this.player.buffer.length / Tone.context.sampleRate;
            console.log(`Sample duration: ${duration.toFixed(2)} seconds`);
        })
        .catch((err) => {
            console.error("Failed to load sample:", err);
        });

    }

    listSamples(){
        const fileKeys = Object.keys(this.sampleFiles);
        console.log(fileKeys)
    }

    //envelopes
    trigger(freq=0, amp=127, dur=0.1, time=null){
        this.triggerAttackRelease (freq, amp, dur, time)
    }

    triggerAttack (freq, amp=100, time=null){ 
        const dur = 100
        amp = amp/127
        if(time){
            if(!this.seqControlsPitch) {
                if(this._playbackRate!= this.player.playbackRate) this.player.playbackRate = this._playbackRate
                this.player.start(time,freq, dur)
            }
            else {
                this.player.playbackRate = this.midiToRate(freq)
                this.player.start(time, this._start, dur)
            }
            this.filterEnv.triggerAttack(time+.0)
            this.vca.factor.setValueAtTime(amp, time+.0)
        } else{
            if(!this.seqControlsPitch) {
                if(this._playbackRate!= this.player.playbackRate) this.player.playbackRate = this._playbackRate
                this.player.start(Tone.now(),freq, dur)
            }
            else {
                //console.log('pitch',freq,amp,dur,time)
                this.player.playbackRate = this.midiToRate(freq)
                this.player.start(Tone.now(), this._start, dur)
            }
            this.filterEnv.triggerAttack()
            this.vca.factor.setValueAtTime(amp)
        }
    }
    
    triggerRelease (freq, time=null){
        if(time){
            this.player.stop(time)
            this.filterEnv.triggerRelease(time+.0)
        } else{
            this.player.stop()
            this.filterEnv.triggerRelease()
        }
    }

    triggerAttackRelease (freq, amp, dur=0.01, time=null){ 
        //console.log(freq,amp,dur,time)
        //amp = amp/127
        //console.log(time, freq, dur)
        if(time){
            if(!this.seqControlsPitch) {
                //console.log('noy', freq,dur)
                if(this._playbackRate!= this.player.playbackRate) this.player.playbackRate = this._playbackRate
                //this.player.start(time,freq,dur)
                //console.log(freq, dur)
                this.player.start(time, freq, dur)
                //this.player.stop(time+dur)
            }
            else {
                //console.log('pitch',dur.toFixed(2), this._start,time)
                this.player.playbackRate = this.midiToRate(freq)
                this.player.start(time, this._start, dur)
                //this.player.stop(time+dur)
            }
            this.filterEnv.triggerAttackRelease(dur,time)
            this.vca.factor.setValueAtTime(amp, time)
         } 
        else{
            time = Tone.now()
            if(!this.seqControlsPitch) {
                //console.log('noy', freq,dur)
                if(this._playbackRate!= this.player.playbackRate) this.player.playbackRate = this._playbackRate
                this.player.start(time, this._start, this._end)
            }
            else {
                //console.log('pitch',dur.toFixed(2), this._start,time)
                this.player.playbackRate = this.midiToRate(freq)
                this.player.start(time, this._start)
                this.player.stop(time+dur)
            }
            this.filterEnv.triggerAttackRelease(dur,time)
            this.vca.factor.setValueAtTime(amp, time)
        }
    }//attackRelease

    midiToRate(note){
        //console.log(Math.pow(2, (note - this._baseNote) / 12));
        return Math.pow(2, (note - this._baseNote) / 12);
    }

    connect(destination) {
        if (destination.input) {
            this.output.connect(destination.input);
        } else {
            this.output.connect(destination);
        }
    }
    // Function to open a file dialog and load the selected audio file
    loadAudioBuffer() {
        // Create a file input element programmatically
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*'; // Accept only audio files

        // Handle file selection
        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) {
                console.log("No file selected");
                return;
            }

            // Use FileReader to read the file as a Data URL
            const fileReader = new FileReader();
            fileReader.onload = () => {
                // Create a Tone.Player and load the Data URL
                this.player = new CustomPlayer(fileReader.result).connect(this.hpf);
                this.player.autostart = false; // Automatically start playback
                console.log("Audio loaded into player");
                this.getSampleDuration()
            };
            fileReader.readAsDataURL(file);
        };

        // Trigger the file dialog
        fileInput.click();
    }
    getSampleDuration(){
        setTimeout(()=>{
            const duration = this.player._buffer.length / Tone.context.sampleRate;
            if(duration>0){
                console.log(`Sample duration: ${duration.toFixed(2)} seconds`)
                this.sampleDuration = duration
            } else{
                this.getSampleDuration()
            }
        },100);
    }

    scaleTempo(numBeats = 4) {
        const barLength = (numBeats / 4) * Tone.Time('1n').toSeconds();
        this.playbackRate = this.sampleDuration / barLength;
        console.log(barLength, this.sampleDuration, this._playbackRate)
    }

    /**
     * Sequences the provided array of notes and initializes a Tone.Loop with the given subdivision.
     *
     * @param {string} arr - The sequence of notes as a string.
     * @param {string} [subdivision] - The rhythmic subdivision for the loop (e.g., '16n', '8n').
     * @param {string} num (default 0) - the sequence number. Up to 10 sequences per instance.
     */
    sequence(arr, subdivision = '8n', num = 0, phraseLength = 'infinite') {
        if (!this.seq[num]) {
            this.seq[num] = new Seq(this, arr, subdivision, phraseLength, num, this.parseNoteString.bind(this));
        } else {
            this.seq[num].sequence(arr, subdivision, phraseLength);
        }
        this.start(num);
    }

    /*
    For Player the sequencer controls the sample start time by default.
    - sample start times are normalized where 0-1 is the length of the sample
    this.seqControlsPitch allows controlling sample pitch instead
    */
    parseNoteString(val, time, index, num){
        if(this.sampleDuration==0){
                console.log(`Sample duration: 0 seconds`)
                this.getSampleDuration()
                return;
            } 
        //console.log('parse', val,val[0]*this.sampleDuration,time,num)
        
        //uses val for time location rather than pitch
        if(val[0] === ".") {
            if(this.player.state === 'started') this.player.stop(time)
            return
        }

        const usesPitchNames = /^[a-ac-zA-Z]$/.test(val[0][0]);

        let note = ''
        if(!this.seqControlsPitch){
            if( usesPitchNames ) {
                console.log('player seq values are time positions in the sample')//note =  pitchNameToMidi(val[0])
                return
            } 
            //note = val[0]*this._baseUnit + this._start//intervalToMidi(val[0], this.min, this.max)
            note = val[0]
            if(note%1 == 0) note = note / Math.floor(this._baseUnit)
            else note = note%1
            note = note*this.sampleDuration
        } else{
            if( usesPitchNames ) note =  pitchNameToMidi(val[0])
            else note = intervalToMidi(val[0], this.min, this.max)
        }
        if(note < 0) return

        let octave = this.getSeqParam(this.seq[num].octave, index);
        let velocity = this.getSeqParam(this.seq[num].velocity, index);
        let duration = this.getSeqParam(this.seq[num].duration, index);
        let subdivision = this.getSeqParam(this.seq[num].subdivision, index);
        let lag = this.getSeqParam(this.seq[num].lag, index);
        note = note+octave
        duration = duration * Tone.Time(subdivision)
        //console.log(note, velocity, duration, time)

        let groove = Groove.get(subdivision,index)
        //console.log(groove)
        const timeOffset = val[1] * (Tone.Time(subdivision)) + lag + groove.timing
        velocity = velocity * groove.velocity
        if( Math.abs(velocity)>2) velocity = 2
        try {
            //console.log('trig', time, val[1], Tone.Time(this.subdivision))
            this.triggerAttackRelease(
                note,
                velocity,
                duration,
                time + timeOffset
            );
        } catch(e){
            console.log('invalid note', note , velocity, duration)
        }
    }
}


/********************
 * polyphony
 ********************/

;
;
;



class Polyphony extends MonophonicTemplate{
	constructor(voice,num=8){
		super()
    this.name = voice.name
		this.numVoices = num
		this.slop = .05
		this.backgroundColor = [0,0,0]

		//audio
		this.voice = []
		for(let i=0;i<this.numVoices;i++) this.voice.push(new voice)
		this.output = new Tone.Multiply(1/(this.numVoices/4))
		this.hpf = new Tone.Filter({type:'highpass', rolloff:-12, Q:0, cutoff:50})
		for(let i=0;i<this.numVoices;i++) this.voice[i].output.connect( this.hpf)
		this.hpf.connect(this.output)

	    //voice tracking
		this.prevNote = 0
		this.v = 0
		this.voiceCounter = 0
		this.activeNotes = []
		this.noteOrder = []
		this.noteOrderIndex = 0
		this.voiceOrder = []
		for (let i = 0; i < this.numVoices; i++) {
			this.activeNotes.push(-1)
			this.noteOrder.push(i)
		}

		this.initParamsFromVoices() 
	}

	initParamsFromVoices() {
	    const voiceParams = this.voice[0].param; // Take params from first voice as template

	    Object.keys(voiceParams).forEach((paramName) => {
	        const isSignal = voiceParams[paramName].isSignal;

	        const paramProxy = new Proxy(
			    () => {}, // Function base for callable
			    {
			        get: (_, prop) => {
			            if (prop === 'sequence') {
			                return (valueArray, subdivision = '16n') => {
			                    this.voice.forEach(v => v.startSequence(paramName, valueArray, subdivision));
			                };
			            }
			            if (prop === 'stop') {
			                return () => {
			                    this.voice.forEach(v => v.stopSequence(paramName));
			                };
			            }
			            if (prop === 'set') {
			                return (value, time = null, source = null) => {
			                    this.voice.forEach(v => v.param[paramName].set(value, time, source));
			                };
			            }
			            if (prop === 'value') {
			                return this.voice[0].param[paramName].get(); // Read value
			            }
			        },
			        set: (_, __, value) => {
			            this.voice.forEach(v => v.stopSequence(paramName)); // Stop seq when manually set
			            this.voice.forEach(v => v.param[paramName].set(value, null, false));
			            return true;
			        }
			    }
			);

	        // Assign s.cutoff = paramProxy (callable for set, methods like sequence/stop)
	        Object.defineProperty(this, paramName, {
	            get: () => paramProxy,
	            set: (value, source = null) => {
	            	this.voice.forEach(v=>{
	                	v.stopSequence(paramName) // Stop seq when manually set
	            		if (Array.isArray(value)) {
                        	v.startSequence(paramName, value);
	                    } else {
	                        v.param[paramName].set(value, null, false)
	                    }
	            	})},
	            configurable: true,
	            enumerable: true
	        });

	        // Assign explicit param object for value access and control
	        this[paramName+'_param'] = {
	            name: paramName,
	            isSignal,
	            get: () => this.voice[0].param[paramName].get(),
	            set: (value, time = null, source = null) => this.voice.forEach(v => v.param[paramName].set(value, time, source)),
	            sequence: (valueArray, subdivision = '8n') => {
	            	this.voice.forEach(v => {
	            		v.startSequence(paramName,valueArray,subdivision)
	            		//v.params[paramName].sequence(valueArray, subdivision)
	            })},
	            stop: () => this.voice.forEach(v => v.stopSequence(paramName))
	        };

	        // Optional: Quick value access via s.cutoff_value
	        Object.defineProperty(this, paramName + '_value', {
	            get: () => this.voice[0].param[paramName].get(),
	            set: (value) => this.voice.forEach(v => v.param[paramName].set(value, null, false)),
	            configurable: true,
	            enumerable: true
	        });
	    });
	}

	/**************** 
	 * trigger methods
	***************/
	triggerAttack = function(val, vel=100, time=null){
		//console.log('ta ', val)
		this.v = this.getNewVoice(val)
		//val = val + Math.random()*this.slop - this.slop/2
		if(time) this.voice[this.v].triggerAttack(val,vel,time) //midinote,velocity,time
		else this.voice[this.v].triggerAttack(val,vel) 
		//console.log("att ", val)
	}

	triggerRelease = function(val, time=null){
		this.v = this.getActiveNote(val)
		if (this.v >= 0 && this.v != undefined){
			//console.log('tr ', val, time, this.activeNotes[val], this.v, this.voice[this.v])
			if(time) this.voice[this.v].triggerRelease(time) //midinote,velocity,time
			else this.voice[this.v].triggerRelease() 
			this.freeActiveNote(val)
		//console.log("rel ", val)
		} else{
			console.log('tr null', val, time, this.activeNotes[val], this.v, this.voice[this.v])
		}
	}

	triggerAttackRelease = function(val, vel=100, dur=0.01, time=null){
		// console.log('poly trigAR', val)
		this.v = this.getNewVoice(val)
		//val = val + Math.random()*this.slop - this.slop/2
		//console.log(this.voice[this.v], val, vel, dur, time)
		if(time){
			this.voice[this.v].triggerAttackRelease(val, vel, dur, time)
		} else{
			this.voice[this.v].triggerAttackRelease(val, vel, dur)
		}
		//console.log("AR ", val,dur)
	}

	releaseAll(time = null){
		// console.log("releaseAll")
		for( let i=0; i< this.numVoices; i++){
			this.voice[i].triggerRelease(0,time)
		}
    }

    /** VOICE MANAGEMENT **/

    // Get a free voice or steal an old voice
	getNewVoice(noteNum) {
		// Increment and wrap voice counter for round-robin assignment
		this.voiceCounter = (this.voiceCounter + 1) % this.numVoices;

		// Free any voice currently playing the requested note
		const curIndex = this.getActiveNote(noteNum);
		if (curIndex >= 0 ) {
			this.freeActiveNote(curIndex);
		}

		// Try to find a free voice
		let weakestEnvValue = Infinity;
		let leastRecent = this.getLeastRecentNotes()
		let weakestVoice = leastRecent[0];

		for (let i = 0; i < this.numVoices/2; i++) {
			const curElement = this.noteOrder[i];
			//console.log('voice1', i, this.voice[curElement])
			const curEnv = this.voice[curElement].env.value;
			//console.log('voice2', i, this.voice[curElement])
			

			if (curEnv < weakestEnvValue && leastRecent.includes(curElement)) {
			  weakestEnvValue = curEnv;
			  weakestVoice = curElement;
			}
			
			// Check if the envelope indicates a free voice
			if (curEnv <= 0.01) { // Allow small floating-point tolerances
			  this.setActiveNote(curElement, noteNum);
			  return curElement;
			}
		}
		// No free voices: Implement voice stealing
		// Steal the weakest voice
		this.voice[weakestVoice].env.cancel();
		this.setActiveNote(weakestVoice, noteNum);
		return weakestVoice;
	}

  // Get the index of a specific active note, or -1 if the note is not active
    getActiveNote(midiNote) {
    	if(this.activeNotes.includes(midiNote)) return this.activeNotes.indexOf(midiNote);
    	else return -1
    }

    // Set a new active note (add it to the array)
    setActiveNote(index, midiNote) {
		//console.log('set active', index, midiNote, this.noteOrder);

		// Add the note only if it isn't already active
		if (!this.activeNotes.includes(midiNote))  this.activeNotes[index] = midiNote;

		// Update the noteOrder array
		// Remove the index if it already exists in the array
		const existingIndex = this.noteOrder.indexOf(index);
		if (existingIndex !== -1) this.noteOrder.splice(existingIndex, 1);

		this.noteOrder.push(index); // Add the index to the
		}
    getLeastRecentNotes() {
    	return this.noteOrder.slice(0,this.numVoices/2)
	}

    // Free a specific active note (remove it from the array)
    freeActiveNote(index) {
        if (this.voice[index] !== undefined && index >= 0) {
        	this.voice[index].triggerRelease()
            this.activeNotes[index] = -1;  // Remove the note if found
        }
    }


	/**
     * Set the ADSR values for the envelope
     * @param {number} a - Attack time
     * @param {number} d - Decay time
     * @param {number} s - Sustain level
     * @param {number} r - Release time
     * @returns {void}
     * @example synth.setADSR(0.01, 0.1, 0.5, 0.1)
     */
    setADSR(a, d, s, r) {
    	for(let i=0;i<this.numVoices;i++){
    		if (this.voice[i].env) {
	            this.voice[i].env.attack = a>0.001 ? a : 0.001
	            this.voice[i].env.decay = d>0.01 ? d : 0.01
	            this.voice[i].env.sustain = Math.abs(s)<1 ? s : 1
	            this.voice[i].env.release = r>0.01 ? r : 0.01
        	}
    	}
    }

    /**
     * Set the ADSR values for the filter envelope
     * @param {number} a - Attack time
     * @param {number} d - Decay time
     * @param {number} s - Sustain level
     * @param {number} r - Release time
     * @returns {void}
     * @example synth.setFilterADSR(0.01, 0.1, 0.5, 0.1)
     */ 
    setFilterADSR(a, d, s, r) {
    	for(let i=0;i<this.numVoices;i++){
	        if (this.voice[i].vcf_env) {
	            this.voice[i].vcf_env.attack = a>0.001 ? a : 0.001
	            this.voice[i].vcf_env.decay = d>0.01 ? d : 0.01
	            this.voice[i].vcf_env.sustain = Math.abs(s)<1 ? s : 1
	            this.voice[i].vcf_env.release = r>0.01 ? r : 0.01
	        }
	    }
    }

    updateAllVoices = (paramName, value) => {
	  for (let v = 0; v < this.numVoices; v++) {
	    this.voice[v].param[paramName].set(value,null,false);
	  }
	};

	initGui(gui = null) {
		this.guiHeight = this.voice[0].guiHeight
	    this.guiContainer = document.getElementById('Canvas');
	    const sketchWithSize = (p) => sketch(p, { height: this.guiHeight });
	    this.gui = new p5(sketchWithSize, this.guiContainer);

	    const layout = this.voice[0].layout; // Grab layout from first voice
	    const params = this.voice[0].param; // First voice's params as template
	    //console.log(layout);
	    // Group parameters by type
	    const groupedParams = {};
	    Object.values(params).forEach((param) => {
	        if (!groupedParams[param.type]) groupedParams[param.type] = [];
	        groupedParams[param.type].push(param);
	    });

	    // Create GUI for each group
	    Object.keys(groupedParams).forEach((groupType) => {
	        const groupLayout = layout[groupType];
	        if (!groupLayout || groupType === 'hidden') return;

	        let indexOffset = 0;


	        groupedParams[groupType].forEach((param, index) => {
	            const paramName = param.name; // Name of the param (e.g., "cutoff")
	            const isGroupA = groupLayout.groupA.includes(paramName);
	            const controlType = isGroupA ? groupLayout.controlTypeA : groupLayout.controlTypeB;
	            const size = isGroupA ? groupLayout.sizeA : groupLayout.sizeB;
	            //console.log(paramName)
	            // Get actual param value for initialization, NOT the proxy
				const paramValue = param.get ? param.get() : param._value; // or this.voice[0].param[paramName].get()
				const values = Array.isArray(paramValue) ? paramValue : [paramValue];

				const flatIndex = indexOffset;
	            values.forEach((value, i) => {
	            	//console.log(value,i)
	                let xOffset = groupLayout.offsets.x * (flatIndex % Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));
					  let yOffset = groupLayout.offsets.y * Math.floor(flatIndex / Math.floor(groupLayout.boundingBox.width / groupLayout.offsets.x));

					  const x = groupLayout.boundingBox.x + xOffset;
					  const y = groupLayout.boundingBox.y + yOffset;

	                // Callback to update polyphonic param when GUI is used
	                const callback = (e) => {
					    if (Array.isArray(this[paramName])) {
					        // For array-type params like ADSR
					        const updatedArray = [...this[paramName]]; // Copy current value
					        updatedArray[i] = e; // Update the specific index
					        this[paramName+'_param'].set(updatedArray, null,'gui'); // ✅ Use the param's set() to propagate to all voices
					    } else {
					        // For scalar params
					        this[paramName+'_param'].set(e,null,'gui'); // ✅ Use param set() to update all voices
					    }
					};
					
	                // Create GUI element linked to polyphony params
	                this.createGuiElement(param, {
	                    x,
	                    y,
	                    size,
	                    controlType,
	                    color: groupLayout.color,
	                    i, // index for arrays
	                    value, // initial value
	                    callback // callback for real-time updates
	                });

	                indexOffset++;
	            });
	        });
	    });
	    this.gui.setTheme( this.gui, 'dark' )
	    this.gui.backgroundColor = this.backgroundColor
	    //setTimeout(this.loadPreset('default'),100)
	}

	createGuiElement(param, { x, y, size, controlType, color, i = null, value, callback }) {
	    //console.log(x, y, size, controlType, color,i, value, callback)
	    //return
	    if (controlType === 'knob') {
	        param.guiElements.push(this.gui.Knob({
	            label: i !== 0 ? param.labels[i] : param.name,
	            min: param.min,
	            max: param.max,
	            value: value, // Use provided value, not param._value
	            size: size, // Scale size
	            curve: param.curve,
	            x,
	            y,
	            accentColor: color,
	            callback: callback // ✅ Correct callback for Polyphony
	        }));
	    } else if (controlType === 'fader') {
	        param.guiElements.push(this.gui.Fader({
	            label: i !== 0 ? param.labels[i] : param.name,
	            min: param.min,
	            max: param.max,
	            value: value, // Use provided value
	            curve: param.curve,
	            size: size,
	            x,
	            y,
	            accentColor: color,
	            callback: callback // ✅ Correct callback for Polyphony
	        }));
	    } else if (controlType === 'radioButton') {
	        if (!Array.isArray(param.radioOptions) || param.radioOptions.length === 0) {
	            console.warn(`Parameter "${param.name}" has no options defined for radioBox.`);
	            return null;
	        }

	        param.guiElements.push( this.gui.RadioButton({
	            label: i !== 0 ? param.labels[i] : param.name,
	            radioOptions: param.radioOptions,
	            value: value, // Use provided value
	            x: x,
	            y: y + 10,
	            accentColor: color,
	            callback: callback // ✅ Correct callback for Polyphony
	        }));
	    } else if (controlType === 'dropdown') {
            // if (!Array.isArray(param.radioOptions) || param.radioOptions.length === 0) {
            //     console.warn(`Parameter "${param.name}" has no options defined for radioBox.`);
            //     return null;
            // }

            param.guiElements.push( this.gui.Dropdown({
                label: i ? param.labels[i] : param.name, 
                dropdownOptions: this.drumkitList,
                value: param._value,
                x:x,
                y:y+10,
                size:15,
                accentColor: color,
                callback:(x)=>{this.loadSamples(x)}
              }))
        } else if (controlType === 'text') {
            param.guiElements.push( this.gui.Text({
                label: param.max,
                value: param._value,
                x:x+2,
                y:y+10,
                border:0.01,
                textSize: size,
                accentColor: color,
                callback: (x) => {},
            }) );
        } else {
            console.log('no gui creation element for ', controlType)
        }
	}

	linkGui(name){
        let objectIndex = 0
        Object.keys(this.voice[0].param).forEach(key => {
          let subObject = this.voice[0].param[key];
          console.log(subObject)
          if( subObject.guiElements[0] ) 
            subObject.guiElements[0].setLink( name + objectIndex )
          objectIndex++
        });
    }

    pushState(snap = null) {
      Object.keys(this.voice[0].param).forEach(key => {
        const subObject = this.voice[0].param[key];
        const value = snap ? snap[key]?.value : subObject._value;

        if (value !== undefined && subObject.guiElements?.[0]) {
          subObject.guiElements[0].set(value);
        }
      });
    }

    saveSnap(name) {
      this.snapshots[name] = {};

      Object.keys(this.voice[0].param).forEach(key => {
        let subObject = this.voice[0].param[key];
        this.snapshots[name][key] = {
          value: subObject._value // store raw value
        };
      });

      console.log(`Snapshot "${name}" saved.`);
    }

	/**
     * Hide the GUI
     * @returns {void}
     */
    hideGui() {
        for (let i = 0; i < this.voice[0].gui_elements.length; i++) {
            //console.log(this.gui_elements[i])
            this.voice[0].gui_elements[i].hide = true;
        }
    }

    /**
     * Show the GUI
     * @returns {void}
     */
    showGui() {
        for (let i = 0; i < this.voice[0].gui_elements.length; i++) this.voice[0].gui_elements[i].hide = false;
    }

	applyFunctionToAllVoices(f) {
	    let fnString = f.toString();
	    // Perform the replacement and assign the result back
	    fnString = fnString.replace(/\bthis\./g, '');
	    //console.log("Modified function string:", fnString);

	    return fnString
	}

	stringToFunction(funcString) {
	   // Split by '=>' to get parameters and body for functions without 'this.super'
	    const parts = funcString.split('=>');
	    const params = parts[0].replace(/\(|\)/g, '').trim();  // Extract the parameter
	    let body = parts[1].trim();  // The function body

	    // Replace occurrences of 'this.' for the voice context
	    body = body.replace(/\bthis\./g, 'this.voice[i].');

	    // Prefix standalone function calls with 'this.'
	    body = body.replace(/(?<!this\.|this\.super\.)\b(\w+)\(/g, 'this.$1(');

	    // // Log the modified function for debugging purposes
	    // console.log('params:', params);
	    // console.log('modified body:', body);

	    return new Function('i', params, body);  // Create a function that accepts 'i' (voice index) and params
	}


	// Function to generate the parameter string from an assignment
	 generateParamString(assignment) {
    const fnString = assignment.toString();
    //console.log('param:', fnString);  // Log the function as a string to inspect its structure

    // Regex to match "this.[something] = [something];"
    const regex = /this\.([\w\d_\.]+)\s*=\s*([\w\d_\.]+)\s*;?/;
    const match = fnString.match(regex);

    //console.log('match:', match);  // Log the match result to debug
    if (match) {
        //console.log('Captured:', match[1]);  // Output: 'cutoff.value' or similar
        return match[1];  // Returns 'cutoff.value'
    } else {
        //console.log('No match found');
    }

    return null;
}


	 retrieveValueExpression(assignment) {
	    const fnString = assignment.toString();

	    // Adjusted regex to capture everything after the = sign, including optional semicolon
	    const regex = /this\.([\w\d_\.]+)\s*=\s*(.+);?/;
	    const match = fnString.match(regex);

	    if (match) {
	        // Return the value expression part (everything after '=')
	        return match[2].trim();  // Trimming to remove extra spaces if needed
	    }

	    return null;
	}

	/**** PRESETS ***/

	loadPreset(name) {
		for(let i=0;i<this.numVoices;i++) this.voice[i].loadPreset(name)
		//this.voice[0].loadPreset(name)
	}

	listPresets() {
        this.voice[0].listPresets();
    }

	savePreset(name) {
		this.voice[0].savePreset(name)
	};

    // Function to download the updated presets data
	downloadPresets() {
		this.voice[0].downloadAllPresets()
	};

	panic = function(){
		for(let i=0;i<this.numVoices;i++){
			this.voice[i].triggerRelease()
			this.activeNotes[i]  = -1
		}
	}

	pan = function(depth){
		for(let i=0;i<this.numVoices;i++){
			this.voice[i].panner.pan.value = Math.sin(i/8*Math.PI*2)*depth
		}
	}

	get() {
        let output = 'Parameters:\n';
        const params = {};
	    Object.keys(this.voice[0].param).forEach(paramName => {
	        params[paramName] = this.voice[0].param[paramName].get();
	    });
	    console.log(params);
	}

    print(){ this.get()}
}

;

class Quadrophonic {
    constructor(numChannels = 4) {
        this.context = window.audioContext;
        this.numChannels = numChannels;


        // Create the ChannelMergerNode with the specified number of channels
        this.channelMerger = this.context.createChannelMerger(this.numChannels);

        // Configure the audio context destination for multi-channel output
        let maxChannelCount = window.audioContext.destination.maxChannelCount;
        window.audioContext.destination.channelCount = maxChannelCount;
        window.audioContext.destination.channelCountMode = "explicit";
        window.audioContext.destination.channelInterpretation = "discrete";
        
        // Create and connect a channel merger
        this.channelMerger = window.audioContext.createChannelMerger(maxChannelCount);
        this.channelMerger.channelCount = 1;
        this.channelMerger.channelCountMode = "explicit";
        this.channelMerger.channelInterpretation = "discrete";
        this.channelMerger.connect(window.audioContext.destination);

        this.input = []
        for(let i=0;i<this.numChannels;i++){
            this.input.push(new Tone.Multiply(1))
            this.input[i].connect(this.channelMerger,0,0)
        }
    }

    // Connect a source node to a specific channel on the ChannelMerger
    connectSource(source, inputChannel = 0, outputChannel = 0) {
        source.connect(this.channelMerger, inputChannel, outputChannel);
    }

    // Disconnect a source from a specific channel on the ChannelMerger
    disconnectSource(source, inputChannel = 0) {
        source.disconnect(this.channelMerger, 0, inputChannel);
    }

    // Get the underlying ChannelMerger node for further routing
    getNode() {
        return this.channelMerger;
    }

    // Dispose of the ChannelMerger and disconnect any sources
    dispose() {
        this.channelMerger.disconnect();
        console.log("ChannelMerger disposed.");
    }
}

/*
Resonator

Tuned delay line for Karplus-Strong style synthesis
* input->delay_1&2->hpf->lpf->vca->output
* one envelope for cutoff and vca control
* env_depth, hpf_env_depth, lpf_env_depth
* direct control of vca level (default:1)

methods:
- setFrequency(Hz): sets frequnecy of delay line in Hz
- setCutoff(freq, time) sets freq of lpf
- connect(destination)
- setADSR()

properties:
- env_depth.factor.value (env controls vca)
- direct.value - direct output level
*/

;
;

class Resonator{
	constructor(gui = null, color = [200,200,200]){
      this.gui = gui

      this.input = new Tone.Multiply(1)
      this.delay_1 = new Tone.LowpassCombFilter({resonance:.95,dampening:10000})
      this.delay_2 = new Tone.LowpassCombFilter({resonance:.95,dampening:10000})
      this.hpf = new Tone.Filter({frequency: 20, type:'highpass', Q: 0})
      this.lpf = new Tone.Filter({frequency: 10000, type:'lowpass', Q: 0})
      this.vca = new Tone.Multiply()
      this.output = new Tone.Multiply(1)
      //control
      this.env = new Tone.Envelope()
      this.hpf_cutoff = new Tone.Signal(20)
      this.lpf_cutoff = new Tone.Signal(20000)
      this.hpf_env_depth = new Tone.Multiply()
      this.lpf_env_depth = new Tone.Multiply()
      this.delayTime = new Tone.Signal(.1)
      this.delayTimeScalar = new Tone.Multiply(1)
      this.detune = new Tone.Multiply(1)
      this.env_depth = new Tone.Multiply(1)
      this.direct = new Tone.Signal(1)
      //audio connections
      this.input.connect(this.delay_1)
      this.input.connect(this.delay_2)
      this.delay_1.connect(this.hpf)
      this.delay_2.connect(this.hpf)
      this.hpf.connect(this.lpf)
      this.lpf.connect(this.vca)
      this.vca.connect(this.output)
      //delay
      this.delayTime.connect( this.delayTimeScalar)
      this.delayTimeScalar.connect( this.delay_1.delayTime)
      this.delayTimeScalar.connect( this.detune)
      this.detune.connect( this.delay_2.delayTime)
      //filter cutoffs
      this.hpf_cutoff.connect( this.hpf.frequency)
      this.lpf_cutoff.connect( this.lpf.frequency)
      this.env.connect(this.hpf_env_depth.factor)
      this.env.connect(this.hpf_env_depth.factor)
      this.hpf_env_depth.connect( this.hpf.frequency)
      this.lpf_env_depth.connect( this.lpf.frequency)
      //vca
      this.env.connect(this.env_depth)
      this.env_depth.connect(this.vca.factor)
      this.direct.connect(this.vca.factor)
	}
  setCutoff = function(val,time=null){
    if(time){
      this.lpf_cutoff.setValueAtTime(val, time)
      //this.lpf.frequency.setValueAtTime(val + (this.bandwidth*val)/2, time)
      //this.hpf.frequency.setValueAtTime(val - (this.bandwidth*val)/2, time)
    } else {
      this.lpf_cutoff.value = val
      //this.lpf.frequency.value = val + (this.bandwidth*val)/2
      //this.lpf.frequency.value = val - (this.bandwidth*val)/2
    }
  }
  setFrequency = function(val,time=null){
    if(time){
      this.delayTime.setValueAtTime(1/val, time)
    } else this.delayTime.value = 1/val
  }
  setFeedback = function(val,time=null){
    val = val<0 ? 0 : val>0.9999 ? 0.9999 : val
    if(time){
      this.delay_1.resonance.setValueAtTime(val, time)
      this.delay_2.resonance.setValueAtTime(val, time)
    } else {
      this.delay_1.resonance.value = val
      this.delay_2.resonance.value = val
    }
  }
  setADSR(a,d,s,r){
    this.env.attack = a>0.001 ? a : 0.001
    this.env.decay = d>0.01 ? d : 0.01
    this.env.sustain = Math.abs(s)<1 ? s : 1
    this.env.release = r>0.01 ? r : 0.01
  }
  connect(destination) {
    this.output.connect(destination);
  }
}

  

const paramDefinitions = (synth) => [
  {
    name: "name",
    type: "input",
    value: "Reverb",
    max: "Reverb",
    default: "Reverb"
  },
  {
    name: "lowcut",
    type: "input",
    min: 20,
    max: 1000,
    default: 100,
    curve: 2,
    callback: (value) => {
      synth.highpass.frequency.rampTo(value, 0.1);
    }
  },
  {
    name: "delayTime",
    type: "param",
    min: 0,
    max: 1,
    default: 0.01,
    curve: 2,
    callback: (value) => {
      synth.curDelayTime = value
      synth.delayL.delayTime.rampTo(value*(1+synth.widthValue), .1)
      synth.delayR.delayTime.rampTo(value*(1-synth.widthValue), .1)
    }
  },
  {
    name: "feedback",
    type: "output",
    min: 0,
    max: 1,
    default: 0.3,
    curve: 3,
    callback: (value) => {
      synth.feedbackGain.gain.rampTo(value,.02);
    }
  },
  {
    name: "damping",
    type: "param",
    min: 500,
    max: 10000,
    default: 4000,
    curve: 2,
    callback: (value) => {
      synth.dampingFilter.frequency.rampTo(value,.02);
    }
  },
  {
    name: "type",
    type: "param",
    radioOptions: ["hall", "plate", "spring", "space"],
    default: "room",
    callback: (value) => {
      synth.setType(value); // loads IR buffer and/or sets routing
    }
  },
  {
    name: "level",
    type: "output",
    min: 0,
    max: 1,
    default: 0.2,
    curve: 2,
    callback: (value) => {
      synth.input.gain.rampTo(value*4, 0.1);
    }
  },
  {
    name: "lfoRate",
    type: "none",
    min: 0.01,
    max: 10,
    default: 0.5,
    curve: 2,
    callback: (value) => {
      synth.lfo.frequency.rampTo(value, 0.1); // Tone.LFO.frequency is a Param
    }
  },
  {
    name: "lfoDepth",
    type: "none",
    min: 0,
    max: 0.1,
    default: 0.01,
    curve: 3,
    callback: (value) => {
      synth.lfo.amplitude.rampTo(value, 0.1); // Amplitude modulates delayTime
    }
  },
  {
    name: "width",
    type: "none",
    min: 0,
    max: 1,
    default: 0.01,
    curve: 2,
    callback: (value) => {
      synth.widthValue = value/2
      synth.delayL.delayTime.rampTo(synth.curDelayTime*(1+value/2),.01)
      synth.delayR.delayTime.rampTo(synth.curDelayTime*(1-value/2),.01)
    }
  }
];

/*
Reverb.js

        Input Signal
             │
             ▼
      Highpass Filter 
             │                     
             ▼                     
       Convolution Reverb   ◀──────┐
             │                     │
             ▼                     │
      Lowpass Filter               │
             │                     │
             ▼                     │
           Delay                   │
             │                     │
             ▼                     │
               ───Feedback Gain ───┘
             │
             ▼
           Output
  */


;
;
;
// ;
;
;

class Reverb extends EffectTemplate {

    constructor(gui = null) {
    super();
    this.gui = gui;
		this.presets = {}
		this.synthPresetName = "ReverbPresets"
		this.accessPreset()
    this.name = "Reverb";
    this.layout = layout;
    this.backgroundColor = [200,0,50]
    this.curDelayTime = .1

    this.widthValue = 0.01

    this.types = {
      "spring": {
        ir: 'spring',
        lowcut: 200,
        lfoRate: 3,
        lfoDepth: 0.0025,
        feedbackScale: 1,
        width:0
      },
      "hall": {
        ir: 'hall',
        lowcut: 100,
        lfoRate: 0.1,
        lfoDepth: 0.005,
        feedbackScale: 0.4,
        width:.05
      },
      "plate": {
        ir: 'plate',
        lowcut: 200,
        lfoRate: 0.5,
        lfoDepth: 0.001,
        feedbackScale: 0.25,
        width:.75
      },
      "room": {
        ir: 'hall',
        lowcut: 7000,
        lfoRate: .1,
        lfoDepth: 0.008,
        feedbackScale: 0.4,
        width:0.01
      },
      "space": {
        ir: 'plate',
        lowcut: 5000,
        lfoRate: 0.5,
        lfoDepth: 0.02,
        feedbackScale: 0.25,
        width:.625
      }
    };

    this.sampleFiles = {
          // plate: './audio/plate_reverb.mp3',
          // spring: './audio/spring_reverb.mp3',
          // hall:   './audio/hall_reverb.mp3',
          plate: './audio/plateMed.mp3',
          spring: './audio/springMed.mp3',
          hall:   './audio/hallMed.mp3',
          ampeg: './audio/ampeg_amp.mp3',
          marshall: './audio/marshall_amp.mp3',
          vox:   './audio/voxAC30_amp.mp3',
          dreadnought: './audio/dreadnought_guitar.mp3',
          taylor: './audio/taylor_guitar.mp3',
          guitar:   './audio/custom_guitar.mp3',
          bell3:  'berklee/bell_mallet_2.mp3',
          horn: 'berklee/casiohorn2.mp3',
          chotone:  'berklee/chotone_c4_!.mp3',
          voice:  'berklee/femalevoice_aa_Db4.mp3',
          kalimba:  'berklee/Kalimba_1.mp3',
          dreamyPiano:  'salamander/A5.mp3',
          softPiano:  'salamander/A4.mp3',
          piano:  'salamander/A3.mp3',
          casio: 'casio/C2.mp3'
        }

    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);

    this.highpass = new Tone.Filter({type:'highpass', rolloff:-24,Q:0,frequency:100})
    this.convolver = new Tone.Convolver();
    this.dampingFilter = new Tone.Filter({frequency:1000, type:'lowpass', rolloff:-12});
    this.delayL = new Tone.Delay({delayTime:0.001, maxDelay:1.1})
    this.delayR = new Tone.Delay({delayTime:0.001, maxDelay:1.1})
    this.merge = new Tone.Merge()


    this.feedbackGain = new Tone.Gain(0);
    this.feedbackScale = new Tone.Gain(0.25)
    this.feedbackShaper = new Tone.WaveShaper(x => x - (1/3) * Math.pow(x, 3), 1024);
    this.lfo = new Tone.LFO({type:'sine',min:-.1,max:.1}).start()
    
    // // Buffer
    this.buffer = null;
    // // Audio connections
    this.input.connect(this.highpass);
    this.highpass.connect( this.convolver);
    this.convolver.connect(this.dampingFilter);
    this.dampingFilter.connect(this.delayL);
    this.dampingFilter.connect(this.delayR)
    this.dampingFilter.connect(this.output)
    // this.delayL.connect(this.output)
    this.delayL.connect(this.merge,0,0);
    this.delayR.connect(this.merge,0,1);
    this.merge.connect(this.output)

    this.delayL.connect(this.feedbackGain);
    this.delayR.connect(this.feedbackGain);
    this.feedbackGain.connect(this.feedbackScale);
    this.feedbackScale.connect(this.feedbackShaper);
    this.feedbackShaper.connect(this.convolver);

    this.lfo.connect(this.delayL.delayTime)
    this.lfo.connect(this.delayR.delayTime)

        // Parameter definitions
    this.paramDefinitions = paramDefinitions(this);
    this.param = this.generateParameters(this.paramDefinitions);
    this.createAccessors(this, this.param);
    this.autocompleteList = this.paramDefinitions.map(def => def.name);
    this.presetList = Object.keys(this.presets)
    setTimeout(() => {
      this.loadPreset('default');
    }, 500);

  }

  load(url = null) {
    if(url === null){
      // Create a file input element programmatically
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*'; // Accept only audio files

        // Handle file selection
        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) {
                console.log("No file selected");
                return;
            }

            // Use FileReader to read the file as a Data URL
            const fileReader = new FileReader();
            fileReader.onload = () => {
                this.buffer = new Tone.Buffer(fileReader.result)
                this.convolver.buffer = this.buffer
                console.log("Audio loaded into reverb");
                return
            };
            fileReader.readAsDataURL(file);
            
        };

        // Trigger the file dialog
        fileInput.click();
    }

    // If the `url` is a number, treat it as an index into the `sampleFiles` object
    if (typeof url === 'number') {
        // Convert the keys of the `sampleFiles` object to an array
        const fileKeys = Object.keys(this.sampleFiles);
        url = Math.floor(url) % fileKeys.length; // Calculate a valid index
        url = fileKeys[url]; // Reassign `url` to the corresponding filename
    }

    // Check if the `url` exists in `sampleFiles`
    if (url in this.sampleFiles) {
        console.log(`Reverb loading ${url}`);
        this.sample = url; // Store the selected sample
    } else {
        console.error(`The sample "${url}" is not available.`);
        return;
    }

    // Load the buffer and assign it to `this.buffer` and `this.convolver.buffer`
    return new Promise((resolve, reject) => {
        new Tone.Buffer(this.sampleFiles[url], (buffer) => {
            this.buffer = buffer;
            this.convolver.buffer = buffer;
            resolve();
        }, reject);
    });
}

  async filterIR(filterFreq) {
    if (!this.buffer) {
      console.error('Buffer not loaded.');
      return;
    }
    
    const context = Tone.getContext().rawContext;
    const duration = this.buffer.duration;
    const offlineContext = new OfflineAudioContext(2, duration * context.sampleRate, context.sampleRate);
    
    // Use the buffer directly from Tone.Buffer
    const decodedData = this.buffer.get();

    const source = offlineContext.createBufferSource();
    source.buffer = decodedData; // Use the buffer directly.
    
    // Example transformation: apply a filter (this could be more complex, including stretching)
    const filter = offlineContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    
    source.connect(filter);
    filter.connect(offlineContext.destination);
    
    source.start(0);
    
    return new Promise((resolve, reject) => {
      offlineContext.startRendering().then((renderedBuffer) => {
        // Use the rendered buffer as a new Tone.Buffer
        const newBuffer = new Tone.Buffer(renderedBuffer);
        this.buffer = newBuffer
        this.convolver.buffer = newBuffer; // Load it into the convolver
        resolve();
      }).catch(reject);
    });
  }//filter

  async stretchIR(stretchAmt) {
    if (!this.buffer) {
      console.error('Buffer not loaded.');
      return;
    }
    
    const context = Tone.getContext().rawContext;
    const duration = this.buffer.duration;
    const offlineContext = new OfflineAudioContext(2, duration * stretchAmt * context.sampleRate, context.sampleRate);
    
    // Use the buffer directly from Tone.Buffer
    const decodedData = this.buffer.get();

    const source = offlineContext.createBufferSource();
    source.buffer = decodedData; // Use the buffer directly.

    // Apply time-stretching by adjusting the playback rate
    source.playbackRate.value = 1/stretchAmt; // Adjust the playback rate based on the stretchVal
    source.connect(offlineContext.destination);
    source.start(0);
    
    return new Promise((resolve, reject) => {
      offlineContext.startRendering().then((renderedBuffer) => {
        // Use the rendered buffer as a new Tone.Buffer
        const newBuffer = new Tone.Buffer(renderedBuffer);
        this.buffer = newBuffer
        this.convolver.buffer = newBuffer; // Load it into the convolver
        resolve();
      }).catch(reject);
    });
  }//stretch

  async highpassIR(filterFreq) {
    if (!this.buffer) {
      console.error('Buffer not loaded.');
      return;
    }
    
    const context = Tone.getContext().rawContext;
    const duration = this.buffer.duration;
    const offlineContext = new OfflineAudioContext(2, duration * context.sampleRate, context.sampleRate);
    
    // Use the buffer directly from Tone.Buffer
    const decodedData = this.buffer.get();

    const source = offlineContext.createBufferSource();
    source.buffer = decodedData; // Use the buffer directly.
    
    // Example transformation: apply a filter (this could be more complex, including stretching)
    const filter = offlineContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = filterFreq;
    
    source.connect(filter);
    filter.connect(offlineContext.destination);
    
    source.start(0);
    
    return new Promise((resolve, reject) => {
      offlineContext.startRendering().then((renderedBuffer) => {
        // Use the rendered buffer as a new Tone.Buffer
        const newBuffer = new Tone.Buffer(renderedBuffer);
        this.buffer = newBuffer
        this.convolver.buffer = newBuffer; // Load it into the convolver
        resolve();
      }).catch(reject);
    });
  }//highpass

  listSamples(){
        const fileKeys = Object.keys(this.sampleFiles);
        console.log(fileKeys)
    }

  setType = function(typeName) {
    //console.log('type', typeName)
    const typeDef = this.types[typeName];
    if (!typeDef) return;

    // Set feedback path routing (if implemented)
    if (typeDef.feedbackScale) {
      this.feedbackScale.gain.rampTo(parseFloat(typeDef.feedbackScale))
    }

    // Set highpass (lowcut) filter
    if (typeDef.lowcut) {
      this.lowcut =parseFloat(typeDef.lowcut);
    }

    // 
    if (typeDef.ir) {
      this.load(typeDef.ir)
    }

    // Set smoothing when changing delay times
    if (typeDef.lfoRate) {
      this.lfoRate = typeDef.lfoRate
    }
    // Set smoothing when changing delay times
    if (typeDef.lfoDepth) {
      this.lfoDepth = typeDef.lfoDepth
    }
    // Set smoothing when changing delay times
    if (typeDef.width) {
      this.width = typeDef.width
    }

    // Optional: store current type
    this.currentType = typeName;
  };

}

window.RumblePresets = {
  "default": {
    "detune1": 0,
    "detune2": 0,
    "detune3": 0.02,
    "octave1": 0.3763000000000001,
    "octave2": 1.5999999999999996,
    "octave3": 2.16,
    "gain1": 1,
    "gain2": 0.6084000000000007,
    "gain3": 0.5476000000000011,
    "cutoff": 145.9711999999991,
    "Q": 1.015004123715722,
    "keyTrack": 0.8399999999999999,
    "vcfEnvDepth": 562.5000000000003,
    "a": 0.01,
    "d": 1.3826324676318522,
    "s": 0.30250000000000005,
    "r": 3.556883117545685,
    "vcf_a": 0.04,
    "vcf_d": 0.8409999999999971,
    "vcf_s": 0.12752525316941654,
    "vcf_r": 3.0249999999999955,
    "pwm1": 0,
    "pwm2": 0.42999999999999994,
    "pwm3": 0.47,
    "lfoRate": 1.7962052521481457,
    "distortion": 0.25430827878332185,
    "mix": 1
  },
  "fat": {
    "detune1": 0,
    "detune2": 0.11999999999999998,
    "detune3": 0.8499999999999999,
    "octave1": 0.3763000000000001,
    "octave2": 1.5999999999999996,
    "octave3": 2.16,
    "gain1": 1,
    "gain2": 1,
    "gain3": 0.47609999999999963,
    "cutoff": 179.698710402777,
    "Q": 5.391722399245056,
    "keyTrack": 0.96,
    "vcfEnvDepth": 828.0999999999998,
    "a": 0.01,
    "d": 2.4190428560496184,
    "s": 0.10240000000000007,
    "r": 5.873629867976521,
    "vcf_a": 0.04,
    "vcf_d": 0.9609999999999969,
    "vcf_s": 0.6889000000000008,
    "vcf_r": 3.968999999999996,
    "pwm1": 0.2799999999999998,
    "pwm2": 0.7600000000000002,
    "pwm3": 0.45999999999999996,
    "lfoRate": 0.6080368192154831,
    "distortion": 0,
    "mix": 1
  },
  "blip": {
    "detune1": 0,
    "detune2": 0,
    "detune3": 0.02,
    "octave1": 0.3763000000000001,
    "octave2": 1.5999999999999996,
    "octave3": 2.16,
    "gain1": 1,
    "gain2": 0,
    "gain3": 0,
    "cutoff": 145.9711999999991,
    "Q": 5.391722399245056,
    "keyTrack": 0.96,
    "vcfEnvDepth": 739.6000000000006,
    "a": 0.01,
    "d": 0.4073844173733507,
    "s": 0,
    "r": 0.4259935136161205,
    "vcf_a": 0.04,
    "vcf_d": 0.5289999999999974,
    "vcf_s": 0,
    "vcf_r": 0.6759999999999966,
    "pwm1": 0,
    "pwm2": 0.42999999999999994,
    "pwm3": 0.47,
    "lfoRate": 1.7962052521481457,
    "distortion": 0.25430827878332185,
    "mix": 1
  },
  "sub": {
    "detune1": 0,
    "detune2": 0,
    "detune3": 0.5000000000000001,
    "octave1": 0.3763000000000001,
    "octave2": 1.5999999999999996,
    "octave3": 1.7199999999999998,
    "gain1": 1,
    "gain2": 0.6084000000000007,
    "gain3": 0.5476000000000011,
    "cutoff": 145.9711999999991,
    "Q": 0.12264498595105665,
    "keyTrack": 1,
    "vcfEnvDepth": 176.39999999999995,
    "a": 0.003,
    "d": 1.4579999999999995,
    "s": 0,
    "r": 4.049999999999999,
    "vcf_a": 5,
    "vcf_d": 70.71067811865476,
    "vcf_s": 0.5,
    "vcf_r": 70.71067811865476,
    "pwm1": 0,
    "pwm2": 0,
    "pwm3": 0,
    "lfoRate": 12.5,
    "distortion": 1.6478738086663287e-32,
    "mix": 1
  }
};;

window.tightLayout = {

    "vco": {
      "color": [150, 0, 0],
      "boundingBox": { "x": 10, "y": 10, "width": 30, "height": 50 },
      "offsets": { "x": 10, "y": 25 },
      "groupA": ["type"],
      "controlTypeA": "radioButton",
      "controlTypeB": "knob",
      "sizeA": 0.6,
      "sizeB": 0.5,
      "theme": "dark"
    },
    "vcf": {
      "color": [100, 0, 150],
      "boundingBox": { "x": 40, "y": 10, "width": 40, "height": 50 },
      "offsets": { "x": 10, "y": 25 },
      "groupA": ["cutoff"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.7,
      "sizeB": 0.5
    },
    "vca": {
      "color": [100, 50, 100],
      "boundingBox": { "x": 80, "y": 10, "width": 20, "height": 50 },
      "offsets": { "x": 10, "y": 25 },
      "groupA": ["level"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.6,
      "sizeB": 0.5
    },
    "env": {
      "color": [20, 100, 100],
      "boundingBox": { "x": 40, "y": 80, "width": 50, "height": 50 },
      "offsets": { "x": 8, "y": 25 },
      "groupA": [],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.5,
      "sizeB": 0.6
    },
    "lfo": {
      "color": [20, 0, 100],
      "boundingBox": { "x": 50, "y": 70, "width": 50, "height": 50 },
      "offsets": { "x": 12, "y": 30 },
      "groupA": ["rate"],
      "controlTypeA": "knob",
      "controlTypeB": "knob",
      "sizeA": 0.5,
      "sizeB": 0.6
    }
  
};;

const paramDefinitions = (synth) => [
  // VCO Detune
  {
    name: 'detune1', type: 'vco', min: 0, max: 1, curve: 1,
    value: 0,
    callback(x) { 
        synth.vco_freq_1.factor.value = 1+synth.detuneFocusCurve(x); 
    }
  },
  {
    name: 'detune2', type: 'vco', min: 0, max: 1, curve: 1,
    value: 0.1,
    callback(x) { 
        synth.vco_freq_2.factor.value = 1+synth.detuneFocusCurve(x); 
    }
  },
  {
    name: 'detune3', type: 'vco', min: 0, max: 1, curve: 1,
    value: 0.95,
    callback(x) { 
        synth.vco_freq_3.factor.value = 1+synth.detuneFocusCurve(x);  
    }
  },

  // VCO Octave
  {
    name: 'octave1', type: 'vco', min: 0, max: 4, curve: 1,
    value: 1,
    callback(x) { 
        x = Math.floor(x-2)
        synth.vco_octave_1.factor.value = Math.pow(2, x); }
  },
  {
    name: 'octave2', type: 'vco', min: 0, max: 4, curve: 1,
    value: 1,
    callback(x) {
        x = Math.floor(x-2)
        synth.vco_octave_2.factor.value = Math.pow(2, x); }
  },
  {
    name: 'octave3', type: 'vco', min: 0, max: 4, curve: 1,
    value: 2,
    callback(x) { 
        x = Math.floor(x-2)
        synth.vco_octave_3.factor.value = Math.pow(2, x); }
  },

  // VCO Gain
  {
    name: 'gain1', type: 'vco', min: 0, max: 1, curve: 2,
    value: 1,
    callback(x) { synth.vco_gain_1.factor.value = x; }
  },
  {
    name: 'gain2', type: 'vco', min: 0, max: 1, curve: 2,
    value: 0,
    callback(x) { synth.vco_gain_2.factor.value = x; }
  },
  {
    name: 'gain3', type: 'vco', min: 0, max: 1, curve: 2,
    value: .5,
    callback(x) { synth.vco_gain_3.factor.value = x; }
  },

  // Filter
  {
    name: 'cutoff', type: 'vcf', min: 20, max: 20000, curve: 2,
    value: 100,
    callback(x) { synth.cutoffSig.value = x; }
  },
  {
    name: 'Q', type: 'vcf', min: 0, max: 30, curve: 2,
    value: 0.5,
    callback(x) { synth.vcf.Q.value = x; }
  },
  {
    name: 'keyTrack', type: 'vcf', min: 0, max: 2, curve: 1,
    value: 0.3,
    callback(x) { synth.keyTracking.factor.value = x; }
  },
  {
    name: 'vcfEnvDepth', type: 'vcf', min: 0, max: 1000, curve: 2,
    value: 300,
    callback(x) { synth.vcf_env_depth.factor.value = x; }
  },

  // ADSR Envelope
  {
    name: 'a', type: 'env', min: 0, max: 1, curve: 1,
    value: 0.005,
    callback(x) { synth.env.attack = x; }
  },
  {
    name: 'd', type: 'env', min: 0, max: 10, curve: 2,
    value: 0.2,
    callback(x) { synth.env.decay = x; }
  },
  {
    name: 's', type: 'env', min: 0, max: 1, curve: 2,
    value: 0.6,
    callback(x) { synth.env.sustain = x; }
  },
  {
    name: 'r', type: 'env', min: 0, max: 10, curve: 2,
    value: 3,
    callback(x) { synth.env.release = x; }
  },

  // Filter ADSR
  {
    name: 'vcf_a', type: 'vcf', min: 0, max: 1, curve: 1,
    value: 0.002,
    callback(x) { synth.vcf_env.attack = x; }
  },
  {
    name: 'vcf_d', type: 'vcf', min: 0, max: 10, curve: 2,
    value: 0.8,
    callback(x) { synth.vcf_env.decay = x; }
  },
  {
    name: 'vcf_s', type: 'vcf', min: 0, max: 1, curve: 2,
    value: 0.2,
    callback(x) { synth.vcf_env.sustain = x; }
  },
  {
    name: 'vcf_r', type: 'vcf', min: 0, max: 10, curve: 2,
    value: 1,
    callback(x) { synth.vcf_env.release = x; }
  },

  // PWM
  {
    name: 'pwm1', type: 'vca', min: 0, max: 1, curve: 1,
    value: 0,
    callback(x) { synth.lfo_pwm_1.factor.value = x; }
  },
  {
    name: 'pwm2', type: 'vca', min: 0, max: 1, curve: 1,
    value: 0,
    callback(x) { synth.lfo_pwm_2.factor.value = x; }
  },
  {
    name: 'pwm3', type: 'vca', min: 0, max: 1, curve: 1,
    value: 0,
    callback(x) { synth.lfo_pwm_3.factor.value = x; }
  },

  // LFO, Distortion, Mix
  {
    name: 'lfoRate', type: 'vca', min: 0, max: 50, curve: 3,
    value: 3,
    callback(x) { synth.lfo.frequency.value = x; }
  },
  {
    name: 'distortion', type: 'vca', min: 0, max: 1, curve: 3,
    value: 0,
    callback(x) { synth.clip.factor.value = x; }
  },
  {
    name: 'mix', type: 'vca', min: 0, max: 1, curve: 1,
    value: 1,
    callback(x) { synth.direct_level.factor.value = x; }
  }
];

paramDefinitions;

/*
Rumble

Three oscillator monosynth
* 3 vcos->mixer->gain->waveShaper->vcf->vca->output
* main pitch input is .frequency.value

methods:
- connect
setADSR(a,d,s,r)
setFilterADSR(a,d,s,r)
setDetune(a,b,c)
setPwmDepth(a,b,c)
setGain(a,b,c)

properties set directly:
frequency.value
velocitySig.value
cutoff_cv.value
clip.factor (into waveShaper)
vca_lvl.value
cutoffSig.value
vcf_env_depth.factor
keyTracking.factor
lfo.frequency

properties set using methods:
vco_freq_1, vco_freq_2, vco_freq_3
vco_gain_1, vco_gain_2, vco_gain_3
env and vcf_env ADSR
lfo_pwm_1, lfo_pwm_2, lfo_pwm_3
gain (into waveShaper)

 
*/
;
;
;
;

;
;


class Rumble extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
		this.presets = RumblePresets
		this.synthPresetName = "RumblePresets"
		//this.accessPreset()
    this.isGlide = false
    this.name = "Rumble"
    this.layout = tightLayout

    // Initialize the main frequency control
    this.frequency = new Tone.Signal();

    // Frequency ratios for VCOs
    this.vco_freq_1 = new Tone.Multiply(1);
    this.vco_freq_2 = new Tone.Multiply(1);
    this.vco_freq_3 = new Tone.Multiply(1);
    this.vco_octave_1 = new Tone.Multiply(1);
    this.vco_octave_2 = new Tone.Multiply(1);
    this.vco_octave_3 = new Tone.Multiply(1);
    this.frequency.connect(this.vco_freq_1);
    this.frequency.connect(this.vco_freq_2);
    this.frequency.connect(this.vco_freq_3);

    // VCOs
    this.vco_1 = new Tone.OmniOscillator({type:'pulse'}).start();
    this.vco_2 = new Tone.OmniOscillator({type:'pulse'}).start();
    this.vco_3 = new Tone.OmniOscillator({type:'pulse'}).start();
    this.vco_freq_1.connect(this.vco_octave_1);
    this.vco_freq_2.connect(this.vco_octave_2);
    this.vco_freq_3.connect(this.vco_octave_3);
    this.vco_octave_1.connect(this.vco_1.frequency);
    this.vco_octave_2.connect(this.vco_2.frequency);
    this.vco_octave_3.connect(this.vco_3.frequency);

    // Mixer
    this.vco_gain_1 = new Tone.Multiply(.25);
    this.vco_gain_2 = new Tone.Multiply(.25);
    this.vco_gain_3 = new Tone.Multiply(.25);
    this.vco_1.connect(this.vco_gain_1);
    this.vco_2.connect(this.vco_gain_2);
    this.vco_3.connect(this.vco_gain_3);

    this.vcf = new Tone.Filter({type:"lowpass", rolloff:-24});
    this.vco_gain_1.connect(this.vcf);
    this.vco_gain_2.connect(this.vcf);
    this.vco_gain_3.connect(this.vcf);

    //waveShaper
    this.clip = new Tone.Multiply(0.125)
    this.direct_level = new Tone.Multiply(.5)
    this.waveShaper = new Tone.WaveShaper((x)=>{
      return Math.sin(x*Math.PI*2)
    	//return Math.tanh(x*8)
    })
    this.waveShaper.oversample = "4x"
    this.vcf.connect(this.clip)
    this.vcf.connect(this.direct_level)
    this.clip.connect(this.waveShaper)

    // VCF, VCA, output
    this.vca = new Tone.Multiply()
    this.direct_level.connect(this.vca)
    this.output = new Tone.Multiply(.5)
    this.waveShaper.connect(this.vca)
    this.vca.connect(this.output)

    // VCA control
    this.vca_lvl = new Tone.Signal();
    this.vca_lvl.connect(this.vca.factor)
    this.env = new Tone.Envelope();
    this.env_depth = new Tone.Multiply()
    this.env.connect(this.env_depth)
    this.env_depth.connect(this.vca.factor)
    this.velocitySig = new Tone.Signal(1)
    this.velocitySig.connect(this.env_depth.factor)

    //vcf control
    this.vcf_env = new Tone.Envelope();
    this.cutoffSig = new Tone.Signal(1000);
    this.cutoff_cv = new Tone.Signal(0);
    this.vcf_env_depth = new Tone.Multiply(500);
    this.keyTracking = new Tone.Multiply(.1)
    this.vcf_env.connect(this.vcf_env_depth)
    this.vcf_env_depth.connect(this.vcf.frequency)
    this.cutoffSig.connect(this.vcf.frequency)
    this.cutoff_cv.connect(this.vcf.frequency)
    this.frequency.connect(this.keyTracking)
    this.keyTracking.connect(this.vcf.frequency)

    //LFO
    this.lfo = new Tone.Oscillator(1).start()
    this.lfo_pwm_1 = new Tone.Multiply()
    this.lfo_pwm_2 = new Tone.Multiply()
    this.lfo_pwm_3 = new Tone.Multiply()
    this.lfo.connect(this.lfo_pwm_1)
    this.lfo_pwm_1.connect(this.vco_1.width)
    this.lfo.connect(this.lfo_pwm_2)
    this.lfo_pwm_2.connect(this.vco_2.width)
    this.lfo.connect(this.lfo_pwm_3)
    this.lfo_pwm_3.connect(this.vco_3.width)

    // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    //console.log(this.paramDefinitions)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
    //setTimeout(()=>{this.loadPreset('default')}, 500);//for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
  }//constructor

  //envelopes
  triggerAttack (freq, amp, time=null){
    freq = Theory.mtof(freq)
    amp = amp/127
    if(time){
      this.env.triggerAttack(time)
      this.vcf_env.triggerAttack(time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.setValueAtTime(amp,time)
    } else {
      this.env.triggerAttack()
      this.vcf_env.triggerAttack()
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }
  triggerRelease (time=null){
    if(time) {
    	this.env.triggerRelease(time)
    	this.vcf_env.triggerRelease(time)
    }
    else {
      this.env.triggerRelease()
    	this.vcf_env.triggerRelease()
    }
  }
  triggerAttackRelease (freq, amp, dur=0.01, time=null){
    //console.log('AR ',freq,amp,dur,time)
    //freq = Tone.Midi(freq).toFrequency()
    freq = Theory.mtof(freq)
    amp = amp/127
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.vcf_env.triggerAttackRelease(dur, time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.setValueAtTime(amp,time)
    } else{
      this.env.triggerAttackRelease(dur)
      this.vcf_env.triggerAttackRelease(dur)
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }//attackRelease

  triggerRawAttack (freq, amp=1, time=null){
    if(amp > 1) amp = 1
    if(time){
      this.env.triggerAttack(time)
      this.vcf_env.triggerAttack(time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.setValueAtTime(amp,time)
    } else {
      this.env.triggerAttack()
      this.vcf_env.triggerAttack()
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }
  triggerRawRelease (time=null){
    if(time) {
      this.env.triggerRelease(time)
      this.vcf_env.triggerRelease(time)
    }
    else {
      this.env.triggerRelease()
      this.vcf_env.triggerRelease()
    }
  }
  triggerRawAttackRelease (freq, amp=1, dur=0.01, time=null){
    if(amp > 1) amp = 1
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.vcf_env.triggerAttackRelease(dur, time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.setValueAtTime(amp,time)
    } else{
      this.env.triggerAttackRelease(dur)
      this.vcf_env.triggerAttackRelease(dur)
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }//attackRelease

  setDetune(a,b,c){
  	this.vco_freq_1.factor.value = a
  	this.vco_freq_2.factor.value = b
  	this.vco_freq_3.factor.value = c
  }
  setPwmDepth(a,b,c){
  	this.lfo_pwm_1.factor.value = a
  	this.lfo_pwm_2.factor.value = b
  	this.lfo_pwm_3.factor.value = c
  }
  setGain(a,b,c){
  	this.vco_gain_1.factor.value = a
  	this.vco_gain_2.factor.value = b
  	this.vco_gain_3.factor.value = c
  }

  connect(destination) {
    if (destination.input) {
      this.output.connect(destination.input);
    } else {
      this.output.connect(destination);
    }
  }

  detuneFocusCurve(x) {
    // Center at 1, 1.5, 2 with slight flattening using tanh or logistic smoothing
    // Use a weighted sum of bumps
    const centerVals = [0, 0.5, 1];
    const numDivisions = centerVals.length - 1;
    const divisionSize = 1 / numDivisions;

    const sigmoid = (x) => 1 / (1 + Math.exp(-x * 10)); // steeper sigmoid

      for (let i = 0; i < numDivisions; i++) {
        const start = i * divisionSize;
        const end = (i + 1) * divisionSize;
        const center = centerVals[i + 1];

        if (x >= start && x < end) {
          const normalized = (x - start) / divisionSize; // maps to 0–1
          const curved = sigmoid(normalized * 2 - 1);     // sigmoid centered at 0
          return start + curved * divisionSize;          // remap to original range
        }
      }
      return x; // fallback
    
  }
}


//
const baseUrl = 'https://specy.github.io/genshinMusic/assets/audio/';
const type = '/0.mp3';
const files = [
  'Aurora', 'Bells', 'Contrabass', 'Drum', 'DunDun',
  'Flute', 'Guitar', 'HandPan', 'Harp', 'Horn', 'Kalimba', 
  'LightGuitar', 'Lyre', 'MantaOcarina', 'Ocarina',
  'Old-Zither', 'Panflute', 'Piano', 'Pipa', 'SFX_TR-909',
  'ToyUkulele', 'Trumpet', 'Vintage-Lyre', 'WinterPiano', 'Xylophone', 'Zither'
];

// Create a dictionary to map file names to URLs and pitches
const soundDict = {};

files.forEach((fileName, index) => {
    const url = baseUrl + fileName + type;
    soundDict[fileName] = { url: url, basePitch: 60 }; // Assume MIDI 60 as base pitch for simplicity
});

console.log(soundDict);


// Function to create and load a sampler for a specific file
function loadSampler(index) {
    const num = index % files.length;  // Wrap around if index exceeds files array length
    const fileName = files[num];
    const fileUrl = baseUrl + fileName + type; // Construct the full URL
   
    // Print to check values
    console.log(`Loading ${fileName} with URL: ${fileUrl}`);
    
    // Create a sampler and load the sample into the specified note (MIDI 60)
    const sampler = new Tone.Sampler({
        urls: {
            [60]: fileUrl  // Map middle C to the sample URL
        }
    }).toDestination();

    return sampler;
}


const paramDefinitions = (synth) => [
  {
    name: 'volume',
    type: 'output',
    value: 0.5,
    min: 0,
    max: 1,
    curve: 0.75,
    callback: function(x) {
          synth.sampler.volume.value = -36 + (Math.pow(x,0.5)) * 60;
    }
  },
  {
    name: 'attack',
    type: 'hidden',
    value: 0.005,
    min: 0.005,
    max: 1,
    curve: 2,
    callback: function(x) {
      synth.sampler.attack = x;
    }
  },
  {
    name: 'duration ',
    type: 'input',
    value: 0.5,
    min: 0.005,
    max: 1,
    curve: 2,
    callback: function(x) {
      synth.duration = x;
    }
  },
  {
    name: 'release',
    type: 'param',
    value: 0.5,
    min: 0.01,
    max: 10,
    curve: 2,
    callback: function(x) {
      synth.sampler.release = x;
    }
  },
  {
    name: 'cutoff',
    type: 'param',
    value: 10000,
    min: 100,
    max: 10000,
    curve: 2,
    callback: function(x) {
      synth.cutoffSig.value = x;
    }
  },
  {
    name: 'Q',
    type: 'param',
    value: 0,
    min: 0.0,
    max: 20,
    curve: 2,
    callback: function(x) {
      synth.vcf.Q.value = x;
    }
  },
  {
    name: 'filterEnvDepth',
    type: 'param',
    value: 0,
    min: 0.0,
    max: 5000,
    curve: 2,
    callback: function(x) {
      synth.vcfEnvDepth.factor.value = x;
    }
  }
  ,
  {
    name: 'startTime',
    type: 'hidden',
    value: 0,
    min: 0.0,
    max: 1,
    curve: 1,
    callback: function(x) {
      synth.sampler._startTime = x;
    }
  }
  // {
  //   name: 'endTime',
  //   type: 'hidden',
  //   value: 10,
  //   min: 0.0,
  //   max: 10,
  //   curve: 1,
  //   callback: function(x) {
  //     synth.endTime = x;
  //   }
  // }
];

paramDefinitions;

/*
 * Simple Sampler
 *
 * 
*/

;
// ;
;

;
;

class ExtendedSampler extends Tone.Sampler{
    constructor(options){
        super(options)
        this._startTime = 0
        console.log('begin')
    }

    ftomf(freq) {
        return 69 + 12 * Math.log2(freq / 440);
    }
    triggerAttack(notes, time, velocity = 1) {
        //console.log("es.triggerAttack", notes, time, velocity);

        if (!Array.isArray(notes)) {
            notes = [notes];
        }

        notes.forEach((note) => {
            const midiFloat = this.ftomf(
                new Tone.FrequencyClass(this.context, note).toFrequency()
            );
            const midi = Math.round(midiFloat);
            const remainder = midiFloat - midi;

            // find the closest note pitch
            const difference = this._findClosest(midi);
            const closestNote = midi - difference;

            const buffer = this._buffers.get(closestNote);
            const playbackRate = Tone.intervalToFrequencyRatio(difference + remainder);

            // play that note
            const source = new Tone.ToneBufferSource({
                url: buffer,
                context: this.context,
                curve: this.curve,
                fadeIn: this.attack,
                fadeOut: this.release,
                playbackRate,
            }).connect(this.output);
            // Updated this line:
            source.start(time, this._startTime, buffer.duration / playbackRate, velocity);

            // add it to the active sources
            if (!Array.isArray(this._activeSources.get(midi))) {
                this._activeSources.set(midi, []);
            }
            this._activeSources.get(midi).push(source);

            // remove it when it's done
            source.onended = () => {
                if (this._activeSources && this._activeSources.has(midi)) {
                    const sources = this._activeSources.get(midi);
                    const index = sources.indexOf(source);
                    if (index !== -1) {
                        sources.splice(index, 1);
                    }
                }
            };
        });

        return this;
    }   
}

class Simpler extends MonophonicTemplate {
    constructor (file) {
        super()
        // this.gui = gui
		this.presets = {}
		this.synthPresetName = "SimplerPresets"
		//this.accessPreset()
        this.name = "Simpler"
        this.layout = layout;
        this.guiHeight = .3
        this.backgroundColor = [0,0,50]

        this.pitchOffset = 0
        
        //audio objects
        this.sampler = new ExtendedSampler()
        this.vcf = new Tone.Filter()
        this.vca = new Tone.Multiply(1)
        this.output = new Tone.Multiply(1)
        this.cutoffSig = new Tone.Signal(10000)

        //vcf setup
        this.cutoffSig.connect(this.vcf.frequency)
        this.vcf.frequency.value = 10000
        this.vcf.rolloff = -12
        this.vcf.Q.value = 1

        //Set up filter envelope
        this.filterEnv = new Tone.Envelope()
        this.vcfEnvDepth = new Tone.Multiply()
        this.filterEnv.connect(this.vcfEnvDepth)
        this.vcfEnvDepth.connect(this.vcf.frequency)

        //connect vcf to vca
        this.vcf.connect(this.vca)
        this.vca.connect(this.output)

        this.sample = ''

        // Bind parameters with this instance
        this.paramDefinitions = paramDefinitions(this)
        ///console.log(this.paramDefinitions)
        this.param = this.generateParameters(this.paramDefinitions)
        this.createAccessors(this, this.param);

        //for autocomplete
        this.autocompleteList = this.paramDefinitions.map(def => def.name);;
        //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
        setTimeout(()=>{this.loadPreset('default')}, 500);

        this.sampleFiles = {
          bell: [-4, 'berklee/bell_1.mp3'],
          bell1:   [-1, 'berklee/bell_1a.mp3'],
          bell2:   [-1, 'berklee/bell_2a.mp3'],
          bell3:   [-1, 'berklee/bell_mallet_2.mp3'],
          horn:[2, 'berklee/casiohorn2.mp3'],
          chotone:  [0, 'berklee/chotone_c4_!.mp3'],
          voice: [0.8, 'berklee/femalevoice_aa_Db4.mp3'],
          kalimba: [-1, 'berklee/Kalimba_1.mp3'],
          dreamyPiano: [-3, 'salamander/A5.mp3'],
          softPiano: [-3, 'salamander/A4.mp3'],
          piano: [-3, 'salamander/A3.mp3'],
          casio:[0, 'casio/C2.mp3']
        }

        //for autocomplete
        this.autocompleteList = this.paramDefinitions.map(def => def.name);
        //this.autocompleteList = this.autocompleteList + Object.keys(this.sampleFiles)
        //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
        setTimeout(()=>{this.loadPreset('default')}, 500);

        //console.log(this.autocompleteList)
        if(file) this.loadSample(file)
    }

    /**
   * Load a specific sample.
   * @param {string} file - The name of the sample to load.
   */
    load(file = 'piano'){this.loadSample(file)}
    loadSample(file = null){
        //clear all previously playing notes
        if(this.sampler) {
            this.sampler.dispose()
            this.sampler.releaseAll()
        }

        if(file === null){
            this.loadSampleToSampler()
            return
        }

        // If the file is a number, treat it as an index into the sampleFiles object
        if (typeof file === 'number') {
            // Convert the keys of the sampleFiles object to an array
            const fileKeys = Object.keys(this.sampleFiles);
            file = Math.floor(file)%fileKeys.length
            file = fileKeys[file];
        }

        this.baseUrl = ""
        let url, note
        if (file in this.sampleFiles) {
          console.log(`Simpler loading ${file}`);
          this.sample = file
          this.baseUrl = "https://tonejs.github.io/audio/"
          url = this.sampleFiles[this.sample][1]
          note = this.sampleFiles[this.sample][0]
        } else {
            url = file + '.mp3'
            note = 0
            this.baseUrl = "./audio/"; // Relative to your script's location
        }



        //console.log(note, url)
        this.pitchOffset = note
        this.sampler = new ExtendedSampler({
            urls:{
                [60]: this.baseUrl.concat(url)
            }
        }).connect(this.vcf)
    }

    listSamples(){
        const fileKeys = Object.keys(this.sampleFiles);
        console.log(fileKeys)
    }

    //envelopes
    triggerAttack (freq, amp=100, time=null){ 
        // console.log(freq, amp, time)
        try{
            this.param.release = this.release
            freq = freq - this.pitchOffset
            freq = Tone.Midi(freq).toFrequency()
            amp = amp/127
            if(time){
                this.sampler.triggerAttack(freq, time, amp)
                this.filterEnv.triggerAttack(time)
                //this.vca.factor.setValueAtTime(amp, time)
            } else{
            
                this.sampler.triggerAttack(freq, Tone.now(), amp)
                //console.log('s.a',freq, amp, time)
                this.filterEnv.triggerAttack()
                //this.vca.factor.value = amp
            }
        }catch(e){}
    }

    triggerRelease (freq, time=null){
        try{
            freq = freq - this.pitchOffset
            freq = Tone.Midi(freq).toFrequency()
            if(time) {
                this.sampler.triggerRelease(freq, time)
                this.filterEnv.triggerRelease(time)
            }
            else {
                //console.log('s.r',freq, time)
                this.sampler.triggerRelease(freq)
                this.filterEnv.triggerRelease()
            }
        }catch(e){}
    }

    triggerAttackRelease (freq, amp, dur=0.01, time=null){
        try{ 
            //console.log('AR', freq, amp, dur, time)
            this.param.release = this.release
            freq = freq - this.pitchOffset 
            freq = Tone.Midi(freq).toFrequency()
            
            amp = amp/127
            //console.log(freq,amp,dur)
            if(time){
                this.sampler.triggerAttackRelease(freq, dur, time, amp)
                this.filterEnv.triggerAttackRelease(dur,time)
                this.vca.factor.setValueAtTime(amp, time)
            } else{
                this.sampler.triggerAttackRelease(freq, dur, Tone.now(), amp)
                this.filterEnv.triggerAttackRelease(dur)
                this.vca.factor.setValueAtTime(amp)
            }
        }catch(e){}
    }//attackRelease

    releaseAll(time = null){
        console.log('releaseAll')
        if(time) {
            this.sampler.releaseAll(time)
        } else {
            this.sampler.releaseAll();
        }
    }


    //parameter setters
    setADSR(a,d,s,r){
        this.sampler.attack = a>0.001 ? a : 0.001
        //this.filterEnv.decay = d>0.01 ? d : 0.01
        //this.filterEnv.sustain = Math.abs(s)<1 ? s : 1
        this.sampler.release = r>0.01 ? r : 0.01
    }

    loadSampleToSampler(note = "C4") {
        // Create a file input element programmatically
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*'; // Accept only audio files

        // Handle file selection
        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) {
                console.log("No file selected");
                return;
            }

            // Use FileReader to read the file as a Data URL
            const fileReader = new FileReader();
            fileReader.onload = () => {
                this.sampler = new ExtendedSampler({
                    urls:{
                        [60]: fileReader.result
                    }
                }).connect(this.vcf)
                console.log("Audio loaded into sampler");
            };
            fileReader.readAsDataURL(file);
        };

        // Trigger the file dialog
        fileInput.click();
    }
}

;
;

/*
Synthesized Snare:

STRUCTURE:
    *
    H  vco1 \
    E        > --------> vca1 ---
    A  vco2 /             |       \
    D               headsEnvelope  \
    S                              out
    *                              /
    S              snareEnvelope  /
    N                     |      /
    A  rattle -> filter -> vca2 -
    R
    E
    *
    
    This snare uses the research done by the webpage/s:
        - https://www.soundonsound.com/techniques/practical-snare-drum-synthesis
        -
*/

class Snare {
    constructor(frequency, gui = null) {
        this.name = 'Snare'
        this.gui = gui
        this.output = new Tone.Multiply(1)
        //
        // Heads
        this.vco1 = new Tone.Oscillator(frequency).start()
        this.vco2 = new Tone.Oscillator(frequency + 150).start()
        this.vca1 = new Tone.Multiply(.5)
        this.headsEnvelope = new Tone.Envelope({
                        attack: 0.001,
                        decay: 0.1,
                        sustain: 0,
                        release: 0.1
                    })
        this.vco1.connect(this.vca1)
        this.vco2.connect(this.vca1)
        this.headsEnvelope.connect(this.vca1.factor)
        this.vca1.connect(this.output)
        //
        // Snare
        this.rattle = new Tone.Noise('white').start()
        this.ratFilter = new Tone.Filter({
                        type: "bandpass",
                        frequency: 1500, 
                        Q: 1
                    })
        this.vca2 = new Tone.Multiply(0.5)
        this.ratEnvelope = new Tone.Envelope({
                                attack: 0.001,
                                decay: 0.2,
                                sustain: 0,
                                release: 0.1
                                })
        this.rattle.connect(this.ratFilter)
        this.ratFilter.connect(this.vca2)
        this.ratEnvelope.connect(this.vca2.factor)
        this.vca2.connect(this.output)
    }

    trigger(time = null) {
        if (time) {
            this.ratEnvelope.triggerAttackRelease(0.01, time)
            this.headsEnvelope.triggerAttackRelease(0.01,time)
        } else {
            this.ratEnvelope.triggerAttackRelease(0.01)
            this.headsEnvelope.triggerAttackRelease(0.01)
        }
    }


        // this.ratEnvelope.triggerAttackRelease(0.01), this.headsEnvelope.triggerAttackRelease(0.01)
    }
    

window.StringsPresets = {
  "default": {
    "type": "square",
    "cutoff": 2750.48799999999994,
    "Q": 0,
    "keyTrack": 0,
    "envDepth": 0.5999999999976,
    "level": 0,
    "attack":  0.4,
    "decay":  0.89062500000000155,
    "sustain":  0.6,
    "release":  1
  },
  "chirp": {
    "type": "saw",
    "cutoff": 380.278,
    "Q": 10.44300000000001,
    "keyTrack": 0,
    "envDepth": 2557.399999999998,
    "level": 0,
    "attack":  0.01000000000000004,
    "decay":    0.3500694444444451,
    "sustain":    0.08999999999999969,
    "release":    0.21777777777777863
  },
  "pluck": {
    "type": "square",
    "cutoff": 343.35200000000003,
    "Q": 11.532000000000012,
    "keyTrack": 0,
    "envDepth": 1306.3999999999974,
    "level": 0,
    "adsr": [
      0.01,
      0.4,
      0.5,
      0.8
    ]
  },
  "flute": {
    "type": "tri",
    "cutoff": 20,
    "Q": 0,
    "keyTrack": 0,
    "envDepth": 2197.4000000000037,
    "level": 0,
    "adsr": [
      0.8402777777777787,
      1,
      1,
      1
    ]
  },
  "drone": {
    "type": "saw",
    "cutoff": 435.3276799999999,
    "Q": 14.700000000000012,
    "keyTrack": 0,
    "envDepth": 8.600000000001046,
    "level": 0.5041000000000002,
    "adsr": [
      0.8402777777777787,
      1,
      1,
      1
    ]
  },
  "piano": {
    "type": "saw",
    "cutoff": 100,
    "Q": 0.0,
    "keyTrack": 1,
    "envDepth": 1200,
    "level": 0,
    "attack": 0.005,
    "decay": 0.5,
    "sustain": 0.3,
    "release": 0.1
  },
  "guitar": {
    "type": "square",
    "cutoff": 800,
    "Q": 0.3,
    "keyTrack": 0.3,
    "envDepth": 1800,
    "level": 0,
    "attack": 0.002,
    "decay": 0.7,
    "sustain": 0.05,
    "release": 0.1
  },
  "flute": {
    "type": "tri",
    "cutoff": 950,
    "Q": 11,
    "keyTrack": 1.0,
    "envDepth": 0,
    "level": 0,
    "attack": 0.2,
    "decay": 0.2,
    "sustain": 0.9,
    "release": 0.4
  },
  "brass": {
    "type": "saw",
    "cutoff": 600,
    "Q": 0.5,
    "keyTrack": 0.6,
    "envDepth": 1300,
    "level": 0,
    "attack": 0.1,
    "decay": 0.3,
    "sustain": 0.7,
    "release": 0.6
  },
  "bowedString": {
    "type": "square",
    "cutoff": 1100,
    "Q": 0.1,
    "keyTrack": 0.5,
    "envDepth": 1000,
    "level": 0,
    "attack": 0.4,
    "decay": 0.4,
    "sustain": 0.8,
    "release": 0.5
  },
  "banjo": {
    "type": "square",
    "cutoff": 1200,
    "Q": 4,
    "keyTrack": 0.4,
    "envDepth": 3000,
    "level": 0,
    "attack": 0.001,
    "decay": 0.15,
    "sustain": 0.0,
    "release": 0.15
  },
  "marimba": {
    "type": "tri",
    "cutoff": 400,
    "Q": 2,
    "keyTrack": 1,
    "envDepth": 4000,
    "level": 0.0,
    "attack": 0.001,
    "decay": 0.08,
    "sustain": 0.0,
    "release": 0.1
  }
};;

const paramDefinitions = (synth) => [

    { 
        name: 'shape', type: 'vco', 
        min: 0, max: .95, curve: 1, 
        callback: function(x, time = null) {
            if (time) {
                synth._pulseWidthMain.setValueAtTime(x, time);
            } else  synth._pulseWidthMain.value = x; } 
    },

    { 
        name: 'rate', type: 'vcf', 
        min: 0, max: 20, curve: 2, 
        callback: function(x, time = null) {
            if (time) {
                synth._lfo.frequency.setValueAtTime(x, time);
            } else  synth._lfo.frequency.value = x; } 
    },

    { 
        name: 'depth', type: 'vcf', 
        min: 0, max: .95, curve: 1, 
        callback: function(x, time = null) {
            if (time) {
                synth._lfo.amplitude.setValueAtTime(x, time);
            } else  synth._lfo.amplitude.value = x; } 
    },

    { 
        name: 'cutoff', type: 'vcf', 
        min: 20, max: 10000, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.cutoffSig, 
        callback: function(x, time = null) {
            if (time) {
                synth.cutoffSig.setValueAtTime(x, time);
            } else {
                synth.cutoffSig.value = x;
            }
        }
    },
    { 
        name: 'Q', type: 'vcf', 
        min: 0, max: 30, curve: 2, 
        callback: function(x, time = null) {
            if (time) {
                synth.vcf.Q.setValueAtTime(x, time);
            } else  synth.vcf.Q.value = x; } 
    },

    { 
        name: 'keyTrack', type: 'vcf', 
        min: 0, max: 2, curve: 1, 
        callback: function(x, time = null) {
            if (time) {
                synth.keyTracker.factor.setValueAtTime(x, time);
            } else  synth.keyTracker.factor.value = x; } },
    { 
        name: 'envDepth', type: 'hidden', 
        min: -1000, max: 5000, curve: 2, 
        callback: function(x, time = null) {
            if (time) {
                synth.vcf_env_depth.factor.setValueAtTime(x, time);
            } else synth.vcf_env_depth.factor.value = x; } },
    { 
        name: 'level', type: 'hidden', 
        min: 0, max: 1, curve: 2, value: 1, 
        callback: function(x, time = null) {
            if (time) {
                synth.output.setValueAtTime(x, time);
            } else  synth.output.value = x; } },
    { 
        name: 'attack', type: 'vca', 
        min: 0, max: 4, curve: 2, value: 0.4, 
        callback: function(x) { synth.env.attack = x; } },
    { 
        name: 'decay', type: 'hidden', 
        min: 0, max: 1, curve: 2, value: 0.1, 
        callback: function(x) { synth.env.decay = x; } },
    { 
        name: 'sustainTime', type: 'hidden', 
        min: 0, max: 1, curve: 2, value: 1, 
        callback: function(x) { synth.env.sustain = x; } },
    { 
        name: 'release', type: 'vca', 
        min: 0, max: 10, curve: 2, value: 1, 
        callback: function(x) { synth.env.release = x; } }
];

paramDefinitions;

/*
Twinkle

Single vco monosynth
* vco->vcf->vca->output

*/

;
;
;

;
;

 
class Strings extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
		this.presets = presets
		this.synthPresetName = "StringsPresets"
		//this.accessPreset()
    this.isGlide = false
    this.name = "Strings"
    this.guiHeight = 0.5
    this.layout = basicLayout
    //console.log(this.name, " loaded, available preset: ", this.presets)

    // Initialize the main frequency control
    this.frequency = new Tone.Signal(200);

    // VCOs
    this.vco = new Tone.Oscillator({ type:'triangle'}).start();
    this.frequency.connect(this.vco.frequency)
    this._vcoMain = new Tone.Oscillator().start();
    this.frequency.connect(this._vcoMain.frequency)

    //WAVESHAPER
    this._waveShaper = new Tone.WaveShaper()
    this.vco.connect(this._waveShaper);
    this._waveShaperMain = new Tone.WaveShaper()
    this._vcoMain.connect(this._waveShaperMain);
    this._waveShaper.setMap( x=> Math.tanh(x*15))
    this._waveShaperMain.setMap( x=> Math.tanh(x*15))

    //PWM
    this._lfo = new Tone.LFO({type:'triangle'}).start()
    this._lfo.connect(this._waveShaper)
    this._lfo.amplitude.value = 0.2
    this._pulseWidthMain = new Tone.Signal()
    this._pulseWidthMod = new Tone.Signal()
    this._pulseWidthMain.connect(this._waveShaperMain)
    this._pulseWidthMod.connect(this._waveShaper)

    // VCF
    this.vcf = new Tone.Filter({type:"lowpass", rolloff:-12});
    this._waveShaper.connect(this.vcf);
    this._waveShaperMain.connect(this.vcf)

    // VCF, VCA, output
    this.vca = new Tone.Multiply()
    this.vcf.connect(this.vca)
    this.output = new Tone.Multiply(1)
    this.vcf.connect(this.vca)
    this.vca.connect(this.output)

    // VCA control
    this.vca_lvl = new Tone.Signal();
    this.vca_lvl.connect(this.vca.factor)
    this.env = new Tone.Envelope();
    this.env.attackCurve = 'linear'
    this.env.releaseCurve = 'linear'
    this.env.decayCurve = 'exponential'
    this.env_depth = new Tone.Multiply()
    this.env.connect(this.env_depth)
    this.env_depth.connect(this.vca.factor)
    this.velocitySig = new Tone.Signal(1)
    this.velocitySig.connect(this.env_depth.factor)

    //vcf control
    this.cutoffSig = new Tone.Signal(1000);
    this.cutoff_cv = new Tone.Signal(0);
    this.vcf_env_depth = new Tone.Multiply(500);
    this.keyTracker = new Tone.Multiply(0)
    this.env.connect(this.vcf_env_depth)
    this.vcf_env_depth.connect(this.vcf.frequency)
    this.cutoffSig.connect(this.vcf.frequency)
    this.cutoff_cv.connect(this.vcf.frequency)
    this.frequency.connect(this.keyTracker)
    this.keyTracker.connect(this.vcf.frequency)

    // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    //console.log(this.paramDefinitions)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
    setTimeout(()=>{this.loadPreset('default')}, 500);
  }//constructor

  //envelopes
  triggerAttack (freq, amp, time=null){
    freq = Theory.mtof(freq)
    amp = amp/127
    if(time){
      this.env.triggerAttack(time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.linearRampToValueAtTime(amp, time + 0.01);
    } else {
      this.env.triggerAttack()
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }
  triggerRelease (time=null){
    if(time) {
    	this.env.triggerRelease(time)
    }
    else {
      this.env.triggerRelease()
    }
  }
  triggerAttackRelease (freq, amp, dur=0.01, time=null){
    freq = Theory.mtof(freq)
    //console.log('f', freq, amp, dur, time)
    amp = amp/127
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.frequency.setValueAtTime(freq, time)
      //this.velocitySig.cancelScheduledValues(time);
      this.velocitySig.setTargetAtTime(amp, time, 0.005); // 0.03s time constant for smoother fade
      //this.velocitySig.linearRampToValueAtTime(amp, time + 0.005);
    } else{
      this.env.triggerAttackRelease(dur)
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }//attackRelease

  triggerRawAttack (freq, amp=1, time=null){
    if(amp > 1) amp = 1
    if(time){
      this.env.triggerAttack(time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.linearRampToValueAtTime(amp, time + 0.01);
    } else {
      this.env.triggerAttack()
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }
  triggerRawRelease (time=null){
    if(time) {
      this.env.triggerRelease(time)
    }
    else {
      this.env.triggerRelease()
    }
  }
  triggerRawAttackRelease (freq, amp=1, dur=0.01, time=null){
    if(amp > 1) amp = 1
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.frequency.setValueAtTime(freq, time)
      //this.velocitySig.cancelScheduledValues(time);
      this.velocitySig.setTargetAtTime(amp, time, 0.005); // 0.03s time constant for smoother fade
      //this.velocitySig.linearRampToValueAtTime(amp, time + 0.005);
    } else{
      this.env.triggerAttackRelease(dur)
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }//attackRelease
}

/*
Stripe.js

output channel strip
input=>eq->gain->output, gain->send

methods:
- setEQ(low,mid,hi): note gain in dB
- seqEQBands(low,hi) set hi and low crossover
- setSendLevel()
- setGain()
- connect()
*/

;
;

class Stripe{
	constructor(){
		this.input = new Tone.Multiply(1)
		this.eq = new Tone.EQ3()
		this.gain = new Tone.Multiply(1)
		this.send = new Tone.Multiply(0)
		this.output = new Tone.Multiply(1)

		this.input.connect(this.eq)
		this.eq.connect(this.gain)
		this.gain.connect(this.send)
		this.gain.connect(this.output)
	}
	setEQ(low,mid,hi){
		this.eq.high.value = hi
		this.eq.mid.value = mid
		this.eq.low.value = low
	}
	setEQBands(low,hi){
		if(low < 10 || hi < 10){
			console.log('EQ bands are in Hz')
			return;
		}
		this.eq.highFrequency.value = hi
		this.eq.lowFrequency.value = low
	}
	setSendLevel(val){
		this.send.factor.value = val
	}
	setGain(val){
		this.gain.factor.value = val
	}
	connect(destination) {
		if (destination.input) {
		  this.output.connect(destination.input);
		} else {
		  this.output.connect(destination);
    }
  }
}

const paramDefinitions = (synth) => [
  {
    name: "name",
    type: "input",
    value: 'Sympathy',
    max: 'Sympathy', default: 'Sympathy'
  },
  {
    name: "level",
    type: "input",
    min: 0,
    max: 1,
    default: .2,
    curve: 2,
    callback: (value) => {
      synth.input.gain.rampTo(value*1, .1);
    }
  },
  {
    name: "hipass",
    type: "param",
    min: 20,
    max: 10000,
    default: 100,
    curve: 2,
    callback: (value) => {
      synth.hpf.frequency.rampTo(value, .1);
    }
  },
  {
    name: "damping",
    type: "param",
    min: 20,
    max: 10000,
    default: 5000,
    curve: 2,
    callback: (value) => {
      synth.setDamping(value)
    }
  },
  {
    name: "freq", type: 'param', min: 10, max: 1000, curve: 2,
    callback(x) { 
        synth.setFrequencies(x); 
    }
  },
  {
    name: "detune", type: 'param', min: 0, max: 1, curve: 1,
    callback(x) { 
        synth.setDetune(x); 
    }
  },
  {
    name: "feedback",
    type: "param",
    min: 0,
    max: 1,
    default: 0.95,
    curve: 0.5,
    callback: (val, time = null) => {
      if(val<0.2) val = (val/0.2)*0.9
      else if (val < 0.5) val = (val-0.2)/0.3 *0.08 + 0.9
      else val = (val-0.5)/0.5*0.01 + 0.99
      val = val<0 ? 0 : val>0.9999 ? 0.9999 : val
      console.log('fb', val)
      if(time){
        for(let i=0;i<synth.numStrings;i++) synth.strings[i].setFeedback(val, time)
      } else {
        for(let i=0;i<synth.numStrings;i++) synth.strings[i].setFeedback(val)
      
      }
    }
  },

  {
    name: "gain",
    type: "hidden",
    min: 0,
    max: 1,
    default: 1,
    curve: 1,
    callback: (vals,time=null)=>{
      synth.gainAmount = vals
      synth.setGains(time)
    }
  },
  {
    name: "tilt",
    type: "hidden",
    min: -1,
    max: 1,
    default: 0.,
    curve: 1,
    callback: (vals,time=null)=>{
      synth.tiltAmount = vals
      synth.setGains(time)
    }
  }

]

/*
Sympathy

Tuned delay lines for Karplus-Strong style sympathetic strings
* Individual string:
  * input->delay->vca->output
* Mixer:
  * input->hpf->EQ->vca->output
* Parameters:
  * numStrings (constructor)
  * frequencies: array
  * gains: array

methods:
- setFrequency(Hz): sets frequencies of delay lines in Hz
- setHighpass(freq, time) sets freq of hpf
- setEQ(low,mid,hi): note gain in dB
- seqEQBands(low,hi) set hi and low crossover
- connect(destination)

properties:
*/

;
;
;
// ;
;
;


class SympathyString{
	constructor(frequency = 100, amplitude = 1){

      this.delay = new Tone.LowpassCombFilter({resonance:.95,dampening:10000})
    
      this.output = new Tone.Gain(amplitude)
      //control
      this.delayTime = new Tone.Signal(.1)
      this.delayTimeScalar = new Tone.Multiply(1)
      //audio connections
      this.delay.connect(this.output)
      //delay
      this.delayTime.connect( this.delayTimeScalar)
      this.delayTimeScalar.connect( this.delay.delayTime)
	}
  setFrequency = function(val,time=null){
    //console.log(val,time)
    if(time){
      this.delayTime.linearRampToValueAtTime(1/val, time+0.001)
    } else this.delayTime.rampTo( 1/val, 0.001)
  }
  setFeedback = function(val,time=null){
    val = val<0 ? 0 : val>0.9999 ? 0.9999 : val
    if(time){
      this.delay.resonance.setValueAtTime(val, time)
    } else {
      this.delay.resonance.rampTo( val, 0.02 )
    }
  }
  setDamping = function(val){
    this.delay.dampening = val
  }
  connect(destination) {
    this.output.connect(destination);
  }
}

class Sympathy extends EffectTemplate{
  constructor(numStrings = 6, frequencies = [100,200,300,400,500,600]){
      super();
      this.presets = {}
      this.synthPresetName = "SympathyPresets"
      this.accessPreset()
      this.name = "Sympathy";
      this.layout = layout;
      this.backgroundColor = [75,0,100]
      this.curDelayTime = .1

      this.numStrings = numStrings
      this.frequencies = frequencies
      this.input = new Tone.Gain(1)
      this.hpf = new Tone.Filter({frequency: 20, type:'highpass', Q: 0})
      //this.eq = new Tone.EQ3()
      //this.vca = new Tone.Multiply(1)
      this.output = new Tone.Multiply(1)
      //control
      this.hpf_cutoff = new Tone.Signal(20)
      //audio connections
      //this.input.connect(this.hpf)
      this.hpf.connect(this.output)
      //this.eq.connect(this.vca)
      //this.vca.connect(this.output)
      //strings
      this.strings = []
      this.detuneAmount = 0
      this.tiltAmount = 0
      this.gainAmount = 1

      //make sure frequencies is long enough
      while(this.frequencies.length<this.numStrings) this.frequencies.push(this.frequencies[0])
      
      for(let i=0;i<this.numStrings;i++) {
        this.strings.push(new SympathyString(frequencies[i],1-(frequencies[i]/5000)))
        this.input.connect(this.strings[i].delay)
        this.strings[i].output.connect(this.hpf)
      }

      // Parameter definitions
      this.paramDefinitions = paramDefinitions(this);
      this.param = this.generateParameters(this.paramDefinitions);
      this.createAccessors(this, this.param);
      this.autocompleteList = this.paramDefinitions.map(def => def.name);
      this.presetList = Object.keys(this.presets)
      setTimeout(() => {
        this.loadPreset('default');
      }, 500);
  }
  setFrequencies = function(vals,time=null){
    // if(vals.length != this.numStrings){
    //   console.log("incorrect freq array size, should be ", this.numStrings)
    //   return
    // }
    if( !Array.isArray(vals)) vals = [vals]
    if(vals.length < this.numStrings){
      let div = Math.floor(this.numStrings/vals.length)
      let freqs = vals
      for(let i=0;i<this.numStrings;i++) {
        let lastVal = vals[vals.length-1]
        if(i>=vals.length) vals.push(lastVal * (i-vals.length+2))
        //vals = vals.concat(freqs.map(x=>x*(2+i)))
      }
    }

    //console.log(vals, this.detuneAmount)
    if(time){
      for(let i=0;i<this.numStrings;i++) {
        this.frequencies[i] = vals[i] //* (1 - (Math.random()-.5)*this.detuneAmount)
        this.strings[i].setFrequency(this.frequencies[i] * (1 + this.detuneAmount), time)
      }
    } else {
      for(let i=0;i<this.numStrings;i++) {
        this.frequencies[i] = vals[i] 
        this.strings[i].setFrequency(this.frequencies[i] * (1 + this.detuneAmount))
      }
    }
  }
  setDetune = function(val){
    this.detuneAmount = this.detuneFocusCurve(val)
    this.setFrequencies(this.frequencies)
  }
  setFeedback = function(val,time=null){
    val = val<0 ? 0 : val>0.9999 ? 0.9999 : val
    if(time){
      for(let i=0;i<this.numStrings;i++) this.strings[i].setFeedback(val, time)
    } else {
      for(let i=0;i<this.numStrings;i++) this.strings[i].setFeedback(val)
    }
  }
  setGains = function(time=null){
    let gains = new Array(this.numStrings)
    let vals = this.gainAmount
    if(!Array.isArray(vals)) vals = [vals,vals]

    if(vals.length < this.numStrings){
      let low = vals[0]
      let high = vals[vals.length-1]
      let step = (high-low)/(this.numStrings-1)
      for(let i=0;i<this.numStrings;i++){
        gains[i] = low + step*i
      }
    } else gains = vals

    let tilts = Array.from({length:this.numStrings},(x,i)=>{
      let v = 0
      let t = this.tiltAmount/( this.numStrings-1)
      if(t < 0) v = 1 + t*i
      else v = 1-(this.numStrings-1-i)*t
      return v
    })

    gains = gains.map((x,i)=>x*tilts[i]*gains[0])
    console.log(this.gainAmount, gains.map(x=>x.toFixed(2)), tilts)
    if(time){
      for(let i=0;i<this.numStrings;i++) this.strings[i].output.gain.exponentialRampToValueAtTime(gains[i],.1)
    } else {
      for(let i=0;i<this.numStrings;i++) this.strings[i].output.gain.rampTo( gains[i], 0.01)
    }
  }
  setDamping = function(val){
    for(let i=0;i<this.numStrings;i++) this.strings[i].delay.dampening = val
  }
  setHighpass = function(val){this.hpf.frequency.value = val }
  // setEQ(low,mid,hi){
  //   this.eq.high.value = hi
  //   this.eq.mid.value = mid
  //   this.eq.low.value = low
  // }
  // setEQBands(low,hi){
  //   if(low < 10 || hi < 10){
  //     console.log('EQ bands are in Hz')
  //     return;
  //   }
  //   this.eq.highFrequency.value = hi
  //   this.eq.lowFrequency.value = low
  // }

  detuneFocusCurve(x) {
    // Center at 1, 1.5, 2 with slight flattening using tanh or logistic smoothing
    // Use a weighted sum of bumps
    const centerVals = [0, 0.5, 1];
    const numDivisions = centerVals.length - 1;
    const divisionSize = 1 / numDivisions;

    const sigmoid = (x) => 1 / (1 + Math.exp(-x * 10)); // steeper sigmoid

      for (let i = 0; i < numDivisions; i++) {
        const start = i * divisionSize;
        const end = (i + 1) * divisionSize;
        const center = centerVals[i + 1];

        if (x >= start && x < end) {
          const normalized = (x - start) / divisionSize; // maps to 0–1
          const curved = sigmoid(normalized * 2 - 1);     // sigmoid centered at 0
          return start + curved * divisionSize;          // remap to original range
        }
      }
      return x; // fallback
  }
}

/*
ToneWood

convolution engine
* input->gain->convolver->waveShaper->output

methods:
- load(url) loads an IR
- filterIR: applies a lowpass to the IR, destructive
- highpassIR: applies a highpass to the IR, destructive
- stretchIR: stretches the IR
- ampIR: amplifies the IR into a softclipper

properties:
- gain.factor.value
*/

;
;

class ToneWood {
  constructor(gui = null) {
    this.gui = gui;
    this.input = new Tone.Multiply(1);
    this.gain = new Tone.Multiply(1)
    this.waveShaper = new Tone.WaveShaper((x)=>{
      return Math.tanh(x)
    })
    this.convolver = new Tone.Convolver();
    this.output = new Tone.Multiply(1);
    // Buffer
    this.buffer = null;
    // Audio connections
    this.input.connect(this.gain);
    this.gain.connect( this.convolver);
    this.waveShaper.connect( this.output);
    this.convolver.connect(this.waveShaper);
    this.convolver.normalize = true
  }

  load(url) {
    return new Promise((resolve, reject) => {
      new Tone.Buffer(url, (buffer) => {
        this.buffer = buffer;
        this.convolver.buffer = buffer
        resolve();
      }, reject);
    });
  }

  async filterIR(filterFreq) {
    if (!this.buffer) {
      console.error('Buffer not loaded.');
      return;
    }
    
    const context = Tone.getContext().rawContext;
    const duration = this.buffer.duration;
    const offlineContext = new OfflineAudioContext(2, duration * context.sampleRate, context.sampleRate);
    
    // Use the buffer directly from Tone.Buffer
    const decodedData = this.buffer.get();

    const source = offlineContext.createBufferSource();
    source.buffer = decodedData; // Use the buffer directly.
    
    // Example transformation: apply a filter (this could be more complex, including stretching)
    const filter = offlineContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    
    source.connect(filter);
    filter.connect(offlineContext.destination);
    
    source.start(0);
    
    return new Promise((resolve, reject) => {
      offlineContext.startRendering().then((renderedBuffer) => {
        // Use the rendered buffer as a new Tone.Buffer
        const newBuffer = new Tone.Buffer(renderedBuffer);
        this.buffer = newBuffer
        this.convolver.buffer = newBuffer; // Load it into the convolver
        resolve();
      }).catch(reject);
    });
  }//filter

  async stretchIR(stretchAmt) {
    if (!this.buffer) {
      console.error('Buffer not loaded.');
      return;
    }
    
    const context = Tone.getContext().rawContext;
    const duration = this.buffer.duration;
    const offlineContext = new OfflineAudioContext(2, duration * stretchAmt * context.sampleRate, context.sampleRate);
    
    // Use the buffer directly from Tone.Buffer
    const decodedData = this.buffer.get();

    const source = offlineContext.createBufferSource();
    source.buffer = decodedData; // Use the buffer directly.

    // Apply time-stretching by adjusting the playback rate
    source.playbackRate.value = 1/stretchAmt; // Adjust the playback rate based on the stretchVal
    source.connect(offlineContext.destination);
    source.start(0);
    
    return new Promise((resolve, reject) => {
      offlineContext.startRendering().then((renderedBuffer) => {
        // Use the rendered buffer as a new Tone.Buffer
        const newBuffer = new Tone.Buffer(renderedBuffer);
        this.buffer = newBuffer
        this.convolver.buffer = newBuffer; // Load it into the convolver
        resolve();
      }).catch(reject);
    });
  }//stretch

  async highpassIR(filterFreq) {
    if (!this.buffer) {
      console.error('Buffer not loaded.');
      return;
    }
    
    const context = Tone.getContext().rawContext;
    const duration = this.buffer.duration;
    const offlineContext = new OfflineAudioContext(2, duration * context.sampleRate, context.sampleRate);
    
    // Use the buffer directly from Tone.Buffer
    const decodedData = this.buffer.get();

    const source = offlineContext.createBufferSource();
    source.buffer = decodedData; // Use the buffer directly.
    
    // Example transformation: apply a filter (this could be more complex, including stretching)
    const filter = offlineContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = filterFreq;
    
    source.connect(filter);
    filter.connect(offlineContext.destination);
    
    source.start(0);
    
    return new Promise((resolve, reject) => {
      offlineContext.startRendering().then((renderedBuffer) => {
        // Use the rendered buffer as a new Tone.Buffer
        const newBuffer = new Tone.Buffer(renderedBuffer);
        this.buffer = newBuffer
        this.convolver.buffer = newBuffer; // Load it into the convolver
        resolve();
      }).catch(reject);
    });
  }//highpass

  //NOTE: changing amp and waveshaping never worked as expected
  // async ampIR(gainVal) {
  //   if (!this.buffer) {
  //     console.error('Buffer not loaded.');
  //     return;
  //   }
    
  //   const context = Tone.getContext().rawContext;
  //   const duration = this.buffer.duration;
  //   const offlineContext = new OfflineAudioContext(2, duration * context.sampleRate, context.sampleRate);
    
  //   // Use the buffer directly from Tone.Buffer
  //   const decodedData = this.buffer.get();

  //   const source = offlineContext.createBufferSource();
  //   source.buffer = decodedData; // Use the buffer directly.
    
  //   // Create a Multiply node
  //   const gain = offlineContext.createGain();
  //   gain.gain.value = gainVal
  //   console.log(gainVal, gain.gain.value)

  //   // Correct setup for WaveShaper node
  //   const waveShaper = offlineContext.createWaveShaper();
  //   waveShaper.curve = this.generateWaveShaperCurve(256); // Example length, adjust as needed
  //   waveShaper.oversample = '4x'; // Optional: Apply oversampling to reduce aliasing


  //   // Connect the nodes
  //   source.connect(gain);
  //   source.connect(waveShaper);
  //   waveShaper.connect(offlineContext.destination);
    
  //   source.start(0);
    
  //   return new Promise((resolve, reject) => {
  //     offlineContext.startRendering().then((renderedBuffer) => {
  //       // Use the rendered buffer as a new Tone.Buffer
  //       const newBuffer = new Tone.Buffer(renderedBuffer);
  //       this.buffer = newBuffer
  //       this.convolver.buffer = newBuffer; // Load it into the convolver
  //       resolve();
  //     }).catch(reject);
  //   });
  // }//amp

  // generateWaveShaperCurve(length = 256) {
  //   const curve = new Float32Array(length);
  //   for (let i = 0; i < length; i++) {
  //     let x = (i * 2) / length - 1; //convert to -1,1
  //     //curve[i] = Math.tanh(x*128); // Adjust this function as needed
  //     curve[i] = x>0 ? 1 : -0; 
  //     //curve[i] = x
  //   }
  //   console.log(curve)
  //   return curve;
  // }

  connect(destination) {
    this.output.connect(destination);
  }
}


const paramDefinitions = (synth) => [

    { 
        name: 'type', type: 'vco', value: 'square', 
        radioOptions: ['square', 'saw', 'tri'], 
        callback: function(x) {
            switch (x) {
                case 'square': synth.vco.type = 'pulse'; break;
                case 'saw': synth.vco.type = 'sawtooth'; break;
                case 'tri': synth.vco.type = 'triangle'; break;
            }
        }
    },
    { 
        name: 'cutoff', type: 'vcf', 
        min: 20, max: 10000, curve: 2,
        isSignal: 'true', connectTo: synth=>synth.cutoffSig, 
        callback: function(x, time = null) {
            if (time) {
                synth.cutoffSig.setValueAtTime(x, time);
            } else {
                synth.cutoffSig.value = x;
            }
        }
    },
    { 
        name: 'Q', type: 'vcf', 
        min: 0, max: 30, curve: 2, 
        callback: function(x, time = null) {
            if (time) {
                synth.vcf.Q.setValueAtTime(x, time);
            } else  synth.vcf.Q.value = x; } 
    },
    { 
        name: 'keyTrack', type: 'hidden', 
        min: 0, max: 2, curve: 1, 
        callback: function(x, time = null) {
            if (time) {
                synth.keyTracker.factor.setValueAtTime(x, time);
            } else  synth.keyTracker.factor.value = x; } },
    { 
        name: 'envDepth', type: 'vcf', 
        min: -1000, max: 5000, curve: 2, 
        callback: function(x, time = null) {
            if (time) {
                synth.vcf_env_depth.factor.setValueAtTime(x, time);
            } else synth.vcf_env_depth.factor.value = x; } },
    { 
        name: 'level', type: 'hidden', 
        min: 0, max: 1, curve: 2, value: 0, 
        callback: function(x, time = null) {
            if (time) {
                synth.vca_lvl.setValueAtTime(x, time);
            } else  synth.vca_lvl.value = x; } },
    { 
        name: 'attack', type: 'vca', 
        min: 0, max: 1, curve: 2, value: 0.01, 
        callback: function(x) { synth.env.attack = x; } },
    { 
        name: 'decay', type: 'vca', 
        min: 0, max: 1, curve: 2, value: 0.1, 
        callback: function(x) { synth.env.decay = x; } },
    { 
        name: 'sustain', type: 'vca', 
        min: 0, max: 1, curve: 2, value: 0.5, 
        callback: function(x) { synth.env.sustain = x; } },
    { 
        name: 'release', type: 'vca', 
        min: 0, max: 1, curve: 2, value: 0.5, 
        callback: function(x) { synth.env.release = x; } }
];

paramDefinitions;

/*
Twinkle

Single vco monosynth
* vco->vcf->vca->output

*/

;
;
;

;
;

 
class Twinkle extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
		this.presets = TwinklePresets
		this.synthPresetName = "TwinklePresets"
		//this.accessPreset()
    this.isGlide = false
    this.name = "Twinkle"
    this.guiHeight = 0.5
    this.layout = basicLayout
    //console.log(this.name, " loaded, available preset: ", this.presets)

    // Initialize the main frequency control
    this.frequency = new Tone.Signal(200);

    // VCOs
    this.vco = new Tone.OmniOscillator({ type:'pulse'}).start();
    this.frequency.connect(this.vco.frequency)

    // VCF
    this.vcf = new Tone.Filter({type:"lowpass", rolloff:-24});
    this.vco.connect(this.vcf);

    // VCF, VCA, output
    this.vca = new Tone.Multiply()
    this.vcf.connect(this.vca)
    this.output = new Tone.Multiply(1)
    this.vcf.connect(this.vca)
    this.vca.connect(this.output)

    // VCA control
    this.vca_lvl = new Tone.Signal();
    this.vca_lvl.connect(this.vca.factor)
    this.env = new Tone.Envelope();
    this.env.releaseCurve = 'linear'
    this.env.decayCurve = 'exponential'
    this.env_depth = new Tone.Multiply()
    this.env.connect(this.env_depth)
    this.env_depth.connect(this.vca.factor)
    this.velocitySig = new Tone.Signal(1)
    this.velocitySig.connect(this.env_depth.factor)

    //vcf control
    this.cutoffSig = new Tone.Signal(1000);
    this.cutoff_cv = new Tone.Signal(0);
    this.vcf_env_depth = new Tone.Multiply(500);
    this.keyTracker = new Tone.Multiply(.1)
    this.env.connect(this.vcf_env_depth)
    this.vcf_env_depth.connect(this.vcf.frequency)
    this.cutoffSig.connect(this.vcf.frequency)
    this.cutoff_cv.connect(this.vcf.frequency)
    this.frequency.connect(this.keyTracker)
    this.keyTracker.connect(this.vcf.frequency)

    // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    //console.log(this.paramDefinitions)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
    setTimeout(()=>{this.loadPreset('default')}, 500);
  }//constructor

  //envelopes
  triggerAttack (freq, amp, time=null){
    freq = Theory.mtof(freq)
    amp = amp/127
    if(time){
      this.env.triggerAttack(time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.linearRampToValueAtTime(amp, time + 0.01);
    } else {
      this.env.triggerAttack()
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }
  triggerRelease (time=null){
    if(time) {
    	this.env.triggerRelease(time)
    }
    else {
      this.env.triggerRelease()
    }
  }
  triggerAttackRelease (freq, amp, dur=0.01, time=null){
    freq = Theory.mtof(freq)
    //console.log('f', freq)
    amp = amp/127
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.frequency.setValueAtTime(freq, time)
      //this.velocitySig.cancelScheduledValues(time);
      this.velocitySig.setTargetAtTime(amp, time, 0.005); // 0.03s time constant for smoother fade
      //this.velocitySig.linearRampToValueAtTime(amp, time + 0.005);
    } else{
      this.env.triggerAttackRelease(dur)
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }//attackRelease

  triggerRawAttack (freq, amp=1, time=null){
    if(amp > 1) amp = 1
    if(time){
      this.env.triggerAttack(time)
      this.frequency.setValueAtTime(freq, time)
      this.velocitySig.linearRampToValueAtTime(amp, time + 0.01);
    } else {
      this.env.triggerAttack()
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }
  triggerRawRelease (time=null){
    if(time) {
      this.env.triggerRelease(time)
    }
    else {
      this.env.triggerRelease()
    }
  }
  triggerRawAttackRelease (freq, amp=1, dur=0.01, time=null){
    if(amp > 1) amp = 1
    if(time){
      this.env.triggerAttackRelease(dur, time)
      this.frequency.setValueAtTime(freq, time)
      //this.velocitySig.cancelScheduledValues(time);
      this.velocitySig.setTargetAtTime(amp, time, 0.005); // 0.03s time constant for smoother fade
      //this.velocitySig.linearRampToValueAtTime(amp, time + 0.005);
    } else{
      this.env.triggerAttackRelease(dur)
      this.frequency.value = freq
      this.velocitySig.rampTo(amp,.03)
    }
  }//attackRelease
}

const paramDefinitions = (synth) => [
{

	}
]

paramDefinitions;


/*
Vocoder

Single vco monosynth
* vco->vcf->vca->output

*/

;
// ;
;

;
;

class Vocoder extends MonophonicTemplate {
  constructor (gui = null) {
    super()
    this.gui = gui
		this.presets = {}
		this.synthPresetName = "VocoderPresets"
		this.accessPreset()
    this.isGlide = false
    this.name = "Vocoder"


    // Assume you already have an input and it's connected to the audio context
    this.mic = new Tone.UserMedia();
    this.inputGain = new Tone.Gain(1)
    this.mic.open();
    this.mic.connect(this.inputGain);

    // Carrier source (can be noise or oscillator)
    //this.carrier = new Tone.Noise("white").start();
    this.carrier = new Tone.PulseOscillator(100).start()
    this.noise = new Tone.Noise({volume:-48}).start()
    this.carrierGain = new Tone.Gain(0.5)
    this.output = new Tone.Gain(1)
    this.carrierGain.connect(this.output)
    this.external = new Tone.Multiply(1)

    // Use a set of bandpass filters and VCAs to reconstruct the signal
    this.numBands = 16;
    this.analysisBands = []
    this.bands = [];
    this.logFrequencies = [...Array(this.numBands)].map((_, i) =>
      100 * Math.pow(2, i * (Math.log2(5000 / 100) / (this.numBands - 1)))
    ); // log-spaced from 100 Hz to 8 kHz

    this.centerFrequencies = this.logFrequencies
    this.moogFrequencies = [50,159,200,252,317,400,504,635,800,1008,1270,1600,2016,2504,3200,4032,5080]
    this.rolandFrequencies = [100, 140, 200, 280, 400, 560, 800, 1000, 1300, 1600, 2000, 2500, 3200, 4000, 4500, 5000]
    this.emsFrequencies = [70, 100, 140, 200, 280, 400, 560, 800, 1120, 1400, 1800, 2240, 2800, 3600, 5000, 7500]
    this.sennheiserFrequencies = [80, 120, 180, 250, 350, 500, 700, 1000, 1400, 1800, 2500, 3200, 4000, 5000, 6000, 7000]

    this.centerFrequencies.forEach(freq => {
      const filterA = new Tone.Filter({frequency:freq, type:"bandpass",Q:10});
      const follower = new Tone.Follower(0.05); // attack/release in seconds
      filterA.connect(follower)
      this.inputGain.connect(filterA)
      this.analysisBands.push({ filterA, follower, freq });

      const filter = new Tone.Filter({frequency:freq, type:"bandpass",Q:10});
      const gain = new Tone.Gain(0).connect(this.carrierGain);
      this.carrier.connect(filter);
      this.external.connect(filter);
      this.noise.connect(filter);
      filter.connect(gain);
      follower.connect(gain.gain)
      this.bands.push({ filter, gain, freq });
    });

    // // Update gains based on FFT values
    // this.loop = new Tone.Loop((time) => {
    //   const spectrum = this.fft.getValue(); // returns an array of decibel values
    //   this.bands.forEach(({ gain, freq }, i) => {
    //     // Map frequency to closest bin
    //     const index = Math.round((freq / (Tone.context.sampleRate / 2)) * (fftSize / 2));
    //     const amp = Tone.dbToGain(spectrum[index] || -Infinity);
    //     //console.log(freq,index,amp)
    //     gain.gain.rampTo( amp, .02);
    //   });
    //   //console.log(this.bands[4]['gain'].gain.value)
    // }, 0.025); // you may need to experiment with timing resolution

    // Bind parameters with this instance
    this.paramDefinitions = paramDefinitions(this)
    this.param = this.generateParameters(this.paramDefinitions)
    this.createAccessors(this, this.param);

    //for autocomplete
    this.autocompleteList = this.paramDefinitions.map(def => def.name);;
    //for(let i=0;i<this.paramDefinitions.length;i++)this.autocompleteList.push(this.paramDefinitions[i].name)
    setTimeout(()=>{this.loadPreset('default')}, 500);
  }//constructor

  setQs(newQ) {
    this.analysisBands.forEach(b => b.filterA.Q.value = newQ);
    this.bands.forEach(b => b.filter.Q.value = newQ);
  }

  setFrequencies(newFrequencies) {
    this.centerFrequencies = newFrequencies;

    newFrequencies.forEach((freq, i) => {
      if (this.analysisBands[i]) {
        this.analysisBands[i].filterA.frequency.value = freq;
        this.analysisBands[i].freq = freq;
      }
      if (this.bands[i]) {
        this.bands[i].filter.frequency.value = freq;
        this.bands[i].freq = freq;
      }
    });
  }

  setFollowerAttackRelease(attack, release) {
    this.analysisBands.forEach((b, i) => {
      // b.follower is not stored — you'll want to do that in your loop.
      if (b.follower) {
        b.follower.attack = attack;
        b.follower.release = release;
      }
    });
  }
}

;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
//* from './waveshapers.js';
;
;
;
;
;
;
;
;
;
;
;
;

;

;
;
;
;
;
// ;






function hardClip(value){
  return Math.max(Math.min(value*4,1),-1)
}
function softClip(value){
  return Math.tanh(value*4) 
}
function hardSync(value){
  value *= 8
  if(value > 0) return value%1 
  else if (value <0) return Math.abs(value)%1*-1 
  else return 0
}
function pwm(x){
  //return x
  //x = Math.pow(Math.abs(x/2+.5),.5)
 // x=Math.abs(x)<.3 ? .25*Math.sign(x): x
  //console.log(x)
  return x > .05 ? 1 : -1;
}
function sawToTri(value){
  value *= 2.3
  if(Math.abs(value) <= 1) return value
  if(value > 1) return 2-value
  if (value < -1) return -2-value 
}
function triangleFolder(value){
  value = Math.abs(value*8 + 0.5)
  if( Math.floor(value%2) == 0 ) {
    return (value%1) * 2 - 1
  } else{
    return (1 - (value%1)) * 2 - 1
  }
}
function sineFolder(value){
  return Math.sin(value * Math.PI * 8);
}
function pseudorandom(value){
  let seed = (Math.abs(value)-.0)*7
  const pseudoRandom = ((seed * 9187543225 + 12345) % 4294967296) / 4294967296;
  return pseudoRandom * 2 - 1
}

/**
 * CircularVisualizer - A simple circular array visualization
 *
 * Usage:
 *   s.sequence('0', '16n', 0)
 *   let c = new CircularVisualizer(s.seq[0], gui, { synth: s })
 *   // That's it! Automatically sets up callback and enables
 *
 * Custom position, size, and color:
 *   let c = new CircularVisualizer(s.seq[0], gui, {
 *     synth: s,
 *     x: 25,  // Percentage from left (0-100), like other GUI elements
 *     y: 50,  // Percentage from top (0-100)
 *     size: 0.5,  // Size parameter (same as knobs) - scales like GUI elements
 *     currentColor: { r: 0, g: 255, b: 0 }  // Green instead of red
 *   })
 *
 * - Uses percentage-based coordinates (0-100) like other GUI elements
 * - Scales automatically with canvas size
 * - Subdivides circle into equal segments
 * - All notes visible in grayscale (darker = lower note, lighter = higher note)
 * - Current beat highlighted in customizable color (default red)
 */
class CircularVisualizer {
    constructor(parent, gui, options = {}) {
        this.parent = parent  // The sequence object (s.seq[0])
        this.gui = gui
        this.synth = options.synth || (parent && parent.parent) || null  // The synth that owns the sequence
        this._enabled = false

        // Position & size (now using percentage like other GUI elements: 0-100)
        this.x = options.x !== undefined ? options.x : null  // null = auto center, otherwise percentage (0-100)
        this.y = options.y !== undefined ? options.y : null  // null = auto center, otherwise percentage (0-100)

        // Size parameter (like knobs) - scales the same way as GUI knobs
        // If size is provided, use it directly; if diameter is provided, convert it; otherwise use default
        // Knob formula: diameter = (size / 6) * canvasWidth / 2
        // To convert diameter (as percentage) to size: size = (diameter / 100) * 12
        // Default size of 2.5 gives approximately 20.8% of canvas width (bigger default size)
        if (options.size !== undefined) {
            this.size = options.size  // Use size parameter directly (e.g., size: 0.5)
        } else if (options.diameter !== undefined) {
            // Convert diameter percentage to size parameter for backward compatibility
            this.size = (options.diameter / 100) * 12
        } else {
            this.size = 2.5  // Default size (gives ~20.8% of canvas width - bigger by default)
        }

        // Visual style
        this.separatorWeight = options.separatorWeight || 0.5
        this.showSeparators = options.showSeparators !== undefined ? options.showSeparators : true

        // Color config
        this.currentColor = options.currentColor || { r: 255, g: 0, b: 0 }  // Red for current beat (customizable)
        this.separatorColor = options.separatorColor || { r: 255, g: 255, b: 255 }  // White separators

        // Original gui.draw
        this._originalGuiDraw = null

        // Auto-enable and set up callback
        this.enable()
        this.setupCallback()
    }

    /**
     * Calculate normalized values (min-max normalization)
     */
    normalizeArray(array) {
        if (array.length === 0) return array

        // Convert all values to numbers (handles strings like '0', '5', etc.)
        const numericArray = array.map(v => {
            const num = Number(v)
            return isNaN(num) ? 0 : num
        })

        const min = Math.min(...numericArray)
        const max = Math.max(...numericArray)

        if (max === min) return array.map(() => 0.5)

        return numericArray.map(v => {
            const normalized = (v - min) / (max - min)
            return normalized
        })
    }

    /**
     * Get grayscale color from normalized value (0-1)
     * Maps to range: lowest note = 80 (dark gray), highest note = 255 (white)
     */
    grayscale(normalized) {
        const minGray = 80   // Dark gray (not black) for lowest note
        const maxGray = 255  // White for highest note
        const gray = Math.floor(minGray + (normalized * (maxGray - minGray)))
        return { r: gray, g: gray, b: gray }
    }

    /**
     * Setup callback on the synth automatically
     */
    setupCallback() {
        if (!this.synth) return

        // Store original callback if it exists
        const originalCallback = this.synth.callback

        // Set up new callback that calls update
        this.synth.callback = (i, time) => {
            if (originalCallback && typeof originalCallback === 'function') {
                originalCallback(i, time)
            }
            this.update()
        }
    }

    /**
     * Update - automatically called by callback every beat
     */
    update() {
        if (!this.parent || !this.parent.vals) return
        this.draw()
    }

    /**
     * Draw the circle
     */
    draw() {
        if (!this._enabled || !this.gui || !this.parent || !this.parent.vals) return

        const array = this.parent.vals
        const currentIndex = this.synth ? this.synth.index : 0

        // Calculate position (convert percentage to pixels, like other GUI elements)
        // If x/y is null, auto center; otherwise treat as percentage (0-100)
        const canvasWidth = this.gui.width || 800
        const canvasHeight = this.gui.height || 600
        const x = this.x !== null ? (this.x / 100) * canvasWidth : canvasWidth / 2
        const y = this.y !== null ? (this.y / 100) * canvasHeight : canvasHeight / 2

        // Calculate diameter using the exact same formula as knobs
        // Knob formula: cur_size = (size / 6) * width / 2
        // This makes CircularVisualizer scale proportionally with GUI knobs
        const diameter = (this.size / 6) * canvasWidth / 2
        const outerRadius = diameter / 2
        const numSegments = array.length

        if (numSegments === 0) return

        // Normalize array values to 0-1 for grayscale
        const normalized = this.normalizeArray(array)

        // Draw segments
        for (let i = 0; i < numSegments; i++) {
            const startAngle = this.gui.radians((i * 360 / numSegments) - 90)
            const endAngle = this.gui.radians(((i + 1) * 360 / numSegments) - 90)

            // All notes visible in grayscale, current beat turns red
            const isCurrent = (currentIndex % numSegments) === i
            const isRest = array[i] === '.' || array[i] === '~'  // Rest symbols
            let color

            if (isCurrent) {
                // Current beat: use customizable color
                color = this.currentColor
            } else if (isRest) {
                // Rests: black
                color = { r: 0, g: 0, b: 0 }
            } else {
                // Non-current beats: grayscale based on pitch
                color = this.grayscale(normalized[i])
            }

            // Draw the segment
            this.gui.fill(color.r, color.g, color.b)
            this.gui.noStroke()
            this.gui.arc(x, y, diameter, diameter, startAngle, endAngle, this.gui.PIE)
        }

        // Draw separator lines from center to edge
        if (this.showSeparators) {
            this.gui.stroke(this.separatorColor.r, this.separatorColor.g, this.separatorColor.b)
            this.gui.strokeWeight(this.separatorWeight)

            for (let i = 0; i < numSegments; i++) {
                const angle = this.gui.radians((i * 360 / numSegments) - 90)
                const endX = x + outerRadius * this.gui.cos(angle)
                const endY = y + outerRadius * this.gui.sin(angle)
                this.gui.line(x, y, endX, endY)  // From center to edge
            }
        }

        // Draw outer circle outline
        this.gui.noFill()
        this.gui.stroke(this.separatorColor.r, this.separatorColor.g, this.separatorColor.b)
        this.gui.strokeWeight(1)
        this.gui.ellipse(x, y, diameter, diameter)
    }

    /**
     * Enable visualization
     */
    enable() {
        if (this._enabled) return

        this._enabled = true

        // Store original gui.draw
        if (this.gui && typeof this.gui.draw === 'function') {
            this._originalGuiDraw = this.gui.draw
        }

        // Override gui.draw
        if (this.gui) {
            this.gui.draw = () => {
                if (this._originalGuiDraw) {
                    this._originalGuiDraw.call(this.gui)
                }
                this.draw()
            }
        }
    }

    /**
     * Disable visualization
     */
    disable() {
        if (!this._enabled) return

        this._enabled = false

        if (this.gui && this._originalGuiDraw) {
            this.gui.draw = this._originalGuiDraw
        }
        this._originalGuiDraw = null
    }

    get enabled() { return this._enabled }
}


;

class GraphVisualizer {
    constructor(size = 64, ratio = 1, color = 0,  _target = 'Canvas',) {
        this._target = document.getElementById(_target);
        this._array = new Array(size).fill(0);
        this._index = 0
        this._ratio = ratio * .4;
        this._type = 'vertical'; // Default type
        this._color =  [
            '#FF5733',  // Base orange
            '#33A1FF',  // Light blue (complementary)
            '#FF33B1',  // Magenta (opposite on color wheel)
            '#33FF57',  // Bright green (vibrant contrast)
            '#5733FF',  // Purple (contrasting tone)
            '#FFBD33',  // Warm yellow (vibrant and complementary)
            '#33FFBD',  // Mint green (cool contrast)
            '#FF3380'   // Pink (near complementary)
        ];

        this._backgroundColor = '#3C3D37'
        this._activeColor = this._color[color]; // Default color
        this._rows = 1; // Default to single row
        this._columns = this._array.length; // Default to length of array
        this._width = this._target.offsetWidth;
        this._height = this._width * this._ratio;
        this.elementWidth = this._width / this._columns;
        this.elementHeight = this._height / this._rows;
        //need to keep track of min and max acroos multiple frames
        //in order to catch when we draw multiply seqs
        this._min = 0
        this._max = 1
        this._minActive = 0
        this._maxActive = 1
        this._seqNum = 0
        this._displayLength = this._columns;
        this._activeLength = this._columns;
        this._subDivision = '16n'
        this._svg = null
        this.index = 0

        this.enable()
    }

    enable() {
        if (this._enabled) return; // Already enabled
        this._svg = this.createSVG();
        this._target.appendChild(this._svg);
    }

    createSVG() {
        // const existingSVG = this._target.querySelector('svg.array-visualizer-svg');
        // if (existingSVG) {
        //     this._target.removeChild(existingSVG);
        // }
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute('width', this._width);
        svg.setAttribute('height', this._height);
        svg.setAttribute('class', 'array-visualizer-svg');

        return svg;
    }

    clearSVG() {
        if (this._svg) {
            while (this._svg.firstChild) {
                this._svg.removeChild(this._svg.firstChild);
            }
        }

        const background = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        background.setAttribute('x', 0);
        background.setAttribute('y', 0);
        background.setAttribute('width', this._width);
        background.setAttribute('height', this._height);
        background.setAttribute('fill', this._backgroundColor);  // Set background color to white
        this._svg.appendChild(background);  // Append background before drawing elements

    }

    // Visualization logic based on the set type
    startVisualFrame(){
        this.clearSVG();

        //clear min and max values
        this._min = this._minActive
        this._max = this._maxActive
        this._minActive = null
        this._maxActive = null
        this._seqNum = 0
        this._displayLength = this._activeLength
        this._activeLength = 8
    }

    visualize(arr) {
        if (arr.length > this._activeLength) this._activeLength = arr.length;

        arr = this.transformArray(arr);
        this.calculateMinMax(arr);

        switch (this._type) {
            case 'horizontal':
                this.drawHorizontalLines(arr);
                break;
            case 'vertical':
                this.drawVerticalBars(arr);
                break;
            case 'numbers':
                this.drawNumericValues(arr);
                break;
            default:
                console.error('Unknown visualization type');
        }
        this._seqNum += 1;
    }

    calculateMinMax(arr) {
        // Filter the array to include only numbers and numeric strings
        const numericValues = arr
            .filter(item => !isNaN(item) && item !== '' && item !== null)  // Filter out non-numeric values
            .map(item => Number(item));  // Convert numeric strings to numbers

        // Calculate min and max
        const min = Math.min(...numericValues)-.6;
        const max = Math.max(...numericValues)+.6;

        //apply if there is a new min or max
        if(this._minActive === null || min < this._minActive ) this._minActive = min
        if(this._maxActive === null || max > this._maxActive ) this._maxActive = max
    }

    transformArray(arr) {
        const replacements = {
            'O': -1, 'o': 1,
            'X': 0, 'x': 0,
            '1': 3,
            '2': 2,
            '3': 1,
            '*': 4,
            '^': 5
        };
        const rep = ['*','O','o','x','X','^']
        let isDrum = false
        for( let i in rep) isDrum = arr.includes(rep[i]) ? true : isDrum
        if( isDrum) return arr.map(item => replacements[item] !== undefined ? replacements[item] : item);
        else return arr
    }


    // Getters and Setters for dynamic properties

    // Visualization type
    get type() { return this._type;}
    set type(value) { this._type = value; }

    // Visualization color
    get color() { return this._color; }
    set color(value) { this._color = value; }

    // Size ratio
    get ratio() { return this._ratio; }
    set ratio(value) {
        this._ratio = value;
        this._height = this._width * this._ratio;
        this._svg.setAttribute('height', this._height);
    }

    // Number of rows (for numbers mode)
    get rows() { return this._rows;}
    set rows(value) {  this._rows = value; }

    // Number of columns (for numbers mode)
    get columns() {return this._columns;  }
    set columns(value) { this._columns = value; }


    // Drawing methods
    drawHorizontalLines(arr) {
        // Normalize array values between 0 and 1
        arr = arr.map(x => (x - this._min) / (this._max - this._min));

        const step = this._width / arr.length;

        arr.forEach((value, i) => {
            if (typeof value === 'number' && !isNaN(value)) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", 'line');

                const x1 = i * step;
                const x2 = (i + 1) * step;
                const y = this._height * (1 - value);

                let width = this._height / (this._max - this._min) - 2;
                if (width < 2) width = 2;

                line.setAttribute('x1', x1);
                line.setAttribute('x2', x2);
                line.setAttribute('y1', y);
                line.setAttribute('y2', y);
                line.setAttribute('stroke', this._activeColor);
                line.setAttribute('stroke-width', width);

                this._svg.appendChild(line);
            }
        });
    }


   drawVerticalBars(arr) {
        // Normalize array values between 0 and 1
        arr = arr.map(x => (x - this._min) / (this._max - this._min));
        arr = arr.map(x=> x<0 ? 0 : x)
        this.clearSVG();

        const step = this._width / arr.length;

        arr.forEach((value, i) => {
            if (typeof value === 'number' && !isNaN(value)) {
                const bar = document.createElementNS("http://www.w3.org/2000/svg", 'rect');

                const x = i * step;
                const barWidth = Math.max(step * 0.95, 1); // add spacing between bars
                const barHeight = value * this._height;
                const y = this._height - barHeight;

                bar.setAttribute('x', x);
                bar.setAttribute('y', y);
                bar.setAttribute('width', barWidth);
                bar.setAttribute('height', barHeight);
                bar.setAttribute('fill', this._activeColor);

                this._svg.appendChild(bar);
            }
        });
    }


    drawNumericValues(index, arr, elementWidth= this.elementWidth, elementHeight= this.elementHeight) {
        const itemsPerRow = Math.ceil(this._displayLength / this._rows);

        arr.forEach((value, i) => {
            const row = Math.floor(index / itemsPerRow);
            const col = i % itemsPerRow;
            const text = document.createElementNS("http://www.w3.org/2000/svg", 'text');
            text.setAttribute('x', col * elementWidth + elementWidth / 2);
            text.setAttribute('y', row * elementHeight + elementHeight / 2);
            if( index == i) text.setAttribute('fill', this._activeColor);
            else text.setAttribute('fill', this._color);
            text.setAttribute('font-size', '16');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('alignment-baseline', 'middle');
            text.textContent = Math.round(value);
            this._svg.appendChild(text);
        });
    }

    // Destroy the visualizer instance and clean up resources
    destroy() {
        if (this._target && this._svg && this._target.contains(this._svg)) {
            this._target.removeChild(this._svg);
        }

        // Nullify references
        this._array = null;
        this._target = null;
        this._svg = null;
    }
    add(val){
        this.addCCValue(val)
    }
    addCCValue(val) {
        // Convert BigInt or other inputs explicitly to Number
        val = Number(val);

        // Clamp to MIDI CC range
        val = Math.max(0, Math.min(127, val));

        // Normalize if needed: 0–127 → 0–1
        const normalized = val// / 127 //*2-1;

        // Push to buffer and trim
        // this._array.push(normalized);
        // if (this._array.length > this._columns) {
        //     this._array.shift();
        // }
        this._index = (this._index+1)%this._array.length
        this._array[ this._index] = normalized
        //console.log(normalized)
        this.startVisualFrame();
        this.visualize(this._array);
    }
}


// Seq.js
//current sequencer module feb 2025

;
;
;

;

class MultiRowSeqGui {
    constructor(numRows = 8, numSteps = 8, chlink = null) {
        this.numRows = numRows
        this.numSteps = numSteps
        this.minVal = -25
        this.maxVal = 25
        this.chlink = chlink
        this.guiSize = 0.5
        this.seqs = new Array(numRows).fill(null);
        this.guiContainer = document.getElementById('Canvas');
        let height = .4*numRows
        const sketchWithSize = (p) => sketch(p, { height: height });
        this.gui = new p5(sketchWithSize, this.guiContainer);
        this.knobs = []
        // this.toggles = []
        this.colors = [[255,0,0],[255,255,0],[255,0,255],[0,255,150],[0,0,255]]
        this.initializeGui(numRows, numSteps)
        this.borderColor = [100, 100, 100]
    }

    initializeGui(numRows, numSteps) {
        this.knobs = [];
        // this.toggles = [];
        for (let j = 0; j < numRows; j++) {
            this.knobs.push([])
            // this.toggles.push([])
            for (let i = 0; i < numSteps; i++) {
                let knob = this.gui.Knob({
                    label: i + 1,
                    min: this.minVal,
                    max: this.maxVal,
                    value: 1,
                    x: Math.floor(100 / (numSteps + 1)) * (i + 1),
                    y: j==0 ? 20/numRows*3 : 20/numRows*3+Math.floor(30/numRows*3*(j)),
                    callback: (value) => this.knobCallback(j, i, value)
                })
                this.knobs[j].push(knob);
                knob.accentColor = this.colors[j%this.colors.length]
                knob.disabled = false

                // let toggle = gui.Toggle({
                //     label: i + 1,
                //     value: 1,
                //     x: Math.floor(100 / (numSteps + 1)) * (i + 1),
                //     y: Math.floor(300 / (numRows * 2 + 1)),
                //     callback: (value) => this.toggleCallback(this.seqs[j], i, value)
                // });
                // this.toggles[j].push(toggle);

                if (this.chlink != null) {
                    try {
                        // toggle.linkName = this.chlink + "toggle" + String(j) + String(i);
                        // toggle.ch.on(toggle.linkName, (incoming) => {
                        //     toggle.forceSet(incoming.values);
                        // })
                        knob.linkName = this.chlink + "knob" + String(j) + String(i);
                        knob.ch.on(knob.linkName, (incoming) => {
                            knob.forceSet(incoming.values);
                        })
                    } catch {
                        console.log("CollabHub link failed! Please call initCollab() first.")
                    }
                }
            }

        }
        this.gui.setTheme(this.gui, 'dark')
    }//gui

    setGuiSize(val){
        for(let i=0;i<this.knobs.length;i++){
            for(let j=0; j<this.knobs[i].length;j++)
            this.knobs[i][j].size = val
        }
    }

    knobCallback(seqNum, stepNum, val) {
        let seq = this.seqs[seqNum]
        let knob = this.knobs[seqNum][stepNum]
        if(isNaN(Number(val))){
            this.disableKnob(knob);
            seq.vals[stepNum] = '.'
            return;
        }
        if(knob == undefined){
            return;
        }
        if(seq!= null){
            seq.prevVals[stepNum] = seq.vals[stepNum]
            seq.vals[stepNum] = val
        }
        if(Number(val) == Number(this.minVal)){
            seq.vals[stepNum] = '.'
            if(!knob.disabled){
                this.disableKnob(knob)
            }
            // if(seq != null) {c};
        }else if(knob.disabled){
            this.enableKnob(knob, seqNum)
        }
    }

    toggleCallback(seq, stepNum, val) {
        if(0) console.log(seq, stepNum,val)
        if(seq != null){
            if (val == 0) {
                // seq.prevVals[stepNum] = seq.vals[stepNum]
                seq.vals[stepNum] = '.'
            } else {
                seq.vals[stepNum] = seq.prevVals[stepNum];
            }
        }
    }

    disableKnob(knob){
        //console.log(this.minVal, knob.accentColor, this.borderColor)
        knob.forceSet(this.minVal)
        knob.accentColor = this.borderColor
        knob.disabled = true
    }

    enableKnob(knob, seqNum){
        //console.log(knob, seqNum, this.colors[seqNum%this.colors.length])
        knob.accentColor = this.colors[seqNum%this.colors.length];
        knob.disabled = false
    }

    assignSeq(seq, rowNum, toggles=false){
        this.seqs[rowNum] = seq
        let prevVals = seq.vals.slice(0)
        for (let i = 0; i < this.numSteps; i++) {
            let knob = null;
            // this.toggles[rowNum][i].callback = (value) => this.toggleCallback(seq, i, value)
            if(!toggles){
                knob = this.gui.Knob({
                    label: i + 1,
                    min: this.minVal,
                    max: this.maxVal,
                    value: Math.floor((this.minVal+this.maxVal)/2),
                    x: Math.floor(100 / (this.numSteps + 1)) * (i + 1),
                    y: rowNum==0 ? 20/this.numRows*3 : 20/this.numRows*3+Math.floor(30/this.numRows*3*(rowNum)),
                    callback: (value) => this.knobCallback(rowNum, i, Number(value))
                })
                this.knobs[rowNum][i].hide = true
                this.knobs[rowNum][i] = knob;
                knob.disabled = false
                seq.vals = prevVals.slice(0)
                if(seq.vals.length > i){
                    if(!isNaN(Number(seq.vals[i]))){
                        if(Number(seq.vals[i]) == this.minVal){
                            this.disableKnob(knob)
                            prevVals[i] = '.'
                        }else{
                            knob.forceSet(Number(seq.vals[i]))
                        }
                    }else{
                        this.disableKnob(knob)
                        prevVals[i] = '.'
                    }
                }else{
                    this.disableKnob(knob)
                }
                // this.knobs[rowNum][i].callback = (value) => this.knobCallback(seq, i, value)
                seq.guiElements["knobs"][i] = knob
            }else{
                knob = this.gui.Toggle({
                    label: i + 1,
                    value: 1,
                    x: Math.floor(100 / (this.numSteps + 1)) * (i + 1),
                    y: rowNum==0 ? 23/this.numRows*3 : 23/this.numRows*3+Math.floor(30/this.numRows*3*(rowNum)),
                    callback: (value) => this.toggleCallback(this.seqs[rowNum], i, value)
                });
                if(seq.vals.peek(-1)==undefined){
                    seq.vals.pop(-1)
                }
                if(i<seq.vals.length){
                    if(seq.vals[i%seq.vals.length]!=='.'){
                        knob.forceSet(1)
                    }else{
                        knob.forceSet(0)
                    }
                }else{
                    knob.forceSet(0)
                }
                knob.accentColor = this.colors[rowNum%this.colors.length]
                this.knobs[rowNum][i].hide = true
                this.knobs[rowNum][i] = knob;
                knob.textColor = [0,0,0]
                seq.guiElements["toggles"][i] = knob
            }
            // if(!knob.disabled){
            //     knob.accentColor = this.colors[rowNum%this.colors.length]
            // }
            if (this.chlink != null) {
                try {
                    knob.linkName = this.chlink + "knob" + String(rowNum) + String(i);
                    knob.ch.on(knob.linkName, (incoming) => {
                        knob.forceSet(incoming.values);
                    })
                } catch {
                    console.log("CollabHub link failed! Please call initCollab() first.")
                }
            }        
        }        
        seq.vals = prevVals
        this.showCurrentBeat(rowNum)
    }

    setSeqOff(seqNum){
        let seq = this.seqs[seqNum]
        let knob = this.knobs[seqNum]
        for(let i = 0; i < this.numSteps; i++){
            if(knob[i].constructor.name == 'Toggle'){
                knob[i].forceSet(0);
            }else{
                this.disableKnob(knob[i]);

            }
        }
        seq.vals = new Array(this.numSteps).fill('.'); 
    }

    pushState(){
        for(let j = 0; j<this.knobs.length; j++){
            for(let i = 0; i<this.knobs[j].length; i++){
                this.knobs[j][i].ch.control(this.knobs[j][i].linkName, this.knobs[j][i].value)
            }
        }
    }

    showCurrentBeat(seqNum){
        let seq = this.seqs[seqNum]
        let newCallback = ()=>{
            if(seq.index%seq.vals.length < this.numSteps){
                //console.log(this.knobs[seqNum][seq.index%seq.vals.length] )
                this.knobs[seqNum][seq.index%seq.vals.length].accentColor = this.knobs[seqNum][seq.index%seq.vals.length].accentColor.map(element => element * .4);
            }
            let prevInd = (seq.index+seq.vals.length-1)%seq.vals.length
            if(prevInd < this.numSteps){
                this.knobs[seqNum][prevInd].accentColor = this.colors[seqNum%this.colors.length]
                if(this.knobs[seqNum][prevInd].disabled){
                    this.knobs[seqNum][prevInd].accentColor = this.borderColor
                }
            }
        }
        seq.userCallback = newCallback;
    }

    setValues(seqNum, vals, subdivision = null){
        
        vals = Array.isArray(vals) ? vals : parsePitchStringSequence(vals);
        if(subdivision == null){
            subdivision = this.seqs[seqNum].subdivision
        }
        
        if(this.knobs[seqNum][0].constructor.name !== 'Toggle'){
            this.seqs[seqNum].sequence(vals, subdivision);
        }
        
        this.numSteps = vals.length
        //update GUI
        let updatedVals = this.seqs[seqNum].vals.slice(0)
        //console.log(updatedVals)
        for(let i = 0; i<this.numSteps; i++){
            // if(this.knobs[seqNum][i].value==0 && i<updatedVals.length){
            //     this.seqs[seqNum].vals[i] = '.'
            // }
            //calculate rests
            if(vals[i] == '.' || i>=updatedVals.length){
                //console.log('rest')
                if(this.knobs[seqNum][i].constructor.name == 'Toggle'){
                    this.knobs[seqNum][i].set(0);
                    // if(i>=updatedVals.length){
                    //     this.seqs[seqNum].vals.pop(-1)
                    // }
                }else{
                    //this.knobs[seqNum][i].set(0);
                    this.disableKnob(this.knobs[seqNum][i], seqNum);
                }
            }
            //calculate not rests
            else{
                //console.log('not rest')
                if(this.knobs[seqNum][i].constructor.name == 'Toggle'){
                    this.knobs[seqNum][i].set(1);
                    //this.toggleCallback(this., i, 1)
                    //this.knobs[seqNum][i].set(1);
                }else{
                    this.enableKnob(this.knobs[seqNum][i], seqNum);
                }
            }
        }
        this.seqs[seqNum].vals = this.seqs[seqNum].vals.filter(x => x)
        this.seqs[seqNum].prevVals = updatedVals
    }

    /**
     * Clears/resets a specific row to minimum values (disabled state)
     * @param {number} rowNum - The row index to clear
     */
    clearRow(rowNum) {
        this.setSeqOff(rowNum)
    }

    /**
     * Randomizes values in a specific row
     * @param {number} rowNum - The row index to randomize
     * @param {boolean} keepDisabled - Whether to keep currently disabled knobs disabled
     */
    randomizeRow(rowNum, keepDisabled = true) {
        if (rowNum < 0 || rowNum >= this.numRows) return;
        
        for (let i = 0; i < this.numSteps; i++) {
            const knob = this.knobs[rowNum][i];
            if (!keepDisabled || !knob.disabled) {
                const randomVal = Math.floor(Math.random() * (this.maxVal - this.minVal + 1)) + this.minVal;
                knob.forceSet(randomVal);
                this.enableKnob(knob, rowNum);
            }
        }
    }

    randomizeEnables(rowNum, weight = 0.5) {
        if (rowNum < 0 || rowNum >= this.numRows) return;
        
        for (let i = 0; i < this.numSteps; i++) {
            const knob = this.knobs[rowNum][i];
            const randomVal = Math.random()
            if(randomVal > weight) this.disableKnob(knob)
            else this.enableKnob(knob, rowNum);
        }
    }

    /**
     * Shifts values in a row left or right
     * @param {number} rowNum - The row index to shift
     * @param {number} amount - Positive for right shift, negative for left shift
     * @param {boolean} wrapAround - Whether to wrap values around
     */
    shiftRow(rowNum, amount, wrapAround = true) {
        if (rowNum < 0 || rowNum >= this.numRows) return;
        
        const currentValues = [];
        const disabledStates = [];
        
        // Get current values and disabled states
        for (let i = 0; i < this.numSteps; i++) {
            currentValues.push(this.knobs[rowNum][i].value);
            disabledStates.push(this.knobs[rowNum][i].disabled);
        }
        
        // Shift values and states
        const shiftedValues = [];
        const shiftedStates = [];
        
        for (let i = 0; i < this.numSteps; i++) {
            let newIndex = (i - amount) % this.numSteps;
            if (newIndex < 0) newIndex += this.numSteps;
            
            if (wrapAround || (newIndex >= 0 && newIndex < this.numSteps)) {
                shiftedValues[i] = currentValues[newIndex];
                shiftedStates[i] = disabledStates[newIndex];
            } else {
                shiftedValues[i] = this.minVal;
                shiftedStates[i] = true;
            }
        }
        
        // Apply shifted values and states
        for (let i = 0; i < this.numSteps; i++) {
            this.knobs[rowNum][i].forceSet(shiftedValues[i]);
            if (shiftedStates[i]) {
                this.disableKnob(this.knobs[rowNum][i]);
            } else {
                this.enableKnob(this.knobs[rowNum][i], rowNum);
            }
        }
    }

    /**
     * Inverts values in a row (mirrors around center)
     * @param {number} rowNum - The row index to invert
     */
    invertRow(rowNum) {
        if (rowNum < 0 || rowNum >= this.numRows) return;
        
        const currentValues = [];
        const disabledStates = [];
        
        // Get current values and disabled states
        for (let i = 0; i < this.numSteps; i++) {
            currentValues.push(this.knobs[rowNum][i].value);
            disabledStates.push(this.knobs[rowNum][i].disabled);
        }
        
        // Apply inverted values
        for (let i = 0; i < this.numSteps; i++) {
            const invertedIndex = this.numSteps - 1 - i;
            this.knobs[rowNum][i].forceSet(currentValues[invertedIndex]);
            if (disabledStates[invertedIndex]) {
                this.disableKnob(this.knobs[rowNum][i]);
            } else {
                this.enableKnob(this.knobs[rowNum][i], rowNum);
            }
        }
    }

    /**
     * Scales values in a row by a factor
     * @param {number} rowNum - The row index to scale
     * @param {number} factor - Scaling factor (e.g., 0.5 for halving, 2 for doubling)
     */
    scaleRow(rowNum, factor) {
        if (rowNum < 0 || rowNum >= this.numRows) return;
        
        for (let i = 0; i < this.numSteps; i++) {
            const knob = this.knobs[rowNum][i];
            if (!knob.disabled) {
                const newValue = Math.min(this.maxVal, Math.max(this.minVal, Math.round(knob.value * factor)));
                knob.forceSet(newValue);
            }
        }
    }

    /**
     * Enables or disables an entire row
     * @param {number} rowNum - The row index to enable/disable
     * @param {boolean} enable - Whether to enable (true) or disable (false) the row
     */
    setRowEnabled(rowNum, enable) {
        if (rowNum < 0 || rowNum >= this.numRows) return;
        
        for (let i = 0; i < this.numSteps; i++) {
            const knob = this.knobs[rowNum][i];
            if (enable) {
                if (knob.value === this.minVal) {
                    knob.forceSet(0); // Default to 0 when enabling
                }
                this.enableKnob(knob, rowNum);
            } else {
                knob.forceSet(this.minVal);
                this.disableKnob(knob);
            }
        }
    }

    /**
     * Gets all values from a specific row
     * @param {number} rowNum - The row index to get values from
     * @returns {Array} Array of values (with '.' for disabled steps)
     */
    getRowValues(rowNum) {
        if (rowNum < 0 || rowNum >= this.numRows) return [];
        
        const values = [];
        for (let i = 0; i < this.numSteps; i++) {
            values.push(this.knobs[rowNum][i].disabled ? '.' : this.knobs[rowNum][i].value);
        }
        return values;
    }

    /**
     * Sets all values for a specific row
     * @param {number} rowNum - The row index to set values for
     * @param {Array} values - Array of values (can include '.' for disabled steps)
     */
    setRowValues(rowNum, values) {
        if (rowNum < 0 || rowNum >= this.numRows) return;
        //console.log(rowNum, values)
        for (let i = 0; i < Math.min(this.numSteps, values.length); i++) {
            const val = values[i];
            const knob = this.knobs[rowNum][i];
            //console.log(knob, val)
            if (val === '.' || val === null || val === undefined) {
                knob.set(this.minVal);
                this.disableKnob(knob);
            } else {
                const numVal = Number(val);
                if (!isNaN(numVal)) {
                    knob.set(Math.min(this.maxVal, Math.max(this.minVal, numVal)));
                    this.enableKnob(knob, rowNum);
                }
            }
        }
    }
}


/** Oscilloscope class
 * * uses svg drawing on a canvas
 * 
 * Based on: https://github.com/Sambego/oscilloscope.js
 */
/****************************************



OSCILLOSCOPE


****************************************/
;

/**
 * Represents an Oscilloscope that visualizes audio waveforms.
 * 
 * @param {string} _target - The ID of the HTML element where the oscilloscope will be displayed.
 * 
 * @class
 */
const Oscilloscope = function( ratio = 1, _target= 'Canvas') {
    // Get the target DOM element and set dimensions based on the provided ratio
    this.target = document.getElementById(_target);
    this.width = this.target.offsetWidth;
    this.height = this.width * ratio * 4/10;

    // Create the SVG path for the oscilloscope wave
    this.wave = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    this.wave.setAttribute('class', 'oscilloscope__wave');

    // Create the SVG element to contain the wave
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute('width', this.width);
    this.svg.setAttribute('height', this.height);
    this.svg.setAttribute('class', 'oscilloscope__svg');
    this.svg.appendChild(this.wave);

    // Append the SVG to the target container
    this.target.appendChild(this.svg);

    // Use Tone.js's audio context or create a new one
    //this.audioContext = Tone.context;
    this.audioContext = window.audioContext;
    
    // State variables
    this.running = true; // Indicates if oscilloscope is running
    this.hasAudio = false; // If the oscilloscope is connected to the audio context destination

    // Set up the input and gain for the oscilloscope
    this.input = new Tone.Multiply();
    this.gain = new Tone.Signal(1);
    this.analyserNode = this.audioContext.createAnalyser(); // Create an analyser node for audio data
    this.input.connect(this.analyserNode); // Connect input to analyser
    this.gain.connect(this.input.factor); // Connect gain to input

    // Configuration for the analyser node
    this.analyserNode.fftSize = 2048;
    this.bufferLength = this.analyserNode.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);

    // Display settings
    this.yScaling = 1; // Scaling factor for Y axis
    this.xScaling = 2; // Scaling factor for X axis
    this.zoom = 1.25; // Zoom level
    this.enableTrigger = 1; // Trigger for zero-crossing detection
    this.threshold = 128; // Threshold for signal triggering

    /**
     * Automatically start the oscilloscope when the constructor is called.
     */
    this.constructor = function() {
        this.start();
        console.log('Oscilloscope started');
    };

    /**
     * Set the FFT size for the analyser node.
     * Ensures the value is a power of two, as required by the Web Audio API.
     * @memberof Oscilloscope
     * @param {number} val - The FFT size to set.
     */
    this.setFftSize = function(val) {
        if (Math.log2(val) % 1 !== 0) {
            val = Math.pow(2, Math.floor(Math.log2(val))); // Adjust to nearest power of two
            console.log("FFT size must be a power of two.");
        }
        console.log("Setting FFT size to", val);
        this.analyserNode.fftSize = val;
        this.bufferLength = this.analyserNode.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
    }.bind(this);

    /**
     * Draw the waveform data in the oscilloscope SVG.
     * @memberof Oscilloscope
     */
    this.drawWave = function() {
        var path = 'M';
        this.analyserNode.getByteTimeDomainData(this.dataArray); // Get waveform data

        // Find the first point that crosses the threshold for triggering
        var firstOverThreshold = 0;
        let threshold = this.threshold <= 1 ? this.threshold * 128 + 127 : this.threshold;

        for (var i = 1; i < this.bufferLength; i++) {
            if (this.dataArray[i] > threshold && this.dataArray[i - 1] <= threshold) {
                firstOverThreshold = i;
                break;
            }
        }
        if (this.enableTrigger === 0) firstOverThreshold = 0;

        // Start drawing the path
        let x = 0;
        let y = this.height / 2;
        path += `${x} ${y}, `;

        // Scaling the X axis based on zoom level
        this.xScaling = this.zoom < 0.1 ? 0.2 : this.zoom * 2;

        // Draw the waveform as a series of points
        for (var i = 0; i < this.bufferLength - firstOverThreshold; i++) {
            let val = (255 - this.dataArray[i + firstOverThreshold]) * (1 / this.yScaling);
            x = (this.width / this.bufferLength) * i * this.xScaling;
            y = (this.height / 2) * (val / 128.0);

            // Stop drawing if the X value exceeds the scope's width
            if (x > this.width - 10) break;

            path += `${x} ${y}, `;
        }

        // Update the SVG path with the new waveform
        this.wave.setAttribute('d', path);
        this.wave.setAttribute('stroke', 'black');
        this.wave.setAttribute('stroke-width', '2');
        this.wave.setAttribute('fill', 'none');

        // Continue drawing if running
        if (this.running) {
            window.requestAnimationFrame(this.drawWave);
        }
    }.bind(this);

    /**
     * Start the oscilloscope animation.
     * @memberof Oscilloscope
     */
    this.start = function() {
        this.running = true;
        window.requestAnimationFrame(this.drawWave);
    }.bind(this);

    /**
     * Stop the oscilloscope animation.
     * @memberof Oscilloscope
     */
    this.stop = function() {
        this.running = false;
    }.bind(this);

    /**
     * Disconnect the oscilloscope from its target.
     * @memberof Oscilloscope
     */
    this.disconnect = function() {
        this.target.removeChild(this.svg);
    }.bind(this);

    /**
     * Reconnect the oscilloscope to a target.
     * @memberof Oscilloscope
     * @param {string} _target - The ID of the new target DOM element.
     */
    this.connect = function(_target) {
        this.target = document.getElementById(_target);
        this.target.appendChild(this.svg);
    }.bind(this);

    /**
     * Clean up and delete the oscilloscope object.
     * Stops the animation, removes DOM elements, and nullifies references.
     * @memberof Oscilloscope
     */
    this.destroy = function() {
        // Stop the oscilloscope animation if running
        this.stop();

        setTimeout(()=>{
            // Remove the SVG element from the DOM
            if (this.target.contains(this.svg)) {
                this.target.removeChild(this.svg);
            }

            // Disconnect the analyser node and nullify object references to free memory
            this.analyserNode.disconnect();
            this.input.disconnect();
            this.gain.dispose();

            // Nullify all references to help with garbage collection
            this.target = null;
            this.wave = null;
            this.svg = null;
            this.audioContext = null;
            this.input = null;
            this.gain = null;
            this.analyserNode = null;
            this.dataArray = null;

            console.log("Oscilloscope destroyed.");
        }, 100)
        
    }.bind(this);

    // Automatically start the oscilloscope upon creation
    this.start();
};










/****************************************

plotTransferFunction

****************************************/

/**
 * Plots a transfer function on a specified SVG element with axis labels.
 * @module TransferFunctionPlotter
 * @param {function} myFunction - The transfer function to plot. Takes a number input and returns a number.
 * @param {string} _target - The ID of the HTML element where the transfer function will be plotted.
 */
const PlotTransferFunction = function(myFunction, _target = 'Canvas', ratio= 4/10) {
    const target = document.getElementById(_target);

    // Check if an existing SVG is present and remove it if it is
    const existingSVG = target.querySelector('svg.transfer-function-svg');
    if (existingSVG) {
        target.removeChild(existingSVG);
    }

    if(myFunction === 'stop'){
        
        return
    }
    // Set the dimensions based on the target container
    const width = target.offsetWidth; 
    const height = target.offsetWidth*ratio;
    const graph_size = height - 10

    

    // Create the SVG element for the transfer function
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('class', 'transfer-function-svg');

    // Draw border around the graph
    const border = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
    border.setAttribute('x', '1');
    border.setAttribute('y', '1');
    border.setAttribute('width', graph_size - 1);
    border.setAttribute('height', graph_size - 1);
    border.setAttribute('stroke', 'black');
    border.setAttribute('fill', 'none');
    svg.appendChild(border);

    // Create the path element for the transfer function
    const path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    path.setAttribute('class', 'transfer-function-path');
    svg.appendChild(path);

    // Append the SVG element to the target container
    target.appendChild(svg);

    // Function to draw the transfer function
    var _path = 'M';
    let range = {min: -1, max: 1};
    let step = (range.max - range.min) / graph_size;
    let x = range.min;

    for (let i = 0; i < graph_size; i++) {
        let y = myFunction(x);
        let svgX = i;  // map x directly to pixel x-coordinate
        let svgY = graph_size / 2 - (y * graph_size/2);  // scale y and invert, adjust scale factor as needed

        _path += `${svgX} ${svgY} `;
        x += step;
    }

    path.setAttribute('d', _path);
    path.setAttribute('stroke', 'black');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');

    // Add labels for -1 and 1 on both the X and Y axes
    function addLabel(text, x, y) {
        const label = document.createElementNS("http://www.w3.org/2000/svg", 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', y);
        label.textContent = text;
        label.setAttribute('font-family', 'sans-serif');
        label.setAttribute('font-size', '10px');
        label.setAttribute('fill', 'black');
        svg.appendChild(label);
    }

     // Add labels for -1 and 1 on both the X and Y axes with optional rotation
    function addLabel(text, x, y, rotation, anchor, valign) {
        const label = document.createElementNS("http://www.w3.org/2000/svg", 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', y);
        label.textContent = text;
        label.setAttribute('font-family', 'sans-serif');
        label.setAttribute('font-size', '10px');
        label.setAttribute('fill', 'black');
        if (rotation) {
            label.setAttribute('transform', `rotate(${rotation} ${x}, ${y})`);
        }
        if (anchor) {
            label.setAttribute('text-anchor', anchor);
        }
        if (valign) {
            label.setAttribute('alignment-baseline', valign);
        }
        svg.appendChild(label);
    }

    addLabel('-1', 5, height - 2, 0, 'start', 'baseline');
    addLabel('input', graph_size / 2, height - 11, 0, 'middle', 'hanging');
    addLabel('1', graph_size - 5, height - 2,0, 'end', 'baseline');
    addLabel('-1', graph_size + 3, graph_size - 5, 90, 'middle', 'baseline');
    addLabel('1', graph_size + 13, 10, 90, 'middle', 'hanging');
    addLabel('output', graph_size + 3, graph_size / 2, 90, 'middle', 'baseline'); // Rotated "output" label

}

/****************************************

SPECTROGRAM

****************************************/
;

/**
 * Represents a Spectrogram that visualizes the frequency spectrum of audio signals.
 * 
 * @param {string} _target - The ID of the HTML element where the spectroscope will be displayed.
 * 
 * @class
 */

const Spectrogram = function( ratio = 1, _target= 'Canvas') {
    this.target = document.getElementById(_target);

    // Canvas setup
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.width = this.target.offsetWidth;
    this.height = ratio * 100;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.target.appendChild(this.canvas);
    this.context.fillStyle = "lightgrey";
    this.context.fillRect(0, 0, this.width, this.height);

    // Audio context and analyser node
    this.audioContext = window.audioContext || new (window.AudioContext || window.webkitAudioContext)();
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.smoothingTimeConstant = 0.0;
    this.input= new Tone.Multiply()
    this._gain = new Tone.Signal(0.1)
    this.input.connect( this.analyserNode )
    this._gain.connect( this.input.factor )
    this.analyserNode.fftSize = 4096; // Default FFT size
    this.bufferLength = this.analyserNode.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);

    // Spectrogram settings
    this._maxFrequency = 24000; // Default max frequency
    this._minFrequency = 0;     // Default min frequency
    this._timeResolution = 2;  // Number of pixels per time frame
    this.currentX = 0;        // Current horizontal position
    this.running = false;

    // Color mapping (amplitude to color)
    const getColor = (amplitude) => {
        // let intensity = [
        // amplitude * 3,
        // (amplitude-20) * 2 ,
        // (amplitude-40) * 1 ,
        // ]; // Normalize amplitude
        let intensity = [
        //Math.sin((amplitude/255) * Math.PI * 2.5)*255,
        Math.sin((amplitude/255-.25) * Math.PI * 3)*255,
        amplitude<128?0 : Math.sin(((amplitude-128)/255) * Math.PI * 1)*255,
        Math.sin((amplitude/255) * Math.PI * 2.5)*255,
        ]; // Normalize amplitude
        intensity = intensity.map(x=> Math.min(255, Math.max(0, x)))
        return `rgb(${intensity[0]}, ${intensity[1]}, ${intensity[2]})`;
    };

    Object.defineProperty(this, 'gain', {
        get: () => this._gain.value,
        set: (value) => {
            this._gain.value = value;
        },
    });

    // Frequency range setters and getters
    Object.defineProperty(this, 'minFrequency', {
        get: () => this._minFrequency,
        set: (value) => {
            this._minFrequency = Math.max(0, Math.min(value, this.maxFrequency));
        },
    });

    Object.defineProperty(this, 'maxFrequency', {
        get: () => this._maxFrequency,
        set: (value) => {
            this._maxFrequency = Math.max(this.minFrequency, Math.min(value, this.audioContext.sampleRate / 2));
        },
    });

    // Time resolution setter and getter
    Object.defineProperty(this, 'timeResolution', {
        get: () => this._timeResolution,
        set: (value) => {
            this._timeResolution =  value;
        },
    });

    // Time resolution setter and getter
    Object.defineProperty(this, 'fftSize', {
        get: () => this._timeResolution,
        set: (val) => {
            if (Math.log2(val) % 1 !== 0) {
                val = Math.pow(2, Math.floor(Math.log2(val)))
                console.log("FFT size must be a power of two.")
            }
            console.log("Setting FFT size to ", val)
            
            this.analyserNode.fftSize = val;
            this.bufferLength = this.analyserNode.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
        },
    });

    this.drawSpectrogram = function () {
    // Get frequency data
    this.analyserNode.getByteFrequencyData(this.dataArray);

    // Clear the current frame column
    this.context.clearRect(this.currentX, 0, this._timeResolution, this.height);

    const freqRange = this._maxFrequency - this._minFrequency;
    const binWidth = (this.audioContext.sampleRate / 2) / this.bufferLength;
    const startBin = Math.floor(this._minFrequency / binWidth);
    const endBin = Math.ceil(this._maxFrequency / binWidth);

    // Calculate vertical scaling
    const binHeight = this.height / (endBin - startBin);

    for (let i = startBin; i <= endBin; i++) {
        const freq = i * binWidth;

        // Map frequency to vertical position
        const y = this.height - Math.floor((freq - this._minFrequency) * (this.height / freqRange));

        // Get amplitude and map to color
        //const amplitude = Math.min(255, Math.max(0, this.dataArray[i]));
        const amplitude = this.dataArray[i];
        const color = getColor(amplitude);
        //if(i<10) console.log(this.dataArray[i],amplitude, color)

        this.context.fillStyle = color;

        // Adjust height based on binHeight
        if (binHeight >= 1) {
            // Scale bin to cover multiple vertical pixels
            this.context.fillRect(this.currentX, y - binHeight, this._timeResolution, Math.ceil(binHeight));
        } else {
            // Draw as a single pixel
            this.context.fillRect(this.currentX, y, this._timeResolution, 1);
        }
    }

        // Move to the next frame position
        this.currentX += this._timeResolution;
        if (this.currentX >= this.width) {
            this.currentX = 0;
        }

        // Continue animation if running
        if (this.running) {
            requestAnimationFrame(this.drawSpectrogram);
        }
    }.bind(this);

    this.start = function () {
        this.running = true;
        requestAnimationFrame(this.drawSpectrogram);
    }.bind(this);

    this.stop = function () {
        this.running = false;
    }.bind(this);

    this.destroy = function () {
        this.stop();
        this.target.removeChild(this.canvas);
        this.analyserNode.disconnect();
        this.audioContext.close();
    }.bind(this);

    // Start the spectrogram by default
    this.start();
};

/****************************************

SPECTROSCOPE

****************************************/
;

/**
 * Represents a Spectroscope that visualizes the frequency spectrum of audio signals.
 * 
 * @param {string} _target - The ID of the HTML element where the spectroscope will be displayed.
 * 
 * @class
 */
const Spectroscope = function( ratio = 1, _target= 'Canvas') {
    //var _drawWave, _bufferLength, _dataArray;

    //this.target = document.querySelector(target);
    this.target = document.getElementById(_target)

    // Set the dimensions based on the target container
    this.width = this.target.offsetWidth;
    this.height = this.target.offsetWidth*ratio * 4/10;

    // Create the oscilloscope wave element
    this.wave = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    this.wave.setAttribute('class', 'oscilloscope__wave');

    // Create the oscilloscope svg element
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute('width', this.width);
    this.svg.setAttribute('height', this.height);
    this.svg.setAttribute('class', 'oscilloscope__svg');
    this.svg.appendChild(this.wave);

    // Append the svg element to the target container
    this.target.appendChild(this.svg);

    // Add the audio context or create a new one
    this.audioContext = window.audioContext;

    // Indicates if the oscilloscope is running
    this.running = false;

    // Is the oscilloscope analyser-node connected to the audio-context' destination
    this.hasAudio = false;

     // Create the oscilloscope analyser-node
    // Create the oscilloscope analyser-node
    this.input= new Tone.Multiply()
    this.gain = new Tone.Signal(0.1)
    this.analyserNode = this.audioContext.createAnalyser();
    this.input.connect( this.analyserNode )
    this.gain.connect( this.input.factor )

    this.analyserNode.fftSize = 4096; // Default fftSize
    this.bufferLength = this.analyserNode.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    this.yScaling = 1;
    this.maxFrequency = 24000;
    this.minFrequency = 0;
    this.xScaling = 2;
    this.binWidth = 24000 / this.analyserNode.frequencyBinCount;

    // Set-up the analyser-node which we're going to use to get the oscillation wave
    /**
     * Set the FFT size for the analyser node.
     * 
     * @memberof Spectroscope
     * @param {number} val - The FFT size to set. Must be a power of two.
     */
    this.setFftSize = function(val){
        if (Math.log2(val) % 1 !== 0) {
            val = Math.pow(2, Math.floor(Math.log2(val)))
            console.log("FFT size must be a power of two.")
        }
        console.log("Setting FFT size to ", val)
        
        this.analyserNode.fftSize = val;
        this.bufferLength = this.analyserNode.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        this.binWidth = 24000 / this.bufferLength;
    }.bind(this);

    /*
     * Draw the oscillation wave
     */
    this.drawWave = function() {
        var path = 'M';

        this.analyserNode.getByteFrequencyData(this.dataArray);

        let x = this.width;
        let y = this.height / 2;

        const maxValue = Math.max(...this.dataArray);
        const minValue = Math.min(...this.dataArray);

        ////scale y axis. . . not implemented
        // if(this.yScaling > 1) this.yScaling *= 0.99;
        // if(maxValue > this.yScaling) this.yScaling = maxValue;
        // if(Math.abs(minValue) > this.yScaling) this.yScaling = Math.abs(minValue);

        x = 0
        y = this.height;

        path += `${x} ${y}, `;
        for (var i = 0 ; i < this.bufferLength; i++) {

            let freqDivider = 24000 / (this.maxFrequency-this.minFrequency)
            let freqOffset = this.minFrequency / this.binWidth

            //To do: get minFrequency working
            //console.log(this.binWidth, freqOffset, freqDivider)

            let val = (255-this.dataArray[i+freqOffset]) * (1/this.yScaling);
            x = (((this.width + (this.width / this.bufferLength)) / this.bufferLength) * (i));
            x = x * freqDivider;
            y = ((this.height / 2) * (val / 128.0));


            // Check if the x-coordinate is beyond the width of the scope
            if (x > this.width) break; // Exit the loop if x exceeds width

            path += `${x} ${y}, `;
        }

        x += 1
        y = this.height;

        path += `${x} ${y}, `;

        this.wave.setAttribute('d', path);
        this.wave.setAttribute('stroke', 'black');
        //this.wave.setAttribute('stroke-width', '2');
        //this.wave.setAttribute('fill', 'none');

        if (this.running) {
            //console.log(this.dataArray)
            window.requestAnimationFrame(this.drawWave);
        }
    }.bind(this);


    /**
     * Start the Spectroscope
     * @memberof Spectroscope
     */
    this.start = function() {
        this.running = true;

        window.requestAnimationFrame(this.drawWave);
    }.bind(this);

    /**
     * Stop the Spectroscope
     * @memberof Spectroscope
     */
    this.stop = function(){
        this.running = false;
    }.bind(this)

    this.disconnect = function(){
        this.target.removeChild(this.svg);
    }.bind(this)

    this.connect = function(_target){
        this.target = document.getElementById(_target)
        this.target.appendChild(this.svg);
    }

    this.start();

    this.destroy = function() {
        this.stop();

        setTimeout(()=>{
            // Remove the SVG element from the DOM
            if (this.target.contains(this.svg)) {
                this.target.removeChild(this.svg);
            }

            // Disconnect the analyser node and nullify object references to free memory
            this.analyserNode.disconnect();
            this.input.disconnect();
            this.gain.dispose();

            // Nullify all references to help with garbage collection
            this.target = null;
            this.wave = null;
            this.svg = null;
            this.audioContext = null;
            this.input = null;
            this.gain = null;
            this.analyserNode = null;
            this.dataArray = null;

            console.log("Spectroscope destroyed.");
        }, 100)
        
    }.bind(this);
};

;
;
;
;
;
;
;
