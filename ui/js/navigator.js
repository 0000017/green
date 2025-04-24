/**
 * Green - 情感疗愈交互设计 UI导航管理
 * 负责处理页面之间的导航、过渡动画和内容加载
 */

// 页面顺序定义
const PAGE_FLOW = [
    'welcome-page',
    'intro-page',
    'device-setup-page',
    'drawing-preset-page',
    'emotion-preset-page',
    'main-app-page',
    'analysis-page'
];

// 页面标题映射
const PAGE_TITLES = {
    'welcome-page': 'Green - 欢迎',
    'intro-page': 'Green - 介绍',
    'device-setup-page': 'Green - 设备设置',
    'drawing-preset-page': 'Green - 绘画预设',
    'emotion-preset-page': 'Green - 情感预设',
    'main-app-page': 'Green - 主应用',
    'analysis-page': 'Green - 情感分析'
};

// 页面描述映射
const PAGE_DESCRIPTIONS = {
    'welcome-page': '欢迎使用Green情感疗愈交互系统',
    'intro-page': '了解Green的功能和使用方法',
    'device-setup-page': '连接和设置您的设备',
    'drawing-preset-page': '选择适合您的艺术表达方式',
    'emotion-preset-page': '设置情感分析参数',
    'main-app-page': '使用创意工具表达您的情感',
    'analysis-page': '查看您的情感分析结果'
};

// 特殊页面标记 - 这些页面需要特殊处理
const SPECIAL_PAGES = ['main-app-page', 'welcome-page'];

/**
 * 添加导航按钮到页面底部
 * @param {string} pageId - 当前页面ID
 */
function addNavigationButtons(pageId) {
    // 如果是特殊页面，不添加导航按钮
    if (SPECIAL_PAGES.includes(pageId)) {
        console.log('跳过特殊页面的导航按钮添加:', pageId);
        return;
    }
    
    // 计算当前页面在流程中的位置
    const currentIndex = PAGE_FLOW.indexOf(pageId);
    if (currentIndex === -1) return; // 页面不在定义的流程中
    
    // 获取当前页面容器
    const pageContainer = document.getElementById(pageId);
    if (!pageContainer) return;
    
    // 移除可能存在的旧导航栏
    const existingNavBar = pageContainer.querySelector('.nav-bar');
    if (existingNavBar) {
        pageContainer.removeChild(existingNavBar);
    }
    
    // 创建导航栏
    const navBar = document.createElement('div');
    navBar.className = 'nav-bar';
    
    // 添加后退按钮（如果不是第一个页面）
    if (currentIndex > 0) {
        const backButton = document.createElement('button');
        backButton.className = 'nav-button back-button';
        backButton.textContent = '返回';
        backButton.setAttribute('aria-label', '返回上一页');
        backButton.addEventListener('click', () => {
            playButtonSound('back');
            if (window.navigateToPage) {
                window.navigateToPage(PAGE_FLOW[currentIndex - 1]);
            }
        });
        navBar.appendChild(backButton);
    }
    
    // 添加前进按钮（如果不是最后一个页面）
    if (currentIndex < PAGE_FLOW.length - 1) {
        const nextButton = document.createElement('button');
        nextButton.className = 'nav-button next-button';
        
        // 获取下一个页面ID
        const nextPageId = PAGE_FLOW[currentIndex + 1];
        
        // 如果下一个页面是特殊页面，修改按钮文本
        if (SPECIAL_PAGES.includes(nextPageId)) {
            nextButton.textContent = '进入应用';
        } else {
            nextButton.textContent = '下一步';
        }
        
        nextButton.setAttribute('aria-label', nextButton.textContent);
        nextButton.addEventListener('click', () => {
            playButtonSound('next');
            if (window.navigateToPage) {
                window.navigateToPage(nextPageId);
            }
        });
        navBar.appendChild(nextButton);
    }
    
    // 添加导航栏到页面
    pageContainer.appendChild(navBar);
    
    // 添加进度指示器
    addProgressIndicator(pageId);
}

/**
 * 添加进度指示器
 * @param {string} currentPageId - 当前页面ID
 */
function addProgressIndicator(currentPageId) {
    // 跳过特殊页面
    if (SPECIAL_PAGES.includes(currentPageId)) return;
    
    // 获取当前页面在流程中的位置
    const currentIndex = PAGE_FLOW.indexOf(currentPageId);
    if (currentIndex === -1) return;
    
    // 只显示引导页面的进度指示器，主应用页面和分析页面不显示
    const introPages = PAGE_FLOW.filter(pageId => 
        !['welcome-page', 'main-app-page', 'analysis-page'].includes(pageId)
    );
    
    // 当前页面不在引导流程中，跳过
    if (!introPages.includes(currentPageId)) return;
    
    const introIndex = introPages.indexOf(currentPageId);
    
    // 获取当前页面容器
    const pageContainer = document.getElementById(currentPageId);
    if (!pageContainer) return;
    
    // 移除可能存在的旧进度指示器
    const existingIndicator = pageContainer.querySelector('.progress-indicator');
    if (existingIndicator) {
        pageContainer.removeChild(existingIndicator);
    }
    
    // 创建进度指示器容器
    const progressIndicator = document.createElement('div');
    progressIndicator.className = 'progress-indicator';
    
    // 创建进度点
    introPages.forEach((pageId, index) => {
        const dot = document.createElement('div');
        dot.className = 'progress-dot';
        if (index === introIndex) {
            dot.classList.add('active');
        }
        dot.setAttribute('aria-label', `步骤 ${index + 1}: ${PAGE_DESCRIPTIONS[pageId]}`);
        
        // 添加点击事件，允许直接跳转到该页面
        dot.addEventListener('click', () => {
            if (index < introIndex) { // 只允许回退或当前步骤
                playButtonSound('back');
                if (window.navigateToPage) {
                    window.navigateToPage(pageId);
                }
            }
        });
        
        // 将点样式根据状态调整
        if (index < introIndex) {
            dot.style.cursor = 'pointer';
            dot.style.backgroundColor = '#457704';
        }
        
        progressIndicator.appendChild(dot);
    });
    
    // 添加进度指示器到页面
    pageContainer.appendChild(progressIndicator);
}

/**
 * 播放按钮音效
 * @param {string} type - 按钮类型，'next'或'back'
 */
function playButtonSound(type) {
    // 创建音频上下文
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        // 设置音调和音量
        if (type === 'next') {
            oscillator.frequency.value = 880; // A5
        } else {
            oscillator.frequency.value = 660; // E5
        }
        
        oscillator.type = 'sine';
        gain.gain.value = 0.1;
        
        // 连接节点
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        
        // 播放音效
        oscillator.start();
        
        // 设置淡出效果
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
        
        // 停止音效
        setTimeout(() => {
            oscillator.stop();
        }, 200);
    } catch (e) {
        console.log('音效播放失败:', e);
    }
}

/**
 * 页面加载完成后初始化
 */
function initNavigationEnhancement() {
    // 监听页面切换事件
    window.addEventListener('pageLoaded', (event) => {
        const pageId = event.detail.pageId;
        
        // 更新页面标题
        if (PAGE_TITLES[pageId]) {
            document.title = PAGE_TITLES[pageId];
        }
        
        // 添加导航按钮（对非特殊页面）
        addNavigationButtons(pageId);
        
        // 添加键盘导航支持
        setupKeyboardNavigation(pageId);
        
        console.log(`页面 ${pageId} 加载完成，导航已就绪`);
    });
    
    console.log('导航增强功能初始化完成');
}

/**
 * 设置键盘导航
 * @param {string} pageId - 当前页面ID
 */
function setupKeyboardNavigation(pageId) {
    // 如果是特殊页面，不添加键盘导航
    if (SPECIAL_PAGES.includes(pageId)) return;
    
    // 计算当前页面在流程中的位置
    const currentIndex = PAGE_FLOW.indexOf(pageId);
    if (currentIndex === -1) return;
    
    // 移除之前可能存在的键盘监听
    if (window.keyboardNavigationHandler) {
        document.removeEventListener('keydown', window.keyboardNavigationHandler);
    }
    
    // 创建新的键盘监听
    window.keyboardNavigationHandler = function(event) {
        // 如果有输入框获得焦点，不处理键盘导航
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA') {
            return;
        }
        
        // 按左箭头或ESC返回上一页
        if ((event.key === 'ArrowLeft' || event.key === 'Escape') && currentIndex > 0) {
            playButtonSound('back');
            if (window.navigateToPage) {
                window.navigateToPage(PAGE_FLOW[currentIndex - 1]);
            }
        }
        
        // 按右箭头或Enter前进到下一页
        if ((event.key === 'ArrowRight' || event.key === 'Enter') && 
            currentIndex < PAGE_FLOW.length - 1) {
            playButtonSound('next');
            if (window.navigateToPage) {
                window.navigateToPage(PAGE_FLOW[currentIndex + 1]);
            }
        }
    };
    
    // 添加键盘监听
    document.addEventListener('keydown', window.keyboardNavigationHandler);
}

// 导出函数，便于在其他地方调用
window.UINavigator = {
    initNavigation: initNavigationEnhancement,
    getPageFlow: () => PAGE_FLOW,
    getPageTitles: () => PAGE_TITLES,
    getPageDescriptions: () => PAGE_DESCRIPTIONS,
    isSpecialPage: (pageId) => SPECIAL_PAGES.includes(pageId),
    addNavigationButtons: addNavigationButtons,
    navigateToNext: (currentPageId) => {
        const currentIndex = PAGE_FLOW.indexOf(currentPageId);
        if (currentIndex >= 0 && currentIndex < PAGE_FLOW.length - 1) {
            playButtonSound('next');
            if (window.navigateToPage) {
                window.navigateToPage(PAGE_FLOW[currentIndex + 1]);
            }
        }
    },
    navigateToPrevious: (currentPageId) => {
        const currentIndex = PAGE_FLOW.indexOf(currentPageId);
        if (currentIndex > 0) {
            playButtonSound('back');
            if (window.navigateToPage) {
                window.navigateToPage(PAGE_FLOW[currentIndex - 1]);
            }
        }
    }
};

// DOM加载完成后执行初始化
document.addEventListener('DOMContentLoaded', initNavigationEnhancement); 