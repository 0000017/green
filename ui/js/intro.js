document.addEventListener('DOMContentLoaded', function() {
    // 初始化背景效果
    createBackgroundEffects();
    
    // 初始化滚动动画
    initScrollReveal();
    
    // 初始化导航栏滚动效果
    initNavbarScroll();
    
    // 初始化按钮事件
    initButtonEvents();
    
    // 为所有锚链接添加平滑滚动
    initSmoothScroll();
});

/**
 * 创建背景动态效果
 */
function createBackgroundEffects() {
    const background = document.querySelector('.background');
    
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
        
        background.appendChild(dot);
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
 * 初始化滚动时显示元素动画
 */
function initScrollReveal() {
    // 使用IntersectionObserver API检测元素是否在视口中
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1 // 当元素有10%进入视口时触发
    });
    
    // 观察所有section元素
    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section);
    });
    
    // 观察流程步骤元素
    document.querySelectorAll('.process-step').forEach((step, index) => {
        // 添加延迟，使流程步骤依次显示
        setTimeout(() => {
            observer.observe(step);
        }, index * 200);
    });
    
    // 观察功能卡片元素
    document.querySelectorAll('.feature-card').forEach((card, index) => {
        // 添加CSS动画延迟，使卡片依次显示
        card.style.animationDelay = `${index * 0.2}s`;
        observer.observe(card);
    });
}

/**
 * 初始化导航栏滚动效果
 */
function initNavbarScroll() {
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.style.padding = '10px 40px';
            header.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.padding = '20px 40px';
            header.style.boxShadow = 'none';
        }
    });
    
    // 监听滚动位置，高亮当前所在的导航项
    window.addEventListener('scroll', function() {
        // 获取所有section
        const sections = document.querySelectorAll('.section');
        
        // 找出当前滚动位置对应的section
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (window.scrollY >= sectionTop - 200 && window.scrollY < sectionTop + sectionHeight - 200) {
                current = section.getAttribute('id');
            }
        });
        
        // 更新导航栏高亮
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.querySelector('a').getAttribute('href') === `#${current}`) {
                item.classList.add('active');
            }
        });
    });
}

/**
 * 初始化按钮事件
 */
function initButtonEvents() {
    // 下一步按钮
    const nextButton = document.getElementById('next-btn');
    
    nextButton.addEventListener('click', function() {
        // 添加过渡动画效果
        document.querySelector('.intro-container').style.animation = 'fadeOut 0.8s ease-in-out forwards';
        
        // 延迟后跳转到设备调试页面
        setTimeout(function() {
            window.location.href = 'device-setup.html';
        }, 800);
    });
    
    // 添加按钮悬停效果
    nextButton.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
        this.style.boxShadow = '0 10px 20px rgba(76, 175, 80, 0.4)';
    });
    
    nextButton.addEventListener('mouseleave', function() {
        this.style.transform = '';
        this.style.boxShadow = '0 5px 15px rgba(76, 175, 80, 0.3)';
    });
}

/**
 * 为所有锚链接添加平滑滚动
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // 考虑顶部导航栏的高度
                    behavior: 'smooth'
                });
            }
        });
    });
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
`;

document.head.appendChild(style); 