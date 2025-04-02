# TouchDesigner与Electron WebRTC连接兼容性报告

## 关键兼容性要点

为确保TouchDesigner能成功接受Electron应用的WebRTC连接请求，必须遵循以下关键要点：

### 1. 信令消息格式匹配

| 必要元素 | 规范 | 重要性 |
|---------|------|--------|
| 消息结构 | 必须严格遵循TD期望的JSON格式 | 极高 |
| API版本 | apiVersion、compVersion必须匹配 | 高 |
| 信令类型 | 必须使用标准类型：Offer/Answer/Ice等 | 极高 |

### 2. WebRTC协议流程

| 阶段 | 要求 | 注意事项 |
|------|------|---------|
| 信令连接 | 成功连接到相同信令服务器 | 可以使用ws://（Electron无需wss） |
| 客户端识别 | 正确处理ClientEntered和Clients消息 | 必须保存timeJoined属性 |
| 协商启动 | 正确调用onCallStart并传递目标地址 | 必须传递properties参数 |
| Polite判定 | 基于timeJoined决定谁是polite端 | 完美协商的关键 |
| 视频接收 | 使用addTransceiver配置recvonly | 必须步骤，不可省略 |

### 3. 数据通道兼容性

| 通道 | 命名要求 | 数据格式 |
|------|---------|---------|
| 鼠标通道 | 必须命名为"MouseData" | 遵循指定的JSON格式 |
| 键盘通道 | 必须命名为"KeyboardData" | 遵循TD预期格式 |

### 4. 完美协商模式

| 策略 | 实现方式 | 作用 |
|------|---------|------|
| Polite模式 | 基于join时间判断 | 避免协商冲突 |
| Offer冲突处理 | 正确实现ignore逻辑 | 保证连接稳定性 |
| ICE重启 | 连接失败时自动重启ICE | 提高连接成功率 |

## 关键代码示例

### 1. 标准信令消息格式

```javascript
// 必须严格遵循的信令消息格式
const signalingMessageTemplate = {
  metadata: {
    apiVersion: '1.0.1',
    compVersion: '1.0.1',
    compOrigin: 'WebRTC',
    projectName: 'TDWebRTCWebDemo'
  },
  signalingType: "", // "Offer", "Answer", "Ice", "CallStart", "CallEnd"
  sender: null,      // 由服务器填充
  target: "",        // 目标客户端标识
  content: {}        // 根据消息类型不同而变化
};
```

### 2. 连接到TD信令服务器

```javascript
// Electron应用中连接到TD信令服务器
const protocolPrefix = address.startsWith('ws://') || address.startsWith('wss://') ? '' : 'ws://';
const serverAddress = protocolPrefix + address;
const serverUrl = port ? `${serverAddress}:${port}` : serverAddress;

const ws = new WebSocket(serverUrl);

ws.onmessage = (message) => {
  const data = JSON.parse(message.data);
  
  // 处理各种信令消息类型
  if (data.signalingType === 'Clients') {
    // 显示客户端列表，让用户选择TD客户端
    updateClientsList(data.content.clients);
  } else if (data.signalingType === 'ClientEntered') {
    // 保存自己的连接信息
    myClientId = data.content.self.id;
    myProperties = data.content.self.properties;
  } else if (['Offer', 'Answer', 'Ice'].includes(data.signalingType)) {
    // 交给WebRTC连接处理程序
    handleWebRTCSignaling(data);
  }
};
```

### 3. 发起与TD的连接

```javascript
// 用户选择TD客户端后发起连接
function startCallWithTD(tdClientAddress, myProperties) {
  // 这个polite标志非常重要
  // TD根据加入时间决定谁是polite
  polite = myProperties.timeJoined < tdClientProperties.timeJoined;
  
  // 创建PeerConnection
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  
  // 添加视频接收器 - 关键步骤!
  peerConnection.addTransceiver('video', { direction: 'recvonly' });
  
  // 创建数据通道 - 必须使用正确的标签名
  mouseDataChannel = peerConnection.createDataChannel('MouseData');
  keyboardDataChannel = peerConnection.createDataChannel('KeyboardData');
  
  // 设置事件处理程序
  peerConnection.onnegotiationneeded = handleNegotiationNeeded;
  // ...其他事件处理程序
}
```

### 4. 鼠标数据格式

```javascript
// 发送鼠标数据的标准格式
const sendMouseData = (event) => {
  if (!mouseDataChannel) return;
  
  var msCont = document.getElementById('remoteVideo')
  var comStyle = window.getComputedStyle(msCont, null);
  var width = parseInt(comStyle.getPropertyValue("width"), 10);
  var height = parseInt(comStyle.getPropertyValue("height"), 10);
  
  // 必须使用这种格式
  let mouseEventDict = {
    lselect: event.buttons === 1 ? true : false,
    mselect: event.buttons === 4 ? true : false,
    rselect: event.buttons === 2 ? true : false,
    insideu: 1 - (event.nativeEvent.offsetX / width),
    insidev: 1 - (event.nativeEvent.offsetY / height)
  }

  if (mouseDataChannel.readyState === 'open') {
    mouseDataChannel.send(JSON.stringify(mouseEventDict));
  }
}
```

## 兼容性检查清单

✅ 信令消息格式完全匹配TD预期  
✅ 正确识别和设置polite协商方  
✅ 使用addTransceiver配置视频接收  
✅ 创建正确命名的DataChannel  
✅ 遵循完美协商流程处理冲突  
✅ 使用正确数据格式传输控制信息  

## 常见问题排查

### 无法建立连接
- 检查信令服务器连接是否成功
- 确认信令消息格式是否正确
- 验证ICE服务器配置

### 连接建立但无视频
- 确认是否正确使用了`addTransceiver('video', { direction: 'recvonly' })`
- 检查TD端是否正确发送视频流

### 鼠标/键盘控制无效
- 验证数据通道名称是否为"MouseData"和"KeyboardData"
- 确认发送的数据格式符合TD预期

### Offer冲突导致连接失败
- 检查polite标志设置是否基于timeJoined正确计算
- 验证完美协商的实现是否正确处理了冲突情况

## 附录：关键配置参数

```javascript
// WebRTC配置
const peerConnectionConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
    // 可添加TURN服务器
  ],
  iceTransportPolicy: 'all',
  rtcpMuxPolicy: 'require'
};

// 数据通道配置
const dataChannels = {
  mouse: {
    label: 'MouseData',
    ordered: true,
    maxRetransmits: 1
  },
  keyboard: {
    label: 'KeyboardData',
    ordered: true,
    maxRetransmits: 0
  }
};
``` 