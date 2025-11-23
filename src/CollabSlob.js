/*
 * Client designed to work with the collab slob server.
 * Close in design to CollabSlob, but with the caveat that we can adjust anything
 * we want in the client-server communcation as we have access to the server code now :)
*/

import { io } from "socket.io-client";

// Logger utility for client-side debugging
const createLogger = () => {
    return {
        debug: function (message, ...args) {
                console.log(`[DEBUG] ${message}`, ...args);
        },
        info: function (message, ...args) {
            console.log(`[INFO] ${message}`, ...args);
        },
        warn: function (message, ...args) {
            console.warn(`[WARN] ${message}`, ...args);
        },
        error: function (message, ...args) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    };
};

export class CollabSlobClient {

    constructor(debug = false) {
        this.debug = debug; // Debug flag that can be toggled
        this.logger = createLogger();
        this.socket = io("https://collabhub-server-90d79b565c8f.herokuapp.com/slob", {
            reconnection: true, // Enable reconnection (default is true, but good to be explicit)
            reconnectionAttempts: Infinity, // Number of reconnection attempts before giving up
            reconnectionDelay: 1000, // How long to wait before first reconnection attempt (in ms)
            reconnectionDelayMax: 5000, // Maximum delay between reconnection attempts (in ms)
            randomizationFactor: 0.5 // Randomization factor for reconnection delay
        });
        this.controls = {};
        this.handlers = {};
        this.username = null;
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

        this.socket.on("connect", () => {
            // If we were in a room before the disconnection, rejoin it
            if (this.roomJoined) {
                if(this.debug) this.logger.debug(`Re-joining room after connection: ${this.roomJoined}`);
                this.joinRoom(this.roomJoined);
            }
        });


        // chat and user management
        this.socket.on("serverMessage", (incoming) => {
            if(this.debug) this.logger.debug(`server message received: ${JSON.stringify(incoming)}`);
            // console.info(incoming.message);
        });

        this.socket.on("chat", (incoming) => {
            if(this.debug) this.logger.debug(`chat received: ${JSON.stringify(incoming)}`);
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
            //console.info(`Connected users: ${userList}`);
        });

        // controls
        this.socket.on("control", (incoming) => {
            if(this.debug) this.logger.debug(`Control received: ${JSON.stringify(incoming)}`);
            if(this.debug) this.logger.debug(`Current room joined: ${this.roomJoined}`);
            if(this.debug) this.logger.debug(`My client ID: ${this.clientId}`);
            if(this.debug) this.logger.debug(`Incoming header:`, incoming.header);

            if (this.roomJoined) {                      // Kind of HACK, ignore controls before joining a room
                //if(this.debug) this.logger.debug(`Room is joined, processing control`);
                // Check if this control was sent by this client
                if(this.debug) this.logger.debug(`INCOMING IN COLLABHUB.JS`, incoming);

                if (incoming.header && incoming.header.clientId !== this.clientId) {
                    if(this.debug) this.logger.debug("Control is from another client, continuing");
                    let newHeader = incoming.header,
                        newValues = incoming.values;
                    if(this.debug) this.logger.debug("Setting control in local store:", newHeader.name, newValues);
                    this.controls[newHeader.name] = newValues;

                    if (newHeader.name in this.handlers) {
                        if(this.debug) this.logger.debug("Handler found for control:", newHeader.name, this.handlers[newHeader.name],incoming);
                        this.handlers[newHeader.name](incoming);
                    } else {
                        if(this.debug) this.logger.debug("No handler found for control:", newHeader.name);
                    }

                    if(this.debug) this.logger.debug("Calling controlsCallback", this.controlsCallback, incoming.values);
                    this.controlsCallback(incoming.values);
                } else {
                    if(this.debug) this.logger.debug("Control is from this client or has no header, ignoring");
                }
            } else {
                if(this.debug) this.logger.debug("No room joined, ignoring control");
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
            if(this.debug) this.logger.debug(`Event received: ${JSON.stringify(incoming)}`);
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
        if(this.debug) this.logger.debug("control() called with args:", args);

        if (this.roomJoined) {
            if(this.debug) this.logger.debug("Room is joined:", this.roomJoined);

            let mode = args[0] === "publish" || args[0] === "pub" ? "publish" : "push",
                headerName = mode === "publish" ? args[1] : args[0],
                values = mode === "publish" ? args[2] : args[1],
                target = mode === "publish" ? args[3] ? args[3] : this.roomJoined : args[2] ? args[2] : this.roomJoined;

            if(this.debug) this.logger.debug("Parsed arguments - mode:", mode, "headerName:", headerName, "values:", values, "target:", target);

            const header = {
                name: headerName,
                clientId: this.clientId
            };

            if(this.debug) this.logger.debug("Created header:", header);

            const outgoing = {
                mode: mode,
                header: header,
                values: values,
                target: target
            };

            if(this.debug) this.logger.debug("Emitting control message:", JSON.stringify(outgoing));
            this.socket.emit("control", outgoing);
            if(this.debug) this.logger.debug("Control message emitted");
        } else {
            if(this.debug) this.logger.debug("No room joined, cannot send control");
            console.info("Join a room to send controls.");
        }
    }

    event(...args) {
        if(this.debug) this.logger.debug("event() called with args:", args);
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
        if(this.debug) this.logger.debug("chat() called with args:", [m,t]);
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
            console.log('chat', outgoing)
        } else {
            console.info("Join a room to chat.");
        }
    }

    setUsername(u) {
      if(this.debug) this.logger.debug("setUsername() called with args:", u);
       setTimeout(() => {
         this.socket.emit("addUsername", { username: u });
        this.username = u;
        console.log('set username to', this.username)
       }, 1000);
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
        if(this.debug) this.logger.debug(`joinRoom() called with roomName: ${roomName}`);


        if (this.roomJoined) {
            if(this.debug) this.logger.debug(`Already in room: ${this.roomJoined}, leaving it first`);
            this.leaveRoom(this.roomJoined);
        }

        if(this.debug) this.logger.debug(`Preparing to join room: ${roomName}`);
        // The server expects just the room name string, not an object
        if(this.debug) this.logger.debug(`Emitting joinRoom event with roomName: ${roomName}`);
        this.socket.emit("joinRoom", roomName);

        this.roomJoined = roomName;     // room joined, can start receiving controls/events
        if(this.debug) this.logger.debug(`Room joined flag set to: ${this.roomJoined}`);
        if(this.debug) this.logger.debug(`Client ID: ${this.clientId}`);
    }

    leaveRoom(roomName) {
        if(this.debug) this.logger.debug(`leaveRoom() called with roomName: ${roomName}`);
        // The server expects just the room name string, not an object
        this.socket.emit("leaveRoom", roomName);
        if(this.debug) this.logger.debug(`Emitted leaveRoom event with roomName: ${roomName}`);
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
