# TouchDesigner WebRTC 配置指南

本指南将帮助您在TouchDesigner中设置WebRTC连接，以便将TouchDesigner的视频流实时传输到Electron应用程序。

## 前提条件

- TouchDesigner 2022或更高版本
- 已安装WebRTC DAT组件（在TouchDesigner 2022+中已内置）

## 步骤

### 1. 创建基本网络

1. 创建一个新的TouchDesigner项目
2. 添加要传输的视频源（可以是TOP网络、摄像头输入等）

### 2. 设置WebRTC组件

1. 在TouchDesigner中创建新的WebRTC DAT (右键 -> Add Operator -> DAT -> WebRTC)
2. 配置WebRTC DAT参数：
   - **Active**: 选中以激活WebRTC连接
   - **Signal Method**: 选择 "Websocket"
   - **Websocket URL**: 输入 `ws://localhost:3000`（与Electron应用中的信令服务器地址相同）
   - **Local ID**: 可以留空，将自动获取
   - **Signaling Intervals**: 保持默认值或根据需要调整
   - **Stun Server**: 输入 `stun:stun.l.google.com:19302`（与Electron应用中配置相同）

### 3. 设置信令客户端类型

在TouchDesigner中，您需要添加一个在连接到信令服务器后发送客户端类型的脚本：

1. 选择WebRTC DAT组件
2. 在Parameters窗口中，转到Scripts页签
3. 在onConnect回调中添加以下代码:

```python
def onConnect(webrtc, socket):
    # 注册为TouchDesigner客户端
    import json
    msg = {
        "type": "register-client-type",
        "clientType": "touchdesigner"
    }
    socket.send(json.dumps(msg))
    
    # 请求客户端列表
    list_msg = {
        "type": "list-clients"
    }
    socket.send(json.dumps(list_msg))
    return
```

这将确保TouchDesigner被正确识别，并立即请求获取可用的客户端列表。

### 4. 添加客户端响应处理脚本

在这个特定场景中，您可能需要对信令消息进行额外处理以确保连接可靠：

1. 在WebRTC DAT的Script部分，添加或修改onMessage回调函数：

```python
def onMessage(webrtc, socket, data):
    import json
    
    try:
        message = json.loads(data)
        
        # 处理clients-list消息
        if message.get('type') == 'clients-list':
            clients = message.get('clients', [])
            
            # 查找electron客户端
            electron_clients = [client for client in clients if client.get('type') == 'electron']
            
            if electron_clients:
                # 如果找到electron客户端，可以自动连接到第一个
                electron_id = electron_clients[0].get('id')
                
                # 主动发起连接
                if not webrtc.IsNegotiating:
                    webrtc.Connect(electron_id)
                
                # 也可以将可用客户端存储在自定义参数中以便UI显示
                webrtc.store('availableClients', json.dumps(clients))
    except Exception as e:
        print(f"Error processing message: {e}")
    
    return
```

### 5. 定期刷新客户端列表

为确保TouchDesigner能够看到所有可用的客户端，添加一个定期请求客户端列表的脚本：

1. 在您的TouchDesigner项目中添加一个Timer CHOP
2. 设置Timer CHOP的Length参数为10（代表10秒）
3. 创建一个Python CHOP Execute DAT并连接到Timer CHOP
4. 在Python CHOP Execute DAT中添加以下代码：

```python
def onOffToOn(channel, sampleIndex, val, prev):
    # 获取WebRTC DAT引用
    webrtc = op('webrtc_dat')  # 请替换为您的WebRTC DAT路径
    
    # 如果WebRTC已连接到信令服务器，则请求客户端列表
    if webrtc.SignalingConnected:
        import json
        list_msg = {
            "type": "list-clients"
        }
        webrtc.SendSignalingMessage(json.dumps(list_msg))
    return
```

### 6. 连接视频源到WebRTC

1. 创建一个Video Device Out TOP来封装您想要传输的视频源
2. 在WebRTC DAT的参数面板中，找到"Stream"页签
3. 在"Video Track Source"下拉列表中选择刚创建的Video Device Out TOP
4. 确保"Stream"页签中的"Include Video"选项已勾选

### 7. 测试连接

1. 先启动Electron应用和信令服务器：
   - 在Terminal中运行 `node signaling-server.js`
   - 启动Electron应用程序

2. 然后在TouchDesigner中：
   - 将WebRTC DAT的"Active"参数设置为ON
   - 观察控制台输出，确认连接状态
   - 如果一切正常，您应该能看到Electron客户端在列表中，并建立连接

## 故障排除

### 无法获取客户端列表

如果TouchDesigner无法获取到客户端列表：

1. 确认信令服务器正在运行
2. 检查TouchDesigner中的WebRTC DAT是否已成功连接到信令服务器（查看"Status"参数）
3. 在onConnect脚本中添加错误处理和日志记录：

```python
def onConnect(webrtc, socket):
    try:
        import json
        # 注册为TouchDesigner客户端
        msg = {
            "type": "register-client-type",
            "clientType": "touchdesigner"
        }
        socket.send(json.dumps(msg))
        print("已发送客户端类型注册")
        
        # 请求客户端列表
        list_msg = {
            "type": "list-clients"
        }
        socket.send(json.dumps(list_msg))
        print("已请求客户端列表")
    except Exception as e:
        print(f"连接处理错误: {e}")
    return
```

4. 如果您在同一台计算机上运行TouchDesigner和Electron应用，尝试使用IP地址而不是localhost（例如使用`ws://127.0.0.1:3000`）

### 无法建立WebRTC连接

如果客户端列表正确但无法建立连接：

1. 确认STUN服务器配置正确
2. 尝试在TouchDesigner的Console中监视连接过程：

```python
def onIceCandidate(webrtc, socket, candidate, mid, mlineIndex):
    print(f"ICE候选: {candidate}")
    return

def onNegotiationNeeded(webrtc, socket):
    print("需要重新协商连接")
    return
```

3. 确保防火墙没有阻止WebRTC连接所需的端口

## 参考资料

- TouchDesigner WebRTC组件文档: [derivative.ca/UserGuide/Palette:webRTC](https://derivative.ca/UserGuide/Palette:webRTC/)
- WebRTC项目官方网站: [webrtc.org](https://webrtc.org/)
- MDN WebRTC API文档: [developer.mozilla.org/WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

## 示例TouchDesigner网络

以下是一个基本示例，展示了如何设置网络：

```
videosource TOP -> videodeviceout TOP -> 
                                       |
                                       v
                                    WebRTC DAT
```

## 高级配置

1. **调整视频质量**:
   - 在Video Device Out TOP中调整分辨率和帧率
   - 考虑编码参数以平衡质量和延迟

2. **添加音频**:
   - 在WebRTC DAT的"Stream"页签中启用"Include Audio"
   - 选择适当的音频源

3. **自定义信令**:
   - 可以在WebRTC DAT的Scripts页面中自定义信令逻辑

## 注意事项

- WebRTC连接需要稳定的网络环境
- 高分辨率和高帧率视频可能会导致延迟增加
- 在同一台电脑上使用时，确保使用localhost作为连接地址 

# TouchDesigner WebRTC修复指南

根据您的反馈，TouchDesigner无法与Electron应用建立连接。以下是修复此问题的步骤：

## 修复方案 - TouchDesigner端

### 1. 确保WebRTC DAT配置正确

1. 检查WebRTC DAT参数：
   - **Active**: 必须设置为ON
   - **Signal Method**: 必须选择"Websocket"
   - **Websocket URL**: 使用`ws://127.0.0.1:3000`而不是localhost
   - **Stun Server**: 确保与Electron相同，使用`stun:stun.l.google.com:19302`

### 2. 完整的TouchDesigner连接脚本

在WebRTC DAT的Scripts参数页面中，添加以下脚本：

```python
# 连接到信令服务器时触发
def onConnect(webrtc, socket):
    try:
        import json
        print("已连接到信令服务器")
        
        # 注册为TouchDesigner客户端
        msg = {
            "type": "register-client-type",
            "clientType": "touchdesigner"
        }
        socket.send(json.dumps(msg))
        print("已发送客户端类型注册")
        
        # 请求客户端列表
        list_msg = {
            "type": "list-clients"
        }
        socket.send(json.dumps(list_msg))
        print("已请求客户端列表")
    except Exception as e:
        print(f"连接错误: {e}")
    return

# 收到信令消息时触发
def onMessage(webrtc, socket, data):
    try:
        import json
        message = json.loads(data)
        message_type = message.get('type', '')
        
        print(f"收到信令消息: {message_type}")
        
        # 处理客户端列表
        if message_type == 'clients-list':
            clients = message.get('clients', [])
            print(f"收到客户端列表: {clients}")
            
            # 查找electron客户端
            electron_clients = [client for client in clients if client.get('type') == 'electron']
            
            if electron_clients:
                print(f"找到Electron客户端: {electron_clients[0]}")
                electron_id = electron_clients[0].get('id')
                
                # 主动发起连接
                if not webrtc.IsNegotiating:
                    print(f"正在连接到Electron客户端 {electron_id}")
                    webrtc.Connect(electron_id)
            else:
                print("未找到Electron客户端")
    except Exception as e:
        print(f"消息处理错误: {e}")
    return

# ICE候选生成时触发
def onIceCandidate(webrtc, socket, candidate, mid, mlineIndex):
    print(f"生成ICE候选: {candidate[:30]}...")
    return

# 需要协商WebRTC连接时触发
def onNegotiationNeeded(webrtc, socket):
    print("需要协商WebRTC连接")
    return

# 连接成功时触发
def onConnected(webrtc, socket, id):
    print(f"已连接到客户端 {id}")
    return

# 连接失败时触发
def onConnectionFailed(webrtc, socket, id):
    print(f"连接到客户端 {id} 失败")
    # 尝试重新连接
    import json
    list_msg = {
        "type": "list-clients"
    }
    socket.send(json.dumps(list_msg))
    return

# 断开连接时触发
def onDisconnect(webrtc, socket):
    print("与信令服务器断开连接")
    return
```

### 3. 添加定时器确保连接保持活跃

1. 在TouchDesigner项目中添加一个Timer CHOP
2. 设置Timer CHOP的频率为0.1（每10秒触发一次）
3. 添加一个Python CHOP Execute DAT并附加到Timer CHOP
4. 在Python CHOP Execute DAT中添加以下脚本：

```python
def onOffToOn(channel, sampleIndex, val, prev):
    try:
        # 替换为您的WebRTC DAT路径
        webrtc = op('webrtc1')
        
        if webrtc.SignalingConnected:
            import json
            
            # 请求客户端列表
            list_msg = {
                "type": "list-clients"
            }
            webrtc.SendSignalingMessage(json.dumps(list_msg))
            print("已发送定期客户端列表请求")
            
            # 如果没有活跃连接，尝试连接到Electron客户端
            if not webrtc.IsConnected:
                # 获取存储的客户端列表
                try:
                    stored_clients = json.loads(webrtc.fetch('availableClients', '[]'))
                    electron_clients = [c for c in stored_clients if c.get('type') == 'electron']
                    if electron_clients:
                        electron_id = electron_clients[0].get('id')
                        print(f"尝试重新连接到Electron客户端 {electron_id}")
                        if not webrtc.IsNegotiating:
                            webrtc.Connect(electron_id)
                except Exception as e:
                    print(f"重连错误: {e}")
    except Exception as e:
        print(f"定时器错误: {e}")
    return
```

### 4. 调试模式

为了更好地诊断问题，启用WebRTC DAT的调试功能：

1. 转到WebRTC DAT的Logger参数页
2. 启用以下选项：
   - **Enable Logging**: ON
   - **Log to Textport**: ON
   - **Log Level**: DEBUG 或 INFO

## 常见问题解决方案

### 问题: TouchDesigner无法看到Electron客户端

可能原因:
1. 信令服务器未正确运行或连接问题
2. 客户端类型未正确注册
3. WebSocket URL使用了localhost而不是IP地址

解决方法:
- 确保使用IP地址: `ws://127.0.0.1:3000`
- 重新启动信令服务器和两个应用
- 检查信令服务器控制台日志，确认有客户端连接并注册类型

### 问题: 能看到客户端但无法建立连接

可能原因:
1. ICE候选交换问题
2. WebRTC配置不匹配
3. 防火墙阻止了WebRTC连接

解决方法:
- 在两端启用详细日志记录
- 比较WebRTC配置，确保匹配
- 临时禁用防火墙进行测试

### 问题: 连接断断续续

可能原因:
1. 网络问题
2. ICE服务器配置问题

解决方法:
- 添加更多STUN/TURN服务器以提高连接稳定性
- 使用有线网络连接
- 降低视频质量或分辨率

## 测试连接的方法

1. 在TouchDesigner中观察连接状态，如果WebRTC DAT显示"已连接"，则连接成功
2. 使用简单的测试视频源（如纯色板或计数器）来确认视频传输
3. 在Electron应用中查看日志，确认是否收到视频流

如果所有步骤都已完成但仍无法连接，请提供两端的详细日志，以便进一步诊断问题。 

# TouchDesigner Palette:webRTC 使用指南

根据您的反馈，我们已针对TouchDesigner WebRTC连接问题提供了以下解决方案。这套方案使Electron应用能够与TouchDesigner的标准WebRTC组件进行连接。

## 在TouchDesigner中进行设置

首先，确保您已正确设置了TouchDesigner的WebRTC组件：

1. 从Palette中拖入signalingClient COMP
2. 设置signalingClient的参数：
   - **Active**: ON
   - **Server URL**: 设置为`ws://127.0.0.1:3000`或`ws://localhost:3000`
   - **Forward to Subscribers**: ON

3. 从Palette中拖入webRTC COMP
4. 设置webRTC COMP的参数：
   - **Signaling Client**: 连接到您刚创建的signalingClient COMP
   - **Default Tracks Behaviour**: 选择"1V0A0DC"(仅视频)
   - **Active**: ON
   - **STUN Server URL**: `stun:stun.l.google.com:19302`

## 获取TouchDesigner客户端ID

**重要的步骤**：您需要在TouchDesigner中获取其客户端ID，然后在Electron应用中使用此ID发起连接。

1. 在TouchDesigner中启用日志：
   - 在webRTC COMP中，选择Logger页签
   - 启用"Enable Logging"和"Log to Textport"
   - 将Log Level设为DEBUG或INFO

2. 在TextPort中找到客户端ID：
   - 当signalingClient连接成功后，查看TextPort中的输出
   - 查找类似"Connected with ID: 1743486701703"的消息，这个数字就是客户端ID
   - 或者找到"Connection established"消息，其中会包含ID信息

3. 记录此ID号，您将在Electron应用中用到它

## 在Electron应用中连接到TouchDesigner

现在，您可以在Electron应用中使用TouchDesigner的客户端ID发起连接：

1. 启动信令服务器：`node signaling-server.js`
2. 启动Electron应用
3. 在Electron应用界面中：
   - 在界面底部的控制面板中输入TouchDesigner的客户端ID
   - 点击"连接到TD"按钮发起连接

4. 连接过程将自动发起，WebRTC协商会建立，视频流将从Electron发送到TouchDesigner

## 查看连接结果

1. 在TouchDesigner中观察webRTC COMP的状态：
   - 如果连接成功，状态将显示为"Connected"
   - 点击"Manage Tracks"按钮将显示已添加的视频轨道

2. 您应该能在TouchDesigner中看到Electron发送的视频（蓝紫色背景上的橙色圆点和时间）

## 常见问题解决

1. **如果TouchDesigner未显示Electron客户端**:
   - 确保信令服务器正在运行
   - 在Electron中点击"刷新列表"按钮
   - 使用日志中找到的TouchDesigner ID手动发起连接

2. **如果连接尝试但没有成功**:
   - 查看TouchDesigner的TextPort日志
   - 在Electron应用中点击"重置连接"按钮，然后重新尝试
   - 确认STUN服务器设置正确

3. **如果连接成功但没有视频**:
   - 检查TouchDesigner中的轨道管理器，确认视频轨道已添加
   - 验证Default Tracks Behaviour设置包含视频(1V...)

## 如何在TouchDesigner中接收视频并转发

1. 一旦接收到Electron的视频流，可以使用轨道管理器访问它：
   - 点击"Manage Tracks"
   - 视频轨道将显示在列表中

2. 创建Select TOP：
   - 右键点击 → 创建TOP → Select TOP
   - 将表达式设置为：
   ```
   op('webRTC').findChildren(type='videoStreamIn_TOP')[0]
   ```

3. 这个Select TOP现在包含了从Electron接收的视频流，可以在您的TouchDesigner网络中使用它 