document.addEventListener('DOMContentLoaded', function() {
    // 获取开始按钮元素
    const startButton = document.getElementById('start-btn');
    
    // 添加背景动态元素
    createBackgroundEffects();
    
    // 添加按钮点击事件监听
    startButton.addEventListener('click', function() {
        // 添加过渡动画效果
        document.querySelector('.content').style.animation = 'fadeOut 0.8s ease-in-out forwards';
        
        // 延迟后跳转到简介页面
        setTimeout(function() {
            window.location.href = 'intro.html';
        }, 800);
    });
    
    // 添加按钮悬停效果
    startButton.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
        this.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.2)';
    });
    
    startButton.addEventListener('mouseleave', function() {
        this.style.transform = '';
        this.style.boxShadow = '';
    });
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
        
        @keyframes fadeOut {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(-30px);
            }
        }
    `;
    
    document.head.appendChild(style);
} 