// camera_g.js - 绿色摄像头模块
// 绿色摄像头功能的封装

// 配置选项
window.GreenCameraConfig = {
  // 默认检测颜色 (r,g,b)
  detectionColor: {r: 255, g: 0, b: 0},
  
  // 检测阈值 (越小越敏感)
  threshold: 70 * 3,
  
  // 粒子大小和密度
  stepSize: 8,
  
  // 粒子生命周期
  particleLifetime: 0.5,
  
  // 是否自动缩放
  autoScale: true,
  
  // 粒子风格: 'classic' 或 'poisson'
  particleStyle: 'classic',
  
  // 泊松盘采样参数
  poisson: {
    // 线条颜色
    colors: ["#2c2060", "#4bd3e5", "#ffd919", "#ff4f19"],
    // 最小距离
    radius: 5,
    // 每次尝试次数
    k: 30,
    // 线条粗细
    strokeWeight: 2
  },
  
  // 设置检测颜色
  setDetectionColor: function(r, g, b) {
    this.detectionColor = {r: r, g: g, b: b};
    return this;
  },
  
  // 设置阈值
  setThreshold: function(threshold) {
    this.threshold = threshold;
    return this;
  },
  
  // 设置步长（粒子密度）
  setStepSize: function(stepSize) {
    this.stepSize = stepSize;
    return this;
  },
  
  // 设置粒子生命周期
  setParticleLifetime: function(lifetime) {
    this.particleLifetime = lifetime;
    return this;
  },
  
  // 设置是否自动缩放
  setAutoScale: function(autoScale) {
    this.autoScale = autoScale;
    return this;
  },
  
  // 设置粒子风格
  setParticleStyle: function(style) {
    if (style === 'classic' || style === 'poisson') {
      this.particleStyle = style;
      console.log('粒子风格已设置为:', style);
    }
    return this;
  },
  
  // 设置泊松盘参数
  setPoissonParams: function(params) {
    if (params) {
      if (params.colors) this.poisson.colors = params.colors;
      if (params.radius) this.poisson.radius = params.radius;
      if (params.k) this.poisson.k = params.k;
      if (params.strokeWeight) this.poisson.strokeWeight = params.strokeWeight;
    }
    return this;
  }
};

// 导出绿色摄像头sketch函数
window.greenCameraSketch = function(p) {
  // 变量声明
  let capture;
  let artboard;
  let particles = [];
  let config = window.GreenCameraConfig;
  
  // 光流检测变量
  let lastImageData;
  let currentImageData;
  let vectorField = null;
  
  // 泊松盘采样相关变量
  let grid = [];          // 空间网格
  let active = [];        // 活动点
  let nCols, nRows;       // 网格尺寸
  let w;                  // 网格单元大小
  
  // 摄像头与画布映射变量
  let xOffset = 0;        // 摄像头图像X偏移
  let yOffset = 0;        // 摄像头图像Y偏移
  let displayWidth = 0;   // 显示宽度
  let displayHeight = 0;  // 显示高度
  let scaleRatio = 1;     // 缩放比例
  
  p.setup = function() {
    // 创建与窗口大小匹配的画布，实现全屏显示
    var canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    p.pixelDensity(1);
    
    // 创建摄像头捕获
    capture = p.createCapture(p.VIDEO);
    capture.hide();
    
    // 创建绘图图层，与画布大小相同
    artboard = p.createGraphics(p.width, p.height);
    artboard.pixelDensity(1);
    artboard.noStroke();
    
    // 初始化泊松盘采样
    initPoissonGrid();
    
    // 初始化光流缓冲区
    lastImageData = new Uint8ClampedArray(p.width * p.height * 4);
    currentImageData = new Uint8ClampedArray(p.width * p.height * 4);
    
    // 暴露配置对象
    p.config = config;
    
    console.log("绿色摄像头初始化完成，粒子风格:", config.particleStyle);
  };
  
  // 初始化泊松盘采样网格
  function initPoissonGrid() {
    const r = config.poisson.radius;
    w = r / p.sqrt(2);
    
    nCols = p.floor(p.width / w);
    nRows = p.floor(p.height / w);
    
    // 重置网格
    grid = [];
    for (let i = 0; i < nRows; i++) {
      let newRow = [];
      for (let j = 0; j < nCols; j++) {
        newRow.push(undefined);
      }
      grid.push(newRow);
    }
    
    // 重置活动点
    active = [];
    
    console.log('泊松网格已初始化，风格:', config.particleStyle);
  }
  
  // 更新光流帧缓冲区
  function advanceBuffer() {
    // 交换缓冲区
    let temp = lastImageData;
    lastImageData = currentImageData;
    currentImageData = temp;
    
    // 填充当前帧数据
    if (capture.pixels && capture.pixels.length > 0) {
      for (let i = 0; i < currentImageData.length; i++) {
        currentImageData[i] = capture.pixels[i];
      }
    }
  }
  
  // 获取画布上某点对应的摄像头像素索引
  function getCaptureSampleIndex(x, y) {
    // 检查点是否在摄像头显示区域内
    if (x < xOffset || x >= xOffset + displayWidth || 
        y < yOffset || y >= yOffset + displayHeight) {
      return -1;
    }
    
    // 将画布坐标转换为摄像头坐标
    const cameraX = Math.floor(((x - xOffset) / displayWidth) * capture.width);
    const cameraY = Math.floor(((y - yOffset) / displayHeight) * capture.height);
    
    // 计算像素索引
    return (cameraY * capture.width + cameraX);
  }
  
  // 计算光流场
  function calculateFlow(prev, curr, width, height, stepSize) {
    const zones = [];
    
    for (let y = 0; y < height; y += stepSize) {
      for (let x = 0; x < width; x += stepSize) {
        let dx = 0;
        let dy = 0;
        let count = 0;
        
        // 计算周围像素的平均运动
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const xp = x + i;
            const yp = y + j;
            
            if (xp >= 0 && xp < width && yp >= 0 && yp < height) {
              const idx = (yp * width + xp) * 4;
              
              // 简单的像素差异计算
              if (prev[idx] !== undefined && curr[idx] !== undefined) {
                const diffR = curr[idx] - prev[idx];
                const diffG = curr[idx + 1] - prev[idx + 1];
                const diffB = curr[idx + 2] - prev[idx + 2];
                
                // 使用RGB通道的平均差作为运动向量
                dx += (diffR + diffG + diffB) / 3;
                dy += (diffR + diffG + diffB) / 3;
                count++;
              }
            }
          }
        }
        
        // 计算平均运动向量
        if (count > 0) {
          dx = dx / count * 0.1; // 缩放因子，控制矢量长度
          dy = dy / count * 0.1;
        }
        
        // 创建区域对象
        zones.push({
          x: x,
          y: y,
          u: dx,
          v: dy,
          getX: function() { return this.x; },
          getY: function() { return this.y; },
          getU: function() { return this.u; },
          getV: function() { return this.v; },
          draw: function() {
            // 可选：绘制矢量场
            // p.line(this.x, this.y, this.x + this.u * 5, this.y + this.v * 5);
          }
        });
      }
    }
    
    return {
      zones: zones,
      width: width,
      height: height,
      stepSize: stepSize
    };
  }
  
  // 获取插值后的矢量
  function getVectorInterpolated(xNorm, yNorm, field) {
    if (!field || !field.zones || field.zones.length === 0) {
      return { 
        getX: function() { return p.width * xNorm; }, 
        getY: function() { return p.height * yNorm; },
        getU: function() { return p.random(-2, 2); },
        getV: function() { return p.random(-2, 2); }
      };
    }
    
    // 将归一化坐标转换为像素坐标
    const x = xNorm * field.width;
    const y = yNorm * field.height;
    
    // 找到最近的区域
    const stepSize = field.stepSize;
    const gridX = Math.floor(x / stepSize);
    const gridY = Math.floor(y / stepSize);
    
    // 计算区域索引
    const index = gridY * Math.floor(field.width / stepSize) + gridX;
    
    // 确保索引有效
    if (index >= 0 && index < field.zones.length) {
      return field.zones[index];
    } else {
      // 返回默认值
      return { 
        getX: function() { return x; }, 
        getY: function() { return y; },
        getU: function() { return p.random(-2, 2); },
        getV: function() { return p.random(-2, 2); }
      };
    }
  }
  
  p.draw = function() {
    p.background(0);
    
    // 检查摄像头是否准备好
    if (!capture.loadPixels || !capture.width) return;
    
    // 加载摄像头像素
    capture.loadPixels();
    
    // 计算合适的缩放比例以保持宽高比
    let vidW = capture.width;
    let vidH = capture.height;
    scaleRatio = Math.min(p.width/vidW, p.height/vidH);
    
    // 计算缩放后的尺寸
    displayWidth = vidW * scaleRatio;
    displayHeight = vidH * scaleRatio;
    
    // 计算居中位置
    xOffset = (p.width - displayWidth) / 2;
    yOffset = (p.height - displayHeight) / 2;
    
    // 绘制摄像头画面，缩放并居中
    p.imageMode(p.CORNER);
    p.image(capture, xOffset, yOffset, displayWidth, displayHeight);
    p.image(artboard, 0, 0);
    
    // 更新光流缓冲区
    advanceBuffer();
    
    // 计算光流场
    vectorField = calculateFlow(lastImageData, currentImageData, p.width, p.height, config.stepSize);
    
    // 获取当前检测颜色
    const r = config.detectionColor.r;
    const g = config.detectionColor.g;
    const b = config.detectionColor.b;
    
    // 根据选择的粒子风格执行不同的渲染逻辑
    if (config.particleStyle === 'classic') {
      updateClassicParticles(r, g, b);
    } else if (config.particleStyle === 'poisson') {
      updatePoissonParticles(r, g, b);
    } else {
      console.warn('未知的粒子风格:', config.particleStyle);
    }
  };
  
  // 经典粒子效果更新
  function updateClassicParticles(r, g, b) {
    let time = p.millis()/1000;
    const threshold = config.threshold;
    const stepSize = config.stepSize;
    
    // 只在摄像头显示区域内进行采样
    for (let y = yOffset; y < yOffset + displayHeight; y += stepSize) {
      for (let x = xOffset; x < xOffset + displayWidth; x += stepSize) {
        // 获取对应的摄像头像素索引
        const i = getCaptureSampleIndex(x, y);
        
        if (i >= 0 && capture.pixels && capture.pixels.length > 0) {
          if (i * 4 + 2 < capture.pixels.length) {
            let rCam = capture.pixels[i * 4 + 0];
            let gCam = capture.pixels[i * 4 + 1];
            let bCam = capture.pixels[i * 4 + 2];
            
            // 计算颜色距离
            let rDist = p.abs(r - rCam);
            let gDist = p.abs(g - gCam);
            let bDist = p.abs(b - bCam);
            let d = (rDist + gDist + bDist);
            
            if (d < threshold) {
              // 从光流场获取向量
              var zone = getVectorInterpolated(x/p.width, y/p.height, vectorField);
              
              // 检测到颜色，创建粒子
              for (let j = 0; j < 3; j++) {
                particles.push({
                  time: time,
                  x: zone.getX() + p.random(stepSize * 2),
                  y: zone.getY() + p.random(stepSize * 2),
                  velX: zone.getU(),
                  velY: zone.getV(),
                  r: rCam,
                  g: gCam,
                  b: bCam,
                  dir: null
                });
              }
            }
          }
        }
      }
    }
    
    // 更新和绘制粒子
    const max_duration = config.particleLifetime;
    
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      
      // 计算生命周期
      const life = p.max(max_duration - (time - particle.time), 0.01);
      
      // 绘制粒子
      artboard.strokeWeight(life * 3);
      artboard.stroke(particle.r, particle.g, particle.b);
      artboard.line(particle.x, particle.y, 
                  particle.x + particle.velX, 
                  particle.y + particle.velY);
      
      // 更新粒子方向
      if (!particle.dir) {
        particle.dir = p.atan2(particle.velY, particle.velX);
      }
      
      // 更新粒子位置
      particle.x += particle.velX;
      particle.y += particle.velY;
      
      // 添加随机性 - 使用原始代码中的噪声参数
      particle.dir += (p.noise(particle.x/50, particle.y/50, particle.time/100) - 0.4777) * p.TWO_PI;
      particle.velX += p.cos(particle.dir);
      particle.velY += p.sin(particle.dir);
      
      // 移除过期粒子
      if (time - particle.time >= max_duration) {
        particles.splice(i, 1);
      }
    }
  }
  
  // 泊松盘采样粒子效果更新
  function updatePoissonParticles(r, g, b) {
    const threshold = config.threshold;
    const stepSize = config.stepSize;
    const poissonConfig = config.poisson;
    
    // 使用检测颜色替代固定颜色数组
    // 生成基于检测颜色的调色板
    const detectionColor = config.detectionColor;
    const colors = [
      // 原始检测颜色
      p.color(detectionColor.r, detectionColor.g, detectionColor.b),
      // 稍微亮一点的变体
      p.color(
        p.min(detectionColor.r + 40, 255),
        p.min(detectionColor.g + 40, 255),
        p.min(detectionColor.b + 40, 255)
      ),
      // 稍微暗一点的变体
      p.color(
        p.max(detectionColor.r - 40, 0),
        p.max(detectionColor.g - 40, 0),
        p.max(detectionColor.b - 40, 0)
      ),
      // 互补色
      p.color(
        255 - detectionColor.r,
        255 - detectionColor.g,
        255 - detectionColor.b
      )
    ];
    
    // 检测并生成新的生长点
    const checkFrequency = 10; // 每隔10帧检测一次，减轻处理负担
    if (p.frameCount % checkFrequency === 0) {
      // 只在摄像头显示区域内进行采样
      for (let y = yOffset; y < yOffset + displayHeight; y += stepSize * 2) {
        for (let x = xOffset; x < xOffset + displayWidth; x += stepSize * 2) {
          // 只在采样点处理，减少计算量
          if (p.random() < 0.05) {
            // 获取对应的摄像头像素索引
            const i = getCaptureSampleIndex(x, y);
            
            if (i >= 0 && capture.pixels && capture.pixels.length > 0) {
              if (i * 4 + 2 < capture.pixels.length) {
                let rCam = capture.pixels[i * 4 + 0];
                let gCam = capture.pixels[i * 4 + 1];
                let bCam = capture.pixels[i * 4 + 2];
                let d = p.abs(r - rCam) + p.abs(g - gCam) + p.abs(b - bCam);
                
                if (d < threshold && active.length < 100) { // 限制活动点数量
                  // 检测到颜色，创建新的生长点
                  let pos = p.createVector(x, y);
                  let col = p.floor(x / w);
                  let row = p.floor(y / w);
                  
                  // 确保在网格范围内
                  if (col >= 0 && row >= 0 && col < nCols && row < nRows) {
                    // 随机选择一种颜色或基于摄像头像素
                    let colorIndex = p.floor(p.random(colors.length));
                    let color = colors[colorIndex];
                    
                    // 添加到网格和活动点列表
                    if (!grid[row][col]) {
                      grid[row][col] = pos;
                      active.push({
                        pos: pos,
                        color: color
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // 生长算法
    const growthIterations = 5; // 每帧生长次数
    for (let iter = 0; iter < growthIterations; iter++) {
      if (active.length > 0) {
        // 随机选择一个活动点
        let randIndex = p.floor(p.random(active.length));
        let pos = active[randIndex].pos;
        let color = active[randIndex].color;
        let found = false;
        
        // 尝试在周围找到新的有效点
        for (let n = 0; n < poissonConfig.k; n++) {
          let sample = p5.Vector.random2D();
          let m = p.random(poissonConfig.radius, 2 * poissonConfig.radius);
          sample.setMag(m);
          sample.add(pos);
          
          let col = p.floor(sample.x / w);
          let row = p.floor(sample.y / w);
          
          // 检查是否在边界内且该位置没有点
          if (col > -1 && row > -1 && col < nCols && row < nRows && !grid[row][col]) {
            let ok = true;
            
            // 检查与周围点的距离
            for (let i = p.max(row-1, 0); i <= p.min(row+1, nRows-1); i++) {
              for (let j = p.max(col-1, 0); j <= p.min(col+1, nCols-1); j++) {
                let neighbor = grid[i][j];
                if (neighbor) {
                  let d = p5.Vector.dist(sample, neighbor);
                  if (d < poissonConfig.radius) {
                    ok = false;
                  }
                }
              }
            }
            
            if (ok) {
              found = true;
              grid[row][col] = sample;
              active.push({
                pos: sample,
                color: color
              });
              
              // 绘制连接线
              artboard.stroke(color);
              artboard.strokeWeight(poissonConfig.strokeWeight);
              artboard.line(sample.x, sample.y, pos.x, pos.y);
              break;
            }
          }
        }
        
        // 如果没有找到有效点，从活动列表中移除
        if (!found) {
          active.splice(randIndex, 1);
        }
      }
    }
  }
  
  // 窗口大小变化时更新画布尺寸
  p.windowResized = function() {
    // 重新设置画布大小
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    
    // 创建新的图形缓冲区来适应新的画布大小
    let oldArtboard = artboard;
    artboard = p.createGraphics(p.width, p.height);
    artboard.pixelDensity(1);
    artboard.noStroke();
    
    // 如果有旧的图形，尝试将其内容复制到新图形
    if (oldArtboard) {
      artboard.image(oldArtboard, 0, 0, p.width, p.height);
    }
    
    // 重新初始化光流缓冲区
    lastImageData = new Uint8ClampedArray(p.width * p.height * 4);
    currentImageData = new Uint8ClampedArray(p.width * p.height * 4);
    
    // 重新初始化泊松盘采样网格
    initPoissonGrid();
    
    console.log('窗口大小已调整，画布已重新创建');
  };
  
  // 清理函数
  p.remove = function() {
    if (capture) {
      capture.stop();
    }
    particles = [];
    active = [];
    grid = [];
    if (p._remove) {
      p._remove();
    }
  };
  
  // 提供修改配置的接口
  p.updateConfig = function(newConfig) {
    if (newConfig) {
      console.log('收到新配置:', newConfig);
      
      // 保存当前风格，用于检测变化
      const oldStyle = config.particleStyle;
      
      // 合并配置
      for (let key in newConfig) {
        if (key === 'poisson' && newConfig.poisson) {
          // 特殊处理poisson对象
          for (let poissonKey in newConfig.poisson) {
            config.poisson[poissonKey] = newConfig.poisson[poissonKey];
          }
          console.log('已更新泊松参数');
        } else if (typeof config[key] !== 'function') {
          config[key] = newConfig[key];
          console.log(`已更新配置项: ${key} =`, newConfig[key]);
        }
      }
      
      // 如果风格改变，重新初始化泊松网格
      if (oldStyle !== config.particleStyle) {
        console.log(`切换粒子风格: ${oldStyle} -> ${config.particleStyle}`);
        // 清空旧的粒子
        particles = [];
        active = [];
        // 重新初始化网格
        initPoissonGrid();
        // 清空绘图画板
        if (artboard) {
          artboard.clear();
        }
      }
    }
    return true;
  };
  
  // 清空所有粒子
  p.clearParticles = function() {
    particles = [];
    active = [];
    
    // 重置泊松网格
    initPoissonGrid();
    
    // 清空绘图画板
    if (artboard) {
      artboard.clear();
    }
    
    console.log('已清空所有粒子');
    return true;
  };
};
