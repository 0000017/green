// ComfyUI实时绘画功能
// 在左下角创建参考图画布，ComfyUI返回的图像铺满屏幕
// 已更新支持从网络设置页面同步IP地址与端口配置

// 将aiSketch函数暴露到全局作用域，使sketch.js可以访问
window.aiSketch = function(p) {
  // ComfyUI连接配置
  const comfyUIConfig = {
    serverAddress: 'ws://127.0.0.1:8000/ws',  // 默认ComfyUI服务器地址
    clientId: Date.now().toString(),         // 生成唯一客户端ID
    promptId: null,                          // 当前请求的ID
    isConnected: false,                      // 连接状态
    status: '未连接',                        // 连接状态文本
    debug: true                              // 调试模式
  };
  
  // 添加请求队列和版本管理相关变量
  let isProcessingImage = false;             // 是否正在处理图像
  let requestQueue = [];                     // 请求队列
  let isProcessingQueue = false;             // 是否正在处理队列
  let currentProgress = { value: 0, max: 1 }; // 当前处理进度
  let isLowQualityPreview = true;            // 是否使用低质量预览
  let currentRequestVersion = 0;             // 当前请求版本号
  let latestProcessedVersion = 0;            // 最新处理的版本
  let lastSendTime = 0;                      // 上次发送时间
  let sendInterval = 1000;                   // 自动发送间隔
  let isAutoSend = false;                    // 是否自动发送
  let autoSendCheckbox;                      // 自动发送复选框
  let socket = null;                         // WebSocket连接
  
  // 画布历史记录相关变量
  let drawHistory = [];                      // 绘画历史记录
  let maxHistorySteps = 10;                  // 最大历史记录步数
  
  // 更新服务器地址的函数 - 可以从外部调用
  window.updateComfyUIServerAddress = function(ip, port) {
    if (ip && port) {
      comfyUIConfig.serverAddress = `ws://${ip}:${port}/ws`;
      console.log(`[ComfyUI] 服务器地址已更新为: ${comfyUIConfig.serverAddress}`);
      
      // 如果已连接，重新连接到新地址
      if (comfyUIConfig.isConnected) {
        console.log('[ComfyUI] 地址已更改，正在重新连接...');
        checkComfyUIConnection();
      }
      
      return true;
    }
    return false;
  };
  
  // 尝试在初始化时自动获取网络设置
  try {
    // 查找所有输入框
    const inputs = document.querySelectorAll('input');
    let ipInput = null;
    let portInput = null;
    
    // 检查输入框值或占位符是否包含默认IP/端口
    for (const input of inputs) {
      const value = input.value || input.placeholder || '';
      if (value.includes('127.0.0.1')) {
        ipInput = input;
      } else if (value === '8000') {
        portInput = input;
      }
    }
    
    // 如果找到了输入框，更新服务器地址
    if (ipInput && portInput) {
      const ip = ipInput.value || ipInput.placeholder || '127.0.0.1';
      const port = portInput.value || portInput.placeholder || '8000';
      window.updateComfyUIServerAddress(ip, port);
    }
  } catch (err) {
    console.warn('[ComfyUI] 无法从网页元素获取网络配置:', err);
  }

  // 调试函数
  function debugLog(...args) {
    if (comfyUIConfig.debug) {
      console.log('[ComfyUI Debug]', ...args);
    }
  }

  // 画布配置
  let mainCanvas;                // 主画布 - 显示ComfyUI返回的图像
  let referenceCanvas;           // 参考图画布 - 位于左下角
  let referenceP5Image;          // 参考图的P5图像对象
  let controlPanel;              // 控制面板
  let referenceContext;          // 参考图画布的2D上下文
  let isDrawingReference = false;// 是否正在绘制参考图
  let statusElement;             // 状态显示元素
  let lastResult = null;         // 最后一次ComfyUI返回的图像
  
  // 参考图画布尺寸和位置
  const refCanvasConfig = {
    width: 910,   // 原来的455乘以2
    height: 512,  // 原来的256乘以2
    x: 20,
    y: null,  // 在setup中根据窗口高度设置
  };
  
  // 绘画设置
  let strokeColor = '#000000';
  let strokeWidth = 4;
  let promptTemplate = "mh style,fgch style,soft sunlight with shiny glow,mhcg style,shinyyy,Close-up,{prompt},shinyyy,glowing white butterflies are flying in the air,dreamy scene";  // 提示词模板
  let customPrompt = "一幅精美的风景画";                            // 自定义提示词
  let isPenDetected = false;                                       // 是否检测到数位笔
  let penX = 0;                                                   // 数位笔X坐标
  let penY = 0;                                                   // 数位笔Y坐标
  let isPenHovering = false;                                       // 数位笔是否悬停在画布上

  // 初始化画布和控件
  p.setup = function() {
    // 创建主画布并铺满屏幕
    mainCanvas = p.createCanvas(p.windowWidth, p.windowHeight);
    mainCanvas.style('z-index', '800');
    mainCanvas.position(0, 0);
    
    // 使用默认鼠标光标
    mainCanvas.style('cursor', 'default');
    
    // 设置参考图的Y坐标 - 位于左下角
    refCanvasConfig.y = p.windowHeight - refCanvasConfig.height - 20;
    
    // 创建参考图画布 - 作为离屏画布，使用16:9比例
    referenceCanvas = document.createElement('canvas');
    referenceCanvas.width = refCanvasConfig.width;
    referenceCanvas.height = refCanvasConfig.height;
    referenceContext = referenceCanvas.getContext('2d');
    referenceContext.fillStyle = 'white';
    referenceContext.fillRect(0, 0, refCanvasConfig.width, refCanvasConfig.height);
    
    // 创建P5图像对象用于显示参考图
    referenceP5Image = p.createImage(refCanvasConfig.width, refCanvasConfig.height);
    updateReferenceP5Image();
    
    // 初始化绘画历史记录
    saveToHistory();
    
    // 初始化背景
    p.background(240);
    
    // 创建控制面板
    createControlPanel();
    
    // 尝试连接ComfyUI
    connectToComfyUI();
    
    // 为canvas添加数位笔支持
    enableStylusSupport(p.canvas);
  };

  // 保存当前状态到历史记录
  function saveToHistory() {
    if (referenceCanvas) {
      // 限制历史记录数量
      if (drawHistory.length >= maxHistorySteps) {
        drawHistory.shift(); // 移除最老的记录
      }
      
      // 创建当前画布的快照
      const currentState = document.createElement('canvas');
      currentState.width = referenceCanvas.width;
      currentState.height = referenceCanvas.height;
      const ctx = currentState.getContext('2d');
      ctx.drawImage(referenceCanvas, 0, 0);
      
      // 保存到历史记录
      drawHistory.push(currentState);
    }
  }
  
  // 撤销上一步操作
  function undoLastAction() {
    if (drawHistory.length > 1) { // 保留至少一个历史记录（初始状态）
      drawHistory.pop(); // 移除当前状态
      const previousState = drawHistory[drawHistory.length - 1]; // 获取上一个状态
      
      // 恢复到上一个状态
      referenceContext.clearRect(0, 0, referenceCanvas.width, referenceCanvas.height);
      referenceContext.drawImage(previousState, 0, 0);
      
      // 更新P5图像
      updateReferenceP5Image();
    }
  }

  // 更新P5参考图图像 - 将HTML Canvas转换为P5.Image
  function updateReferenceP5Image() {
    if (!referenceCanvas || !referenceP5Image) return;
    
    try {
      // 从Canvas获取图像数据
      const imgData = referenceContext.getImageData(
        0, 0, referenceCanvas.width, referenceCanvas.height
      );
      
      // 将数据加载到P5图像中
      referenceP5Image.loadPixels();
      for (let i = 0; i < imgData.data.length; i++) {
        referenceP5Image.pixels[i] = imgData.data[i];
      }
      referenceP5Image.updatePixels();
    } catch (err) {
      console.error('更新参考图P5图像时出错:', err);
    }
  }

  // 绘制循环
  p.draw = function() {
    // 清除主画布
    p.clear();
    
    // 如果有来自ComfyUI的结果图像，显示在主画布上
    if (lastResult && lastResult.width && lastResult.height) {
      p.push();
      // 保持图像比例，最大化填充屏幕
      const imgRatio = lastResult.width / lastResult.height;
      const screenRatio = p.width / p.height;
      let drawWidth, drawHeight;
      
      if (imgRatio > screenRatio) {
        // 图像较宽，以高度为基准
        drawHeight = p.height;
        drawWidth = drawHeight * imgRatio;
      } else {
        // 图像较高，以宽度为基准
        drawWidth = p.width;
        drawHeight = drawWidth / imgRatio;
      }
      
      // 居中显示
      p.imageMode(p.CENTER);
      p.image(lastResult, p.width/2, p.height/2, drawWidth, drawHeight);
      p.pop();
    } else {
      // 如果没有结果图像，显示提示信息
      p.fill(100);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(24);
      p.text('等待ComfyUI生成图像...', p.width/2, p.height/2);
    }
    
    // 绘制参考图画布
    if (referenceP5Image) {
      p.push();
      p.imageMode(p.CORNER);
      p.image(referenceP5Image, refCanvasConfig.x, refCanvasConfig.y);
      
      // 添加参考图边框
      p.noFill();
      p.stroke(0);
      p.strokeWeight(2);
      p.rect(refCanvasConfig.x, refCanvasConfig.y, refCanvasConfig.width, refCanvasConfig.height);
      p.pop();
    }
    
    // 如果正在绘制参考图，绘制当前笔画
    if (isDrawingReference && 
        p.mouseX >= refCanvasConfig.x && p.mouseX <= refCanvasConfig.x + refCanvasConfig.width &&
        p.mouseY >= refCanvasConfig.y && p.mouseY <= refCanvasConfig.y + refCanvasConfig.height) {
      drawReferenceStroke();
    }
    
    // 仅在数位笔悬停在参考图区域内时显示绿色光标
    if (isPenHovering && 
        penX >= refCanvasConfig.x && penX <= refCanvasConfig.x + refCanvasConfig.width &&
        penY >= refCanvasConfig.y && penY <= refCanvasConfig.y + refCanvasConfig.height) {
      drawPenCursor(penX, penY);
    }
    
    // 如果正在处理图像，显示进度条（在屏幕底部）
    if (isProcessingImage) {
      const progress = currentProgress.value / currentProgress.max;
      
      // 绘制进度条背景
      p.fill(40);
      p.noStroke();
      p.rect(0, p.height - 30, p.width, 10, 5);
      
      // 绘制进度条
      p.fill(0, 120, 255);
      p.rect(0, p.height - 30, p.width * progress, 10, 5);
      
      // 显示百分比
      p.fill(255);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(12);
      p.text(`处理中: ${Math.round(progress * 100)}%`, p.width/2, p.height - 20);
      
      // 显示版本号
      p.textSize(10);
      p.text(`当前处理版本: ${latestProcessedVersion}/${currentRequestVersion}`, p.width/2, p.height - 40);
    }
    
    // 绘制连接状态指示器
    p.fill(comfyUIConfig.isConnected ? p.color(0, 255, 0) : p.color(255, 0, 0));
    p.noStroke();
    p.ellipse(p.width - 20, 20, 10, 10);
    
    // 更新状态显示
    if (statusElement) {
      statusElement.html('状态: ' + comfyUIConfig.status);
    }
  };

  // 创建控制面板
  function createControlPanel() {
    controlPanel = p.createDiv('');
    controlPanel.id('ai-draw-control-panel');
    controlPanel.class('ai-draw-control-panel');
    controlPanel.style('position', 'fixed');
    controlPanel.style('top', '20px');
    controlPanel.style('left', '20px');
    controlPanel.style('background-color', 'rgba(0, 0, 0, 0.7)');
    controlPanel.style('padding', '10px');
    controlPanel.style('border-radius', '8px');
    controlPanel.style('color', 'white');
    controlPanel.style('display', 'flex');
    controlPanel.style('flex-direction', 'column');
    controlPanel.style('gap', '10px');
    controlPanel.style('z-index', '1100');
    
    // 添加标题
    const title = p.createDiv('ComfyUI实时绘画');
    title.style('font-weight', 'bold');
    title.style('margin-bottom', '5px');
    controlPanel.child(title);
    
    // 状态显示
    statusElement = p.createDiv('状态: ' + comfyUIConfig.status);
    statusElement.style('margin-bottom', '10px');
    controlPanel.child(statusElement);
    
    // 服务器地址输入框
    const serverContainer = p.createDiv('服务器地址:');
    const serverInput = p.createInput(comfyUIConfig.serverAddress);
    serverInput.style('width', '150px');
    serverInput.input(() => {
      comfyUIConfig.serverAddress = serverInput.value();
    });
    serverContainer.child(serverInput);
    
    // 添加服务器控制按钮容器
    const serverButtonsContainer = p.createDiv('');
    serverButtonsContainer.style('display', 'flex');
    serverButtonsContainer.style('gap', '5px');
    serverButtonsContainer.style('margin-top', '5px');
    
    // 重新连接按钮
    const reconnectBtn = p.createButton('重新连接');
    reconnectBtn.style('flex', '1');
    reconnectBtn.mousePressed(() => {
      connectToComfyUI();
    });
    serverButtonsContainer.child(reconnectBtn);
    
    // 从网页获取地址按钮
    const getFromPageBtn = p.createButton('使用网络设置');
    getFromPageBtn.style('flex', '1');
    getFromPageBtn.mousePressed(() => {
      // 尝试从所有输入框中获取IP和端口
      try {
        // 尝试获取网络设置页面中的IP输入框
        const ipInput = document.querySelector('input[value="127.0.0.1"]') || 
                        document.querySelector('input[placeholder="127.0.0.1"]');
        
        // 尝试获取网络设置页面中的端口输入框
        const portInput = document.querySelector('input[value="8000"]') || 
                          document.querySelector('input[placeholder="8000"]');
        
        if (ipInput && portInput) {
          const ip = ipInput.value || ipInput.placeholder || '127.0.0.1';
          const port = portInput.value || portInput.placeholder || '8000';
          
          // 更新输入框显示
          serverInput.value(`ws://${ip}:${port}/ws`);
          
          // 更新配置
          window.updateComfyUIServerAddress(ip, port);
          
          // 通知用户
          comfyUIConfig.status = `已更新地址: ${ip}:${port}`;
          console.log(`[ComfyUI] 已从网页获取并更新服务器地址: ${ip}:${port}`);
        } else {
          alert('无法在页面中找到IP或端口输入框');
          console.warn('[ComfyUI] 未找到网络设置输入框');
        }
      } catch (err) {
        console.error('[ComfyUI] 从网页获取地址失败:', err);
        alert('从网页获取地址失败: ' + err.message);
      }
    });
    serverButtonsContainer.child(getFromPageBtn);
    
    // 添加按钮容器到服务器容器
    serverContainer.child(serverButtonsContainer);
    controlPanel.child(serverContainer);
    
    // 添加自动发送选项
    const autoSendContainer = p.createDiv('');
    autoSendContainer.style('display', 'flex');
    autoSendContainer.style('align-items', 'center');
    autoSendContainer.style('gap', '5px');
    
    autoSendCheckbox = p.createCheckbox('自动发送', isAutoSend);
    autoSendCheckbox.style('color', 'white');
    autoSendCheckbox.changed(() => {
      isAutoSend = autoSendCheckbox.checked();
    });
    autoSendContainer.child(autoSendCheckbox);
    
    controlPanel.child(autoSendContainer);
    
    // 画笔控制面板
    const drawingControlsContainer = p.createDiv('绘画控制:');
    drawingControlsContainer.style('margin-top', '5px');
    
    // 参考图清除按钮
    const buttonsContainer = p.createDiv('');
    buttonsContainer.style('display', 'flex');
    buttonsContainer.style('gap', '5px');
    buttonsContainer.style('margin-top', '5px');
    
    // 清除按钮
    const clearRefBtn = p.createButton('清除画布');
    clearRefBtn.style('flex', '1');
    clearRefBtn.style('padding', '4px 0');
    clearRefBtn.style('border-radius', '4px');
    clearRefBtn.style('border', 'none');
    clearRefBtn.style('background', '#e15252');
    clearRefBtn.style('color', 'white');
    clearRefBtn.mousePressed(clearReferenceCanvas);
    buttonsContainer.child(clearRefBtn);
    
    // 撤销按钮
    const undoBtn = p.createButton('撤销');
    undoBtn.style('flex', '1');
    undoBtn.style('padding', '4px 0');
    undoBtn.style('border-radius', '4px');
    undoBtn.style('border', 'none');
    undoBtn.style('background', '#d4a056');
    undoBtn.style('color', 'white');
    undoBtn.mousePressed(undoLastAction);
    buttonsContainer.child(undoBtn);
    
    // 手动发送按钮
    const sendBtn = p.createButton('发送');
    sendBtn.style('flex', '1');
    sendBtn.style('padding', '4px 0');
    sendBtn.style('border-radius', '4px');
    sendBtn.style('border', 'none');
    sendBtn.style('background', '#29a19c');
    sendBtn.style('color', 'white');
    sendBtn.mousePressed(captureAndSendCanvas);
    buttonsContainer.child(sendBtn);
    
    drawingControlsContainer.child(buttonsContainer);
    controlPanel.child(drawingControlsContainer);
    
    // 画笔颜色选择器
    const colorContainer = p.createDiv('画笔颜色:');
    const colorPicker = p.createColorPicker(strokeColor);
    colorPicker.input(() => {
      strokeColor = colorPicker.value();
    });
    colorContainer.child(colorPicker);
    controlPanel.child(colorContainer);
    
    // 画笔粗细滑块
    const strokeContainer = p.createDiv('画笔粗细:');
    const strokeSlider = p.createSlider(1, 20, strokeWidth);
    strokeSlider.input(() => {
      strokeWidth = strokeSlider.value();
    });
    strokeContainer.child(strokeSlider);
    
    // 添加显示当前粗细的元素
    const strokeValueDisplay = p.createSpan(strokeWidth);
    strokeValueDisplay.id('stroke-width-value');
    strokeValueDisplay.style('margin-left', '10px');
    strokeValueDisplay.style('min-width', '20px');
    strokeValueDisplay.style('text-align', 'center');
    strokeContainer.child(strokeValueDisplay);
    
    // 更新粗细值显示
    strokeSlider.input(() => {
      document.getElementById('stroke-width-value').textContent = strokeSlider.value();
    });
    
    controlPanel.child(strokeContainer);
    
    // 提示词输入框
    const promptContainer = p.createDiv('提示词:');
    const promptInput = p.createInput(customPrompt);
    promptInput.style('width', '150px');
    promptInput.input(() => {
      customPrompt = promptInput.value();
    });
    promptContainer.child(promptInput);
    controlPanel.child(promptContainer);
    
    // 生成按钮
    const generateBtn = p.createButton('生成图像');
    generateBtn.style('margin-top', '5px');
    generateBtn.style('padding', '6px 0');
    generateBtn.style('border-radius', '4px');
    generateBtn.style('border', 'none');
    generateBtn.style('background', '#4a6baf');
    generateBtn.style('color', 'white');
    generateBtn.mousePressed(generateImage);
    controlPanel.child(generateBtn);
  }

  // 清除参考图画布
  function clearReferenceCanvas() {
    // 先保存当前状态到历史记录
    saveToHistory();
    
    // 清除画布
    referenceContext.fillStyle = 'white';
    referenceContext.fillRect(0, 0, refCanvasConfig.width, refCanvasConfig.height);
    
    // 更新P5图像
    updateReferenceP5Image();
  }
  
  // 绘制参考图的笔画
  function drawReferenceStroke() {
    if (p.mouseIsPressed && p.pmouseX && p.pmouseY) {
      // 将画布坐标转换为参考图坐标
      const x = p.mouseX - refCanvasConfig.x;
      const y = p.mouseY - refCanvasConfig.y;
      const px = p.pmouseX - refCanvasConfig.x;
      const py = p.pmouseY - refCanvasConfig.y;
      
      // 设置参考图的绘制样式
      referenceContext.strokeStyle = strokeColor;
      referenceContext.lineWidth = strokeWidth;
      referenceContext.lineCap = 'round';
      referenceContext.lineJoin = 'round';
      
      // 绘制线条
      referenceContext.beginPath();
      referenceContext.moveTo(px, py);
      referenceContext.lineTo(x, y);
      referenceContext.stroke();
      
      // 更新P5图像
      updateReferenceP5Image();
    }
  }
  
  // 检查参考图的鼠标事件 - 判断鼠标是否在参考图画布区域内
  function isMouseOverReferenceCanvas() {
    return (
      p.mouseX >= refCanvasConfig.x && 
      p.mouseX <= refCanvasConfig.x + refCanvasConfig.width &&
      p.mouseY >= refCanvasConfig.y && 
      p.mouseY <= refCanvasConfig.y + refCanvasConfig.height
    );
  }
  
  // 检查ComfyUI连接状态
  function checkComfyUIConnection() {
    comfyUIConfig.status = '正在连接...';
    comfyUIConfig.isConnected = false;
    updateStatusDisplay();
    
    // 解析WebSocket URL以获取HTTP URL前缀
    let httpUrl = '';
    try {
      // 从WebSocket URL提取主机和端口
      const wsUrl = comfyUIConfig.serverAddress;
      const wsMatch = wsUrl.match(/^ws:\/\/([^\/]+)(\/.*)?$/);
      
      if (wsMatch) {
        const hostPort = wsMatch[1]; // 例如 "127.0.0.1:8000"
        httpUrl = `http://${hostPort}`;
        debugLog(`已解析WebSocket URL, HTTP基础URL: ${httpUrl}`);
      } else {
        throw new Error('无效的WebSocket URL格式');
      }
    } catch (err) {
      console.error('[ComfyUI] 解析服务器地址失败:', err);
      comfyUIConfig.status = '服务器地址格式错误';
      updateStatusDisplay();
      
      // 恢复默认地址
      setTimeout(() => {
        comfyUIConfig.serverAddress = 'ws://127.0.0.1:8000/ws';
        comfyUIConfig.status = '已重置为默认地址';
        updateStatusDisplay();
      }, 3000);
      return;
    }
    
    debugLog(`尝试连接到ComfyUI服务器: ${httpUrl}/system_stats`);
    
    // 先检查服务器状态
    fetch(`${httpUrl}/system_stats`)
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
        }
      })
      .then(data => {
        debugLog('ComfyUI服务器状态正常:', data);
        
        // 服务器状态正常，建立WebSocket连接
        try {
          // 创建WebSocket连接（添加clientId参数）
          const fullAddress = `${comfyUIConfig.serverAddress}?clientId=${comfyUIConfig.clientId}`;
          socket = new WebSocket(fullAddress);
          
          // 设置连接超时
          const connectionTimeout = setTimeout(() => {
            if (socket.readyState !== WebSocket.OPEN) {
              socket.close();
              comfyUIConfig.status = 'WebSocket连接超时';
              updateStatusDisplay();
              debugLog('WebSocket连接超时');
            }
          }, 10000); // 10秒超时
          
          // 连接打开处理
          socket.onopen = function() {
            clearTimeout(connectionTimeout);
            debugLog('WebSocket已连接');
            comfyUIConfig.status = '已连接';
            comfyUIConfig.isConnected = true;
            updateStatusDisplay();
            
            // 保存成功的连接地址
            localStorage.setItem('comfyui_ws_address', comfyUIConfig.serverAddress);
            
            // 发送ping以测试连接
            try {
              socket.send(JSON.stringify({type: 'ping'}));
            } catch (e) {
              console.warn('发送ping失败:', e);
            }
          };
          
          // 接收消息处理
          socket.onmessage = function(event) {
            try {
              // ComfyUI WebSocket消息是JSON格式
              if (typeof event.data === 'string') {
                const message = JSON.parse(event.data);
                
                if (message.type === 'pong') {
                  debugLog('收到pong响应');
                } else if (message.type === 'executing' && message.data.node === null && comfyUIConfig.promptId && message.data.prompt_id === comfyUIConfig.promptId) {
                  // 任务执行完成，获取结果
                  getResultFromComfyUI(comfyUIConfig.promptId);
                } else if (message.type === 'progress') {
                  // 保存进度信息到全局变量
                  currentProgress = {
                    value: message.data.value,
                    max: message.data.max
                  };
                  
                  const progressPercent = Math.round(message.data.value/message.data.max*100);
                  comfyUIConfig.status = `处理中: ${progressPercent}%`;
                  updateStatusDisplay();
                }
              }
            } catch (e) {
              console.error('处理WebSocket消息时出错:', e);
              comfyUIConfig.status = '处理消息出错';
              updateStatusDisplay();
            }
          };
          
          // 连接关闭处理
          socket.onclose = function(event) {
            clearTimeout(connectionTimeout);
            debugLog('WebSocket连接关闭, 代码:', event.code, '原因:', event.reason);
            comfyUIConfig.status = `已断开连接 (${event.code})`;
            comfyUIConfig.isConnected = false;
            updateStatusDisplay();
            
            // 如果非正常关闭且不是手动关闭，尝试重新连接
            if (!event.wasClean && event.code !== 1000) {
              comfyUIConfig.status = '连接断开，5秒后重试...';
              updateStatusDisplay();
              setTimeout(connectToComfyUI, 5000);
            }
          };
          
          // 错误处理
          socket.onerror = function(error) {
            clearTimeout(connectionTimeout);
            console.error('WebSocket错误:', error);
            comfyUIConfig.status = 'WebSocket错误';
            comfyUIConfig.isConnected = false;
            updateStatusDisplay();
          };
        } catch (e) {
          console.error('创建WebSocket连接时出错:', e);
          comfyUIConfig.status = `WebSocket连接失败: ${e.message}`;
          comfyUIConfig.isConnected = false;
          updateStatusDisplay();
        }
      })
      .catch(error => {
        comfyUIConfig.isConnected = false;
        comfyUIConfig.status = '连接失败: ' + error.message;
        console.error('ComfyUI连接失败:', error);
        
        // 尝试提供更具体的错误信息和建议
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('ECONNREFUSED')) {
          comfyUIConfig.status = 'ComfyUI服务器未响应，请检查:';
          updateStatusDisplay();
          debugLog('1. ComfyUI是否已启动');
          debugLog('2. IP地址和端口是否正确');
          debugLog('3. 网络设置中的地址是否与ComfyUI启动地址匹配');
        }
        
        // 5秒后重试
        debugLog('5秒后将重试连接');
        setTimeout(connectToComfyUI, 5000);
      });
  }
  
  // 获取工作流JSON，发送到ComfyUI
  function generateImage() {
    if (!comfyUIConfig.isConnected) {
      alert('未连接到ComfyUI，请检查ComfyUI是否已启动');
      return;
    }
    
    comfyUIConfig.status = '正在生成...';
    
    // 将参考图画布转换为Blob
    referenceCanvas.toBlob(function(blob) {
      if (!blob) {
        comfyUIConfig.status = '生成图像Blob失败';
        console.error('无法从画布创建Blob');
        return;
      }
      
      debugLog('已创建参考图Blob, 大小:', blob.size);
      
      // 获取HTTP URL
      const httpUrl = getHttpUrlFromWs(comfyUIConfig.serverAddress);
      
      // 创建FormData对象用于上传文件
      const formData = new FormData();
      // 添加文件，使用时间戳作为文件名避免缓存问题
      const fileName = `reference_${Date.now()}.png`;
      formData.append('image', blob, fileName);
      
      // 上传图像到ComfyUI
      fetch(`${httpUrl}/upload/image`, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`上传图像失败: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        debugLog('图像上传成功:', data);
        
        // 获取上传后的文件信息
        const uploadedFilename = data.name;
        
        try {
          // 构建工作流
          const workflow = getWorkflow(uploadedFilename, customPrompt);
          
          // 发送到ComfyUI
          sendWorkflow(workflow);
        } catch (error) {
          comfyUIConfig.status = '生成工作流失败: ' + error.message;
          console.error('生成工作流失败:', error);
        }
      })
      .catch(error => {
        comfyUIConfig.status = '上传图像失败: ' + error.message;
        console.error('上传图像失败:', error);
      });
    }, 'image/png');
  }
  
  // 构建ComfyUI工作流
  function getWorkflow(imageFilename, prompt) {
    // 使用greenf.json中的高级工作流配置
    const actualPrompt = promptTemplate.replace('{prompt}', prompt);
    // 生成一个随机种子，确保以数字形式（而非字符串）提供给ComfyUI
    const randomSeed = Math.floor(Math.random() * 1000000);
    
    debugLog('生成工作流，随机种子:', randomSeed, '图像文件:', imageFilename);
    
    // 图像输出尺寸，使用16:9比例
    const outWidth = 1536; // 原来的768乘以2
    const outHeight = 864; // 原来的432乘以2
    
    // 创建完整的工作流对象
    const workflow = {
      "33": {
        "inputs": {
          "image": imageFilename,
          "upload": false
        },
        "class_type": "LoadImage"
      },
      "6": {
        "inputs": {
          "text": actualPrompt,
          "clip": [
            "28",
            1
          ]
        },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": {
          "samples": [
            "13",
            0
          ],
          "vae": [
            "10",
            0
          ]
        },
        "class_type": "VAEDecode"
      },
      "10": {
        "inputs": {
          "vae_name": "FLUX_VAE.sft"
        },
        "class_type": "VAELoader"
      },
      "11": {
        "inputs": {
          "clip_name1": "t5xxl_fp8_e4m3fn.safetensors",
          "clip_name2": "clip_l.safetensors",
          "type": "flux",
          "device": "default"
        },
        "class_type": "DualCLIPLoader"
      },
      "12": {
        "inputs": {
          "unet_name": "flux_dev_fp8_11g.safetensors",
          "weight_dtype": "fp8_e4m3fn"
        },
        "class_type": "UNETLoader"
      },
      "13": {
        "inputs": {
          "noise": [
            "25",
            0
          ],
          "guider": [
            "22",
            0
          ],
          "sampler": [
            "16",
            0
          ],
          "sigmas": [
            "17",
            0
          ],
          "latent_image": [
            "26",
            0
          ]
        },
        "class_type": "SamplerCustomAdvanced"
      },
      "16": {
        "inputs": {
          "sampler_name": "euler"
        },
        "class_type": "KSamplerSelect"
      },
      "17": {
        "inputs": {
          "scheduler": "simple",
          "steps": 20,
          "denoise": 0.93,
          "model": [
            "28",
            0
          ]
        },
        "class_type": "BasicScheduler"
      },
      "22": {
        "inputs": {
          "model": [
            "28",
            0
          ],
          "conditioning": [
            "6",
            0
          ]
        },
        "class_type": "BasicGuider"
      },
      "25": {
        "inputs": {
          "noise_seed": randomSeed
        },
        "class_type": "RandomNoise"
      },
      "26": {
        "inputs": {
          "pixels": [
            "33",
            0
          ],
          "vae": [
            "10",
            0
          ]
        },
        "class_type": "VAEEncode"
      },
      "28": {
        "inputs": {
          "lora_name": "F.1 虚焦梦核 _ 柔光春核 _ 夏核_v1.0.safetensors",
          "strength_model": 1,
          "strength_clip": 1,
          "model": [
            "12",
            0
          ],
          "clip": [
            "11",
            0
          ]
        },
        "class_type": "LoraLoader"
      },
      "34": {
        "inputs": {
          "filename_prefix": "ComfyUI",
          "images": [
            "8",
            0
          ]
        },
        "class_type": "SaveImage"
      }
    };
    
    return workflow;
  }
  
  // 发送工作流到ComfyUI
  function sendWorkflow(workflow, requestVersion) {
    // 检查请求版本是否已过时
    if (requestVersion < currentRequestVersion) {
      debugLog(`取消发送旧版本(${requestVersion})的工作流，当前版本为${currentRequestVersion}`);
      isProcessingQueue = false;
      
      // 继续处理队列中其他请求
      if (requestQueue.length > 0) {
        setTimeout(processQueue, 100);
      }
      return;
    }
    
    try {
      // 获取HTTP URL
      const httpUrl = getHttpUrlFromWs(comfyUIConfig.serverAddress);
      
      // 准备提交数据
      const clientID = comfyUIConfig.clientId.toString();
      const promptData = {
        prompt: workflow,
        client_id: clientID
      };
      
      // 测试JSON序列化
      const jsonData = JSON.stringify(promptData);
      debugLog('序列化后的数据长度:', jsonData.length);
      
      debugLog(`正在提交到ComfyUI: ${httpUrl}/prompt`);
      comfyUIConfig.status = '正在提交绘图任务...';
      updateStatusDisplay();
      
      // 发送POST请求
      fetch(`${httpUrl}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: jsonData
      })
      .then(response => {
        if (!response.ok) {
          if (response.status === 400) {
            throw new Error(`请求格式错误(400)，请检查工作流配置`);
          } else {
            throw new Error(`服务器返回错误: ${response.status} ${response.statusText}`);
          }
        }
        return response.json();
      })
      .then(data => {
        // 再次检查版本是否有效
        if (requestVersion < currentRequestVersion) {
          debugLog(`忽略旧版本(${requestVersion})的响应，当前版本为${currentRequestVersion}`);
          isProcessingQueue = false;
          
          // 继续处理队列中其他请求
          if (requestQueue.length > 0) {
            setTimeout(processQueue, 100);
          }
          return;
        }
        
        comfyUIConfig.promptId = data.prompt_id;
        latestProcessedVersion = requestVersion; // 记录最新处理的版本
        comfyUIConfig.status = '已提交请求，等待生成...';
        updateStatusDisplay();
        debugLog('工作流已提交，ID:', data.prompt_id);
      })
      .catch(error => {
        comfyUIConfig.status = '提交失败: ' + error.message;
        console.error('发送工作流失败:', error);
        isProcessingQueue = false;
        isProcessingImage = false;
        
        // 如果是连接问题，尝试重新连接
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          debugLog('检测到网络问题，尝试重新连接...');
          comfyUIConfig.isConnected = false;
          setTimeout(connectToComfyUI, 3000);
        }
        
        // 继续处理队列中其他请求
        if (requestQueue.length > 0) {
          setTimeout(processQueue, 100);
        }
      });
    } catch (error) {
      comfyUIConfig.status = 'JSON序列化失败: ' + error.message;
      console.error('JSON序列化失败:', error);
      isProcessingQueue = false;
      isProcessingImage = false;
      
      // 继续处理队列中其他请求
      if (requestQueue.length > 0) {
        setTimeout(processQueue, 100);
      }
    }
  }
  
  // 辅助函数：从WebSocket URL获取HTTP URL
  function getHttpUrlFromWs(wsUrl) {
    try {
      const wsMatch = wsUrl.match(/^ws:\/\/([^\/]+)(\/.*)?$/);
      if (wsMatch) {
        const hostPort = wsMatch[1]; // 例如 "127.0.0.1:8000"
        return `http://${hostPort}`;
      }
    } catch (err) {
      console.error('[ComfyUI] 解析WebSocket URL失败:', err);
    }
    // 默认返回
    return 'http://127.0.0.1:8000';
  }
  
  // 轮询请求结果
  function pollResults() {
    if (!comfyUIConfig.isConnected) return;
    
    // 获取HTTP URL
    const httpUrl = getHttpUrlFromWs(comfyUIConfig.serverAddress);
    
    fetch(`${httpUrl}/history`)
      .then(response => response.json())
      .then(data => {
        // 查找最新的已完成结果
        const historyData = data[comfyUIConfig.clientId];
        if (historyData && Object.keys(historyData).length > 0) {
          // 获取最新的提示ID
          const sortedKeys = Object.keys(historyData).sort((a, b) => {
            return historyData[b].created_at - historyData[a].created_at;
          });
          
          // 查找第一个包含outputs的结果
          for (const key of sortedKeys) {
            const promptData = historyData[key];
            if (promptData.outputs && Object.keys(promptData.outputs).length > 0) {
              // 找到第一个输出节点（假设为VAEDecode或SaveImage节点）
              const firstOutputKey = Object.keys(promptData.outputs)[0];
              const output = promptData.outputs[firstOutputKey];
              
              if (output.images && output.images.length > 0) {
                // 获取第一张图像
                const imagePath = output.images[0].filename;
                loadResultImage(imagePath);
                break;
              }
            }
          }
        }
      })
      .catch(error => {
        console.error('轮询结果失败:', error);
      })
      .finally(() => {
        // 继续轮询（每5秒）
        setTimeout(pollResults, 5000);
      });
  }
  
  // 加载结果图像
  function loadResultImage(imageUrl) {
    // 加载图像
    p.loadImage(imageUrl, 
      // 成功回调
      img => {
        // 验证图像是否有效
        if (img && img.width && img.height) {
          console.log('图像加载成功，尺寸:', img.width, 'x', img.height);
          lastResult = img;
          comfyUIConfig.status = '图像已生成';
          isProcessingImage = false;
          isProcessingQueue = false;
          
          // 继续处理队列中其他请求
          if (requestQueue.length > 0) {
            setTimeout(processQueue, 100);
          }
        } else {
          console.error('加载的图像无效');
          comfyUIConfig.status = '加载的图像无效';
          lastResult = null;
          isProcessingImage = false;
          isProcessingQueue = false;
        }
      },
      // 错误回调
      err => {
        console.error('加载图像失败:', err);
        comfyUIConfig.status = '加载图像失败';
        lastResult = null;
        isProcessingImage = false;
        isProcessingQueue = false;
        
        // 2秒后重试
        setTimeout(() => loadResultImage(imageUrl), 2000);
      }
    );
  }
  
  // 鼠标按下事件 - 支持自动发送功能
  p.mousePressed = function() {
    // 检查鼠标是否在参考图画布上
    if (isMouseOverReferenceCanvas()) {
      // 保存当前状态以便撤销
      saveToHistory();
      
      isDrawingReference = true;
      return false; // 阻止默认行为
    }
    return true;
  };
  
  p.mouseReleased = function() {
    if (isDrawingReference) {
      isDrawingReference = false;
      
      // 如果开启了自动发送，在绘画结束后发送
      if (isAutoSend) {
        lastSendTime = Date.now();
        
        // 先发送低质量预览
        isLowQualityPreview = true;
        captureAndSendCanvas();
        
        // 延迟1.5秒后再发送高质量结果
        setTimeout(() => {
          if (isAutoSend && !isDrawingReference) {  // 确保用户没有再次开始绘画
            isLowQualityPreview = false;
            captureAndSendCanvas();
          }
        }, 1500);
      }
      
      return false;
    }
    return true;
  };
  
  // 鼠标拖动事件 - 支持实时绘画
  p.mouseDragged = function() {
    if (isDrawingReference) {
      // 检查是否需要自动发送（按时间间隔）
      if (isAutoSend) {
        const currentTime = Date.now();
        if (currentTime - lastSendTime > sendInterval) {
          lastSendTime = currentTime;
          
          // 使用低质量预览模式
          isLowQualityPreview = true;
          captureAndSendCanvas();
        }
      }
      
      return false; // 阻止默认行为
    }
    return true;
  };
  
  // 窗口大小调整
  p.windowResized = function() {
    try {
      // 重新设置主画布大小
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      
      // 更新参考图位置（保持在左下角）
      refCanvasConfig.y = p.windowHeight - refCanvasConfig.height - 20;
      
      // 清理并初始化
      p.clear();
      
      // 强制重绘一次（但确保不会报错）
      if (!lastResult) {
        p.background(240);
      }
      
      // 参考图不需要调整大小，只需正确定位即可
      
    } catch (err) {
      console.error('窗口调整大小时出错:', err);
    }
  };

  // 捕获当前参考图画布并发送到ComfyUI
  function captureAndSendCanvas() {
    if (!comfyUIConfig.isConnected) {
      alert('未连接到ComfyUI，请检查ComfyUI是否已启动');
      return;
    }
    
    comfyUIConfig.status = '准备发送...';
    
    try {
      // 生成新的请求版本号
      currentRequestVersion++;
      const requestVersion = currentRequestVersion;
      debugLog(`创建新请求，版本号: ${requestVersion}`);
      
      // 将参考图画布转换为Blob
      referenceCanvas.toBlob(function(blob) {
        if (!blob) {
          comfyUIConfig.status = '创建图像数据失败';
          debugLog('无法创建Blob');
          return;
        }
        
        // 添加到请求队列，包含版本信息
        requestQueue.push({
          blob: blob,
          version: requestVersion,
          prompt: customPrompt
        });
        
        isProcessingImage = true;
        
        // 如果队列没有在处理中，开始处理
        if (!isProcessingQueue) {
          processQueue();
        }
      }, 'image/png', isLowQualityPreview ? 0.8 : 0.95); // 根据是否是预览模式调整质量
    } catch (e) {
      comfyUIConfig.status = '发送失败: ' + e.message;
      console.error('发送图像时出错:', e);
      isProcessingImage = false;
    }
  }
  
  // 处理请求队列
  function processQueue() {
    if (requestQueue.length === 0 || isProcessingQueue) {
      return;
    }
    
    isProcessingQueue = true;
    const request = requestQueue.pop(); // 获取最新的请求
    requestQueue = []; // 清空队列，只保留最新请求
    
    // 保存当前版本号，用于后续处理结果时判断
    const thisRequestVersion = request.version;
    
    // 获取HTTP URL
    const httpUrl = getHttpUrlFromWs(comfyUIConfig.serverAddress);
    
    // 创建FormData对象
    const formData = new FormData();
    // 添加文件，使用时间戳作为文件名避免缓存问题
    const fileName = `reference_${Date.now()}.png`;
    formData.append('image', request.blob, fileName);
    formData.append('overwrite', 'true');
    
    // 更新状态
    comfyUIConfig.status = '正在上传图像...';
    updateStatusDisplay();
    
    // 上传图像到ComfyUI
    fetch(`${httpUrl}/upload/image`, {
      method: 'POST',
      body: formData
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`上传图像失败: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      debugLog('图像上传成功:', data);
      
      // 检查请求版本是否仍然是最新的
      if (thisRequestVersion < currentRequestVersion) {
        debugLog(`忽略旧版本请求(${thisRequestVersion})，当前版本为${currentRequestVersion}`);
        isProcessingQueue = false;
        
        // 继续处理队列中其他请求
        if (requestQueue.length > 0) {
          setTimeout(processQueue, 100);
        }
        return;
      }
      
      // 获取上传后的文件信息
      const uploadedFilename = data.name;
      
      try {
        // 构建工作流
        const workflow = getWorkflow(uploadedFilename, request.prompt);
        
        // 发送到ComfyUI - 确保传递版本号参数
        sendWorkflow(workflow, thisRequestVersion);
      } catch (error) {
        comfyUIConfig.status = '生成工作流失败: ' + error.message;
        console.error('生成工作流失败:', error);
        isProcessingQueue = false;
        isProcessingImage = false;
      }
    })
    .catch(error => {
      comfyUIConfig.status = '上传图像失败: ' + error.message;
      console.error('上传图像失败:', error);
      isProcessingQueue = false;
      isProcessingImage = false;
      
      // 继续处理队列中其他请求
      if (requestQueue.length > 0) {
        setTimeout(processQueue, 100);
      }
    });
  }
  
  // 更新状态显示
  function updateStatusDisplay() {
    if (statusElement) {
      statusElement.html('状态: ' + comfyUIConfig.status);
    }
  }

  // 连接到ComfyUI WebSocket
  function connectToComfyUI() {
    comfyUIConfig.status = '正在连接...';
    comfyUIConfig.isConnected = false;
    updateStatusDisplay();
    
    // 关闭现有连接
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    
    // 解析WebSocket URL以获取HTTP URL前缀
    let httpUrl = '';
    try {
      // 从WebSocket URL提取主机和端口
      const wsUrl = comfyUIConfig.serverAddress;
      const wsMatch = wsUrl.match(/^ws:\/\/([^\/]+)(\/.*)?$/);
      
      if (wsMatch) {
        const hostPort = wsMatch[1]; // 例如 "127.0.0.1:8000"
        httpUrl = `http://${hostPort}`;
        debugLog(`已解析WebSocket URL, HTTP基础URL: ${httpUrl}`);
      } else {
        throw new Error('无效的WebSocket URL格式');
      }
    } catch (err) {
      console.error('[ComfyUI] 解析服务器地址失败:', err);
      comfyUIConfig.status = '服务器地址格式错误';
      updateStatusDisplay();
      
      // 恢复默认地址
      setTimeout(() => {
        comfyUIConfig.serverAddress = 'ws://127.0.0.1:8000/ws';
        comfyUIConfig.status = '已重置为默认地址';
        updateStatusDisplay();
      }, 3000);
      return;
    }
    
    debugLog(`尝试连接到ComfyUI服务器: ${httpUrl}/system_stats`);
    
    // 先检查服务器状态
    fetch(`${httpUrl}/system_stats`)
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
        }
      })
      .then(data => {
        debugLog('ComfyUI服务器状态正常:', data);
        
        // 服务器状态正常，建立WebSocket连接
        try {
          // 创建WebSocket连接（添加clientId参数）
          const fullAddress = `${comfyUIConfig.serverAddress}?clientId=${comfyUIConfig.clientId}`;
          socket = new WebSocket(fullAddress);
          
          // 设置连接超时
          const connectionTimeout = setTimeout(() => {
            if (socket.readyState !== WebSocket.OPEN) {
              socket.close();
              comfyUIConfig.status = 'WebSocket连接超时';
              updateStatusDisplay();
              debugLog('WebSocket连接超时');
            }
          }, 10000); // 10秒超时
          
          // 连接打开处理
          socket.onopen = function() {
            clearTimeout(connectionTimeout);
            debugLog('WebSocket已连接');
            comfyUIConfig.status = '已连接';
            comfyUIConfig.isConnected = true;
            updateStatusDisplay();
            
            // 保存成功的连接地址
            localStorage.setItem('comfyui_ws_address', comfyUIConfig.serverAddress);
            
            // 发送ping以测试连接
            try {
              socket.send(JSON.stringify({type: 'ping'}));
            } catch (e) {
              console.warn('发送ping失败:', e);
            }
          };
          
          // 接收消息处理
          socket.onmessage = function(event) {
            try {
              // ComfyUI WebSocket消息是JSON格式
              if (typeof event.data === 'string') {
                const message = JSON.parse(event.data);
                
                if (message.type === 'pong') {
                  debugLog('收到pong响应');
                } else if (message.type === 'executing' && message.data.node === null && comfyUIConfig.promptId && message.data.prompt_id === comfyUIConfig.promptId) {
                  // 任务执行完成，获取结果
                  getResultFromComfyUI(comfyUIConfig.promptId);
                } else if (message.type === 'progress') {
                  // 保存进度信息到全局变量
                  currentProgress = {
                    value: message.data.value,
                    max: message.data.max
                  };
                  
                  const progressPercent = Math.round(message.data.value/message.data.max*100);
                  comfyUIConfig.status = `处理中: ${progressPercent}%`;
                  updateStatusDisplay();
                }
              }
            } catch (e) {
              console.error('处理WebSocket消息时出错:', e);
              comfyUIConfig.status = '处理消息出错';
              updateStatusDisplay();
            }
          };
          
          // 连接关闭处理
          socket.onclose = function(event) {
            clearTimeout(connectionTimeout);
            debugLog('WebSocket连接关闭, 代码:', event.code, '原因:', event.reason);
            comfyUIConfig.status = `已断开连接 (${event.code})`;
            comfyUIConfig.isConnected = false;
            updateStatusDisplay();
            
            // 如果非正常关闭且不是手动关闭，尝试重新连接
            if (!event.wasClean && event.code !== 1000) {
              comfyUIConfig.status = '连接断开，5秒后重试...';
              updateStatusDisplay();
              setTimeout(connectToComfyUI, 5000);
            }
          };
          
          // 错误处理
          socket.onerror = function(error) {
            clearTimeout(connectionTimeout);
            console.error('WebSocket错误:', error);
            comfyUIConfig.status = 'WebSocket错误';
            comfyUIConfig.isConnected = false;
            updateStatusDisplay();
          };
        } catch (e) {
          console.error('创建WebSocket连接时出错:', e);
          comfyUIConfig.status = `WebSocket连接失败: ${e.message}`;
          comfyUIConfig.isConnected = false;
          updateStatusDisplay();
        }
      })
      .catch(error => {
        comfyUIConfig.isConnected = false;
        comfyUIConfig.status = '连接失败: ' + error.message;
        console.error('ComfyUI连接失败:', error);
        
        // 尝试提供更具体的错误信息和建议
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('ECONNREFUSED')) {
          comfyUIConfig.status = 'ComfyUI服务器未响应，请检查:';
          updateStatusDisplay();
          debugLog('1. ComfyUI是否已启动');
          debugLog('2. IP地址和端口是否正确');
          debugLog('3. 网络设置中的地址是否与ComfyUI启动地址匹配');
        }
        
        // 5秒后重试
        debugLog('5秒后将重试连接');
        setTimeout(connectToComfyUI, 5000);
      });
  }
  
  // 从ComfyUI获取处理结果
  function getResultFromComfyUI(promptId) {
    // 获取HTTP URL
    const httpUrl = getHttpUrlFromWs(comfyUIConfig.serverAddress);
    
    // 构建历史记录URL
    const historyUrl = `${httpUrl}/history/${promptId}`;
    debugLog('获取历史记录:', historyUrl);
    
    fetch(historyUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // 检查是否还需要处理这个结果
        if (latestProcessedVersion < currentRequestVersion) {
          debugLog(`忽略已过时的结果，版本 ${latestProcessedVersion} < ${currentRequestVersion}`);
          isProcessingQueue = false;
          isProcessingImage = false;
          
          // 继续处理队列中其他请求
          if (requestQueue.length > 0) {
            setTimeout(processQueue, 100);
          }
          return;
        }
        
        const historyData = data[promptId];
        // 查找保存图像的节点输出
        const outputs = historyData.outputs;
        
        for (const nodeId in outputs) {
          if (outputs[nodeId].images) {
            const imageData = outputs[nodeId].images[0];
            
            // 构建图像URL
            const imageUrl = `${httpUrl}/view?filename=${imageData.filename}&type=${imageData.type}&subfolder=${imageData.subfolder || ''}`;
            debugLog('图像URL:', imageUrl);
            
            // 加载图像
            loadResultImage(imageUrl);
            break;
          }
        }
      })
      .catch(error => {
        console.error('获取结果失败:', error);
        comfyUIConfig.status = `获取结果失败: ${error.message}`;
        updateStatusDisplay();
        isProcessingQueue = false;
        isProcessingImage = false;
        
        // 继续处理队列中其他请求
        if (requestQueue.length > 0) {
          setTimeout(processQueue, 100);
        }
      });
  }

  // 绘制数位笔光标
  function drawPenCursor(x, y) {
    // 计算光标大小（基于当前笔触粗细）
    let cursorSize = strokeWidth * 2;
    if (cursorSize < 10) cursorSize = 10;
    
    p.push();
    
    // 在数位笔位置绘制光标
    p.translate(x, y);
    
    // 绘制笔尖 - 使用绿色
    p.noStroke();
    p.fill(50, 200, 50, 200); // 绿色，半透明
    p.ellipse(0, 0, cursorSize, cursorSize);
    
    // 绘制外轮廓
    p.stroke(0, 150);
    p.strokeWeight(1);
    p.noFill();
    p.ellipse(0, 0, cursorSize + 3, cursorSize + 3);
    
    // 添加十字线帮助精确定位
    p.stroke(255);
    p.strokeWeight(1);
    p.line(-cursorSize/2, 0, cursorSize/2, 0);
    p.line(0, -cursorSize/2, 0, cursorSize/2);
    
    p.pop();
  }

  // 为Canvas启用数位笔支持
  function enableStylusSupport(canvas) {
    if (!canvas) return;

    // 启用触摸事件
    canvas.style.touchAction = 'none';
    
    // 启用Windows Ink和其他触摸/笔输入
    canvas.setAttribute('touch-action', 'none');
    
    // 增强数位笔支持配置
    try {
      // 设置HTML5的触控事件捕获属性
      canvas.setAttribute('touch-action', 'none');
      
      // 针对特定浏览器的触控和数位笔设置
      if (typeof canvas.style.touchAction !== 'undefined') {
        canvas.style.touchAction = 'none';  // 现代浏览器
        canvas.style.msTouchAction = 'none'; // IE/Edge支持
        canvas.style.webkitTouchCallout = 'none'; // Safari支持
      }
      
      // 提高指针事件精度
      canvas.setAttribute('data-wm-touch-sensitivity', 'high');
      canvas.setAttribute('data-stylus-pressure', 'true');
      
      // 启用数位笔压力识别
      const ctx = canvas.getContext('2d', { desynchronized: true });
      if (ctx && typeof ctx.canvas !== 'undefined') {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }
      
      console.log('AI画布: 已应用增强型数位笔支持设置');
    } catch (err) {
      console.warn('AI画布: 应用增强型数位笔支持设置时出错:', err);
    }
    
    // 为canvas添加直接的指针事件监听
    canvas.addEventListener('pointerdown', function(e) {
      // 防止默认行为，确保所有指针事件都能被正确捕获
      e.preventDefault();
      
      // 检测数位笔
      if (e.pointerType === 'pen') {
        isPenHovering = true;
        penX = e.clientX;
        penY = e.clientY;
        console.log('AI画布直接捕获到数位笔输入, 压力值:', e.pressure);
      } else {
        isPenHovering = false;
      }
      
      // 检查点击是否在参考图区域内
      const x = e.clientX;
      const y = e.clientY;
      if (x >= refCanvasConfig.x && x <= refCanvasConfig.x + refCanvasConfig.width &&
          y >= refCanvasConfig.y && y <= refCanvasConfig.y + refCanvasConfig.height) {
        // 保存当前状态以便撤销
        saveToHistory();
        isDrawingReference = true;
      }
    }, { passive: false });
    
    // 增加指针移动事件监听
    canvas.addEventListener('pointermove', function(e) {
      // 更新数位笔位置
      if (e.pointerType === 'pen') {
        isPenHovering = true;
        penX = e.clientX;
        penY = e.clientY;
      }
      
      if (e.pointerType === 'pen' && e.buttons > 0 && isDrawingReference) {
        // 将画布坐标转换为参考图坐标
        const x = e.clientX - refCanvasConfig.x;
        const y = e.clientY - refCanvasConfig.y;
        
        if (x >= 0 && x <= refCanvasConfig.width && 
            y >= 0 && y <= refCanvasConfig.height) {
          
          // 获取前一个位置（如果是第一个点，使用当前位置）
          let prevX = x;
          let prevY = y;
          
          if (e.getCoalescedEvents && e.getCoalescedEvents().length > 0) {
            // 使用合并事件获取更准确的前一个位置
            const prevEvent = e.getCoalescedEvents()[0];
            prevX = prevEvent.clientX - refCanvasConfig.x;
            prevY = prevEvent.clientY - refCanvasConfig.y;
          }
          
          // 设置参考图的绘制样式
          referenceContext.strokeStyle = strokeColor;
          referenceContext.lineWidth = strokeWidth * (e.pressure || 0.5); // 使用压力调整线宽
          referenceContext.lineCap = 'round';
          referenceContext.lineJoin = 'round';
          
          // 绘制线条
          referenceContext.beginPath();
          referenceContext.moveTo(prevX, prevY);
          referenceContext.lineTo(x, y);
          referenceContext.stroke();
          
          // 更新P5图像
          updateReferenceP5Image();
        }
      }
    }, { passive: false });
    
    // 添加指针抬起事件
    canvas.addEventListener('pointerup', function(e) {
      if (isDrawingReference) {
        isDrawingReference = false;
        
        // 如果开启了自动发送，在绘画结束后发送
        if (isAutoSend) {
          lastSendTime = Date.now();
          
          // 先发送低质量预览
          isLowQualityPreview = true;
          captureAndSendCanvas();
          
          // 延迟1.5秒后再发送高质量结果
          setTimeout(() => {
            if (isAutoSend && !isDrawingReference) {  // 确保用户没有再次开始绘画
              isLowQualityPreview = false;
              captureAndSendCanvas();
            }
          }, 1500);
        }
      }
    }, { passive: false });
    
    // 添加指针离开画布的处理
    canvas.addEventListener('pointerleave', function(e) {
      if (e.pointerType === 'pen') {
        // 数位笔离开画布，隐藏光标
        isPenHovering = false;
      }
    });
    
    // 添加指针进入画布的处理
    canvas.addEventListener('pointerenter', function(e) {
      if (e.pointerType === 'pen') {
        // 数位笔进入画布，显示光标
        isPenHovering = true;
        penX = e.clientX;
        penY = e.clientY;
      }
    });
    
    // 禁用上下文菜单（防止右键或长按触发）
    canvas.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      return false;
    }, { passive: false });
    
    // 设置高优先级捕获，确保所有指针事件由canvas捕获
    window.addEventListener('load', function() {
      if (canvas.setPointerCapture) {
        canvas.addEventListener('pointerdown', function(e) {
          try {
            // 捕获指针，确保即使指针移动到canvas外也能继续接收事件
            canvas.setPointerCapture(e.pointerId);
            
            // 高漫M6等数位板可能需要明确设置焦点
            canvas.focus();
          } catch (err) {
            console.warn('无法捕获指针:', err);
          }
        }, { passive: false });
      }
    });
  }
};
