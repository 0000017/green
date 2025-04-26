// 设备调试界面的脚本

// 初始化标志，防止重复初始化
window.deviceSetupInitialized = false;

// 将所有初始化逻辑封装到一个函数中
function initDeviceSetup() {
    console.log('初始化设备调试页面...');
    
    // 调试开关
    const DEBUG = false;
    
    // 获取DOM元素
    const devicePages = document.querySelectorAll('.device-page');
    const stepDots = document.querySelectorAll('.step-dot');
    const prevButton = document.getElementById('prev-step');
    const nextButton = document.getElementById('next-step');
    const skipButton = document.getElementById('skip-setup');
    const modal = document.querySelector('.modal');
    const btnCancel = document.querySelector('.btn-cancel');
    const btnConfirm = document.querySelector('.btn-confirm');
    const connectButtons = document.querySelectorAll('.connect-btn');
    
    // 检查关键元素是否存在
    if (!devicePages.length || !stepDots.length || !prevButton || !nextButton || !skipButton) {
        console.log('页面元素未找到，等待100ms后重试');
        setTimeout(initDeviceSetup, 100);
        return;
    }
    
    // 全局变量
    const totalSteps = devicePages.length;
    let currentStep = 0;
    
    // 设备连接状态
    const deviceStatus = [false, false, false, false];
    
    // 调试输出函数
    function debug(message) {
        if (!DEBUG) return;
        console.log(`[设备页面] ${message}`);
    }
    
    // 初始化函数
    function init() {
        debug('设备调试页面初始化');
        
        // 确保首个设备页面显示
        showPage(0);
        
        // 添加事件监听
        addEventListeners();
        
        debug('设备调试页面初始化完成');
    }
    
    // 添加所有事件监听器
    function addEventListeners() {
        // 下一步按钮
        nextButton.addEventListener('click', function() {
            debug('点击下一步按钮');
            if (currentStep < totalSteps - 1) {
                showPage(currentStep + 1);
            } else {
                completeSetup();
            }
        });
        
        // 上一步按钮
        prevButton.addEventListener('click', function() {
            debug('点击上一步按钮');
            if (currentStep > 0) {
                showPage(currentStep - 1);
            }
        });
        
        // 跳过按钮
        skipButton.addEventListener('click', function() {
            debug('点击跳过按钮');
            modal.classList.add('show');
        });
        
        // 模态框取消按钮
        btnCancel.addEventListener('click', function() {
            debug('点击取消按钮');
            modal.classList.remove('show');
        });
        
        // 模态框确认按钮
        btnConfirm.addEventListener('click', function() {
            debug('点击确认按钮');
            modal.classList.remove('show');
            completeSetup();
        });
        
        // 步骤指示器点击
        stepDots.forEach(function(dot, index) {
            dot.addEventListener('click', function() {
                debug(`点击步骤指示点: ${index}`);
                showPage(index);
            });
        });
        
        // 连接设备按钮
        connectButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                const deviceIndex = parseInt(this.getAttribute('data-device'));
                debug(`连接设备按钮点击: 设备${deviceIndex}`);
                connectDevice(deviceIndex);
            });
        });
    }
    
    // 显示指定页面
    function showPage(index) {
        debug(`显示页面: ${index}`);
        
        // 更新当前步骤
        currentStep = index;
        
        // 隐藏所有页面
        devicePages.forEach(function(page) {
            page.classList.remove('active-device-page');
        });
        
        // 显示当前页面
        if (devicePages[index]) {
            devicePages[index].classList.add('active-device-page');
        } else {
            debug(`错误: 页面索引${index}不存在`);
            return;
        }
        
        // 更新步骤指示器
        stepDots.forEach(function(dot) {
            dot.classList.remove('active');
        });
        
        if (stepDots[index]) {
            stepDots[index].classList.add('active');
        }
        
        // 更新按钮状态
        updateButtonState();
    }
    
    // 更新按钮状态
    function updateButtonState() {
        // 第一步隐藏上一步按钮
        prevButton.style.display = currentStep === 0 ? 'none' : 'block';
        
        // 最后一步显示完成按钮
        nextButton.textContent = currentStep === totalSteps - 1 ? '完成' : '下一步';
    }
    
    // 设置完成处理
    function completeSetup() {
        debug('设置完成');
        
        // 导航到下一个页面
        if (window.parent && window.parent.navigateToPage) {
            // 如果作为子页面，使用父窗口的导航系统
            window.parent.navigateToPage('drawing-preset-page');
        } else {
            // 作为独立页面
            window.location.href = 'drawing-preset.html';
        }
    }
    
    // 连接设备
    function connectDevice(deviceIndex) {
        // 获取相应的设备容器
        const container = devicePages[deviceIndex].querySelector('.device-container');
        const statusIndicator = container.querySelector('.connection-status');
        const waitingText = container.querySelector('.waiting-text');
        
        // 更新连接状态文本
        waitingText.textContent = '正在连接...';
        
        // 模拟连接过程
        setTimeout(function() {
            // 更新状态
            deviceStatus[deviceIndex] = true;
            statusIndicator.classList.add('connected');
            waitingText.textContent = '设备已连接';
            
            // 根据设备类型显示不同界面
            switch(deviceIndex) {
                case 0:
                    showHeartRateData(container);
                    break;
                case 1:
                    showSkinData(container);
                    break;
                case 2:
                    showCameraFeed(container);
                    break;
                case 3:
                    showTabletCanvas(container);
                    break;
            }
            
            debug(`设备${deviceIndex}已连接`);
        }, 1500);
    }
    
    // 显示心率数据
    function showHeartRateData(container) {
        const dataContainer = container.querySelector('.heart-rate-container');
        const display = container.querySelector('.heart-rate-display');
        const svg = container.querySelector('.heart-rate-svg');
        
        // 显示数据容器
        dataContainer.style.display = 'block';
        
        // 模拟心率数据
        let heartRate = 72;
        
        // 定时更新心率数据
        const interval = setInterval(function() {
            // 检查元素是否仍在DOM中
            if (!document.contains(display)) {
                clearInterval(interval);
                return;
            }
            
            // 生成随机波动
            const variation = Math.floor(Math.random() * 5) - 2;
            heartRate = Math.max(60, Math.min(100, heartRate + variation));
            
            // 更新显示
            display.textContent = heartRate;
            
            // 更新心率图
            updateHeartRateGraph(svg, heartRate);
        }, 1000);
    }
    
    // 更新心率图
    function updateHeartRateGraph(svg, heartRate) {
        // 检查SVG是否存在
        if (!svg || !document.contains(svg)) return;
        
        // 简单实现，实际项目中可能需要更复杂的图表库
        svg.innerHTML = '';
        
        // 创建一个简单的心率线
        const svgNS = "http://www.w3.org/2000/svg";
        const path = document.createElementNS(svgNS, "path");
        
        // 生成一个简单的心率波形
        let d = "M0,50";
        for (let i = 0; i < 10; i++) {
            const x1 = i * 30;
            const x2 = x1 + 10;
            const x3 = x1 + 15;
            const x4 = x1 + 20;
            const x5 = x1 + 30;
            
            const intensity = (heartRate - 60) / 40; // 0-1范围
            const height = 30 + intensity * 20;
            
            d += ` L${x1},50 L${x2},${50-height} L${x3},${50+height/2} L${x4},${50-height/3} L${x5},50`;
        }
        
        path.setAttribute("d", d);
        path.setAttribute("stroke", "#B7FE5D");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("fill", "none");
        
        svg.appendChild(path);
    }
    
    // 显示皮电数据
    function showSkinData(container) {
        const dataContainer = container.querySelector('.skin-data-container');
        const display = container.querySelector('.skin-data-display');
        const svg = container.querySelector('.skin-data-svg');
        
        // 显示数据容器
        dataContainer.style.display = 'block';
        
        // 模拟皮电数据
        let skinData = 3.5;
        
        // 定时更新皮电数据
        const interval = setInterval(function() {
            // 检查元素是否仍在DOM中
            if (!document.contains(display)) {
                clearInterval(interval);
                return;
            }
            
            // 生成随机波动
            const variation = (Math.random() * 0.4) - 0.2;
            skinData = Math.max(1, Math.min(10, skinData + variation));
            
            // 更新显示
            display.textContent = skinData.toFixed(1);
            
            // 更新皮电图
            updateSkinDataGraph(svg, skinData);
        }, 1000);
    }
    
    // 更新皮电图
    function updateSkinDataGraph(svg, skinData) {
        // 检查SVG是否存在
        if (!svg || !document.contains(svg)) return;
        
        // 简单实现，类似心率图但波形不同
        svg.innerHTML = '';
        
        const svgNS = "http://www.w3.org/2000/svg";
        const path = document.createElementNS(svgNS, "path");
        
        // 生成一个简单的皮电波形
        let d = "M0,50";
        
        for (let i = 0; i < 100; i++) {
            const x = i * 3;
            // 平滑的波形
            const intensity = (skinData - 1) / 9; // 0-1范围
            const variation = Math.sin(i * 0.1) * 5 * intensity;
            const y = 50 - (intensity * 30) - variation;
            
            // 平滑过渡
            d += ` L${x},${y}`;
        }
        
        path.setAttribute("d", d);
        path.setAttribute("stroke", "#13F88B");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("fill", "none");
        
        svg.appendChild(path);
    }
    
    // 显示摄像头预览
    function showCameraFeed(container) {
        const dataContainer = container.querySelector('.camera-container');
        const video = document.getElementById('camera-preview');
        const emotionDisplay = container.querySelector('.emotion-display');
        
        // 显示数据容器
        dataContainer.style.display = 'block';
        
        // 请求摄像头权限并显示预览
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(function(stream) {
                    if (video && document.contains(video)) {
                        video.srcObject = stream;
                        
                        // 模拟情绪识别
                        setTimeout(function() {
                            simulateEmotionDetection(emotionDisplay);
                        }, 2000);
                    } else {
                        // 安全地关闭流
                        stream.getTracks().forEach(track => track.stop());
                    }
                })
                .catch(function(error) {
                    console.error("摄像头访问失败:", error);
                    if (dataContainer && document.contains(dataContainer)) {
                        dataContainer.innerHTML = "<p>无法访问摄像头。请检查权限设置。</p>";
                    }
                });
        } else {
            if (dataContainer && document.contains(dataContainer)) {
                dataContainer.innerHTML = "<p>您的浏览器不支持摄像头功能。</p>";
            }
        }
    }
    
    // 模拟情绪识别
    function simulateEmotionDetection(display) {
        if (!display || !document.contains(display)) return;
        
        const emotions = ['平静', '开心', '专注', '思考'];
        
        // 定时改变情绪显示
        const interval = setInterval(function() {
            if (!document.contains(display)) {
                clearInterval(interval);
                return;
            }
            
            const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
            display.textContent = randomEmotion;
        }, 3000);
    }
    
    // 显示数位板画布
    function showTabletCanvas(container) {
        const dataContainer = container.querySelector('.tablet-container');
        const canvas = document.getElementById('tablet-canvas');
        const pressureDisplay = container.querySelector('.pressure-value');
        const clearBtn = container.querySelector('.clear-btn');
        
        if (!canvas || !dataContainer) {
            debug('错误: 无法找到数位板相关元素');
            return;
        }
        
        // 显示数据容器
        dataContainer.style.display = 'block';
        
        try {
            const ctx = canvas.getContext('2d');
            
            // 设置画布尺寸
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            
            // 清除画布
            clearBtn.addEventListener('click', function() {
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            });
            
            // 绘画变量
            let isDrawing = false;
            let lastX = 0;
            let lastY = 0;
            
            // 开始绘画
            canvas.addEventListener('mousedown', function(e) {
                isDrawing = true;
                [lastX, lastY] = [e.offsetX, e.offsetY];
            });
            
            // 移动时绘画
            canvas.addEventListener('mousemove', function(e) {
                if (!isDrawing) return;
                
                // 模拟压力值
                const pressure = Math.random() * 0.5 + 0.5; // 0.5到1.0之间
                if (pressureDisplay && document.contains(pressureDisplay)) {
                    pressureDisplay.textContent = pressure.toFixed(2);
                }
                
                // 设置线条宽度基于压力
                ctx.lineWidth = pressure * 5;
                ctx.lineCap = 'round';
                ctx.strokeStyle = '#141F14';
                
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(e.offsetX, e.offsetY);
                ctx.stroke();
                
                [lastX, lastY] = [e.offsetX, e.offsetY];
            });
            
            // 停止绘画
            canvas.addEventListener('mouseup', () => isDrawing = false);
            canvas.addEventListener('mouseout', () => isDrawing = false);
            
            // 触摸设备支持
            canvas.addEventListener('touchstart', function(e) {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                canvas.dispatchEvent(mouseEvent);
            });
            
            canvas.addEventListener('touchmove', function(e) {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                canvas.dispatchEvent(mouseEvent);
            });
            
            canvas.addEventListener('touchend', function(e) {
                e.preventDefault();
                const mouseEvent = new MouseEvent('mouseup', {});
                canvas.dispatchEvent(mouseEvent);
            });
        } catch (err) {
            debug(`数位板初始化错误: ${err.message}`);
        }
    }
    
    // 启动初始化
    init();
    
    // 标记初始化完成
    window.deviceSetupInitialized = true;
    console.log('设备调试页面初始化完成');
}

// 检查当前是否为device-setup页面
function checkAndInitDeviceSetup() {
    // 检查页面标识或URL
    const isDeviceSetupPage = (window.location.href.includes('device-setup.html') || 
                            document.body.classList.contains('device-setup-page') ||
                            document.getElementById('device-setup-page') && 
                            document.getElementById('device-setup-page').classList.contains('active-page'));
    
    if (isDeviceSetupPage && !window.deviceSetupInitialized) {
        console.log('检测到设备调试页面激活，主动初始化');
        initDeviceSetup();
    }
}

// 监听DOMContentLoaded事件（当作为独立页面加载时）
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已初始化过
    if (!window.deviceSetupInitialized) {
        console.log('DOMContentLoaded: 初始化设备调试页面');
        initDeviceSetup();
    }
    
    // 添加MutationObserver监听DOM变化
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' || mutation.type === 'childList') {
                checkAndInitDeviceSetup();
            }
        });
    });
    
    // 开始观察document.body的变化，包括子节点和属性
    observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
});

// 监听pageLoaded事件（当作为子页面加载时）
window.addEventListener('pageLoaded', function(event) {
    if (event.detail && event.detail.pageId === 'device-setup-page' && !window.deviceSetupInitialized) {
        console.log('pageLoaded: 初始化设备调试页面');
        // 设置短延迟确保DOM元素已加载
        setTimeout(initDeviceSetup, 50);
    }
});

// 初始检查，用于处理可能错过的pageLoaded事件
setTimeout(checkAndInitDeviceSetup, 500); 