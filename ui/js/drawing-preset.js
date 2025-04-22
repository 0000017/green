document.addEventListener('DOMContentLoaded', function() {
    // 初始化背景效果
    createBackgroundEffects();
    
    // 初始化表单步骤导航
    initStepNavigation();
    
    // 初始化表单交互
    initFormInteractions();
    
    // 初始化表单提交
    initFormSubmission();
});

/**
 * 创建背景动态效果
 */
function createBackgroundEffects() {
    const bgLayer = document.querySelector('.bg-layer');
    
    // 创建点状背景
    for (let i = 0; i < 50; i++) {
        const dot = document.createElement('div');
        dot.className = 'bg-dot';
        dot.style.width = Math.random() * 6 + 2 + 'px';
        dot.style.height = dot.style.width;
        dot.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        dot.style.borderRadius = '50%';
        dot.style.position = 'absolute';
        dot.style.left = Math.random() * 100 + '%';
        dot.style.top = Math.random() * 100 + '%';
        dot.style.animation = `float ${Math.random() * 5 + 10}s infinite ease-in-out`;
        
        bgLayer.appendChild(dot);
    }
    
    // 添加鼠标移动视差效果
    document.addEventListener('mousemove', function(e) {
        const dots = document.querySelectorAll('.bg-dot');
        const moveX = (e.clientX / window.innerWidth - 0.5) * 20;
        const moveY = (e.clientY / window.innerHeight - 0.5) * 20;
        
        dots.forEach((dot, index) => {
            const factor = (index % 3 + 1) * 0.5;
            dot.style.transform = `translate(${moveX * factor}px, ${moveY * factor}px)`;
        });
    });
    
    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0%, 100% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(20px);
            }
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * 初始化表单步骤导航
 */
function initStepNavigation() {
    const sections = document.querySelectorAll('.assessment-section');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const submitBtn = document.getElementById('submit-btn');
    const progressIndicator = document.querySelector('.progress-indicator');
    const progressText = document.querySelector('.progress-text');
    
    let currentStep = 0;
    const totalSteps = sections.length;
    
    // 更新步骤显示
    function updateStep() {
        // 隐藏所有步骤
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // 显示当前步骤
        sections[currentStep].classList.add('active');
        
        // 更新进度条
        const progress = ((currentStep + 1) / totalSteps) * 100;
        progressIndicator.style.width = `${progress}%`;
        progressText.textContent = `步骤 ${currentStep + 1}/${totalSteps}`;
        
        // 更新按钮状态
        prevBtn.disabled = currentStep === 0;
        
        if (currentStep === totalSteps - 1) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'block';
        } else {
            nextBtn.style.display = 'block';
            submitBtn.style.display = 'none';
        }
        
        // 滚动到顶部
        window.scrollTo(0, 0);
    }
    
    // 下一步按钮事件
    nextBtn.addEventListener('click', function() {
        // 验证当前步骤的输入
        if (validateCurrentStep(currentStep)) {
            if (currentStep < totalSteps - 1) {
                currentStep++;
                updateStep();
            }
        }
    });
    
    // 上一步按钮事件
    prevBtn.addEventListener('click', function() {
        if (currentStep > 0) {
            currentStep--;
            updateStep();
        }
    });
    
    // 初始化显示第一步
    updateStep();
}

/**
 * 验证当前步骤的输入
 * @param {number} step 当前步骤索引
 * @returns {boolean} 验证结果
 */
function validateCurrentStep(step) {
    const sections = document.querySelectorAll('.assessment-section');
    const currentSection = sections[step];
    
    // 根据不同步骤执行不同的验证逻辑
    switch (step) {
        case 0: // 心理状态评估
            // 检查是否选择了抑郁频率
            const depressionRadios = currentSection.querySelectorAll('input[name="depression"]');
            let depressionSelected = false;
            depressionRadios.forEach(radio => {
                if (radio.checked) depressionSelected = true;
            });
            
            // 检查是否选择了艺术形式
            const artFormRadios = currentSection.querySelectorAll('input[name="art-form"]');
            let artFormSelected = false;
            artFormRadios.forEach(radio => {
                if (radio.checked) artFormSelected = true;
            });
            
            if (!depressionSelected || !artFormSelected) {
                alert('请完成所有必填项');
                return false;
            }
            return true;
            
        case 1: // 艺术偏好调查
            // 检查是否选择了颜色偏好
            const colorRadios = currentSection.querySelectorAll('input[name="color-preference"]');
            let colorSelected = false;
            colorRadios.forEach(radio => {
                if (radio.checked) colorSelected = true;
            });
            
            if (!colorSelected) {
                alert('请选择您喜欢的色彩倾向');
                return false;
            }
            return true;
            
        case 2: // 疗愈目标设定
            // 检查是否至少选择了一个目标
            const goalCheckboxes = currentSection.querySelectorAll('input[name="goal"]');
            let goalSelected = false;
            goalCheckboxes.forEach(checkbox => {
                if (checkbox.checked) goalSelected = true;
            });
            
            if (!goalSelected) {
                alert('请至少选择一个疗愈目标');
                return false;
            }
            return true;
            
        default:
            return true;
    }
}

/**
 * 初始化表单交互
 */
function initFormInteractions() {
    // 压力水平滑块交互
    const stressSlider = document.getElementById('stress-level');
    const stressValue = document.getElementById('stress-value');
    
    if (stressSlider && stressValue) {
        stressSlider.addEventListener('input', function() {
            stressValue.textContent = this.value;
        });
    }
    
    // 选项点击事件
    const options = document.querySelectorAll('.option');
    options.forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }
        });
    });
    
    // 艺术选项点击事件
    const artOptions = document.querySelectorAll('.art-option');
    artOptions.forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }
        });
    });
    
    // 颜色选项点击事件
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }
        });
    });
}

/**
 * 初始化表单提交
 */
function initFormSubmission() {
    const submitBtn = document.getElementById('submit-btn');
    
    submitBtn.addEventListener('click', function() {
        if (validateCurrentStep(2)) { // 验证最后一步
            // 收集所有表单数据
            const formData = collectFormData();
            
            // 生成个人档案
            generateUserProfile(formData);
            
            // 显示模态框（这里简化为弹出提示）
            alert('个人档案生成成功！即将跳转到创作页面。');
            
            // 延迟后跳转
            setTimeout(function() {
                window.location.href = 'index.html'; // 主应用页面
            }, 1500);
        }
    });
}

/**
 * 收集所有表单数据
 * @returns {Object} 表单数据对象
 */
function collectFormData() {
    const formData = {};
    
    // 第一步：心理状态评估
    const depressionRadios = document.querySelectorAll('input[name="depression"]');
    depressionRadios.forEach(radio => {
        if (radio.checked) {
            formData.depression = parseInt(radio.value);
        }
    });
    
    formData.stressLevel = parseInt(document.getElementById('stress-level').value);
    
    const artFormRadios = document.querySelectorAll('input[name="art-form"]');
    artFormRadios.forEach(radio => {
        if (radio.checked) {
            formData.artForm = radio.value;
        }
    });
    
    // 第二步：艺术偏好调查
    formData.artisticPreferences = {
        abstract: {
            familiarity: parseInt(document.querySelector('select[name="familiarity-abstract"]').value),
            interest: parseInt(document.querySelector('select[name="interest-abstract"]').value)
        },
        geometric: {
            familiarity: parseInt(document.querySelector('select[name="familiarity-geometric"]').value),
            interest: parseInt(document.querySelector('select[name="interest-geometric"]').value)
        },
        fluid: {
            familiarity: parseInt(document.querySelector('select[name="familiarity-fluid"]').value),
            interest: parseInt(document.querySelector('select[name="interest-fluid"]').value)
        }
    };
    
    const colorRadios = document.querySelectorAll('input[name="color-preference"]');
    colorRadios.forEach(radio => {
        if (radio.checked) {
            formData.colorPreference = radio.value;
        }
    });
    
    // 第三步：疗愈目标设定
    formData.healingGoals = [];
    const goalCheckboxes = document.querySelectorAll('input[name="goal"]');
    goalCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            formData.healingGoals.push(checkbox.value);
        }
    });
    
    formData.expectation = document.querySelector('textarea').value;
    
    return formData;
}

/**
 * 生成用户档案并保存
 * @param {Object} formData 表单数据
 */
function generateUserProfile(formData) {
    // 创建用户档案对象
    const userProfile = {
        id: 'user_' + Date.now(),
        createdAt: new Date().toISOString(),
        mentalState: {
            depression: formData.depression,
            stressLevel: formData.stressLevel
        },
        artisticPreferences: {
            preferredForm: formData.artForm,
            styles: formData.artisticPreferences,
            colorPreference: formData.colorPreference
        },
        healingGoals: formData.healingGoals,
        expectation: formData.expectation,
        recommendedSettings: generateRecommendedSettings(formData)
    };
    
    // 保存到本地存储
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    
    console.log('User profile generated:', userProfile);
    return userProfile;
}

/**
 * 根据表单数据生成推荐设置
 * @param {Object} formData 表单数据
 * @returns {Object} 推荐设置
 */
function generateRecommendedSettings(formData) {
    // 基于用户输入生成推荐的创作设置
    const settings = {
        brushStyle: 'default',
        colorPalette: 'balanced',
        musicOption: 'calm',
        guideLevel: 'medium'
    };
    
    // 根据抑郁程度和压力水平调整
    const totalMentalScore = formData.depression + (formData.stressLevel / 3.33); // 归一化为0-6分
    
    if (totalMentalScore > 4) {
        // 高抑郁/压力水平
        settings.colorPalette = 'bright';
        settings.musicOption = 'uplifting';
        settings.guideLevel = 'high';
    } else if (totalMentalScore > 2) {
        // 中等抑郁/压力水平
        settings.colorPalette = 'balanced';
        settings.musicOption = 'relaxing';
        settings.guideLevel = 'medium';
    } else {
        // 低抑郁/压力水平
        settings.colorPalette = formData.colorPreference === 'bright' ? 'bright' : 'calm';
        settings.musicOption = 'ambient';
        settings.guideLevel = 'low';
    }
    
    // 根据艺术形式设置绘画工具
    switch (formData.artForm) {
        case 'drawing':
            settings.brushStyle = 'precise';
            break;
        case 'dance':
            settings.brushStyle = 'flowing';
            settings.colorPalette = 'dynamic';
            break;
        case 'poetry':
            settings.brushStyle = 'textured';
            break;
        case 'music':
            settings.brushStyle = 'rhythmic';
            settings.colorPalette = 'harmonious';
            break;
    }
    
    // 根据颜色偏好调整
    settings.colorTheme = formData.colorPreference;
    
    return settings;
} 