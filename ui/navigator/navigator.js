/**
 * Green - 情感疗愈交互设计 UI导航管理
 * 负责处理页面之间的导航、过渡动画和内容加载
 */

// 页面顺序定义 - 使用条件声明避免重复定义
if (typeof PAGE_FLOW === 'undefined') {
    var PAGE_FLOW = [
        'welcome-page',
        'intro-page',
        'device-setup-page',
        'drawing-preset-page',
        'emotion-preset-page',
        'main-app-page',
        'analysis-page'
    ];
}

// 页面标题映射 - 使用条件声明避免重复定义
if (typeof PAGE_TITLES === 'undefined') {
    var PAGE_TITLES = {
        'welcome-page': 'Green - 欢迎',
        'intro-page': 'Green - 介绍',
        'device-setup-page': 'Green - 设备设置',
        'drawing-preset-page': 'Green - 绘画预设',
        'emotion-preset-page': 'Green - 情感预设',
        'main-app-page': 'Green - 主应用',
        'analysis-page': 'Green - 情感分析'
    };
}

// 页面描述映射 - 使用条件声明避免重复定义
if (typeof PAGE_DESCRIPTIONS === 'undefined') {
    var PAGE_DESCRIPTIONS = {
        'welcome-page': '欢迎使用Green情感疗愈交互系统',
        'intro-page': '了解Green的功能和使用方法',
        'device-setup-page': '连接和设置您的设备',
        'drawing-preset-page': '选择适合您的艺术表达方式',
        'emotion-preset-page': '设置情感分析参数',
        'main-app-page': '使用创意工具表达您的情感',
        'analysis-page': '查看您的情感分析结果'
    };
}

// 导航按钮文本配置 - 每个页面的按钮文本定义
if (typeof BUTTON_TEXT_CONFIG === 'undefined') {
    var BUTTON_TEXT_CONFIG = {
        // 前进按钮文本配置
        next: {
            'welcome-page': '开始体验',
            'intro-page': '准备设备',
            'device-setup-page': '绘画设置',
            'drawing-preset-page': '情感设置',
            'emotion-preset-page': '开始创作',
            'main-app-page': '查看分析结果',
            'analysis-page': '重新开始'
        },
        // 后退按钮文本配置
        back: {
            'intro-page': '返回欢迎页',
            'device-setup-page': '返回介绍',
            'drawing-preset-page': '返回设备设置',
            'emotion-preset-page': '返回绘画设置',
            'main-app-page': '返回预设',
            'analysis-page': '返回创作'
        }
    };
}

// 特殊页面标记 - 这些页面需要特殊处理 - 使用条件声明避免重复定义
if (typeof SPECIAL_PAGES === 'undefined') {
    var SPECIAL_PAGES = [];  // 移除所有特殊页面，让所有页面都显示导航按钮
}

/**
 * 添加导航按钮到页面底部
 * @param {string} pageId - 当前页面ID
 */
function addNavigationButtons(pageId) {
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
    
    // 主应用页面特殊处理 - 只添加前进按钮，不添加后退按钮
    if (pageId === 'main-app-page') {
        // 只为主应用页面添加前进按钮
        if (currentIndex < PAGE_FLOW.length - 1) {
            const nextButton = document.createElement('button');
            nextButton.className = 'nav-button next-button';
            
            // 获取下一个页面ID和自定义按钮文本
            const nextPageId = PAGE_FLOW[currentIndex + 1];
            const customButtonText = BUTTON_TEXT_CONFIG.next[pageId] || '查看分析';
            
            nextButton.textContent = customButtonText;
            nextButton.setAttribute('aria-label', customButtonText);
            nextButton.addEventListener('click', () => {
                playButtonSound('next');
                if (window.navigateToPage) {
                    window.navigateToPage(PAGE_FLOW[currentIndex + 1]);
                }
            });
            // 设置右下角定位样式
            nextButton.style.position = 'absolute';
            nextButton.style.bottom = '20px';
            nextButton.style.right = '20px';
            nextButton.style.zIndex = '1000';
            navBar.appendChild(nextButton);
        }
    } else {
        // 其他页面的正常处理
        // 添加后退按钮（如果不是第一个页面）
        if (currentIndex > 0) {
            const backButton = document.createElement('button');
            backButton.className = 'nav-button back-button';
            
            // 获取自定义后退按钮文本
            const customBackText = BUTTON_TEXT_CONFIG.back[pageId] || '返回';
            
            backButton.textContent = customBackText;
            backButton.setAttribute('aria-label', customBackText);
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
            
            // 获取自定义前进按钮文本
            const customNextText = BUTTON_TEXT_CONFIG.next[pageId] || '下一步';
            
            nextButton.textContent = customNextText;
            nextButton.setAttribute('aria-label', customNextText);
            nextButton.addEventListener('click', () => {
                playButtonSound('next');
                if (window.navigateToPage) {
                    window.navigateToPage(nextPageId);
                }
            });
            navBar.appendChild(nextButton);
        }
    }
    
    // 添加导航栏到页面
    pageContainer.appendChild(navBar);
    
    console.log(`页面 ${pageId} 添加导航按钮完成`);
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
        
        // 添加导航按钮
        addNavigationButtons(pageId);
        
        console.log(`页面 ${pageId} 加载完成，导航已就绪`);
    });
    
    console.log('导航增强功能初始化完成');
}

// 导出函数，便于在其他地方调用
window.UINavigator = {
    initNavigation: initNavigationEnhancement,
    getPageFlow: () => PAGE_FLOW,
    getPageTitles: () => PAGE_TITLES,
    getPageDescriptions: () => PAGE_DESCRIPTIONS,
    getButtonTextConfig: () => BUTTON_TEXT_CONFIG,
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
    },
    // 添加更新按钮文本的方法
    updateButtonText: (pageId, direction, text) => {
        if (direction === 'next' || direction === 'back') {
            BUTTON_TEXT_CONFIG[direction][pageId] = text;
        }
    }
};

// DOM加载完成后执行初始化
document.addEventListener('DOMContentLoaded', initNavigationEnhancement);