// 全局变量
let emotionRecognition;
let isRecognitionActive = false;
let videoElement;
let floatingVideoElement;
let canvasElement;
let currentEmotionText;
let emotionBar;
let floatingToggleButton; // 悬浮窗口的切换按钮
let floatingCloseButton; // 悬浮窗口的关闭按钮
let floatingWindow; // 悬浮窗口元素
let isFloatingWindowVisible = false; // 悬浮窗口是否可见
let isInitializing = false; // 是否正在初始化

// 初始化函数
async function init() {
    console.log('初始化表情识别UI...');
    // 主视频元素（用于WebRTC）
    videoElement = document.getElementById('videoStream');
    
    // 获取摄像头权限
    try {
        // 悬浮窗口元素
        floatingWindow = document.getElementById('emotion-floating-window');
        if (!floatingWindow) {
            throw new Error('找不到悬浮窗口元素');
        }
        
        floatingVideoElement = document.getElementById('floating-video');
        canvasElement = document.getElementById('outputCanvas');
        floatingToggleButton = document.getElementById('floating-toggle-btn');
        floatingCloseButton = document.getElementById('floating-close-btn');
        currentEmotionText = document.getElementById('current-emotion');
        emotionBar = document.getElementById('emotion-bar');
        
        if (!floatingVideoElement || !canvasElement || !floatingToggleButton || 
            !floatingCloseButton || !currentEmotionText || !emotionBar) {
            throw new Error('找不到所需UI元素');
        }
        
        // 设置按钮状态
        floatingToggleButton.textContent = '正在初始化...';
        
        // 尝试获取摄像头权限
        console.log('请求摄像头权限...');
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user"
            }
        });
        
        // 将摄像头流传递给悬浮窗口
        floatingVideoElement.srcObject = stream;
        
        // 确保视频元素可播放
        console.log('等待视频就绪...');
        await new Promise((resolve, reject) => {
            floatingVideoElement.onloadeddata = resolve;
            floatingVideoElement.onerror = reject;
            // 5秒超时
            setTimeout(() => reject(new Error('视频加载超时')), 5000);
            
            if (floatingVideoElement.readyState >= 2) {
                resolve();
            }
        });
        
        floatingVideoElement.play().catch(err => {
            console.error('视频播放失败:', err);
        });
        
        console.log('摄像头初始化成功');
        
        // 创建表情识别实例
        emotionRecognition = new EmotionRecognition();
        
        // 设置按钮点击事件
        floatingToggleButton.addEventListener('click', toggleEmotionRecognition);
        floatingCloseButton.addEventListener('click', toggleFloatingWindow);
        
        // 监听表情识别事件
        document.addEventListener('emotionDetected', onEmotionDetected);
        
        // 添加悬浮窗口拖动功能
        makeDraggable(floatingWindow);
        
        // 默认显示悬浮窗口
        showFloatingWindow();
        
        // 初始化表情识别
        console.log('初始化表情识别...');
        initEmotionRecognition();
        
        // 将toggleEmotionWindow暴露给全局，以便可以用快捷键触发
        window.toggleEmotionWindow = toggleFloatingWindow;
        
    } catch (err) {
        console.error('初始化失败:', err);
        alert('初始化失败: ' + err.message);
        return;
    }
}

// 显示悬浮窗口
function showFloatingWindow() {
    floatingWindow.style.display = 'block';
    isFloatingWindowVisible = true;
    
    // 设置悬浮窗口位置（右上角）
    floatingWindow.style.right = '20px';
    floatingWindow.style.top = '20px';
    
    // 设置视频和画布尺寸
    const floatingWidth = 320; // 悬浮窗口宽度
    const floatingHeight = 240; // 悬浮窗口高度
    floatingVideoElement.width = floatingWidth - 40; // 减去内边距
    floatingVideoElement.height = floatingHeight - 100; // 减去头部和面板高度
    canvasElement.width = floatingVideoElement.width;
    canvasElement.height = floatingVideoElement.height;
    
    // 确保摄像头流传递到悬浮窗口视频元素
    if (floatingVideoElement.srcObject === null && videoElement.srcObject) {
        floatingVideoElement.srcObject = videoElement.srcObject;
    }
}

// 使元素可拖动
function makeDraggable(element) {
    const header = element.querySelector('.floating-header');
    let isDragging = false;
    let offsetX, offsetY;
    
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// 切换悬浮窗口显示/隐藏
function toggleFloatingWindow() {
    if (isFloatingWindowVisible) {
        floatingWindow.style.display = 'none';
        isFloatingWindowVisible = false;
        
        // 如果正在识别，则停止
        if (isRecognitionActive) {
            toggleEmotionRecognition();
        }
    } else {
        showFloatingWindow();
    }
}

// 初始化表情识别
async function initEmotionRecognition() {
    if (isInitializing) {
        console.log('表情识别模块已在初始化中，跳过');
        return;
    }
    
    isInitializing = true;
    
    // 确保按钮存在
    if (floatingToggleButton) {
        floatingToggleButton.textContent = '正在初始化...';
        floatingToggleButton.disabled = true;
    }
    
    try {
        console.log('开始初始化表情识别模块...');
        
        // 确保emotionRecognition已创建
        if (!emotionRecognition) {
            console.log('创建EmotionRecognition实例');
            emotionRecognition = new EmotionRecognition();
        }
        
        const initialized = await emotionRecognition.init(floatingVideoElement, canvasElement);
        if (initialized) {
            console.log('表情识别模块初始化成功');
            if (floatingToggleButton) {
                floatingToggleButton.textContent = '开启识别';
                floatingToggleButton.disabled = false;
            }
        } else {
            console.error('表情识别模块初始化失败');
            if (floatingToggleButton) {
                floatingToggleButton.textContent = '无法初始化';
                floatingToggleButton.disabled = true;
            }
        }
    } catch (error) {
        console.error('初始化表情识别时出错:', error);
        if (floatingToggleButton) {
            floatingToggleButton.textContent = '初始化错误';
            floatingToggleButton.disabled = true;
        }
    } finally {
        isInitializing = false;
    }
}

// 切换表情识别
function toggleEmotionRecognition() {
    if (!emotionRecognition) {
        console.error('表情识别模块未初始化');
        return;
    }
    
    if (floatingToggleButton && floatingToggleButton.disabled) {
        console.log('按钮被禁用，忽略点击');
        return;
    }
    
    isRecognitionActive = !isRecognitionActive;
    
    if (isRecognitionActive) {
        // 启动表情识别
        console.log('开始表情识别');
        emotionRecognition.start();
        if (floatingToggleButton) {
            floatingToggleButton.textContent = '关闭识别';
            floatingToggleButton.classList.add('active');
        }
    } else {
        // 停止表情识别
        console.log('停止表情识别');
        emotionRecognition.stop();
        if (floatingToggleButton) {
            floatingToggleButton.textContent = '开启识别';
            floatingToggleButton.classList.remove('active');
        }
        if (currentEmotionText) {
            currentEmotionText.textContent = '未检测';
        }
        if (emotionBar) {
            emotionBar.style.width = '0%';
        }
    }
}

// 处理检测到的表情
function onEmotionDetected(event) {
    if (!event || !event.detail) {
        console.error('无效的表情事件数据');
        return;
    }
    
    const { emotion, confidence } = event.detail;
    
    // 更新UI
    if (currentEmotionText) {
        currentEmotionText.textContent = emotion;
    }
    
    if (emotionBar) {
        emotionBar.style.width = `${Math.round(confidence * 100)}%`;
        
        // 根据表情设置不同的颜色
        const colors = {
            '开心': '#4CAF50', // 绿色
            '悲伤': '#2196F3', // 蓝色
            '愤怒': '#F44336', // 红色
            '惊讶': '#FF9800', // 橙色
            '恐惧': '#9C27B0', // 紫色
            '厌恶': '#795548', // 棕色
            '中性': '#607D8B', // 灰蓝色
            '未检测': '#9E9E9E' // 灰色
        };
        
        const color = colors[emotion] || '#9E9E9E';
        emotionBar.style.backgroundColor = color;
    }
    
    // 向主进程发送情绪数据
    try {
        if (window.electron && window.electron.ipcRenderer) {
            window.electron.ipcRenderer.send('emotion-data', { emotion, confidence });
        }
    } catch (err) {
        // 忽略错误，可能是在浏览器环境中测试
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 添加样式
    addStyles();
    
    // 初始化组件
    init();
});

// 添加样式
function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
    .video-container {
        position: relative;
        width: 100%;
        height: 100%;
    }
    
    .overlay-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
    
    .emotion-panel {
        position: absolute;
        bottom: 10px;
        right: 10px;
        width: 200px;
        background: rgba(255, 0, 0, 0);
        border-radius: 8px;
        color: white;
        padding: 10px;
        font-family: Arial, sans-serif;
        z-index: 100;
    }
    
    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .panel-header h3 {
        margin: 0;
        font-size: 16px;
    }
    
    .panel-header button {
        background: #4CAF50;
        border: none;
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    }
    
    .panel-header button.active {
        background: #F44336;
    }
    
    .panel-header button:disabled {
        background: #9E9E9E;
        cursor: not-allowed;
    }
    
    .emotion-status {
        margin-bottom: 8px;
        font-size: 14px;
        color: green;
    }
    
    .emotion-bar-container {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        overflow: hidden;
    }
    
    .emotion-bar {
        height: 100%;
        width: 0%;
        background: #4CAF50;
        transition: width 0.3s ease, background-color 0.3s ease;
    }
    
    /* 悬浮窗口样式 */
    .emotion-floating-window {
        position: fixed;
        width: 320px;
        height: 240px;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 8px;
        color: white;
        font-family: Arial, sans-serif;
        z-index: 9999; /* 提高z-index确保在最上层 */
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        overflow: hidden;
    }
    
    .floating-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.5);
        cursor: move;
    }
    
    .floating-header h3 {
        margin: 0;
        font-size: 14px;
    }
    
    .floating-header button {
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 14px;
        padding: 0 5px;
    }
    
    .floating-header button:hover {
        color: #4CAF50;
    }
    
    .floating-content {
        padding: 10px;
        height: calc(100% - 40px);
        display: flex;
        flex-direction: column;
    }
    
    #floating-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 4px;
    }
    `;
    document.head.appendChild(style);
}
