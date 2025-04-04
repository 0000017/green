const WebSocket = require('ws');

// 信令服务器配置
const PORT = process.env.PORT || 9000;

// 客户端连接存储
const clients = new Map();

// 信令消息模板 - 严格匹配TouchDesigner期望的格式
const tdMessageTemplate = {
    metadata: {
        apiVersion: '1.0.1',
        compVersion: '1.0.1',
        compOrigin: 'WebRTC',
        projectName: 'TDWebRTCWebDemo'
    }
};

// 创建WebSocket服务器
const server = new WebSocket.Server({ port: PORT });

console.log(`信令服务器启动在端口 ${PORT}`);

// 客户端ID计数器
let clientCounter = 0;

// 当客户端连接时的处理
server.on('connection', function(ws) {
    // 为客户端生成唯一ID，使用简单的计数器
    const clientId = 'client_' + (++clientCounter);
    
    // 存储客户端连接
    clients.set(clientId, {
        id: clientId,
        connection: ws,
        properties: {
            timeJoined: Date.now(),
            clientType: 'unknown' // 默认客户端类型
        }
    });
    
    console.log(`客户端 ${clientId} 已连接`);
    
    // 发送连接确认和分配的ID - 使用TouchDesigner期望的格式
    ws.send(JSON.stringify({
        metadata: tdMessageTemplate.metadata,
        signalingType: 'Connected',
        sender: 'server',
        target: clientId,
        connectionId: clientId,
        content: {
            clientId: clientId,
            properties: {
                timeJoined: Date.now()
            }
        }
    }));
    
    // 广播客户端列表更新
    broadcastClientList();
    
    // 处理客户端消息
    ws.on('message', function(message) {
        try {
            const messageObj = JSON.parse(message);
            console.log(`收到来自客户端 ${clientId} 的消息类型:`, messageObj.signalingType || 'unknown');
            
            // 获取客户端实例，确保它存在
            const clientData = clients.get(clientId);
            if (!clientData) {
                console.error(`错误: 找不到客户端 ${clientId} 的数据`);
                return;
            }
            
            // 处理客户端信息更新 - 使用新格式
            if (messageObj.signalingType === 'ClientInfo' && messageObj.content && messageObj.content.properties) {
                // 更新客户端属性
                clientData.properties = {
                    ...clientData.properties,
                    ...messageObj.content.properties
                };
                console.log(`更新客户端 ${clientId} 属性:`, clientData.properties);
            }
            
            // 处理不同类型的消息 - 只支持signalingType格式
            if (messageObj.signalingType === 'ListClients') {
                // 向请求的客户端发送客户端列表
                sendClientList(ws);
            } 
            // 处理WebRTC信令消息 (Offer/Answer/Ice/CallStart/CallEnd等)
            else if (messageObj.signalingType) {
                // 添加发送者ID和确保content和properties存在
                messageObj.sender = clientId;
                
                if (!messageObj.content) {
                    messageObj.content = {};
                }
                
                if (!messageObj.content.properties && (messageObj.signalingType === 'Offer' || messageObj.signalingType === 'Answer' || messageObj.signalingType === 'CallStart')) {
                    messageObj.content.properties = clientData.properties;
                }
                
                // 如果有指定目标，则转发给目标客户端
                if (messageObj.target && clients.has(messageObj.target)) {
                    const targetClientData = clients.get(messageObj.target);
                    if (targetClientData && targetClientData.connection.readyState === WebSocket.OPEN) {
                        // 安全处理: 确保目标客户端可用
                        try {
                            targetClientData.connection.send(JSON.stringify(messageObj));
                            console.log(`将 ${messageObj.signalingType} 消息从 ${clientId} 转发到 ${messageObj.target}`);
                        } catch (e) {
                            console.error(`向客户端 ${messageObj.target} 发送消息失败:`, e);
                        }
                    } else {
                        console.log(`目标客户端 ${messageObj.target} 不可用或连接未打开`);
                    }
                } 
                // 如果没有指定目标，则广播给所有其他客户端
                else if (!messageObj.target) {
                    broadcastToOthers(clientId, messageObj);
                    console.log(`广播 ${messageObj.signalingType} 消息从 ${clientId} 到所有其他客户端`);
                }
            }
            
        } catch (error) {
            console.error(`处理来自客户端 ${clientId} 的消息时出错:`, error);
        }
    });
    
    // 处理客户端断开连接
    ws.on('close', function() {
        console.log(`客户端 ${clientId} 已断开连接`);
        
        // 向所有其他客户端广播断开通知
        const disconnectMessage = {
            metadata: tdMessageTemplate.metadata,
            signalingType: "ClientDisconnected",
            sender: clientId,
            content: {}
        };
        
        broadcastToOthers(clientId, disconnectMessage);
        
        // 从Map中移除客户端
        clients.delete(clientId);
        
        // 广播更新的客户端列表
        broadcastClientList();
    });
    
    // 处理错误
    ws.on('error', function(error) {
        console.error(`客户端 ${clientId} 连接错误:`, error);
        clients.delete(clientId);
        broadcastClientList();
    });
});

// 向所有客户端广播客户端列表
function broadcastClientList() {
    try {
        const clientIds = Array.from(clients.keys());
        
        // 为所有客户端创建客户端列表消息
        // 使用TouchDesigner兼容的格式
        const clientListMessage = {
            metadata: tdMessageTemplate.metadata,
            signalingType: 'ClientsList',
            sender: 'server',
            target: '',
            content: {
                clients: clientIds
            }
        };
        
        // 广播给所有连接的客户端
        clients.forEach(client => {
            try {
                if (client && client.connection && client.connection.readyState === WebSocket.OPEN) {
                    client.connection.send(JSON.stringify(clientListMessage));
                }
            } catch (e) {
                console.error(`向客户端 ${client.id} 发送客户端列表失败:`, e);
            }
        });
    } catch (error) {
        console.error('广播客户端列表时出错:', error);
    }
}

// 向特定客户端发送客户端列表
function sendClientList(ws) {
    try {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error('无法发送客户端列表: WebSocket未打开');
            return;
        }
        
        const clientIds = Array.from(clients.keys());
        
        // 使用TouchDesigner期望的格式
        const clientListMessage = {
            metadata: tdMessageTemplate.metadata,
            signalingType: 'ClientsList',
            sender: 'server',
            target: '',
            content: {
                clients: clientIds
            }
        };
        
        ws.send(JSON.stringify(clientListMessage));
    } catch (error) {
        console.error('发送客户端列表时出错:', error);
    }
}

// 广播消息给除了指定客户端之外的所有客户端
function broadcastToOthers(senderId, message) {
    try {
        clients.forEach((client, id) => {
            if (id !== senderId && client && client.connection && client.connection.readyState === WebSocket.OPEN) {
                try {
                    client.connection.send(JSON.stringify(message));
                } catch (e) {
                    console.error(`向客户端 ${id} 广播消息失败:`, e);
                }
            }
        });
    } catch (error) {
        console.error('广播消息时出错:', error);
    }
}

// 处理服务器错误
server.on('error', function(error) {
    console.error('服务器错误:', error);
});

// 优雅地处理进程终止
process.on('SIGINT', function() {
    console.log('服务器关闭中...');
    server.close();
    process.exit(0);
});