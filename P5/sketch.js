// P5.js主控制文件
// 管理多个P5功能的加载和切换

// 全局状态变量，用于共享背景模式信息
window.p5State = {
  currentBackgroundMode: 'none',  // 默认为无背景模式
  cameraType: 'vintage' // 默认为老相机模式
};

let currentSketch = null;      // 当前活动的P5实例
let savedCanvas = null;        // 保存的画布内容
let isDrawMode = true;         // 默认为绘画模式
window.isInitialized = false;  // 初始化标志，暴露到全局作用域

// 分层系统变量
let backgroundCanvas = null;   // 背景层画布实例
let drawingCanvas = null;      // 绘画层画布实例
let currentBackgroundMode = 'none';  // 当前背景模式
let currentCameraType = 'vintage';   // 当前相机类型，默认老相机

// 初始化P5绘画工具
function initP5Drawing() {
  if (window.isInitialized) return;
  
  console.log("初始化P5绘画工具");
  
  // 确保全局状态正确初始化
  window.p5State = {
    currentBackgroundMode: 'none',  // 默认无背景模式
    cameraType: 'vintage' // 默认为老相机模式
  };
  
  // 重置当前背景模式
  currentBackgroundMode = 'none';
  currentCameraType = 'vintage';
  
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
  
  // 创建弹出式设置面板
  // 创建相机设置弹出面板
  const cameraSettings = document.createElement('div');
  cameraSettings.id = 'camera-settings';
  cameraSettings.className = 'popup-settings';
  cameraSettings.innerHTML = `
    <h3>摄像头类型</h3>
    <button id="btn-camera-vintage" class="active">老相机</button>
    <button id="btn-camera-green">绿色摄像头</button>
    
    <div id="vintage-camera-controls">
      <h3>老相机控制</h3>
      <button id="btn-camera-take-photo">开始拍照</button>
      <div id="camera-countdown" class="camera-countdown"></div>
    </div>
  `;
  
  // 将相机设置添加到相机按钮下
  document.getElementById('btn-bg-camera').appendChild(cameraSettings);
  
  // 添加对应功能的点击事件
  document.getElementById('btn-bg-none').addEventListener('click', () => setBackgroundMode('none'));
  document.getElementById('btn-bg-emotion').addEventListener('click', () => setBackgroundMode('emotion'));
  document.getElementById('btn-bg-camera').addEventListener('click', (e) => {
    // 阻止事件冒泡，防止立即设置背景模式
    e.stopPropagation();
    
    // 切换active类和弹出设置
    togglePopupSettings('btn-bg-camera');
    
    // 为单独的"摄像头背景"按钮添加点击事件
    const btn = document.getElementById('btn-bg-camera');
    if (!btn.classList.contains('has-click-handler')) {
      btn.classList.add('has-click-handler');
      btn.addEventListener('dblclick', () => {
        setBackgroundMode('camera');
      });
    }
  });
  document.getElementById('btn-bg-ai').addEventListener('click', () => setBackgroundMode('ai'));
  
  // 添加摄像头类型切换事件
  document.getElementById('btn-camera-vintage').addEventListener('click', (e) => {
    e.stopPropagation();
    setCameraType('vintage');
  });
  document.getElementById('btn-camera-green').addEventListener('click', (e) => {
    e.stopPropagation();
    setCameraType('green');
  });
  
  // 添加老相机控制事件
  document.getElementById('btn-camera-take-photo').addEventListener('click', (e) => {
    e.stopPropagation();
    takeVintagePhoto();
  });
  
  // 添加操作事件
  document.getElementById('btn-clear-drawing').addEventListener('click', () => clearDrawingLayer());
  document.getElementById('btn-clear-all').addEventListener('click', () => clearAllLayers());
  document.getElementById('btn-save').addEventListener('click', () => saveCanvas());
  
  // 为文档添加点击事件，用于关闭所有弹出设置
  document.addEventListener('click', function(event) {
    // 如果点击的不是按钮或弹出设置，关闭所有弹出设置
    if (!event.target.closest('.popup-settings') && !event.target.closest('button')) {
      closeAllPopupSettings();
    }
  });
  
  // 初始化绘画层
  initDrawingLayer();
  
  window.isInitialized = true;
}

// 切换弹出设置的显示/隐藏
function togglePopupSettings(buttonId) {
  // 先关闭所有弹出设置
  closeAllPopupSettings();
  
  // 打开当前按钮的弹出设置
  const button = document.getElementById(buttonId);
  if (button) {
    button.classList.toggle('active');
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
  
  // 更新摄像头选项和控制的显示状态
  updateCameraControlsVisibility(mode);
  
  // 初始化背景层
  initBackgroundLayer(mode);
  
  // 如果绘画层已存在，强制更新其背景
  if (drawingCanvas && typeof drawingCanvas.forceUpdateBackground === 'function') {
    console.log("调用强制更新背景");
    drawingCanvas.forceUpdateBackground(mode);
  } else {
    console.log("绘画层不存在或没有forceUpdateBackground方法");
  }
  
  // 关闭所有弹出设置
  closeAllPopupSettings();
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
  
  // 更新老相机控制的显示状态
  const vintageCameraControls = document.getElementById('vintage-camera-controls');
  if (vintageCameraControls) {
    vintageCameraControls.style.display = 
      (type === 'vintage') ? 'block' : 'none';
  }
  
  // 重新初始化背景层
  if (currentBackgroundMode === 'camera') {
    initBackgroundLayer('camera');
  }
}

// 更新摄像头控制面板的显示状态
function updateCameraControlsVisibility(mode) {
  // 在新的UI中不需要这个函数，通过点击事件处理弹出菜单
}

// 更新摄像头类型按钮状态
function updateCameraTypeButtons(activeType) {
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

// 老相机拍照功能
function takeVintagePhoto() {
  // 检查backgroundCanvas是否存在以及是否有mousePresse方法
  if (backgroundCanvas) {
    console.log("触发老相机拍照");
    
    // 如果有mousePressed方法，触发它来开始拍照
    if (typeof backgroundCanvas.mousePressed === 'function') {
      backgroundCanvas.mousePressed();
      
      // 启动倒计时显示
      updateCountdown();
    } else {
      console.error("老相机实例没有mousePressed方法");
    }
  } else {
    console.error("老相机实例不存在");
  }
}

// 更新倒计时显示
function updateCountdown() {
  if (!backgroundCanvas) return;
  
  const countdownElement = document.getElementById('camera-countdown');
  
  // 获取相机实例的startTime和当前时间
  const startTime = backgroundCanvas.startTime || -1;
  
  if (startTime > 0) {
    // 计算剩余时间
    const remaining = Math.max(0, startTime + 20*1000 - new Date().getTime());
    const remSecs = Math.ceil(remaining / 1000);
    
    if (remaining > 0) {
      countdownElement.textContent = `拍摄中，剩余 ${remSecs} 秒`;
      countdownElement.style.display = 'block';
      
      // 每秒更新一次倒计时
      setTimeout(updateCountdown, 1000);
    } else {
      countdownElement.textContent = '拍摄完成';
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
        if (currentCameraType === 'vintage') {
          backgroundCanvas = new p5(window.cameraSketch, 'background-container');
        } else if (currentCameraType === 'green') {
          // 绿色摄像头尚未实现，这里先使用同样的cameraSketch
          if (typeof window.greenCameraSketch === 'function') {
            backgroundCanvas = new p5(window.greenCameraSketch, 'background-container');
          } else {
            console.warn('绿色摄像头模块尚未加载，临时使用老相机');
            backgroundCanvas = new p5(window.cameraSketch, 'background-container');
          }
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

// 在模块加载完成后，将函数绑定到全局p5Drawing对象
window.p5Drawing = {
  init: initP5Drawing
}; 