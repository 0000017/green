document.addEventListener('DOMContentLoaded', () => {
    // 创建涟漪效果
    createRipples();
    
    // 创建流型坠落效果
    createFlowingParticles();
    
    // 创建表情背景
    createEmojiBackground();
    
    // 添加自动跳转功能（因为不再有开始按钮）
    setTimeout(() => {
        // 淡出动画
        document.querySelector('.content').style.animation = 'fadeOut 0.8s forwards';
        
        // 延迟后跳转到下一页
        setTimeout(() => {
            // 这里使用Electron的IPC通信跳转到主页面
            if (window.electron) {
                window.electron.send('navigate', 'intro.html');
            } else {
                // 如果在浏览器环境中直接跳转
                window.location.href = 'intro.html';
            }
        }, 800);
    }, 5000); // 5秒后自动跳转
    
    // 添加淡出动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut {
            0% {
                opacity: 1;
                transform: translateY(0);
            }
            100% {
                opacity: 0;
                transform: translateY(-20px);
            }
        }
    `;
    document.head.appendChild(style);
});

// 创建表情背景
function createEmojiBackground() {
    const container = document.querySelector('.emoji-container');
    console.log('表情容器:', container); // 调试日志
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // 表情SVG文件路径，修正路径
    const emojis = [
        '../asset/伤心.svg',
        '../asset/吃惊.svg',
        '../asset/大哭.svg',
        '../asset/开心.svg',
        '../asset/怒.svg',
        '../asset/生气.svg'
    ];
    
    console.log('正在创建表情背景'); // 调试日志
    
    // 创建表情元素
    function createEmoji() {
        const emoji = document.createElement('img');
        emoji.className = 'emoji';
        
        // 随机选择表情
        const emojiIndex = Math.floor(Math.random() * emojis.length);
        emoji.src = emojis[emojiIndex];
        
        // 添加加载事件监听器
        emoji.onload = function() {
            console.log('表情加载成功:', emojis[emojiIndex]); // 调试日志
        };
        
        emoji.onerror = function() {
            console.error('表情加载失败:', emojis[emojiIndex]); // 调试日志
        };
        
        // 随机位置
        const x = Math.random() * screenWidth;
        const y = Math.random() * screenHeight;
        
        // 随机大小 - 增大尺寸
        const size = randomBetween(40, 100);
        
        // 随机透明度 - 增加透明度
        const opacity = randomBetween(0.3, 0.5);
        
        // 随机动画延迟和持续时间
        const delay = randomBetween(0, 10);
        const duration = randomBetween(10, 20);
        
        // 设置样式
        emoji.style.cssText = `
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            opacity: ${opacity};
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
            z-index: 5;
        `;
        
        // 添加到容器
        container.appendChild(emoji);
        console.log('已添加表情元素'); // 调试日志
    }
    
    // 创建更多表情
    const emojiCount = Math.max(15, Math.floor(screenWidth * screenHeight / 30000)); // 增加表情数量
    console.log('表情数量:', emojiCount); // 调试日志
    
    for(let i = 0; i < emojiCount; i++) {
        createEmoji();
    }
}

// 创建流型坠落效果
function createFlowingParticles() {
    const container = document.querySelector('.flowing-container');
    const screenWidth = window.innerWidth;
    
    // 获取设计指南中的配色
    const colors = [
        { start: 'rgba(183, 254, 93, 0.8)', end: 'rgba(110, 198, 0, 0)' }, // 亮绿到鲜绿
        { start: 'rgba(110, 198, 0, 0.8)', end: 'rgba(69, 119, 4, 0)' },  // 鲜绿到森林绿
        { start: 'rgba(19, 248, 139, 0.8)', end: 'rgba(19, 248, 139, 0)' }, // 青绿色
        { start: 'rgba(255, 243, 69, 0.8)', end: 'rgba(255, 243, 69, 0)' }, // 亮黄色
        { start: 'rgba(189, 252, 201, 0.8)', end: 'rgba(189, 252, 201, 0)' } // 淡绿色
    ];
    
    function createFlowingParticle() {
        // 创建流型坠落粒子
        const particle = document.createElement('div');
        particle.className = 'flowing-particle';
        
        // 随机位置、大小和速度
        const x = Math.random() * screenWidth;
        const size = randomBetween(5, 20);
        const duration = randomBetween(3, 7);
        
        // 随机选择颜色
        const colorIndex = Math.floor(Math.random() * colors.length);
        const selectedColor = colors[colorIndex];
        
        // 设置样式
        particle.style.cssText = `
            left: ${x}px;
            top: -${size}px;
            width: ${size}px;
            height: ${size}px;
            animation-duration: ${duration}s;
            background: linear-gradient(to bottom, ${selectedColor.start}, ${selectedColor.end});
        `;
        
        // 添加到容器
        container.appendChild(particle);
        
        // 动画结束后移除元素
        setTimeout(() => {
            particle.remove();
        }, duration * 1000);
        
        // 递归创建下一个粒子
        setTimeout(createFlowingParticle, randomBetween(100, 500));
    }
    
    // 初始创建多个粒子
    for(let i = 0; i < 10; i++) {
        setTimeout(() => {
            createFlowingParticle();
        }, i * 200);
    }
}

// 创建涟漪效果
function createRipples() {
    const container = document.querySelector('.ripple-container');
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
        
        // 随机大小
        const size = randomBetween(20, 60);
        
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
            opacity: ${randomBetween(0.1, 0.3)};
            border-color: rgba(${color.r}, ${color.g}, ${color.b}, ${randomBetween(0.2, 0.5)});
        `;
        
        // 添加到容器
        container.appendChild(ripple);
        
        // 动画结束后移除元素
        setTimeout(() => {
            ripple.remove();
        }, (duration + delay) * 1000);
        
        // 递归创建下一个涟漪
        setTimeout(createNewRipple, randomBetween(300, 1200));
    }
    
    // 初始创建多个涟漪
    for(let i = 0; i < 5; i++) {
        setTimeout(() => {
            createNewRipple();
        }, i * 200);
    }
}

// 生成随机数
function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

// 不再使用随机绿色RGB值，使用设计原则中的颜色
