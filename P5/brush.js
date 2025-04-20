// 特殊笔刷效果功能
// 提供多种特殊效果的笔刷

function brushSketch(p) {
  let isDrawing = false;
  let color = [0, 0, 0];
  let strokeWidth = 4;
  let colorPicker;
  let strokeSlider;
  let brushSelect;
  let brushType = 'spray';  // 默认笔刷类型
  
  // 笔刷类型配置
  const brushes = {
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
    }
  };
  
  p.setup = function() {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.position(0, 0);
    canvas.style('z-index', '800');
    p.background(255);
    p.noFill();
    p.stroke(color);
    p.strokeWeight(strokeWidth);
    
    // 如果有保存的画布，恢复内容
    if (savedCanvas && savedCanvas.width && savedCanvas.height) {
      try {
        console.log('正在恢复画布内容到笔刷画布...');
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
    
    // 创建颜色选择器
    colorPicker = p.createColorPicker('#000000');
    colorPicker.position(20, p.height - 40);
    colorPicker.style('width', '80px');
    
    // 创建笔触粗细滑块
    strokeSlider = p.createSlider(1, 20, strokeWidth);
    strokeSlider.position(110, p.height - 40);
    strokeSlider.style('width', '150px');
    
    // 创建笔刷类型选择器
    brushSelect = p.createSelect();
    brushSelect.position(270, p.height - 40);
    brushSelect.style('width', '120px');
    for (let type in brushes) {
      brushSelect.option(brushes[type].label, type);
    }
    brushSelect.changed(brushChanged);
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
  };
  
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
  
  p.mousePressed = function() {
    // 忽略在控制面板区域的点击
    if (p.mouseY > p.height - 50 && p.mouseX < 400) {
      return;
    }
    isDrawing = true;
    return false;
  };
  
  p.mouseReleased = function() {
    isDrawing = false;
    return false;
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
        p.background(255); // 确保背景为白色
      }
    } catch (e) {
      console.error('windowResized出错:', e);
      p.background(255); // 确保背景为白色
    }
    
    // 更新控件位置
    colorPicker.position(20, p.height - 40);
    strokeSlider.position(110, p.height - 40);
    brushSelect.position(270, p.height - 40);
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
    p.background(255);
  };
  
  p.saveCanvas = function(name, type) {
    p.save(name, type);
  };
} 