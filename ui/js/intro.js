/**
 * Green应用介绍页面交互脚本
 */

// 封装初始化函数
function initIntroPage() {
    // 初始化全屏滚动
    initFullPageScroll();
    
    // 初始化卡片轮播
    initCarousels();
    
    // 初始化背景特效
    initBackgroundEffects();
    
    // 设置入口按钮事件
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', function() {
            // 导航到下一个页面
            if (window.parent && window.parent.navigateToPage) {
                // 如果作为子页面，使用父窗口的导航系统
                window.parent.navigateToPage('device-setup-page');
            } else {
                // 作为独立页面
                window.location.href = 'device-setup.html';
            }
    });
    }
}

// 监听DOMContentLoaded事件（直接打开页面时触发）
document.addEventListener('DOMContentLoaded', function() {
    initIntroPage();
});

// 监听自定义的pageLoaded事件（作为子页面加载时可以通过触发此事件进行初始化）
document.addEventListener('pageLoaded', function() {
    initIntroPage();
});

// 如果DOM已经加载完成（可能出现在加载为子页面后再添加代码的情况）
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initIntroPage();
}

/**
 * 初始化全屏滚动
 */
function initFullPageScroll() {
    // 获取相关元素
    const sections = document.querySelectorAll('.fullpage-section');
    const paginationItems = document.querySelectorAll('.fullpage-pagination li');
    const fullpageWrapper = document.querySelector('.fullpage-wrapper');
    
    let currentIndex = 0;
    let isScrolling = false;
    let touchStartY = 0;
    let touchEndY = 0;
    
    // 更新当前页面
    function goToSection(index) {
        if (isScrolling || index === currentIndex) return;
        
        if (index < 0) index = 0;
        if (index >= sections.length) index = sections.length - 1;
        
        isScrolling = true;
        currentIndex = index;
        
        // 更新页面位置
        fullpageWrapper.style.transform = `translateY(-${index * 100}vh)`;
        
        // 更新导航状态
        paginationItems.forEach(item => item.classList.remove('active'));
        
        paginationItems[index].classList.add('active');
        
        // 动画完成后允许再次滚动
        setTimeout(() => {
            isScrolling = false;
        }, 800);
    }
    
    // 添加页面滚轮事件
    document.addEventListener('wheel', function(e) {
        if (isScrolling) return;
        
        if (e.deltaY > 0) {
            // 向下滚动
            goToSection(currentIndex + 1);
        } else {
            // 向上滚动
            goToSection(currentIndex - 1);
        }
    });
    
    // 添加触摸事件（移动端支持）
    document.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchend', function(e) {
        touchEndY = e.changedTouches[0].clientY;
        
        const deltaY = touchEndY - touchStartY;
        
        if (Math.abs(deltaY) > 100) { // 确保足够的滑动距离
            if (deltaY < 0) {
                // 向上滑动，显示下一部分
                goToSection(currentIndex + 1);
            } else {
                // 向下滑动，显示上一部分
                goToSection(currentIndex - 1);
            }
        }
    });
    
    // 添加键盘事件
    document.addEventListener('keydown', function(e) {
        if (isScrolling) return;
        
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            goToSection(currentIndex + 1);
            e.preventDefault();
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            goToSection(currentIndex - 1);
            e.preventDefault();
        }
    });
    
    // 页面指示器点击事件
    paginationItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                e.preventDefault();
            }
            const index = parseInt(this.getAttribute('data-index'));
            goToSection(index);
        });
    });
    
    // 初始化章节哈希检查
    checkInitialHash();
    
    // 检查初始URL哈希值
    function checkInitialHash() {
        const hash = window.location.hash;
        if (hash) {
            const targetSection = document.querySelector(hash);
            if (targetSection) {
                const sectionArray = Array.from(sections);
                const targetIndex = sectionArray.indexOf(targetSection);
                if (targetIndex !== -1) {
                    // 使用setTimeout以确保DOM完全加载
                    setTimeout(() => goToSection(targetIndex), 100);
                }
            }
        }
    }
    
    // 监听哈希变化
    window.addEventListener('hashchange', checkInitialHash);
}

/**
 * 初始化卡片轮播
 */
function initCarousels() {
    const carousels = document.querySelectorAll('.card-carousel');
    
    carousels.forEach(carousel => {
        // 获取当前轮播的相关元素
        const items = carousel.querySelectorAll('.carousel-item');
        const prevBtn = carousel.querySelector('.carousel-control.prev');
        const nextBtn = carousel.querySelector('.carousel-control.next');
        const indicators = carousel.querySelectorAll('.carousel-indicators .indicator');
        const target = carousel.querySelector('.carousel-controls').getAttribute('data-target');
        
        let currentIndex = 0;
        
        // 初始化显示第一个卡片
        items[0].classList.add('active');
        
        // 显示指定索引的卡片
        function showItem(index) {
            if (index < 0) index = items.length - 1;
            if (index >= items.length) index = 0;
            
            // 更新当前索引
            currentIndex = index;
            
            // 隐藏所有卡片，显示当前卡片
            items.forEach(item => item.classList.remove('active'));
            items[currentIndex].classList.add('active');
            
            // 更新指示器状态
            indicators.forEach((indicator, i) => {
                if (i === currentIndex) {
                    indicator.classList.add('active');
                } else {
                    indicator.classList.remove('active');
                }
            });
        }
        
        // 添加按钮点击事件
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                showItem(currentIndex - 1);
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                showItem(currentIndex + 1);
            });
        }
        
        // 添加指示器点击事件
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                showItem(index);
            });
        });
        
        // 添加键盘事件（左右箭头）
        document.addEventListener('keydown', (e) => {
            // 确保只有当前在显示相应的部分时才处理键盘事件
            const activeNavItem = document.querySelector('.nav-item.active');
            
            // 添加空检查，防止null引用错误
            if (!activeNavItem) return;
            
            const index = activeNavItem.getAttribute('data-index');
            if (!index) return;
            
            const currentSection = document.querySelector('.fullpage-section:nth-child(' + (index * 1 + 1) + ')');
            
            if (currentSection && currentSection.id === target) {
                if (e.key === 'ArrowLeft') {
                    showItem(currentIndex - 1);
                } else if (e.key === 'ArrowRight') {
                    showItem(currentIndex + 1);
                }
            }
        });
        
        // 添加触摸滑动事件
        let touchStartX = 0;
        let touchEndX = 0;
        
        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });
        
        carousel.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].clientX;
            
            // 计算滑动距离
            const deltaX = touchEndX - touchStartX;
            
            // 确保足够的滑动距离
            if (Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    // 向右滑动，显示上一张
                    showItem(currentIndex - 1);
                } else {
                    // 向左滑动，显示下一张
                    showItem(currentIndex + 1);
                }
            }
        });
    });
}

/**
 * 初始化背景特效
 */
function initBackgroundEffects() {
    // 1. 浮动背景圆形动画
    animateBackgroundCircles();
    
    // 2. 表情背景
    createEmojiBackground();
    
    // 3. 流动粒子
    createFlowingParticles();
    
    // 4. 点击涟漪效果
    document.addEventListener('click', createRippleEffect);
}

/**
 * 动画背景圆形元素
 */
function animateBackgroundCircles() {
    const circles = document.querySelectorAll('.blur-circle');
    
    circles.forEach(circle => {
        // 初始随机位置
        const randomX = Math.random() * 20 - 10;
        const randomY = Math.random() * 20 - 10;
        circle.style.transform = `translate(${randomX}px, ${randomY}px)`;
        
        // 随机位置浮动
        setInterval(() => {
            const randomX = Math.random() * 20 - 10;
            const randomY = Math.random() * 20 - 10;
            
            circle.style.transform = `translate(${randomX}px, ${randomY}px)`;
        }, 3000);
    });
}

/**
 * 创建表情背景
 */
function createEmojiBackground() {
    const container = document.getElementById('emojiContainer');
    if (!container) return;
    
    // 清空容器以防止重复创建
    container.innerHTML = '';
    
    const emojis = ['😊', '🌿', '💚', '🎨', '🧘', '✨', '🌱', '🌈', '🍃', '💭'];
    const count = 20;
    
    for (let i = 0; i < count; i++) {
        const emoji = document.createElement('div');
        emoji.className = 'background-emoji';
        emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        
        // 随机位置
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        
        // 随机大小
        const size = Math.random() * 24 + 16;
        
        // 随机透明度
        const opacity = Math.random() * 0.2 + 0.1;
        
        // 随机旋转
        const rotation = Math.random() * 40 - 20;
        
        emoji.style.cssText = `
            position: absolute;
            left: ${posX}%;
            top: ${posY}%;
            font-size: ${size}px;
            opacity: ${opacity};
            transform: rotate(${rotation}deg);
        `;
        
        container.appendChild(emoji);
    }
}

/**
 * 创建流动粒子
 */
function createFlowingParticles() {
    const container = document.getElementById('flowingParticles');
    if (!container) return;
    
    // 清空容器以防止重复创建
    container.innerHTML = '';
    
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'flowing-particle';
        
        // 随机尺寸
        const size = Math.random() * 6 + 2;
        
        // 随机位置
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        
        // 随机透明度
        const opacity = Math.random() * 0.4 + 0.1;
        
        // 随机动画持续时间
        const duration = Math.random() * 20 + 10;
        
        // 随机颜色
        const colors = ['#457704', '#6EC600', '#B7FE5D', '#BDFCC9'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border-radius: 50%;
            left: ${posX}%;
            top: ${posY}%;
            opacity: ${opacity};
            animation: float ${duration}s linear infinite;
            animation-delay: -${Math.random() * duration}s;
        `;
        
        container.appendChild(particle);
    }
    
    // 添加动画样式
    if (!document.getElementById('particle-animation-style')) {
        const style = document.createElement('style');
        style.id = 'particle-animation-style';
        style.textContent = `
            @keyframes float {
                0% {
                    transform: translateY(0) translateX(0);
                }
                25% {
                    transform: translateY(-20px) translateX(10px);
                }
                50% {
                    transform: translateY(-40px) translateX(-10px);
                }
                75% {
                    transform: translateY(-60px) translateX(5px);
                }
                100% {
                    transform: translateY(-100vh) translateX(0);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * 创建点击涟漪效果
 */
function createRippleEffect(event) {
    const container = document.getElementById('rippleEffects');
    if (!container) return;
    
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    
    const size = Math.max(100, Math.random() * 200);
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    
    ripple.style.left = `${event.clientX - size/2}px`;
    ripple.style.top = `${event.clientY - size/2}px`;
    
    container.appendChild(ripple);
    
    // 一秒后移除元素
    setTimeout(() => {
        ripple.remove();
    }, 1000);
} 