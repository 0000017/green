/**
 * Green - 表达性艺术疗愈效果评估页面
 * 基于设计指南中的规范与风格
 */

document.addEventListener('DOMContentLoaded', function() {
    // 页面导航
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const progressFill = document.querySelector('.progress-fill');
    const progressSteps = document.querySelectorAll('.progress-step');
    const sections = document.querySelectorAll('.evaluation-section');
    
    let currentSectionIndex = 0;
    const totalSections = sections.length;
    
    // 初始化评估数据对象
    const evaluationData = {
        emotionalChanges: {
            before: {
                joy: 0,
                anxiety: 0,
                calm: 0,
                depression: 0
            },
            after: {
                joy: 5,
                anxiety: 5,
                calm: 5,
                depression: 5
            }
        },
        physicalChanges: [],
        experience: {
            fluency: 0,
            immersion: 0,
            expression: 0,
            satisfaction: 0
        },
        toolFeedback: {
            'drawing-preset': 0,
            'emotion-response': 0,
            'visual-effects': 0,
            'audio-feedback': 0
        },
        growth: {
            awareness: 0,
            expression: 0,
            regulation: 0,
            insight: 0
        },
        insightText: '',
        overallRating: 5,
        suggestionText: ''
    };
    
    // 初始化界面
    updateUI();
    initEmotionChart();
    
    // 初始化情感图表
    function initEmotionChart() {
        // 这里可以使用Chart.js或其他图表库来初始化图表
        // 简单模拟图表展示
        const beforeChart = document.querySelector('.emotion-before .emotion-chart');
        const afterChart = document.querySelector('.emotion-after .emotion-chart');
        
        if (beforeChart && afterChart) {
            // 简单的样式设置，实际应用中可以使用Chart.js等库
            beforeChart.style.background = 'linear-gradient(135deg, rgba(69, 119, 4, 0.2), rgba(110, 198, 0, 0.2))';
            beforeChart.innerHTML = '<div style="text-align: center; padding-top: 80px; color: #CCCCCC;">创作前情绪数据图表</div>';
            
            afterChart.style.background = 'linear-gradient(135deg, rgba(110, 198, 0, 0.2), rgba(183, 254, 93, 0.2))';
            afterChart.innerHTML = '<div style="text-align: center; padding-top: 80px; color: #CCCCCC;">请调整滑块记录创作后的情绪状态</div>';
        }
    }
    
    // 更新界面状态
    function updateUI() {
        // 更新进度条
        const progressPercentage = (currentSectionIndex / (totalSections - 1)) * 100;
        progressFill.style.width = `${progressPercentage}%`;
        
        // 更新步骤指示器
        progressSteps.forEach((step, index) => {
            step.classList.toggle('active', index === currentSectionIndex);
            step.classList.toggle('completed', index < currentSectionIndex);
        });
        
        // 更新内容区域
        sections.forEach((section, index) => {
            section.classList.toggle('active', index === currentSectionIndex);
        });
        
        // 更新按钮状态
        prevBtn.disabled = currentSectionIndex === 0;
        
        if (currentSectionIndex === totalSections - 1) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'block';
        } else {
            nextBtn.style.display = 'block';
            submitBtn.style.display = 'none';
        }
    }
    
    // 导航到上一部分
    function goToPrevSection() {
        if (currentSectionIndex > 0) {
            currentSectionIndex--;
            updateUI();
        }
    }
    
    // 导航到下一部分
    function goToNextSection() {
        if (currentSectionIndex < totalSections - 1) {
            // 保存当前部分的数据
            saveCurrentSectionData();
            currentSectionIndex++;
            updateUI();
        }
    }
    
    // 保存当前部分的数据
    function saveCurrentSectionData() {
        switch (currentSectionIndex) {
            case 0: // 情感变化评估
                // 保存情感滑块数据
                document.querySelectorAll('.emotion-slider').forEach(slider => {
                    const emotion = slider.dataset.emotion;
                    evaluationData.emotionalChanges.after[emotion] = parseInt(slider.value);
                });
                
                // 保存生理变化数据
                evaluationData.physicalChanges = [];
                document.querySelectorAll('.physical-option:checked').forEach(option => {
                    evaluationData.physicalChanges.push(option.id);
                });
                break;
                
            case 1: // 体验反馈
                // 保存星级评分数据
                document.querySelectorAll('.star-rating').forEach(ratingGroup => {
                    const aspect = ratingGroup.dataset.aspect;
                    const rating = parseInt(ratingGroup.dataset.rating) || 0;
                    evaluationData.experience[aspect] = rating;
                });
                
                // 保存工具评分数据
                document.querySelectorAll('.tool-slider').forEach(slider => {
                    const tool = slider.dataset.tool;
                    evaluationData.toolFeedback[tool] = parseInt(slider.value);
                });
                break;
                
            case 2: // 成长感知
                // 保存成长评分数据
                document.querySelectorAll('.aspect-item').forEach(item => {
                    const aspect = item.dataset.aspect;
                    const activeBtn = item.querySelector('.rating-btn.active');
                    if (activeBtn) {
                        evaluationData.growth[aspect] = parseInt(activeBtn.dataset.value);
                    }
                });
                
                // 保存洞察文本
                evaluationData.insightText = document.getElementById('insight-text').value;
                break;
                
            case 3: // 综合评估
                // 保存整体评分
                evaluationData.overallRating = parseInt(document.getElementById('overall-rating').value);
                
                // 保存建议文本
                evaluationData.suggestionText = document.getElementById('suggestion-text').value;
                break;
        }
    }
    
    // 提交表单
    function submitForm() {
        // 保存最后一部分的数据
        saveCurrentSectionData();
        
        // 输出数据到控制台（测试用）
        console.log('评估数据:', evaluationData);
        
        // 保存到本地存储
        localStorage.setItem('effectEvaluationData', JSON.stringify(evaluationData));
        
        // 显示提交成功信息
        alert('评估数据已成功提交！');
        
        // 跳转到主页或其他相关页面
        // window.location.href = 'main-app-page.html';
    }
    
    // 事件监听器
    prevBtn.addEventListener('click', goToPrevSection);
    nextBtn.addEventListener('click', goToNextSection);
    submitBtn.addEventListener('click', submitForm);
    
    // 情感滑块事件监听
    document.querySelectorAll('.emotion-slider').forEach(slider => {
        slider.addEventListener('input', function() {
            const valueDisplay = this.parentElement.querySelector('.slider-value');
            if (valueDisplay) {
                valueDisplay.textContent = this.value;
            }
        });
    });
    
    // 星级评分事件监听
    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function() {
            const ratingGroup = this.closest('.star-rating');
            const stars = ratingGroup.querySelectorAll('.star');
            const selectedValue = parseInt(this.dataset.value);
            
            // 更新显示状态
            stars.forEach(s => {
                s.classList.toggle('active', parseInt(s.dataset.value) <= selectedValue);
            });
            
            // 更新评分值
            ratingGroup.dataset.rating = selectedValue;
        });
    });
    
    // 工具滑块事件监听
    document.querySelectorAll('.tool-slider').forEach(slider => {
        slider.addEventListener('input', function() {
            const valueDisplay = this.closest('.tool-item').querySelector('.tool-rating-value');
            if (valueDisplay) {
                valueDisplay.textContent = this.value;
            }
        });
    });
    
    // 成长评分按钮事件监听
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const ratingGroup = this.closest('.aspect-rating');
            const buttons = ratingGroup.querySelectorAll('.rating-btn');
            
            // 清除所有按钮的激活状态
            buttons.forEach(b => b.classList.remove('active'));
            
            // 设置当前按钮为激活状态
            this.classList.add('active');
        });
    });
    
    // 整体评分滑块事件监听
    const overallRatingSlider = document.getElementById('overall-rating');
    if (overallRatingSlider) {
        overallRatingSlider.addEventListener('input', function() {
            const ratingLabel = document.getElementById('rating-label');
            const value = parseInt(this.value);
            
            // 更新标签文本
            if (ratingLabel) {
                let labelText = '';
                if (value <= 2) {
                    labelText = '无效果';
                } else if (value <= 4) {
                    labelText = '效果较差';
                } else if (value <= 6) {
                    labelText = '一般';
                } else if (value <= 8) {
                    labelText = '效果良好';
                } else {
                    labelText = '效果显著';
                }
                ratingLabel.textContent = labelText;
            }
            
            // 更新标记颜色
            document.querySelectorAll('.scale-marker').forEach((marker, index) => {
                const markerValue = parseInt(marker.dataset.value);
                marker.style.color = markerValue <= value ? '#B7FE5D' : '#CCCCCC';
                marker.style.fontWeight = markerValue <= value ? '600' : '400';
            });
        });
    }
}); 