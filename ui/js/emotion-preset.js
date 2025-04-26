/**
 * Green - 情感计算系统预设页面
 * 基于情感计算理论设计的传感器和数据处理设置界面
 */

document.addEventListener('DOMContentLoaded', function() {
    // 预设页面数据 - 从UI设计说明文档中选择5个重要预设项目
    const presetPages = [
        // 用户情感基线（Baseline）
        {
            title: '情感基线设置',
            description: '收集用户在"中性"或"平静"状态下的生理/行为数据，用以后续情绪波动的相对判断。',
            controls: [
                {
                    type: 'button',
                    id: 'startBaselineBtn',
                    label: '开始基线测量',
                    action: 'startBaseline'
                },
                {
                    type: 'display',
                    id: 'baselineData',
                    label: '基线数据',
                    description: '显示当前采集的生理数据'
                },
                {
                    type: 'slider',
                    id: 'baselineDuration',
                    label: '基线测量时长',
                    description: '设置采集用户基线数据的持续时间（秒）',
                    min: 30,
                    max: 180,
                    step: 15,
                    default: 60
                },
                {
                    type: 'toggle',
                    id: 'usePrevBaseline',
                    label: '使用上次基线数据',
                    description: '如果有之前的基线测量结果，是否使用该数据作为参考',
                    default: false
                }
            ]
        },
        
        // 传感器校准（Sensor Calibration）
        {
            title: '传感器校准',
            description: '对心率、皮电、表情视频等传感器进行标定，确保不同设备和环境下数据的一致性。',
            controls: [
                {
                    type: 'button',
                    id: 'calibrateHrBtn',
                    label: '校准心率传感器',
                    action: 'calibrateHeartRate'
                },
                {
                    type: 'button',
                    id: 'calibrateGsrBtn',
                    label: '校准皮电传感器',
                    action: 'calibrateGSR'
                },
                {
                    type: 'button',
                    id: 'calibrateCameraBtn',
                    label: '校准摄像头',
                    action: 'calibrateCamera'
                },
                {
                    type: 'display',
                    id: 'calibrationStatus',
                    label: '校准状态',
                    description: '传感器校准信息和状态'
                },
                {
                    type: 'slider',
                    id: 'heartRateSensitivity',
                    label: '心率传感器灵敏度',
                    description: '调整心率传感器的灵敏度',
                    min: 1,
                    max: 10,
                    step: 1,
                    default: 5
                },
                {
                    type: 'slider',
                    id: 'gsrSensitivity',
                    label: '皮电传感器灵敏度',
                    description: '调整皮电传感器的灵敏度',
                    min: 1,
                    max: 10,
                    step: 1,
                    default: 5
                }
            ]
        },
        
        // 情感分类阈值（Thresholds）
        {
            title: '情感分类阈值',
            description: '针对不同情绪类别（如愤怒、焦虑、喜悦、悲伤）设定初步识别阈值，以减少误检和过度响应。',
            controls: [
                {
                    type: 'slider',
                    id: 'angerThreshold',
                    label: '愤怒阈值',
                    description: '设置识别愤怒情绪的阈值',
                    min: 0.1,
                    max: 0.9,
                    step: 0.05,
                    default: 0.6
                },
                {
                    type: 'slider',
                    id: 'anxietyThreshold',
                    label: '焦虑阈值',
                    description: '设置识别焦虑情绪的阈值',
                    min: 0.1,
                    max: 0.9,
                    step: 0.05,
                    default: 0.5
                },
                {
                    type: 'slider',
                    id: 'joyThreshold',
                    label: '喜悦阈值',
                    description: '设置识别喜悦情绪的阈值',
                    min: 0.1,
                    max: 0.9,
                    step: 0.05,
                    default: 0.5
                },
                {
                    type: 'slider',
                    id: 'sadnessThreshold',
                    label: '悲伤阈值',
                    description: '设置识别悲伤情绪的阈值',
                    min: 0.1,
                    max: 0.9,
                    step: 0.05,
                    default: 0.55
                },
                {
                    type: 'toggle',
                    id: 'adaptiveThresholds',
                    label: '自适应阈值',
                    description: '启用自适应阈值调整，根据用户数据自动优化',
                    default: true
                },
                {
                    type: 'selector',
                    id: 'thresholdMode',
                    label: '阈值调整模式',
                    description: '选择阈值调整的策略',
                    options: [
                        { value: 'conservative', label: '保守模式' },
                        { value: 'moderate', label: '平衡模式' },
                        { value: 'sensitive', label: '敏感模式' }
                    ],
                    default: 'moderate'
                }
            ]
        },
        
        // 多模态融合权重（Fusion Weights）
        {
            title: '多模态融合权重',
            description: '对生理、行为和环境等各模态的信任度设置初始权重，以便后续根据实际表现动态调节。',
            controls: [
                {
                    type: 'slider',
                    id: 'facialWeight',
                    label: '面部表情权重',
                    description: '设置面部表情在情感识别中的权重',
                    min: 0,
                    max: 1,
                    step: 0.05,
                    default: 0.3
                },
                {
                    type: 'slider',
                    id: 'heartRateWeight',
                    label: '心率数据权重',
                    description: '设置心率数据在情感识别中的权重',
                    min: 0,
                    max: 1,
                    step: 0.05,
                    default: 0.25
                },
                {
                    type: 'slider',
                    id: 'gsrWeight',
                    label: '皮电数据权重',
                    description: '设置皮电数据在情感识别中的权重',
                    min: 0,
                    max: 1,
                    step: 0.05,
                    default: 0.25
                },
                {
                    type: 'slider',
                    id: 'contextWeight',
                    label: '环境上下文权重',
                    description: '设置环境上下文数据在情感识别中的权重',
                    min: 0,
                    max: 1,
                    step: 0.05,
                    default: 0.2
                },
                {
                    type: 'toggle',
                    id: 'dynamicWeights',
                    label: '动态权重调整',
                    description: '启用动态权重调整，根据传感器可靠性自动调整',
                    default: true
                },
                {
                    type: 'button',
                    id: 'resetWeightsBtn',
                    label: '重置为默认权重',
                    action: 'resetWeights'
                }
            ]
        },
        
        // 反馈映射规则（Feedback Mapping Rules）
        {
            title: '反馈映射规则',
            description: '将识别到的情绪及强度映射到具体反馈形式（颜色变化、绘画参数等）和反馈强度。',
            controls: [
                {
                    type: 'selector',
                    id: 'colorMappingMode',
                    label: '颜色映射模式',
                    description: '选择情绪与颜色的映射方式',
                    options: [
                        { value: 'traditional', label: '传统色彩心理学' },
                        { value: 'personalized', label: '个性化映射' },
                        { value: 'therapeutic', label: '治疗导向' }
                    ],
                    default: 'traditional'
                },
                {
                    type: 'selector',
                    id: 'strokeMappingMode',
                    label: '笔触映射模式',
                    description: '选择情绪与线条/笔触特性的映射方式',
                    options: [
                        { value: 'intensity', label: '强度映射' },
                        { value: 'rhythm', label: '节奏映射' },
                        { value: 'complexity', label: '复杂度映射' }
                    ],
                    default: 'intensity'
                },
                {
                    type: 'slider',
                    id: 'feedbackIntensity',
                    label: '反馈强度',
                    description: '设置情感反馈在视觉表达中的整体强度',
                    min: 0.1,
                    max: 1.0,
                    step: 0.05,
                    default: 0.7
                },
                {
                    type: 'toggle',
                    id: 'graduatedFeedback',
                    label: '渐进式反馈',
                    description: '启用渐进式反馈，情绪变化缓慢反映到视觉效果',
                    default: true
                },
                {
                    type: 'toggle',
                    id: 'audioFeedback',
                    label: '音频反馈',
                    description: '启用音频反馈，通过声音表达情绪变化',
                    default: false
                },
                {
                    type: 'button',
                    id: 'testFeedbackBtn',
                    label: '测试反馈效果',
                    action: 'testFeedback'
                }
            ]
        }
    ];
    
    // 初始化页面
    const pagesContainer = document.getElementById('pagesContainer');
    const pageIndicator = document.getElementById('pageIndicator');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const skipBtn = document.getElementById('skipBtn');
    const currentStepEl = document.querySelector('.current-step');
    const totalStepsEl = document.querySelector('.total-steps');
    
    let currentPageIndex = 0;
    const totalPages = presetPages.length;
    
    // 设置总步数
    totalStepsEl.textContent = totalPages;
    
    // 创建页面指示器
    presetPages.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'page-dot';
        dot.addEventListener('click', () => goToPage(index));
        pageIndicator.appendChild(dot);
    });
    
    // 创建预设页面
    presetPages.forEach((pageData, pageIndex) => {
        const page = document.createElement('div');
        page.className = 'preset-page';
        page.id = `page-${pageIndex}`;
        
        let pageContent = `
            <div class="preset-title">${pageData.title}</div>
            <div class="preset-description">${pageData.description}</div>
        `;
        
        // 添加控制元素
        pageData.controls.forEach(control => {
            switch(control.type) {
                case 'slider':
                    pageContent += `
                        <div class="control-section">
                            <div class="control-label">${control.label}</div>
                            <div class="control-description">${control.description}</div>
                            <div class="slider-container">
                                <input type="range" class="range-slider" id="${control.id}" 
                                    min="${control.min}" max="${control.max}" step="${control.step}" value="${control.default}">
                                <div class="range-value" id="${control.id}-value">${control.default}</div>
                            </div>
                        </div>
                    `;
                    break;
                    
                case 'toggle':
                    pageContent += `
                        <div class="control-section">
                            <div class="control-label">${control.label}</div>
                            <div class="control-description">${control.description}</div>
                            <div class="toggle-container">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="${control.id}" ${control.default ? 'checked' : ''}>
                                    <span class="toggle-slider"></span>
                                </label>
                                <span class="toggle-label">${control.default ? '已启用' : '已禁用'}</span>
                            </div>
                        </div>
                    `;
                    break;
                    
                case 'selector':
                    pageContent += `
                        <div class="control-section">
                            <div class="control-label">${control.label}</div>
                            <div class="control-description">${control.description}</div>
                            <div class="selector-container">
                                <select class="selector" id="${control.id}">
                                    ${control.options.map(option => `
                                        <option value="${option.value}" ${option.value === control.default ? 'selected' : ''}>
                                            ${option.label}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                    `;
                    break;
                    
                case 'button':
                    pageContent += `
                        <div class="control-section">
                            <div class="control-label">${control.label}</div>
                            <div class="button" id="${control.id}" data-action="${control.action}">${control.label}</div>
                        </div>
                    `;
                    break;
                    
                case 'display':
                    pageContent += `
                        <div class="control-section">
                            <div class="control-label">${control.label}</div>
                            <div class="control-description">${control.description}</div>
                            <div class="data-display" id="${control.id}">等待数据...</div>
                        </div>
                    `;
                    break;
            }
        });
        
        page.innerHTML = pageContent;
        pagesContainer.appendChild(page);
    });
    
    // 初始化第一页
    updatePageDisplay();
    
    // 事件监听
    prevBtn.addEventListener('click', goToPrevPage);
    nextBtn.addEventListener('click', goToNextPage);
    skipBtn.addEventListener('click', skipCurrentPage);
    
    // 添加控件事件监听
    // 为滑块添加事件
    document.querySelectorAll('.range-slider').forEach(slider => {
        const valueDisplay = document.getElementById(`${slider.id}-value`);
        slider.addEventListener('input', function() {
            valueDisplay.textContent = this.value;
        });
    });
    
    // 为开关添加事件
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
        const toggleLabel = toggle.parentElement.nextElementSibling;
        toggle.addEventListener('change', function() {
            toggleLabel.textContent = this.checked ? '已启用' : '已禁用';
        });
    });
    
    // 按钮点击事件
    document.querySelectorAll('.button').forEach(button => {
        button.addEventListener('click', function() {
            const action = this.dataset.action;
            handleButtonAction(action, this.id);
        });
    });
    
    // 页面导航函数
    function goToPage(index) {
        if (index >= 0 && index < totalPages) {
            currentPageIndex = index;
            updatePageDisplay();
        }
    }
    
    function goToPrevPage() {
        if (currentPageIndex > 0) {
            currentPageIndex--;
            updatePageDisplay();
        }
    }
    
    function goToNextPage() {
        if (currentPageIndex < totalPages - 1) {
            currentPageIndex++;
            updatePageDisplay();
        } else {
            // 提交表单
            submitSettings();
        }
    }
    
    function skipCurrentPage() {
        if (currentPageIndex < totalPages - 1) {
            currentPageIndex++;
            updatePageDisplay();
        } else {
            // 最后一页无法跳过，直接提交
            submitSettings();
        }
    }
    
    function updatePageDisplay() {
        // 更新页面显示
        document.querySelectorAll('.preset-page').forEach((page, index) => {
            page.classList.toggle('active', index === currentPageIndex);
        });
        
        // 更新页面指示器
        document.querySelectorAll('.page-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === currentPageIndex);
        });
        
        // 更新步骤显示
        currentStepEl.textContent = currentPageIndex + 1;
        
        // 更新按钮状态
        prevBtn.disabled = currentPageIndex === 0;
        prevBtn.style.visibility = currentPageIndex === 0 ? 'hidden' : 'visible';
        
        if (currentPageIndex === totalPages - 1) {
            nextBtn.textContent = '完成';
        } else {
            nextBtn.textContent = '下一步';
        }
    }
    
    // 按钮操作处理
    function handleButtonAction(action, buttonId) {
        console.log(`执行动作: ${action}, 按钮ID: ${buttonId}`);
        
        switch(action) {
            case 'startBaseline':
                simulateBaselineMeasurement();
                break;
                
            case 'calibrateHeartRate':
                simulateSensorCalibration('心率传感器');
                break;
                
            case 'calibrateGSR':
                simulateSensorCalibration('皮电传感器');
                break;
                
            case 'calibrateCamera':
                simulateSensorCalibration('摄像头');
                break;
                
            case 'resetWeights':
                resetModalityWeights();
                break;
                
            case 'testFeedback':
                testFeedbackVisualization();
                break;
        }
    }
    
    // 模拟基线测量
    function simulateBaselineMeasurement() {
        const baselineData = document.getElementById('baselineData');
        const duration = parseInt(document.getElementById('baselineDuration').value);
        const button = document.getElementById('startBaselineBtn');
        
        button.textContent = '测量中...';
        button.disabled = true;
        
        baselineData.innerHTML = '基线测量中，请保持平静...';
        
        // 模拟进度更新
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            if (progress <= duration) {
                const heartRate = Math.floor(65 + Math.random() * 10);
                const gsr = (0.5 + Math.random() * 0.3).toFixed(2);
                baselineData.innerHTML = `
                    测量进度: ${progress}/${duration}秒<br>
                    当前心率: ${heartRate} BPM<br>
                    当前皮电: ${gsr} μS<br>
                    面部表情: 平静
                `;
            } else {
                clearInterval(interval);
                baselineData.innerHTML = `
                    <span style="color: var(--cyan);">✓ 基线测量完成</span><br>
                    平均心率: ${Math.floor(68 + Math.random() * 5)} BPM<br>
                    平均皮电: ${(0.6 + Math.random() * 0.1).toFixed(2)} μS<br>
                    面部情绪: 平静 (置信度: 92%)<br>
                    基线状态: 良好
                `;
                button.textContent = '重新测量';
                button.disabled = false;
            }
        }, 250);
    }
    
    // 模拟传感器校准
    function simulateSensorCalibration(sensorType) {
        const statusDisplay = document.getElementById('calibrationStatus');
        statusDisplay.innerHTML = `正在校准${sensorType}...`;
        
        setTimeout(() => {
            statusDisplay.innerHTML += `<br>${sensorType}校准进度: 25%`;
        }, 500);
        
        setTimeout(() => {
            statusDisplay.innerHTML += `<br>${sensorType}校准进度: 50%`;
        }, 1000);
        
        setTimeout(() => {
            statusDisplay.innerHTML += `<br>${sensorType}校准进度: 75%`;
        }, 1500);
        
        setTimeout(() => {
            statusDisplay.innerHTML += `<br><span style="color: var(--cyan);">✓ ${sensorType}校准完成</span>`;
        }, 2000);
    }
    
    // 重置模态权重
    function resetModalityWeights() {
        document.getElementById('facialWeight').value = 0.3;
        document.getElementById('facialWeight-value').textContent = '0.3';
        
        document.getElementById('heartRateWeight').value = 0.25;
        document.getElementById('heartRateWeight-value').textContent = '0.25';
        
        document.getElementById('gsrWeight').value = 0.25;
        document.getElementById('gsrWeight-value').textContent = '0.25';
        
        document.getElementById('contextWeight').value = 0.2;
        document.getElementById('contextWeight-value').textContent = '0.2';
    }
    
    // 测试反馈可视化
    function testFeedbackVisualization() {
        // 打开示例图片页面
        const sampleWindow = window.open('../pages/samples/sample-image.html', 'feedback_sample', 
            'width=800,height=600,resizable=yes,scrollbars=yes');
        
        if (!sampleWindow) {
            alert('无法打开示例窗口，请检查是否启用了弹出窗口权限');
        }
    }
    
    // 提交设置
    function submitSettings() {
        // 收集所有设置数据
        const settings = {};
        
        // 收集所有滑块值
        document.querySelectorAll('.range-slider').forEach(slider => {
            settings[slider.id] = parseFloat(slider.value);
        });
        
        // 收集所有开关状态
        document.querySelectorAll('.toggle-switch input').forEach(toggle => {
            settings[toggle.id] = toggle.checked;
        });
        
        // 收集所有选择器值
        document.querySelectorAll('.selector').forEach(selector => {
            settings[selector.id] = selector.value;
        });
        
        // 保存设置到本地存储
        localStorage.setItem('emotionComputeSettings', JSON.stringify(settings));
        console.log('情感计算设置已保存:', settings);
        
        // 转到下一个流程页面
        // window.location.href = '../pages/main-app-page.html'; // 实际应用中取消注释
        alert('情感计算预设完成！数据已保存'); // 测试用
    }
}); 