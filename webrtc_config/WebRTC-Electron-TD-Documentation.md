# WebRTC与TouchDesigner通信实现文档

## 目录

1. [概述](#概述)
2. [系统架构](#系统架构)
3. [配置文件详解 (webRTCConfig.js)](#配置文件详解)
4. [WebRTC连接流程](#webrtc连接流程)
5. [与TouchDesigner兼容性要点](#与touchdesigner兼容性要点)

## 概述

本文档详细说明了基于Electron的WebRTC通信系统与TouchDesigner的连接实现。系统通过WebSocket实现信令交换，使用WebRTC建立点对点连接，支持视频流传输和数据通道通信。

## 系统架构

系统由以下主要组件构成：

1. **信令服务器 (signaling-server.js)**：负责客户端发现和WebRTC信令交换
2. **配置模块 (webRTCConfig.js)**：定义WebRTC连接参数和信令消息格式
3. **渲染进程 (renderer.js)**：实现WebRTC连接逻辑和通信协议

通信流程：

```
+----------------+    信令消息    +------------------+    信令消息    +----------------+
|                | <-----------> |                  | <-----------> |                |
| Electron客户端 |               | 信令服务器        |               | TouchDesigner  |
|                | - - - - - - -> |                  | <- - - - - - - |                |
+----------------+    WebRTC     +------------------+    WebRTC     +----------------+
                      直接连接                            直接连接
```

## 配置文件详解

`webRTCConfig.js` 文件定义了WebRTC连接所需的全部配置参数。

```javascript
const webRTCConfig = {
    // WebRTC STUN/TURN服务器配置
    // STUN服务器用于NAT穿透，帮助发现公网IP和端口
    peerConnectionConfig: {
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"  // Google提供的公共STUN服务器
            }
            // 可以添加更多STUN服务器或TURN服务器以提高连接成功率
        ]
    },

    // 媒体约束 - 定义音视频流的参数
    mediaConstraints: {
        audio: true,  // 启用音频传输
        video: true   // 启用视频传输
    },

    // 信令消息模板 - 严格匹配TouchDesigner期望的格式
    signalingMessageTemplate: {
        metadata: {
            apiVersion: '1.0.1',    // API版本号，必须与TD匹配
            compVersion: '1.0.1',   // 组件版本号，必须与TD匹配
            compOrigin: 'WebRTC',   // 组件来源标识
            projectName: 'TDWebRTCWebDemo'  // 项目名称标识
        },
        signalingType: "",  // 信令类型：Offer, Answer, Ice, CallStart, CallEnd等
        sender: null,       // 发送者ID，由服务器填充
        target: "",        // 目标接收者ID
        content: {}         // 消息内容，根据消息类型变化
    },

    // 数据通道配置 - 用于发送控制数据
    // 注意：通道名称必须与TouchDesigner期望的完全一致
    dataChannels: {
        mouse: {
            label: "MouseData",  // 鼠标数据通道名称，必须是这个名称才能被TD识别
            enabled: true,      // 是否启用此通道
            options: {
                ordered: true    // 有序传输，确保数据按发送顺序到达
            }
        },
        keyboard: {
            label: "KeyboardData",  // 键盘数据通道名称，必须是这个名称才能被TD识别
            enabled: true,         // 是否启用此通道
            options: {
                ordered: true       // 有序传输，确保数据按发送顺序到达
            }
        }
    },

    // 信令服务器配置 - WebSocket服务器连接参数
    signalingServerConfig: {
        url: "ws://localhost:9000",  // WebSocket服务器地址
        reconnectInterval: 5000      // 连接断开后的重连间隔(毫秒)
    },

    // 完美协商设置 - 处理WebRTC协商冲突
    perfectNegotiation: {
        polite: true,                    // 是否为礼貌方(后确定)，礼貌方在冲突时会让步
        makingOffer: false,              // 是否正在创建offer的标志
        ignoreOffer: false,              // 是否忽略收到的offer的标志
        isSettingRemoteAnswerPending: false  // 是否正在设置远程answer的标志
    }
};
```

## WebRTC连接流程

1. **信令服务器连接**
   - 客户端连接到WebSocket信令服务器
   - 服务器分配唯一ID并发送ClientEntered消息
   - 客户端保存自己的timeJoined属性

2. **自动客户端连接**
   - 服务器广播客户端列表
   - 应用自动选择第一个可用的TouchDesigner客户端进行连接

3. **发起连接**
   - 发送CallStart消息到目标客户端
   - 基于timeJoined确定polite角色
   - 创建PeerConnection和数据通道
   - 添加两个视频接收器，确保可接收多个视频轨道

4. **信令交换**
   - 创建和交换Offer/Answer
   - 交换ICE候选
   - 处理可能的协商冲突

5. **媒体流处理**
   - 接收并处理远程视频轨道
   - 通过数据通道发送控制信息

6. **连接终止**
   - 发送CallEnd消息
   - 清理资源并关闭连接

## 与TouchDesigner兼容性要点

### 1. 信令消息格式

必须严格遵循TouchDesigner期望的JSON格式：

```javascript
{
    metadata: {
        apiVersion: '1.0.1',
        compVersion: '1.0.1',
        compOrigin: 'WebRTC',
        projectName: 'TDWebRTCWebDemo'
    },
    signalingType: "Offer", // 或其他类型
    sender: "client_id",
    target: "target_id",
    content: {
        // 根据消息类型不同而变化
    }
}
```

### 2. 完美协商实现

基于加入时间确定polite角色，正确处理offer冲突：

```javascript
// 设置polite状态 - 这是关键
this.polite = this.signalingClient.properties.timeJoined < properties.timeJoined;

// 处理offer冲突
const readyForOffer = !this.makingOffer && 
                     (this.peerConnection.signalingState === 'stable' || 
                      this.isSettingRemoteAnswerPending);
const offerCollision = !readyForOffer;

this.ignoreOffer = !this.polite && offerCollision;
if (this.ignoreOffer) {
    console.log('[WEBRTC] 忽略offer以避免冲突');
    return;
}
```

### 3. 视频接收配置

必须使用addTransceiver配置视频接收：

```javascript
// 添加视频接收器 - 这是与TD兼容的关键步骤
this.peerConnection.addTransceiver('video', { direction: 'recvonly' });

// 添加第二个视频接收器以支持多轨道
this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
```

### 4. 数据通道命名

数据通道必须使用TouchDesigner期望的名称：

```javascript
// 创建数据通道 - 名称必须匹配TD预期
this.mouseDataChannel = this.peerConnection.createDataChannel("MouseData");
this.keyboardDataChannel = this.peerConnection.createDataChannel("KeyboardData");
```

### 5. 处理SDP

在接收Offer和创建Answer时需仔细处理SDP格式：

```javascript
// 处理offer
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
});
```