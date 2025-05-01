// 绘画功能
// 提供简单的绘图和特殊效果的笔刷功能

function drawSketch(p) {
  let isDrawing = false;
  let color = [0, 0, 0];
  let strokeWidth = 4;
  let colorPicker;
  let strokeSlider;
  let brushSelect;
  let brushType = 'flower';  // 默认笔刷类型改为花朵生成
  let controlsVisible = true;
  let controlPanel;
  let lastFlowerTime = 0; // 记录上次生成花的时间
  let penPressure = 0; // 数位板压力值
  let lastX = 0;
  let lastY = 0;
  let isPenDetected = false; // 是否检测到数位笔
  let penX = 0; // 数位笔X坐标
  let penY = 0; // 数位笔Y坐标
  let isPenHovering = false; // 数位笔是否悬停在画布上
  
  // 花朵生成的颜色数组
  const flowerColors = ['#3f88c5', '#c1292e', '#ffffff', '#ed91bd', '#17bebb', '#f1d302', '#2e933c'];
  
  // 笔刷类型配置
  const brushes = {
    'basic': {
      label: '基本笔刷',
      draw: drawBasic
    },
    'spray': {
      label: '喷溅效果',
      draw: drawSpray
    },
    'ribbon': {
      label: '彩带效果',
      draw: drawRibbon
    },
    'pattern': {
      label: '图案效果',
      draw: drawPattern
    },
    'calligraphy': {
      label: '书法效果',
      draw: drawCalligraphy
    },
    'flower': {
      label: '花朵生成',
      draw: drawFlowerBrush
    }
  };
  
  p.setup = function() {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.position(0, 0);
    canvas.style('z-index', '800');
    
    console.log("画布初始化，检查背景模式");
    
    // 先设置默认背景为白色
    p.background(255);
    
    // 检查全局背景模式状态
    // 确保画布创建后立即按照当前模式设置背景
    setTimeout(() => {
      updateBackground();
    }, 0);
    
    p.noFill();
    p.stroke(color);
    p.strokeWeight(strokeWidth);
    
    // 使用默认鼠标光标
    canvas.style('cursor', 'default');
    
    // 如果有保存的画布，恢复内容
    if (savedCanvas && savedCanvas.width && savedCanvas.height) {
      try {
        console.log('正在恢复画布内容...');
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
    
    // 创建控制面板容器 - 保持ID和class不变，修改样式
    controlPanel = p.createDiv('');
    controlPanel.id('draw-tools-panel');
    controlPanel.class('draw-tools-panel');
    controlPanel.style('position', 'fixed');
    controlPanel.style('top', '20px');
    controlPanel.style('left', '20px');
    controlPanel.style('background-color', 'rgba(30, 30, 30, 0.85)');
    controlPanel.style('padding', '10px');
    controlPanel.style('border-radius', '10px');
    controlPanel.style('display', 'flex');
    controlPanel.style('flex-direction', 'column');
    controlPanel.style('gap', '10px');
    controlPanel.style('z-index', '1100');
    controlPanel.style('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.2)');
    controlPanel.style('backdrop-filter', 'blur(10px)');
    controlPanel.style('-webkit-backdrop-filter', 'blur(10px)');
    controlPanel.style('border', '1px solid rgba(255, 255, 255, 0.15)');
    
    // 创建标题
    const panelTitle = p.createDiv('绘画工具');
    panelTitle.style('color', 'white');
    panelTitle.style('font-weight', 'bold');
    panelTitle.style('margin-bottom', '8px');
    panelTitle.style('padding-bottom', '5px');
    panelTitle.style('border-bottom', '1px solid rgba(255, 255, 255, 0.1)');
    controlPanel.child(panelTitle);
    
    // 笔刷类型选择器
    const brushSelectContainer = p.createDiv('');
    brushSelectContainer.style('display', 'flex');
    brushSelectContainer.style('align-items', 'center');
    brushSelectContainer.style('gap', '5px');
    brushSelectContainer.style('margin-bottom', '5px');
    
    const brushLabel = p.createSpan('笔刷:');
    brushLabel.style('color', 'white');
    brushSelectContainer.child(brushLabel);
    
    brushSelect = p.createSelect();
    brushSelect.style('width', '100px');
    brushSelect.style('background-color', 'rgba(60, 60, 60, 0.8)');
    brushSelect.style('color', 'white');
    brushSelect.style('border', 'none');
    brushSelect.style('border-radius', '4px');
    brushSelect.style('padding', '5px');
    for (let type in brushes) {
      brushSelect.option(brushes[type].label, type);
    }
    // 设置默认选中花朵生成
    brushSelect.selected('flower');
    brushSelect.changed(brushChanged);
    brushSelectContainer.child(brushSelect);
    controlPanel.child(brushSelectContainer);
    
    // 颜色选择器
    const colorContainer = p.createDiv('');
    colorContainer.style('display', 'flex');
    colorContainer.style('align-items', 'center');
    colorContainer.style('gap', '5px');
    colorContainer.style('margin-bottom', '5px');
    
    const colorLabel = p.createSpan('颜色:');
    colorLabel.style('color', 'white');
    colorContainer.child(colorLabel);
    
    colorPicker = p.createColorPicker('#000000');
    colorPicker.style('width', '32px');
    colorPicker.style('height', '32px');
    colorPicker.style('border-radius', '50%');
    colorPicker.style('border', 'none');
    colorPicker.style('cursor', 'pointer');
    colorContainer.child(colorPicker);
    controlPanel.child(colorContainer);
    
    // 笔触粗细滑块
    const strokeContainer = p.createDiv('');
    strokeContainer.style('display', 'flex');
    strokeContainer.style('align-items', 'center');
    strokeContainer.style('gap', '5px');
    
    const strokeLabel = p.createSpan('粗细:');
    strokeLabel.style('color', 'white');
    strokeContainer.child(strokeLabel);
    
    strokeSlider = p.createSlider(1, 20, strokeWidth);
    strokeSlider.style('width', '100px');
    strokeSlider.style('-webkit-appearance', 'none');
    strokeSlider.style('height', '8px');
    strokeSlider.style('border-radius', '4px');
    strokeSlider.style('background', 'rgba(255, 255, 255, 0.2)');
    strokeContainer.child(strokeSlider);
    controlPanel.child(strokeContainer);
  };
  
  // 根据当前背景模式设置适当的背景
  function updateBackground() {
    // 检查全局状态中的背景模式
    const mode = window.p5State ? window.p5State.currentBackgroundMode : 'none';
    
    console.log("更新背景，当前模式:", mode);
    
    if (mode === 'none') {
      // 无背景模式：使用白色背景
      console.log("应用白色背景");
      p.background(255);
    } else {
      // 有背景模式：使用透明背景
      console.log("应用透明背景");
      if (p.drawingContext) {
        p.drawingContext.clearRect(0, 0, p.width, p.height);
      } else {
        p._clear();
      }
    }
  }
  
  // 添加一个公开方法用于直接从外部调用
  p.forceUpdateBackground = function(mode) {
    console.log("强制更新背景，模式:", mode);
    if (mode === 'none') {
      p.background(255);
    } else {
      if (p.drawingContext) {
        p.drawingContext.clearRect(0, 0, p.width, p.height);
      } else {
        p._clear();
      }
    }
  };
  
  function brushChanged() {
    brushType = brushSelect.value();
  }
  
  p.draw = function() {
    // 更新颜色和笔触粗细
    color = colorPicker.color().levels.slice(0, 3);
    strokeWidth = strokeSlider.value();
    p.stroke(color);
    p.strokeWeight(strokeWidth);
    
    // 根据当前笔刷类型绘画
    if (isDrawing) {
      brushes[brushType].draw(p, color, strokeWidth);
    }
    
    // 只在数位笔悬停在画布上时显示光标
    if (isPenHovering) {
      drawPenCursor(penX, penY);
    }
  };
  
  // 基本笔刷
  function drawBasic(p, color, size) {
    p.stroke(color[0], color[1], color[2]);
    p.strokeWeight(size);
    p.line(p.pmouseX, p.pmouseY, p.mouseX, p.mouseY);
    }
  
  // 喷溅笔刷
  function drawSpray(p, color, size) {
    const r = color[0];
    const g = color[1];
    const b = color[2];
    const density = size * 3;
    
    for (let i = 0; i < density; i++) {
      const offsetX = p.randomGaussian(0, size / 2);
      const offsetY = p.randomGaussian(0, size / 2);
      p.fill(r, g, b, 150);
      p.noStroke();
      p.ellipse(p.mouseX + offsetX, p.mouseY + offsetY, 1, 1);
    }
  }
  
  // 彩带笔刷
  function drawRibbon(p, color, size) {
    p.noFill();
    p.stroke(color[0], color[1], color[2], 150);
    p.strokeWeight(size / 2);
    p.beginShape();
    p.curveVertex(p.pmouseX, p.pmouseY);
    p.curveVertex(p.pmouseX, p.pmouseY);
    p.curveVertex(p.mouseX, p.mouseY);
    p.curveVertex(p.mouseX + (p.mouseX - p.pmouseX), p.mouseY + (p.mouseY - p.pmouseY));
    p.endShape();
  }
  
  // 图案笔刷
  function drawPattern(p, color, size) {
    p.push();
    p.translate(p.mouseX, p.mouseY);
    p.rotate(p.frameCount * 0.1);
    for (let i = 0; i < 8; i++) {
      p.rotate(p.PI/4);
      p.stroke(color[0], color[1], color[2], 150);
      p.strokeWeight(size / 4);
      p.line(0, 0, size, 0);
      p.ellipse(size/2, 0, size/4, size/4);
    }
    p.pop();
  }
  
  // 书法笔刷
  function drawCalligraphy(p, color, size) {
    const angle = p.atan2(p.mouseY - p.pmouseY, p.mouseX - p.pmouseX);
    p.push();
    p.translate(p.mouseX, p.mouseY);
    p.rotate(angle);
    p.noStroke();
    p.fill(color[0], color[1], color[2], 150);
    p.ellipse(0, 0, size * 2, size / 2);
    p.pop();
  }
  
  // 花朵生成笔刷
  function drawFlowerBrush(p, color, size) {
    // 计算当前时间，控制花朵生成频率
    let currentTime = p.millis();
    
    // 获取数位板压力值，如果不支持则使用默认值
    let pressure = penPressure || 0.5;
    
    // 计算鼠标移动速度和方向，用于决定是否生成花朵
    let speed = p.dist(p.mouseX, p.mouseY, lastX, lastY);
    
    // 计算移动方向向量
    let moveVectorX = p.mouseX - lastX;
    let moveVectorY = p.mouseY - lastY;
    
    // 标准化向量
    let dirLength = Math.sqrt(moveVectorX * moveVectorX + moveVectorY * moveVectorY);
    if (dirLength > 0) {
      moveVectorX /= dirLength;
      moveVectorY /= dirLength;
    }
    
    // 根据压力值调整花朵生成的频率和数量
    let flowerInterval = p.map(pressure, 0, 1, 200, 30); // 压力越大，生成间隔越短
    let flowerCount = p.floor(p.map(pressure, 0, 1, 1, 9)); // 压力越大，一次生成的花朵数量增加3倍(原来是1-3，现在是1-9)
    
    // 如果移动速度足够且间隔时间足够，则生成花朵
    if (speed > 2 && currentTime - lastFlowerTime > flowerInterval) {
      lastFlowerTime = currentTime;
      
      // 生成花朵的大小基于笔刷粗细和压力值
      let flowerSize = size * p.map(pressure, 0, 1, 3, 8);
      
      // 根据压力值生成不同数量的花朵
      for (let i = 0; i < flowerCount; i++) {
        // 向画笔运动反方向随机发射
        let disperseDistance = p.random(15, 150) * pressure; // 分散距离扩大五倍(原来是5-50，现在是25-250)
        let angleVariation = p.random(-Math.PI*3/4, Math.PI*3/4); // 在反方向周围的扇形区域内随机
        
        // 计算反方向向量
        let reverseX = -moveVectorX;
        let reverseY = -moveVectorY;
        
        // 应用角度变化
        let rotatedX = reverseX * Math.cos(angleVariation) - reverseY * Math.sin(angleVariation);
        let rotatedY = reverseX * Math.sin(angleVariation) + reverseY * Math.cos(angleVariation);
        
        // 计算花朵位置，从鼠标位置沿分散方向偏移
        // 修改发射距离为更加随机化的范围(0到原来的3倍)
        let randomFactor = p.random(0, 3);
        let flowerX = p.mouseX + rotatedX * disperseDistance * randomFactor;
        let flowerY = p.mouseY + rotatedY * disperseDistance * randomFactor;
        
        // 在压力较大时也添加轻微的随机性
        flowerX += p.random(-10, 10) * pressure;
        flowerY += p.random(-10, 10) * pressure;
        
        // 绘制花朵
        drawFlower(p, flowerX, flowerY, flowerSize);
      }
    }
    
    // 更新上一次位置
    lastX = p.mouseX;
    lastY = p.mouseY;
  }
  
  // 绘制花朵
  function drawFlower(p, x, y, w) {
    p.push(); // 保存当前绘图状态
    
    let ps = [];
    let num = p.int(p.random(11, 15));
    let aa = p.random(10);
    
    // 生成花瓣位置数据
    for (let i = 0; i < num; i++) {
      let a = p.map(i, 0, num, 0, p.TWO_PI) + aa;
      ps.push({ x: x, y: y, w: w * 0.5, a: a });
    }
    
    // 随机打乱花瓣顺序
    shuffle(p, ps);
    
    // 获取随机花瓣颜色
    let flowerColor = p.random(flowerColors);
    p.fill(flowerColor);
    
    // 绘制所有花瓣
    for (let i = 0; i < ps.length; i++) {
      drawPetal(p, ps[i].x, ps[i].y, ps[i].w, ps[i].a);
    }
    
    // 绘制花芯
    p.stroke(0);
    p.strokeWeight(w * 0.008);
    p.fill(p.random(['#fad43c', '#f2dd52', '#f0c330']));
    drawIrregularCircle(p, x, y, w * p.random(0.25, 0.3));
    
    p.pop(); // 恢复绘图状态
  }
  
  // 绘制花瓣
  function drawPetal(p, x, y, w, a) {
    let ap1 = { x: 0, y: -w * 0.025, a1: 0, a2: 0, r1: 0, r2: 0 };
    let ap2 = { x: w * p.random(0.5, 0.7), y: -w * p.random(0.125, 0.175), a1: p.PI, a2: 0, r1: w * p.random(0.19, 0.21), r2: w * p.random(0.19, 0.21) };
    let ap3 = { x: w, y: 0, a1: -(p.PI / 2) + p.PI * p.random(-1, 1) * 0.02, a2: (p.PI / 2) + p.PI * p.random(-1, 1) * 0.02, r1: w * p.random(0.08, 0.12), r2: w * p.random(0.08, 0.12) };
    let ap4 = { x: w * p.random(0.5, 0.7), y: w * p.random(0.125, 0.175), a1: 0, a2: p.PI, r1: w * p.random(0.19, 0.21), r2: w * p.random(0.19, 0.21) };
    let ap5 = { x: 0, y: w * 0.025, a1: 0, a2: 0, r1: 0, r2: 0 };
    p.push();
    p.translate(x, y);
    p.rotate(a);
    
    // 设置花瓣轮廓的线条粗、细
    p.strokeWeight(w * 0.017);
    
    p.beginShape();
    p.vertex(ap1.x, ap1.y);
    drawBezierSegment(p, ap1, ap2);
    drawBezierSegment(p, ap2, ap3);
    drawBezierSegment(p, ap3, ap4);
    drawBezierSegment(p, ap4, ap5);
    p.endShape();
    
    // 设置花瓣内部线条的粗细
    p.strokeWeight(w * 0.012);
    p.line(0, 0, w * p.random(0.4, 0.7), w * p.random(0.02, 0.04));
    p.line(0, 0, w * p.random(0.4, 0.7), -w * p.random(0.02, 0.04));
    p.pop();
  }
  
  // 绘制贝塞尔曲线段
  function drawBezierSegment(p, apA, apB) {
    let h1 = polarToCartesian(p, apA.x, apA.y, apA.r2, apA.a2);
    let h2 = polarToCartesian(p, apB.x, apB.y, apB.r1, apB.a1);
    p.bezierVertex(h1.x, h1.y, h2.x, h2.y, apB.x, apB.y);
  }
  
  // 极坐标转换为笛卡尔坐标
  function polarToCartesian(p, cx, cy, r, angle) {
    let x = cx + p.cos(angle) * r;
    let y = cy + p.sin(angle) * r;
    return p.createVector(x, y);
  }
  
  // 绘制不规则圆形(花芯)
  function drawIrregularCircle(p, x, y, d) {
    p.beginShape();
    for (let angle = 0; angle < p.TWO_PI; angle += p.TWO_PI / 90) {
      let offset = p.random(-2, 1) * d * 0.01;
      let r = (d / 2) + offset;
      let px = x + r * p.cos(angle);
      let py = y + r * p.sin(angle);
      p.vertex(px, py);
    }
    p.endShape(p.CLOSE);

    for (let i = 0; i < d * 5; i++) {
      let a = p.random(p.TWO_PI);
      let r = d / 2 * (1 - p.random(p.random(p.random(p.random()))));
      p.point(x + r * p.cos(a), y + r * p.sin(a));
    }
  }
  
  // 随机打乱数组
  function shuffle(p, array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = p.floor(p.random(i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  p.mousePressed = function() {
    // 忽略在控制面板区域的点击
    if (p.mouseX < 200 && p.mouseY < 200) {
      return;
    }
    
    // 初始化鼠标位置
    lastX = p.mouseX;
    lastY = p.mouseY;
    
    isDrawing = true;
    return false; // 阻止默认行为
  };
  
  p.mouseReleased = function() {
    isDrawing = false;
    return false;
  };
  
  // 新增：添加pointerdown事件直接处理
  p.pointerPressed = function(e) {
    // 如果存在pointerPressed事件，优先使用此事件
    if (p.mouseX < 200 && p.mouseY < 200) {
      return;
    }
    
    lastX = p.mouseX;
    lastY = p.mouseY;
    
    // 检测数位笔
    if (e && e.pointerType === 'pen') {
      penPressure = e.pressure || 0.5;
      console.log('使用p5.pointerPressed捕获到数位笔，压力值：', penPressure);
    }
    
    isDrawing = true;
    return false;
  };
  
  // 新增：添加pointermove事件直接处理
  p.pointerMoved = function(e) {
    if (isDrawing && e && e.pointerType === 'pen') {
      penPressure = e.pressure || 0.5;
    }
  };
  
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
        console.log('windowResized: 成功恢复画布内容');
      } else {
        console.warn('windowResized: tempCanvas无效，将不恢复内容');
        // 根据当前背景模式设置背景
        updateBackground();
      }
    } catch (e) {
      console.error('windowResized出错:', e);
      // 根据当前背景模式设置背景
      updateBackground();
    }
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
        
        console.log('成功获取画布内容', tempCanvas.width, tempCanvas.height);
        return tempCanvas;
      }
    } catch (e) {
      console.warn('获取画布内容失败:', e);
    }
    
    return p.canvas;
  };
  
  p.clear = function() {
    // 根据当前背景模式设置背景
    updateBackground();
  };
  
  p.saveCanvas = function(name, type) {
    p.save(name, type);
  };
  
  // 处理指针事件，获取压力值 - 修改为直接绑定到canvas元素
  p.registerMethod('post', function() {
    // p.post在setup之后执行，此时canvas已经创建完成
    if (p.canvas) {
      // 使用已创建的canvas元素直接绑定事件，避免冒泡和事件捕获问题
      p.canvas.addEventListener('pointermove', function(e) {
        // 检测是否数位笔
        if (e.pointerType === 'pen') {
          // 更新数位笔位置
          isPenHovering = true;
          penX = e.clientX;
          penY = e.clientY;
        
          if (isDrawing) {
            // 获取压力值，Windows Ink应该支持
            if (e.pressure !== undefined) {
              penPressure = e.pressure;
              
              // 动态调整笔刷大小
              if (brushType === 'flower' || e.pressure > 0.1) {
                let pressureScaled = p.constrain(e.pressure * 1.5, 0.1, 1);
                strokeWidth = p.map(pressureScaled, 0.1, 1, 2, 20);
                if (strokeSlider) {
                  strokeSlider.value(strokeWidth);
                }
              }
            }
            
            // 尝试获取垂直压力（例如Apple Pencil的tangentialPressure）
            if (e.tangentialPressure !== undefined) {
              // 将-1到1的范围映射到0到1
              let tangentialValue = (e.tangentialPressure + 1) / 2;
              // 使用垂直压力调整线条粗细
              let tangentialWidth = p.map(tangentialValue, 0, 1, 1, 20);
              if (strokeSlider && tangentialValue > 0.1) {
                strokeSlider.value(tangentialWidth);
              }
            }
          }
        }
      }, { passive: false });
      
      p.canvas.addEventListener('pointerdown', function(e) {
        if (e.pointerType === 'pen') {
          // 更新数位笔状态和位置
          isPenHovering = true;
          penX = e.clientX;
          penY = e.clientY;
          penPressure = e.pressure || 0.5;
          
          // 检测设备是否支持压力感应
          console.log('canvas直接检测到数位笔输入设备');
          console.log('压力支持: ' + (e.pressure !== undefined));
          console.log('压力值: ' + e.pressure);
          console.log('垂直压力支持: ' + (e.tangentialPressure !== undefined));
          
          // 设置捕获以确保能接收所有后续事件
          try {
            p.canvas.setPointerCapture(e.pointerId);
          } catch (err) {
            console.warn('无法捕获指针:', err);
          }
        } else {
          // 非数位笔输入设备
          isPenHovering = false;
        }
        
        // 检查是否在绘图区域内
        const rect = p.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x >= 0 && y >= 0 && x < 200 && y < 200) {
          // 在控制面板区域内，忽略绘图
          return;
        }
        
        lastX = x;
        lastY = y;
        isDrawing = true;
      }, { passive: false });
      
      p.canvas.addEventListener('pointerup', function(e) {
        isDrawing = false;
        
        // 释放指针捕获
        if (e.pointerId !== undefined) {
          try {
            p.canvas.releasePointerCapture(e.pointerId);
          } catch (err) {
            console.warn('无法释放指针捕获:', err);
          }
        }
      }, { passive: false });
      
      // 添加指针离开画布的处理
      p.canvas.addEventListener('pointerleave', function(e) {
        if (e.pointerType === 'pen') {
          // 数位笔离开画布，隐藏光标
          isPenHovering = false;
        }
      });
      
      // 添加指针进入画布的处理
      p.canvas.addEventListener('pointerenter', function(e) {
        if (e.pointerType === 'pen') {
          // 数位笔进入画布，显示光标
          isPenHovering = true;
          penX = e.clientX;
          penY = e.clientY;
        }
      });
    }
  });
  
  // 绘制数位笔光标
  function drawPenCursor(x, y) {
    // 计算光标大小（基于当前笔刷大小）
    let cursorSize = strokeWidth * 2;
    if (cursorSize < 10) cursorSize = 10;
    
    p.push();
    
    // 在数位笔位置绘制光标
    p.translate(x, y);
    
    // 绘制笔尖 - 使用绿色
    p.noStroke();
    p.fill(50, 200, 50, 200); // 绿色，半透明
    p.ellipse(0, 0, cursorSize, cursorSize);
    
    // 绘制外轮廓
    p.stroke(0, 150);
    p.strokeWeight(1);
    p.noFill();
    p.ellipse(0, 0, cursorSize + 3, cursorSize + 3);
    
    // 添加十字线帮助精确定位
    p.stroke(255);
    p.strokeWeight(1);
    p.line(-cursorSize/2, 0, cursorSize/2, 0);
    p.line(0, -cursorSize/2, 0, cursorSize/2);
    
    p.pop();
  }
} 