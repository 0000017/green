//处理WebRTC连接
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

let peerConnection;
let videoElement;
let signalingSocket;
let localClientId;
let remoteClientId;
let reconnectInterval;
let isConnected = false;

// 连接到信令服务器
function connectToSignalingServer() {
    // 根据实际部署修改服务器地址
    const signalingServerUrl = 'ws://localhost:3000';
    
    signalingSocket = new WebSocket(signalingServerUrl);
    
    signalingSocket.onopen = () => {
        console.log('已连接到信令服务器');
        clearInterval(reconnectInterval);
        
        // 注册为electron客户端类型，增加重要标识
        signalingSocket.send(JSON.stringify({
            type: 'register-client-type',
            clientType: 'electron',
            platform: 'electron-app',
            capabilities: ['video-source']
        }));
        
        // 立即请求获取客户端列表
        signalingSocket.send(JSON.stringify({
            type: 'list-clients'
        }));
        
        // 设置定期注册，确保服务器记住此客户端类型
        if (!window.registerInterval) {
            window.registerInterval = setInterval(() => {
                if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
                    // 周期性重新注册，确保类型信息不丢失
                    signalingSocket.send(JSON.stringify({
                        type: 'register-client-type',
                        clientType: 'electron',
                        platform: 'electron-app',
                        capabilities: ['video-source']
                    }));
                }
            }, 5000); // 每5秒重新注册一次
        }
    };
    
    signalingSocket.onmessage = async (event) => {
        try {
            const message = JSON.parse(event.data);
            
            // 兼容处理TouchDesigner格式的消息
            if (message.signalingType) {
                console.log(`收到TouchDesigner格式消息: ${message.signalingType}`);
                
                if (message.signalingType === 'Offer' && message.content && message.content.sdp) {
                    remoteClientId = message.senderId;
                    console.log('收到TouchDesigner格式的Offer');
                    await handleOffer(message.content.sdp);
                    return;
                } else if (message.signalingType === 'Answer' && message.content && message.content.sdp) {
                    console.log('收到TouchDesigner格式的Answer');
                    await handleAnswer(message.content.sdp);
                    return;
                } else if (message.signalingType === 'Ice' && message.content) {
                    console.log('收到TouchDesigner格式的ICE候选');
                    const candidate = {
                        candidate: message.content.sdpCandidate,
                        sdpMLineIndex: message.content.sdpMLineIndex,
                        sdpMid: message.content.sdpMid
                    };
                    handleIceCandidate(candidate);
                    return;
                }
            }
            
            // 标准格式消息处理
            switch (message.type) {
                case 'connect':
                    localClientId = message.id;
                    console.log('分配的客户端ID:', localClientId);
                    updateConnectionStatus(true, "已连接到信令服务器");
                    break;
                    
                case 'potential-td-client':
                    // 处理潜在的TouchDesigner客户端
                    console.log('收到潜在的TouchDesigner客户端:', message.tdClientId);
                    if (!isConnected && message.tdClientId) {
                        remoteClientId = message.tdClientId;
                        console.log('主动连接到潜在的TouchDesigner客户端');
                        initiateConnection();
                    }
                    break;
                    
                case 'clients-list':
                    // 处理客户端列表，可以选择连接的对象
                    console.log('可用客户端:', message.clients);
                    
                    // 过滤出TouchDesigner客户端
                    const tdClients = message.clients.filter(client => 
                        client.type === 'touchdesigner' || client.type === 'unknown'
                    );
                    
                    updateClientsUI(tdClients);
                    
                    // 如果有TouchDesigner客户端，自动连接到第一个
                    // 实际应用中可能需要UI界面来选择
                    if (tdClients.length > 0 && !isConnected) {
                        remoteClientId = tdClients[0].id;
                        initiateConnection();
                    }
                    break;
                    
                case 'offer':
                    if (message.sender !== localClientId) {
                        console.log('收到远程offer');
                        remoteClientId = message.sender;
                        await handleOffer(message.sdp);
                    }
                    break;
                    
                case 'answer':
                    if (message.sender === remoteClientId) {
                        console.log('收到远程answer');
                        await handleAnswer(message.sdp);
                    }
                    break;
                    
                case 'ice-candidate':
                    if (message.sender === remoteClientId) {
                        handleIceCandidate(message.candidate);
                    }
                    break;
                    
                case 'client-disconnected':
                    if (message.id === remoteClientId) {
                        console.log('远程客户端断开连接');
                        updateConnectionStatus(false, "远程客户端断开连接");
                        resetConnection();
                    }
                    break;
            }
        } catch (error) {
            console.error('处理消息时出错:', error);
        }
    };
    
    signalingSocket.onclose = () => {
        console.log('与信令服务器的连接已关闭');
        updateConnectionStatus(false, "与信令服务器断开连接");
        
        // 尝试重新连接
        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                console.log('尝试重新连接到信令服务器...');
                connectToSignalingServer();
            }, 5000);
        }
    };
    
    signalingSocket.onerror = (error) => {
        console.error('信令服务器连接错误:', error);
        updateConnectionStatus(false, "信令服务器连接错误");
    };
}

// 创建客户端列表UI
function updateClientsUI(clients) {
    // 如果已有控制面板则更新
    let controlPanel = document.querySelector('.control-panel');
    
    if (!controlPanel) {
        // 创建控制面板
        controlPanel = document.createElement('div');
        controlPanel.className = 'control-panel';
        document.body.appendChild(controlPanel);
    }
    
    // 创建或更新客户端列表UI
    let html = '<div class="webrtc-controls">';
    
    if (clients.length === 0) {
        html += '<p>没有可用的远程客户端</p>';
    } else {
        html += '<label>可用客户端:</label>';
        html += '<select id="client-selector">';
        clients.forEach(client => {
            const type = client.type || 'unknown';
            const displayText = `${client.id} (${type})`;
            html += `<option value="${client.id}">${displayText}</option>`;
        });
        html += '</select>';
        html += '<button id="connect-btn">连接</button>';
    }
    
    html += '</div>';
    controlPanel.innerHTML = html;
    
    // 添加连接按钮事件
    const connectBtn = document.getElementById('connect-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            const selector = document.getElementById('client-selector');
            if (selector && selector.value) {
                remoteClientId = selector.value;
                initiateConnection();
            }
        });
    }
    
    // 同时更新新UI中的客户端列表显示
    const clientsListDisplay = document.getElementById('clients-list-display');
    if (clientsListDisplay) {
        if (clients.length === 0) {
            clientsListDisplay.textContent = '没有可用的远程客户端';
        } else {
            clientsListDisplay.innerHTML = '可用客户端:<br>' + 
                clients.map(client => {
                    const type = client.type || 'unknown';
                    return `ID: ${client.id} (${type})`;
                }).join('<br>');
                
            // 自动填充TouchDesigner ID
            const tdIdInput = document.getElementById('td-client-id');
            if (tdIdInput) {
                const tdClient = clients.find(c => c.type === 'touchdesigner' || c.type === 'unknown');
                if (tdClient) {
                    tdIdInput.value = tdClient.id;
                }
            }
        }
    }
}

// 初始化WebRTC
async function initWebRTC() {
    videoElement = document.getElementById('videoStream');
    
    // 设置视频样式
    videoElement.style.width = '100%';
    videoElement.style.height = '100vh';
    videoElement.style.objectFit = 'contain';
    
    // 创建状态显示
    const statusElement = document.createElement('div');
    statusElement.id = 'connection-status';
    document.body.appendChild(statusElement);
    
    // 创建连接按钮控制面板
    const controlPanel = document.createElement('div');
    controlPanel.style.position = 'absolute';
    controlPanel.style.bottom = '50px';
    controlPanel.style.left = '20px';
    controlPanel.style.padding = '10px';
    controlPanel.style.backgroundColor = 'rgba(0,0,0,0.7)';
    controlPanel.style.borderRadius = '5px';
    controlPanel.style.zIndex = '100';
    
    // 添加标题
    const panelTitle = document.createElement('div');
    panelTitle.textContent = 'WebRTC 连接控制';
    panelTitle.style.color = 'white';
    panelTitle.style.marginBottom = '10px';
    panelTitle.style.fontWeight = 'bold';
    controlPanel.appendChild(panelTitle);
    
    // 添加TouchDesigner ID输入框
    const tdIdInput = document.createElement('input');
    tdIdInput.type = 'text';
    tdIdInput.id = 'td-client-id';
    tdIdInput.placeholder = 'TouchDesigner ID';
    tdIdInput.style.marginRight = '10px';
    tdIdInput.style.padding = '5px';
    tdIdInput.style.width = '200px';
    controlPanel.appendChild(tdIdInput);
    
    // 添加连接按钮
    const connectButton = document.createElement('button');
    connectButton.textContent = '连接到TD';
    connectButton.style.padding = '5px 10px';
    connectButton.style.backgroundColor = '#4CAF50';
    connectButton.style.color = 'white';
    connectButton.style.border = 'none';
    connectButton.style.borderRadius = '3px';
    connectButton.style.cursor = 'pointer';
    
    // 连接按钮事件
    connectButton.addEventListener('click', () => {
        const tdId = document.getElementById('td-client-id').value;
        if (tdId) {
            console.log(`手动连接到TouchDesigner客户端: ${tdId}`);
            remoteClientId = tdId;
            initiateConnection();
        } else {
            alert('请输入TouchDesigner客户端ID');
        }
    });
    
    controlPanel.appendChild(connectButton);
    
    // 添加刷新按钮
    const refreshButton = document.createElement('button');
    refreshButton.textContent = '刷新列表';
    refreshButton.style.padding = '5px 10px';
    refreshButton.style.backgroundColor = '#2196F3';
    refreshButton.style.color = 'white';
    refreshButton.style.border = 'none';
    refreshButton.style.borderRadius = '3px';
    refreshButton.style.cursor = 'pointer';
    refreshButton.style.marginLeft = '10px';
    
    // 刷新按钮事件
    refreshButton.addEventListener('click', () => {
        if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
            console.log('手动请求客户端列表');
            signalingSocket.send(JSON.stringify({
                type: 'list-clients'
            }));
        }
    });
    
    controlPanel.appendChild(refreshButton);
    
    // 添加重置按钮
    const resetButton = document.createElement('button');
    resetButton.textContent = '重置连接';
    resetButton.style.padding = '5px 10px';
    resetButton.style.backgroundColor = '#F44336';
    resetButton.style.color = 'white';
    resetButton.style.border = 'none';
    resetButton.style.borderRadius = '3px';
    resetButton.style.cursor = 'pointer';
    resetButton.style.marginLeft = '10px';
    
    // 重置按钮事件
    resetButton.addEventListener('click', () => {
        console.log('手动重置连接');
        resetConnection();
    });
    
    controlPanel.appendChild(resetButton);
    
    // 添加客户端列表显示区域
    const clientsListDisplay = document.createElement('div');
    clientsListDisplay.id = 'clients-list-display';
    clientsListDisplay.style.marginTop = '10px';
    clientsListDisplay.style.color = 'white';
    clientsListDisplay.style.maxHeight = '100px';
    clientsListDisplay.style.overflowY = 'auto';
    clientsListDisplay.textContent = '等待客户端列表...';
    controlPanel.appendChild(clientsListDisplay);
    
    document.body.appendChild(controlPanel);
    
    connectToSignalingServer();
    setupWebRTCListeners();
}

// 创建RTC连接
async function createPeerConnection() {
    if (peerConnection) {
        peerConnection.close();
    }
    
    console.log('创建新的PeerConnection...');
    peerConnection = new RTCPeerConnection(configuration);
    
    // 添加本地视频流
    try {
        console.log('尝试获取本地视频流...');
        // 创建一个Canvas元素作为视频源
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        document.body.appendChild(canvas);
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '-1';
        canvas.style.opacity = '0.5';
        
        const ctx = canvas.getContext('2d');
        
        // 创建一个简单的动画以验证视频流
        const animationInterval = setInterval(() => {
            // 绘制渐变背景
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, 'blue');
            gradient.addColorStop(1, 'purple');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 绘制时间戳
            ctx.fillStyle = 'white';
            ctx.font = '30px Arial';
            const date = new Date();
            ctx.fillText(date.toLocaleTimeString(), 50, 50);
            
            // 绘制移动的圆形
            const time = Date.now() / 1000;
            const x = canvas.width / 2 + Math.cos(time) * 100;
            const y = canvas.height / 2 + Math.sin(time) * 100;
            ctx.beginPath();
            ctx.arc(x, y, 30, 0, Math.PI * 2);
            ctx.fillStyle = 'orange';
            ctx.fill();
        }, 50);
        
        // 保存interval引用以便可以在连接重置时清除
        window.animationInterval = animationInterval;
        
        // 从Canvas获取视频流
        const stream = canvas.captureStream(30); // 30fps
        
        // 保存流引用以便可以在连接重置时停止轨道
        window.localStream = stream;
        
        // 添加轨道到peerConnection，使用视频轨道类型标签
        stream.getTracks().forEach(track => {
            if (track.kind === 'video') {
                console.log(`添加本地视频轨道，TouchDesigner兼容类型`);
                // 设置特定的轨道ID和标签，使TouchDesigner能识别为video类型
                const sender = peerConnection.addTrack(track, stream);
                
                // 设置轨道的编码参数，确保兼容性
                const params = sender.getParameters();
                if (!params.encodings) {
                    params.encodings = [{}];
                }
                
                // 设置较低的比特率和分辨率，提高兼容性
                params.encodings[0].maxBitrate = 1000000; // 1Mbps
                params.encodings[0].maxFramerate = 30;
                
                sender.setParameters(params).catch(e => {
                    console.warn('设置视频参数失败:', e);
                });
            }
        });
        
        // 显示本地视频预览
        const localVideoPreview = document.getElementById('localVideoPreview') || document.createElement('video');
        if (!document.getElementById('localVideoPreview')) {
            localVideoPreview.id = 'localVideoPreview';
            localVideoPreview.style.position = 'absolute';
            localVideoPreview.style.bottom = '10px';
            localVideoPreview.style.right = '10px';
            localVideoPreview.style.width = '160px';
            localVideoPreview.style.height = '120px';
            localVideoPreview.style.border = '1px solid white';
            localVideoPreview.style.zIndex = '10';
            localVideoPreview.autoplay = true;
            localVideoPreview.muted = true;
            document.body.appendChild(localVideoPreview);
        }
        localVideoPreview.srcObject = stream;
        
    } catch (error) {
        console.error('获取本地视频流失败:', error);
    }
    
    // 处理接收到的流
    peerConnection.ontrack = (event) => {
        console.log('收到媒体轨道:', event.track.kind);
        if (event.streams && event.streams[0]) {
            videoElement.srcObject = event.streams[0];
            isConnected = true;
            console.log('已连接到TouchDesigner流');
            updateConnectionStatus(true, "已连接到视频流");
        }
    };
    
    // 监听ICE候选
    peerConnection.onicecandidate = (event) => {
        console.log('生成ICE候选:', event.candidate ? '有新候选' : '候选收集完成');
        if (event.candidate && signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
            console.log('发送ICE候选...');
            
            // 始终使用TouchDesigner格式发送ICE候选
            console.log('使用TouchDesigner格式发送ICE候选');
            signalingSocket.send(JSON.stringify({
                signalingType: 'Ice',
                targetId: remoteClientId,
                senderId: localClientId,
                content: {
                    sdpCandidate: event.candidate.candidate,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    sdpMid: event.candidate.sdpMid
                }
            }));
        }
    };
    
    // 连接状态变化
    peerConnection.onconnectionstatechange = () => {
        console.log('连接状态:', peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
            updateConnectionStatus(true, "WebRTC连接已建立");
            console.log('WebRTC连接已成功建立');
        } else if (peerConnection.connectionState === 'failed' || 
                   peerConnection.connectionState === 'disconnected' ||
                   peerConnection.connectionState === 'closed') {
            updateConnectionStatus(false, `连接${peerConnection.connectionState}`);
            if (peerConnection.connectionState === 'failed') {
                console.log('连接失败，尝试重新连接');
                setTimeout(() => {
                    resetConnection();
                }, 2000);
            }
        }
    };
    
    // ICE连接状态变化
    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE连接状态:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'failed') {
            console.log('ICE连接失败，尝试重启ICE');
            peerConnection.restartIce();
        }
    };
    
    // 不再在这里设置协商需要事件处理，避免循环协商
    // 让initiateConnection和handleOffer来明确控制协商流程
}

// 重置连接
function resetConnection() {
    // 停止所有本地媒体轨道
    if (window.localStream) {
        window.localStream.getTracks().forEach(track => {
            track.stop();
        });
        window.localStream = null;
    }

    // 清除动画间隔
    if (window.animationInterval) {
        clearInterval(window.animationInterval);
        window.animationInterval = null;
    }

    // 清除客户端列表请求间隔
    if (window.listClientInterval) {
        clearInterval(window.listClientInterval);
        window.listClientInterval = null;
    }
    
    // 清除注册间隔
    if (window.registerInterval) {
        clearInterval(window.registerInterval);
        window.registerInterval = null;
    }

    // 关闭并清除peer连接
    if (peerConnection) {
        console.log('重置连接: 关闭RTCPeerConnection');
        peerConnection.close();
        peerConnection = null;
    }
    
    isConnected = false;
    
    // 请求客户端列表以尝试重新连接
    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
        signalingSocket.send(JSON.stringify({
            type: 'list-clients'
        }));
    }
}

// 确保完全重置连接后再尝试新连接
async function initiateConnection() {
    updateConnectionStatus(true, "正在建立连接...");
    
    // 确保之前的连接完全关闭
    if (peerConnection) {
        console.log('关闭现有连接以避免m-lines顺序错误...');
        peerConnection.close();
        peerConnection = null;
        
        // 添加短暂延迟确保完全关闭
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    await createPeerConnection();
    
    try {
        // 创建offer，使用TouchDesigner期望的媒体约束
        console.log('创建TouchDesigner兼容的offer...');
        const offerOptions = {
            offerToReceiveVideo: true,  // 接收视频
            offerToReceiveAudio: false  // 不接收音频
        };
        
        const offer = await peerConnection.createOffer(offerOptions);
        
        // 修改SDP以提高与TouchDesigner的兼容性
        let modifiedSdp = offer.sdp;
        
        // 确保视频编码格式兼容
        if (!modifiedSdp.includes('H264')) {
            console.log('添加H264编码支持到SDP');
            // VP8和H264编码都添加，增加兼容性
            const videoSection = modifiedSdp.match(/m=video .*\r\n/g);
            if (videoSection && videoSection[0]) {
                // 保留原编码，只是增加优先级
                modifiedSdp = modifiedSdp.replace(
                    /a=rtpmap:[0-9]+ VP8\/[0-9]+\r\n/g,
                    match => match + "a=rtcp-fb:$1 nack\r\na=rtcp-fb:$1 nack pli\r\na=rtcp-fb:$1 ccm fir\r\n"
                );
            }
        }
        
        // 使用修改后的SDP
        offer.sdp = modifiedSdp;
        
        await peerConnection.setLocalDescription(offer);
        console.log('offer创建成功，设置本地描述...');
        console.log('SDP格式化后前50个字符:', modifiedSdp.substring(0, 50), '...');
        
        // 始终使用TouchDesigner格式发送offer
        console.log('使用TouchDesigner格式发送offer');
        signalingSocket.send(JSON.stringify({
            signalingType: 'Offer',
            targetId: remoteClientId,
            senderId: localClientId,
            content: {
                sdp: peerConnection.localDescription
            }
        }));
        
        // 定期请求客户端列表，但避免太频繁
        if (!window.listClientInterval) {
            window.listClientInterval = setInterval(() => {
                if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
                    signalingSocket.send(JSON.stringify({
                        type: 'list-clients'
                    }));
                }
            }, 10000); // 改为10秒一次，减少信令压力
        }
    } catch (error) {
        console.error('创建offer失败:', error);
        updateConnectionStatus(false, "创建连接请求失败");
    }
}

// 处理收到的offer
async function handleOffer(sdp) {
    updateConnectionStatus(true, "收到连接请求...");
    
    // 确保之前的连接完全关闭
    if (peerConnection) {
        console.log('关闭现有连接以避免m-lines顺序错误...');
        peerConnection.close();
        peerConnection = null;
        
        // 添加短暂延迟确保完全关闭
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    await createPeerConnection();
    
    try {
        console.log('设置远程描述...');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log('远程描述设置成功');
        
        // 创建answer
        console.log('创建answer...');
        const answer = await peerConnection.createAnswer();
        console.log('answer创建成功，设置本地描述...');
        await peerConnection.setLocalDescription(answer);
        console.log('本地描述设置成功，发送answer...');
        
        // 始终使用TouchDesigner格式发送answer
        console.log('使用TouchDesigner格式发送answer');
        signalingSocket.send(JSON.stringify({
            signalingType: 'Answer',
            targetId: remoteClientId,
            senderId: localClientId,
            content: {
                sdp: peerConnection.localDescription
            }
        }));
        
        console.log('answer已发送');
    } catch (error) {
        console.error('处理offer失败:', error);
        updateConnectionStatus(false, "处理连接请求失败");
    }
}

// 处理收到的answer
async function handleAnswer(sdp) {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (error) {
        console.error('处理answer失败:', error);
        updateConnectionStatus(false, "处理连接应答失败");
    }
}

// 处理ICE候选
async function handleIceCandidate(candidate) {
    try {
        if (!peerConnection) {
            console.warn('尝试添加ICE候选，但peerConnection不存在');
            return;
        }
        
        // 确保连接已经初始化
        if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('成功添加ICE候选');
        } else {
            console.warn('远程描述未设置，无法添加ICE候选');
            // 缓存ICE候选，等待remoteDescription设置后添加
            setTimeout(async () => {
                try {
                    if (peerConnection && peerConnection.remoteDescription) {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                        console.log('延迟添加ICE候选成功');
                    }
                } catch (error) {
                    console.error('延迟添加ICE候选失败:', error);
                }
            }, 1000);
        }
    } catch (error) {
        console.error('添加ICE候选失败:', error);
    }
}

// 更新连接状态显示
function updateConnectionStatus(connected, message) {
    let statusElem = document.getElementById('connection-status');
    if (!statusElem) {
        statusElem = document.createElement('div');
        statusElem.id = 'connection-status';
        document.body.appendChild(statusElem);
    }
    
    statusElem.className = connected ? 'connected' : 'disconnected';
    statusElem.textContent = message;
    statusElem.style.opacity = '1';
    
    // 如果是成功状态，3秒后淡出
    if (connected && message !== "正在建立连接...") {
        setTimeout(() => {
            statusElem.style.opacity = '0';
        }, 3000);
    }
}

// 监听WebRTC事件
function setupWebRTCListeners() {
    // 连接到信令服务器期间的常规检查
    setInterval(() => {
        if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
            console.log('发送客户端列表请求...');
            signalingSocket.send(JSON.stringify({
                type: 'list-clients'
            }));
            
            // 重新注册客户端类型，确保信令服务器知道我们的类型
            signalingSocket.send(JSON.stringify({
                type: 'register-client-type',
                clientType: 'electron'
            }));
        }
    }, 10000); // 每10秒执行一次
}

// 页面加载时初始化
window.onload = initWebRTC; 