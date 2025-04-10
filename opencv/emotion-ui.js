// 全局变量
let emotionRecognition;
let isRecognitionActive = false;
let videoElement;
let floatingVideoElement;
let canvasElement;
let currentEmotionText;
let emotionBar;
let statusDot; // 状态指示点
let floatingWindow; // 悬浮窗口元素
let isFloatingWindowVisible = true; // 悬浮窗口是否可见
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
        statusDot = document.getElementById('recognition-status-dot');
        currentEmotionText = document.getElementById('current-emotion');
        emotionBar = document.getElementById('emotion-bar');
        
        if (!floatingVideoElement || !canvasElement || !statusDot || !currentEmotionText || !emotionBar) {
            throw new Error('找不到所需UI元素');
        }
        
        // 设置状态点初始状态
        updateStatusDot('yellow'); // 初始化中为黄色
        statusDot.style.cursor = 'not-allowed'; // 初始化时不可点击
        
        // 尝试获取摄像头权限
        console.log('请求摄像头权限...');
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 }, // 增大视频分辨率
                height: { ideal: 960 },
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
        
        // 设置状态点点击事件
        statusDot.addEventListener('click', toggleEmotionRecognition);
        
        // 监听表情识别事件
        document.addEventListener('emotionDetected', onEmotionDetected);
        
        // 初始化表情识别
        console.log('初始化表情识别...');
        await initEmotionRecognition();
        
        // 初始化完成后自动开始识别
        if (!isRecognitionActive && emotionRecognition) {
            toggleEmotionRecognition();
        }
        
    } catch (err) {
        console.error('初始化失败:', err);
        alert('初始化失败: ' + err.message);
        return;
    }
}

// 更新状态指示点颜色和状态
function updateStatusDot(color) {
    if (statusDot) {
        statusDot.style.backgroundColor = color;
        if (color === 'yellow') {
            statusDot.style.cursor = 'not-allowed';
        } else {
            statusDot.style.cursor = 'pointer';
        }
    }
}

// 显示悬浮窗口
function showFloatingWindow() {
    floatingWindow.style.display = 'block';
    isFloatingWindowVisible = true;
    
    // 设置悬浮窗口位置（固定在右上角）
    floatingWindow.style.right = '20px';
    floatingWindow.style.top = '20px';
    
    // 设置视频和画布尺寸（放大两倍）
    const floatingWidth = 640; // 原来的320 * 2
    const floatingHeight = 480; // 原来的240 * 2
    floatingVideoElement.width = floatingWidth - 40;
    floatingVideoElement.height = floatingHeight - 100;
    canvasElement.width = floatingVideoElement.width;
    canvasElement.height = floatingVideoElement.height;
    
    // 确保摄像头流传递到悬浮窗口视频元素
    if (floatingVideoElement.srcObject === null && videoElement.srcObject) {
        floatingVideoElement.srcObject = videoElement.srcObject;
    }
}

// 初始化表情识别
async function initEmotionRecognition() {
    if (isInitializing) {
        console.log('表情识别模块已在初始化中，跳过');
        return;
    }
    
    isInitializing = true;
    updateStatusDot('yellow');
    
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
            updateStatusDot('red');
            return true;
        } else {
            console.error('表情识别模块初始化失败');
            updateStatusDot('red');
            return false;
        }
    } catch (error) {
        console.error('初始化表情识别时出错:', error);
        updateStatusDot('red');
        return false;
    } finally {
        isInitializing = false;
    }
}

// 切换表情识别
function toggleEmotionRecognition() {
    if (!emotionRecognition || isInitializing) {
        console.error('表情识别模块未初始化或正在初始化中');
        return;
    }
    
    isRecognitionActive = !isRecognitionActive;
    
    if (isRecognitionActive) {
        // 启动表情识别
        console.log('开始表情识别');
        emotionRecognition.start();
        updateStatusDot('green'); // 识别中为绿色
    } else {
        // 停止表情识别
        console.log('停止表情识别');
        emotionRecognition.stop();
        updateStatusDot('red'); // 未识别为红色
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
        left: 10px;
        width: 200px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 8px;
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
        color: #4CAF50;
    }
    
    .emotion-status {
        margin-bottom: 8px;
        font-size: 14px;
        color: #4CAF50;
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
    
    /* 状态指示点 */
    .status-indicator {
        display: flex;
        align-items: center;
    }
    
    .status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: red;
        margin-right: 8px;
        display: inline-block;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .status-dot:hover {
        transform: scale(1.2);
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }
    
    /* 悬浮窗口样式 */
    .emotion-floating-window {
        position: fixed;
        width: 480px; /* 原来的320 * 2 */
        height: 360px; /* 原来的240 * 2 */
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 8px;
        color: white;
        font-family: Arial, sans-serif;
        z-index: 9999;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        box-sizing: border-box;
    }
    
    .floating-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.5);
    }
    
    .floating-header h3 {
        margin: 0;
        font-size: 14px;
        color: white;
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
    
    .floating-header button.active {
        color: #4CAF50;
    }
    
    .floating-header button:disabled {
        color: #9E9E9E;
        cursor: not-allowed;
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
