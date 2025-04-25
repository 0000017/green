/**
 * Green应用介绍页面交互脚本
 */

// 当DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面动画
    initAnimations();
    
    // 设置导航栏滚动效果
    setupNavigation();
    
    // 初始化背景特效
    initBackgroundEffects();
    
    // 设置入口按钮事件
    document.getElementById('startButton').addEventListener('click', function() {
        window.location.href = 'canvas.html';
    });
});

/**
 * 初始化页面动画
 */
function initAnimations() {
    // 页面滚动动画
    const animatedElements = document.querySelectorAll('[data-aos]');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    animatedElements.forEach(element => {
        observer.observe(element);
        
        // 设置初始状态并立即显示元素，确保在JavaScript禁用时也能显示内容
        element.classList.add('aos-init');
        element.style.opacity = '1';
        
        // 设置延迟
        const delay = element.getAttribute('data-aos-delay');
        if (delay) {
            element.style.transitionDelay = `${delay}ms`;
        }
    });
    
    // 立即显示所有部分
    document.querySelectorAll('.section').forEach(section => {
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
    });
}

/**
 * 设置导航栏滚动效果
 */
function setupNavigation() {
    const sections = document.querySelectorAll('.section');
    const navItems = document.querySelectorAll('.nav-item');
    
    // 平滑滚动到锚点
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
                
                // 更新活动导航项
                navItems.forEach(item => item.classList.remove('active'));
                this.parentElement.classList.add('active');
            }
        });
    });
    
    // 滚动时更新活动导航项
    window.addEventListener('scroll', function() {
        let current = '';
        const scrollPos = window.pageYOffset;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.querySelector(`a[href="#${current}"]`)) {
                item.classList.add('active');
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