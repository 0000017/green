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

// 特殊页面标记 - 这些页面需要特殊处理
const SPECIAL_PAGES = ['main-app-page'];

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
        backButton.addEventListener('click', () => {
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
        
        nextButton.addEventListener('click', () => {
            if (window.navigateToPage) {
                window.navigateToPage(nextPageId);
            }
        });
        navBar.appendChild(nextButton);
    }
    
    // 添加导航栏到页面
    pageContainer.appendChild(navBar);
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
    });
    
    console.log('导航增强功能初始化完成');
}

// 导出函数，便于在其他地方调用
window.UINavigator = {
    initNavigation: initNavigationEnhancement,
    getPageFlow: () => PAGE_FLOW,
    getPageTitles: () => PAGE_TITLES,
    isSpecialPage: (pageId) => SPECIAL_PAGES.includes(pageId),
    addNavigationButtons: addNavigationButtons
};

// DOM加载完成后执行初始化
document.addEventListener('DOMContentLoaded', initNavigationEnhancement); 