const WebSocket = require('ws');

// 信令服务器配置
const PORT = process.env.PORT || 9000;

// 客户端连接存储 - 这里使用Map便于通过ID查找
const clients = new Map();

// 创建WebSocket服务器
const server = new WebSocket.Server({ port: PORT });

console.log(`信令服务器启动在端口 ${PORT}`);

// 客户端ID计数器
let clientCounter = 0;

// TD消息标准格式
const tdMessageFormat = {
    metadata: {
        apiVersion: '1.0.1',
        compVersion: '1.0.1',
        compOrigin: 'WebRTC',
        projectName: 'TDWebRTCWebDemo'
    }
};

// 当客户端连接时的处理
server.on('connection', function(ws, req) {
    // 为客户端生成唯一ID
    const clientId = 'client_' + (++clientCounter);
    
    // 创建客户端属性，包含timeJoined
    const clientProperties = {
        timeJoined: Date.now()
    };
    
    // 存储客户端连接信息
    clients.set(clientId, {
        id: clientId,
        address: clientId, // 添加address字段，与id相同
        connection: ws,
        properties: clientProperties
    });
    
    console.log(`新客户端 ${clientId} 已连接`);
    
    // 发送连接确认和ID分配 - 注意这里的格式必须与TD期望的完全匹配
    const connectionMessage = {
        connectionId: clientId,  // 这是关键字段，客户端用它来识别自己
        metadata: tdMessageFormat.metadata
    };
    
    ws.send(JSON.stringify(connectionMessage));
    console.log(`已向客户端 ${clientId} 发送连接确认:`, connectionMessage);
    
    // 发送ClientEntered消息 - TouchDesigner期望的格式
    const clientEnteredMessage = {
        metadata: tdMessageFormat.metadata,
        signalingType: 'ClientEntered',
        sender: null,
        target: '',
        content: {
            self: {
                id: clientId,
                address: clientId, // 添加address字段，与id相同
                properties: clientProperties
            }
        }
    };
    
    ws.send(JSON.stringify(clientEnteredMessage));
    console.log(`已向客户端 ${clientId} 发送ClientEntered消息`);
    
    // 广播更新的客户端列表
    broadcastClientsList();
    
    // 处理客户端消息
    ws.on('message', function(message) {
        try {
            // 解析接收到的消息
            const messageObj = JSON.parse(message);
            console.log(`收到来自 ${clientId} 的消息类型: ${messageObj.signalingType || messageObj.type || 'unknown'}`);
            
            // 详细日志
            if (process.env.DEBUG) {
                console.log(`完整消息内容: ${message}`);
            }
            
            // 获取客户端数据，确保它存在
            const clientData = clients.get(clientId);
            if (!clientData) {
                console.error(`无法找到客户端 ${clientId} 的数据`);
                return;
            }
            
            // 处理ListClients请求
            if (messageObj.signalingType === 'ListClients') {
                sendClientsList(ws);
                return;
            }
            
            // 为所有信令消息添加发送者信息和元数据
            if (messageObj.signalingType) {
                // 确保消息有发送者字段
                messageObj.sender = clientId;
                
                // 确保消息有元数据
                if (!messageObj.metadata) {
                    messageObj.metadata = tdMessageFormat.metadata;
                }
                
                // 确保content字段存在
                if (!messageObj.content) {
                    messageObj.content = {};
                }
                
                // 处理特定类型的消息
                if (messageObj.signalingType === 'Ice') {
                    // 确保Ice消息格式正确，TD期望sdpCandidate字段
                    if (messageObj.content.candidate && !messageObj.content.sdpCandidate) {
                        messageObj.content.sdpCandidate = messageObj.content.candidate;
                        delete messageObj.content.candidate;
                    }
                }
                
                // 根据target字段决定转发方式
                if (messageObj.target && clients.has(messageObj.target)) {
                    // 发送给特定目标
                    const targetClient = clients.get(messageObj.target);
                    if (targetClient && targetClient.connection.readyState === WebSocket.OPEN) {
                        targetClient.connection.send(JSON.stringify(messageObj));
                        console.log(`已转发 ${messageObj.signalingType} 消息从 ${clientId} 到 ${messageObj.target}`);
                    } else {
                        console.log(`目标客户端 ${messageObj.target} 不可用`);
                    }
                } else if (!messageObj.target || messageObj.target === '') {
                    // 广播给其他所有客户端
                    broadcastToOthers(clientId, messageObj);
                }
            }
        } catch (error) {
            console.error(`处理消息时出错: ${error.message}`);
            console.error(`原始消息: ${message}`);
        }
    });
    
    // 处理客户端断开连接
    ws.on('close', function() {
        console.log(`客户端 ${clientId} 已断开连接`);
        
        // 向其他客户端广播断开通知
        const disconnectMessage = {
            metadata: tdMessageFormat.metadata,
            signalingType: 'ClientDisconnected',
            sender: clientId,
            target: '',
            content: {}
        };
        
        broadcastToOthers(clientId, disconnectMessage);
        
        // 从Map中移除客户端
        clients.delete(clientId);
        
        // 广播更新的客户端列表
        broadcastClientsList();
    });
    
    // 处理错误
    ws.on('error', function(error) {
        console.error(`客户端 ${clientId} 连接错误:`, error);
        clients.delete(clientId);
        broadcastClientsList();
    });
});

// 向所有客户端广播客户端列表
function broadcastClientsList() {
    try {
        // 广播给所有连接的客户端，但每个客户端只收到其他客户端的信息
        clients.forEach((client, clientId) => {
            if (client && client.connection && client.connection.readyState === WebSocket.OPEN) {
                try {
                    // 为当前客户端创建一个不包含自己的客户端列表
                    const filteredClientsArray = Array.from(clients.values())
                        .filter(c => c.id !== clientId) // 过滤掉当前客户端
                        .map(c => ({
                            id: c.id,
                            address: c.address, // 添加address字段
                            properties: c.properties
                        }));
                    
                    // TD格式的客户端列表消息 - 使用'Clients'而不是'ClientsList'
                    const clientsListMessage = {
                        metadata: tdMessageFormat.metadata,
                        signalingType: 'Clients',
                        content: {
                            clients: filteredClientsArray
                        }
                    };
                    
                    client.connection.send(JSON.stringify(clientsListMessage));
                } catch (error) {
                    console.error(`向客户端 ${clientId} 发送客户端列表失败:`, error);
                }
            }
        });
    } catch (error) {
        console.error('广播客户端列表时出错:', error);
    }
}

// 向特定客户端发送客户端列表
function sendClientsList(ws) {
    try {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error('无法发送客户端列表: WebSocket未打开');
            return;
        }
        
        // 找到当前WebSocket对应的客户端ID
        let currentClientId = null;
        for (const [id, client] of clients.entries()) {
            if (client.connection === ws) {
                currentClientId = id;
                break;
            }
        }
        
        if (!currentClientId) {
            console.error('无法确定请求客户端列表的客户端ID');
            return;
        }
        
        // 创建客户端列表 - 只包含其他客户端的信息
        const clientsArray = Array.from(clients.values())
            .filter(client => client.id !== currentClientId) // 过滤掉当前客户端
            .map(client => ({
                id: client.id,
                address: client.address, // 添加address字段
                properties: client.properties
            }));
        
        // TD格式的客户端列表消息 - 使用'Clients'而不是'ClientsList'
        const clientsListMessage = {
            metadata: tdMessageFormat.metadata,
            signalingType: 'Clients',
            content: {
                clients: clientsArray
            }
        };
        
        ws.send(JSON.stringify(clientsListMessage));
        console.log(`已向客户端 ${currentClientId} 发送不包含自身的客户端列表`);
    } catch (error) {
        console.error('发送客户端列表时出错:', error);
    }
}

// 广播消息给除了指定客户端之外的所有客户端
function broadcastToOthers(senderId, message) {
    try {
        // 确保消息格式完整
        if (!message.metadata) {
            message.metadata = tdMessageFormat.metadata;
        }
        
        if (!message.sender) {
            message.sender = senderId;
        }
        
        // 向除发送者外的所有客户端发送消息
        clients.forEach((client, id) => {
            if (id !== senderId && client && client.connection && client.connection.readyState === WebSocket.OPEN) {
                try {
                    client.connection.send(JSON.stringify(message));
                } catch (error) {
                    console.error(`向客户端 ${id} 广播消息失败:`, error);
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