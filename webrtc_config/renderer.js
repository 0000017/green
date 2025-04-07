/**
 * Electron渲染进程脚本 - WebRTC与TouchDesigner通信实现
 * 本文件实现了WebRTC连接的核心逻辑，包括信令客户端、WebRTC连接管理和用户界面
 */

/**
 * WebRTC通信模块
 * 处理WebRTC连接、信令和媒体流
 */

// 导入必要模块
// const adapter = require('webrtc-adapter'); // 移除此依赖，现代浏览器已内置WebRTC支持
const { ipcRenderer } = require('electron');
const config = require('./webrtc_config/webRTCConfig.js'); // 导入WebRTC配置

// 全局变量
let signalingClient = null;    // 信令客户端实例
let webRTCConnection = null;   // WebRTC连接实例
let remoteVideo = null;        // 远程视频元素引用
let localClientId = null;      // 本地客户端ID
let videoTracks = [];          // 存储接收到的视频轨道
let currentTrackIndex = 0;     // 当前显示的视频轨道索引
let peerConnection;
let dataChannel;
let mediaStream;
let videoElement;
let wsConnection;
let receivedSdp = false;
let wsUrl = 'ws://localhost:8080'; // 默认WebSocket地址
let connectionRetryCount = 0;
const MAX_RETRY_COUNT = 5;
const RETRY_DELAY = 3000; // 重连延迟（毫秒）

// 全局变量存储轨道列表
let availableTracks = [];

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
                        console.log('[WEBSOCKET] 收到客户端列表:', this.clients);
                        
                        // 自动接受第一个连接请求（如果有客户端）
                        if (this.clients.length > 0 && webRTCConnection) {
                            const firstClient = this.clients[0];
                            const clientId = typeof firstClient === 'string' ? firstClient : firstClient.id || firstClient.address;
                            console.log('[WEBSOCKET] 自动连接到客户端:', clientId);
                            webRTCConnection.startCall(clientId);
                        }
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
        this.peerConnection.ontrack = this.handleTrack.bind(this);  // 接收到媒体轨道，修正为绑定方法
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
    
    /**
     * 创建本地媒体流 - 在当前应用场景中不需要本地视频源
     * 但保留此方法以便未来扩展
     */
    createLocalStream() {
        console.log('[WEBRTC] 跳过创建本地流 - 此应用仅接收远程视频');
        return Promise.resolve(null); // 返回空的Promise
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
        
        // 清空视频轨道列表
        videoTracks = [];
        currentTrackIndex = 0;
        
        // 更新UI
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
        console.log('[WEBRTC] 收到媒体轨道:', event.track.kind, '轨道ID:', event.track.id);
        
        // 只处理视频轨道
        if (event.track.kind === 'video') {
            // 直接使用最新的轨道，不再保存历史轨道
            videoTracks = [event.track]; // 只保留最新的轨道
            currentTrackIndex = 0;
            
            // 立即显示新轨道
            const videoElement = document.getElementById('videoStream');
            if (videoElement) {
                // 创建或重用MediaStream
                let stream = videoElement.srcObject;
                if (!stream) {
                    stream = new MediaStream();
                }
                
                // 移除所有现有轨道
                const existingTracks = stream.getTracks();
                existingTracks.forEach(track => stream.removeTrack(track));
                
                // 添加新轨道
                stream.addTrack(event.track);
                videoElement.srcObject = stream;
            }
            
            // 更新UI状态
            updateUI('连接状态', '已连接到远程视频流');
            updateTracksUI(); // 更新轨道UI（虽然现在只有一个轨道）
        } else {
            // 处理其他类型的轨道（如音频）
            if (remoteVideo && remoteVideo.srcObject) {
                remoteVideo.srcObject.addTrack(event.track);
            }
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
            
            // 在收到Offer时添加视频接收器，确保可以接收TD发送的视频轨道
            this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
            console.log('[WEBRTC] 已添加视频接收器准备接收TD视频流');
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
        
        // 记录接收到的SDP内容，便于调试
        console.log('[WEBRTC] 收到的SDP:', messageObj.content.sdp);
        
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
            // 记录创建的answer SDP，便于调试
            console.log('[WEBRTC] 创建的Answer SDP:', answer.sdp);
            
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

/**
 * 更新UI状态
 * @param {string} type - 要更新的UI元素类型
 * @param {string} content - 要显示的内容
 */
function updateUI(type, content) {
    if (type === '连接状态') {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = content;
            
            // 根据内容设置状态类
            if (content.includes('已连接') || content.includes('已建立')) {
                statusElement.className = 'connected';
            } else if (content.includes('断开') || content.includes('失败') || content.includes('错误')) {
                statusElement.className = 'disconnected';
            } else {
                statusElement.className = 'connecting';
            }
        }
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('[APP] WebRTC视频接收器已启动');
    
    // 初始化UI
    initializeUI();
    
    // 初始化视频元素
    remoteVideo = document.getElementById('videoStream');
    
    // 创建信令客户端
    signalingClient = new SignalingClient();
    
    // 创建WebRTC连接
    webRTCConnection = new WebRTCConnection(signalingClient);
    
    // 连接到信令服务器
    signalingClient.connect();
    
    console.log('[APP] 初始化完成，等待连接...');
});

// 简化switchToTrack函数，因为现在只会有一个轨道
function switchToTrack(index) {
    console.log('[WEBRTC] 当前只保留最新的轨道，无需切换');
    return; // 不需要执行任何操作
}

// 简化updateTracksUI函数，因为现在只会有一个轨道
function updateTracksUI() {
    // 查找或创建轨道控制容器
    let tracksControl = document.getElementById('tracks-control');
    if (tracksControl) {
        // 由于只保留最新轨道，这里可以隐藏或移除轨道选择UI
        tracksControl.style.display = 'none';
    }
}

// 将switchToTrack函数暴露给全局
window.switchToTrack = switchToTrack;

// 更新连接状态的封装函数，便于调用
function updateConnectionStatusWrapper(status, message) {
    // 使用全局函数更新状态（来自ui.js）
    if (typeof window.updateConnectionStatus === 'function') {
        window.updateConnectionStatus(status, message);
    } else {
        console.log(`连接状态: ${status} - ${message}`);
    }
}

// 初始化连接状态
function initConnectionStatus() {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        updateConnectionStatusWrapper('connected', '已连接');
        // 连接成功后获取轨道列表
        requestTracksList();
    } else {
        updateConnectionStatusWrapper('disconnected', '未连接');
    }
}

// 请求获取可用轨道列表
function requestTracksList() {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        try {
            const trackRequest = {
                type: 'get_tracks'
            };
            wsConnection.send(JSON.stringify(trackRequest));
            console.log('已发送轨道列表请求');
        } catch (error) {
            console.error('发送轨道请求失败:', error);
        }
    }
}

// 处理获取到的轨道列表
function handleTracksResponse(tracks) {
    console.log('获取到轨道列表:', tracks);
    availableTracks = tracks || [];
    
    // 使用UI模块更新轨道显示
    if (typeof window.updateTracks === 'function') {
        window.updateTracks(availableTracks);
    }
}

// 轨道选择处理函数
function selectTrack(trackId) {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        try {
            const selectRequest = {
                type: 'select_track',
                trackId: trackId
            };
            wsConnection.send(JSON.stringify(selectRequest));
            console.log('已选择轨道:', trackId);
        } catch (error) {
            console.error('发送轨道选择请求失败:', error);
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('WebRTC初始化...');
    videoElement = document.getElementById('videoStream');
    initWebSocket(); // 启动WebSocket连接
    // 检查连接状态并更新显示
    setTimeout(initConnectionStatus, 1000);
    
    // 设置轨道选择回调
    window.onTrackSelected = selectTrack;
});

// 在WebSocket消息处理中添加轨道列表处理
// ... existing code ...

// 在WebSocket连接回调中添加如下代码：
wsConnection.onmessage = function(event) {
    try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'track_list') {
            // 处理轨道列表
            handleTracksResponse(msg.tracks);
        } else if (msg.type === 'track_selected') {
            // 处理轨道选择确认
            console.log('轨道已选择:', msg.trackId);
            // 这里可以添加其他处理逻辑
        }
        // ... 处理其他消息类型
    } catch (error) {
        console.error('处理WebSocket消息时出错:', error);
    }
};

// ... existing code ...