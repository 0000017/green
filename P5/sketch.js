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
  
  // 添加控制按钮
  const controlPanel = document.createElement('div');
  controlPanel.id = 'p5-control-panel';
  controlPanel.className = 'p5-control-panel';
  controlPanel.innerHTML = `
    <button id="btn-draw">普通绘画</button>
    <button id="btn-brush">笔刷变化</button>
    <button id="btn-camera">摄像头处理</button>
    <button id="btn-emotion">情感生成</button>
    <button id="btn-td">TD处理</button>
    <button id="btn-clear">清除画布</button>
    <button id="btn-save">保存作品</button>
  `;
  appContainer.appendChild(controlPanel);
  
  // 添加事件监听器
  document.getElementById('btn-draw').addEventListener('click', () => switchFunction('draw'));
  document.getElementById('btn-brush').addEventListener('click', () => switchFunction('brush'));
  document.getElementById('btn-camera').addEventListener('click', () => switchFunction('camera'));
  document.getElementById('btn-emotion').addEventListener('click', () => switchFunction('emotion'));
  document.getElementById('btn-td').addEventListener('click', () => switchFunction('td'));
  document.getElementById('btn-clear').addEventListener('click', clearCanvas);
  document.getElementById('btn-save').addEventListener('click', saveCanvas);
  
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
    case 'brush':
      currentSketch = new p5(brushSketch, 'p5-canvas-container');
      break;
    case 'camera':
      currentSketch = new p5(cameraSketch, 'p5-canvas-container');
      break;
    case 'emotion':
      currentSketch = new p5(emotionSketch, 'p5-canvas-container');
      break;
    case 'td':
      currentSketch = new p5(tdSketch, 'p5-canvas-container');
      break;
  }
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

// 导出函数供外部调用
window.p5Drawing = {
  init: initP5Drawing,
  switchFunction: switchFunction,
  clearCanvas: clearCanvas,
  saveCanvas: saveCanvas
}; 