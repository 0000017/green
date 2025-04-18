// 全局变量
let emotionRecognition;
let isRecognitionActive = false;
// 避免重复声明，先检查变量是否已存在
// let videoElement;
let floatingVideoElement;
let canvasElement;
let currentEmotionText;
let emotionBar;
let statusDot; // 状态指示点
let panelStatusDot; // 面板状态指示点
let floatingWindow; // 悬浮窗口元素
let isFloatingWindowVisible = true; // 悬浮窗口是否可见
let isInitializing = false; // 是否正在初始化

// 初始化函数
async function init() {
    console.log('初始化表情识别UI...');
    // 主视频元素（用于WebRTC）
    // 如果全局变量已存在，使用它；否则重新获取元素
    if (typeof videoElement === 'undefined') {
        videoElement = document.getElementById('videoStream');
    }
    
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
        panelStatusDot = document.getElementById('panel-status-dot');
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
        if (panelStatusDot) {
            panelStatusDot.addEventListener('click', toggleEmotionRecognition);
        }
        
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
    // 更新主状态点
    if (statusDot) {
        statusDot.style.backgroundColor = color;
        if (color === 'yellow') {
            statusDot.style.cursor = 'not-allowed';
        } else {
            statusDot.style.cursor = 'pointer';
        }
    }
    
    // 更新面板状态点
    if (panelStatusDot) {
        panelStatusDot.style.backgroundColor = color;
        if (color === 'yellow') {
            panelStatusDot.style.cursor = 'not-allowed';
        } else {
            panelStatusDot.style.cursor = 'pointer';
        }
        
        // 更新面板header样式 - 类似生物传感器UI
        const panelHeader = panelStatusDot.closest('.panel-header');
        if (panelHeader) {
            // 移除所有状态类
            panelHeader.classList.remove('connected', 'error', 'connecting');
            
            // 根据颜色添加对应状态类
            if (color === 'green') {
                panelHeader.classList.add('connected');
            } else if (color === 'red') {
                panelHeader.classList.add('error');
            } else if (color === 'yellow') {
                panelHeader.classList.add('connecting');
            }
        }
    }
}

// 显示悬浮窗口
function showFloatingWindow() {
    floatingWindow.style.display = 'block';
    isFloatingWindowVisible = true;
    
    // 设置视频和画布尺寸
    const floatingWidth = floatingWindow.clientWidth || 480;
    const floatingHeight = floatingWindow.clientHeight || 360;
    
    // 调整视频和画布大小，确保比例合适
    const videoContainerWidth = floatingWidth;
    const videoContainerHeight = floatingHeight - 40; // 减去header高度
    
    if (floatingVideoElement) {
        floatingVideoElement.width = videoContainerWidth - 20; // 减去内边距
        floatingVideoElement.height = videoContainerHeight - 60; // 留出空间给emotion-panel
    }
    
    if (canvasElement) {
        canvasElement.width = floatingVideoElement.width;
        canvasElement.height = floatingVideoElement.height;
    }
    
    // 确保摄像头流传递到悬浮窗口视频元素
    if (floatingVideoElement.srcObject === null && videoElement && videoElement.srcObject) {
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
        
        // 移除所有情感类型的颜色类
        currentEmotionText.className = '';
        // 添加对应情感类型的颜色类
        currentEmotionText.classList.add(`emotion-${emotion}`);
    }
    
    if (emotionBar) {
        emotionBar.style.width = `${Math.round(confidence * 100)}%`;
        
        // 根据表情设置不同的颜色
        const colors = {
            '开心': '#4fd1c5', // 青色
            '悲伤': '#63b3ed', // 蓝色
            '愤怒': '#f6ad55', // 橙色
            '惊讶': '#9f7aea', // 紫色
            '恐惧': '#fc8181', // 红色
            '厌恶': '#68d391', // 绿色
            '中性': '#cbd5e0', // 灰色
            '未检测': '#a0aec0' // 暗灰色
        };
        
        const color = colors[emotion] || '#a0aec0';
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
        width: calc(100% - 20px);
        background-color: rgba(26, 26, 26, 0.9);
        border-radius: 4px;
        padding: 10px;
        font-family: Arial, sans-serif;
        z-index: 100;
        color: #e0e0e0;
    }
    
    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        padding: 4px 8px;
        border-radius: 4px;
        background-color: #333;
        transition: all 0.3s ease;
    }
    
    .panel-header h3 {
        margin: 0;
        font-size: 12px;
        color: #ccc;
    }
    
    /* 状态样式 - 与生物传感器UI一致 */
    .panel-header.connected {
        background-color: #2b593f;
    }
    
    .panel-header.connected h3 {
        color: #a3ffd7;
    }
    
    .panel-header.error {
        background-color: #592b2b;
    }
    
    .panel-header.error h3 {
        color: #ffa3a3;
    }
    
    .panel-header.connecting {
        background-color: #594b2b;
    }
    
    .panel-header.connecting h3 {
        color: #ffe3a3;
    }
    
    .emotion-status {
        margin-bottom: 8px;
        font-size: 16px;
        font-weight: bold;
    }
    
    .emotion-bar-container {
        width: 100%;
        height: 6px;
        background: rgba(26, 26, 26, 0.7);
        border-radius: 3px;
        overflow: hidden;
    }
    
    .emotion-bar {
        height: 100%;
        width: 0%;
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
    
    /* 悬浮窗口样式 - 适应容器布局 */
    .emotion-floating-window {
        width: 100%;
        height: 360px;
        background-color: #1a1a1a;
        border-radius: 8px;
        color: #e0e0e0;
        font-family: Arial, sans-serif;
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        box-sizing: border-box;
        border: 2px solid #333;
    }
    
    .floating-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 8px;
        background-color: #333;
        margin-bottom: 8px;
    }
    
    .floating-header h3 {
        margin: 0;
        font-size: 12px;
        color: #ccc;
    }
    
    .floating-header button {
        background: transparent;
        border: none;
        color: #e0e0e0;
        cursor: pointer;
        font-size: 14px;
        padding: 0 5px;
    }
    
    .floating-header button:hover {
        color: #4fd1c5;
    }
    
    .floating-header button.active {
        color: #4fd1c5;
    }
    
    .floating-header button:disabled {
        color: #555;
        cursor: not-allowed;
    }
    
    .floating-content {
        padding: 0;
        height: calc(100% - 36px);
        display: flex;
        flex-direction: column;
    }
    
    #floating-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    /* 情感类型颜色映射 */
    .emotion-开心 { color: #4fd1c5; }
    .emotion-悲伤 { color: #63b3ed; }
    .emotion-愤怒 { color: #f6ad55; }
    .emotion-惊讶 { color: #9f7aea; }
    .emotion-恐惧 { color: #fc8181; }
    .emotion-厌恶 { color: #68d391; }
    .emotion-中性 { color: #cbd5e0; }
    .emotion-未检测 { color: #a0aec0; }
    
    /* 情感分析系统容器 */
    .emotion-analysis-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    `;
    document.head.appendChild(style);
}
