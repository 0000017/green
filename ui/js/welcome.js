/**
 * Green - 情感疗愈交互设计
 * 欢迎页面脚本
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面元素
    const startBtn = document.getElementById('start-btn');
    const background = document.querySelector('.background-pattern');
    const logoContainer = document.querySelector('.logo-container');
    const logoSvg = document.querySelector('.logo-svg');
    
    // 添加动态点状图标
    createFloatingIcons();
    
    // 添加按钮点击事件
    startBtn.addEventListener('click', function() {
        // 添加点击效果
        this.classList.add('clicked');
        
        // 播放按钮音效（如果导航系统已加载）
        if (window.UINavigator && typeof window.UINavigator.playButtonSound === 'function') {
            window.UINavigator.playButtonSound('next');
        }
        
        // 页面淡出动画
        logoContainer.style.animation = 'fadeOut 0.8s ease-out forwards';
        document.querySelector('.content-container').style.animation = 'fadeOut 0.8s ease-out 0.1s forwards';
        
        // 延迟后通过导航系统跳转到简介页面
        setTimeout(function() {
            // 如果导航系统已初始化，使用导航系统跳转
            if (window.navigateToPage) {
                window.navigateToPage('intro-page');
            } else {
                // 否则直接跳转
                window.location.href = 'intro.html';
            }
        }, 600);
    });
    
    // 添加鼠标移动视差效果
    document.addEventListener('mousemove', createParallaxEffect);
    
    // 添加按钮动画效果
    addButtonAnimation(startBtn);
    
    // 触发页面加载完成事件，通知导航系统
    if (typeof window.UINavigator !== 'undefined') {
        // 创建并触发自定义事件
        const event = new CustomEvent('pageLoaded', {
            detail: { pageId: 'welcome-page' }
        });
        window.dispatchEvent(event);
        
        console.log('欢迎页面已通知导航系统');
    }
});

/**
 * 创建浮动图标元素
 */
function createFloatingIcons() {
    const container = document.querySelector('.welcome-container');
    const iconTypes = ['brush', 'heart', 'brain', 'wave', 'star'];
    const iconCount = 15;
    
    // 创建图标元素
    for (let i = 0; i < iconCount; i++) {
        const icon = document.createElement('div');
        icon.className = 'floating-icon';
        
        // 随机选择图标类型
        const iconType = iconTypes[Math.floor(Math.random() * iconTypes.length)];
        icon.classList.add(`icon-${iconType}`);
        
        // 设置随机位置和大小
        icon.style.left = `${Math.random() * 100}%`;
        icon.style.top = `${Math.random() * 100}%`;
        const size = Math.random() * 15 + 8;
        icon.style.width = `${size}px`;
        icon.style.height = `${size}px`;
        
        // 设置随机动画延迟和持续时间
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 5;
        icon.style.animationDuration = `${duration}s`;
        icon.style.animationDelay = `${delay}s`;
        
        // 添加到容器
        container.appendChild(icon);
    }
    
    // 添加图标样式
    const style = document.createElement('style');
    style.textContent = `
        .floating-icon {
            position: absolute;
            pointer-events: none;
            opacity: 0.2;
            z-index: -1;
            border-radius: 50%;
            background-color: #6ec600;
            animation: float infinite ease-in-out alternate;
        }
        
        .icon-brush { background-color: #6ec600; }
        .icon-heart { background-color: #b7fe5d; }
        .icon-brain { background-color: #457704; }
        .icon-wave { background-color: #13f88b; }
        .icon-star { background-color: #fff345; }
        
        @keyframes float {
            0% { transform: translate(0, 0) rotate(0deg); }
            100% { transform: translate(20px, 20px) rotate(15deg); }
        }
        
        @keyframes fadeOut {
            0% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-30px); }
        }
        
        #start-btn.clicked {
            transform: scale(0.95);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
    `;
    document.head.appendChild(style);
}

/**
 * 创建视差效果
 * @param {MouseEvent} e - 鼠标事件对象
 */
function createParallaxEffect(e) {
    const container = document.querySelector('.welcome-container');
    const icons = document.querySelectorAll('.floating-icon');
    const logoContainer = document.querySelector('.logo-container');
    
    // 计算鼠标位置相对于容器中心的偏移
    const centerX = container.offsetWidth / 2;
    const centerY = container.offsetHeight / 2;
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const offsetX = (mouseX - centerX) / 30;
    const offsetY = (mouseY - centerY) / 30;
    
    // 应用视差效果到图标
    icons.forEach((icon, index) => {
        const factor = (index % 3 + 1) * 0.3;
        icon.style.transform = `translate(${offsetX * factor}px, ${offsetY * factor}px)`;
    });
    
    // 应用轻微视差到Logo
    logoContainer.style.transform = `translate(${offsetX * 0.05}px, ${offsetY * 0.05}px)`;
}

/**
 * 添加按钮动画效果
 * @param {HTMLElement} button - 按钮元素
 */
function addButtonAnimation(button) {
    // 创建轻微的呼吸效果
    const glow = document.createElement('div');
    glow.className = 'button-glow';
    
    const style = document.createElement('style');
    style.textContent = `
        .button-glow {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 43px;
            background-color: rgba(110, 198, 0, 0.3);
            animation: glow 3s infinite alternate ease-in-out;
            pointer-events: none;
        }
        
        @keyframes glow {
            0% { opacity: 0.3; transform: scale(1); }
            100% { opacity: 0.6; transform: scale(1.05); }
        }
    `;
    document.head.appendChild(style);
    
    const btnContainer = document.querySelector('.btn-container');
    btnContainer.style.position = 'relative';
    btnContainer.insertBefore(glow, button);
} 