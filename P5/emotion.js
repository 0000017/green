// P5模式的情感可视化处理功能
// 采用实例模式，与sketch.js集成

function emotionSketch(p) {
  let settings = {
    cols: 5,                     // 方块列数
    rows: 5,                     // 方块行数
    colorFillProbability: 0.5,   // 颜色填充概率
    stepNum: 10,                 // 每个图案的细分数
    paletteIndex: 0,             // 选择的颜色主题索引
    hatchProbability: 0.2,       // 网格填充概率
    horizontalHatchProbability: 0.5, // 水平网格概率
    handDrawnIntensity: 1,       // 手绘效果强度
    circlePatternProbability: 0.3, // 圆形图案概率
    wavyLinePatternProbability: 0.3, // 波浪线图案概率
    polkaDotPatternProbability: 0.3, // 波点图案概率
    backgroundGradientStart: '#ffffff', // 背景渐变开始颜色
    backgroundGradientEnd: '#e0e0e0'    // 背景渐变结束颜色
  };

  // 颜色主题
  const palettes = [
    ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"], // 经典主题
    ["#000000", "#333333", "#666666", "#999999", "#CCCCCC"], // 灰度主题
    ["#ff6b6b", "#feca57", "#ff9ff3", "#48dbfb", "#1dd1a1"], // 柔和主题
    ["#3f88c5", "#ffba08", "#f72585", "#4cc9f0", "#7209b7"], // 明亮主题
    ["#6a0572", "#d90368", "#f49d37", "#04a777", "#f2f2f2"]  // 对比主题
  ];
  
  p.setup = function() {
    // 创建与窗口大小相匹配的画布
    let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.id('camera-canvas');
    p.noLoop(); // 不需要连续绘制
    
    console.log('emotionSketch初始化，检查全局配置:', window.EmotionConfig ? '存在' : '不存在');
    
    // 从全局配置加载设置
    if (window.EmotionConfig) {
      loadSettingsFromConfig();
    }
    
    if (window.savedCanvas) {
      p.image(window.savedCanvas, 0, 0, p.width, p.height);
    } else {
      drawCanvas();
    }
    
    // 确保该方法绑定到p对象
    p.updateSettings = updateSettings;
  }

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    drawCanvas();
  }

  // 加载外部设置
  function loadSettingsFromConfig() {
    const config = window.EmotionConfig;
    if (!config) return;
    
    console.log('从全局配置加载设置:', config);
    
    // 复制所有设置
    for (let key in config) {
      if (settings.hasOwnProperty(key)) {
        settings[key] = config[key];
      }
    }
  }
  
  // 设置更新方法，供外部调用
  function updateSettings(newSettings) {
    console.log('emotion.js收到设置更新请求:', newSettings);
    
    if (!newSettings) {
      console.warn('收到空设置对象');
      return false;
    }
    
    // 更新设置
    for (let key in newSettings) {
      if (settings.hasOwnProperty(key)) {
        settings[key] = newSettings[key];
      }
    }
    
    console.log('设置已更新，重绘画布');
    
    // 重绘画布
    drawCanvas();
    return true;
  }

  // 绘制整个画布
  function drawCanvas() {
    // 绘制背景渐变
    drawBackgroundGradient();

    // 计算每个方块的大小，确保完全填充屏幕
    const cellSizeX = p.width / settings.cols;
    const cellSizeY = p.height / settings.rows;

    // 直接绘制方块，不计算居中偏移量
    for (let j = 0; j < settings.rows; j++) {
      for (let i = 0; i < settings.cols; i++) {
        const x = i * cellSizeX;
        const y = j * cellSizeY;
        drawRectangles(x, y, cellSizeX, cellSizeY, i, j);
      }
    }
  }

  // 绘制背景渐变
  function drawBackgroundGradient() {
    let gradient = p.drawingContext.createLinearGradient(0, 0, p.width, p.height);
    gradient.addColorStop(0, settings.backgroundGradientStart);
    gradient.addColorStop(1, settings.backgroundGradientEnd);
    p.drawingContext.fillStyle = gradient;
    p.drawingContext.fillRect(0, 0, p.width, p.height);
  }

  // 绘制方块内部的图案
  function drawRectangles(x, y, width, height, colIndex, rowIndex) {
    const step_num = settings.stepNum;
    const stepX = width / step_num;
    const stepY = height / step_num;

    p.push();
    p.translate(x, y);
    const cells = Array.from({ length: step_num }, () => Array.from({ length: step_num }, () => false));

    // 根据位置选择颜色
    const colors = palettes[settings.paletteIndex];
    const baseColorIndex = p.int(p.map(colIndex, 0, settings.cols - 1, 0, colors.length - 1));
    const baseColor = p.color(colors[baseColorIndex]);

    for (let j = 0; j < step_num; j++) {
      for (let i = 0; i < step_num; i++) {
        let cellSizeMax = p.int(p.random(1, step_num / 2));
        for (let cellSize = cellSizeMax; cellSize > 0; cellSize--) {
          let isAlready = false;
          for (let l = j; l < j + cellSize; l++) {
            for (let k = i; k < i + cellSize; k++) {
              let l_ = p.constrain(l, 0, step_num - 1);
              let k_ = p.constrain(k, 0, step_num - 1);
              if (cells[l_][k_]) {
                isAlready = true;
              }
            }
          }
          if (!isAlready) {
            let wc = stepX * cellSize;
            let hc = stepY * cellSize;
            let rectX = stepX * i;
            let rectY = stepY * j;
            if (rectX + wc > width) {
              wc = width - rectX;
            }
            if (rectY + hc > height) {
              hc = height - rectY;
            }

            if (p.random(1) < settings.hatchProbability) {
              const isHorizontal = p.random(1) < settings.horizontalHatchProbability;
              const spacing = p.random(3, 10); // 网格间距
              drawHatch(rectX, rectY, wc, hc, spacing, isHorizontal);
            } else if (p.random(1) < settings.colorFillProbability) {
              // 使用基础颜色
              let c = p.color(baseColor);
              p.fill(c);
              p.noStroke();
              handDrawnRect(rectX, rectY, wc, hc);
            } else {
              p.noFill();
            }

            // 添加图案
            let patternDrawn = false;
            if (p.random(1) < settings.circlePatternProbability) {
              drawCirclePattern(rectX, rectY, wc, hc, colors);
              patternDrawn = true;
            } 
            if (!patternDrawn && p.random(1) < settings.wavyLinePatternProbability) {
              drawWavyLinePattern(rectX, rectY, wc, hc, colors);
              patternDrawn = true;
            }
            if (!patternDrawn && p.random(1) < settings.polkaDotPatternProbability) {
              drawPolkaDotPattern(rectX, rectY, wc, hc, colors);
            }

            p.stroke(0);
            p.strokeWeight(p.random(0.5, 2)); // 线条粗细变化
            handDrawnRect(rectX, rectY, wc, hc);

            for (let l = j; l < j + cellSize; l++) {
              for (let k = i; k < i + cellSize; k++) {
                let l_ = p.constrain(l, 0, step_num - 1);
                let k_ = p.constrain(k, 0, step_num - 1);
                cells[l_][k_] = true;
              }
            }
          }
        }
      }
    }
    p.pop();
  }

  // 绘制网格填充
  function drawHatch(x, y, w, h, spacing, isHorizontal) {
    p.stroke(0);
    p.strokeWeight(p.random(0.5, 1.5)); // 线条粗细变化

    if (isHorizontal) {
      // 水平线
      for (let i = 0; i <= h; i += spacing) {
        let y1 = y + i + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity);
        let y2 = y + i + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity);
        p.line(
          x + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
          y1,
          x + w + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
          y2
        );
      }
    } else {
      // 垂直线
      for (let i = 0; i <= w; i += spacing) {
        let x1 = x + i + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity);
        let x2 = x + i + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity);
        p.line(
          x1,
          y + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
          x2,
          y + h + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity)
        );
      }
    }
  }

  // 手绘风格矩形
  function handDrawnRect(x, y, w, h) {
    p.beginShape();
    p.vertex(
      x + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
      y + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity)
    );
    p.vertex(
      x + w + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
      y + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity)
    );
    p.vertex(
      x + w + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
      y + h + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity)
    );
    p.vertex(
      x + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
      y + h + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity)
    );
    p.endShape(p.CLOSE);
  }

  // 绘制圆形图案
  function drawCirclePattern(x, y, w, h, colors) {
    const colorIndex = p.int(p.random(colors.length));
    p.stroke(colors[colorIndex]);
    p.noFill();
    p.strokeWeight(p.random(0.5, 1.5));

    let maxRadius = p.min(w, h) / 2;
    let numCircles = p.int(p.random(3, 7));
    for (let i = 0; i < numCircles; i++) {
      let radius = (maxRadius / numCircles) * (i + 1);
      p.ellipse(
        x + w / 2 + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
        y + h / 2 + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
        radius * 2,
        radius * 2
      );
    }
  }

  // 绘制波浪线图案
  function drawWavyLinePattern(x, y, w, h, colors) {
    const colorIndex = p.int(p.random(colors.length));
    p.stroke(colors[colorIndex]);
    p.noFill();
    p.strokeWeight(p.random(0.5, 1.5));

    let numLines = p.int(p.random(5, 10));
    for (let i = 0; i < numLines; i++) {
      p.beginShape();
      let amplitude = p.random(2, 5);
      let frequency = p.random(1, 3);
      for (let xi = x - w * 0.1; xi <= x + w * 1.1; xi += w / 20) {
        let progress = p.map(xi, x, x + w, 0, 1);
        let yi = y + (h / numLines) * i + p.sin(progress * p.TWO_PI * frequency) * amplitude;
        p.curveVertex(
          xi + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
          yi + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity)
        );
      }
      p.endShape();
    }
  }

  // 绘制波点图案
  function drawPolkaDotPattern(x, y, w, h, colors) {
    const colorIndex = p.int(p.random(colors.length));
    p.fill(colors[colorIndex]);
    p.noStroke();

    let numDotsX = p.int(p.random(3, 6));
    let numDotsY = p.int(p.random(3, 6));
    let dotSize = p.min(w, h) / p.max(numDotsX, numDotsY) * 0.5;

    for (let i = 0; i < numDotsX; i++) {
      for (let j = 0; j < numDotsY; j++) {
        let dx = x + (w / numDotsX) * i + (w / numDotsX) / 2;
        let dy = y + (h / numDotsY) * j + (h / numDotsY) / 2;
        p.ellipse(
          dx + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
          dy + p.random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
          dotSize,
          dotSize
        );
      }
    }
  }

  // 生成随机颜色
  function randomColor() {
    return '#' + p.floor(p.random(0x1000000)).toString(16).padStart(6, '0');
  }

  // 鼠标释放事件
  p.mouseReleased = function() {
    drawCanvas();
  }
  
  // 当P5实例被移除时的清理函数
  p.remove = function() {
    console.log('emotion.js实例被移除');
    // 调用P5的原生remove方法
    p._remove();
  }
}