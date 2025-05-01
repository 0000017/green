// 定义全局函数，使其可以在内联脚本中调用
window.createRipples = createRipples;
window.animateBlurCircles = animateBlurCircles;

// 主初始化函数
function initWelcomeEffects() {
    console.log('欢迎页面效果初始化');
    
    // 创建涟漪效果
    createRipples();
    
    // 增强模糊圆圈动画
    animateBlurCircles();
}

// 增强模糊圆圈动画效果
function animateBlurCircles() {
    const circles = document.querySelectorAll('.blur-circle');
    if (!circles.length) {
        console.error('未找到模糊圆圈元素');
        return;
    }
    
    // 为每个圆圈设置随机大小变化动画
    circles.forEach((circle, index) => {
        // 为每个圆圈添加大小变化动画
        setInterval(() => {
            // 随机调整大小
            const sizeChange = randomBetween(0.95, 1.05);
            circle.style.transform = `scale(${sizeChange})`;
            
            // 随机调整不透明度
            const opacityChange = randomBetween(0.15, 0.25);
            circle.style.opacity = opacityChange.toString();
            
            // 延迟后恢复
            setTimeout(() => {
                circle.style.transform = '';
            }, 2000);
        }, 5000 + index * 1000); // 错开每个圆圈的动画时间
    });
    
    console.log('模糊圆圈动画增强已启用');
}

// 创建涟漪效果
function createRipples() {
    const container = document.querySelector('.ripple-container');
    if (!container) {
        console.error('涟漪容器不存在');
        return;
    }
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // 主色调
    const mainColors = [
        { r: 69, g: 119, b: 4 },    // 森林绿色 #457704
        { r: 110, g: 198, b: 0 },   // 鲜绿色 #6EC600
        { r: 183, g: 254, b: 93 },  // 亮绿色 #B7FE5D
        { r: 19, g: 248, b: 139 },  // 青绿色 #13F88B
        { r: 255, g: 243, b: 69 }   // 亮黄色 #FFF345
    ];
    
    // 设置涟漪出现的时间间隔
    function createNewRipple() {
        // 创建涟漪元素
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        
        // 随机位置
        const x = Math.random() * screenWidth;
        const y = Math.random() * (screenHeight * 0.7); // 主要在屏幕上方区域生成涟漪
        
        // 随机大小 - 减小涟漪尺寸
        const size = randomBetween(10, 30);
        
        // 随机动画时长和延迟
        const duration = randomBetween(3, 6);
        const delay = randomBetween(0, 2);
        
        // 随机选择颜色
        const colorIndex = Math.floor(Math.random() * mainColors.length);
        const color = mainColors[colorIndex];
        
        // 设置样式
        ripple.style.cssText = `
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
            opacity: ${randomBetween(0.1, 0.25)};
            border-color: rgba(${color.r}, ${color.g}, ${color.b}, ${randomBetween(0.15, 0.35)});
        `;
        
        // 添加到容器
        container.appendChild(ripple);
        
        // 动画结束后移除元素
        setTimeout(() => {
            ripple.remove();
        }, (duration + delay) * 1000);
        
        // 递归创建下一个涟漪 - 降低频率
        setTimeout(createNewRipple, randomBetween(800, 2000));
    }
    
    // 初始创建多个涟漪 - 减少初始数量
    for(let i = 0; i < 3; i++) {
        setTimeout(() => {
            createNewRipple();
        }, i * 500);
    }
}

// 生成随机数
function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

// 等待DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWelcomeEffects);
} else {
    // DOM已加载完成，直接初始化
    initWelcomeEffects();
}

// 同时监听window的load事件，以防DOMContentLoaded在iframe中不触发
window.addEventListener('load', function() {
    // 检查是否已初始化
    const rippleContainer = document.querySelector('.ripple-container');
    if (rippleContainer && rippleContainer.children.length === 0) {
        console.log('通过load事件触发初始化');
        initWelcomeEffects();
    }
});
