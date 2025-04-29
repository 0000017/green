/**
 * Green应用情感计算自适应预设页面脚本
 */

// 初始化标志，防止重复初始化
window.emotionPresetInitialized = false;

// 将初始化函数暴露为全局函数
function initEmotionPreset() {
    console.log('初始化情感计算预设页面...');
    
    // 检查是否已初始化
    if (window.emotionPresetInitialized) {
        console.log('情感计算预设页面已初始化，跳过');
        return;
    }
    
    // 页面元素检查，确保DOM已加载
    const prevButton = document.getElementById('prev-step');
    const nextButton = document.getElementById('next-step');
    
    // 如果DOM元素不存在，可能页面还未完全加载，等待一下再尝试
    if (!prevButton || !nextButton) {
        console.log('页面元素未找到，等待100ms后重试');
        setTimeout(initEmotionPreset, 100);
        return;
    }
    
    // 初始化步骤导航
    initStepNavigation();
    
    // 初始化基线测量页面
    initBaselineMeasurement();
    
    // 初始化画像与偏好页面
    initUserProfile();
    
    // 初始化自适应策略库页面
    initAdaptationStrategies();
    
    // 初始化多模态融合权重页面
    initFusionWeights();
    
    // 初始化反馈映射规则页面
    initFeedbackMapping();
    
    // 更新进度条初始状态
    updateProgressBar();
    
    // 标记已初始化
    window.emotionPresetInitialized = true;
    console.log('情感计算预设页面初始化完成');
}

// 重置页面状态的函数（在离开或重新进入页面时调用）
function resetEmotionPresetState() {
    console.log('重置情感计算预设页面状态...');
    
    // 重置初始化标志
    window.emotionPresetInitialized = false;
    
    // 重置基线测量状态
    if (window.epState) {
        window.epState.isBaselineMeasuring = false;
        
        // 清除可能存在的计时器
        if (window.epState.baselineTimer) {
            clearInterval(window.epState.baselineTimer);
            window.epState.baselineTimer = null;
        }
        
        // 重置当前步骤到第一步
        window.epState.currentStep = 1;
    }
    
    console.log('情感计算预设页面状态已重置');
}

// 检查当前是否为emotion-preset页面
function checkAndInitEmotionPreset() {
    // 检查页面标识或URL
    const isEmotionPresetPage = (window.location.href.includes('emotion-preset.html') || 
                               document.querySelector('.emotion-preset-container') !== null);
    
    if (isEmotionPresetPage && !window.emotionPresetInitialized) {
        console.log('检测到情感预设页面激活，主动初始化');
        initEmotionPreset();
    }
}

// 监听DOMContentLoaded事件（当作为独立页面加载时）
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已初始化过
    if (!window.emotionPresetInitialized) {
        console.log('DOMContentLoaded: 初始化情感预设页面');
        initEmotionPreset();
    }
    
    // 添加MutationObserver监听DOM变化
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' || mutation.type === 'childList') {
                checkAndInitEmotionPreset();
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
    if (event.detail && (event.detail.pageId === 'emotion-preset-page' || 
        event.detail.pageId === 'emotion-preset')) {
        console.log('pageLoaded: 初始化情感预设页面');
        // 重置页面状态，确保每次进入都能正确初始化
        resetEmotionPresetState();
        // 设置短延迟确保DOM元素已加载
        setTimeout(initEmotionPreset, 50);
    }
});

// 监听页面离开事件（由父窗口或导航系统触发）
window.addEventListener('pageUnloaded', function(event) {
    if (event.detail && (event.detail.pageId === 'emotion-preset-page' || 
        event.detail.pageId === 'emotion-preset')) {
        console.log('pageUnloaded: 清理情感预设页面状态');
        resetEmotionPresetState();
    }
});

// 初始检查，用于处理可能错过的pageLoaded事件
setTimeout(checkAndInitEmotionPreset, 500);

// 全局变量存储当前页面状态
const epState = {
    currentStep: 1,
    totalSteps: 5,
    isBaselineMeasuring: false,
    baselineTimer: null,
    baselineData: {
        heartRate: [],
        gsr: [],
        breath: []
    },
    fusionWeights: {
        facial: 35,
        heart: 25,
        gsr: 20,
        drawing: 15,
        env: 5
    }
};

// 添加全局epState对象以确保在任何地方都可以访问
window.epState = epState;

// 添加一个额外的函数，确保导航按钮事件被正确绑定
function ensureNavigationButtonsWork() {
    console.log('确保导航按钮工作正常...');
    
    const prevButton = document.getElementById('prev-step');
    const nextButton = document.getElementById('next-step');
    const finishButton = document.getElementById('finish-setup');
    
    if (!prevButton || !nextButton || !finishButton) {
        console.log('按钮元素未找到，等待100ms后重试');
        setTimeout(ensureNavigationButtonsWork, 100);
        return;
    }
    
    // 移除可能存在的旧事件监听器，避免重复绑定
    prevButton.removeEventListener('click', handlePrevButtonClick);
    nextButton.removeEventListener('click', handleNextButtonClick);
    finishButton.removeEventListener('click', handleFinishButtonClick);
    
    // 重新添加事件监听器
    prevButton.addEventListener('click', handlePrevButtonClick);
    nextButton.addEventListener('click', handleNextButtonClick);
    finishButton.addEventListener('click', handleFinishButtonClick);
    
    console.log('导航按钮事件已重新绑定');
}

// 处理前一步按钮点击
function handlePrevButtonClick() {
    console.log('前一步按钮被点击(全局处理函数)');
    if (epState.currentStep > 1) {
        navigateToStep(epState.currentStep - 1);
    }
}

// 处理下一步按钮点击
function handleNextButtonClick() {
    console.log('下一步按钮被点击(全局处理函数)');
    if (epState.currentStep < epState.totalSteps) {
        console.log('执行步骤跳转，当前步骤:', epState.currentStep, '目标步骤:', epState.currentStep + 1);
        navigateToStep(epState.currentStep + 1);
    } else {
        console.log('已经是最后一步，不能再前进');
    }
}

// 处理完成按钮点击
function handleFinishButtonClick() {
    console.log('完成设置按钮被点击(全局处理函数)');
    // 保存所有设置并跳转到应用主页面
    saveAllSettings();
    
    // 显示提示
    showToast('设置已保存，正在跳转到应用页面...');
    
    // 添加延迟后跳转到主应用页面
    setTimeout(() => {
        if (window.navigateToPage) {
            window.navigateToPage('main-app-page');
        } else if (window.parent && window.parent.navigateToPage) {
            window.parent.navigateToPage('main-app-page');
        } else {
            window.location.href = '../pages/main-app.html';
        }
        
        // 确保在导航离开后重置状态
        resetEmotionPresetState();
    }, 2000);
}

/**
 * 初始化步骤导航功能
 */
function initStepNavigation() {
    // 获取所有步骤指示器元素
    const stepIndicators = document.querySelectorAll('.ep-step');
    const prevButton = document.getElementById('prev-step');
    const nextButton = document.getElementById('next-step');
    const finishButton = document.getElementById('finish-setup');
    
    console.log('初始化步骤导航，按钮状态:', 
                prevButton ? '前一步按钮存在' : '前一步按钮不存在', 
                nextButton ? '下一步按钮存在' : '下一步按钮不存在',
                finishButton ? '完成按钮存在' : '完成按钮不存在');
    
    // 为步骤指示器添加点击事件
    stepIndicators.forEach(indicator => {
        indicator.addEventListener('click', function() {
            // 如果正在测量基线，不允许切换步骤
            if (epState.isBaselineMeasuring) {
                showToast('请先完成或取消基线测量');
                return;
            }
            
            const stepIndex = parseInt(this.getAttribute('data-step'));
            navigateToStep(stepIndex);
        });
    });
    
    // 移除可能存在的旧事件监听器，避免事件累积
    if (prevButton) {
        prevButton.removeEventListener('click', handlePrevButtonClick);
        prevButton.addEventListener('click', handlePrevButtonClick);
        console.log('前一步按钮事件重新绑定');
    }
    
    if (nextButton) {
        // 直接使用内联函数，确保事件被正确绑定
        nextButton.removeEventListener('click', handleNextButtonClick);
        nextButton.addEventListener('click', function(e) {
            console.log('下一步按钮被点击（内联处理函数）');
            e.preventDefault(); // 阻止默认行为
            e.stopPropagation(); // 阻止事件冒泡
            if (epState.currentStep < epState.totalSteps) {
                navigateToStep(epState.currentStep + 1);
            } else {
                console.log('已经是最后一步，不能再前进');
            }
            return false;
        });
        // 同时也绑定全局处理函数作为备份
        nextButton.addEventListener('click', handleNextButtonClick);
        console.log('下一步按钮事件重新绑定');
    }
    
    if (finishButton) {
        finishButton.removeEventListener('click', handleFinishButtonClick);
        finishButton.addEventListener('click', handleFinishButtonClick);
        console.log('完成按钮事件重新绑定');
    }
    
    // 添加额外的直接DOM事件监听
    document.addEventListener('click', function(e) {
        // 检查点击的元素是否是下一步按钮或其子元素
        if (nextButton && (e.target === nextButton || nextButton.contains(e.target))) {
            console.log('通过文档级事件捕获到下一步按钮点击');
            if (epState.currentStep < epState.totalSteps) {
                navigateToStep(epState.currentStep + 1);
            }
        }
    });
}

/**
 * 导航到指定步骤
 * @param {number} stepIndex - 步骤索引
 */
function navigateToStep(stepIndex) {
    console.log('navigateToStep函数被调用，目标步骤:', stepIndex);
    
    try {
        // 确保epState已定义
        if (!window.epState) {
            console.error('epState未定义');
            return;
        }
        
        // 更新当前步骤
        epState.currentStep = stepIndex;
        console.log('更新后的当前步骤:', epState.currentStep);
        
        // 更新步骤指示器
        const steps = document.querySelectorAll('.ep-step');
        console.log('找到', steps.length, '个步骤指示器');
        steps.forEach(step => {
            step.classList.toggle('active', parseInt(step.getAttribute('data-step')) === stepIndex);
        });
        
        // 更新内容页面
        const contents = document.querySelectorAll('.ep-step-content');
        console.log('找到', contents.length, '个内容页面');
        contents.forEach(content => {
            content.classList.toggle('active', content.id === `step-${stepIndex}`);
        });
        
        // 更新导航按钮
        const prevButton = document.getElementById('prev-step');
        const nextButton = document.getElementById('next-step');
        const finishButton = document.getElementById('finish-setup');
        
        console.log('按钮元素:', 
                    prevButton ? '前一步按钮存在' : '前一步按钮不存在', 
                    nextButton ? '下一步按钮存在' : '下一步按钮不存在', 
                    finishButton ? '完成按钮存在' : '完成按钮不存在');
        
        if (prevButton) prevButton.disabled = stepIndex === 1;
        if (nextButton) nextButton.style.display = stepIndex < epState.totalSteps ? 'block' : 'none';
        if (finishButton) finishButton.style.display = stepIndex === epState.totalSteps ? 'block' : 'none';
        
        console.log('按钮状态更新完成');
        
        // 更新进度条
        updateProgressBar();
    } catch (error) {
        console.error('navigateToStep函数执行出错:', error);
    }
}

// 确保navigateToStep是全局可访问的
window.navigateToStep = navigateToStep;

/**
 * 更新进度条
 */
function updateProgressBar() {
    const progressPercentage = (epState.currentStep / epState.totalSteps) * 100;
    document.querySelector('.ep-progress-fill').style.width = `${progressPercentage}%`;
}

/**
 * 初始化基线测量页面
 */
function initBaselineMeasurement() {
    const startButton = document.getElementById('start-baseline');
    const skipButton = document.getElementById('skip-baseline');
    
    // 为开始测量按钮添加事件
    startButton.addEventListener('click', function() {
        if (epState.isBaselineMeasuring) {
            // 如果正在测量，停止测量
            stopBaselineMeasurement();
            this.textContent = '开始测量';
            
            // 重置图表
            resetBaselineVisuals();
        } else {
            // 开始测量
            startBaselineMeasurement();
            this.textContent = '停止测量';
        }
    });
    
    // 为跳过按钮添加事件
    skipButton.addEventListener('click', function() {
        // 如果正在测量，停止测量
        if (epState.isBaselineMeasuring) {
            stopBaselineMeasurement();
            startButton.textContent = '开始测量';
        }
        
        // 使用默认基线数据
        useDefaultBaselineData();
        
        // 显示提示
        showToast('已使用默认基线数据');
        
        // 自动前进到下一步
        setTimeout(() => {
            navigateToStep(2);
        }, 1000);
    });
}

/**
 * 开始基线测量
 */
function startBaselineMeasurement() {
    epState.isBaselineMeasuring = true;
    
    // 更新状态指示
    const statusIcon = document.querySelector('.ep-status-icon');
    const statusText = document.querySelector('.ep-status-text');
    
    statusIcon.style.backgroundColor = '#FF4500'; // 红色表示正在测量
    statusIcon.style.boxShadow = '0 0 10px #FF4500';
    statusText.textContent = '测量中...';
    
    // 重置基线数据
    epState.baselineData = {
        heartRate: [],
        gsr: [],
        breath: []
    };
    
    // 重置计时器
    resetTimer();
    
    // 开始采集模拟数据
    collectBaselineData();
}

/**
 * 停止基线测量
 */
function stopBaselineMeasurement() {
    epState.isBaselineMeasuring = false;
    
    // 更新状态指示
    const statusIcon = document.querySelector('.ep-status-icon');
    const statusText = document.querySelector('.ep-status-text');
    
    statusIcon.style.backgroundColor = '#32CD32'; // 绿色表示测量完成
    statusIcon.style.boxShadow = '0 0 10px #32CD32';
    statusText.textContent = '测量完成';
    
    // 清除计时器
    if (epState.baselineTimer) {
        clearInterval(epState.baselineTimer);
        epState.baselineTimer = null;
    }
    
    // 计算基线数据平均值
    calculateBaselineAverages();
}

/**
 * 收集基线测量数据（模拟数据）
 */
function collectBaselineData() {
    let timeRemaining = 60; // 60秒测量时间
    
    // 更新定时器显示
    updateTimerDisplay(timeRemaining);
    
    // 设置定时器，每秒更新一次
    epState.baselineTimer = setInterval(() => {
        timeRemaining--;
        
        // 更新定时器显示
        updateTimerDisplay(timeRemaining);
        
        // 生成并显示模拟数据
        generateMockData();
        
        // 当计时结束时停止测量
        if (timeRemaining <= 0) {
            stopBaselineMeasurement();
            document.getElementById('start-baseline').textContent = '开始测量';
            
            // 显示提示
            showToast('基线测量完成');
            
            // 自动前进到下一步
            setTimeout(() => {
                navigateToStep(2);
            }, 1000);
        }
    }, 1000);
}

/**
 * 更新计时器显示
 * @param {number} seconds - 剩余秒数
 */
function updateTimerDisplay(seconds) {
    // 更新数字显示
    document.querySelector('.ep-timer-text').textContent = seconds;
    
    // 更新圆形进度
    const circumference = 2 * Math.PI * 45; // 圆的周长
    const dashOffset = circumference * (1 - seconds / 60);
    document.querySelector('.ep-timer-progress').style.strokeDashoffset = dashOffset;
}

/**
 * 重置计时器
 */
function resetTimer() {
    updateTimerDisplay(60);
}

/**
 * 生成模拟生理数据
 */
function generateMockData() {
    // 生成随机心率数据 (60-100)
    const heartRate = Math.floor(Math.random() * 20) + 65;
    epState.baselineData.heartRate.push(heartRate);
    
    // 生成随机皮电数据 (2-20)
    const gsr = (Math.random() * 8 + 5).toFixed(2);
    epState.baselineData.gsr.push(parseFloat(gsr));
    
    // 生成随机呼吸数据 (10-20)
    const breath = Math.floor(Math.random() * 5) + 13;
    epState.baselineData.breath.push(breath);
    
    // 更新数据流可视化
    updateDatastreamVisuals(heartRate, gsr, breath);
}

/**
 * 更新数据流可视化
 */
function updateDatastreamVisuals(heartRate, gsr, breath) {
    // 更新心率
    document.querySelector('#heart-rate-vis').style.setProperty('--width', `${(heartRate - 50) * 2}%`);
    document.querySelector('#heart-rate-vis + .ep-datastream-value').textContent = `${heartRate} BPM`;
    
    // 更新皮电
    document.querySelector('#gsr-vis').style.setProperty('--width', `${gsr * 5}%`);
    document.querySelector('#gsr-vis + .ep-datastream-value').textContent = `${gsr} μS`;
    
    // 更新呼吸
    document.querySelector('#breath-vis').style.setProperty('--width', `${breath * 5}%`);
    document.querySelector('#breath-vis + .ep-datastream-value').textContent = `${breath} /min`;
}

/**
 * 重置基线可视化
 */
function resetBaselineVisuals() {
    document.querySelector('#heart-rate-vis').style.setProperty('--width', '0%');
    document.querySelector('#heart-rate-vis + .ep-datastream-value').textContent = '-- BPM';
    
    document.querySelector('#gsr-vis').style.setProperty('--width', '0%');
    document.querySelector('#gsr-vis + .ep-datastream-value').textContent = '-- μS';
    
    document.querySelector('#breath-vis').style.setProperty('--width', '0%');
    document.querySelector('#breath-vis + .ep-datastream-value').textContent = '-- /min';
}

/**
 * 计算基线数据平均值
 */
function calculateBaselineAverages() {
    // 计算心率平均值
    const heartRateAvg = epState.baselineData.heartRate.reduce((sum, val) => sum + val, 0) / 
                          epState.baselineData.heartRate.length;
    
    // 计算皮电平均值
    const gsrAvg = epState.baselineData.gsr.reduce((sum, val) => sum + val, 0) / 
                   epState.baselineData.gsr.length;
    
    // 计算呼吸平均值
    const breathAvg = epState.baselineData.breath.reduce((sum, val) => sum + val, 0) / 
                       epState.baselineData.breath.length;
    
    // 保存到状态
    epState.baselineAvg = {
        heartRate: heartRateAvg.toFixed(1),
        gsr: gsrAvg.toFixed(2),
        breath: breathAvg.toFixed(1)
    };
    
    console.log('基线平均值:', epState.baselineAvg);
}

/**
 * 使用默认基线数据
 */
function useDefaultBaselineData() {
    epState.baselineAvg = {
        heartRate: '72.5',
        gsr: '7.80',
        breath: '14.2'
    };
    
    // 更新状态指示
    const statusIcon = document.querySelector('.ep-status-icon');
    const statusText = document.querySelector('.ep-status-text');
    
    statusIcon.style.backgroundColor = '#32CD32'; // 绿色表示完成
    statusIcon.style.boxShadow = '0 0 10px #32CD32';
    statusText.textContent = '使用默认值';
    
    console.log('使用默认基线数据:', epState.baselineAvg);
}

/**
 * 初始化用户画像与偏好页面
 */
function initUserProfile() {
    // 获取保存按钮
    const saveButton = document.getElementById('save-profile');
    
    // 为保存按钮添加事件
    saveButton.addEventListener('click', function() {
        // 收集表单数据
        const profileData = collectProfileData();
        
        // 保存数据
        epState.profileData = profileData;
        
        // 显示提示
        showToast('个人画像已保存');
        
        // 自动前进到下一步
        setTimeout(() => {
            navigateToStep(3);
        }, 1000);
    });
    
    // 初始化范围滑块显示
    initRangeSliders();
}

/**
 * 收集用户画像数据
 * @returns {Object} 用户画像数据
 */
function collectProfileData() {
    return {
        personalityType: document.getElementById('personality-type').value,
        stressSensitivity: document.getElementById('stress-sensitivity').value,
        preferences: {
            visual: document.getElementById('pref-visual').checked,
            sound: document.getElementById('pref-sound').checked,
            text: document.getElementById('pref-text').checked
        },
        intervention: document.querySelector('input[name="intervention"]:checked').value
    };
}

/**
 * 初始化范围滑块显示
 */
function initRangeSliders() {
    // 为所有范围滑块添加事件监听
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        // 初始显示值
        updateSliderValue(slider);
        
        // 添加事件监听器
        slider.addEventListener('input', function() {
            updateSliderValue(this);
        });
    });
}

/**
 * 更新滑块值显示
 * @param {HTMLElement} slider - 滑块元素
 */
function updateSliderValue(slider) {
    // 查找最近的显示数值的元素
    const valueDisplay = slider.parentElement.querySelector('span:last-child');
    if (valueDisplay) {
        // 特殊处理百分比值
        if (slider.id.includes('weight')) {
            const weightValue = document.querySelector(`.ep-weight-value[data-for="${slider.id}"]`) || 
                                slider.closest('.ep-weight-item').querySelector('.ep-weight-value');
            if (weightValue) {
                weightValue.textContent = `${slider.value}%`;
            }
        } else {
            valueDisplay.textContent = slider.value;
        }
    }
}

/**
 * 初始化自适应策略库页面
 */
function initAdaptationStrategies() {
    // 为所有策略切换开关添加事件
    document.querySelectorAll('.ep-strategy-toggle input').forEach(toggle => {
        toggle.addEventListener('change', function() {
            // 获取策略项
            const strategyItem = this.closest('.ep-strategy-item');
            
            // 根据开关状态更新样式
            if (this.checked) {
                strategyItem.style.opacity = '1';
            } else {
                strategyItem.style.opacity = '0.5';
            }
        });
    });
    
    // 为添加新策略按钮添加事件
    document.querySelector('.ep-add-strategy button').addEventListener('click', function() {
        showToast('此功能在演示中未实现');
    });
}

/**
 * 初始化多模态融合权重页面
 */
function initFusionWeights() {
    // 获取所有权重滑块
    const weightSliders = {
        facial: document.getElementById('facial-weight'),
        heart: document.getElementById('heart-weight'),
        gsr: document.getElementById('gsr-weight'),
        drawing: document.getElementById('drawing-weight'),
        env: document.getElementById('env-weight')
    };
    
    // 为所有权重滑块添加事件
    Object.keys(weightSliders).forEach(key => {
        const slider = weightSliders[key];
        
        slider.addEventListener('input', function() {
            // 更新权重值显示
            const valueDisplay = this.closest('.ep-weight-item').querySelector('.ep-weight-value');
            valueDisplay.textContent = `${this.value}%`;
            
            // 更新状态中的权重值
            epState.fusionWeights[key] = parseInt(this.value);
            
            // 限制总和为100%
            adjustOtherWeights(key);
            
            // 更新雷达图
            updateRadarChart();
        });
    });
    
    // 为测试和重置按钮添加事件
    document.getElementById('test-fusion').addEventListener('click', function() {
        // 显示测试效果
        showToast('正在测试融合效果...');
        
        // 模拟测试动画
        const testOverlay = document.createElement('div');
        testOverlay.className = 'ep-test-overlay';
        testOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        const testContent = document.createElement('div');
        testContent.className = 'ep-test-content';
        testContent.style.cssText = `
            color: #B7FE5D;
            font-size: 24px;
            text-align: center;
        `;
        testContent.innerHTML = '测试中...<br>分析融合效果';
        
        testOverlay.appendChild(testContent);
        document.body.appendChild(testOverlay);
        
        // 3秒后移除
        setTimeout(() => {
            document.body.removeChild(testOverlay);
            showToast('测试完成，融合权重已优化');
        }, 3000);
    });
    
    document.getElementById('reset-fusion').addEventListener('click', function() {
        // 重置为默认权重
        epState.fusionWeights = {
            facial: 35,
            heart: 25,
            gsr: 20,
            drawing: 15,
            env: 5
        };
        
        // 更新滑块值
        Object.keys(epState.fusionWeights).forEach(key => {
            const slider = weightSliders[key];
            slider.value = epState.fusionWeights[key];
            
            // 更新权重值显示
            const valueDisplay = slider.closest('.ep-weight-item').querySelector('.ep-weight-value');
            valueDisplay.textContent = `${slider.value}%`;
        });
        
        // 更新雷达图
        updateRadarChart();
        
        // 显示提示
        showToast('已重置为默认权重');
    });
    
    // 初始化雷达图
    initRadarChart();
}

/**
 * 调整其他权重，保持总和为100%
 * @param {string} changedKey - 被改变的权重的键名
 */
function adjustOtherWeights(changedKey) {
    // 获取所有权重滑块
    const weightSliders = {
        facial: document.getElementById('facial-weight'),
        heart: document.getElementById('heart-weight'),
        gsr: document.getElementById('gsr-weight'),
        drawing: document.getElementById('drawing-weight'),
        env: document.getElementById('env-weight')
    };
    
    // 计算当前总和
    const total = Object.values(epState.fusionWeights).reduce((sum, val) => sum + val, 0);
    
    // 如果总和不是100，调整其他权重
    if (total !== 100) {
        // 计算需要调整的量
        const diff = 100 - total;
        
        // 如果差异很小，直接调整单个权重
        if (Math.abs(diff) <= 5) {
            // 挑选一个权重较大的项目进行调整
            const maxKey = Object.keys(epState.fusionWeights)
                .filter(key => key !== changedKey)
                .sort((a, b) => epState.fusionWeights[b] - epState.fusionWeights[a])[0];
            
            epState.fusionWeights[maxKey] += diff;
            // 确保权重不小于0
            epState.fusionWeights[maxKey] = Math.max(0, epState.fusionWeights[maxKey]);
            
            // 更新UI
            weightSliders[maxKey].value = epState.fusionWeights[maxKey];
            const valueDisplay = weightSliders[maxKey].closest('.ep-weight-item').querySelector('.ep-weight-value');
            valueDisplay.textContent = `${epState.fusionWeights[maxKey]}%`;
        } else {
            // 对差异较大的情况，按比例分配给其他权重
            const otherKeys = Object.keys(epState.fusionWeights).filter(key => key !== changedKey);
            const otherTotal = otherKeys.reduce((sum, key) => sum + epState.fusionWeights[key], 0);
            
            if (otherTotal > 0) {
                otherKeys.forEach(key => {
                    // 按比例分配差异
                    const ratio = epState.fusionWeights[key] / otherTotal;
                    epState.fusionWeights[key] += Math.round(diff * ratio);
                    
                    // 确保权重不小于0
                    epState.fusionWeights[key] = Math.max(0, epState.fusionWeights[key]);
                    
                    // 更新UI
                    weightSliders[key].value = epState.fusionWeights[key];
                    const valueDisplay = weightSliders[key].closest('.ep-weight-item').querySelector('.ep-weight-value');
                    valueDisplay.textContent = `${epState.fusionWeights[key]}%`;
                });
            }
        }
    }
}

/**
 * 初始化雷达图
 */
function initRadarChart() {
    // 在实际应用中，这里应该使用Chart.js或其他图表库绘制雷达图
    // 这里用Canvas API简单模拟一个雷达图
    const canvas = document.getElementById('fusion-radar-chart');
    if (canvas) {
        updateRadarChart();
    }
}

/**
 * 更新雷达图
 */
function updateRadarChart() {
    const canvas = document.getElementById('fusion-radar-chart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) * 0.65; // 减小半径以适应小尺寸
        
        // 清除画布
        ctx.clearRect(0, 0, width, height);
        
        // 绘制背景网格
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // 绘制同心圆
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * i / 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // 绘制轴线
        const axes = Object.keys(epState.fusionWeights);
        const angleStep = (Math.PI * 2) / axes.length;
        
        axes.forEach((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + radius * Math.cos(angle),
                centerY + radius * Math.sin(angle)
            );
            ctx.stroke();
        });
        
        // 绘制雷达图数据
        ctx.beginPath();
        axes.forEach((key, i) => {
            const value = epState.fusionWeights[key] / 100;
            const angle = i * angleStep - Math.PI / 2;
            const x = centerX + radius * value * Math.cos(angle);
            const y = centerY + radius * value * Math.sin(angle);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(110, 198, 0, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#B7FE5D';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 绘制数据点
        axes.forEach((key, i) => {
            const value = epState.fusionWeights[key] / 100;
            const angle = i * angleStep - Math.PI / 2;
            const x = centerX + radius * value * Math.cos(angle);
            const y = centerY + radius * value * Math.sin(angle);
            
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#B7FE5D';
            ctx.fill();
        });
        
        // 绘制轴标签
        ctx.font = '10px Arial'; // 减小字体大小
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const labels = ['面部表情', '心率数据', '皮电反应', '绘画行为', '环境数据'];
        const labelRadius = radius + 15; // 减小标签与中心点的距离
        
        axes.forEach((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = centerX + labelRadius * Math.cos(angle);
            const y = centerY + labelRadius * Math.sin(angle);
            
            ctx.fillText(labels[i], x, y);
        });
    }
}

/**
 * 初始化反馈映射规则页面
 */
function initFeedbackMapping() {
    // 初始化选项卡切换
    initTabs();
    
    // 为所有颜色选择器添加事件
    document.querySelectorAll('input[type="color"]').forEach(picker => {
        picker.addEventListener('input', function() {
            // 更新渐变预览
            updateColorGradient();
        });
    });
    
    // 为所有滑块添加事件
    document.querySelectorAll('.ep-rule-row.ep-slider-row input[type="range"]').forEach(slider => {
        slider.addEventListener('input', function() {
            // 更新显示数值
            const valueDisplay = this.nextElementSibling;
            if (valueDisplay) {
                valueDisplay.textContent = this.value;
            }
            
            // 更新预览（在实际应用中）
            updateParticlePreview();
        });
    });
    
    // 为所有开关添加事件
    document.querySelectorAll('.ep-rule-toggle input').forEach(toggle => {
        toggle.addEventListener('change', function() {
            // 获取规则项
            const ruleItem = this.closest('.ep-mapping-rule');
            
            // 根据开关状态更新样式
            if (this.checked) {
                ruleItem.style.opacity = '1';
            } else {
                ruleItem.style.opacity = '0.5';
            }
        });
    });
}

/**
 * 初始化选项卡切换
 */
function initTabs() {
    const tabs = document.querySelectorAll('.ep-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有选项卡的active类
            tabs.forEach(t => t.classList.remove('active'));
            
            // 添加当前选项卡的active类
            this.classList.add('active');
            
            // 获取目标内容ID
            const targetId = `${this.getAttribute('data-tab')}-tab`;
            
            // 隐藏所有内容
            document.querySelectorAll('.ep-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // 显示目标内容
            document.getElementById(targetId).classList.add('active');
        });
    });
}

/**
 * 更新颜色渐变预览
 */
function updateColorGradient() {
    // 获取三个颜色值
    const positiveColor = document.querySelector('input[type="color"][value="#B7FE5D"]').value;
    const neutralColor = document.querySelector('input[type="color"][value="#6EC600"]').value;
    const stressColor = document.querySelector('input[type="color"][value="#457704"]').value;
    
    // 更新渐变
    const gradient = document.querySelector('.ep-color-gradient');
    gradient.style.background = `linear-gradient(to right, ${stressColor}, ${neutralColor}, ${positiveColor})`;
}

/**
 * 更新粒子预览效果
 */
function updateParticlePreview() {
    // 这是一个模拟函数，实际应用中应该更新Canvas动画
    console.log('更新粒子预览');
}

/**
 * 保存所有设置
 */
function saveAllSettings() {
    // 收集所有页面的设置
    const settings = {
        baseline: epState.baselineAvg || {
            heartRate: '72.5',
            gsr: '7.80',
            breath: '14.2'
        },
        profile: epState.profileData || collectProfileData(),
        fusionWeights: epState.fusionWeights,
        feedbackMapping: collectFeedbackMappingSettings()
    };
    
    // 输出设置（实际应保存到应用状态或后端）
    console.log('保存的设置:', settings);
    
    // 将设置保存到localStorage
    try {
        localStorage.setItem('emotionPresetSettings', JSON.stringify(settings));
        console.log('设置已保存到localStorage');
    } catch (e) {
        console.error('保存设置到localStorage失败:', e);
    }
    
    return settings;
}

/**
 * 收集反馈映射设置
 * @returns {Object} 反馈映射设置
 */
function collectFeedbackMappingSettings() {
    // 这里简化了实现，实际应用应该收集完整设置
    return {
        visual: {
            colorMapping: document.getElementById('color-mapping').checked,
            particleReaction: document.getElementById('particle-reaction').checked
        },
        audio: {
            backgroundAudio: document.getElementById('audio-background').checked
        },
        interface: {
            uiResponse: document.getElementById('interface-response').checked,
            breathingUI: document.getElementById('breathing-ui').checked,
            blurIntensity: document.getElementById('blur-intensity').checked,
            toolRecommendation: document.getElementById('tool-recommendation').checked
        }
    };
}

/**
 * 显示通知提示
 * @param {string} message - 提示消息
 */
function showToast(message) {
    // 创建通知元素
    const toast = document.createElement('div');
    toast.className = 'ep-toast';
    toast.textContent = message;
    
    // 设置样式
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(110, 198, 0, 0.9);
        color: #FFFFFF;
        padding: 10px 20px;
        border-radius: 30px;
        font-size: 16px;
        z-index: 1000;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    `;
    
    // 添加到文档
    document.body.appendChild(toast);
    
    // 3秒后移除
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 500);
    }, 3000);
}

// 添加页面加载事件监听（用于子页面集成）
window.addEventListener('pageLoaded', function(event) {
    // 如果是当前页面被加载
    if (event.detail && event.detail.pageId === 'emotion-preset') {
        // 重置页面状态，确保每次进入都能正确初始化
        resetEmotionPresetState();
        // 初始化页面
        initEmotionPreset();
    }
});

// 在DOMContentLoaded事件后额外调用一次确保函数
document.addEventListener('DOMContentLoaded', function() {
    // 延迟1秒后尝试再次确保导航按钮工作正常
    setTimeout(ensureNavigationButtonsWork, 1000);
});

// 页面加载完成后也尝试确保导航按钮工作
window.addEventListener('load', function() {
    setTimeout(ensureNavigationButtonsWork, 500);
});

// 将ensureNavigationButtonsWork也添加到页面初始化函数末尾
const originalInitEmotionPreset = initEmotionPreset;
initEmotionPreset = function() {
    originalInitEmotionPreset();
    
    // 再次确保导航按钮正常工作
    setTimeout(ensureNavigationButtonsWork, 200);
};

// 添加一个简单的测试函数用于直接在控制台调用
window.testStepNavigation = function(direction) {
    console.log('测试导航函数被调用, 方向:', direction);
    
    try {
        if (direction === 'next' && epState.currentStep < epState.totalSteps) {
            navigateToStep(epState.currentStep + 1);
            console.log('前进至步骤:', epState.currentStep);
            return true;
        }
        else if (direction === 'prev' && epState.currentStep > 1) {
            navigateToStep(epState.currentStep - 1);
            console.log('后退至步骤:', epState.currentStep);
            return true;
        }
        else if (direction === 'finish') {
            console.log('完成设置');
            saveAllSettings();
            
            // 显示提示
            showToast('设置已保存，正在跳转到应用页面...');
            
            // 触发页面卸载事件
            if (typeof triggerPageUnload === 'function') {
                triggerPageUnload();
            } else {
                // 尝试直接重置状态
                resetEmotionPresetState();
            }
            
            // 添加延迟后跳转到主应用页面
            setTimeout(() => {
                if (window.navigateToPage) {
                    window.navigateToPage('main-app-page');
                } else if (window.parent && window.parent.navigateToPage) {
                    window.parent.navigateToPage('main-app-page');
                } else {
                    window.location.href = '../pages/main-app.html';
                }
            }, 2000);
            return true;
        }
        console.log('无法导航 - 方向:', direction, '当前步骤:', epState.currentStep, '总步骤:', epState.totalSteps);
        return false;
    } catch (error) {
        console.error('测试导航出错:', error);
        return false;
    }
};

// 全局导出重置函数，确保其他地方可以调用
window.resetEmotionPresetState = resetEmotionPresetState;

// 添加一个初始化后的验证函数，确保所有功能正常
setTimeout(function() {
    console.log('进行初始化后的验证检查...');
    const prevButton = document.getElementById('prev-step');
    const nextButton = document.getElementById('next-step');
    const finishButton = document.getElementById('finish-setup');
    
    if (prevButton && nextButton && finishButton) {
        console.log('所有导航按钮都存在');
        
        // 检查事件是否已绑定
        const prevEvents = getEventListeners(prevButton);
        const nextEvents = getEventListeners(nextButton);
        const finishEvents = getEventListeners(finishButton);
        
        console.log('前一步按钮事件数:', prevEvents ? prevEvents.length : '无法获取');
        console.log('下一步按钮事件数:', nextEvents ? nextEvents.length : '无法获取');
        console.log('完成按钮事件数:', finishEvents ? finishEvents.length : '无法获取');
        
        // 如果无法获取事件，尝试重新绑定
        if (!nextEvents || nextEvents.length === 0) {
            console.log('重新绑定下一步按钮事件');
            nextButton.onclick = handleNextButtonClick;
        }
    } else {
        console.warn('验证失败：部分导航按钮不存在');
    }
}, 1000);

// 帮助函数：尝试获取元素上的事件监听器
function getEventListeners(element) {
    try {
        // 尝试使用Chrome的getEventListeners API
        if (window.getEventListeners) {
            return window.getEventListeners(element);
        }
        
        // 如果不可用，返回null
        return null;
    } catch (e) {
        console.log('获取事件监听器失败:', e);
        return null;
    }
} 