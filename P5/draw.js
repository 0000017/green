// 基本绘画功能
// 提供简单的绘图功能

function drawSketch(p) {
  let isDrawing = false;
  let color = [0, 0, 0];
  let strokeWidth = 4;
  let colorPicker;
  let strokeSlider;
  
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
    
    // 创建颜色选择器
    colorPicker = p.createColorPicker('#000000');
    colorPicker.position(20, p.height - 40);
    colorPicker.style('width', '80px');
    
    // 创建笔触粗细滑块
    strokeSlider = p.createSlider(1, 20, strokeWidth);
    strokeSlider.position(110, p.height - 40);
    strokeSlider.style('width', '150px');
  };
  
  p.draw = function() {
    // 更新颜色和笔触粗细
    color = colorPicker.color().levels.slice(0, 3);
    strokeWidth = strokeSlider.value();
    p.stroke(color);
    p.strokeWeight(strokeWidth);
    
    // 绘画
    if (isDrawing) {
      p.line(p.pmouseX, p.pmouseY, p.mouseX, p.mouseY);
    }
  };
  
  p.mousePressed = function() {
    // 忽略在控制面板区域的点击
    if (p.mouseY > p.height - 50 && p.mouseX < 270) {
      return;
    }
    isDrawing = true;
    return false; // 阻止默认行为
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