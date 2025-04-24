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
    backgroundGradientEnd: '#e0e0e0',   // 背景渐变结束颜色

    // 随机化参数函数
    randomize: function() {
      settings.cols = p.floor(p.random(1, 10));
      settings.rows = p.floor(p.random(1, 10));
      settings.colorFillProbability = p.random(0, 1);
      settings.stepNum = p.floor(p.random(3, 20));
      settings.paletteIndex = p.floor(p.random(0, palettes.length));
      settings.hatchProbability = p.random(0, 1);
      settings.horizontalHatchProbability = p.random(0, 1);
      settings.handDrawnIntensity = p.random(0, 3);
      settings.circlePatternProbability = p.random(0, 1);
      settings.wavyLinePatternProbability = p.random(0, 1);
      settings.polkaDotPatternProbability = p.random(0, 1);
      settings.backgroundGradientStart = randomColor();
      settings.backgroundGradientEnd = randomColor();
      drawCanvas(); 
    }
  };

  // 颜色主题
  const palettes = [
    ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"], // 经典主题
    ["#000000", "#333333", "#666666", "#999999", "#CCCCCC"], // 灰度主题
    ["#ff6b6b", "#feca57", "#ff9ff3", "#48dbfb", "#1dd1a1"], // 柔和主题
    ["#3f88c5", "#ffba08", "#f72585", "#4cc9f0", "#7209b7"], // 明亮主题
    ["#6a0572", "#d90368", "#f49d37", "#04a777", "#f2f2f2"]  // 对比主题
  ];

  // GUI界面设置
  let gui;
  
  p.setup = function() {
    // 创建与窗口大小相匹配的画布
    let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.id('camera-canvas');
    p.noLoop(); // 不需要连续绘制
    
    setupGUI();
    if (window.savedCanvas) {
      p.image(window.savedCanvas, 0, 0, p.width, p.height);
    } else {
      drawCanvas();
    }
  }

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    drawCanvas();
  }

  // 设置GUI控制界面
  function setupGUI() {
    // 确保dat.GUI库可用
    if (typeof dat === 'undefined' || !dat.GUI) {
      console.warn('dat.GUI库未加载，使用备用控制方式');
      // 创建简单的控制面板作为备用
      createSimpleControls();
      return;
    }
    
    // 如果GUI已存在，先销毁
    if (gui) {
      gui.destroy();
    }
    
    // 使用dat.GUI创建控制面板
    try {
      gui = new dat.GUI({autoPlace: true});
      gui.domElement.id = 'camera-gui';
      
      // 将控制界面添加到画布容器
      const guiContainer = document.createElement('div');
      guiContainer.id = 'camera-gui-container';
      guiContainer.style.position = 'absolute';
      guiContainer.style.top = '10px';
      guiContainer.style.right = '10px';
      guiContainer.style.zIndex = '1000';
      document.getElementById('p5-canvas-container').appendChild(guiContainer);
      guiContainer.appendChild(gui.domElement);

      // 添加控制项
      gui.add(settings, 'cols', 1, 10, 1).name('方块列数').onChange(drawCanvas);
      gui.add(settings, 'rows', 1, 10, 1).name('方块行数').onChange(drawCanvas);
      gui.add(settings, 'colorFillProbability', 0, 1, 0.01).name('颜色填充概率').onChange(drawCanvas);
      gui.add(settings, 'stepNum', 3, 20, 1).name('细分数量').onChange(drawCanvas);
      gui.add(settings, 'hatchProbability', 0, 1, 0.01).name('网格填充概率').onChange(drawCanvas);
      gui.add(settings, 'horizontalHatchProbability', 0, 1, 0.01).name('水平网格概率').onChange(drawCanvas);
      gui.add(settings, 'handDrawnIntensity', 0, 3, 0.1).name('手绘强度').onChange(drawCanvas);

      // 图案控制项
      gui.add(settings, 'circlePatternProbability', 0, 1, 0.01).name('圆形图案概率').onChange(drawCanvas);
      gui.add(settings, 'wavyLinePatternProbability', 0, 1, 0.01).name('波浪线概率').onChange(drawCanvas);
      gui.add(settings, 'polkaDotPatternProbability', 0, 1, 0.01).name('波点概率').onChange(drawCanvas);

      // 颜色主题选择
      gui.add(settings, 'paletteIndex', { "经典": 0, "灰度": 1, "柔和": 2, "明亮": 3, "对比": 4 })
        .name('颜色主题')
        .onChange(drawCanvas);

      // 随机化按钮
      gui.add(settings, 'randomize').name('随机化');
    } catch (error) {
      console.error('创建dat.GUI控制面板失败:', error);
      createSimpleControls();
    }
  }
  
  // 创建简单的控制面板作为备用
  function createSimpleControls() {
    const container = document.createElement('div');
    container.id = 'simple-controls';
    container.style.position = 'absolute';
    container.style.top = '10px';
    container.style.right = '10px';
    container.style.zIndex = '1000';
    container.style.backgroundColor = 'rgba(0,0,0,0.7)';
    container.style.padding = '10px';
    container.style.borderRadius = '5px';
    container.style.color = 'white';
    
    // 随机化按钮
    const randomizeBtn = document.createElement('button');
    randomizeBtn.textContent = '随机化';
    randomizeBtn.style.padding = '5px 10px';
    randomizeBtn.style.margin = '5px';
    randomizeBtn.addEventListener('click', settings.randomize);
    container.appendChild(randomizeBtn);
    
    // 列数选择器
    const colsLabel = document.createElement('div');
    colsLabel.textContent = '方块列数: ' + settings.cols;
    container.appendChild(colsLabel);
    const colsSlider = document.createElement('input');
    colsSlider.type = 'range';
    colsSlider.min = '1';
    colsSlider.max = '10';
    colsSlider.value = settings.cols;
    colsSlider.addEventListener('input', function() {
      settings.cols = parseInt(this.value);
      colsLabel.textContent = '方块列数: ' + settings.cols;
      drawCanvas();
    });
    container.appendChild(colsSlider);
    
    // 行数选择器
    const rowsLabel = document.createElement('div');
    rowsLabel.textContent = '方块行数: ' + settings.rows;
    container.appendChild(rowsLabel);
    const rowsSlider = document.createElement('input');
    rowsSlider.type = 'range';
    rowsSlider.min = '1';
    rowsSlider.max = '10';
    rowsSlider.value = settings.rows;
    rowsSlider.addEventListener('input', function() {
      settings.rows = parseInt(this.value);
      rowsLabel.textContent = '方块行数: ' + settings.rows;
      drawCanvas();
    });
    container.appendChild(rowsSlider);
    
    document.getElementById('p5-canvas-container').appendChild(container);
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
    // 移除GUI
    if (gui) {
      const container = document.getElementById('camera-gui-container');
      if (container) {
        container.parentNode.removeChild(container);
      }
      gui.destroy();
      gui = null;
    }
    
    // 移除简易控制面板
    const simpleControls = document.getElementById('simple-controls');
    if (simpleControls) {
      simpleControls.parentNode.removeChild(simpleControls);
    }
    
    // 调用P5的原生remove方法
    p._remove();
  }
}