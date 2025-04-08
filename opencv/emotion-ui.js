// const { ipcRenderer } = require('electron');
const EmotionRecognition = require('./emotion-recognition');

// 全局变量
let emotionRecognition;
let isRecognitionActive = false;
let videoElement;
let canvasElement;
let toggleButton;
let currentEmotionText;
let emotionBar;
let floatingToggleButton; // 悬浮窗口的切换按钮

// 初始化函数
function init() {
    videoElement = document.getElementById('videoStream');
    canvasElement = document.getElementById('outputCanvas');
    toggleButton = document.getElementById('toggle-emotion-btn');
    currentEmotionText = document.getElementById('current-emotion');
    emotionBar = document.getElementById('emotion-bar');
    floatingToggleButton = document.getElementById('floating-toggle-btn'); // 获取悬浮窗口按钮
    
    // 创建表情识别实例
    emotionRecognition = new EmotionRecognition();
    
    // 设置OpenCV准备就绪的回调
    window.cvReady = onCvReady;
    
    // 设置按钮点击事件
    toggleButton.addEventListener('click', toggleEmotionRecognition);
    
    // 监听表情识别事件
    document.addEventListener('emotionDetected', onEmotionDetected);
}

// OpenCV准备就绪
async function onCvReady() {
    console.log('OpenCV.js已加载，初始化表情识别模块...');
    
    // 确保视频元素已就绪
    if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
        initEmotionRecognition();
    } else {
        videoElement.addEventListener('loadeddata', initEmotionRecognition);
    }
}

// 初始化表情识别
async function initEmotionRecognition() {
    try {
        const initialized = await emotionRecognition.init(videoElement, canvasElement);
        if (initialized) {
            console.log('表情识别模块初始化成功');
            toggleButton.disabled = false;
            floatingToggleButton.disabled = false; // 启用悬浮窗口按钮
        } else {
            console.error('表情识别模块初始化失败');
            toggleButton.textContent = '无法初始化';
            toggleButton.disabled = true;
            floatingToggleButton.textContent = '无法初始化';
            floatingToggleButton.disabled = true;
        }
    } catch (error) {
        console.error('初始化表情识别时出错:', error);
        toggleButton.textContent = '初始化错误';
        toggleButton.disabled = true;
        floatingToggleButton.textContent = '初始化错误';
        floatingToggleButton.disabled = true;
    }
}

// 切换表情识别
function toggleEmotionRecognition() {
    if (!emotionRecognition || !emotionRecognition.initialized) {
        console.error('表情识别模块未初始化');
        return;
    }
    
    isRecognitionActive = !isRecognitionActive;
    
    if (isRecognitionActive) {
        // 启动表情识别
        emotionRecognition.start();
        toggleButton.textContent = '关闭识别';
        toggleButton.classList.add('active');
        floatingToggleButton.textContent = '关闭识别';
        floatingToggleButton.classList.add('active');
    } else {
        // 停止表情识别
        emotionRecognition.stop();
        toggleButton.textContent = '开启识别';
        toggleButton.classList.remove('active');
        floatingToggleButton.textContent = '开启识别';
        floatingToggleButton.classList.remove('active');
        currentEmotionText.textContent = '未检测';
        emotionBar.style.width = '0%';
    }
}

// 处理检测到的表情
function onEmotionDetected(event) {
    const { emotion, confidence } = event.detail;
    
    // 更新UI
    currentEmotionText.textContent = emotion;
    emotionBar.style.width = `${Math.round(confidence * 100)}%`;
    
    // 根据表情设置不同的颜色
    const colors = {
        '高兴': '#4CAF50', // 绿色
        '悲伤': '#2196F3', // 蓝色
        '生气': '#F44336', // 红色
        '惊讶': '#FF9800', // 橙色
        '恐惧': '#9C27B0', // 紫色
        '厌恶': '#795548', // 棕色
        '平静': '#607D8B', // 灰蓝色
        '未检测': '#9E9E9E' // 灰色
    };
    
    const color = colors[emotion] || '#9E9E9E';
    emotionBar.style.backgroundColor = color;
    
    // 向主进程发送情绪数据
    // ipcRenderer.send('emotion-data', { emotion, confidence });
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
        top: 20px;
        right: 20px;
        width: 250px;
        background: rgba(0, 0, 0, 0.7);
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
    `;
    document.head.appendChild(style);
}
