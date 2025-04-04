# WebRTC与TouchDesigner通信实现文档

## 目录

1. [概述](#概述)
2. [系统架构](#系统架构)
3. [配置文件详解 (webRTCConfig.js)](#配置文件详解)
4. [渲染进程实现 (renderer.js)](#渲染进程实现)
5. [信令服务器实现 (signaling-server.js)](#信令服务器实现)
6. [与TouchDesigner兼容性要点](#与touchdesigner兼容性要点)
7. [WebRTC连接流程](#webrtc连接流程)
8. [常见问题与解决方案](#常见问题与解决方案)

## 概述

本文档详细说明了基于Electron的WebRTC通信系统与TouchDesigner的连接实现。系统通过WebSocket实现信令交换，使用WebRTC建立点对点连接，支持视频流传输和数据通道通信。

## 系统架构

系统由以下主要组件构成：

1. **信令服务器 (signaling-server.js)**：负责客户端发现和WebRTC信令交换
2. **配置模块 (webRTCConfig.js)**：定义WebRTC连接参数和信令消息格式
3. **渲染进程 (renderer.js)**：实现WebRTC连接逻辑和用户界面

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
/**
 * WebRTC通信配置参数
 * 根据示例代码调整的WebRTC配置，专为与TouchDesigner兼容设计
 */

// WebRTC配置
const webRTCConfig = {
    // WebRTC STUN/TURN服务器配置
    // STUN服务器用于NAT穿透，帮助发现公网IP和端口
    peerConnectionConfig: {
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"
            }
            // 可以添加更多STUN服务器或TURN服务器以提高连接成功率
        ]
    },

    // 媒体约束 - 定义音视频流的参数
    mediaConstraints: {
        audio: true,  // 启用音频
        video: true   // 启用视频
    },

    // 信令消息模板 - 严格匹配TouchDesigner期望的格式
    // 这个格式必须精确匹配，否则TD无法正确解析消息
    signalingMessageTemplate: {
        metadata: {
            apiVersion: '1.0.1',    // API版本号
            compVersion: '1.0.1',   // 组件版本号
            compOrigin: 'WebRTC',   // 组件来源
            projectName: 'TDWebRTCWebDemo'  // 项目名称
        },
        signalingType: "",  // 信令类型：Offer, Answer, Ice等
        sender: null,       // 发送者ID，由服务器填充
        target: "",        // 目标接收者ID
        content: {}         // 消息内容，根据消息类型变化
    },

    // 数据通道配置 - 用于发送控制数据
    // 注意：通道名称必须与TouchDesigner期望的完全一致
    dataChannels: {
        mouse: {
            label: "MouseData",  // 鼠标数据通道名称，必须是这个名称
            enabled: true,
            options: {
                ordered: true    // 有序传输
            }
        },
        keyboard: {
            label: "KeyboardData",  // 键盘数据通道名称，必须是这个名称
            enabled: true,
            options: {
                ordered: true    // 有序传输
            }
        }
    },

    // 信令服务器配置
    signalingServerConfig: {
        url: "ws://localhost:9000",  // WebSocket服务器地址
        reconnectInterval: 5000      // 重连间隔(毫秒)
    },

    // 完美协商设置 - 处理WebRTC协商冲突
    perfectNegotiation: {
        polite: true,                    // 是否为礼貌方(后确定)
        makingOffer: false,              // 是否正在创建offer
        ignoreOffer: false,              // 是否忽略收到的offer
        isSettingRemoteAnswerPending: false  // 是否正在设置远程answer
    }
};

// 导出配置
module.exports = webRTCConfig;
```

## 渲染进程实现

`renderer.js` 实现了WebRTC连接的核心逻辑，包括信令客户端、WebRTC连接管理和用户界面。

### 主要组件

#### 1. 信令客户端 (SignalingClient)

```javascript
// 信令客户端类 - 负责与信令服务器通信
class SignalingClient {
    constructor() {
        this.connectedToServer = false;  // 服务器连接状态
        this.clients = [];               // 可用客户端列表
        this.webSocket = null;           // WebSocket连接
        this.properties = {
            timeJoined: Date.now()        // 加入时间戳，用于确定polite角色
        };
        
        this.webRTCConnection = null;    // WebRTC连接引用
    }
    
    // 设置WebRTC连接引用
    setWebRTCConnection(connection) {
        this.webRTCConnection = connection;
    }
    
    // 连接到信令服务器
    connect() {
        try {
            // 创建WebSocket连接
            // 处理连接打开、消息接收、连接关闭和错误事件
            // 接收并处理各类信令消息
        } catch (error) {
            // 错误处理
        }
    }
}
```

#### 2. WebRTC连接 (WebRTCConnection)

```javascript
// WebRTC连接类 - 管理WebRTC点对点连接
class WebRTCConnection {
    constructor(signalingClient) {
        // 初始化信令客户端引用
        // 设置媒体约束
        // 初始化完美协商变量
        // 初始化连接状态变量
    }
    
    // 创建对等连接
    createPeerConnection() {
        // 创建RTCPeerConnection
        // 设置各种事件处理器
        // 初始化远程视频流
        // 创建数据通道
        // 创建本地视频流
    }
    
    // 创建本地视频流 - 使用Canvas作为源
    async createLocalStream() {
        // 创建Canvas元素
        // 设置动画
        // 从Canvas获取视频流
        // 创建本地预览
        // 添加轨道到对等连接
    }
    
    // 删除对等连接
    deletePeerConnection() {
        // 清除事件处理器
        // 停止轨道
        // 关闭数据通道
        // 关闭连接
        // 清除视频源
    }
    
    // 开始通话
    onCallStart(address, properties) {
        // 设置目标
        // 设置polite状态 - 基于加入时间
        // 创建对等连接
        // 添加仅接收视频的收发器 - 关键步骤!
    }
    
    // 结束通话
    onCallEnd() {
        // 更新UI
        // 删除对等连接
    }
    
    // 各种事件处理器
    // ...
    
    // 信令消息处理
    onMessageReceived(messageObj) {
        // 根据消息类型调用相应处理函数
    }
    
    // 处理Offer消息
    onMessageReceivedOffer(messageObj) {
        // 检查是否可以接受offer
        // 处理offer冲突
        // 设置远程描述
        // 创建并发送answer
    }
    
    // 处理Answer消息
    onMessageReceivedAnswer(messageObj) {
        // 设置远程描述
    }
    
    // 处理ICE候选消息
    onMessageReceivedIce(messageObj) {
        // 创建并添加ICE候选
    }
    
    // 发送信令消息
    // ...
    
    // 发起和结束通话
    startCall(targetId) {
        // 发送CallStart消息
    }
    
    endCall() {
        // 发送CallEnd消息
        // 结束通话
    }
}
```

#### 3. 用户界面管理

```javascript
// UI更新函数
function updateUI(section, message) {
    // 更新状态显示
}

// 更新客户端列表
function updateClientsList(clients) {
    // 过滤掉自己的ID
    // 更新客户端列表显示
}

// 选择客户端
window.selectClient = function(clientId) {
    // 发起通话
};

// 初始化界面
function initializeUI() {
    // 创建视频元素
    // 创建控制面板
    // 添加按钮事件
    // 添加样式
}

// 初始化应用
window.onload = function() {
    // 初始化UI
    // 创建信令客户端和WebRTC连接
    // 连接到信令服务器
};
```

## 信令服务器实现

`signaling-server.js` 实现了WebSocket信令服务器，负责客户端发现和信令交换。

```javascript
// 创建WebSocket服务器
const server = new WebSocket.Server({ port: PORT });

// 当客户端连接时的处理
server.on('connection', function(ws, req) {
    // 为客户端生成唯一ID
    // 创建客户端属性，包含timeJoined
    // 存储客户端连接信息
    // 发送连接确认和ID分配
    // 发送ClientEntered消息
    // 广播更新的客户端列表
    
    // 处理客户端消息
    ws.on('message', function(message) {
        // 解析接收到的消息
        // 处理ListClients请求
        // 为所有信令消息添加发送者信息和元数据
        // 根据target字段决定转发方式
    });
    
    // 处理客户端断开连接
    ws.on('close', function() {
        // 向其他客户端广播断开通知
        // 从Map中移除客户端
        // 广播更新的客户端列表
    });
    
    // 处理错误
    ws.on('error', function(error) {
        // 错误处理
    });
});

// 向所有客户端广播客户端列表
function broadcastClientsList() {
    // 创建客户端列表
    // 广播给所有连接的客户端
}

// 向特定客户端发送客户端列表
function sendClientsList(ws) {
    // 创建客户端列表
    // 发送给指定客户端
}

// 广播消息给除了指定客户端之外的所有客户端
function broadcastToOthers(senderId, message) {
    // 确保消息格式完整
    // 向除发送者外的所有客户端发送消息
}
```

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
// 添加仅接收视频的收发器 - 这是与TD兼容的关键步骤
this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
```

### 4. 数据通道命名

数据通道必须使用TouchDesigner期望的名称：

```javascript
// 创建数据通道 - 名称必须匹配
this.mouseDataChannel = this.peerConnection.createDataChannel("MouseData");
this.keyboardDataChannel = this.peerConnection.createDataChannel("KeyboardData");
```

## WebRTC连接流程

1. **信令服务器连接**
   - 客户端连接到WebSocket信令服务器
   - 服务器分配唯一ID并发送ClientEntered消息
   - 客户端保存自己的timeJoined属性

2. **客户端发现**
   - 服务器广播客户端列表
   - 用户选择要连接的TouchDesigner客户端

3. **发起连接**
   - 发送CallStart消息到目标客户端
   - 基于timeJoined确定polite角色
   - 创建PeerConnection和数据通道
   - 添加视频接收器

4. **信令交换**
   - 创建和交换Offer/Answer
   - 交换ICE候选
   - 处理可能的协商冲突

5. **媒体流处理**
   - 接收并显示远程视频流
   - 通过数据通道发送控制信息

6. **连接终止**
   - 发送CallEnd消息
   - 清理资源并关闭连接

## 常见问题与解决方案

### 无法建立连接

- **问题**: 信令消息无法正确交换或ICE候选收集失败
- **解决方案**: 
  - 确认信令服务器正常运行
  - 验证信令消息格式是否符合TouchDesigner期望
  - 检查网络环境，可能需要添加TURN服务器

### 连接建立但无视频

- **问题**: WebRTC连接成功但没有视频显示
- **解决方案**:
  - 确认是否正确调用了`addTransceiver('video', { direction: 'recvonly' })`
  - 检查TouchDesigner是否正确发送视频流
  - 验证视频元素是否正确设置

### 数据通道无法工作

- **问题**: 无法通过数据通道发送控制信息
- **解决方案**:
  - 确认数据通道名称是否为"MouseData"和"KeyboardData"
  - 验证数据格式是否符合TouchDesigner期望
  - 检查数据通道是否成功打开

### Offer冲突导致连接失败

- **问题**: 两端同时创建Offer导致协商失败
- **解决方案**:
  - 确认polite角色设置是否基于timeJoined正确计算
  - 验证完美协商的实现是否正确处理了冲突情况