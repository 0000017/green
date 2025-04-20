// TouchDesigner 交互功能
// 将画面发送到TD处理并接收处理后的结果

function tdSketch(p) {
  let capturedImage = null;  // 本地捕获的图像
  let processedImage = null; // 从TD接收的处理后图像
  let captureButton;
  let sendButton;
  let statusText = '待连接';
  let isConnected = false;
  let socket = null;
  let serverAddress = 'ws://localhost:9001'; // 默认WebSocket地址
  let addressInput;
  
  p.setup = function() {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.position(0, 0);
    canvas.style('z-index', '800');
    p.background(255);
    
    // 如果有保存的画布，恢复内容
    if (savedCanvas && savedCanvas.width && savedCanvas.height) {
      try {
        p.image(savedCanvas, 0, 0);
        capturedImage = savedCanvas;
      } catch (e) {
        console.warn('恢复画布内容失败:', e);
        capturedImage = null;
      }
    }
    
    // 创建服务器地址输入框
    addressInput = p.createInput(serverAddress);
    addressInput.position(20, p.height - 70);
    addressInput.style('width', '180px');
    
    // 创建连接按钮
    const connectButton = p.createButton('连接');
    connectButton.position(210, p.height - 70);
    connectButton.mousePressed(connectToTD);
    
    // 创建捕获按钮
    captureButton = p.createButton('捕获当前画面');
    captureButton.position(20, p.height - 40);
    captureButton.mousePressed(captureCanvas);
    
    // 创建发送按钮
    sendButton = p.createButton('发送到TD');
    sendButton.position(140, p.height - 40);
    sendButton.style('width', '100px');
    sendButton.attribute('disabled', '');
    sendButton.mousePressed(sendToTD);
    
    // 尝试连接到TouchDesigner
    connectToTD();
  };
  
  // 连接到TouchDesigner的WebSocket服务器
  function connectToTD() {
    // 获取用户输入的地址
    serverAddress = addressInput.value();
    
    // 关闭现有连接
    if (socket) {
      socket.close();
      isConnected = false;
      statusText = '正在重新连接...';
    }
    
    try {
      // 创建WebSocket连接
      socket = new WebSocket(serverAddress);
      
      // 连接打开处理
      socket.onopen = function() {
        console.log('已连接到TouchDesigner');
        statusText = '已连接';
        isConnected = true;
        sendButton.removeAttribute('disabled');
      };
      
      // 接收消息处理
      socket.onmessage = function(event) {
        console.log('收到来自TouchDesigner的数据');
        // 检查数据类型
        if (event.data instanceof Blob) {
          // 处理二进制图像数据
          const reader = new FileReader();
          reader.onload = function() {
            const dataUrl = reader.result;
            const img = new Image();
            img.onload = function() {
              // 转换为p5图像对象
              processedImage = p.loadImage(dataUrl, () => {
                console.log('已加载处理后的图像');
                statusText = '已接收处理后的图像';
              });
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(event.data);
        } else {
          // 处理文本消息
          console.log('收到文本消息:', event.data);
          statusText = '收到消息: ' + event.data;
        }
      };
      
      // 连接关闭处理
      socket.onclose = function() {
        console.log('与TouchDesigner断开连接');
        statusText = '已断开连接';
        isConnected = false;
        sendButton.attribute('disabled', '');
      };
      
      // 错误处理
      socket.onerror = function(error) {
        console.error('WebSocket错误:', error);
        statusText = '连接错误';
        isConnected = false;
        sendButton.attribute('disabled', '');
      };
      
    } catch (e) {
      console.error('创建WebSocket连接时出错:', e);
      statusText = '连接失败';
      isConnected = false;
      sendButton.attribute('disabled', '');
    }
  }
  
  // 捕获当前画布
  function captureCanvas() {
    try {
      capturedImage = p.get();
      statusText = '已捕获当前画面';
    } catch (e) {
      console.warn('捕获画布失败:', e);
      statusText = '捕获失败';
    }
  }
  
  // 发送图像到TouchDesigner
  function sendToTD() {
    if (!isConnected) {
      statusText = '未连接到服务器';
      return;
    }
    
    if (!capturedImage || !capturedImage.width || !capturedImage.height) {
      statusText = '请先捕获画面';
      return;
    }
    
    try {
      // 将canvas转换为Blob
      p.drawingContext.canvas.toBlob(function(blob) {
        // 发送二进制数据到TouchDesigner
        socket.send(blob);
        statusText = '已发送图像到TD';
        console.log('已发送图像到TouchDesigner');
      }, 'image/jpeg', 0.85);
    } catch (e) {
      console.error('发送图像时出错:', e);
      statusText = '发送失败';
    }
  }
  
  p.draw = function() {
    // 清空背景
    p.background(240);
    
    // 显示状态文本
    p.fill(0);
    p.noStroke();
    p.textSize(14);
    p.text('状态: ' + statusText, 20, 30);
    p.text('服务器: ' + serverAddress, 20, 50);
    
    // 创建网格背景
    drawCheckeredBackground();
    
    // 显示图像
    if (processedImage && processedImage.width && processedImage.height) {
      // 显示从TD接收的处理后图像
      p.image(processedImage, p.width/2 - processedImage.width/2, p.height/2 - processedImage.height/2);
      p.textSize(16);
      p.fill(0, 100, 0);
      p.text('TD处理后的图像', p.width/2 - 80, p.height/2 - processedImage.height/2 - 10);
    } else if (capturedImage && capturedImage.width && capturedImage.height) {
      // 显示本地捕获的图像
      p.image(capturedImage, p.width/2 - capturedImage.width/2, p.height/2 - capturedImage.height/2);
      p.textSize(16);
      p.fill(0, 0, 100);
      p.text('待处理的图像', p.width/2 - 60, p.height/2 - capturedImage.height/2 - 10);
    }
    
    // 绘制连接状态指示器
    p.fill(isConnected ? p.color(0, 255, 0) : p.color(255, 0, 0));
    p.ellipse(p.width - 30, 30, 20, 20);
  };
  
  // 绘制网格背景
  function drawCheckeredBackground() {
    const size = 20;
    p.noStroke();
    
    for (let y = 0; y < p.height; y += size) {
      for (let x = 0; x < p.width; x += size) {
        if ((x / size + y / size) % 2 === 0) {
          p.fill(220);
        } else {
          p.fill(200);
        }
        p.rect(x, y, size, size);
      }
    }
  }
  
  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    
    // 更新控件位置
    addressInput.position(20, p.height - 70);
    captureButton.position(20, p.height - 40);
    sendButton.position(140, p.height - 40);
  };
  
  p.get = function() {
    if (processedImage && processedImage.width && processedImage.height) {
      return processedImage;
    } else if (capturedImage && capturedImage.width && capturedImage.height) {
      return capturedImage;
    } else {
      return p.canvas;
    }
  };
  
  p.clear = function() {
    p.background(255);
    capturedImage = null;
    processedImage = null;
  };
  
  p.saveCanvas = function(name, type) {
    p.save(name, type);
  };
  
  // 清理函数，关闭WebSocket连接
  p.remove = function() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    // 调用p5实例的原始remove方法
    p._remove();
  };
} 