class SignalingClient {
    constructor(address, port, reactSetWebsocketClientsHandler, reactSetConnectedToServerHandler) {
        this.connectedToServer = false;
        this.clients = [];
        
        console.log(`尝试连接到信令服务器: ws://${address}:${port}`);
        
        // 确保在构造函数中保存回调
        this.reactClientsHandler = reactSetWebsocketClientsHandler;
        this.reactConnectedHandler = reactSetConnectedToServerHandler;
        
        this.open(address, port);
    }
    
    open(address, port) {
        try {
            const wsUrl = `ws://${address}:${port}`;
            console.log('正在连接到:', wsUrl);
            
            this.webSocket = new WebSocket(wsUrl);
            
            this.webSocket.onopen = () => {
                console.log('[WEBSOCKET] 连接成功');
                this.connectedToServer = true;
                this.reactConnectedHandler(true);
            };
            
            this.webSocket.onmessage = (message) => {
                try {
                    const messageObj = JSON.parse(message.data);
                    console.log('[WEBSOCKET] 收到消息:', messageObj);
                    
                    // Handle different message types
                    if (messageObj.type === 'clients-list') {
                        this.clients = messageObj.clients;
                        this.reactClientsHandler(this.clients);
                    }
                } catch (error) {
                    console.error('[WEBSOCKET] 消息处理错误:', error);
                }
            };
            
            this.webSocket.onclose = () => {
                console.log('[WEBSOCKET] 连接关闭');
                this.connectedToServer = false;
                this.reactConnectedHandler(false);
            };
            
            this.webSocket.onerror = (error) => {
                console.error('[WEBSOCKET] 连接错误:', error);
                this.connectedToServer = false;
                this.reactConnectedHandler(false);
            };
        } catch (error) {
            console.error('创建WebSocket连接时出错:', error);
            this.reactConnectedHandler(false);
        }
    }
}

module.exports = SignalingClient;