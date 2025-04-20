// 摄像头处理功能
// 捕获摄像头图像并提供不同的处理效果

function cameraSketch(p) {
  let video;
  let effectSelect;
  let effectType = 'normal';  // 默认效果
  let captureButton;
  let isCaptured = false;
  let capturedImage;
  
  // 效果类型配置
  const effects = {
    'normal': {
      label: '正常显示',
      process: normalEffect
    },
    'grayscale': {
      label: '灰度效果',
      process: grayscaleEffect
    },
    'threshold': {
      label: '阈值效果',
      process: thresholdEffect
    },
    'invert': {
      label: '反相效果',
      process: invertEffect
    },
    'edge': {
      label: '边缘检测',
      process: edgeEffect
    },
    'pixelate': {
      label: '像素化',
      process: pixelateEffect
    }
  };
  
  p.setup = function() {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.position(0, 0);
    canvas.style('z-index', '800');
    p.background(255);
    
    // 如果有保存的画布，恢复内容
    if (savedCanvas && savedCanvas.width && savedCanvas.height) {
      try {
        p.image(savedCanvas, 0, 0);
        isCaptured = true;
        capturedImage = savedCanvas;
      } catch (e) {
        console.warn('恢复画布内容失败:', e);
        isCaptured = false;
        capturedImage = null;
      }
    } else {
      // 创建视频捕获对象
      video = p.createCapture(p.VIDEO);
      video.size(p.width, p.height);
      video.hide();  // 隐藏默认视频元素
    }
    
    // 创建效果选择器
    effectSelect = p.createSelect();
    effectSelect.position(20, p.height - 40);
    effectSelect.style('width', '120px');
    for (let type in effects) {
      effectSelect.option(effects[type].label, type);
    }
    effectSelect.changed(effectChanged);
    
    // 创建捕获按钮
    captureButton = p.createButton(isCaptured ? '重新捕获' : '捕获图像');
    captureButton.position(150, p.height - 40);
    captureButton.mousePressed(captureImage);
  };
  
  function effectChanged() {
    effectType = effectSelect.value();
  }
  
  function captureImage() {
    if (!isCaptured) {
      // 捕获当前图像
      capturedImage = p.get();
      isCaptured = true;
      captureButton.html('重新捕获');
      
      // 停止视频捕获以节省资源
      if (video) {
        video.stop();
      }
    } else {
      // 重新开始捕获
      isCaptured = false;
      capturedImage = null;
      captureButton.html('捕获图像');
      
      // 重新创建视频捕获对象
      if (!video) {
        video = p.createCapture(p.VIDEO);
        video.size(p.width, p.height);
        video.hide();
      } else {
        video.play();
      }
    }
  }
  
  p.draw = function() {
    if (isCaptured && capturedImage) {
      // 显示已捕获的图像
      p.image(capturedImage, 0, 0, p.width, p.height);
    } else if (video) {
      // 处理视频帧
      p.loadPixels();
      video.loadPixels();
      
      // 应用选择的效果
      effects[effectType].process(p, video);
      
      p.updatePixels();
    }
  };
  
  // 正常效果（无处理）
  function normalEffect(p, video) {
    p.image(video, 0, 0, p.width, p.height);
  }
  
  // 灰度效果
  function grayscaleEffect(p, video) {
    p.image(video, 0, 0, p.width, p.height);
    p.filter(p.GRAY);
  }
  
  // 阈值效果
  function thresholdEffect(p, video) {
    p.image(video, 0, 0, p.width, p.height);
    p.filter(p.THRESHOLD, 0.5);
  }
  
  // 反相效果
  function invertEffect(p, video) {
    p.image(video, 0, 0, p.width, p.height);
    p.filter(p.INVERT);
  }
  
  // 边缘检测效果
  function edgeEffect(p, video) {
    p.image(video, 0, 0, p.width, p.height);
    p.filter(p.POSTERIZE, 4);
    p.filter(p.BLUR, 1);
    p.filter(p.GRAY);
    p.filter(p.THRESHOLD, 0.3);
  }
  
  // 像素化效果
  function pixelateEffect(p, video) {
    const pixelSize = 10;
    video.loadPixels();
    for (let y = 0; y < video.height; y += pixelSize) {
      for (let x = 0; x < video.width; x += pixelSize) {
        const index = (y * video.width + x) * 4;
        const r = video.pixels[index];
        const g = video.pixels[index + 1];
        const b = video.pixels[index + 2];
        
        p.noStroke();
        p.fill(r, g, b);
        p.rect(x, y, pixelSize, pixelSize);
      }
    }
  }
  
  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    if (video) {
      video.size(p.width, p.height);
    }
    
    // 更新控件位置
    effectSelect.position(20, p.height - 40);
    captureButton.position(150, p.height - 40);
  };
  
  p.get = function() {
    return p.canvas;
  };
  
  p.clear = function() {
    p.background(255);
    isCaptured = false;
    capturedImage = null;
    captureButton.html('捕获图像');
  };
  
  p.saveCanvas = function(name, type) {
    p.save(name, type);
  };
} 