// websocketClient.js
class WebSocketClient {
    constructor(url, onMessageCallback) {
        this.url = url;
        this.onMessageCallback = onMessageCallback; // Callback for handling incoming code
        this.ws = null;
        this.connect();
        this.userId = null//Math.floor(Math.random()*10000).toString()
        this.enable = false
    }

    connect() {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('Connected to WebSocket server.');
        };

        this.ws.onmessage = async (event) => {
            const data = event.data instanceof Blob ? await event.data.text() : event.data;

            try {
                const { edit, senderId } = JSON.parse(data);
                console.log(senderId, edit, data)
                // Call the onMessage callback with the new text array
                if (this.onMessageCallback && senderId !== this.userId) {
                    this.onMessageCallback(edit, edit.senderName);
                }
            } catch (error) {
                console.error("Error parsing JSON:", error);
            }
        };

        this.ws.onclose = () => {
            console.log('Disconnected from WebSocket server.');
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    setUserId(userId) {
        this.userId = userId;
    }

    sendEdit(edit) {
        if( this.enable === false) return
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            edit.senderName =  this.userId
            const message = {
                edit,
                senderName: this.userId, // Use your custom senderId
            };
            console.log(JSON.stringify(message));
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket connection is not open.');
        }
    }

    executeCode(edit){
        if( this.enable === false) return
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            edit.senderName =  this.userId
            const message = {
                edit,
                senderName: this.userId, // Use your custom senderId
            };
            console.log(JSON.stringify(message));
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket connection is not open.');
        }
    }
}

export default WebSocketClient;