/**
 * Electron渲染进程脚本 - WebRTC与TouchDesigner通信实现
 * 本文件实现了WebRTC连接的核心逻辑，包括信令客户端、WebRTC连接管理和用户界面
 */

// 导入必要模块
// const adapter = require('webrtc-adapter'); // 移除此依赖，现代浏览器已内置WebRTC支持
const config = require('./webrtc_config/webRTCConfig.js'); // 导入WebRTC配置

// 全局变量
let signalingClient = null;    // 信令客户端实例
let webRTCConnection = null;   // WebRTC连接实例
let remoteVideo = null;        // 远程视频元素引用
let localClientId = null;      // 本地客户端ID
let clientsList = [];          // 可用客户端列表

/**
 * 信令客户端类 - 负责与信令服务器通信
 * 处理WebSocket连接、消息发送接收和客户端列表管理
 * 与TouchDesigner兼容的信令协议实现
 */
class SignalingClient {
    /**
     * 构造函数 - 初始化信令客户端
     */
    constructor() {
        this.connectedToServer = false;  // 服务器连接状态
        this.clients = [];               // 可用客户端列表
        this.webSocket = null;           // WebSocket连接
        this.properties = {
            timeJoined: Date.now()        // 加入时间戳，用于确定polite角色
        };
        
        this.webRTCConnection = null;    // WebRTC连接引用
    }
    
    /**
     * 设置WebRTC连接引用
     * @param {WebRTCConnection} connection - WebRTC连接实例
     */
    setWebRTCConnection(connection) {
        this.webRTCConnection = connection;
    }
    
    /**
     * 连接到信令服务器
     * 建立WebSocket连接并设置各种事件处理器
     */
    connect() {
        try {
            const wsUrl = config.signalingServerConfig.url;
            console.log('正在连接到信令服务器:', wsUrl);
            
            this.webSocket = new WebSocket(wsUrl);
            
            this.webSocket.onopen = () => {
                console.log('[WEBSOCKET] 连接到信令服务器成功');
                this.connectedToServer = true;
                updateUI('连接状态', '已连接到信令服务器');
                
                // 请求客户端列表
                this.webSocket.send(JSON.stringify({
                    metadata: {
                        apiVersion: '1.0.1',
                        compVersion: '1.0.1',
                        compOrigin: 'WebRTC',
                        projectName: 'TDWebRTCWebDemo',
                    },
                    signalingType: "ListClients",
                    sender: null, // will be filled by server
                    target: "",
                    content: {}
                }));
            };
            
            this.webSocket.onmessage = (message) => {
                try {
                    const messageObj = JSON.parse(message.data);
                    console.log('[WEBSOCKET] 收到消息:', messageObj);
                    
                    // 处理不同类型的消息
                    if (messageObj.connectionId) {
                        localClientId = messageObj.connectionId;
                        console.log('[WEBSOCKET] 分配的客户端ID:', localClientId);
                        updateUI('本地ID', localClientId);
                    }
                    
                    // 处理ClientEntered消息 - 保存自己的属性
                    if (messageObj.signalingType === 'ClientEntered') {
                        if (messageObj.content && messageObj.content.self) {
                            this.properties = messageObj.content.self.properties || { timeJoined: Date.now() };
                            console.log('[WEBSOCKET] 收到ClientEntered消息，保存属性:', this.properties);
                        }
                    }
                    
                    // 处理客户端列表 - 注意使用'Clients'而不是'ClientsList'
                    if (messageObj.signalingType === 'Clients') {
                        this.clients = messageObj.content.clients || [];
                        clientsList = this.clients;
                        console.log('[WEBSOCKET] 收到客户端列表:', this.clients);
                        updateClientsList(this.clients);
                    }
                    
                    // 处理WebRTC信令消息
                    if (messageObj.signalingType && this.webRTCConnection) {
                        this.webRTCConnection.onMessageReceived(messageObj);
                    }
                    
                } catch (error) {
                    console.error('[WEBSOCKET] 消息处理错误:', error);
                }
            };
            
            this.webSocket.onclose = () => {
                console.log('[WEBSOCKET] 连接已关闭');
                this.connectedToServer = false;
                updateUI('连接状态', '与信令服务器断开连接');
                
                // 尝试重连
                setTimeout(() => {
                    console.log('[WEBSOCKET] 尝试重新连接...');
                    this.connect();
                }, config.signalingServerConfig.reconnectInterval);
            };
            
            this.webSocket.onerror = (error) => {
                console.error('[WEBSOCKET] 连接错误:', error);
                this.connectedToServer = false;
                updateUI('连接状态', '信令服务器连接错误');
            };
            
        } catch (error) {
            console.error('[WEBSOCKET] 创建连接时出错:', error);
            updateUI('连接状态', '创建WebSocket连接失败');
        }
    }
}

/**
 * WebRTC连接类 - 管理WebRTC点对点连接
 * 实现与TouchDesigner兼容的WebRTC连接建立、媒体流处理和数据通道通信
 * 包含完美协商模式(Perfect Negotiation pattern)的实现
 */
class WebRTCConnection {
    /**
     * 构造函数 - 初始化WebRTC连接
     * @param {SignalingClient} signalingClient - 信令客户端实例
     */
    constructor(signalingClient) {
        // 设置信令客户端引用
        this.signalingClient = signalingClient;
        this.signalingClient.setWebRTCConnection(this);
        
        // 设置媒体约束
        this.mediaConstraints = config.mediaConstraints;
        
        // 完美协商变量 - 用于处理协商冲突
        this.polite = config.perfectNegotiation.polite;  // 是否为礼貌方
        this.makingOffer = config.perfectNegotiation.makingOffer;  // 是否正在创建offer
        this.ignoreOffer = config.perfectNegotiation.ignoreOffer;  // 是否忽略收到的offer
        this.isSettingRemoteAnswerPending = config.perfectNegotiation.isSettingRemoteAnswerPending;  // 是否正在设置远程answer
        
        // 连接状态变量
        this.peerConnection = null;  // RTCPeerConnection实例
        this.target = null;          // 目标客户端ID
        this.mouseDataChannel = null;  // 鼠标数据通道
        this.keyboardDataChannel = null;  // 键盘数据通道
    }
    
    /**
     * 创建对等连接
     * 初始化RTCPeerConnection，设置事件处理器，创建数据通道
     */
    createPeerConnection() {
        // 创建RTCPeerConnection实例
        this.peerConnection = new RTCPeerConnection(config.peerConnectionConfig);
        
        // 设置各种事件处理器
        this.peerConnection.onconnectionstatechange = this.handleConnectionStateChange.bind(this);  // 连接状态变化
        this.peerConnection.ondatachannel = this.handleDataChannel.bind(this);  // 接收到新的数据通道
        this.peerConnection.onicecandidate = this.handleIceCandidate.bind(this);  // 新的ICE候选
        this.peerConnection.onicecandidateerror = this.handleIceCandidateError.bind(this);  // ICE候选错误
        this.peerConnection.oniceconnectionstatechange = this.handleIceConnectionStateChange.bind(this);  // ICE连接状态变化
        this.peerConnection.onicegatheringstatechange = this.handleIceGatheringStateChange.bind(this);  // ICE收集状态变化
        this.peerConnection.onnegotiationneeded = this.handleNegotiationNeeded.bind(this);  // 需要协商
        this.peerConnection.onsignalingstatechange = this.handleSignalingStateChange.bind(this);  // 信令状态变化
        this.peerConnection.ontrack = this.handleTrack;  // 接收到媒体轨道
        this.peerConnection.removeTrack = this.handleRemoveTrack.bind(this);  // 移除轨道
        
        // 初始化远程视频流 - 准备接收远程视频
        let remoteStream = new MediaStream();
        remoteVideo = document.getElementById("videoStream");
        remoteVideo.srcObject = remoteStream;
        
        // 创建鼠标数据通道 - 必须使用TouchDesigner期望的名称"MouseData"
        this.mouseDataChannel = this.peerConnection.createDataChannel(config.dataChannels.mouse.label);
        this.mouseDataChannel.onopen = () => console.log('[WEBRTC] 鼠标数据通道已打开');
        this.mouseDataChannel.onclose = () => console.log('[WEBRTC] 鼠标数据通道已关闭');
        this.mouseDataChannel.onerror = (e) => console.error('[WEBRTC] 鼠标数据通道错误:', e);
        
        // 创建键盘数据通道 - 必须使用TouchDesigner期望的名称"KeyboardData"
        this.keyboardDataChannel = this.peerConnection.createDataChannel(config.dataChannels.keyboard.label);
        this.keyboardDataChannel.onopen = () => console.log('[WEBRTC] 键盘数据通道已打开');
        this.keyboardDataChannel.onclose = () => console.log('[WEBRTC] 键盘数据通道已关闭');
        this.keyboardDataChannel.onerror = (e) => console.error('[WEBRTC] 键盘数据通道错误:', e);
        
        // 创建本地视频流 - 用于发送到远程端
        this.createLocalStream();
    }
    
    async createLocalStream() {
        try {
            // 创建Canvas作为视频源
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
        
            // 创建动画
        const animationInterval = setInterval(() => {
            // 绘制渐变背景
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, 'blue');
            gradient.addColorStop(1, 'purple');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 绘制时间戳
            ctx.fillStyle = 'white';
                ctx.font = '24px Arial';
            const date = new Date();
            ctx.fillText(date.toLocaleTimeString(), 50, 50);
                ctx.fillText(`客户端ID: ${localClientId || '未连接'}`, 50, 80);
            
            // 绘制移动的圆形
            const time = Date.now() / 1000;
            const x = canvas.width / 2 + Math.cos(time) * 100;
            const y = canvas.height / 2 + Math.sin(time) * 100;
            ctx.beginPath();
            ctx.arc(x, y, 30, 0, Math.PI * 2);
            ctx.fillStyle = 'orange';
            ctx.fill();
            }, 33); // 约30fps
            
            window.animationInterval = animationInterval;
            
            // 从Canvas获取视频流
            const stream = canvas.captureStream(30);
            window.localStream = stream;
            
            // 创建本地视频预览
            const localVideo = document.createElement('video');
            localVideo.id = 'localVideoPreview';
            localVideo.autoplay = true;
            localVideo.muted = true;
            localVideo.style.position = 'absolute';
            localVideo.style.bottom = '10px';
            localVideo.style.right = '10px';
            localVideo.style.width = '160px';
            localVideo.style.height = '120px';
            localVideo.style.border = '1px solid white';
            localVideo.style.zIndex = '10';
            document.body.appendChild(localVideo);
            localVideo.srcObject = stream;
            
            // 添加轨道到peer连接
            stream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, stream);
            });
            
        } catch (error) {
            console.error('[WEBRTC] 创建本地流失败:', error);
        }
    }
    
    deletePeerConnection() {
        if (!this.peerConnection) return;
        
        // 清除事件处理器
        this.peerConnection.onconnectionstatechange = null;
        this.peerConnection.ondatachannel = null;
        this.peerConnection.onicecandidate = null;
        this.peerConnection.onicecandidateerror = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.onicegatheringstatechange = null;
        this.peerConnection.onnegotiationneeded = null;
        this.peerConnection.onsignalingstatechange = null;
        this.peerConnection.ontrack = null;
        this.peerConnection.removeTrack = null;
        
        // 停止轨道
        if (remoteVideo && remoteVideo.srcObject) {
            remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        }
        
        // 关闭数据通道
        if (this.mouseDataChannel) this.mouseDataChannel.close();
        if (this.keyboardDataChannel) this.keyboardDataChannel.close();
        
        // 关闭连接
        this.peerConnection.close();
        this.peerConnection = null;
        
        // 清除视频源
        if (remoteVideo) {
            remoteVideo.removeAttribute("src");
            remoteVideo.removeAttribute("srcObject");
        }
        
        updateUI('连接状态', '连接已关闭');
    }
    
    /**
     * 开始通话 - 初始化与目标客户端的WebRTC连接
     * 这是与TouchDesigner兼容的关键方法
     * @param {string} address - 目标客户端ID
     * @param {Object} properties - 目标客户端属性，包含timeJoined
     */
    onCallStart(address, properties) {
        // 设置远程地址作为目标
        this.target = address;
        
        // 设置polite状态 - 基于加入时间确定谁是polite方
        // 这是完美协商的关键，加入时间早的一方为polite方
        this.polite = this.signalingClient.properties.timeJoined < properties.timeJoined;
        
        // 创建新的对等连接
        this.createPeerConnection();
        
        // 添加仅接收视频的收发器 - 与TouchDesigner兼容的关键步骤!
        // 必须使用addTransceiver并设置direction为recvonly
        this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
        
        // 更新UI显示连接状态
        updateUI('连接状态', '正在与 ' + address + ' 建立连接...');
    }
    
    onCallEnd() {
        updateUI('连接状态', '通话已结束');
        this.deletePeerConnection();
    }
    
    // 事件处理器
    handleConnectionStateChange(event) {
        console.log('[WEBRTC] 连接状态变化:', event.target.connectionState);
        updateUI('连接状态', '连接状态: ' + event.target.connectionState);
        
        if (event.target.connectionState === 'disconnected') {
            this.deletePeerConnection();
        }
    }
    
    handleDataChannel(event) {
        console.log('[WEBRTC] 收到数据通道:', event.channel.label);
        
        // 处理不同类型的数据通道
        if (event.channel.label === config.dataChannels.mouse.label) {
            event.channel.onmessage = (msg) => {
                console.log('[WEBRTC] 收到鼠标数据:', msg.data);
            };
        } else if (event.channel.label === config.dataChannels.keyboard.label) {
            event.channel.onmessage = (msg) => {
                console.log('[WEBRTC] 收到键盘数据:', msg.data);
            };
        }
    }
    
    handleIceCandidate(event) {
        console.log('[WEBRTC] ICE候选:', event.candidate);
        
        if (event.candidate) {
            this.onMessageSendingIce(
                this.target,
                event.candidate.candidate,
                event.candidate.sdpMLineIndex,
                event.candidate.sdpMid
            );
        }
    }
    
    handleIceCandidateError(event) {
        console.error('[WEBRTC] ICE候选错误:', event);
    }
    
    handleIceConnectionStateChange(event) {
        console.log('[WEBRTC] ICE连接状态:', this.peerConnection.iceConnectionState);
        
        switch (this.peerConnection.iceConnectionState) {
            case "closed":
                updateUI('连接状态', 'ICE连接已关闭');
                break;
            case "failed":
                updateUI('连接状态', 'ICE连接失败, 尝试重启');
                this.peerConnection.restartIce();
                break;
        }
    }
    
    handleIceGatheringStateChange(event) {
        console.log('[WEBRTC] ICE收集状态:', this.peerConnection.iceGatheringState);
    }
    
    handleNegotiationNeeded(event) {
        console.log('[WEBRTC] 需要协商');
        
        if (this.peerConnection.signalingState === 'have-remote-offer') {
            console.log('[WEBRTC] 已经有远程offer，退出协商');
            return;
        }
        
        if (this.makingOffer) {
            console.log('[WEBRTC] 正在创建offer，退出协商');
            return;
        }
        
        try {
            this.makingOffer = true;
            this.peerConnection.setLocalDescription()
            .then(() => {
                this.onMessageSendingOffer(
                    this.target,
                    this.peerConnection.localDescription.sdp
                );
            });
        } catch (err) {
            console.error('[WEBRTC] 协商失败:', err);
        } finally {
            this.makingOffer = false;
        }
    }
    
    handleSignalingStateChange(event) {
        console.log('[WEBRTC] 信令状态变化:', this.peerConnection.signalingState);
    }
    
    handleTrack(event) {
        console.log('[WEBRTC] 收到媒体轨道:', event.track.kind);
        
        // 添加轨道到远程视频元素
        if (remoteVideo && remoteVideo.srcObject) {
            remoteVideo.srcObject.addTrack(event.track);
            updateUI('连接状态', '已连接到远程视频流');
        }
    }
    
    handleRemoveTrack(event) {
        console.log('[WEBRTC] 移除轨道');
        
        // 检查是否还有轨道
        if (remoteVideo && remoteVideo.srcObject) {
            let trackList = remoteVideo.srcObject.getTracks();
            if (trackList.length === 0) {
                this.deletePeerConnection();
            }
        }
    }
    
    // 信令消息处理
    onMessageReceived(messageObj) {
        var fnName = 'onMessageReceived' + messageObj.signalingType;
        var fnToCall = this[fnName];
        
        if (typeof fnToCall !== 'function') {
            console.log('[WEBRTC] 未实现的函数:', fnName);
        } else {
            fnToCall.call(this, messageObj);
        }
    }
    
    /**
     * 处理收到的Offer消息
     * 实现完美协商模式，处理可能的协商冲突
     * @param {Object} messageObj - 收到的Offer消息对象
     */
    onMessageReceivedOffer(messageObj) {
        console.log('[WEBRTC] 收到Offer');
        
        // 如果没有对等连接，创建一个
        if (this.peerConnection === null) {
            this.createPeerConnection();
        }
        
        // 检查是否可以接受offer - 完美协商的关键逻辑
        // 只有在未创建offer且连接状态稳定或正在设置远程answer时才能接受
        const readyForOffer = !this.makingOffer && 
                             (this.peerConnection.signalingState === 'stable' || 
                              this.isSettingRemoteAnswerPending);
        const offerCollision = !readyForOffer;  // 判断是否发生offer冲突
        
        // 非礼貌方在冲突时忽略收到的offer - 完美协商的核心
        this.ignoreOffer = !this.polite && offerCollision;
        if (this.ignoreOffer) {
            console.log('[WEBRTC] 忽略offer以避免冲突');
            return;
        }
        
        // 设置目标客户端ID
        this.target = messageObj.sender;
        
        // 获取timeJoined属性，确保它存在
        // 这个属性用于确定polite角色
        let remoteTimeJoined = 0;
        if (messageObj.content && 
            messageObj.content.properties && 
            messageObj.content.properties.timeJoined) {
            remoteTimeJoined = messageObj.content.properties.timeJoined;
        }
        
        // 设置polite状态，确保不会因为缺少timeJoined属性而出错
        // 加入时间早的一方为polite方
        this.polite = this.signalingClient.properties.timeJoined < remoteTimeJoined;
        
        // 处理offer - 标准的WebRTC协商流程
        this.peerConnection.setRemoteDescription({
            type: 'offer', 
            sdp: messageObj.content.sdp
        })
        .then(() => {
            // 创建应答
            return this.peerConnection.createAnswer();
        })
        .then((answer) => {
            // 设置本地描述
            return this.peerConnection.setLocalDescription(answer);
        })
        .then(() => {
            // 发送应答给对方
            this.onMessageSendingAnswer(
                messageObj.sender,
                this.peerConnection.localDescription.sdp
            );
        })
        .catch(error => {
            console.error('[WEBRTC] 处理Offer失败:', error);
        });
    }
    
    /**
     * 处理收到的Answer消息
     * 完成WebRTC连接的建立
     * @param {Object} messageObj - 收到的Answer消息对象
     */
    onMessageReceivedAnswer(messageObj) {
        console.log('[WEBRTC] 收到Answer');
        
        if (!this.peerConnection) {
            console.warn('[WEBRTC] 收到Answer但没有活动的连接');
            return;
        }
        
        // 确保properties存在
        if (messageObj.content && 
            messageObj.content.properties && 
            messageObj.content.properties.timeJoined) {
            // 可以根据需要使用properties
            console.log('[WEBRTC] 远程客户端加入时间:', messageObj.content.properties.timeJoined);
        }
        
        // 设置远程描述
        this.isSettingRemoteAnswerPending = true;
        this.peerConnection.setRemoteDescription({
            type: 'answer',
            sdp: messageObj.content.sdp
        })
        .then(() => {
            this.isSettingRemoteAnswerPending = false;
            updateUI('连接状态', '远程Answer已设置');
        })
        .catch(error => {
            console.error('[WEBRTC] 设置远程Answer失败:', error);
            this.isSettingRemoteAnswerPending = false;
        });
    }
    
    onMessageReceivedIce(messageObj) {
        console.log('[WEBRTC] 收到ICE候选');
        
        if (!this.peerConnection) {
            console.warn('[WEBRTC] 收到ICE但没有活动的连接');
            return;
        }
        
        // 创建ICE候选
        var candidate = new RTCIceCandidate({
            candidate: messageObj.content.sdpCandidate,
            sdpMLineIndex: messageObj.content.sdpMLineIndex,
            sdpMid: messageObj.content.sdpMid
        });
        
        // 添加ICE候选
        this.peerConnection.addIceCandidate(candidate)
        .catch(error => {
            console.error('[WEBRTC] 添加ICE候选失败:', error);
        });
    }
    
    onMessageReceivedCallStart(messageObj) {
        console.log('[WEBRTC] 收到CallStart请求');
        
        // 确保properties存在
        let properties = { timeJoined: Date.now() };
        if (messageObj.content && messageObj.content.properties) {
            properties = messageObj.content.properties;
        }
        
        this.onCallStart(messageObj.sender, properties);
    }
    
    onMessageReceivedCallEnd(messageObj) {
        console.log('[WEBRTC] 收到CallEnd请求');
        this.onCallEnd();
    }
    
    onMessageReceivedClientDisconnected(messageObj) {
        console.log('[WEBRTC] 客户端断开连接:', messageObj.sender);
        
        // 如果断开的是当前目标，则结束连接
        if (this.target === messageObj.sender) {
            this.onCallEnd();
        }
    }
    
    // 发送信令消息 - 这些方法完全匹配demo格式
    onMessageSendingOffer(target, sdp) {
        var msg = {
            metadata: {
                apiVersion: '1.0.1',
                compVersion: '1.0.1',
                compOrigin: 'WebRTC',
                projectName: 'TDWebRTCWebDemo',
            },
            signalingType: "Offer",
            sender: null, // will be filled by server
            target: target,
            content: {
                sdp: sdp,
                properties: {
                    timeJoined: this.signalingClient.properties.timeJoined
                }
            }
        };
        
        console.log('[WEBRTC] 发送Offer:', msg);
        this.signalingClient.webSocket.send(JSON.stringify(msg));
    }
    
    onMessageSendingAnswer(target, sdp) {
        var msg = {
            metadata: {
                apiVersion: '1.0.1',
                compVersion: '1.0.1',
                compOrigin: 'WebRTC',
                projectName: 'TDWebRTCWebDemo',
            },
            signalingType: "Answer",
            sender: null, // will be filled by server
            target: target,
            content: {
                sdp: sdp,
                properties: {
                    timeJoined: this.signalingClient.properties.timeJoined
                }
            }
        };
        
        console.log('[WEBRTC] 发送Answer:', msg);
        this.signalingClient.webSocket.send(JSON.stringify(msg));
    }
    
    onMessageSendingIce(target, sdpCandidate, sdpMLineIndex, sdpMid) {
        var msg = {
            metadata: {
                apiVersion: '1.0.1',
                compVersion: '1.0.1',
                compOrigin: 'WebRTC',
                projectName: 'TDWebRTCWebDemo',
            },
            signalingType: "Ice",
            sender: null, // will be filled by server
            target: target,
            content: {
                sdpCandidate: sdpCandidate,
                sdpMLineIndex: sdpMLineIndex,
                sdpMid: sdpMid
            }
        };
        
        console.log('[WEBRTC] 发送ICE候选:', msg);
        this.signalingClient.webSocket.send(JSON.stringify(msg));
    }
    
    // 发起通话
    startCall(targetId) {
        if (!targetId || !this.signalingClient.webSocket) {
            console.warn('[WEBRTC] 无法发起通话: 缺少目标ID或WebSocket未连接');
            return;
        }
        
        console.log('[WEBRTC] 发起与客户端的通话:', targetId);
        
        // 发送CallStart消息
        var callStartMsg = {
            metadata: {
                apiVersion: '1.0.1',
                compVersion: '1.0.1',
                compOrigin: 'WebRTC',
                projectName: 'TDWebRTCWebDemo',
            },
            signalingType: "CallStart",
            sender: null, // will be filled by server
            target: targetId,
            content: {
                properties: {
                    timeJoined: this.signalingClient.properties.timeJoined
                }
            }
        };
        
        this.signalingClient.webSocket.send(JSON.stringify(callStartMsg));
        this.target = targetId;
    }
    
    // 结束通话
    endCall() {
        if (!this.target || !this.signalingClient.webSocket) {
            console.warn('[WEBRTC] 无法结束通话: 没有活动的通话或WebSocket未连接');
            return;
        }
        
        console.log('[WEBRTC] 结束与客户端的通话:', this.target);
        
        // 发送CallEnd消息
        var callEndMsg = {
            metadata: {
                apiVersion: '1.0.1',
                compVersion: '1.0.1',
                compOrigin: 'WebRTC',
                projectName: 'TDWebRTCWebDemo',
            },
            signalingType: "CallEnd",
            sender: null, // will be filled by server
            target: this.target,
            content: {}
        };
        
        this.signalingClient.webSocket.send(JSON.stringify(callEndMsg));
        this.onCallEnd();
    }
}

// UI更新函数
function updateUI(section, message) {
    console.log(`UI更新 [${section}]:`, message);
    
    // 更新状态显示
    let statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// 更新客户端列表
function updateClientsList(clients) {
    console.log('更新客户端列表:', clients);
    
    // 过滤掉自己的ID，只显示其他客户端
    const filteredClients = clients.filter(client => {
        const clientId = typeof client === 'string' ? client : client.id || client.address;
        return clientId !== localClientId;
    });
    console.log('过滤后的客户端列表:', filteredClients);
    
    // 更新客户端列表显示
    let clientsListElement = document.getElementById('clients-list-display');
    if (clientsListElement) {
        if (!filteredClients || filteredClients.length === 0) {
            clientsListElement.innerHTML = '没有可用的客户端';
        } else {
            clientsListElement.innerHTML = '可用的客户端:<br>' + 
                filteredClients.map(client => {
                    // TD服务器返回的客户端格式可能是完整对象，而不仅仅是ID
                    const clientId = typeof client === 'string' ? client : client.id || client.address;
                    const isSelected = webRTCConnection && webRTCConnection.target === clientId;
                    return `<div class="client-item ${isSelected ? 'selected' : ''}" 
                               onclick="selectClient('${clientId}')">
                               ${clientId}
                           </div>`;
                }).join('');
        }
    }
}

// 选择客户端
window.selectClient = function(clientId) {
    if (webRTCConnection) {
        webRTCConnection.startCall(clientId);
    }
};

// 初始化界面
function initializeUI() {
    // 创建视频元素
    if (!document.getElementById('videoStream')) {
        const videoElem = document.createElement('video');
        videoElem.id = 'videoStream';
        videoElem.autoplay = true;
        videoElem.style.width = '100%';
        videoElem.style.height = '100vh';
        videoElem.style.objectFit = 'contain';
        document.body.appendChild(videoElem);
    }
    
    // 创建控制面板
    const controlPanel = document.createElement('div');
    controlPanel.className = 'control-panel';
    controlPanel.style.position = 'absolute';
    controlPanel.style.top = '20px';
    controlPanel.style.left = '20px';
    controlPanel.style.padding = '15px';
    controlPanel.style.backgroundColor = 'rgba(0,0,0,0.7)';
    controlPanel.style.borderRadius = '5px';
    controlPanel.style.color = 'white';
    controlPanel.style.zIndex = '100';
    
    controlPanel.innerHTML = `
        <h3 style="margin-top:0;">WebRTC控制面板</h3>
        <div id="connection-status">未连接</div>
        <div style="margin-top:10px;">
            <button id="refresh-btn" style="padding:5px 10px;margin-right:10px;">刷新客户端列表</button>
            <button id="disconnect-btn" style="padding:5px 10px;">断开连接</button>
        </div>
        <div id="clients-list-display" style="margin-top:15px;max-height:200px;overflow-y:auto;">
            等待客户端列表...
        </div>
    `;
    
    document.body.appendChild(controlPanel);
    
    // 添加按钮事件
    document.getElementById('refresh-btn').addEventListener('click', () => {
        if (signalingClient && signalingClient.webSocket) {
            signalingClient.webSocket.send(JSON.stringify({
                metadata: {
                    apiVersion: '1.0.1',
                    compVersion: '1.0.1',
                    compOrigin: 'WebRTC',
                    projectName: 'TDWebRTCWebDemo',
                },
                signalingType: "ListClients",
                sender: null, // will be filled by server
                target: "",
                content: {}
            }));
        }
    });
    
    document.getElementById('disconnect-btn').addEventListener('click', () => {
        if (webRTCConnection) {
            webRTCConnection.endCall();
        }
    });
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .client-item {
            padding: 5px;
            margin: 2px 0;
            cursor: pointer;
            border-radius: 3px;
            background-color: rgba(100,100,100,0.3);
        }
        .client-item:hover {
            background-color: rgba(100,100,255,0.5);
        }
        .client-item.selected {
            background-color: rgba(50,150,50,0.7);
        }
    `;
    document.head.appendChild(style);
}

// 初始化应用
window.onload = function() {
    console.log('初始化应用...');
    
    // 初始化UI
    initializeUI();
    
    // 创建信令客户端和WebRTC连接
    signalingClient = new SignalingClient();
    webRTCConnection = new WebRTCConnection(signalingClient);
    
    // 连接到信令服务器
    signalingClient.connect();
};