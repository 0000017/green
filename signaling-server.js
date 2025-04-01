const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// 创建HTTP服务器
const server = http.createServer(app);

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 存储连接的客户端
const clients = new Map();

// WebSocket连接处理
wss.on('connection', (ws) => {
    const clientId = Date.now().toString();
    // 添加客户端类型信息
    const clientInfo = {
        ws: ws,
        type: 'unknown', // 默认类型
        lastUpdated: Date.now() // 添加最后更新时间
    };
    clients.set(clientId, clientInfo);
    
    console.log(`新客户端连接: ${clientId}`);
    
    // 检查用户代理或连接特征，判断是否为TouchDesigner
    if (ws.protocol && ws.protocol.includes('TouchDesigner')) {
        clientInfo.type = 'touchdesigner';
        console.log(`自动识别客户端 ${clientId} 为TouchDesigner类型`);
    }
    
    // 发送客户端ID - 使用TouchDesigner格式
    ws.send(JSON.stringify({
        connectionId: clientId,
        messageType: "Connected"
    }));
    
    // 同时发送标准格式的连接消息，兼容Electron客户端
    ws.send(JSON.stringify({
        type: 'connect',
        id: clientId
    }));
    
    // 如果是新客户端连接，通知所有其他客户端
    broadcastClientsList();
    
    // 为TouchDesigner客户端设置自动列表更新定时器
    let listUpdateInterval;
    
    // 延迟一小段时间后再发送客户端列表，让TouchDesigner有时间处理连接消息
    setTimeout(() => {
        // 查找所有Electron客户端
        const electronClients = [];
        clients.forEach((info, id) => {
            if (info.type === 'electron' && id !== clientId) {
                electronClients.push({ id, type: 'electron' });
            }
        });
        
        console.log(`向客户端 ${clientId} 发送electron客户端列表:`, 
            electronClients.map(c => c.id).join(', ') || "空列表");
        
        // 发送TouchDesigner专用格式的客户端列表
        ws.send(JSON.stringify({
            messageType: 'ClientsList',
            clients: electronClients.map(c => c.id)
        }));
        
        // 同时发送标准格式，兼容Electron
        ws.send(JSON.stringify({
            type: 'clients-list',
            clients: electronClients
        }));
        
        // 如果这可能是TouchDesigner客户端，设置定期更新
        if (clientInfo.type === 'unknown' || clientInfo.type === 'touchdesigner') {
            // 每5秒自动发送一次客户端列表更新给TouchDesigner客户端
            listUpdateInterval = setInterval(() => {
                if (clients.has(clientId)) {
                    const currentElectronClients = [];
                    clients.forEach((info, id) => {
                        if (info.type === 'electron' && id !== clientId) {
                            currentElectronClients.push(id);
                        }
                    });
                    
                    console.log(`定期更新: 向客户端 ${clientId} 发送客户端列表:`, 
                        currentElectronClients.join(', ') || "空列表");
                    
                    // 发送TouchDesigner格式
                    try {
                        ws.send(JSON.stringify({
                            messageType: 'ClientsList',
                            clients: currentElectronClients
                        }));
                    } catch (error) {
                        console.error(`发送更新给客户端 ${clientId} 失败:`, error);
                        clearInterval(listUpdateInterval);
                    }
                } else {
                    // 如果客户端不再存在，清除定时器
                    clearInterval(listUpdateInterval);
                }
            }, 5000);
        }
    }, 1000); // 延迟1秒，确保TouchDesigner准备好接收列表
    
    // 处理收到的消息
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const messageType = data.type || data.signalingType || data.messageType || 'unknown';
            console.log(`收到来自 ${clientId} 的消息类型:`, messageType);
            
            // 如果是TouchDesigner的列表请求格式，发送客户端列表
            if (data.messageType === 'ListClients') {
                console.log(`收到TouchDesigner格式的客户端列表请求: ${clientId}`);
                
                // 查找所有Electron客户端
                const electronClients = [];
                clients.forEach((info, id) => {
                    if (info.type === 'electron' && id !== clientId) {
                        electronClients.push(id); // TouchDesigner只需要ID
                    }
                });
                
                console.log(`向TouchDesigner客户端 ${clientId} 发送客户端列表:`, electronClients.join(', '));
                
                // 发送TouchDesigner格式
                ws.send(JSON.stringify({
                    messageType: 'ClientsList',
                    clients: electronClients
                }));
                return;
            }
            
            // 检查是否为TouchDesigner特有的消息格式，如果是则自动标记客户端
            if ((data.signalingType || data.messageType) && !data.type) {
                if (clientInfo.type === 'unknown') {
                    clientInfo.type = 'touchdesigner';
                    clients.set(clientId, clientInfo);
                    console.log(`通过消息格式将客户端 ${clientId} 标记为TouchDesigner`);
                    
                    // 当确认是TouchDesigner后，立即通知所有Electron客户端
                    clients.forEach((info, id) => {
                        if (info.type === 'electron') {
                            console.log(`通知Electron客户端 ${id} 有新的TouchDesigner客户端 ${clientId}`);
                            info.ws.send(JSON.stringify({
                                type: 'clients-list',
                                clients: [{ id: clientId, type: 'touchdesigner' }]
                            }));
                        }
                    });
                }
                
                // 处理TouchDesigner格式的信令消息
                if (data.signalingType === 'Offer' || data.signalingType === 'Answer' || data.signalingType === 'Ice') {
                    const targetId = data.targetId;
                    
                    if (targetId && clients.has(targetId)) {
                        // 直接转发，不进行格式转换
                        console.log(`转发TouchDesigner ${data.signalingType}消息到目标 ${targetId}`);
                        clients.get(targetId).ws.send(message.toString());
                    } else {
                        console.log(`目标客户端 ${targetId} 不存在或未连接`);
                    }
                }
                
                return;
            }
            
            // 处理不同类型的标准消息
            switch (data.type) {
                case 'register-client-type':
                    // 注册客户端类型
                    if (data.clientType) {
                        const clientInfo = clients.get(clientId);
                        clientInfo.type = data.clientType;
                        clients.set(clientId, clientInfo);
                        console.log(`客户端 ${clientId} 注册为类型: ${data.clientType}`);
                        
                        // 通知所有客户端有新客户端注册
                        broadcastClientsList();
                        
                        // 特殊处理: 如果这是Electron客户端，通知所有TouchDesigner客户端
                        if (data.clientType === 'electron') {
                            broadcastToTouchDesignerClients(clientId);
                        }
                    }
                    break;
                case 'list-clients':
                    // 发送当前连接的客户端列表，包含类型信息
                    const clientsList = getClientsList(clientId);
                    console.log(`向客户端 ${clientId} 发送客户端列表: `, 
                        clientsList.map(c => `${c.id} (${c.type})`).join(', '));
                    
                    // 判断客户端类型，发送对应格式
                    if (clientInfo.type === 'touchdesigner') {
                        // TouchDesigner格式
                        ws.send(JSON.stringify({
                            messageType: 'ClientsList',
                            clients: clientsList.map(client => client.id)
                        }));
                    } else {
                        // 标准格式
                        ws.send(JSON.stringify({
                            type: 'clients-list',
                            clients: clientsList
                        }));
                    }
                    break;
                case 'offer':
                    // 记录offer信息
                    console.log(`客户端 ${data.sender} 向 ${data.target} 发送offer`);
                    
                    // 转发给目标客户端
                    if (data.target && clients.has(data.target)) {
                        const targetInfo = clients.get(data.target);
                        
                        // 检查目标是否为TouchDesigner客户端
                        if (targetInfo.type === 'touchdesigner') {
                            // 转换为TouchDesigner格式
                            console.log(`转换为TouchDesigner格式的offer消息`);
                            
                            targetInfo.ws.send(JSON.stringify({
                                signalingType: 'Offer',
                                targetId: data.target,
                                senderId: data.sender,
                                content: {
                                    sdp: data.sdp
                                }
                            }));
                        } else {
                            targetInfo.ws.send(message.toString());
                        }
                    } else {
                        console.log(`目标客户端 ${data.target} 不存在或未连接`);
                    }
                    break;
                case 'answer':
                    console.log(`客户端 ${data.sender} 向 ${data.target} 发送answer`);
                    
                    // 转发给目标客户端
                    if (data.target && clients.has(data.target)) {
                        const targetInfo = clients.get(data.target);
                        
                        // 检查目标是否为TouchDesigner客户端
                        if (targetInfo.type === 'touchdesigner') {
                            // 转换为TouchDesigner格式
                            console.log(`转换为TouchDesigner格式的answer消息`);
                            
                            targetInfo.ws.send(JSON.stringify({
                                signalingType: 'Answer',
                                targetId: data.target,
                                senderId: data.sender,
                                content: {
                                    sdp: data.sdp
                                }
                            }));
                        } else {
                            targetInfo.ws.send(message.toString());
                        }
                    } else {
                        console.log(`目标客户端 ${data.target} 不存在或未连接`);
                    }
                    break;
                case 'ice-candidate':
                    console.log(`客户端 ${data.sender} 向 ${data.target} 发送ICE候选`);
                    
                    // 转发给目标客户端
                    if (data.target && clients.has(data.target)) {
                        const targetInfo = clients.get(data.target);
                        
                        // 检查目标是否为TouchDesigner客户端
                        if (targetInfo.type === 'touchdesigner') {
                            // 转换为TouchDesigner格式
                            console.log(`转换为TouchDesigner格式的ICE候选消息`);
                            
                            targetInfo.ws.send(JSON.stringify({
                                signalingType: 'Ice',
                                targetId: data.target,
                                senderId: data.sender,
                                content: {
                                    sdpCandidate: data.candidate.candidate,
                                    sdpMLineIndex: data.candidate.sdpMLineIndex,
                                    sdpMid: data.candidate.sdpMid
                                }
                            }));
                        } else {
                            targetInfo.ws.send(message.toString());
                        }
                    } else {
                        console.log(`目标客户端 ${data.target} 不存在或未连接`);
                    }
                    break;
            }
        } catch (error) {
            console.error('处理消息时出错:', error);
        }
    });
    
    // 断开连接处理
    ws.on('close', () => {
        console.log(`客户端断开连接: ${clientId}`);
        
        // 清除定时器
        if (listUpdateInterval) {
            clearInterval(listUpdateInterval);
        }
        
        clients.delete(clientId);
        
        // 通知其他客户端有客户端断开连接
        clients.forEach((clientInfo) => {
            clientInfo.ws.send(JSON.stringify({
                type: 'client-disconnected',
                id: clientId
            }));
        });
        
        // 广播更新的客户端列表
        broadcastClientsList();
    });
});

// 向所有TouchDesigner客户端广播Electron客户端信息
function broadcastToTouchDesignerClients(electronClientId) {
    console.log(`向所有TouchDesigner客户端广播Electron客户端 ${electronClientId}`);
    
    clients.forEach((info, id) => {
        if (info.type === 'touchdesigner' || info.type === 'unknown') {
            // 对于TD客户端，我们发送一个简化的客户端列表，只包含这个Electron客户端
            info.ws.send(JSON.stringify({
                type: 'clients-list',
                clients: [{ id: electronClientId, type: 'electron' }]
            }));
        }
    });
}

// 获取客户端列表，排除当前客户端
function getClientsList(currentClientId) {
    const clientsList = [];
    clients.forEach((info, id) => {
        if (id !== currentClientId) {
            clientsList.push({
                id: id,
                type: info.type
            });
        }
    });
    return clientsList;
}

// 广播客户端列表给所有连接的客户端
function broadcastClientsList() {
    clients.forEach((clientInfo, id) => {
        const clientsList = getClientsList(id);
        clientInfo.ws.send(JSON.stringify({
            type: 'clients-list',
            clients: clientsList
        }));
    });
}

// 启动服务器
server.listen(port, () => {
    console.log(`信令服务器运行在 http://localhost:${port}`);
}); 