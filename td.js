// ComfyUI 实时绘画功能
// 将画面发送到ComfyUI处理并接收处理后的结果

function tdSketch(p) {
  let capturedImage = null;  // 本地捕获的图像
  let processedImage = null; // 从ComfyUI接收的处理后图像
  let statusText = '待连接';
  let isConnected = false;
  let socket = null;
  let serverAddress = 'ws://127.0.0.1:8000/ws'; // 更新为与网络设置页面匹配的地址
  let clientId = null;  // ComfyUI客户端ID
  let addressInput;
  let promptId = null;  // 当前任务的promptId
  let isDrawing = false; // 是否正在绘画
  let lastSendTime = 0; // 上次发送时间戳
  let sendInterval = 1000; // 发送间隔，单位毫秒（减少为1秒）
  let processingImage = false; // 是否正在处理图像
  let drawCanvas; // 用于绘画的画布
  let resultCanvas; // 用于显示结果的画布
  let strokeColor = [0, 0, 0]; // 笔触颜色
  let strokeWidth = 4; // 笔触粗细
  let colorPicker; // 颜色选择器
  let strokeSlider; // 粗细滑块
  let autoSendCheckbox; // 自动发送复选框
  let clearButton; // 清除按钮
  let undoButton; // 撤销按钮
  let sendButton; // 手动发送按钮
  let isAutoSend = true; // 是否自动发送
  let drawHistory = []; // 绘画历史记录，用于撤销功能
  let maxHistorySteps = 10; // 最大历史记录步数
  let requestQueue = []; // 请求队列
  let isProcessingQueue = false; // 是否正在处理队列
  let currentProgress = { value: 0, max: 1 }; // 当前处理进度
  let isLowQualityPreview = true; // 是否使用低质量预览
  let currentRequestVersion = 0; // 当前请求版本号
  let latestProcessedVersion = 0; // 最新处理的版本
  
  // 两个画布的位置配置
  let drawCanvasPos = { x: 0, y: 0 }; // 绘画画布位置
  let resultCanvasPos = { x: 0, y: 0 }; // 结果画布位置
  let canvasSeparation = 20; // 两个画布之间的间隔
  
  // 绘画画布大小（小尺寸）
  const drawCanvasSize = 256; // 绘画画布尺寸
  
  // 提示词和风格选择
  let promptInput; // 提示词输入框
  let styleSelect; // 风格选择下拉框
  let promptSelect; // 预设提示词选择下拉框
  let currentPrompt = "flower"; // 当前提示词
  let currentNegativePrompt = "man"; // 当前负向提示词
  
  // 可用的模型和风格
  const availableStyles = [
    { name: "插画风格", model: "sd1.5i_V1.safetensors", prompt: "", negative: "cartoon, anime, illustration", lora: "" },
    { name: "梦境风格", model: "sd1.5i_V1.safetensors", prompt: "niji", negative: "realistic, photo", lora: "苏-宫崎骏 梦境_v1.0.safetensors" }
  ];
  
  // 情感疗愈相关的预设提示词
  const healingPrompts = [
    { name: "平静湖畔", prompt: "tranquil lake, peaceful scene, relaxing atmosphere, gentle ripples, soft light" },
    { name: "花海日落", prompt: "flower field at sunset, golden light, warm colors, gentle breeze, serenity" },
    { name: "森林漫步", prompt: "forest path, sunlight through trees, birds singing, fresh air, lush greenery" },
    { name: "暖阳海滩", prompt: "sunny beach, clear blue water, white sand, palm trees, peaceful waves" },
    { name: "星空夜晚", prompt: "starry night sky, twinkling stars, moonlight, calm atmosphere, peaceful night" }
  ];
  
  p.setup = function() {
    // 创建主画布（大小与窗口相同）
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.position(0, 0);
    canvas.style('z-index', '800');
    p.background(255);
    
    // 创建绘画画布（小尺寸）
    drawCanvas = p.createGraphics(512, 512);
    drawCanvas.background(255);
    
    // 创建结果画布（固定尺寸512x512）
    resultCanvas = p.createGraphics(512, 512);
    resultCanvas.background(255);
    
    // 计算两个画布的位置
    updateCanvasPositions();
    
    // 保存初始状态到历史记录
    saveToHistory();
    
    // 如果有保存的画布，恢复内容
    if (savedCanvas && savedCanvas.width && savedCanvas.height) {
      try {
        if (savedCanvas instanceof HTMLCanvasElement) {
          drawCanvas.drawingContext.drawImage(savedCanvas, 0, 0, 512, 512);
        } else {
          drawCanvas.image(savedCanvas, 0, 0, 512, 512);
        }
        capturedImage = drawCanvas.get();
        saveToHistory(); // 保存恢复的初始状态
      } catch (e) {
        console.warn('恢复画布内容失败:', e);
        capturedImage = null;
      }
    }
    
    // 创建控制面板
    const controlPanel = p.createDiv('');
    controlPanel.id('comfyui-controls');
    controlPanel.style('position', 'fixed');
    controlPanel.style('top', '20px');
    controlPanel.style('left', '20px');
    controlPanel.style('background-color', 'rgba(42, 42, 64, 0.85)'); // 更好看的背景色
    controlPanel.style('padding', '15px');
    controlPanel.style('border-radius', '12px');
    controlPanel.style('display', 'flex');
    controlPanel.style('flex-direction', 'column');
    controlPanel.style('gap', '12px');
    controlPanel.style('z-index', '1100');
    controlPanel.style('box-shadow', '0 4px 8px rgba(0,0,0,0.3)'); // 添加阴影效果
    controlPanel.style('font-family', 'Arial, sans-serif'); // 指定字体
    
    // 创建标题
    const panelTitle = p.createDiv('ComfyUI 实时绘画');
    panelTitle.style('color', 'white');
    panelTitle.style('font-weight', 'bold');
    panelTitle.style('font-size', '16px');
    panelTitle.style('margin-bottom', '10px');
    panelTitle.style('border-bottom', '1px solid rgba(255,255,255,0.2)');
    panelTitle.style('padding-bottom', '8px');
    controlPanel.child(panelTitle);
    
    // 尝试从localStorage恢复上次成功的连接地址
    const savedAddress = localStorage.getItem('comfyui_ws_address');
    if (savedAddress) {
      serverAddress = savedAddress;
      console.log('已恢复上次连接地址:', serverAddress);
    }
    
    // 服务器地址
    const addressContainer = p.createDiv('');
    addressContainer.style('display', 'flex');
    addressContainer.style('align-items', 'center');
    addressContainer.style('gap', '5px');
    
    const addressLabel = p.createSpan('服务器:');
    addressLabel.style('color', 'white');
    addressContainer.child(addressLabel);
    
    addressInput = p.createInput(serverAddress);
    addressInput.style('width', '180px');
    addressInput.style('padding', '4px 8px');
    addressInput.style('border-radius', '4px');
    addressInput.style('border', '1px solid #555');
    addressInput.style('background', 'rgba(30, 30, 40, 0.6)');
    addressInput.style('color', 'white');
    addressContainer.child(addressInput);
    
    const connectButton = p.createButton('连接');
    connectButton.style('padding', '4px 10px');
    connectButton.style('border-radius', '4px');
    connectButton.style('border', 'none');
    connectButton.style('background', '#4a6baf');
    connectButton.style('color', 'white');
    connectButton.style('cursor', 'pointer');
    connectButton.mousePressed(connectToComfyUI);
    addressContainer.child(connectButton);
    
    controlPanel.child(addressContainer);
    
    // 提示词输入
    const promptContainer = p.createDiv('');
    promptContainer.style('display', 'flex');
    promptContainer.style('flex-direction', 'column');
    promptContainer.style('gap', '5px');
    
    const promptLabel = p.createSpan('提示词:');
    promptLabel.style('color', 'white');
    promptContainer.child(promptLabel);
    
    promptInput = p.createInput(currentPrompt);
    promptInput.style('width', '100%');
    promptInput.style('padding', '4px 8px');
    promptInput.style('border-radius', '4px');
    promptInput.style('border', '1px solid #555');
    promptInput.style('background', 'rgba(30, 30, 40, 0.6)');
    promptInput.style('color', 'white');
    promptInput.changed(() => {
      currentPrompt = promptInput.value();
    });
    promptContainer.child(promptInput);
    
    controlPanel.child(promptContainer);
    
    // 预设提示词选择
    const presetPromptContainer = p.createDiv('');
    presetPromptContainer.style('display', 'flex');
    presetPromptContainer.style('flex-direction', 'column');
    presetPromptContainer.style('gap', '5px');
    
    const presetPromptLabel = p.createSpan('情感疗愈场景:');
    presetPromptLabel.style('color', 'white');
    presetPromptContainer.child(presetPromptLabel);
    
    promptSelect = p.createSelect();
    promptSelect.style('width', '100%');
    promptSelect.style('padding', '4px 8px');
    promptSelect.style('border-radius', '4px');
    promptSelect.style('border', '1px solid #555');
    promptSelect.style('background', 'rgba(30, 30, 40, 0.6)');
    promptSelect.style('color', 'white');
    
    // 添加空选项
    promptSelect.option('选择预设场景...', -1);
    
    // 添加预设提示词选项
    healingPrompts.forEach((item, index) => {
      promptSelect.option(item.name, index);
    });
    
    promptSelect.changed(handlePromptChange);
    presetPromptContainer.child(promptSelect);
    
    // 添加使用预设按钮
    const usePresetButton = p.createButton('使用选中场景');
    usePresetButton.style('width', '100%');
    usePresetButton.style('padding', '6px 10px');
    usePresetButton.style('margin-top', '5px');
    usePresetButton.style('border-radius', '4px');
    usePresetButton.style('border', 'none');
    usePresetButton.style('background', '#e47e77');
    usePresetButton.style('color', 'white');
    usePresetButton.style('cursor', 'pointer');
    usePresetButton.mousePressed(() => {
      if (promptSelect.value() != -1) {
        // 发送当前选择的场景和风格
        if (isConnected) {
          captureAndSendCanvas();
        }
      }
    });
    presetPromptContainer.child(usePresetButton);
    
    controlPanel.child(presetPromptContainer);
    
    // 风格选择
    const styleContainer = p.createDiv('');
    styleContainer.style('display', 'flex');
    styleContainer.style('flex-direction', 'column');
    styleContainer.style('gap', '5px');
    
    const styleLabel = p.createSpan('风格:');
    styleLabel.style('color', 'white');
    styleContainer.child(styleLabel);
    
    styleSelect = p.createSelect();
    styleSelect.style('width', '100%');
    styleSelect.style('padding', '4px 8px');
    styleSelect.style('border-radius', '4px');
    styleSelect.style('border', '1px solid #555');
    styleSelect.style('background', 'rgba(30, 30, 40, 0.6)');
    styleSelect.style('color', 'white');
    
    // 添加风格选项
    availableStyles.forEach((style, index) => {
      styleSelect.option(style.name, index);
    });
    
    styleSelect.changed(handleStyleChange);
    styleContainer.child(styleSelect);
    
    controlPanel.child(styleContainer);
    
    // 颜色选择器
    const colorContainer = p.createDiv('');
    colorContainer.style('display', 'flex');
    colorContainer.style('align-items', 'center');
    colorContainer.style('gap', '5px');
    
    const colorLabel = p.createSpan('颜色:');
    colorLabel.style('color', 'white');
    colorContainer.child(colorLabel);
    
    colorPicker = p.createColorPicker('#000000');
    colorPicker.style('width', '50px');
    colorPicker.style('height', '25px');
    colorPicker.style('border', 'none');
    colorPicker.style('border-radius', '4px');
    colorContainer.child(colorPicker);
    
    controlPanel.child(colorContainer);
    
    // 笔触粗细滑块
    const strokeContainer = p.createDiv('');
    strokeContainer.style('display', 'flex');
    strokeContainer.style('align-items', 'center');
    strokeContainer.style('gap', '5px');
    
    const strokeLabel = p.createSpan('粗细:');
    strokeLabel.style('color', 'white');
    strokeContainer.child(strokeLabel);
    
    strokeSlider = p.createSlider(1, 20, strokeWidth);
    strokeSlider.style('width', '120px');
    strokeSlider.style('margin', '0');
    strokeContainer.child(strokeSlider);
    
    const strokeValue = p.createSpan(strokeWidth.toString());
    strokeValue.id('stroke-value');
    strokeValue.style('color', 'white');
    strokeValue.style('width', '20px');
    strokeValue.style('text-align', 'right');
    strokeContainer.child(strokeValue);
    
    // 更新粗细值显示
    strokeSlider.input(() => {
      document.getElementById('stroke-value').textContent = strokeSlider.value();
    });
    
    controlPanel.child(strokeContainer);
    
    // 自动发送选项
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
    
    // 按钮容器
    const buttonContainer = p.createDiv('');
    buttonContainer.style('display', 'flex');
    buttonContainer.style('gap', '8px');
    
    // 手动发送按钮
    sendButton = p.createButton('发送画布');
    sendButton.style('flex', '1');
    sendButton.style('padding', '6px 0');
    sendButton.style('border-radius', '4px');
    sendButton.style('border', 'none');
    sendButton.style('background', '#29a19c');
    sendButton.style('color', 'white');
    sendButton.style('cursor', 'pointer');
    sendButton.mousePressed(() => {
      if (isConnected) {
        captureAndSendCanvas();
      }
    });
    buttonContainer.child(sendButton);
    
    // 撤销按钮
    undoButton = p.createButton('撤销');
    undoButton.style('flex', '1');
    undoButton.style('padding', '6px 0');
    undoButton.style('border-radius', '4px');
    undoButton.style('border', 'none');
    undoButton.style('background', '#d4a056');
    undoButton.style('color', 'white');
    undoButton.style('cursor', 'pointer');
    undoButton.mousePressed(undoLastAction);
    buttonContainer.child(undoButton);
    
    // 清除按钮
    clearButton = p.createButton('清除画布');
    clearButton.style('flex', '1');
    clearButton.style('padding', '6px 0');
    clearButton.style('border-radius', '4px');
    clearButton.style('border', 'none');
    clearButton.style('background', '#e15252');
    clearButton.style('color', 'white');
    clearButton.style('cursor', 'pointer');
    clearButton.mousePressed(() => {
      saveToHistory(); // 保存当前状态到历史记录
      drawCanvas.background(255);
      resultCanvas.background(255);
      capturedImage = null;
      processedImage = null;
    });
    buttonContainer.child(clearButton);
    
    controlPanel.child(buttonContainer);
    
    // 状态显示
    const statusContainer = p.createDiv('');
    statusContainer.id('status-display');
    statusContainer.style('color', 'white');
    statusContainer.style('margin-top', '5px');
    statusContainer.style('background-color', 'rgba(0, 0, 0, 0.3)');
    statusContainer.style('padding', '6px 8px');
    statusContainer.style('border-radius', '4px');
    statusContainer.html(`状态: <span id="status-text">${statusText}</span>`);
    
    controlPanel.child(statusContainer);
    
    // 生成客户端ID
    clientId = generateUUID();
    
    // 设置默认风格
    handleStyleChange();
    
    // 尝试连接到ComfyUI
    connectToComfyUI();
  };
  
  // 处理预设提示词变更
  function handlePromptChange() {
    const promptIndex = promptSelect.value();
    if (promptIndex != -1) {
      const selectedPrompt = healingPrompts[promptIndex];
      promptInput.value(selectedPrompt.prompt);
      currentPrompt = selectedPrompt.prompt;
    }
  }
  
  // 处理风格变更
  function handleStyleChange() {
    const styleIndex = styleSelect.value();
    const selectedStyle = availableStyles[styleIndex];
    
    // 更新提示词（如果风格有特定提示词）
    if (selectedStyle.prompt) {
      const basePrompt = promptInput.value();
      // 检查提示词中是否已包含该风格描述
      if (!basePrompt.includes(selectedStyle.prompt)) {
        promptInput.value(basePrompt + ", " + selectedStyle.prompt);
        currentPrompt = promptInput.value();
      }
    }
    
    // 更新负向提示词
    if (selectedStyle.negative) {
      currentNegativePrompt = selectedStyle.negative;
    }
    
    console.log("已选择风格:", selectedStyle.name, "模型:", selectedStyle.model, "Lora:", selectedStyle.lora);
  }
  
  // 更新画布位置
  function updateCanvasPositions() {
    // 结果画布铺满整个屏幕（但保持比例）
    resultCanvasPos = {
      x: 0,
      y: 0
    };
    
    // 设置绘画画布位置（左下角）
    const padding = 20; // 边距
    drawCanvasPos = {
      x: padding,
      y: p.height - drawCanvasSize - padding
    };
  }
  
  // 保存当前状态到历史记录
  function saveToHistory() {
    if (drawCanvas) {
      // 限制历史记录数量
      if (drawHistory.length >= maxHistorySteps) {
        drawHistory.shift(); // 移除最老的记录
      }
      
      // 保存当前画布状态
      const currentState = drawCanvas.get();
      drawHistory.push(currentState);
    }
  }
  
  // 撤销上一步操作
  function undoLastAction() {
    if (drawHistory.length > 1) { // 保留至少一个历史记录（初始状态）
      drawHistory.pop(); // 移除当前状态
      const previousState = drawHistory[drawHistory.length - 1]; // 获取上一个状态
      
      // 恢复到上一个状态
      drawCanvas.clear();
      drawCanvas.image(previousState, 0, 0);
    }
  }
  
  // 生成UUID函数
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // 连接到ComfyUI的WebSocket服务器
  function connectToComfyUI() {
    // 获取用户输入的地址
    serverAddress = addressInput.value();
    
    // 关闭现有连接
    if (socket) {
      socket.close();
      isConnected = false;
      statusText = '正在重新连接...';
      updateStatusText();
    }
    
    try {
      // 验证WebSocket URL格式
      try {
        new URL(serverAddress);
      } catch (e) {
        // 如果URL不完整，尝试修复它
        if (!serverAddress.startsWith('ws://') && !serverAddress.startsWith('wss://')) {
          serverAddress = 'ws://' + serverAddress;
        }
        // 再次验证
        new URL(serverAddress);
      }
      
      // 确保URL以/ws结尾
      if (!serverAddress.endsWith('/ws')) {
        if (serverAddress.endsWith('/')) {
          serverAddress = serverAddress + 'ws';
        } else {
          serverAddress = serverAddress + '/ws';
        }
      }
      
      console.log('尝试连接到:', serverAddress);
      statusText = '正在连接...';
      updateStatusText();
      
      // 创建WebSocket连接（添加clientId参数）
      const fullAddress = `${serverAddress}?clientId=${clientId}`;
      socket = new WebSocket(fullAddress);
      
      // 设置连接超时
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          socket.close();
          statusText = '连接超时';
          updateStatusText();
          console.error('WebSocket连接超时');
        }
      }, 10000); // 10秒超时
      
      // 连接打开处理
      socket.onopen = function() {
        clearTimeout(connectionTimeout);
        console.log('已连接到ComfyUI');
        statusText = '已连接';
        isConnected = true;
        updateStatusText();
        
        // 保存成功的连接地址
        localStorage.setItem('comfyui_ws_address', serverAddress);
        
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
              console.log('收到pong响应');
            } else if (message.type === 'executing' && message.data.node === null && promptId && message.data.prompt_id === promptId) {
              // 任务执行完成，获取结果
              getResultFromComfyUI(promptId);
            } else if (message.type === 'progress') {
              // 保存进度信息到全局变量
              currentProgress = {
                value: message.data.value,
                max: message.data.max
              };
              
              const progressPercent = Math.round(message.data.value/message.data.max*100);
              statusText = `处理中: ${progressPercent}%`;
              updateStatusText();
            }
          }
        } catch (e) {
          console.error('处理WebSocket消息时出错:', e);
          statusText = '处理消息出错';
          updateStatusText();
        }
      };
      
      // 连接关闭处理
      socket.onclose = function(event) {
        clearTimeout(connectionTimeout);
        console.log('与ComfyUI断开连接，代码:', event.code, '原因:', event.reason);
        statusText = `已断开连接 (${event.code})`;
        isConnected = false;
        updateStatusText();
        
        // 如果非正常关闭且不是手动关闭，尝试重新连接
        if (!event.wasClean && event.code !== 1000) {
          statusText = '连接断开，5秒后重试...';
          updateStatusText();
          setTimeout(connectToComfyUI, 5000);
        }
      };
      
      // 错误处理
      socket.onerror = function(error) {
        clearTimeout(connectionTimeout);
        console.error('WebSocket错误:', error);
        statusText = '连接错误';
        isConnected = false;
        updateStatusText();
      };
      
    } catch (e) {
      console.error('创建WebSocket连接时出错:', e);
      statusText = `连接失败: ${e.message}`;
      isConnected = false;
      updateStatusText();
    }
  }
  
  // 更新状态文本
  function updateStatusText() {
    const statusTextElement = document.getElementById('status-text');
    if (statusTextElement) {
      statusTextElement.textContent = statusText;
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
    
    // 创建FormData对象
    const formData = new FormData();
    formData.append('image', request.blob, 'p5_sketch.jpg');
    formData.append('overwrite', 'true');
    
    // 构建正确的上传URL
    let uploadUrl = '';
    try {
      // 解析WebSocket URL
      const wsUrl = new URL(serverAddress);
      // 构建HTTP URL
      uploadUrl = `http${wsUrl.protocol === 'wss:' ? 's' : ''}://${wsUrl.host}/upload/image`;
      console.log('上传URL:', uploadUrl);
      
      statusText = '正在上传图像...';
      updateStatusText();
    } catch (e) {
      console.error('构建上传URL失败:', e);
      statusText = '构建上传URL失败';
      updateStatusText();
      isProcessingQueue = false;
      processingImage = false;
      
      // 继续处理队列中其他请求
      if (requestQueue.length > 0) {
        setTimeout(processQueue, 100);
      }
      return;
    }
    
    // 发送POST请求上传图像
    fetch(uploadUrl, {
      method: 'POST',
      body: formData
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('图像上传成功:', data);
      
      // 检查请求版本是否仍然是最新的
      if (thisRequestVersion < currentRequestVersion) {
        console.log(`忽略旧版本请求(${thisRequestVersion})，当前版本为${currentRequestVersion}`);
        isProcessingQueue = false;
        
        // 继续处理队列中其他请求
        if (requestQueue.length > 0) {
          setTimeout(processQueue, 100);
        }
        return;
      }
      
      // 上传成功后发送绘图任务
      sendDrawingPrompt(data.name, thisRequestVersion);
    })
    .catch(error => {
      console.error('图像上传失败:', error);
      statusText = `图像上传失败: ${error.message}`;
      updateStatusText();
      processingImage = false;
      isProcessingQueue = false;
      
      // 继续处理队列中其他请求
      if (requestQueue.length > 0) {
        setTimeout(processQueue, 100);
      }
    });
  }
  
  // 捕获当前画布并发送
  function captureAndSendCanvas() {
    if (!isConnected) {
      return;
    }
    
    capturedImage = drawCanvas.get();
    
    try {
      // 生成新的请求版本号
      currentRequestVersion++;
      const requestVersion = currentRequestVersion;
      console.log(`创建新请求，版本号: ${requestVersion}`);
      
      // 将画布转换为Blob
      const canvas = drawCanvas.elt;
      canvas.toBlob(function(blob) {
        // 添加到请求队列，包含版本信息
        requestQueue.push({
          blob: blob,
          version: requestVersion
        });
        
        processingImage = true;
        
        // 如果队列没有在处理中，开始处理
        if (!isProcessingQueue) {
          processQueue();
        }
      }, 'image/jpeg', isLowQualityPreview ? 0.8 : 0.9); // 预览模式使用较低质量
    } catch (e) {
      console.error('发送图像时出错:', e);
      statusText = '发送失败';
      updateStatusText();
      processingImage = false;
    }
  }
  
  // 发送绘图任务到ComfyUI
  function sendDrawingPrompt(imageName, requestVersion) {
    // 构建正确的API URL
    let promptUrl = '';
    try {
      // 解析WebSocket URL
      const wsUrl = new URL(serverAddress);
      // 构建HTTP URL
      promptUrl = `http${wsUrl.protocol === 'wss:' ? 's' : ''}://${wsUrl.host}/prompt`;
      console.log('提示词URL:', promptUrl);
    } catch (e) {
      console.error('构建提示词URL失败:', e);
      statusText = '构建提示词URL失败';
      updateStatusText();
      processingImage = false;
      isProcessingQueue = false;
      return;
    }

    // 检查请求版本是否已过时
    if (requestVersion < currentRequestVersion) {
      console.log(`取消发送旧版本(${requestVersion})的绘图任务，当前版本为${currentRequestVersion}`);
      isProcessingQueue = false;
      
      // 继续处理队列中其他请求
      if (requestQueue.length > 0) {
        setTimeout(processQueue, 100);
      }
      return;
    }
    
    // 获取当前选择的风格和模型
    const styleIndex = styleSelect.value();
    const selectedStyle = availableStyles[styleIndex];
    const modelName = selectedStyle.model;
    const loraName = selectedStyle.lora;
    
    // 获取当前提示词
    const prompt = currentPrompt;
    const negativePrompt = currentNegativePrompt;

    // 确保明确使用上传的画布图像的工作流
    let workflow = {
      "1": {
        "class_type": "LoadImage",
        "inputs": {
          "image": imageName // 这里显式使用上传的画布图像
        },
        "title": "加载画布图像"
      },
      "2": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": modelName
        },
        "title": "加载模型"
      }
    };
    
    // 如果有LoRA模型，添加LoRA加载节点
    if (loraName && loraName.length > 0) {
      workflow["3"] = {
        "class_type": "LoraLoader",
        "inputs": {
          "lora_name": loraName,
          "model": [
            "2",
            0
          ],
          "clip": [
            "2",
            1
          ],
          "strength_model": 0.8,
          "strength_clip": 0.8
        },
        "title": "加载Lora"
      };
      
      // 更新后续节点引用
      workflow["4"] = {
        "class_type": "VAEEncode",
        "inputs": {
          "pixels": [
            "1",
            0
          ],
          "vae": [
            "2",
            2
          ]
        },
        "title": "编码画布图像"
      };
      
      workflow["5"] = {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": loraName ? ["3", 1] : ["2", 1],
          "text": prompt
        },
        "title": "正向提示词"
      };
      
      workflow["6"] = {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": loraName ? ["3", 1] : ["2", 1],
          "text": negativePrompt
        },
        "title": "负向提示词"
      };
      
      workflow["7"] = {
        "class_type": "KSampler",
        "inputs": {
          "cfg": 5.0,
          "denoise": isLowQualityPreview ? 0.5 : 0.9,
          "latent_image": [
            "4",
            0
          ],
          "model": [
            "3",
            0
          ],
          "negative": [
            "6",
            0
          ],
          "positive": [
            "5",
            0
          ],
          "sampler_name": isLowQualityPreview ? "euler_ancestral" : "dpmpp_2m",
          "scheduler": "karras",
          "seed": Math.floor(Math.random() * 2**32),
          "steps": isLowQualityPreview ? 10 : 20
        },
        "title": "采样器"
      };
      
      workflow["8"] = {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": [
            "7",
            0
          ],
          "vae": [
            "2",
            2
          ]
        },
        "title": "解码生成图像"
      };
      
      workflow["9"] = {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "p5_realtime",
          "images": [
            "8",
            0
          ]
        },
        "title": "保存结果图像"
      };
    } else {
      // 无LoRA的标准工作流
      workflow["3"] = {
        "class_type": "VAEEncode",
        "inputs": {
          "pixels": [
            "1",
            0
          ],
          "vae": [
            "2",
            2
          ]
        },
        "title": "编码画布图像"
      };
      
      workflow["4"] = {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": [
            "2",
            1
          ],
          "text": prompt
        },
        "title": "正向提示词"
      };
      
      workflow["5"] = {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": [
            "2",
            1
          ],
          "text": negativePrompt
        },
        "title": "负向提示词"
      };
      
      workflow["6"] = {
        "class_type": "KSampler",
        "inputs": {
          "cfg": 5.0,
          "denoise": isLowQualityPreview ? 0.8 : 0.9,
          "latent_image": [
            "3",
            0
          ],
          "model": [
            "2",
            0
          ],
          "negative": [
            "5",
            0
          ],
          "positive": [
            "4",
            0
          ],
          "sampler_name": isLowQualityPreview ? "euler_ancestral" : "dpmpp_2m",
          "scheduler": "karras",
          "seed": Math.floor(Math.random() * 2**32),
          "steps": isLowQualityPreview ? 10 : 20
        },
        "title": "采样器"
      };
      
      workflow["7"] = {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": [
            "6",
            0
          ],
          "vae": [
            "2",
            2
          ]
        },
        "title": "解码生成图像"
      };
      
      workflow["8"] = {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "p5_realtime",
          "images": [
            "7",
            0
          ]
        },
        "title": "保存结果图像"
      };
    }

    // 为更好调试，打印出完整的工作流
    console.log('完整工作流:', JSON.stringify(workflow, null, 2));
    console.log('使用的图像名称:', imageName, '请求版本:', requestVersion);
    console.log('使用模型:', modelName, '提示词:', prompt, '负向提示词:', negativePrompt, 'Lora:', loraName);
    
    // 构建请求数据
    const promptData = {
      prompt: workflow,
      client_id: clientId
    };
    
    // 发送POST请求
    fetch(promptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promptData)
    })
    .then(response => {
      if (!response.ok) {
        // 获取响应内容以便更好地理解错误
        return response.text().then(text => {
          console.error('ComfyUI API响应内容:', text);
          throw new Error(`HTTP错误! 状态: ${response.status}`);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log('绘图任务已发送:', data);
      
      // 再次检查版本是否有效
      if (requestVersion < currentRequestVersion) {
        console.log(`忽略旧版本(${requestVersion})的绘图任务ID，当前版本为${currentRequestVersion}`);
        isProcessingQueue = false;
        
        // 继续处理队列中其他请求
        if (requestQueue.length > 0) {
          setTimeout(processQueue, 100);
        }
        return;
      }
      
      promptId = data.prompt_id;
      latestProcessedVersion = requestVersion; // 记录最新处理的版本
      statusText = '正在处理图像...';
      updateStatusText();
    })
    .catch(error => {
      console.error('发送绘图任务失败:', error);
      statusText = `发送绘图任务失败: ${error.message}`;
      updateStatusText();
      processingImage = false;
      isProcessingQueue = false;
      
      // 继续处理队列中其他请求
      if (requestQueue.length > 0) {
        setTimeout(processQueue, 100);
      }
    });
  }
  
  // 从ComfyUI获取处理结果
  function getResultFromComfyUI(promptId) {
    // 构建正确的历史记录URL
    let historyUrl = '';
    try {
      // 解析WebSocket URL
      const wsUrl = new URL(serverAddress);
      // 构建HTTP URL
      historyUrl = `http${wsUrl.protocol === 'wss:' ? 's' : ''}://${wsUrl.host}/history/${promptId}`;
      console.log('历史记录URL:', historyUrl);
    } catch (e) {
      console.error('构建历史记录URL失败:', e);
      statusText = '构建历史记录URL失败';
      updateStatusText();
      processingImage = false;
      isProcessingQueue = false;
      
      // 继续处理队列中其他请求
      if (requestQueue.length > 0) {
        setTimeout(processQueue, 100);
      }
      return;
    }

    // 获取任务历史记录
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
        console.log(`忽略已过时的结果，版本 ${latestProcessedVersion} < ${currentRequestVersion}`);
        processingImage = false;
        isProcessingQueue = false;
        
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
          let imageUrl = '';
          try {
            const wsUrl = new URL(serverAddress);
            imageUrl = `http${wsUrl.protocol === 'wss:' ? 's' : ''}://${wsUrl.host}/view?filename=${imageData.filename}&type=${imageData.type}&subfolder=${imageData.subfolder || ''}`;
            console.log('图像URL:', imageUrl);
          } catch (e) {
            console.error('构建图像URL失败:', e);
            statusText = '构建图像URL失败';
            updateStatusText();
            processingImage = false;
            isProcessingQueue = false;
            
            // 继续处理队列中其他请求
            if (requestQueue.length > 0) {
              setTimeout(processQueue, 100);
            }
            return;
          }
          
          // 加载图像
          loadImageFromUrl(imageUrl);
          break;
        }
      }
    })
    .catch(error => {
      console.error('获取结果失败:', error);
      statusText = `获取结果失败: ${error.message}`;
      updateStatusText();
      processingImage = false;
      isProcessingQueue = false;
      
      // 继续处理队列中其他请求
      if (requestQueue.length > 0) {
        setTimeout(processQueue, 100);
      }
    });
  }
  
  // 从URL加载图像
  function loadImageFromUrl(url) {
    p.loadImage(url, img => {
      processedImage = img;
      resultCanvas.clear();
      resultCanvas.image(img, 0, 0, 512, 512);
      statusText = '已接收AI生成图像';
      updateStatusText();
      processingImage = false;
      isProcessingQueue = false;
      
      // 继续处理队列中其他请求
      if (requestQueue.length > 0) {
        setTimeout(processQueue, 100);
      }
    }, 
    () => {
      console.error('加载图像失败');
      statusText = '加载图像失败';
      updateStatusText();
      processingImage = false;
      isProcessingQueue = false;
      
      // 继续处理队列中其他请求
      if (requestQueue.length > 0) {
        setTimeout(processQueue, 100);
      }
    });
  }
  
  // 鼠标按下事件
  p.mousePressed = function() {
    // 检查鼠标是否在绘画画布区域内
    if (p.mouseX >= drawCanvasPos.x && p.mouseX < drawCanvasPos.x + drawCanvasSize && 
        p.mouseY >= drawCanvasPos.y && p.mouseY < drawCanvasPos.y + drawCanvasSize) {
      isDrawing = true;
      
      // 在绘画开始前保存当前状态
      saveToHistory();
      
      // 在绘画画布上绘制点
      // 需要将小画布坐标转换为512的原始画布坐标
      const scaleRatio = 512 / drawCanvasSize;
      const localX = (p.mouseX - drawCanvasPos.x) * scaleRatio;
      const localY = (p.mouseY - drawCanvasPos.y) * scaleRatio;
      
      drawCanvas.stroke(strokeColor);
      drawCanvas.strokeWeight(strokeWidth);
      drawCanvas.point(localX, localY);
    }
  };
  
  // 鼠标拖动事件
  p.mouseDragged = function() {
    if (isDrawing) {
      // 计算相对于绘画画布的坐标
      // 需要将小画布坐标转换为512的原始画布坐标
      const scaleRatio = 512 / drawCanvasSize;
      const localX = (p.mouseX - drawCanvasPos.x) * scaleRatio;
      const localY = (p.mouseY - drawCanvasPos.y) * scaleRatio;
      const prevLocalX = (p.pmouseX - drawCanvasPos.x) * scaleRatio;
      const prevLocalY = (p.pmouseY - drawCanvasPos.y) * scaleRatio;
      
      // 在绘画画布上绘制线条
      drawCanvas.stroke(strokeColor);
      drawCanvas.strokeWeight(strokeWidth);
      drawCanvas.line(prevLocalX, prevLocalY, localX, localY);
      
      // 检查是否需要自动发送
      const currentTime = Date.now();
      if (isAutoSend && currentTime - lastSendTime > sendInterval) {
        lastSendTime = currentTime;
        
        // 仅在拖动过程中使用低质量预览
        isLowQualityPreview = true;
        captureAndSendCanvas();
      }
    }
  };
  
  // 鼠标释放事件
  p.mouseReleased = function() {
    if (isDrawing) {
      isDrawing = false;
      
      // 每次绘画结束后发送
      if (isAutoSend) {
        lastSendTime = Date.now();
        
        // 先发送低质量预览
        isLowQualityPreview = true;
        captureAndSendCanvas();
        
        // 延迟500ms后再发送高质量结果（如果设置为自动发送）
        setTimeout(() => {
          if (isAutoSend && !isDrawing) {  // 确保用户没有再次开始绘画
            isLowQualityPreview = false;
            captureAndSendCanvas();
          }
        }, 1500);
      }
    }
  };
  
  p.draw = function() {
    // 更新颜色和笔触粗细
    strokeColor = colorPicker.color().levels.slice(0, 3);
    strokeWidth = strokeSlider.value();
    
    // 清空背景
    p.background(240);
    
    // 创建网格背景
    drawCheckeredBackground();
    
    // 确保画布位置是最新的
    updateCanvasPositions();
    
    // 铺满屏幕显示结果画布
    if (processedImage) {
      // 计算保持比例的缩放大小
      const imgRatio = 1; // 假设是512/512=1的正方形
      const screenRatio = p.width / p.height;
      
      let renderWidth, renderHeight;
      
      if (screenRatio > imgRatio) {
        // 屏幕较宽，高度铺满
        renderHeight = p.height;
        renderWidth = renderHeight * imgRatio;
      } else {
        // 屏幕较高，宽度铺满
        renderWidth = p.width;
        renderHeight = renderWidth / imgRatio;
      }
      
      // 居中显示
      const x = (p.width - renderWidth) / 2;
      const y = (p.height - renderHeight) / 2;
      
      // 绘制结果
      p.image(resultCanvas, x, y, renderWidth, renderHeight);
    } else {
      // 没有结果时显示网格背景
      p.fill(100);
      p.textSize(24);
      p.textAlign(p.CENTER, p.CENTER);
      p.text("等待生成结果...", p.width/2, p.height/2);
    }
    
    // 绘制绘画画布（小尺寸，左下角）
    p.image(drawCanvas, drawCanvasPos.x, drawCanvasPos.y, drawCanvasSize, drawCanvasSize);
    
    // 绘制画布边框
    p.stroke(0);
    p.strokeWeight(2);
    p.noFill();
    p.rect(drawCanvasPos.x, drawCanvasPos.y, drawCanvasSize, drawCanvasSize);
    
    // 如果正在处理图像，显示进度条（在屏幕底部）
    if (processingImage) {
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
    
    // 在绘画画布上方显示一些提示信息
    p.fill(0);
    p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    p.text("绘画区域", drawCanvasPos.x + drawCanvasSize/2, drawCanvasPos.y - 20);
    
    // 绘制连接状态指示器
    p.fill(isConnected ? p.color(0, 255, 0) : p.color(255, 0, 0));
    p.noStroke();
    p.ellipse(p.width - 30, 30, 20, 20);
  };
  
  // 绘制网格背景
  function drawCheckeredBackground() {
    const size = 20;
    p.noStroke();
    
    for (let y = 0; y < p.height; y += size) {
      for (let x = 0; x < p.width; x += size) {
        if ((x / size + y / size) % 2 === 0) {
          p.fill(225);
        } else {
          p.fill(210);
        }
        p.rect(x, y, size, size);
      }
    }
  }
  
  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    updateCanvasPositions(); // 窗口大小改变时更新画布位置
  };
  
  p.get = function() {
    // 返回合成后的图像
    const combined = p.createGraphics(512, 512);
    combined.image(resultCanvas, 0, 0);
    combined.image(drawCanvas, 0, 0);
    return combined;
  };
  
  p.clear = function() {
    saveToHistory(); // 保存当前状态到历史记录
    drawCanvas.background(255);
    resultCanvas.background(255);
    capturedImage = null;
    processedImage = null;
  };
  
  p.saveCanvas = function(name, type) {
    // 创建合成画布
    const combined = p.createGraphics(512, 512);
    combined.image(resultCanvas, 0, 0);
    combined.image(drawCanvas, 0, 0);
    p.saveCanvas(combined, name || 'AI绘画作品', type || 'png');
  };
  
  // 清理函数，关闭WebSocket连接
  p.remove = function() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    // 调用p5实例的原始remove方法
    p._remove();
  };
} 