// 情感数据图像生成功能
// 基于emotion-fusion.js的情感数据生成可视化效果

function emotionSketch(p) {
  let emotionData = null;  // 情感数据
  let particles = [];      // 粒子系统
  let numParticles = 200;  // 粒子数量
  let visualizationMode = 'particles';  // 可视化模式
  let modeSelect;
  
  // 情感数据监听器
  let emotionListener = null;
  
  // 可视化模式配置
  const modes = {
    'particles': {
      label: '粒子系统',
      render: renderParticles
    },
    'waves': {
      label: '情感波浪',
      render: renderWaves
    },
    'landscape': {
      label: '情感景观',
      render: renderLandscape
    },
    'bloom': {
      label: '情感绽放',
      render: renderBloom
    }
  };
  
  p.setup = function() {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.position(0, 0);
    canvas.style('z-index', '800');
    p.background(255);
    p.colorMode(p.HSB, 100);
    
    // 初始化粒子系统（无论是否有保存的画布）
    initParticles();
    
    // 如果有保存的画布，恢复内容
    if (savedCanvas && savedCanvas.width && savedCanvas.height) {
      try {
        console.log('正在恢复画布内容到情感画布...');
        // 如果savedCanvas是canvas元素，使用drawImage方法
        if (savedCanvas instanceof HTMLCanvasElement) {
          // 确保p.drawingContext是可用的
          if (p.drawingContext) {
            p.drawingContext.drawImage(savedCanvas, 0, 0);
            console.log('使用drawingContext恢复成功');
          } else {
            // 创建一个p5.Image对象
            let img = p.createImage(savedCanvas.width, savedCanvas.height);
            img.drawingContext.drawImage(savedCanvas, 0, 0);
            p.image(img, 0, 0);
            console.log('使用p5.Image恢复成功');
          }
        } else {
          // 如果savedCanvas是p5.Image对象，直接使用
          p.image(savedCanvas, 0, 0);
          console.log('使用image()恢复成功');
        }
      } catch (e) {
        console.warn('恢复画布内容失败:', e);
      }
    }
    
    // 创建可视化模式选择器
    modeSelect = p.createSelect();
    modeSelect.position(20, p.height - 40);
    modeSelect.style('width', '120px');
    for (let mode in modes) {
      modeSelect.option(modes[mode].label, mode);
    }
    modeSelect.changed(modeChanged);
    
    // 创建捕获按钮
    const captureButton = p.createButton('捕获当前');
    captureButton.position(150, p.height - 40);
    captureButton.mousePressed(() => {
      try {
        savedCanvas = p.get();
      } catch (e) {
        console.warn('捕获画布失败:', e);
      }
    });
    
    // 创建并立即设置一个初始情感数据，确保首次渲染时有数据
    emotionData = {
      X: 0,                // 效价：中性
      Y: 50,               // 唤醒度：中等
      Z: '中性',           // 情感类型：中性
      confidence: 0.8      // 置信度
    };
    
    // 添加情感数据监听
    try {
      // 检查emotion-fusion模块是否可用
      if (window.emotionFusion) {
        emotionListener = function(data) {
          emotionData = data;
          console.log('情感数据更新:', emotionData);
        };
        window.emotionFusion.addUpdateListener(emotionListener);
      } else {
        console.warn('情感融合模块不可用，将使用模拟数据');
        // 创建模拟数据更新
        setInterval(() => {
          emotionData = {
            X: p.map(p.sin(p.frameCount * 0.01), -1, 1, -100, 100),  // 效价
            Y: p.map(p.cos(p.frameCount * 0.02), -1, 1, 0, 100),     // 唤醒度
            Z: ['开心', '悲伤', '愤怒', '惊讶', '恐惧', '厌恶', '中性'][Math.floor(p.random(7))],
            confidence: p.random(0.5, 1)
          };
        }, 100); // 降低更新间隔为100ms以提高响应性
      }
    } catch (e) {
      console.error('初始化情感数据监听时出错:', e);
    }
  };
  
  function modeChanged() {
    visualizationMode = modeSelect.value();
  }
  
  // 初始化粒子系统
  function initParticles() {
    console.log('初始化粒子系统...');
    particles = [];
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: p.random(p.width),
        y: p.random(p.height),
        size: p.random(3, 8),
        speedX: p.random(-1, 1),
        speedY: p.random(-1, 1),
        color: [p.random(100), 80, 80]  // HSB颜色
      });
    }
    console.log(`已创建 ${particles.length} 个粒子`);
  }
  
  p.draw = function() {
    // 确保粒子系统已初始化
    if (!particles || particles.length === 0) {
      console.log('粒子系统未初始化，重新初始化...');
      initParticles();
    }
    
    // 根据选择的模式渲染可视化效果
    if (modes[visualizationMode] && typeof modes[visualizationMode].render === 'function') {
      modes[visualizationMode].render(p, emotionData);
    } else {
      console.warn('无效的可视化模式:', visualizationMode);
      // 默认使用粒子系统
      modes['particles'].render(p, emotionData);
    }
  };
  
  // 粒子系统渲染
  function renderParticles(p, data) {
    p.background(0, 0, 20, 10);  // 半透明背景，产生拖尾效果
    
    if (!data) {
      // 无情感数据时，粒子随机运动
      for (let i = 0; i < particles.length; i++) {
        updateParticle(particles[i], null);
        drawParticle(particles[i]);
      }
      return;
    }
    
    // 根据情感数据更新粒子系统
    const emotionColor = getEmotionColor(data.Z);
    const energy = Math.abs(data.Y) / 100;  // 唤醒度控制粒子能量
    const harmony = (data.X + 100) / 200;   // 效价控制粒子和谐度
    
    for (let i = 0; i < particles.length; i++) {
      updateParticle(particles[i], {
        color: emotionColor,
        energy: energy,
        harmony: harmony
      });
      drawParticle(particles[i]);
    }
  }
  
  // 更新粒子状态
  function updateParticle(particle, params) {
    if (params) {
      // 根据情感参数更新粒子
      particle.color = [params.color, 80, 80];
      
      // 效价影响粒子运动方向
      const angle = p.noise(particle.x * 0.01, particle.y * 0.01, p.frameCount * 0.01) * p.TWO_PI * 2;
      const speed = params.energy * 2;
      particle.speedX = p.cos(angle) * speed;
      particle.speedY = p.sin(angle) * speed;
      
      // 唤醒度影响粒子大小
      particle.size = p.map(params.energy, 0, 1, 2, 8);
    } else {
      // 无情感数据时的基本更新
      if (p.frameCount % 20 === 0) {
        const angle = p.noise(particle.x * 0.01, particle.y * 0.01, p.frameCount * 0.01) * p.TWO_PI;
        particle.speedX = p.cos(angle) * p.random(0.5, 1);
        particle.speedY = p.sin(angle) * p.random(0.5, 1);
      }
    }
    
    // 更新位置
    particle.x += particle.speedX;
    particle.y += particle.speedY;
    
    // 边界检查
    if (particle.x < 0) particle.x = p.width;
    if (particle.x > p.width) particle.x = 0;
    if (particle.y < 0) particle.y = p.height;
    if (particle.y > p.height) particle.y = 0;
  }
  
  // 绘制粒子
  function drawParticle(particle) {
    p.noStroke();
    p.fill(particle.color[0], particle.color[1], particle.color[2], 80);
    p.ellipse(particle.x, particle.y, particle.size, particle.size);
  }
  
  // 波浪可视化
  function renderWaves(p, data) {
    p.background(0, 0, 20);
    
    // 如果没有情感数据，使用默认值
    const defaultData = {
      X: 0,
      Y: 50,
      Z: '中性'
    };
    
    // 使用实际数据或默认数据
    const renderData = data || defaultData;
    
    const emotionColor = getEmotionColor(renderData.Z);
    const amplitude = p.map(renderData.Y, 0, 100, 50, 200);  // 唤醒度控制波浪幅度
    const frequency = p.map(renderData.X, -100, 100, 0.005, 0.02);  // 效价控制波浪频率
    
    p.strokeWeight(2);
    p.noFill();
    
    // 绘制多层波浪
    for (let j = 0; j < 5; j++) {
      p.stroke(emotionColor, 70 - j * 10, 90 - j * 5, 70);
      p.beginShape();
      for (let i = 0; i < p.width; i += 5) {
        const xOffset = i * frequency;
        const yOffset = p.frameCount * 0.02 + j * 0.5;
        const y = p.height / 2 + p.sin(xOffset + yOffset) * amplitude * (1 - j * 0.15);
        p.vertex(i, y);
      }
      p.endShape();
    }
  }
  
  // 情感景观可视化
  function renderLandscape(p, data) {
    p.background(0, 0, 15);
    
    // 如果没有情感数据，使用默认值
    const defaultData = {
      X: 0,
      Y: 50,
      Z: '中性'
    };
    
    // 使用实际数据或默认数据
    const renderData = data || defaultData;
    
    const emotionColor = getEmotionColor(renderData.Z);
    const heightVariation = p.map(renderData.X, -100, 100, 0.5, 2);  // 效价控制景观高度变化
    const complexity = p.map(renderData.Y, 0, 100, 0.001, 0.01);     // 唤醒度控制复杂度
    
    const rows = 20;
    const cols = 40;
    const terrainWidth = p.width * 1.2;
    const terrainHeight = p.height * 0.8;
    const cellWidth = terrainWidth / cols;
    const cellHeight = terrainHeight / rows;
    
    p.push();
    p.translate(-p.width * 0.1, p.height * 0.6);
    
    for (let y = 0; y < rows - 1; y++) {
      p.beginShape(p.TRIANGLE_STRIP);
      for (let x = 0; x < cols; x++) {
        // 使用柏林噪声生成地形高度
        const nx1 = x * complexity;
        const ny1 = y * complexity + p.frameCount * 0.005;
        const nx2 = x * complexity;
        const ny2 = (y + 1) * complexity + p.frameCount * 0.005;
        
        const h1 = p.noise(nx1, ny1) * 200 * heightVariation;
        const h2 = p.noise(nx2, ny2) * 200 * heightVariation;
        
        // 根据高度设置颜色
        const c1 = p.color(
          emotionColor,
          p.map(h1, 0, 200 * heightVariation, 30, 80),
          p.map(h1, 0, 200 * heightVariation, 30, 90)
        );
        const c2 = p.color(
          emotionColor,
          p.map(h2, 0, 200 * heightVariation, 30, 80),
          p.map(h2, 0, 200 * heightVariation, 30, 90)
        );
        
        p.fill(c1);
        p.vertex(x * cellWidth, -h1);
        p.fill(c2);
        p.vertex(x * cellWidth, -h2);
      }
      p.endShape();
    }
    p.pop();
  }
  
  // 情感绽放可视化
  function renderBloom(p, data) {
    p.background(0, 0, 20, 25);  // 半透明背景
    
    // 如果没有情感数据，使用默认值
    const defaultData = {
      X: 0,
      Y: 50,
      Z: '中性'
    };
    
    // 使用实际数据或默认数据
    const renderData = data || defaultData;
    
    const emotionColor = getEmotionColor(renderData.Z);
    const size = p.map(renderData.Y, 0, 100, 50, 200);  // 唤醒度控制绽放大小
    const complexity = p.map(Math.abs(renderData.X), 0, 100, 3, 12);  // 效价绝对值控制复杂度
    
    p.push();
    p.translate(p.width / 2, p.height / 2);
    
    // 绘制花朵中心
    p.noStroke();
    p.fill(emotionColor, 50, 100, 80);
    p.ellipse(0, 0, size / 4, size / 4);
    
    // 绘制花瓣
    const petalCount = Math.floor(complexity);
    const innerRadius = size / 4;
    const outerRadius = size;
    
    for (let i = 0; i < petalCount; i++) {
      const angle = p.map(i, 0, petalCount, 0, p.TWO_PI);
      const waveSpeed = 0.05;
      const waveMagnitude = size / 10;
      
      // 添加一些波动效果
      const waveOffset = p.sin(p.frameCount * waveSpeed + i) * waveMagnitude;
      const actualOuterRadius = outerRadius + waveOffset;
      
      // 确定花瓣颜色
      const hue = (emotionColor + i * 5) % 100;
      const saturation = 70 - i * 3;
      const brightness = 90 - i * 2;
      
      p.fill(hue, saturation, brightness, 70);
      p.stroke(hue, saturation - 10, brightness - 10, 90);
      p.strokeWeight(1);
      
      // 绘制花瓣
      p.beginShape();
      for (let t = 0; t <= 1; t += 0.05) {
        const petalAngle = angle + t * (p.TWO_PI / petalCount);
        const r = p.lerp(innerRadius, actualOuterRadius, p.sin(t * p.PI));
        const x = r * p.cos(petalAngle);
        const y = r * p.sin(petalAngle);
        p.vertex(x, y);
      }
      p.endShape(p.CLOSE);
    }
    
    p.pop();
  }
  
  // 根据情感类型获取颜色值
  function getEmotionColor(emotion) {
    switch (emotion) {
      case '开心':
        return 60; // 黄色
      case '悲伤':
        return 240; // 蓝色
      case '愤怒':
        return 0; // 红色
      case '惊讶':
        return 30; // 橙色
      case '恐惧':
        return 270; // 紫色
      case '厌恶':
        return 120; // 绿色
      case '中性':
      default:
        return 200; // 浅蓝色
    }
  }
  
  p.windowResized = function() {
    try {
      // 保存当前绘制内容
      const tempCanvas = p.get();
      
      // 调整画布大小
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      
      // 检查tempCanvas是否有效后再绘制
      if (tempCanvas && typeof tempCanvas.width !== 'undefined' && typeof tempCanvas.height !== 'undefined' && tempCanvas.width > 0 && tempCanvas.height > 0) {
        // 如果tempCanvas是HTMLCanvasElement
        if (tempCanvas instanceof HTMLCanvasElement) {
          p.drawingContext.drawImage(tempCanvas, 0, 0);
        } 
        // 如果tempCanvas是p5.Image
        else if (tempCanvas.width && tempCanvas.height) {
          p.image(tempCanvas, 0, 0);
        }
        console.log('windowResized: 成功恢复情感画布内容');
      } else {
        console.warn('windowResized: tempCanvas无效，将不恢复内容');
        // 对于情感模式，使用深色背景
        p.background(0, 0, 20);
        // 重新初始化粒子（如果是粒子模式）
        if (visualizationMode === 'particles') {
          initParticles();
        }
      }
    } catch (e) {
      console.error('windowResized出错:', e);
      // 对于情感模式，使用深色背景
      p.background(0, 0, 20);
    }
    
    // 更新控件位置
    modeSelect.position(20, p.height - 40);
  };
  
  p.get = function() {
    try {
      // 创建临时画布
      let tempCanvas = document.createElement('canvas');
      let p5Canvas = p.canvas;
      
      if (p5Canvas && p5Canvas.width && p5Canvas.height) {
        // 复制原始画布的尺寸
        tempCanvas.width = p5Canvas.width;
        tempCanvas.height = p5Canvas.height;
        
        // 复制画布内容
        let ctx = tempCanvas.getContext('2d');
        ctx.drawImage(p5Canvas, 0, 0);
        
        console.log('成功获取情感画布内容', tempCanvas.width, tempCanvas.height);
        return tempCanvas;
      }
    } catch (e) {
      console.warn('获取画布内容失败:', e);
    }
    
    return p.canvas;
  };
  
  p.clear = function() {
    p.background(255);
  };
  
  p.saveCanvas = function(name, type) {
    p.save(name, type);
  };
  
  // 清理函数，移除监听器
  p.remove = function() {
    if (emotionListener && window.emotionFusion) {
      window.emotionFusion.removeUpdateListener(emotionListener);
    }
    
    // 避免递归调用，尝试不同的方法来清理资源
    if (p.canvas && p.canvas.remove) {
      // 如果canvas有remove方法，直接调用
      p.canvas.remove();
    } else if (p.canvas && p.canvas.parentElement) {
      // 如果没有remove方法，从DOM中移除canvas元素
      p.canvas.parentElement.removeChild(p.canvas);
    }
    
    // 清理其他资源
    if (p._renderer) {
      if (p._renderer.remove) {
        p._renderer.remove();
      }
    }
  };
} 