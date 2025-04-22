document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面功能
    initBackgroundEffect();
    initButtonEvents();
    animateGuideSteps();
});

/**
 * 初始化背景效果
 */
function initBackgroundEffect() {
    const bgLayer = document.querySelector('.bg-layer');
    if (!bgLayer) return;
    
    // 创建背景点阵
    for (let i = 0; i < 50; i++) {
        const dot = document.createElement('div');
        dot.classList.add('bg-dot');
        dot.style.width = Math.random() * 10 + 5 + 'px';
        dot.style.height = dot.style.width;
        dot.style.left = Math.random() * 100 + '%';
        dot.style.top = Math.random() * 100 + '%';
        dot.style.opacity = Math.random() * 0.5;
        dot.style.backgroundColor = '#4CAF50';
        dot.style.borderRadius = '50%';
        dot.style.position = 'absolute';
        dot.style.transform = 'translate(-50%, -50%)';
        dot.style.transition = 'transform 0.3s ease-out';
        
        bgLayer.appendChild(dot);
    }
    
    // 添加视差效果
    document.addEventListener('mousemove', function(e) {
        const dots = document.querySelectorAll('.bg-dot');
        const moveX = (e.clientX - window.innerWidth / 2) / 50;
        const moveY = (e.clientY - window.innerHeight / 2) / 50;
        
        dots.forEach((dot, index) => {
            const factor = (index % 3 + 1) * 0.8;
            dot.style.transform = `translate(calc(-50% + ${moveX * factor}px), calc(-50% + ${moveY * factor}px))`;
        });
    });
}

/**
 * 初始化按钮事件
 */
function initButtonEvents() {
    const connectButton = document.getElementById('connect-device');
    const skipButton = document.getElementById('skip-setup');
    const nextButton = document.getElementById('next-step');
    const confirmSkipButton = document.querySelector('.btn-confirm');
    const cancelSkipButton = document.querySelector('.btn-cancel');
    const skipModal = document.querySelector('.modal');
    
    // 连接设备按钮
    if (connectButton) {
        connectButton.addEventListener('click', function() {
            simulateDeviceConnection();
        });
    }
    
    // 跳过设置按钮
    if (skipButton) {
        skipButton.addEventListener('click', function() {
            if (skipModal) skipModal.classList.add('show');
        });
    }
    
    // 下一步按钮
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            window.location.href = 'dashboard.html';
        });
    }
    
    // 确认跳过
    if (confirmSkipButton) {
        confirmSkipButton.addEventListener('click', function() {
            window.location.href = 'dashboard.html';
        });
    }
    
    // 取消跳过
    if (cancelSkipButton) {
        cancelSkipButton.addEventListener('click', function() {
            if (skipModal) skipModal.classList.remove('show');
        });
    }
}

/**
 * 模拟设备连接过程
 */
function simulateDeviceConnection() {
    const connectButton = document.getElementById('connect-device');
    const nextButton = document.getElementById('next-step');
    const connectionStatus = document.querySelector('.connection-status');
    const waitingText = document.querySelector('.waiting-text');
    const heartRateContainer = document.querySelector('.heart-rate-container');
    
    if (!connectButton || !connectionStatus) return;
    
    // 禁用连接按钮
    connectButton.disabled = true;
    connectButton.style.opacity = '0.5';
    connectButton.style.cursor = 'not-allowed';
    
    // 显示连接状态
    connectionStatus.classList.add('visible');
    connectionStatus.innerHTML = '<div class="spinner"></div><span>正在连接设备...</span>';
    
    // 模拟连接过程
    setTimeout(function() {
        const isSuccess = Math.random() > 0.3; // 70%的成功率
        
        if (isSuccess) {
            connectionStatus.classList.add('success');
            connectionStatus.innerHTML = '<i class="success-icon">✓</i> 设备连接成功';
            
            // 显示心率图
            if (waitingText && heartRateContainer) {
                waitingText.style.display = 'none';
                heartRateContainer.style.display = 'block';
                drawHeartRateGraph();
            }
            
            // 显示下一步按钮
            if (nextButton) {
                nextButton.style.display = 'block';
            }
        } else {
            connectionStatus.classList.add('error');
            connectionStatus.innerHTML = '<i class="error-icon">✗</i> 连接失败，请检查设备并重试';
            
            // 重新启用连接按钮
            connectButton.disabled = false;
            connectButton.style.opacity = '1';
            connectButton.style.cursor = 'pointer';
        }
    }, 3000);
}

/**
 * 绘制心率图
 */
function drawHeartRateGraph() {
    const svg = document.querySelector('.heart-rate-svg');
    if (!svg) return;
    
    // 设置SVG视口
    svg.setAttribute('viewBox', '0 0 1000 200');
    
    // 创建初始路径
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0,100 L0,100');
    path.setAttribute('stroke', '#4CAF50');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);
    
    // 创建心率数据点
    let data = [];
    for (let i = 0; i < 100; i++) {
        data.push(100); // 初始基线值
    }
    
    // 动态更新心率图
    let lastX = 0;
    const updateInterval = setInterval(() => {
        // 模拟心率数据
        const newValue = simulateHeartBeat(data[data.length - 1]);
        data.push(newValue);
        
        // 保持固定长度
        if (data.length > 100) {
            data.shift();
        }
        
        // 更新路径
        let pathData = '';
        const step = 1000 / (data.length - 1);
        
        data.forEach((value, index) => {
            const x = index * step;
            const y = 200 - value;
            
            if (index === 0) {
                pathData = `M${x},${y}`;
            } else {
                pathData += ` L${x},${y}`;
            }
        });
        
        path.setAttribute('d', pathData);
        
        // 更新心率显示
        const heartRateDisplay = document.querySelector('.heart-rate-display');
        if (heartRateDisplay) {
            const heartRate = Math.round(60 + Math.random() * 40);
            heartRateDisplay.textContent = heartRate;
        }
    }, 100);
}

/**
 * 模拟心跳波形数据
 */
function simulateHeartBeat(lastValue) {
    // 基础值：模拟平稳的心跳线
    let value = lastValue;
    
    // 随机波动
    const randomFactor = Math.random() * 4 - 2;
    value += randomFactor;
    
    // 模拟心跳
    if (Math.random() > 0.95) { // 随机产生心跳波形
        value = 60; // 基线
        setTimeout(() => value = 140, 50); // 峰值
        setTimeout(() => value = 80, 100); // 回落
        setTimeout(() => value = 100, 150); // 恢复
    }
    
    // 限制范围
    value = Math.max(60, Math.min(140, value));
    
    return value;
}

/**
 * 动画显示指南步骤
 */
function animateGuideSteps() {
    const steps = document.querySelectorAll('.device-guide li');
    
    steps.forEach((step, index) => {
        setTimeout(() => {
            step.style.opacity = '1';
            step.style.transform = 'translateX(0)';
        }, index * 200);
    });
} 