class SocketService {
    constructor() {
        this.socket = null;
        this.callbacks = {};
    }

    connect(url = "https://pokesolo-server-production.up.railway.app") {
        if (this.socket) return;
        
        console.log("Connecting to PokeSolo server:", url);
        this.socket = io(url);

        this.socket.on("connect", () => {
            console.log("Connected to server");
            if (this.callbacks["connect"]) this.callbacks["connect"]();
        });

        this.socket.on("disconnect", () => {
            console.log("Disconnected from server");
            if (this.callbacks["disconnect"]) this.callbacks["disconnect"]();
        });

        // Register default events
        const events = ["match_found", "selection_start", "battle_init", "turn_start", "action_result_self", "action_result_opponent", "battle_end", "opponent_disconnected", "request_action"];
        events.forEach(event => {
            this.socket.on(event, (data) => {
                if (this.callbacks[event]) this.callbacks[event](data);
            });
        });
    }

    get id() {
        return this.socket ? this.socket.id : null;
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }

    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}
