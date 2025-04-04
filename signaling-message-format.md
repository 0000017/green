# WebRTC 信令消息格式说明文档

## 概述

本文档详细说明了Electron应用与TouchDesigner之间WebRTC通信所使用的信令消息格式。为确保兼容性，系统支持两种格式的信令消息：标准格式和TouchDesigner专用格式。

## 信令消息格式

### 1. 标准格式（Electron客户端使用）

```json
{
  "type": "[消息类型]",
  "sender": "[发送者ID]",
  "target": "[目标ID]",
  "sdp": "[SDP信息，用于offer和answer]",
  "candidate": {
    "candidate": "[ICE候选信息]",
    "sdpMLineIndex": "[SDP M-line索引]",
    "sdpMid": "[SDP媒体标识符]"
  }
}
```

#### 主要消息类型

- **register-client-type**: 注册客户端类型
- **list-clients**: 请求客户端列表
- **clients-list**: 返回客户端列表
- **offer**: 发送SDP offer
- **answer**: 发送SDP answer
- **ice-candidate**: 发送ICE候选
- **client-disconnected**: 客户端断开连接通知

### 2. TouchDesigner专用格式

```json
{
  "signalingType": "[信令类型]",
  "senderId": "[发送者ID]",
  "targetId": "[目标ID]",
  "content": {
    "sdp": "[SDP信息，用于Offer和Answer]",
    "sdpCandidate": "[ICE候选信息]",
    "sdpMLineIndex": "[SDP M-line索引]",
    "sdpMid": "[SDP媒体标识符]"
  },
  "metadata": {
    "apiVersion": "1.0.1",
    "compVersion": "1.0.1",
    "compOrigin": "WebRTC",
    "projectName": "TDWebRTCWebDemo"
  }
}
```

#### 主要信令类型

- **Offer**: 发送SDP offer
- **Answer**: 发送SDP answer
- **Ice**: 发送ICE候选
- **Connected**: 连接确认
- **ClientsList**: 客户端列表

## 信令服务器消息转换

信令服务器负责在两种格式之间进行转换，确保Electron客户端和TouchDesigner能够无缝通信：

1. 当收到标准格式消息时，如果目标是TouchDesigner客户端，会转换为TouchDesigner格式
2. 当收到TouchDesigner格式消息时，如果目标是Electron客户端，会保持原格式（Electron客户端已实现兼容处理）

## 轨道管理与连接ID

在TouchDesigner中添加轨道时，需要注意以下几点：

1. 连接ID必须与信令消息中的senderId/targetId匹配
2. 轨道类型应设置为"video"
3. 每个连接只支持一个视频轨道
4. 添加轨道时，确保选择正确的连接ID（通常是Electron客户端ID）

## 常见问题

### 无法添加轨道

如果在TouchDesigner中无法添加轨道，请检查：

1. 确认选择了正确的连接ID
2. 确认连接状态为"stable"
3. 确认Electron客户端已成功发送视频轨道
4. 在Electron客户端中点击"重置连接"，然后重新尝试连接

### 多个连接实例

如果看到多个连接实例，这是正常的。TouchDesigner会为每个信令消息创建一个连接实例。选择状态为"stable"的连接，并检查其ID是否与Electron客户端显示的ID匹配。