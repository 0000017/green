// P5.js主控制文件
// 管理多个P5功能的加载和切换

// 全局状态变量，用于共享背景模式信息
window.p5State = {
  currentBackgroundMode: 'none',  // 默认为无背景模式
  cameraType: 'normal' // 默认为普通摄像头模式
};

let currentSketch = null;      // 当前活动的P5实例
let savedCanvas = null;        // 保存的画布内容
let isDrawMode = true;         // 默认为绘画模式
window.isInitialized = false;  // 初始化标志，暴露到全局作用域

// 分层系统变量
let backgroundCanvas = null;   // 背景层画布实例
let drawingCanvas = null;      // 绘画层画布实例
let currentBackgroundMode = 'none';  // 当前背景模式
let currentCameraType = 'normal';   // 当前相机类型，默认普通摄像头

// 初始化P5绘画工具
function initP5Drawing() {
  if (window.isInitialized) return;
  
  console.log("初始化P5绘画工具");
  
  // 确保全局状态正确初始化
  window.p5State = {
    currentBackgroundMode: 'none',  // 默认无背景模式
    cameraType: 'normal' // 默认为普通摄像头模式
  };
  
  // 重置当前背景模式
  currentBackgroundMode = 'none';
  currentCameraType = 'normal';
  
  // 获取主应用内容容器，如果找不到则使用body
  const appContainer = document.getElementById('main-app-content') || document.body;
  
  // 创建控制面板 - 修改为左下角竖排布局
  const controlPanel = document.createElement('div');
  controlPanel.id = 'p5-control-panel';
  controlPanel.className = 'p5-control-panel';
  controlPanel.innerHTML = `
    <div class="panel-section" id="background-section">
      <h3>背景模式</h3>
      <button id="btn-bg-none" class="active"><span class="btn-icon">☐</span>无背景</button>
      <button id="btn-bg-emotion"><span class="btn-icon">😊</span>情感背景</button>
      <button id="btn-bg-camera"><span class="btn-icon">📷</span>摄像头背景</button>
      <button id="btn-bg-ai"><span class="btn-icon">🤖</span>AI背景</button>
    </div>
    
    <div class="panel-section" id="operations-section">
      <h3>操作</h3>
      <button id="btn-clear-drawing"><span class="btn-icon">🧹</span>清除绘画</button>
      <button id="btn-clear-all"><span class="btn-icon">🗑️</span>清除全部</button>
      <button id="btn-save"><span class="btn-icon">💾</span>保存作品</button>
    </div>
  `;
  appContainer.appendChild(controlPanel);
  
  // 创建相机设置弹出面板
  const cameraSettings = document.createElement('div');
  cameraSettings.id = 'camera-settings';
  cameraSettings.className = 'popup-settings';
  cameraSettings.innerHTML = `
    <h3>摄像头类型</h3>
    <button id="btn-camera-normal" class="active">原始摄像头</button>
    <button id="btn-camera-vintage">老相机</button>
    <button id="btn-camera-green">绿色摄像头</button>
  `;
  
  // 将相机设置添加到相机按钮下
  const cameraBtn = document.getElementById('btn-bg-camera');
  if (cameraBtn) {
    cameraBtn.appendChild(cameraSettings);
  }
  
  // 创建老相机控制面板 - 弹出式面板
  const vintageCameraControls = document.createElement('div');
  vintageCameraControls.id = 'vintage-camera-controls';
  vintageCameraControls.className = 'camera-popup-panel';
  vintageCameraControls.style.display = 'none';
  vintageCameraControls.innerHTML = `
    <div class="panel-header">
      <h3>老相机控制</h3>
      <span class="close-btn" id="vintage-close-btn">×</span>
    </div>
    <div class="panel-content">
      <button id="btn-camera-take-photo" class="camera-control-btn primary-btn">开始拍照</button>
      <div id="camera-countdown" class="camera-countdown"></div>
    </div>
  `;
  
  // 将老相机控制面板添加到相机按钮旁边
  cameraBtn.appendChild(vintageCameraControls);
  
  // 创建绿色摄像头控制面板 - 弹出式面板
  const greenCameraControls = document.createElement('div');
  greenCameraControls.id = 'green-camera-controls';
  greenCameraControls.className = 'camera-popup-panel';
  greenCameraControls.style.display = 'none';
  greenCameraControls.innerHTML = `
    <div class="panel-header">
      <h3>绿色摄像头控制</h3>
      <span class="close-btn" id="green-close-btn">×</span>
    </div>
    <div class="panel-content">
      <div class="control-row">
        <label for="green-color-picker">检测颜色:</label>
        <input type="color" id="green-color-picker" value="#FF0000">
      </div>
      <div class="control-row">
        <label>粒子风格:</label>
        <div class="particle-style-buttons">
          <button id="btn-style-classic" class="style-btn active">经典粒子</button>
          <button id="btn-style-poisson" class="style-btn">泊松线条</button>
        </div>
      </div>
      <button id="btn-green-apply" class="camera-control-btn primary-btn">应用设置</button>
      <button id="btn-green-clear-particles" class="camera-control-btn secondary-btn">清空粒子</button>
    </div>
  `;
  
  // 将绿色摄像头控制面板添加到相机按钮旁边
  cameraBtn.appendChild(greenCameraControls);
  
  // 添加粒子风格按钮的样式
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .particle-style-buttons {
      display: flex;
      gap: 5px;
      margin-top: 5px;
    }
    .style-btn {
      flex: 1;
      padding: 5px;
      background-color: rgba(80, 80, 80, 0.5);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .style-btn:hover {
      background-color: rgba(100, 100, 100, 0.8);
    }
    .style-btn.active {
      background-color: rgba(0, 153, 255, 0.7);
      font-weight: bold;
    }
  `;
  document.head.appendChild(styleElement);
  
  // 添加对应功能的点击事件
  document.getElementById('btn-bg-none').addEventListener('click', () => setBackgroundMode('none'));
  document.getElementById('btn-bg-emotion').addEventListener('click', (e) => {
    // 阻止事件冒泡
    e.stopPropagation();
    
    // 切换active类和弹出设置
    togglePopupSettings('btn-bg-emotion');
    
    // 设置背景模式为emotion
    if(currentBackgroundMode !== 'emotion') {
      setBackgroundMode('emotion');
    }
  });
  document.getElementById('btn-bg-camera').addEventListener('click', (e) => {
    // 阻止事件冒泡
    e.stopPropagation();
    
    // 切换active类和弹出设置
    togglePopupSettings('btn-bg-camera');
    
    // 设置背景模式为camera，但不自动触发拍照
    if(currentBackgroundMode !== 'camera') {
        setBackgroundMode('camera');
      
      // 确保正确高亮显示当前选中的摄像头类型按钮
      updateCameraTypeButtons(currentCameraType);
    }
  });
  document.getElementById('btn-bg-ai').addEventListener('click', () => setBackgroundMode('ai'));
  
  // 摄像头类型切换事件
  document.getElementById('btn-camera-normal').addEventListener('click', (e) => {
    e.stopPropagation();
    setCameraType('normal');
    hideAllCameraControls();
  });
  document.getElementById('btn-camera-vintage').addEventListener('click', (e) => {
    e.stopPropagation();
    setCameraType('vintage');
    toggleCameraControls('vintage-camera-controls');
  });
  document.getElementById('btn-camera-green').addEventListener('click', (e) => {
    e.stopPropagation();
    setCameraType('green');
    toggleCameraControls('green-camera-controls');
  });
  
  // 添加关闭按钮事件
  document.getElementById('vintage-close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('vintage-camera-controls').style.display = 'none';
  });
  
  document.getElementById('green-close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('green-camera-controls').style.display = 'none';
  });
  
  // 添加老相机控制事件
  document.getElementById('btn-camera-take-photo').addEventListener('click', (e) => {
    e.stopPropagation();
    takeVintagePhoto();
  });
  
  // 添加绿色摄像头控制事件
  // 初始化绿色摄像头设置
  initGreenCameraSettings();
  
  // 添加操作事件
  document.getElementById('btn-clear-drawing').addEventListener('click', () => clearDrawingLayer());
  document.getElementById('btn-clear-all').addEventListener('click', () => clearAllLayers());
  document.getElementById('btn-save').addEventListener('click', () => saveCanvas());
  
  // 为文档添加点击事件，用于关闭所有弹出设置
  document.addEventListener('click', function(event) {
    // 如果点击的不是按钮或弹出设置，关闭所有弹出设置
    if (!event.target.closest('.popup-settings') && !event.target.closest('button')) {
      closeAllPopupSettings();
      hideAllCameraControls();
    }
  });
  
  // 初始化绘画层
  initDrawingLayer();
  
  // 创建情感背景设置弹出面板 - 移除"打开控制面板"按钮
  const emotionSettings = document.createElement('div');
  emotionSettings.id = 'emotion-settings';
  emotionSettings.className = 'popup-settings';
  emotionSettings.innerHTML = `
    <h3>情感背景设置</h3>
  `;
  
  // 将情感设置添加到情感背景按钮下
  const emotionBtn = document.getElementById('btn-bg-emotion');
  if (emotionBtn) {
    emotionBtn.appendChild(emotionSettings);
    
    // 直接修改情感背景按钮的点击事件
    emotionBtn.removeEventListener('click', (e) => {
      e.stopPropagation();
      togglePopupSettings('btn-bg-emotion');
      if(currentBackgroundMode !== 'emotion') {
        setBackgroundMode('emotion');
      }
    });
    
    emotionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setBackgroundMode('emotion');
      toggleEmotionSettings(true); // 强制显示情感设置面板
    });
  }
  
  // 创建情感背景控制面板 - 弹出式面板
  const emotionControlPanel = document.createElement('div');
  emotionControlPanel.id = 'emotion-control-panel';
  emotionControlPanel.className = 'camera-popup-panel';
  emotionControlPanel.style.display = 'none';
  emotionControlPanel.innerHTML = `
    <div class="panel-header">
      <h3>情感背景控制</h3>
      <span class="close-btn" id="emotion-close-btn">×</span>
    </div>
    <div class="panel-content" id="emotion-panel-content">
      <div class="control-row">
        <label for="emotion-cols">方块列数:</label>
        <input type="range" id="emotion-cols" min="1" max="10" value="5" step="1">
        <span id="emotion-cols-value">5</span>
      </div>
      <div class="control-row">
        <label for="emotion-rows">方块行数:</label>
        <input type="range" id="emotion-rows" min="1" max="10" value="5" step="1">
        <span id="emotion-rows-value">5</span>
      </div>
      <div class="control-row">
        <label for="emotion-fill-probability">颜色填充概率:</label>
        <input type="range" id="emotion-fill-probability" min="0" max="1" value="0.5" step="0.01">
        <span id="emotion-fill-probability-value">0.5</span>
      </div>
      <div class="control-row">
        <label for="emotion-step-num">细分数量:</label>
        <input type="range" id="emotion-step-num" min="3" max="20" value="10" step="1">
        <span id="emotion-step-num-value">10</span>
      </div>
      <div class="control-row">
        <label for="emotion-hatch-probability">网格填充概率:</label>
        <input type="range" id="emotion-hatch-probability" min="0" max="1" value="0.2" step="0.01">
        <span id="emotion-hatch-probability-value">0.2</span>
      </div>
      <div class="control-row">
        <label for="emotion-hand-drawn">手绘强度:</label>
        <input type="range" id="emotion-hand-drawn" min="0" max="3" value="1" step="0.1">
        <span id="emotion-hand-drawn-value">1</span>
      </div>
      <div class="control-row">
        <label>颜色主题:</label>
        <select id="emotion-palette">
          <option value="0">经典</option>
          <option value="1">灰度</option>
          <option value="2">柔和</option>
          <option value="3">明亮</option>
          <option value="4">对比</option>
        </select>
      </div>
      <button id="btn-emotion-randomize" class="camera-control-btn primary-btn">随机化</button>
      <button id="btn-emotion-test" class="camera-control-btn secondary-btn" style="margin-top:8px">测试绘制</button>
    </div>
  `;
  
  // 将情感控制面板添加到文档中，不再附加到按钮上
  document.body.appendChild(emotionControlPanel);
  
  // 添加情感控制面板关闭按钮事件
  document.getElementById('emotion-close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('emotion-control-panel').style.display = 'none';
  });
  
  // 删除原有的情感控制面板按钮事件
  // document.getElementById('btn-emotion-settings-show').addEventListener('click', (e) => {
  //   e.stopPropagation();
  //   toggleEmotionControls();
  // });
  
  // 创建AI背景设置弹出面板 - 直接包含所有AI控制内容
  const aiSettings = document.createElement('div');
  aiSettings.id = 'ai-settings';
  aiSettings.className = 'popup-settings';
  aiSettings.style.display = 'none';
  aiSettings.innerHTML = `
    <div class="panel-header">
      <h3>AI背景控制</h3>
      <span class="close-btn" id="ai-close-btn">×</span>
    </div>
    <div class="panel-content" id="ai-panel-content">
      <div class="control-row">
        <label>Lora模型:</label>
        <select id="ai-lora-model" class="ai-select">
          <option value="0">虚焦梦核 _ 柔光春核 _ 夏核</option>
          <option value="1">治愈风情绪感壁纸插画</option>
          <option value="2">治愈系插画-彩铅画</option>
          <option value="3">超现实主义插画 _ 造梦大师</option>
        </select>
      </div>
      
      <div class="control-row">
        <label>提示词类型:</label>
        <div class="prompt-type-buttons">
          <button id="btn-use-default-prompt" class="style-btn active">默认提示词</button>
          <button id="btn-use-custom-prompt" class="style-btn">自定义提示词</button>
        </div>
      </div>
      
      <div id="default-prompt-container" class="control-row">
        <label>默认提示词:</label>
        <div id="default-prompt-display" class="prompt-display">
          选择Lora模型查看默认提示词
        </div>
      </div>
      
      <div id="custom-prompt-container" class="control-row" style="display:none;">
        <label for="ai-custom-prompt">自定义提示词:</label>
        <textarea id="ai-custom-prompt" rows="4" placeholder="输入你的提示词，会自动添加必要的关键词"></textarea>
        <div id="trigger-word-display" class="trigger-word">
          触发关键词: <span id="trigger-word-text">soft focus</span>
        </div>
      </div>
      
      <div class="control-row">
        <label for="ai-seed">随机种子:</label>
        <input type="number" id="ai-seed" min="0" max="2147483647" value="123456789">
        <button id="btn-random-seed" class="mini-btn">随机</button>
      </div>
      
      <button id="btn-generate-image" class="camera-control-btn primary-btn">生成图像</button>
      <div id="comfyui-status" class="status-text">ComfyUI状态: 未连接</div>
    </div>
  `;
  
  // 将AI设置添加到文档中，不再向按钮添加子元素
  document.body.appendChild(aiSettings);
  
  // 修改AI背景按钮点击事件，直接切换AI设置面板的显示状态
  const aiBtn = document.getElementById('btn-bg-ai');
  if (aiBtn) {
    // 移除旧的事件监听器
    aiBtn.removeEventListener('click', () => setBackgroundMode('ai'));
    
    // 添加新的事件监听器
    aiBtn.addEventListener('click', () => {
      setBackgroundMode('ai');
      toggleAISettings(true); // 强制显示设置面板
    });
  }
  
  // 添加关闭按钮事件
  document.getElementById('ai-close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('ai-settings').style.display = 'none';
  });
  
  // 切换情感设置面板
  function toggleEmotionSettings(forceShow = false) {
    const settingsPanel = document.getElementById('emotion-control-panel');
    const controlPanelContainer = document.getElementById('p5-control-panel');
    
    if (settingsPanel && controlPanelContainer) {
      console.log('切换情感设置面板，当前显示状态:', settingsPanel.style.display);
      
      // 如果传入forceShow=true，强制显示面板
      const newDisplay = forceShow ? 'block' : 
                        (settingsPanel.style.display === 'none' ? 'block' : 'none');
      settingsPanel.style.display = newDisplay;
      console.log('情感设置面板新显示状态:', newDisplay);
      
      // 如果是打开面板，则初始化控件并确保面板位置正确
      if (newDisplay === 'block') {
        console.log('打开情感设置面板，重置位置和初始化控件');
        
        // 获取整个控制面板容器的位置信息
        const containerRect = controlPanelContainer.getBoundingClientRect();
        
        // 重置面板位置，使其靠右显示且底部与整个控制面板容器底部对齐
        settingsPanel.style.position = 'fixed';
        settingsPanel.style.left = (containerRect.right + 20) + 'px'; // 控制面板右侧+20px的位置，增加间隙
        settingsPanel.style.bottom = (window.innerHeight - containerRect.bottom) + 'px'; // 与整个控制面板底部对齐
        settingsPanel.style.top = 'auto'; // 清除top设置，使bottom生效
        settingsPanel.style.maxHeight = '90vh';
        settingsPanel.style.zIndex = '1500'; // 确保在最上层
        settingsPanel.style.overflow = 'auto';
        
        // 确保面板可见性
        settingsPanel.style.visibility = 'visible';
        settingsPanel.style.opacity = '1';
      }
    } else {
      console.error('未找到情感设置面板元素或控制面板容器');
    }
  }
  
  // 在初始化完成后添加情感控制事件
  function initEmotionControls() {
    // 初始化window.EmotionConfig全局对象，用于和emotionSketch通信
    window.EmotionConfig = {
      cols: 5,
      rows: 5,
      colorFillProbability: 0.5,
      stepNum: 10,
      paletteIndex: 0,
      hatchProbability: 0.2,
      horizontalHatchProbability: 0.5,
      handDrawnIntensity: 1,
      circlePatternProbability: 0.3,
      wavyLinePatternProbability: 0.3,
      polkaDotPatternProbability: 0.3,
      backgroundGradientStart: '#ffffff',
      backgroundGradientEnd: '#e0e0e0'
    };
    
    // 为所有滑块添加事件监听器
    document.getElementById('emotion-cols').addEventListener('input', function() {
      const value = parseInt(this.value);
      document.getElementById('emotion-cols-value').textContent = value;
      window.EmotionConfig.cols = value;
      updateEmotionCanvas();
    });
    
    document.getElementById('emotion-rows').addEventListener('input', function() {
      const value = parseInt(this.value);
      document.getElementById('emotion-rows-value').textContent = value;
      window.EmotionConfig.rows = value;
      updateEmotionCanvas();
    });
    
    document.getElementById('emotion-fill-probability').addEventListener('input', function() {
      const value = parseFloat(this.value);
      document.getElementById('emotion-fill-probability-value').textContent = value.toFixed(2);
      window.EmotionConfig.colorFillProbability = value;
      updateEmotionCanvas();
    });
    
    document.getElementById('emotion-step-num').addEventListener('input', function() {
      const value = parseInt(this.value);
      document.getElementById('emotion-step-num-value').textContent = value;
      window.EmotionConfig.stepNum = value;
      updateEmotionCanvas();
    });
    
    document.getElementById('emotion-hatch-probability').addEventListener('input', function() {
      const value = parseFloat(this.value);
      document.getElementById('emotion-hatch-probability-value').textContent = value.toFixed(2);
      window.EmotionConfig.hatchProbability = value;
      updateEmotionCanvas();
    });
    
    document.getElementById('emotion-hand-drawn').addEventListener('input', function() {
      const value = parseFloat(this.value);
      document.getElementById('emotion-hand-drawn-value').textContent = value.toFixed(1);
      window.EmotionConfig.handDrawnIntensity = value;
      updateEmotionCanvas();
    });
    
    document.getElementById('emotion-palette').addEventListener('change', function() {
      const value = parseInt(this.value);
      window.EmotionConfig.paletteIndex = value;
      updateEmotionCanvas();
    });
    
    document.getElementById('btn-emotion-randomize').addEventListener('click', function(e) {
      e.stopPropagation();
      randomizeEmotionSettings();
    });
    
    // 添加测试按钮事件
    document.getElementById('btn-emotion-test').addEventListener('click', function(e) {
      e.stopPropagation();
      
      // 测试直接重新初始化情感背景
      console.log('测试按钮点击，尝试强制重绘情感背景');
      if (currentBackgroundMode === 'emotion') {
        initBackgroundLayer('emotion');
      } else {
        // 如果当前不是情感背景模式，先切换
        console.log('当前不是情感背景模式，先切换');
        setBackgroundMode('emotion');
      }
      
      // 重新创建后等待一点时间再应用设置
      setTimeout(() => {
        updateEmotionCanvas();
      }, 300);
    });
  }
  
  // 随机化情感设置
  function randomizeEmotionSettings() {
    // 生成随机设置
    const config = window.EmotionConfig;
    config.cols = Math.floor(Math.random() * 9) + 1;
    config.rows = Math.floor(Math.random() * 9) + 1;
    config.colorFillProbability = Math.random();
    config.stepNum = Math.floor(Math.random() * 17) + 3;
    config.paletteIndex = Math.floor(Math.random() * 5);
    config.hatchProbability = Math.random();
    config.horizontalHatchProbability = Math.random();
    config.handDrawnIntensity = Math.random() * 3;
    
    // 更新UI
    document.getElementById('emotion-cols').value = config.cols;
    document.getElementById('emotion-cols-value').textContent = config.cols;
    
    document.getElementById('emotion-rows').value = config.rows;
    document.getElementById('emotion-rows-value').textContent = config.rows;
    
    document.getElementById('emotion-fill-probability').value = config.colorFillProbability;
    document.getElementById('emotion-fill-probability-value').textContent = config.colorFillProbability.toFixed(2);
    
    document.getElementById('emotion-step-num').value = config.stepNum;
    document.getElementById('emotion-step-num-value').textContent = config.stepNum;
    
    document.getElementById('emotion-hatch-probability').value = config.hatchProbability;
    document.getElementById('emotion-hatch-probability-value').textContent = config.hatchProbability.toFixed(2);
    
    document.getElementById('emotion-hand-drawn').value = config.handDrawnIntensity;
    document.getElementById('emotion-hand-drawn-value').textContent = config.handDrawnIntensity.toFixed(1);
    
    document.getElementById('emotion-palette').value = config.paletteIndex;
    
    // 更新画布
    updateEmotionCanvas();
  }
  
  // 更新情感画布
  function updateEmotionCanvas() {
    console.log('尝试更新情感画布，当前背景画布:', backgroundCanvas ? '存在' : '不存在', 
               '方法存在:', backgroundCanvas && typeof backgroundCanvas.updateSettings === 'function');
    
    if (backgroundCanvas && typeof backgroundCanvas.updateSettings === 'function') {
      console.log('更新情感画布设置:', window.EmotionConfig);
      try {
        const result = backgroundCanvas.updateSettings(window.EmotionConfig);
        console.log('更新结果:', result ? '成功' : '失败');
      } catch (e) {
        console.error('更新情感画布时出错:', e);
      }
    } else if (currentBackgroundMode === 'emotion') {
      // 如果当前是情感模式但updateSettings不存在，重新初始化背景
      console.log('找不到updateSettings方法，尝试重新初始化情感背景');
      initBackgroundLayer('emotion');
    }
  }
  
  // 在初始化完成后添加情感控制事件
  initEmotionControls();
  
  // 初始化 AI 控制事件
  initAIControls();
  
  window.isInitialized = true;
}

// 初始化绿色摄像头设置并添加事件监听器
function initGreenCameraSettings() {
  console.log('初始化绿色摄像头设置');
  
  // 颜色选择器变化事件
  const colorPicker = document.getElementById('green-color-picker');
  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      e.stopPropagation();
      // 只更新配置，但不立即应用
      updateGreenCameraConfig();
      
      // 临时禁用粒子生成 - 添加此行以禁用当前的粒子生成
      disableGreenCameraGeneration();
    });
    console.log('已添加颜色选择器事件监听器');
  } else {
    console.warn('未找到颜色选择器元素');
  }
  
  // 粒子风格按钮事件 - 使用按钮替代下拉菜单
  const classicBtn = document.getElementById('btn-style-classic');
  const poissonBtn = document.getElementById('btn-style-poisson');
  
  // 默认状态更新
  if (window.GreenCameraConfig && window.GreenCameraConfig.particleStyle === 'poisson') {
    classicBtn.classList.remove('active');
    poissonBtn.classList.add('active');
  } else {
    classicBtn.classList.add('active');
    poissonBtn.classList.remove('active');
  }
  
  // 添加事件监听器
  if (classicBtn && poissonBtn) {
    // 经典粒子按钮
    classicBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // 更新按钮状态
      classicBtn.classList.add('active');
      poissonBtn.classList.remove('active');
      
      // 更新配置但不立即应用
      if (window.GreenCameraConfig) {
        window.GreenCameraConfig.particleStyle = 'classic';
        console.log('已设置粒子风格为: classic（需点击应用按钮生效）');
      }
      
      // 临时禁用粒子生成 - 添加此行以禁用当前的粒子生成
      disableGreenCameraGeneration();
    });
    
    // 泊松线条按钮
    poissonBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // 更新按钮状态
      poissonBtn.classList.add('active');
      classicBtn.classList.remove('active');
      
      // 更新配置但不立即应用
      if (window.GreenCameraConfig) {
        window.GreenCameraConfig.particleStyle = 'poisson';
        console.log('已设置粒子风格为: poisson（需点击应用按钮生效）');
      }
      
      // 临时禁用粒子生成 - 添加此行以禁用当前的粒子生成
      disableGreenCameraGeneration();
    });
    
    console.log('已添加粒子风格按钮事件监听器');
  } else {
    console.warn('未找到粒子风格按钮元素');
  }
  
  // 绿色摄像头应用设置按钮 - 只有点击此按钮才会应用设置
  const applyBtn = document.getElementById('btn-green-apply');
  if (applyBtn) {
    applyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // 确保更新最新配置
      updateGreenCameraConfig();
      // 应用设置
      forceRefreshGreenCamera();
    });
    console.log('已添加应用设置按钮事件监听器');
  }
  
  // 绿色摄像头清空粒子按钮
  const clearBtn = document.getElementById('btn-green-clear-particles');
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearGreenCameraParticles();
    });
    console.log('已添加清空粒子按钮事件监听器');
  }
}

// 禁用绿色摄像头粒子生成
function disableGreenCameraGeneration() {
  // 如果当前正在使用绿色摄像头，临时禁用粒子生成
  if (currentCameraType === 'green' && currentBackgroundMode === 'camera' && backgroundCanvas) {
    // 如果实例有disableGeneration方法，调用它
    if (typeof backgroundCanvas.disableGeneration === 'function') {
      backgroundCanvas.disableGeneration();
      console.log('已临时禁用粒子生成，等待应用设置');
    } else {
      console.warn('绿色摄像头实例没有disableGeneration方法');
    }
  }
}

// 强制刷新绿色摄像头设置
function forceRefreshGreenCamera() {
  console.log('强制刷新绿色摄像头...');
  
  // 不再需要重新获取配置，因为调用此函数前已经更新配置
  // updateGreenCameraConfig();
  
  // 如果当前是绿色摄像头模式，重新初始化背景层
  if (currentCameraType === 'green' && currentBackgroundMode === 'camera') {
    // 清理旧的实例
    if (backgroundCanvas) {
      try {
        backgroundCanvas.remove();
      } catch(e) {
        console.warn('移除背景实例失败:', e);
      }
      backgroundCanvas = null;
    }
    
    // 重新创建绿色摄像头实例
    console.log('重新创建绿色摄像头...');
    setTimeout(() => {
      initBackgroundLayer('camera');
      
      // 确保应用最新设置
      setTimeout(() => {
        if (backgroundCanvas && typeof backgroundCanvas.updateConfig === 'function') {
          console.log('应用设置到新创建的实例...');
          const result = backgroundCanvas.updateConfig(window.GreenCameraConfig);
          console.log('强制刷新完成, 结果:', result ? '成功' : '失败');
          
          // 添加调试信息显示当前风格
          if (backgroundCanvas.config) {
            console.log('当前实例配置:', backgroundCanvas.config);
          }
        } else {
          console.warn('新创建的实例没有updateConfig方法');
        }
      }, 300);
    }, 100);
  } else {
    console.log('当前不是绿色摄像头模式，设置已保存');
  }
}

// 暴露一个用于调试的函数，可以从控制台手动切换粒子风格
window.toggleGreenParticleStyle = function(style) {
  if (!style || (style !== 'classic' && style !== 'poisson')) {
    console.error('无效的粒子风格，必须是 classic 或 poisson');
    return false;
  }
  
  console.log('手动切换粒子风格为:', style);
  
  // 确保配置对象存在
  if (!window.GreenCameraConfig) {
    console.error('GreenCameraConfig不存在');
    return false;
  }
  
  // 更新配置
  window.GreenCameraConfig.particleStyle = style;
  
  // 尝试更新选择器值
  const styleSelect = document.getElementById('green-particle-style');
  if (styleSelect) {
    styleSelect.value = style;
  }
  
  // 强制刷新摄像头
  forceRefreshGreenCamera();
  
  return true;
};

// 切换弹出设置的显示/隐藏
function togglePopupSettings(buttonId) {
  // 先关闭所有弹出设置
  closeAllPopupSettings();
  
  // 打开当前按钮的弹出设置
  const button = document.getElementById(buttonId);
  if (button) {
    button.classList.add('active'); // 使用add而不是toggle，确保总是添加
  }
}

// 关闭所有弹出设置
function closeAllPopupSettings() {
  document.querySelectorAll('.p5-control-panel button').forEach(button => {
    button.classList.remove('active');
  });
}

// 设置背景模式
function setBackgroundMode(mode) {
  // 如果是当前模式，不做任何操作
  if (mode === currentBackgroundMode) return;
  
  console.log("切换背景模式:", mode);
  
  // 更新按钮状态
  updateBackgroundButtons(mode);
  
  // 保存当前背景模式
  currentBackgroundMode = mode;
  
  // 更新全局状态，便于其他模块访问
  window.p5State.currentBackgroundMode = mode;
  
  // 初始化背景层
  initBackgroundLayer(mode);
  
  // 如果绘画层已存在，强制更新其背景
  if (drawingCanvas && typeof drawingCanvas.forceUpdateBackground === 'function') {
    console.log("调用强制更新背景");
    drawingCanvas.forceUpdateBackground(mode);
  } else {
    console.log("绘画层不存在或没有forceUpdateBackground方法");
  }
  
  // 如果是camera模式，保持弹出设置显示
  if (mode === 'camera') {
    const cameraBtn = document.getElementById('btn-bg-camera');
    if (cameraBtn) {
      cameraBtn.classList.add('active');
    }
  } else if (mode === 'emotion') {
    // 如果是emotion模式，保持情感设置弹出
    const emotionBtn = document.getElementById('btn-bg-emotion');
    if (emotionBtn) {
      emotionBtn.classList.add('active');
    }
  } else if (mode === 'ai') {
    // 如果是ai模式，保持AI设置弹出
    const aiBtn = document.getElementById('btn-bg-ai');
    if (aiBtn) {
      aiBtn.classList.add('active');
    }
    // 注意：我们在点击按钮时已经显示了设置面板，这里不需要额外处理
  } else {
    // 否则关闭所有弹出设置
    closeAllPopupSettings();
  }
}

// 设置摄像头类型
function setCameraType(type) {
  if (type === currentCameraType) return;
  
  console.log("切换摄像头类型:", type);
  
  // 更新按钮状态
  updateCameraTypeButtons(type);
  
  // 保存当前摄像头类型
  currentCameraType = type;
  
  // 更新全局状态
  window.p5State.cameraType = type;
  
  // 如果是绿色摄像头类型，显示其控制面板
  if (type === 'green') {
    toggleCameraControls('green-camera-controls');
  }
  
  // 重新初始化背景层
  if (currentBackgroundMode === 'camera') {
    initBackgroundLayer('camera');
    
    // 移除自动应用设置的逻辑，改为提示用户点击应用按钮
    if (type === 'green') {
      console.log('绿色摄像头已准备就绪，请点击"应用设置"按钮开始生成粒子');
    }
  }
}

// 切换相机控制面板显示状态
function toggleCameraControls(controlId) {
  // 隐藏所有控制面板
  hideAllCameraControls();
  
  // 切换指定控制面板
  const controlPanel = document.getElementById(controlId);
  if (controlPanel) {
    controlPanel.style.display = 'block';
  }
}

// 隐藏所有相机控制面板
function hideAllCameraControls() {
  const controlPanels = document.querySelectorAll('.camera-popup-panel');
  controlPanels.forEach(panel => {
    panel.style.display = 'none';
  });
}

// 更新摄像头类型按钮状态
function updateCameraTypeButtons(activeType) {
  console.log("更新摄像头类型按钮状态:", activeType);
  
  // 移除所有相机类型按钮的active类
  document.querySelectorAll('[id^="btn-camera-"]').forEach(btn => {
    if (btn.id !== 'btn-camera-take-photo') { // 排除拍照按钮
      btn.classList.remove('active');
    }
  });
  
  // 为当前活动类型按钮添加active类
  const activeBtn = document.getElementById(`btn-camera-${activeType}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    console.log(`已将按钮 btn-camera-${activeType} 设为active`);
  } else {
    console.warn(`未找到按钮 btn-camera-${activeType}`);
  }
  
  // 更新老相机控制的显示状态
  const vintageCameraControls = document.getElementById('vintage-camera-controls');
  if (vintageCameraControls) {
    vintageCameraControls.style.display = 
      (activeType === 'vintage') ? 'block' : 'none';
  }
}

// 更新背景按钮状态
function updateBackgroundButtons(activeMode) {
  // 移除所有背景按钮的active类
  document.querySelectorAll('[id^="btn-bg-"]').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 为当前活动模式按钮添加active类
  const activeBtn = document.getElementById(`btn-bg-${activeMode}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
}

// 更新倒计时显示
function updateCountdown() {
  if (!backgroundCanvas) return;
  
  const countdownElement = document.getElementById('camera-countdown');
  if (!countdownElement) return;
  
  // 获取相机实例的startTime
  const startTime = backgroundCanvas.startTime || -1;
  
  if (startTime > 0) {
    // 使用performance.now()获取当前时间，与camera.js保持一致
    const now = performance.now();
    // 计算剩余时间（总共20秒）
    const remaining = Math.max(0, startTime + 20*1000 - now);
    const remSecs = Math.ceil(remaining / 1000);
    
    console.log("倒计时检查:", {startTime, now, remaining, remSecs});
    
    if (remaining > 0) {
      // 显示倒计时
      countdownElement.innerHTML = `<span style="color:#ff5722; font-weight:bold">拍摄中</span><br>剩余 ${remSecs} 秒`;
      countdownElement.style.display = 'block';
      countdownElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
      countdownElement.style.padding = '8px';
      
      // 每秒更新一次倒计时
      setTimeout(updateCountdown, 1000);
    } else {
      countdownElement.innerHTML = '<span style="color:#4CAF50; font-weight:bold">拍摄完成</span>';
      countdownElement.style.display = 'block';
      
      // 拍摄完成后3秒隐藏提示
      setTimeout(() => {
        countdownElement.style.display = 'none';
      }, 3000);
    }
  } else {
    countdownElement.style.display = 'none';
  }
}

// 将updateCountdown暴露为全局函数，以便camera.js可以直接调用
window.updateCameraCountdown = updateCountdown;

// 老相机拍照功能
function takeVintagePhoto() {
  // 检查backgroundCanvas是否存在以及是否有mousePressed方法
  if (backgroundCanvas) {
    console.log("触发老相机拍照");
    
    // 如果有mousePressed方法，触发它来开始拍照
    if (typeof backgroundCanvas.mousePressed === 'function') {
      backgroundCanvas.mousePressed();
      
      // 立即启动倒计时显示
      setTimeout(() => {
        // 手动生成一个20秒倒计时，不依赖backgroundCanvas.startTime
        const countdownElement = document.getElementById('camera-countdown');
        if (countdownElement) {
          let remainingSeconds = 20;
          
          const updateDisplay = () => {
            countdownElement.innerHTML = `<span style="color:#ff5722; font-weight:bold">拍摄中</span><br>剩余 ${remainingSeconds} 秒`;
            countdownElement.style.display = 'block';
            countdownElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
            countdownElement.style.padding = '8px';
            
            if (remainingSeconds > 0) {
              remainingSeconds--;
              setTimeout(updateDisplay, 1000);
            } else {
              countdownElement.innerHTML = '<span style="color:#4CAF50; font-weight:bold">拍摄完成</span>';
              setTimeout(() => {
                countdownElement.style.display = 'none';
              }, 3000);
            }
          };
          
          updateDisplay();
        }
      }, 100);
    } else {
      console.error("老相机实例没有mousePressed方法");
    }
  } else {
    console.error("老相机实例不存在");
  }
}

// 初始化背景层
function initBackgroundLayer(mode) {
  // 清除旧的背景实例
  if (backgroundCanvas) {
    try {
      console.log('尝试移除旧背景实例:', mode);
      
      // 安全检查：确保backgroundCanvas是一个有效的p5实例
      if (typeof backgroundCanvas.remove === 'function') {
        backgroundCanvas.remove();
        console.log('旧背景实例移除成功');
      } else {
        console.warn('背景实例没有remove方法，尝试替代清理');
        // 尝试替代清理方法
        if (backgroundCanvas.canvas && backgroundCanvas.canvas.parentElement) {
          backgroundCanvas.canvas.parentElement.removeChild(backgroundCanvas.canvas);
          console.log('已直接移除背景canvas元素');
        }
      }
    } catch(e) {
      console.error('移除背景画布失败:', e);
      // 尝试强制清理
      try {
        if (backgroundCanvas.canvas) {
          if (backgroundCanvas.canvas.parentElement) {
            backgroundCanvas.canvas.parentElement.removeChild(backgroundCanvas.canvas);
          }
        }
      } catch(e2) {
        console.error('强制清理也失败:', e2);
      }
    }
    
    // 重置背景实例引用
    backgroundCanvas = null;
  }
  
  // 创建新的背景实例
  if (mode !== 'none') {
    const backgroundContainer = document.getElementById('background-container');
    
    // 清空容器
    if (backgroundContainer) {
      backgroundContainer.innerHTML = '';
      console.log('已清空背景容器');
    } else {
      console.error('未找到背景容器元素');
      return; // 如果找不到容器，就不要继续尝试创建实例
    }
    
    // 创建新的背景实例
    try {
      console.log('开始创建新背景实例，模式:', mode);
      
      switch(mode) {
        case 'emotion':
          console.log('创建情感背景实例');
          backgroundCanvas = new p5(emotionSketch, 'background-container');
          console.log('情感背景实例创建结果:', backgroundCanvas ? '成功' : '失败');
          // 如果存在EmotionConfig，立即应用设置
          if (window.EmotionConfig && backgroundCanvas && typeof backgroundCanvas.updateSettings === 'function') {
            console.log('应用情感背景初始设置');
            setTimeout(() => {
              backgroundCanvas.updateSettings(window.EmotionConfig);
            }, 100);
          }
          break;
        case 'camera':
          if (currentCameraType === 'normal') {
            // 原始摄像头模式
            backgroundCanvas = new p5(normalCameraSketch, 'background-container');
            console.log('原始摄像头实例创建完成');
          } else if (currentCameraType === 'vintage') {
            // 老相机模式
            if (typeof window.cameraSketch === 'function') {
              backgroundCanvas = new p5(window.cameraSketch, 'background-container');
              console.log('老相机实例创建完成');
            } else {
              console.error('未找到老相机sketch函数');
            }
          } else if (currentCameraType === 'green') {
            // 绿色摄像头模式 - 从camera_g.js加载
            if (typeof window.greenCameraSketch === 'function') {
              backgroundCanvas = new p5(window.greenCameraSketch, 'background-container');
              console.log('绿色摄像头实例创建完成');
            } else {
              console.error('未找到绿色摄像头sketch函数');
            }
          }
          break;
        case 'ai':
          if (typeof window.aiSketch === 'function') {
            backgroundCanvas = new p5(window.aiSketch, 'background-container');
            console.log('AI背景实例创建完成');
          } else {
            console.error('未找到AI实时绘画模块，请先加载ai.js');
            alert('请先加载AI绘画模块');
            // 重置为无背景
            setBackgroundMode('none');
            return;
          }
          break;
        default:
          console.warn('未知的背景模式:', mode);
      }
      
      // 设置背景画布的样式
      if (backgroundCanvas && backgroundCanvas.canvas) {
        backgroundCanvas.canvas.style.position = 'absolute';
        backgroundCanvas.canvas.style.zIndex = '700';
        console.log('背景画布样式设置完成');
      } else {
        console.warn('背景画布创建后无法设置样式，可能创建失败');
      }
    } catch (error) {
      console.error('创建背景实例时出错:', error);
      // 出错时重置为无背景
      backgroundCanvas = null;
      setBackgroundMode('none');
    }
  }
}

// 原始摄像头sketch
function normalCameraSketch(p) {
  let capture;
  
  p.setup = function() {
    p.createCanvas(p.windowWidth, p.windowHeight);
    // 不翻转摄像头
    capture = p.createCapture(p.VIDEO, { flipped: false });
    capture.hide();
  };
  
  p.draw = function() {
    p.background(0);
    
    // 显示视频画面，自动适应窗口大小
    let vidW = capture.width;
    let vidH = capture.height;
    let ratio = Math.min(p.width/vidW, p.height/vidH);
    
    p.imageMode(p.CENTER);
    // 正常显示，不进行翻转
    p.image(
      capture, 
      p.width/2, p.height/2, 
      vidW * ratio, vidH * ratio
    );
  };
  
  // 当P5实例被移除时的清理函数
  p.remove = function() {
    if (capture) {
      capture.stop();
    }
    
    // 修正：使用更安全的方式清理P5实例
    try {
      // 直接清理相关资源
      if (p.canvas) {
        if (p.canvas.parentElement) {
          p.canvas.parentElement.removeChild(p.canvas);
        } else if (p.canvas.remove) {
          // 如果canvas本身有remove方法
          p.canvas.remove();
        }
      }
      
      // 避免调用有问题的noCanvas方法
      // 而是直接标记已移除的状态
      p._setupDone = false;
      
      console.log('摄像头实例移除成功');
    } catch (e) {
      console.error('摄像头实例移除时出错:', e);
    }
  };
}

// 初始化绘画层
function initDrawingLayer() {
  // 清空绘画容器
  const drawingContainer = document.getElementById('drawing-container');
  if (drawingContainer) {
    drawingContainer.innerHTML = '';
  }
  
  // 创建绘画层
  drawingCanvas = new p5(drawSketch, 'drawing-container');
  
  // 设置绘画层画布的样式
  if (drawingCanvas && drawingCanvas.canvas) {
    drawingCanvas.canvas.style.position = 'absolute';
    drawingCanvas.canvas.style.zIndex = '800';
    
    // 启用数位笔支持
    enableStylusSupport(drawingCanvas.canvas);
    
    // 直接强制设置正确的背景模式
    console.log("初始化绘画层，当前背景模式:", currentBackgroundMode);
    if (currentBackgroundMode === 'none') {
      // 无背景模式下设置白色背景
      setTimeout(() => {
        if (drawingCanvas && typeof drawingCanvas.background === 'function') {
          console.log("设置白色背景");
          drawingCanvas.background(255);
          drawingCanvas.redraw();
        }
      }, 100);
    }
  }
}

// 清除绘画层
function clearDrawingLayer() {
  if (drawingCanvas) {
    // 重新初始化绘画层
    initDrawingLayer();
  }
}

// 清除所有层
function clearAllLayers() {
  // 清除背景层
  if (currentBackgroundMode !== 'none') {
    setBackgroundMode('none');
  }
  
  // 清除绘画层
  clearDrawingLayer();
}

// 保存画布内容
function saveCanvas() {
  try {
    // 创建一个临时画布来合并背景和绘画层
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = window.innerWidth;
    tempCanvas.height = window.innerHeight;
    const ctx = tempCanvas.getContext('2d');
    
    // 绘制白色背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // 先绘制背景层
    if (backgroundCanvas && backgroundCanvas.canvas) {
      ctx.drawImage(backgroundCanvas.canvas, 0, 0);
    }
    
    // 再绘制绘画层
    if (drawingCanvas && drawingCanvas.canvas) {
      ctx.drawImage(drawingCanvas.canvas, 0, 0);
    }
    
    // 将合并后的画布转换为图片数据
    const dataURL = tempCanvas.toDataURL('image/png');
    
    // 显示保存选项模态框
    showSaveOptions(dataURL);
    
    console.log('保存选项已准备');
  } catch (e) {
    console.error('准备保存画布失败:', e);
    alert('保存失败: ' + e.message);
  }
}

// 显示保存选项模态框
function showSaveOptions(imageDataURL) {
  // 创建模态框容器
  const modal = document.createElement('div');
  modal.className = 'save-options-modal';
  modal.innerHTML = `
    <div class="save-options-content">
      <span class="save-options-close">&times;</span>
      <h3>保存作品</h3>
      <div class="save-preview">
        <img src="${imageDataURL}" alt="作品预览" />
      </div>
      <div class="save-buttons">
        <button id="btn-save-local" class="save-btn">
          <span class="save-icon">💾</span>保存到本地
        </button>
        <button id="btn-share-qr" class="save-btn">
          <span class="save-icon">📱</span>分享到手机
        </button>
      </div>
    </div>
  `;
  
  // 添加到文档中
  document.body.appendChild(modal);
  
  // 添加样式
  const style = document.createElement('style');
  if (!document.getElementById('save-options-styles')) {
    style.id = 'save-options-styles';
    style.textContent = `
      .save-options-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        backdrop-filter: blur(3px);
      }
      .save-options-content {
        background-color: rgba(20, 31, 20, 0.95);
        padding: 30px;
        border-radius: 20px;
        max-width: 90%;
        width: 450px;
        text-align: center;
        position: relative;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(183, 254, 93, 0.1);
        color: #EEEEEE;
      }
      .save-options-close {
        position: absolute;
        top: 15px;
        right: 15px;
        font-size: 24px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.7);
        transition: all 0.2s;
        width: 25px;
        height: 25px;
        line-height: 22px;
        text-align: center;
        border-radius: 50%;
      }
      .save-options-close:hover {
        color: white;
        background-color: rgba(255, 255, 255, 0.2);
      }
      .save-preview {
        margin: 20px 0;
        border: 1px solid rgba(183, 254, 93, 0.2);
        padding: 15px;
        max-height: 220px;
        overflow: hidden;
        border-radius: 10px;
        background-color: rgba(255, 255, 255, 0.04);
      }
      .save-preview img {
        max-width: 100%;
        max-height: 180px;
        object-fit: contain;
        border-radius: 5px;
      }
      .save-buttons {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 20px;
      }
      .save-btn {
        padding: 12px 15px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        height: 46px;
        background-color: #6EC600;
        color: white;
      }
      .save-btn:hover {
        background-color: #5CB100;
        transform: translateY(-2px);
      }
      .save-icon {
        margin-right: 10px;
        font-size: 20px;
      }
      .save-options-content h3 {
        margin-top: 0;
        color: #B7FE5D;
        font-size: 22px;
      }
      @media (min-width: 768px) {
        .save-buttons {
          flex-direction: row;
          justify-content: center;
        }
        .save-btn {
          min-width: 180px;
          margin: 0 8px;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // 添加按钮事件
  
  // 关闭按钮
  modal.querySelector('.save-options-close').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // 点击背景关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
  
  // 生成更具辨识性的文件名
  function generateFilename() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    // 获取当前背景模式或相机类型作为前缀（如果可用）
    let prefix = "Green作品";
    if (window.currentBackgroundMode) {
      prefix = window.currentBackgroundMode;
    } else if (window.currentCameraType) {
      prefix = window.currentCameraType;
    }
    
    return `${prefix}-${year}${month}${day}-${hours}${minutes}${seconds}.png`;
  }
  
  // 保存到本地按钮
  modal.querySelector('#btn-save-local').addEventListener('click', () => {
    // 使用a标签下载图片
    const link = document.createElement('a');
    link.download = generateFilename();
    link.href = imageDataURL;
    link.click();
    
    // 提示用户保存成功
    alert('作品已保存到您的设备');
    
    // 关闭模态框
    document.body.removeChild(modal);
  });
  
  // 二维码分享按钮
  modal.querySelector('#btn-share-qr').addEventListener('click', () => {
    // 关闭当前模态框
    document.body.removeChild(modal);
    
    // 检查QRShareTool是否可用
    if (window.QRShareTool && typeof window.QRShareTool.shareImageWithQRCode === 'function') {
      // 使用二维码工具分享
      window.QRShareTool.shareImageWithQRCode(imageDataURL, generateFilename());
    } else {
      // 如果QRShareTool不可用，尝试动态加载
      loadQRShareTool()
        .then(() => {
          // 加载成功后使用二维码工具分享
          if (window.QRShareTool && typeof window.QRShareTool.shareImageWithQRCode === 'function') {
            window.QRShareTool.shareImageWithQRCode(imageDataURL, generateFilename());
          } else {
            throw new Error('二维码分享工具加载失败');
          }
        })
        .catch(error => {
          console.error('加载二维码分享工具失败:', error);
          alert('二维码分享功能暂不可用');
        });
    }
  });
}

// 加载二维码分享工具
function loadQRShareTool() {
  return new Promise((resolve, reject) => {
    // 检查是否已加载
    if (window.QRShareTool) {
      resolve();
      return;
    }
    
    // 先加载QR辅助库
    const helperScript = document.createElement('script');
    helperScript.src = 'P5/qr-helper.js';
    helperScript.onload = () => {
      console.log('QR辅助库加载成功');
      
      // 然后加载分享工具
      const shareScript = document.createElement('script');
      shareScript.src = 'P5/qrShare.js';
      shareScript.onload = () => {
        console.log('二维码分享工具加载成功');
        // 等待一点时间确保初始化完成
        setTimeout(resolve, 100);
      };
      shareScript.onerror = () => reject(new Error('加载二维码分享工具失败'));
      document.head.appendChild(shareScript);
    };
    helperScript.onerror = () => {
      console.warn('QR辅助库加载失败，尝试直接加载分享工具');
      
      // 直接加载分享工具
      const shareScript = document.createElement('script');
      shareScript.src = 'P5/qrShare.js';
      shareScript.onload = () => {
        console.log('二维码分享工具加载成功');
        setTimeout(resolve, 100);
      };
      shareScript.onerror = () => reject(new Error('加载二维码分享工具失败'));
      document.head.appendChild(shareScript);
    };
    document.head.appendChild(helperScript);
  });
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
    
    // 启用数位笔压力识别 (解决高漫M6兼容性问题)
    const ctx = canvas.getContext('2d', { desynchronized: true });
    if (ctx && typeof ctx.canvas !== 'undefined') {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    
    console.log('已应用增强型数位笔支持设置');
  } catch (err) {
    console.warn('应用增强型数位笔支持设置时出错:', err);
  }
  
  // 为canvas添加直接的指针事件监听
  canvas.addEventListener('pointerdown', function(e) {
    // 防止默认行为，确保所有指针事件都能被正确捕获
    e.preventDefault();
    
    // 记录数位笔信息
    if (e.pointerType === 'pen') {
      console.log('canvas直接捕获到数位笔输入, 压力值:', e.pressure);
    }
  }, { passive: false });
  
  // 增加指针移动事件监听
  canvas.addEventListener('pointermove', function(e) {
    if (e.pointerType === 'pen' && e.buttons > 0) {
      // 可以在这里记录压力值变化
      if (e.pressure > 0) {
        // 检测到有效压力值
        console.log('有效压力输入:', e.pressure, '倾斜度:', e.tiltX, e.tiltY);
      }
    }
  }, { passive: false });
  
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
  
  console.log('已为画布启用数位笔支持');
}

// 帮助函数：将十六进制颜色转换为RGB
function hexToRgb(hex) {
  // 移除#号
  hex = hex.replace('#', '');
  
  // 解析RGB值
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
}

// 更新绿色摄像头配置
function updateGreenCameraConfig() {
  // 检查GreenCameraConfig是否存在
  if (!window.GreenCameraConfig) {
    console.warn('绿色摄像头配置对象不存在');
    return;
  }
  
  // 获取颜色值
  const colorPicker = document.getElementById('green-color-picker');
  if (colorPicker) {
    const colorHex = colorPicker.value;
    // 转换颜色
    const rgb = hexToRgb(colorHex);
    // 更新配置
    window.GreenCameraConfig.detectionColor = rgb;
  }
  
  // 使用默认值
  window.GreenCameraConfig.threshold = 210;
  window.GreenCameraConfig.stepSize = 8;
  window.GreenCameraConfig.particleLifetime = 2.0; // 更新为更长的生命周期
  
  console.log('已更新绿色摄像头配置（未应用）:', window.GreenCameraConfig);
}
    
// 应用绿色摄像头设置
function applyGreenCameraSettings() {
  // 更新配置
  updateGreenCameraConfig();
      
  // 如果当前正在使用绿色摄像头，立即应用设置
  if (currentCameraType === 'green' && currentBackgroundMode === 'camera' && backgroundCanvas) {
    // 如果实例有updateConfig方法，调用它
    if (typeof backgroundCanvas.updateConfig === 'function') {
      const result = backgroundCanvas.updateConfig(window.GreenCameraConfig);
      console.log('已应用绿色摄像头设置', result ? '成功' : '失败');
    } else {
      console.warn('绿色摄像头实例没有updateConfig方法');
      // 如果没有updateConfig方法，尝试重新初始化背景层
      initBackgroundLayer('camera');
    }
  } else {
    console.log('当前未使用绿色摄像头，设置已保存但未应用');
  }
}
      
// 清空绿色摄像头粒子
function clearGreenCameraParticles() {
  // 检查当前是否正在使用绿色摄像头
  if (currentCameraType === 'green' && currentBackgroundMode === 'camera' && backgroundCanvas) {
    // 检查是否有clearParticles方法
    if (typeof backgroundCanvas.clearParticles === 'function') {
      // 调用清空粒子方法
      const result = backgroundCanvas.clearParticles();
      console.log('清空粒子结果:', result ? '成功' : '失败');
    } else {
      console.warn('绿色摄像头实例没有clearParticles方法');
    }
  } else {
    console.warn('当前未使用绿色摄像头，无法清空粒子');
    }
}

// AI 控制面板初始化和事件处理
function initAIControls() {
  console.log('初始化AI控制面板事件处理');
  
  // Lora 模型选择事件
  const loraSelect = document.getElementById('ai-lora-model');
  if (loraSelect) {
    loraSelect.addEventListener('change', function(e) {
      e.stopPropagation(); // 阻止事件冒泡
      const newIndex = parseInt(this.value);
      console.log('Lora模型切换为:', newIndex);
      
      // 直接更新全局设置
      if (typeof currentSettings !== 'undefined') {
        currentSettings.loraIndex = newIndex;
      }
      updateDefaultPromptDisplay(newIndex);
      updateTriggerWordDisplay(newIndex);
    });
    console.log('已为Lora下拉菜单添加事件监听器');
  } else {
    console.error('未找到Lora下拉菜单元素');
  }
  
  // 提示词类型切换按钮
  const defaultPromptBtn = document.getElementById('btn-use-default-prompt');
  const customPromptBtn = document.getElementById('btn-use-custom-prompt');
  const defaultPromptContainer = document.getElementById('default-prompt-container');
  const customPromptContainer = document.getElementById('custom-prompt-container');
  
  if (defaultPromptBtn && customPromptBtn) {
    defaultPromptBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 阻止事件冒泡
      if (typeof currentSettings !== 'undefined') {
        currentSettings.useDefaultPrompt = true;
      }
      this.classList.add('active');
      customPromptBtn.classList.remove('active');
      defaultPromptContainer.style.display = 'block';
      customPromptContainer.style.display = 'none';
      console.log('已切换到默认提示词');
    });
    
    customPromptBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 阻止事件冒泡
      if (typeof currentSettings !== 'undefined') {
        currentSettings.useDefaultPrompt = false;
      }
      this.classList.add('active');
      defaultPromptBtn.classList.remove('active');
      defaultPromptContainer.style.display = 'none';
      customPromptContainer.style.display = 'block';
      console.log('已切换到自定义提示词');
    });
  }
  
  // 自定义提示词输入框事件
  const customPromptInput = document.getElementById('ai-custom-prompt');
  if (customPromptInput) {
    // 确保可以获取焦点和输入
    customPromptInput.addEventListener('click', function(e) {
      e.stopPropagation();
      this.focus();
      console.log('自定义提示词输入框已点击');
    });
    
    customPromptInput.addEventListener('input', function(e) {
      e.stopPropagation();
      if (typeof currentSettings !== 'undefined') {
        currentSettings.customPrompt = this.value;
      }
      console.log('自定义提示词已更新:', this.value);
    });
    
    // 确保没有CSS阻止交互
    customPromptInput.style.pointerEvents = 'auto';
    customPromptInput.style.userSelect = 'text';
    
    console.log('已为自定义提示词输入框添加事件监听器');
  } else {
    console.error('未找到自定义提示词输入框元素');
  }
  
  // 随机种子按钮
  const randomSeedBtn = document.getElementById('btn-random-seed');
  const seedInput = document.getElementById('ai-seed');
  
  if (randomSeedBtn && seedInput) {
    randomSeedBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 阻止事件冒泡
      const randomSeed = Math.floor(Math.random() * 1000000000);
      seedInput.value = randomSeed;
      if (typeof currentSettings !== 'undefined') {
        currentSettings.randomSeed = randomSeed;
      }
      console.log('已生成随机种子:', randomSeed);
    });
  }
  
  // 生成图像按钮
  const generateBtn = document.getElementById('btn-generate-image');
  if (generateBtn) {
    generateBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 阻止事件冒泡
      generateAIImage();
    });
  }
  
  // 初始化显示默认提示词和触发词
  updateDefaultPromptDisplay(0);
  updateTriggerWordDisplay(0);
  
  // 添加 AI 图像生成完成事件监听
  document.addEventListener('aiImageGenerated', function(e) {
    updateAIStatusDisplay(e.detail.success ? '图像生成成功' : '图像生成失败');
  });
  
  // 每5秒更新一次 ComfyUI 连接状态
  updateComfyUIStatus();
  setInterval(updateComfyUIStatus, 5000);
  
  console.log('AI控制面板事件初始化完成');
}

// 更新 AI 控制面板内容
function updateAIControlPanel() {
  console.log('开始更新AI控制面板...');
  
  // 检查是否有全局设置
  if (window.AISettings) {
    console.log('找到全局AI设置:', window.AISettings);
  } else {
    console.warn('未找到全局AI设置');
  }
  
  // 检查是否有 backgroundCanvas 和 getLoraModels 方法
  if (backgroundCanvas && typeof backgroundCanvas.getLoraModels === 'function') {
    // 获取 Lora 模型列表
    const loraModels = backgroundCanvas.getLoraModels();
    console.log('获取到Lora模型列表:', loraModels ? `${loraModels.length}个模型` : '无');
    
    // 如果有可用的模型，更新选择器
    if (loraModels && loraModels.length > 0) {
      const loraSelect = document.getElementById('ai-lora-model');
      if (loraSelect) {
        console.log('找到Lora选择器，当前值:', loraSelect.value);
        
        // 清空现有选项
        loraSelect.innerHTML = '';
        
        // 添加新选项
        loraModels.forEach((model, index) => {
          const option = document.createElement('option');
          option.value = index;
          option.textContent = model.name;
          loraSelect.appendChild(option);
        });
        
        // 设置当前选中值
        if (window.AISettings && typeof window.AISettings.loraIndex !== 'undefined') {
          loraSelect.value = window.AISettings.loraIndex;
          console.log('设置Lora选择器值为:', window.AISettings.loraIndex);
        }
        
        // 触发 change 事件以更新提示词显示
        try {
          console.log('手动触发change事件更新提示词');
          const event = new Event('change');
          loraSelect.dispatchEvent(event);
        } catch (e) {
          console.error('触发change事件失败:', e);
        }
      } else {
        console.error('未找到Lora选择器元素(#ai-lora-model)');
      }
    } else {
      console.warn('没有可用的Lora模型');
    }
  } else {
    console.error('backgroundCanvas不存在或缺少getLoraModels方法');
  }
  
  // 更新自定义提示词输入框
  const customPromptInput = document.getElementById('ai-custom-prompt');
  if (customPromptInput && window.AISettings) {
    customPromptInput.value = window.AISettings.customPrompt || '';
    console.log('更新自定义提示词输入框为:', window.AISettings.customPrompt);
  }
  
  // 更新随机种子输入框
  const seedInput = document.getElementById('ai-seed');
  if (seedInput && window.AISettings) {
    seedInput.value = window.AISettings.randomSeed || Math.floor(Math.random() * 1000000000);
    console.log('更新随机种子输入框为:', seedInput.value);
  }
  
  // 更新提示词类型按钮状态
  if (window.AISettings) {
    const defaultPromptBtn = document.getElementById('btn-use-default-prompt');
    const customPromptBtn = document.getElementById('btn-use-custom-prompt');
    const defaultPromptContainer = document.getElementById('default-prompt-container');
    const customPromptContainer = document.getElementById('custom-prompt-container');
    
    if (defaultPromptBtn && customPromptBtn) {
      if (window.AISettings.useDefaultPrompt) {
        defaultPromptBtn.classList.add('active');
        customPromptBtn.classList.remove('active');
        if (defaultPromptContainer) defaultPromptContainer.style.display = 'block';
        if (customPromptContainer) customPromptContainer.style.display = 'none';
        console.log('设置为使用默认提示词');
      } else {
        customPromptBtn.classList.add('active');
        defaultPromptBtn.classList.remove('active');
        if (defaultPromptContainer) defaultPromptContainer.style.display = 'none';
        if (customPromptContainer) customPromptContainer.style.display = 'block';
        console.log('设置为使用自定义提示词');
      }
    }
  }
  
  // 更新 ComfyUI 状态
  updateComfyUIStatus();
  console.log('AI控制面板更新完成');
}

// 更新默认提示词显示
function updateDefaultPromptDisplay(loraIndex) {
  const promptDisplay = document.getElementById('default-prompt-display');
  if (promptDisplay && backgroundCanvas && typeof backgroundCanvas.getLoraModels === 'function') {
    const loraModels = backgroundCanvas.getLoraModels();
    if (loraModels && loraModels[loraIndex]) {
      const defaultPrompt = loraModels[loraIndex].defaultPrompt;
      // 截取提示词的前100个字符以避免显示过长
      const shortPrompt = defaultPrompt.length > 100 ? 
        defaultPrompt.substring(0, 100) + '...' : defaultPrompt;
      
      promptDisplay.textContent = shortPrompt;
      promptDisplay.title = defaultPrompt; // 完整提示词作为提示
    }
  }
}

// 更新触发关键词显示
function updateTriggerWordDisplay(loraIndex) {
  const triggerWordText = document.getElementById('trigger-word-text');
  if (triggerWordText && backgroundCanvas && typeof backgroundCanvas.getLoraModels === 'function') {
    const loraModels = backgroundCanvas.getLoraModels();
    if (loraModels && loraModels[loraIndex]) {
      triggerWordText.textContent = loraModels[loraIndex].triggerWord;
    }
  }
}

// 更新 ComfyUI 状态显示
function updateComfyUIStatus() {
  const statusElement = document.getElementById('comfyui-status');
  if (statusElement && backgroundCanvas && typeof backgroundCanvas.getComfyUIStatus === 'function') {
    const isConnected = backgroundCanvas.getComfyUIStatus();
    statusElement.textContent = `ComfyUI状态: ${isConnected ? '已连接' : '未连接'}`;
    statusElement.style.color = isConnected ? '#4CAF50' : '#F44336';
  }
}

// 更新 AI 状态显示
function updateAIStatusDisplay(message) {
  const statusElement = document.getElementById('comfyui-status');
  if (statusElement) {
    statusElement.textContent = message;
  }
}

// 生成 AI 图像
function generateAIImage() {
  if (backgroundCanvas && typeof backgroundCanvas.generateImage === 'function') {
    // 确保从UI获取最新设置
    const loraSelect = document.getElementById('ai-lora-model');
    const customPromptInput = document.getElementById('ai-custom-prompt');
    const seedInput = document.getElementById('ai-seed');
    const useDefaultPromptBtn = document.getElementById('btn-use-default-prompt');
    
    // 记录当前状态
    console.log('准备生成AI图像，当前界面状态:');
    console.log('- Lora选择:', loraSelect ? loraSelect.value : '未找到元素');
    console.log('- 自定义提示词:', customPromptInput ? customPromptInput.value : '未找到元素');
    console.log('- 随机种子:', seedInput ? seedInput.value : '未找到元素');
    console.log('- 使用默认提示词:', useDefaultPromptBtn ? useDefaultPromptBtn.classList.contains('active') : '未找到元素');
    
    // 更新全局设置
    if (window.AISettings) {
      if (loraSelect) window.AISettings.loraIndex = parseInt(loraSelect.value);
      if (customPromptInput) window.AISettings.customPrompt = customPromptInput.value;
      if (seedInput) window.AISettings.randomSeed = parseInt(seedInput.value);
      if (useDefaultPromptBtn) window.AISettings.useDefaultPrompt = useDefaultPromptBtn.classList.contains('active');
      
      console.log('生成AI图像，全局设置:', window.AISettings);
      
      // 调用 generateImage 方法
      try {
        backgroundCanvas.generateImage(window.AISettings);
        updateAIStatusDisplay('正在生成图像...');
      } catch (error) {
        console.error('生成图像时出错:', error);
        updateAIStatusDisplay('生成图像失败: ' + error.message);
      }
    } else {
      console.error('未找到全局AI设置对象');
      updateAIStatusDisplay('无法访问AI设置');
    }
  } else {
    console.error('backgroundCanvas不存在或缺少generateImage方法');
    updateAIStatusDisplay('无法访问AI生成功能');
  }
}

// 切换AI设置面板
function toggleAISettings(forceShow = false) {
  const settingsPanel = document.getElementById('ai-settings');
  const controlPanelContainer = document.getElementById('p5-control-panel');
  
  if (settingsPanel && controlPanelContainer) {
    console.log('切换AI设置面板，当前显示状态:', settingsPanel.style.display);
    
    // 如果传入forceShow=true，强制显示面板
    const newDisplay = forceShow ? 'block' : 
                      (settingsPanel.style.display === 'none' ? 'block' : 'none');
    settingsPanel.style.display = newDisplay;
    console.log('AI设置面板新显示状态:', newDisplay);
    
    // 如果是打开面板，则初始化控件并确保面板位置正确
    if (newDisplay === 'block') {
      console.log('打开AI设置面板，重置位置和初始化控件');
      
      // 获取整个控制面板容器的位置信息
      const containerRect = controlPanelContainer.getBoundingClientRect();
      
      // 重置面板位置，使其靠右显示且底部与整个控制面板容器底部对齐
      settingsPanel.style.position = 'fixed';
      settingsPanel.style.left = (containerRect.right + 20) + 'px'; // 控制面板右侧+20px的位置，增加间隙
      settingsPanel.style.bottom = (window.innerHeight - containerRect.bottom) + 'px'; // 与整个控制面板底部对齐
      settingsPanel.style.top = 'auto'; // 清除top设置，使bottom生效
      settingsPanel.style.maxHeight = '90vh';
      settingsPanel.style.zIndex = '1500'; // 确保在最上层
      settingsPanel.style.overflow = 'auto';
      
      // 确保面板可见性
      settingsPanel.style.visibility = 'visible';
      settingsPanel.style.opacity = '1';
      
      // 确保面板中的交互元素可以正常工作
      setTimeout(() => {
        try {
          const inputs = settingsPanel.querySelectorAll('input, textarea, select, button');
          inputs.forEach(el => {
            el.style.pointerEvents = 'auto';
            el.style.userSelect = 'text';
            
            // 特别处理textarea，确保它可以输入
            if (el.tagName.toLowerCase() === 'textarea') {
              el.readOnly = false;
              // 添加点击焦点事件
              el.addEventListener('click', function(e) {
                e.stopPropagation();
                this.focus();
                console.log('文本域已聚焦');
              }, { once: false });
            }
            
            // 特别处理select，确保它可以选择
            if (el.tagName.toLowerCase() === 'select') {
              // 添加特定的click事件
              el.addEventListener('click', function(e) {
                e.stopPropagation();
                console.log('选择器被点击');
              }, { once: false });
              
              // 添加change事件日志
              el.addEventListener('change', function(e) {
                e.stopPropagation();
                console.log('选择器值已改变:', this.value);
              }, { once: false });
            }
            
            console.log('启用交互元素:', el.id || el.tagName);
          });
          
          // 特别处理Lora选择器，确保其事件正常工作
          const loraSelect = document.getElementById('ai-lora-model');
          if (loraSelect) {
            console.log('特别处理Lora选择器');
            // 移除所有现有事件监听器
            const newLoraSelect = loraSelect.cloneNode(true);
            loraSelect.parentNode.replaceChild(newLoraSelect, loraSelect);
            
            // 重新添加事件监听器
            newLoraSelect.addEventListener('change', function(e) {
              e.stopPropagation();
              const newIndex = parseInt(this.value);
              console.log('Lora模型选择器值变化:', newIndex);
              
              // 直接更新全局设置
              if (window.AISettings) {
                window.AISettings.loraIndex = newIndex;
                console.log('更新全局设置loraIndex为:', newIndex);
              }
              
              // 更新显示
              updateDefaultPromptDisplay(newIndex);
              updateTriggerWordDisplay(newIndex);
            });
          }
          
          updateAIControlPanel();
        } catch (err) {
          console.error('设置控制面板交互元素时出错:', err);
        }
      }, 100);
    }
  } else {
    console.error('未找到AI设置面板元素或控制面板容器');
  }
}

// 注释掉旧的切换情感控制面板函数

// 在模块加载完成后，将函数绑定到全局p5Drawing对象
window.p5Drawing = {
  init: initP5Drawing
}; 

// 分享图片
window.shareImage = function() {
  console.log('开始分享图片...');
  // 显示二维码弹窗
  const shareDialog = document.getElementById('shareDialog');
  if (shareDialog) {
    shareDialog.style.display = 'flex';
    
    // 生成分享链接
    const shareUrl = generateShareUrl();
    console.log('生成分享链接:', shareUrl);
    
    // 生成二维码
    if (typeof QRHelper !== 'undefined' && QRHelper.generate) {
      console.log('使用QRHelper生成二维码');
      QRHelper.generate('qrcode', shareUrl);
    } else if (typeof generateQRCode === 'function') {
      console.log('使用generateQRCode函数生成二维码');
      generateQRCode('qrcode', shareUrl);
    } else {
      console.error('没有可用的二维码生成方法');
      document.getElementById('qrcode').innerHTML = `
        <div style="padding: 20px; background: #f8f8f8; border-radius: 5px;">
          <p>无法生成二维码，请使用以下链接分享：</p>
          <a href="${shareUrl}" target="_blank" style="word-break: break-all;">${shareUrl}</a>
        </div>
      `;
    }
  }
}; 