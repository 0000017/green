/**
 * Green - 表达性艺术疗愈预设页面
 * 基于表达性艺术疗愈理论设计的情况调查问卷
 */

// 初始化标志，防止重复初始化
window.drawingPresetInitialized = false;

// 将所有初始化逻辑封装到一个函数中
function initDrawingPreset() {
    console.log('初始化绘画预设页面...');
    
    // 问题数据 - 根据表达性艺术疗愈理论设计的情况调查问卷
    const questions = [
        // 选择题部分 (10个小页面，每页3个问题)
        {
            type: 'choice',
            title: '情绪状态评估',
            questions: [
                {
                    question: '你今天的心情和情绪如何？',
                    options: ['非常愉快', '平静', '有些焦虑', '低落', '愤怒']
                },
                {
                    question: '你目前的情绪状态如何？',
                    options: ['平静', '焦虑', '抑郁', '愤怒', '喜悦', '恐惧']
                },
                {
                    question: '你如何看待自己的情绪表达能力？',
                    options: ['非常擅长表达', '一般', '有时难以表达', '经常难以表达', '几乎无法表达']
                }
            ]
        },
        {
            type: 'choice',
            title: '艺术兴趣与经验',
            questions: [
                {
                    question: '你对绘画有什么兴趣或经验？',
                    options: ['专业级别', '爱好者', '初学者', '几乎没有经验', '完全没有经验']
                },
                {
                    question: '你喜欢的绘画风格是什么？',
                    options: ['写实', '抽象', '表现主义', '印象派', '无特定偏好']
                },
                {
                    question: '你使用绘画工具的频率如何？',
                    options: ['每天', '每周几次', '每月几次', '很少', '从不']
                }
            ]
        },
        {
            type: 'choice',
            title: '疗愈目标',
            questions: [
                {
                    question: '你为什么想尝试绘画这种艺术疗法？',
                    options: ['情绪释放', '自我探索', '减轻压力', '尝试新事物', '被推荐参与']
                },
                {
                    question: '你希望通过疗愈解决什么问题？',
                    options: ['负面情绪', '压力与焦虑', '自我认知', '创造力表达', '无特定问题']
                },
                {
                    question: '你对这次体验有什么期望？',
                    options: ['高度期待', '适度期待', '保持开放态度', '有些犹豫', '没有特别期望']
                }
            ]
        },
        {
            type: 'choice',
            title: '创作环境偏好',
            questions: [
                {
                    question: '你喜欢在创作时听音乐，还是保持安静？',
                    options: ['喜欢听音乐', '偶尔听音乐', '无所谓', '喜欢安静', '绝对安静']
                },
                {
                    question: '你适合的创作环境光线如何？',
                    options: ['明亮光线', '柔和光线', '昏暗光线', '无所谓']
                },
                {
                    question: '你喜欢的创作空间大小是？',
                    options: ['开阔空间', '舒适中等', '紧凑空间', '无特别偏好']
                }
            ]
        },
        {
            type: 'choice',
            title: '情感触发因素',
            questions: [
                {
                    question: '最近是否发生过让你感到压力或痛苦的重大事件？',
                    options: ['是，非常重大', '是，有一些', '不太明显', '没有']
                },
                {
                    question: '你平时如何应对和表达压力？',
                    options: ['运动', '与人交谈', '独处', '创意活动', '其他方式']
                },
                {
                    question: '你在创作中表达负面情绪的意愿如何？',
                    options: ['非常愿意', '有条件愿意', '有所保留', '不太愿意', '完全不愿意']
                }
            ]
        },
        {
            type: 'choice',
            title: '创作反馈偏好',
            questions: [
                {
                    question: '在疗程中，你希望得到哪方面的支持或反馈？',
                    options: ['技术指导', '情感解读', '欣赏鼓励', '不需要反馈', '视情况而定']
                },
                {
                    question: '你是否担心自己的作品不够"好"或被他人批评？',
                    options: ['非常担心', '有些担心', '偶尔担心', '不太担心', '完全不担心']
                },
                {
                    question: '你愿意将创作的作品分享或展示给他人吗？',
                    options: ['非常愿意', '选择性分享', '有所保留', '不太愿意', '完全不愿意']
                }
            ]
        },
        {
            type: 'choice',
            title: '创作过程偏好',
            questions: [
                {
                    question: '你希望在创作中保持多大程度的自由或结构？',
                    options: ['完全自由', '轻度引导', '平衡结构和自由', '明确框架', '严格指导']
                },
                {
                    question: '每次绘画你愿意投入多长时间？',
                    options: ['30分钟以内', '30-60分钟', '1-2小时', '2小时以上', '没有时间限制']
                },
                {
                    question: '你的日常作息和生活节奏会影响你参加疗程吗？',
                    options: ['影响很大', '有一定影响', '影响不大', '完全不影响']
                }
            ]
        },
        {
            type: 'choice',
            title: '材料偏好',
            questions: [
                {
                    question: '对于使用的材料，你有偏好或忌讳吗？',
                    options: ['喜欢多种材料', '偏好特定材料', '对某些材料不适', '无特别偏好']
                },
                {
                    question: '你对数字绘画工具的熟悉程度如何？',
                    options: ['非常熟悉', '有一定经验', '了解基础', '完全陌生']
                },
                {
                    question: '你更偏好传统绘画媒介还是数字工具？',
                    options: ['强烈偏好传统', '偏好传统', '两者都可', '偏好数字', '强烈偏好数字']
                }
            ]
        },
        {
            type: 'choice',
            title: '创作心态',
            questions: [
                {
                    question: '你在创作时，会不会自我审查或压抑？',
                    options: ['总是如此', '经常如此', '有时如此', '很少如此', '从不如此']
                },
                {
                    question: '你对失败和错误的态度如何？',
                    options: ['非常在意', '有些在意', '看情况而定', '不太在意', '完全不在意']
                },
                {
                    question: '你在创作中体验过突如其来的灵感或顿悟吗？',
                    options: ['经常体验', '偶尔体验', '很少体验', '从未体验']
                }
            ]
        },
        {
            type: 'choice',
            title: '心理支持网络',
            questions: [
                {
                    question: '你是否有家人、朋友或社交网络给予支持？',
                    options: ['有强大支持', '有一定支持', '支持有限', '几乎没有支持', '完全没有支持']
                },
                {
                    question: '你曾经做过其他形式的艺术疗愈或心理咨询吗？',
                    options: ['多次经验', '有少量经验', '只有一次经验', '从未尝试']
                },
                {
                    question: '他人的评价是否会影响你的创作？',
                    options: ['极大影响', '有一定影响', '影响不大', '完全不影响']
                }
            ]
        },
        
        // 开放题部分 (5个小页面，每页1个问题)
        {
            type: 'open',
            title: '情感探索',
            question: '你希望通过绘画表达或探索哪些情感？请详细描述',
            placeholder: '在这里分享你的想法，可以结合过去的经历、当前的情绪状态，以及你希望通过艺术表达的内容...'
        },
        {
            type: 'open',
            title: '疗愈期望',
            question: '你希望通过艺术疗愈达到什么样的目标？',
            placeholder: '请描述你参与艺术疗愈的具体期望，比如情绪改善、自我认知、压力缓解等...'
        },
        {
            type: 'open',
            title: '艺术与情感',
            question: '在你看来，艺术与情感之间的关系是怎样的？',
            placeholder: '请分享你对艺术表达与情感体验之间关系的理解和看法...'
        },
        {
            type: 'open',
            title: '创作障碍',
            question: '你最担心在创作中遇到哪些问题？',
            placeholder: '分享你对创作过程中可能遇到的困难、担忧或障碍，以及你希望如何克服它们...'
        },
        {
            type: 'open',
            title: '其他想法',
            question: '还有哪些你认为我们需要了解的重要信息？',
            placeholder: '任何其他有关你的情感状态、艺术偏好或疗愈期望的信息都可以在这里分享...'
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
    
    // 如果DOM元素不存在，可能页面还未完全加载，等待一下再尝试
    if (!pagesContainer || !pageIndicator || !prevBtn || !nextBtn || !skipBtn) {
        console.log('页面元素未找到，等待100ms后重试');
        setTimeout(initDrawingPreset, 100);
        return;
    }
    
    let currentPageIndex = 0;
    const totalPages = questions.length;
    
    // 设置总步数
    totalStepsEl.textContent = totalPages;
    
    // 创建页面指示器
    pageIndicator.innerHTML = ''; // 清空现有内容，避免重复创建
    questions.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'page-dot';
        dot.addEventListener('click', () => goToPage(index));
        pageIndicator.appendChild(dot);
    });
    
    // 创建问题页面
    pagesContainer.innerHTML = ''; // 清空现有内容，避免重复创建
    questions.forEach((pageData, pageIndex) => {
        const page = document.createElement('div');
        page.className = 'question-page';
        page.id = `page-${pageIndex}`;
        
        let pageContent = '';
        
        if (pageData.type === 'choice') {
            pageContent = `
                <div class="question-title">${pageData.title}</div>
                <div class="questions-row">
                    ${pageData.questions.map((q, qIndex) => `
                        <div class="question-item">
                            <div class="question-description">${q.question}</div>
                            <div class="options-list">
                                ${q.options.map((opt, optIndex) => `
                                    <div class="option-item" data-page="${pageIndex}" data-question="${qIndex}" data-option="${optIndex}">
                                        <input type="radio" class="option-radio" name="question-${pageIndex}-${qIndex}" id="option-${pageIndex}-${qIndex}-${optIndex}">
                                        <label class="option-text" for="option-${pageIndex}-${qIndex}-${optIndex}">${opt}</label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (pageData.type === 'open') {
            pageContent = `
                <div class="question-title">${pageData.title}</div>
                <div class="question-description">${pageData.question}</div>
                <div class="text-input-container">
                    <textarea class="text-input" placeholder="${pageData.placeholder}"></textarea>
                </div>
            `;
        }
        
        page.innerHTML = pageContent;
        pagesContainer.appendChild(page);
    });
    
    // 初始化第一页
    updatePageDisplay();
    
    // 事件监听
    prevBtn.addEventListener('click', goToPrevPage);
    nextBtn.addEventListener('click', goToNextPage);
    skipBtn.addEventListener('click', skipCurrentPage);
    
    // 为选项添加点击事件
    document.querySelectorAll('.option-item').forEach(item => {
        item.addEventListener('click', function() {
            const pageIndex = this.dataset.page;
            const questionIndex = this.dataset.question;
            
            // 移除同组中其他选项的选中状态
            document.querySelectorAll(`.option-item[data-page="${pageIndex}"][data-question="${questionIndex}"]`)
                .forEach(opt => opt.classList.remove('selected'));
            
            // 设置当前选项为选中状态
            this.classList.add('selected');
            
            // 自动选中单选按钮
            const radio = this.querySelector('input[type="radio"]');
            radio.checked = true;
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
            submitForm();
        }
    }
    
    function skipCurrentPage() {
        if (currentPageIndex < totalPages - 1) {
            currentPageIndex++;
            updatePageDisplay();
        } else {
            // 最后一页无法跳过，直接提交
            submitForm();
        }
    }
    
    function updatePageDisplay() {
        // 更新页面显示
        document.querySelectorAll('.question-page').forEach((page, index) => {
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
    
    function submitForm() {
        // 收集所有回答数据
        const formData = [];
        
        // 收集选择题答案
        questions.forEach((pageData, pageIndex) => {
            if (pageData.type === 'choice') {
                pageData.questions.forEach((q, qIndex) => {
                    const selectedOption = document.querySelector(`input[name="question-${pageIndex}-${qIndex}"]:checked`);
                    if (selectedOption) {
                        const optionIndex = selectedOption.id.split('-').pop();
                        formData.push({
                            question: q.question,
                            answer: q.options[optionIndex]
                        });
                    } else {
                        formData.push({
                            question: q.question,
                            answer: '未回答'
                        });
                    }
                });
            } else if (pageData.type === 'open') {
                const textInput = document.querySelector(`#page-${pageIndex} .text-input`);
                formData.push({
                    question: pageData.question,
                    answer: textInput ? textInput.value : '未回答'
                });
            }
        });
        
        // 保存数据到本地存储
        localStorage.setItem('artTherapyPreset', JSON.stringify(formData));
        console.log('表单数据:', formData);
        
        // 转到下一个流程页面
        if (window.parent && window.parent.navigateToPage) {
            // 如果作为子页面，使用父窗口的导航系统
            window.parent.navigateToPage('emotion-preset-page');
        } else {
            // 作为独立页面
            window.location.href = 'emotion-preset.html';
        }
        
        alert('预设完成！数据已保存'); // 测试用
    }
    
    // 标记初始化完成
    window.drawingPresetInitialized = true;
    console.log('绘画预设页面初始化完成');
}

// 检查当前是否为drawing-preset页面
function checkAndInitDrawingPreset() {
    // 检查页面标识或URL
    const isDrawingPresetPage = (window.location.href.includes('drawing-preset.html') || 
                             document.body.classList.contains('drawing-preset-page') ||
                             document.getElementById('drawing-preset-page') && 
                             document.getElementById('drawing-preset-page').classList.contains('active-page'));
    
    if (isDrawingPresetPage && !window.drawingPresetInitialized) {
        console.log('检测到绘画预设页面激活，主动初始化');
        initDrawingPreset();
    }
}

// 监听DOMContentLoaded事件（当作为独立页面加载时）
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已初始化过
    if (!window.drawingPresetInitialized) {
        console.log('DOMContentLoaded: 初始化绘画预设页面');
        initDrawingPreset();
    }
    
    // 添加MutationObserver监听DOM变化
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' || mutation.type === 'childList') {
                checkAndInitDrawingPreset();
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
    if (event.detail && event.detail.pageId === 'drawing-preset-page' && !window.drawingPresetInitialized) {
        console.log('pageLoaded: 初始化绘画预设页面');
        // 设置短延迟确保DOM元素已加载
        setTimeout(initDrawingPreset, 50);
    }
});

// 初始检查，用于处理可能错过的pageLoaded事件
setTimeout(checkAndInitDrawingPreset, 500); 