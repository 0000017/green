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
  document.getElementById('btn-bg-emotion').addEventListener('click', () => setBackgroundMode('emotion'));
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
      backgroundCanvas.remove();
    } catch(e) {
      console.warn('移除背景画布失败:', e);
    }
    backgroundCanvas = null;
  }
  
  // 创建新的背景实例
  if (mode !== 'none') {
    const backgroundContainer = document.getElementById('background-container');
    
    // 清空容器
    if (backgroundContainer) {
      backgroundContainer.innerHTML = '';
    }
    
    // 创建新的背景实例
    switch(mode) {
      case 'emotion':
        backgroundCanvas = new p5(emotionSketch, 'background-container');
        break;
      case 'camera':
        if (currentCameraType === 'normal') {
          // 原始摄像头模式
          backgroundCanvas = new p5(normalCameraSketch, 'background-container');
        } else if (currentCameraType === 'vintage') {
          // 老相机模式
          backgroundCanvas = new p5(window.cameraSketch, 'background-container');
        } else if (currentCameraType === 'green') {
          // 绿色摄像头模式 - 从camera_g.js加载
          backgroundCanvas = new p5(window.greenCameraSketch, 'background-container');
        }
        break;
      case 'ai':
        if (typeof window.aiSketch === 'function') {
          backgroundCanvas = new p5(window.aiSketch, 'background-container');
        } else {
          console.error('未找到AI实时绘画模块，请先加载ai.js');
          alert('请先加载AI绘画模块');
          // 重置为无背景
          setBackgroundMode('none');
          return;
        }
        break;
    }
    
    // 设置背景画布的样式
    if (backgroundCanvas && backgroundCanvas.canvas) {
      backgroundCanvas.canvas.style.position = 'absolute';
      backgroundCanvas.canvas.style.zIndex = '700';
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
    // 调用P5的原生remove方法
    p._remove();
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
    
    // 将合并后的画布转换为图片并下载
    const dataURL = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'artwork-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.png';
    link.href = dataURL;
    link.click();
    
    console.log('作品已保存');
  } catch (e) {
    console.error('保存画布失败:', e);
    alert('保存失败: ' + e.message);
  }
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

// 在模块加载完成后，将函数绑定到全局p5Drawing对象
window.p5Drawing = {
  init: initP5Drawing
}; 