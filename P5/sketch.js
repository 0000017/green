// P5.js主控制文件
// 管理多个P5功能的加载和切换

let currentSketch = null;  // 当前活动的P5实例
let savedCanvas = null;    // 保存的画布内容
let isDrawMode = true;     // 默认为绘画模式
window.isInitialized = false; // 初始化标志，暴露到全局作用域

// 初始化P5绘画工具
function initP5Drawing() {
  if (window.isInitialized) return;
  
  // 获取主应用内容容器，如果找不到则使用body
  const appContainer = document.getElementById('main-app-content') || document.body;
  
  // 创建功能选择面板的切换按钮 - 放在底部中间
  const toggleButton = document.createElement('div');
  toggleButton.id = 'p5-panel-toggle';
  toggleButton.className = 'p5-panel-toggle';
  toggleButton.innerHTML = `<span>功能</span>`;
  toggleButton.style.position = 'fixed';
  toggleButton.style.left = '50%';
  toggleButton.style.bottom = '20px';
  toggleButton.style.transform = 'translateX(-50%)';
  toggleButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  toggleButton.style.color = 'white';
  toggleButton.style.padding = '8px 20px';
  toggleButton.style.borderRadius = '20px';
  toggleButton.style.cursor = 'pointer';
  toggleButton.style.zIndex = '1200';
  toggleButton.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
  appContainer.appendChild(toggleButton);
  
  // 添加控制按钮面板
  const controlPanel = document.createElement('div');
  controlPanel.id = 'p5-control-panel';
  controlPanel.className = 'p5-control-panel';
  controlPanel.innerHTML = `
    <button id="btn-draw">普通绘画</button>
    <button id="btn-camera">摄像头处理</button>
    <button id="btn-emotion">情感生成</button>
    <button id="btn-ai">AI实时绘画</button>
    <button id="btn-clear">清除画布</button>
    <button id="btn-save">保存作品</button>
  `;
  controlPanel.style.position = 'fixed';
  controlPanel.style.left = '50%';
  controlPanel.style.bottom = '70px';
  controlPanel.style.transform = 'translateX(-50%)';
  controlPanel.style.display = 'none';  // 默认隐藏
  controlPanel.style.flexDirection = 'row';
  controlPanel.style.flexWrap = 'wrap';
  controlPanel.style.justifyContent = 'center';
  controlPanel.style.gap = '5px';
  controlPanel.style.width = 'auto';
  controlPanel.style.maxWidth = '80%';
  appContainer.appendChild(controlPanel);
  
  // 为按钮设置样式
  const buttons = controlPanel.querySelectorAll('button');
  buttons.forEach(button => {
    button.style.margin = '4px';
    button.style.minWidth = '100px';
  });
  
  // 添加切换面板显示/隐藏的功能
  toggleButton.addEventListener('click', function(event) {
    event.stopPropagation(); // 阻止事件冒泡
    if (controlPanel.style.display === 'none') {
      controlPanel.style.display = 'flex';
    } else {
      controlPanel.style.display = 'none';
    }
  });
  
  // 点击页面其他地方隐藏控制面板
  document.addEventListener('click', function(event) {
    if (!controlPanel.contains(event.target) && event.target !== toggleButton) {
      controlPanel.style.display = 'none';
    }
  });
  
  // 在开始绘画时隐藏功能按钮
  document.addEventListener('mousedown', function(event) {
    // 忽略控制面板区域的点击
    if (!controlPanel.contains(event.target) && event.target !== toggleButton) {
      // 隐藏功能按钮，但保持可见性（半透明）
      toggleButton.style.opacity = '0.2';
    }
  });
  
  // 鼠标移动到功能按钮上时恢复透明度
  toggleButton.addEventListener('mouseenter', function() {
    toggleButton.style.opacity = '1';
  });
  
  // 鼠标离开功能按钮时，如果不是显示控制面板状态，降低透明度
  toggleButton.addEventListener('mouseleave', function() {
    if (controlPanel.style.display === 'none') {
      toggleButton.style.opacity = '0.2';
    }
  });
  
  // 添加事件监听器
  document.getElementById('btn-draw').addEventListener('click', () => {
    switchFunction('draw');
    controlPanel.style.display = 'none';  // 选择后隐藏面板
  });
  document.getElementById('btn-camera').addEventListener('click', () => {
    switchFunction('camera');
    controlPanel.style.display = 'none';  // 选择后隐藏面板
  });
  document.getElementById('btn-emotion').addEventListener('click', () => {
    switchFunction('emotion');
    controlPanel.style.display = 'none';  // 选择后隐藏面板
  });
  document.getElementById('btn-ai').addEventListener('click', () => {
    switchFunction('ai');
    controlPanel.style.display = 'none';  // 选择后隐藏面板
  });
  document.getElementById('btn-clear').addEventListener('click', () => {
    clearCanvas();
    controlPanel.style.display = 'none';  // 选择后隐藏面板
  });
  document.getElementById('btn-save').addEventListener('click', () => {
    saveCanvas();
    controlPanel.style.display = 'none';  // 选择后隐藏面板
  });
  
  // 创建P5画布容器
  const canvasContainer = document.createElement('div');
  canvasContainer.id = 'p5-canvas-container';
  appContainer.appendChild(canvasContainer);
  
  // 初始化默认绘画功能
  switchFunction('draw');
  
  window.isInitialized = true;
}

// 切换功能
function switchFunction(funcName) {
  if (currentSketch) {
    // 保存当前画布内容
    try {
      // 确保当前画布内容被保存，使用更可靠的方法
      if (currentSketch.get && typeof currentSketch.get === 'function') {
        // 创建临时画布
        let tempCanvas = document.createElement('canvas');
        let p5Canvas = currentSketch.canvas;
        
        if (p5Canvas && p5Canvas.width && p5Canvas.height) {
          // 复制原始画布的尺寸
          tempCanvas.width = p5Canvas.width;
          tempCanvas.height = p5Canvas.height;
          
          // 复制画布内容
          let ctx = tempCanvas.getContext('2d');
          ctx.drawImage(p5Canvas, 0, 0);
          
          // 将临时画布保存为图像对象
          savedCanvas = tempCanvas;
          console.log('成功保存画布内容', savedCanvas.width, savedCanvas.height);
        }
      }
    } catch (e) {
      console.warn('无法保存当前画布内容:', e);
      savedCanvas = null;
    }
    
    // 移除当前实例，使用更安全的方法
    try {
      if (currentSketch.remove && typeof currentSketch.remove === 'function') {
        currentSketch.remove();
      } else if (currentSketch._remove && typeof currentSketch._remove === 'function') {
        currentSketch._remove();
      } else if (currentSketch.canvas) {
        // 如果没有remove方法，尝试直接移除canvas元素
        if (currentSketch.canvas.parentElement) {
          currentSketch.canvas.parentElement.removeChild(currentSketch.canvas);
        }
      }
    } catch (e) {
      console.warn('移除当前实例时出错:', e);
    }
    
    currentSketch = null;
  }
  
  // 创建新的P5实例
  switch (funcName) {
    case 'draw':
      currentSketch = new p5(drawSketch, 'p5-canvas-container');
      break;
    case 'camera':
      currentSketch = new p5(window.cameraSketch || cameraSketch, 'p5-canvas-container');
      break;
    case 'emotion':
      currentSketch = new p5(emotionSketch, 'p5-canvas-container');
      break;
    case 'ai':
      // 如果aiSketch不存在，使用drawSketch并提示用户需要加载AI模块
      if (typeof window.aiSketch === 'function') {
        currentSketch = new p5(window.aiSketch, 'p5-canvas-container');
      } else {
        console.error('未找到AI实时绘画模块，请先加载ai.js');
        alert('请先加载AI绘画模块');
        currentSketch = new p5(drawSketch, 'p5-canvas-container');
      }
      break;
  }
  
  // 新增：为当前P5实例设置WebGL属性，提高数位笔兼容性
  if (currentSketch && typeof currentSketch.setAttributes === 'function') {
    try {
      // 设置WebGL上下文属性，启用触控和数位笔支持
      currentSketch.setAttributes({
        antialias: true,           // 抗锯齿
        alpha: true,               // 支持透明度
        premultipliedAlpha: false, // 更好的透明度处理
        preserveDrawingBuffer: true, // 保留绘图缓冲区，防止绘画内容丢失
        perPixelLighting: true,    // 更好的光照效果
        stencil: true              // 启用模板缓冲区
      });
      console.log('已设置WebGL属性以优化数位笔支持');
    } catch (e) {
      console.warn('设置WebGL属性时出错:', e);
    }
  }
  
  // 为当前画布启用触摸和数位笔支持
  if (currentSketch && currentSketch.canvas) {
    // 所有模式使用默认鼠标光标
    currentSketch.canvas.style.cursor = 'default';
    // 启用数位笔支持
    enableStylusSupport(currentSketch.canvas);
    console.log(`已为${funcName}模式的画布启用数位笔支持`);
  }
  
  // 在功能切换后隐藏功能按钮（设为半透明）
  const toggleButton = document.getElementById('p5-panel-toggle');
  if (toggleButton) {
    toggleButton.style.opacity = '0.2';
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
}

// 清除画布
function clearCanvas() {
  if (currentSketch) {
    currentSketch.clear();
    savedCanvas = null;
  }
}

// 保存画布
function saveCanvas() {
  if (currentSketch) {
    currentSketch.saveCanvas('我的创作', 'png');
  }
}

// 监听设备的手写笔连接状态
window.addEventListener('pointerdown', function(e) {
  if (e.pointerType === 'pen') {
    console.log('检测到数位笔输入 - 全局事件');
    console.log('压力支持:', e.pressure !== undefined);
    console.log('压力值:', e.pressure);
  }
}, false);

// 导出函数供外部调用
window.p5Drawing = {
  init: initP5Drawing,
  switchFunction: switchFunction,
  clearCanvas: clearCanvas,
  saveCanvas: saveCanvas,
  enableStylusSupport: enableStylusSupport
}; 