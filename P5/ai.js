// AI背景功能 - 与ComfyUI通信
// 显示ComfyUI生成的图像作为背景

// 将aiSketch函数暴露到全局作用域，使sketch.js可以访问
window.aiSketch = function(p) {
  // ComfyUI连接配置
  const comfyUIConfig = {
    serverAddress: 'ws://127.0.0.1:8000/ws',  // 默认ComfyUI服务器地址
    clientId: Date.now().toString(),         // 生成唯一客户端ID
    promptId: null,                          // 当前请求的ID
    isConnected: false,                      // 连接状态
    status: '未连接',                         // 连接状态文本
    debug: true                              // 调试模式
  };
  
  // 图像生成相关变量
  let isProcessingImage = false;             // 是否正在处理图像
  let currentProgress = { value: 0, max: 1 }; // 当前处理进度
  let socket = null;                         // WebSocket连接
  let statusElement;                         // 状态显示元素
  let lastResult = null;                     // 最后一次ComfyUI返回的图像
  let controlPanel;                          // 控制面板

  // Lora模型配置数据
  const loraModels = [
    {
      name: "虚焦梦核 _ 柔光春核 _ 夏核",
      filename: "F.1 虚焦梦核 _ 柔光春核 _ 夏核_v1.0.safetensors",
      defaultPrompt: "soft focus，mh style,fgch style,soft sunlight with shiny glow,mhcg style,shinyyy,Close-up,a white boat floats on the water. The boat is decorated with a variety of brightly colored flowers and green plants,including pink,orange,and yellow. The river water is blue-green,and glowing white butterflies are flying in the air. The water surface is calm,reflecting the colors of the flowers,and the lake and flowers emit cross flashes,a dreamy scene.,",
      triggerWord: "soft focus"
    },
    {
      name: "治愈风情绪感壁纸插画",
      filename: "治愈风情绪感壁纸插画 F.1_v1.0.safetensors",
      defaultPrompt: "Healing Illustration,Oil painting,Beautiful digital art illustration,Oil painting style,. This is a vibrant digital illustration depicting a close-up view of a person riding a bright green bicycle against a vivid blue sky. The cyclists feet are prominently visible, clad in brown sandals with white soles, and the bicycles tires are detailed with visible tread patterns. The cyclist is wearing a white dress, and the image focuses on their lower body and the bicycle, giving a sense of motion and speed. The background consists of a lush, green field filled with numerous white daisies with yellow centers, their petals scattered and blurred to suggest motion. The daisies are arranged in clusters and appear to be in full bloom. The overall scene has a dreamlike quality with a slight, soft-focus effect, enhancing the sense of motion and freedom. The light is bright, creating a sunny, summer atmosphere. This dynamic composition combines elements of realism with a surreal, dreamy aesthetic, emphasizing the joy and",
      triggerWord: "Healing Illustration"
    },
    {
      name: "治愈系插画-彩铅画",
      filename: "F.1 治愈系插画-彩铅画_v1.0.safetensors",
      defaultPrompt: "Colorful pencil drawing, colored lead, pencil brush, pencil strokes, light colors, gentle color matching, low contrast, pink green, detailed images, high brightness, dreamy style, relaxed and pleasant feeling, illustration, decorative painting,This is a healing illustration with a book spread out on the grass, with handwritten text and photos on the pages. There is a brightly colored bouquet of flowers on the book, accompanied by a small cat doll and a rabbit doll. The surrounding grassland is blooming with small flowers of various colors, creating a warm and beautiful atmosphere.",
      triggerWord: "pencil drawing"
    },
    {
      name: "超现实主义插画 _ 造梦大师",
      filename: "F.1 超现实主义插画 _ 造梦大师_Pop扁平插画_V.1.safetensors",
      defaultPrompt: "surrealist illustration,cyberpunk,Anime,surrealist illustration,illustration_era,Fluorescence thermography,Amidst an alien meadow,a young asian girl sits cross-legged,her white blouse and blue skirt contrasting with the vibrant hues of extraterrestrial flora. The grassy field is a tapestry of colors,with flowers that shimmer in shades of iridescent blues,purples,and greens,their petals glowing softly under an unseen light., The girl's hair,dark and wavy,frames her face as she gazes thoughtfully into the distance. Her eyes reflect the wonder of the alien landscape,a world where the ordinary rules of nature are bent by the whims of an otherworldly realm., Floating around her are tiny,luminescent butterflies,their wings a blur of motion,adding to the magical atmosphere. The air is thick with the scent of alien blooms,a mix of sweet and exotic fragrances that tantalize the senses., This illustration captures a moment of serene contemplation,where the girl becomes one with the mystical beauty of an alien world,her presence a bridge between the known and the unknown.,",
      triggerWord: "surrealist illustration,(Desaturated color:2),(retro style:2)"
    }
  ];
  
  // 当前选择的设置
  let currentSettings = {
    loraIndex: 0,  // 默认使用第一个Lora模型
    customPrompt: "",  // 用户自定义提示词
    useDefaultPrompt: true,  // 是否使用默认提示词
    randomSeed: Math.floor(Math.random() * 1000000000)  // 随机种子
  };
  
  // 将当前设置暴露到全局，使sketch.js可以访问
  window.AISettings = currentSettings;
  
  // 更新服务器地址的函数 - 可以从外部调用
  window.updateComfyUIServerAddress = function(ip, port) {
    if (ip && port) {
      comfyUIConfig.serverAddress = `ws://${ip}:${port}/ws`;
      console.log(`[ComfyUI] 服务器地址已更新为: ${comfyUIConfig.serverAddress}`);
      
      // 如果已连接，重新连接到新地址
      if (comfyUIConfig.isConnected) {
        console.log('[ComfyUI] 地址已更改，正在重新连接...');
        connectToComfyUI();
      }
      
      return true;
    }
    return false;
  };
  
  // 调试函数
  function debugLog(...args) {
    if (comfyUIConfig.debug) {
      console.log('[ComfyUI Debug]', ...args);
    }
  }

  // 初始化画布和控件
  p.setup = function() {
    // 创建主画布并铺满屏幕
    mainCanvas = p.createCanvas(p.windowWidth, p.windowHeight);
    mainCanvas.style('z-index', '700');
    mainCanvas.position(0, 0);
    
    // 初始化背景
    p.background(240);
    
    // 创建控制面板
    createAIControlPanel();
    
    // 尝试连接ComfyUI
    connectToComfyUI();
    
    // 尝试在初始化时自动获取网络设置
    try {
      // 查找所有输入框
      const inputs = document.querySelectorAll('input');
      let ipInput = null;
      let portInput = null;
      
      // 检查输入框值或占位符是否包含默认IP/端口
      for (const input of inputs) {
        const value = input.value || input.placeholder || '';
        if (value.includes('127.0.0.1')) {
          ipInput = input;
        } else if (value === '8000') {
          portInput = input;
        }
      }
      
      // 如果找到了输入框，更新服务器地址
      if (ipInput && portInput) {
        const ip = ipInput.value || ipInput.placeholder || '127.0.0.1';
        const port = portInput.value || portInput.placeholder || '8000';
        window.updateComfyUIServerAddress(ip, port);
      }
    } catch (err) {
      console.warn('[ComfyUI] 无法从网页元素获取网络配置:', err);
    }
  };

  // 绘制循环
  p.draw = function() {
    // 清除主画布
    p.clear();
    
    // 如果有来自ComfyUI的结果图像，显示在主画布上
    if (lastResult && lastResult.width && lastResult.height) {
      p.push();
      // 保持图像比例，最大化填充屏幕
      const imgRatio = lastResult.width / lastResult.height;
      const screenRatio = p.width / p.height;
      let drawWidth, drawHeight;
      
      if (imgRatio > screenRatio) {
        // 图像较宽，以高度为基准
        drawHeight = p.height;
        drawWidth = drawHeight * imgRatio;
      } else {
        // 图像较高，以宽度为基准
        drawWidth = p.width;
        drawHeight = drawWidth / imgRatio;
      }
      
      // 居中显示
      p.imageMode(p.CENTER);
      p.image(lastResult, p.width/2, p.height/2, drawWidth, drawHeight);
      p.pop();
    } else {
      // 如果没有结果图像，显示提示信息
      p.fill(100);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(24);
      p.text('等待ComfyUI生成图像...', p.width/2, p.height/2);
    }
    
    // 如果正在处理图像，显示进度条（在屏幕底部）
    if (isProcessingImage) {
      const progress = currentProgress.value / currentProgress.max;
      
      // 绘制进度条背景
      p.fill(40);
      p.noStroke();
      p.rect(0, p.height - 30, p.width, 10, 5);
      
      // 绘制进度条
      p.fill(0, 120, 255);
      p.rect(0, p.height - 30, p.width * progress, 10, 5);
      
      // 显示百分比
      p.fill(255);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(12);
      p.text(`生成中: ${Math.round(progress * 100)}%`, p.width/2, p.height - 20);
    }
    
    // 绘制连接状态指示器
    p.fill(comfyUIConfig.isConnected ? p.color(0, 255, 0) : p.color(255, 0, 0));
    p.noStroke();
    p.ellipse(p.width - 20, 20, 10, 10);
    
    // 更新状态显示
    if (statusElement) {
      statusElement.html('状态: ' + comfyUIConfig.status);
    }
  };

  // 窗口大小调整
  p.windowResized = function() {
    try {
      // 重新设置主画布大小
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      
      // 清理并初始化
      p.clear();
      
      // 如果没有结果图像，保持浅灰色背景
      if (!lastResult) {
        p.background(240);
      }
    } catch (err) {
      console.error('窗口调整大小时出错:', err);
    }
  };

  // 创建AI控制面板将在sketch.js中实现，这里仅创建基本状态显示面板
  function createAIControlPanel() {
    controlPanel = p.createDiv('');
    controlPanel.id('ai-status-panel');
    controlPanel.class('ai-status-panel');
    controlPanel.style('position', 'fixed');
    controlPanel.style('bottom', '10px');
    controlPanel.style('right', '10px');
    controlPanel.style('background-color', 'rgba(0, 0, 0, 0.7)');
    controlPanel.style('padding', '5px 10px');
    controlPanel.style('border-radius', '5px');
    controlPanel.style('color', 'white');
    controlPanel.style('font-size', '12px');
    controlPanel.style('z-index', '1000');
    
    // 状态显示
    statusElement = p.createDiv('状态: ' + comfyUIConfig.status);
    controlPanel.child(statusElement);
  }

  // 连接到ComfyUI WebSocket
  function connectToComfyUI() {
    comfyUIConfig.status = '正在连接...';
    comfyUIConfig.isConnected = false;
    updateStatusDisplay();
    
    // 关闭现有连接
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    
    // 获取HTTP URL
    const httpUrl = getHttpUrlFromWs(comfyUIConfig.serverAddress);
    
    // 检查服务器状态
    fetch(`${httpUrl}/system_stats`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`服务器响应错误: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        debugLog('ComfyUI服务器状态正常');
        
        // 创建WebSocket连接
        const fullAddress = `${comfyUIConfig.serverAddress}?clientId=${comfyUIConfig.clientId}`;
        socket = new WebSocket(fullAddress);
        
        // 连接打开处理
        socket.onopen = function() {
          debugLog('WebSocket已连接');
          comfyUIConfig.status = '已连接';
          comfyUIConfig.isConnected = true;
          updateStatusDisplay();
          
          // 发送ping测试连接
          socket.send(JSON.stringify({type: 'ping'}));
        };
        
        // 接收消息处理
        socket.onmessage = function(event) {
          try {
            if (typeof event.data === 'string') {
              const message = JSON.parse(event.data);
              
              if (message.type === 'pong') {
                debugLog('收到pong响应');
              } else if (message.type === 'executing' && 
                         message.data.node === null && 
                         comfyUIConfig.promptId && 
                         message.data.prompt_id === comfyUIConfig.promptId) {
                // 任务执行完成，获取结果
                getResultFromComfyUI(comfyUIConfig.promptId);
              } else if (message.type === 'progress') {
                // 保存进度信息
                currentProgress = {
                  value: message.data.value,
                  max: message.data.max
                };
                
                const progressPercent = Math.round(message.data.value/message.data.max*100);
                comfyUIConfig.status = `处理中: ${progressPercent}%`;
                updateStatusDisplay();
              }
            }
          } catch (e) {
            console.error('处理WebSocket消息时出错:', e);
          }
        };
        
        // 连接关闭处理
        socket.onclose = function(event) {
          debugLog('WebSocket连接关闭', event.code);
          comfyUIConfig.status = `已断开连接 (${event.code})`;
          comfyUIConfig.isConnected = false;
          updateStatusDisplay();
          
          // 如果非正常关闭且不是手动关闭，尝试重新连接
          if (!event.wasClean && event.code !== 1000) {
            comfyUIConfig.status = '连接断开，5秒后重试...';
            setTimeout(connectToComfyUI, 5000);
          }
        };
        
        // 错误处理
        socket.onerror = function(error) {
          console.error('WebSocket错误:', error);
          comfyUIConfig.status = 'WebSocket错误';
          comfyUIConfig.isConnected = false;
          updateStatusDisplay();
        };
      })
      .catch(error => {
        comfyUIConfig.isConnected = false;
        comfyUIConfig.status = '连接失败: ' + error.message;
        console.error('ComfyUI连接失败:', error);
        
        // 5秒后重试
        setTimeout(connectToComfyUI, 5000);
      });
  }
  
  // 从WebSocket URL获取HTTP URL
  function getHttpUrlFromWs(wsUrl) {
    try {
      const wsMatch = wsUrl.match(/^ws:\/\/([^\/]+)(\/.*)?$/);
      if (wsMatch) {
        const hostPort = wsMatch[1]; // 例如 "127.0.0.1:8000"
        return `http://${hostPort}`;
      }
    } catch (err) {
      console.error('[ComfyUI] 解析WebSocket URL失败:', err);
    }
    // 默认返回
    return 'http://127.0.0.1:8000';
  }
  
  // 更新状态显示
  function updateStatusDisplay() {
    if (statusElement) {
      statusElement.html('状态: ' + comfyUIConfig.status);
    }
  }
  
  // 从ComfyUI获取处理结果
  function getResultFromComfyUI(promptId) {
    // 获取HTTP URL
    const httpUrl = getHttpUrlFromWs(comfyUIConfig.serverAddress);
    
    // 构建历史记录URL
    const historyUrl = `${httpUrl}/history/${promptId}`;
    debugLog('获取历史记录:', historyUrl);
    
    fetch(historyUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        const historyData = data[promptId];
        // 查找保存图像的节点输出
        const outputs = historyData.outputs;
        
        for (const nodeId in outputs) {
          if (outputs[nodeId].images) {
            const imageData = outputs[nodeId].images[0];
            
            // 构建图像URL
            const imageUrl = `${httpUrl}/view?filename=${imageData.filename}&type=${imageData.type}&subfolder=${imageData.subfolder || ''}`;
            debugLog('图像URL:', imageUrl);
            
            // 加载图像
            loadResultImage(imageUrl);
            break;
          }
        }
      })
      .catch(error => {
        console.error('获取结果失败:', error);
        comfyUIConfig.status = `获取结果失败: ${error.message}`;
        updateStatusDisplay();
        isProcessingImage = false;
      });
  }
  
  // 加载结果图像
  function loadResultImage(imageUrl) {
    // 加载图像
    p.loadImage(imageUrl, 
      // 成功回调
      img => {
        // 验证图像是否有效
        if (img && img.width && img.height) {
          console.log('图像加载成功，尺寸:', img.width, 'x', img.height);
          lastResult = img;
          comfyUIConfig.status = '图像已生成';
          isProcessingImage = false;
          updateStatusDisplay();
          
          // 触发自定义事件，通知sketch.js图像已生成
          const event = new CustomEvent('aiImageGenerated', {
            detail: { success: true }
          });
          document.dispatchEvent(event);
        } else {
          console.error('加载的图像无效');
          comfyUIConfig.status = '加载的图像无效';
          lastResult = null;
          isProcessingImage = false;
          updateStatusDisplay();
        }
      },
      // 错误回调
      err => {
        console.error('加载图像失败:', err);
        comfyUIConfig.status = '加载图像失败';
        lastResult = null;
        isProcessingImage = false;
        updateStatusDisplay();
        
        // 2秒后重试
        setTimeout(() => loadResultImage(imageUrl), 2000);
      }
    );
  }
  
  // 发送生成图像请求
  function generateImage(settings) {
    if (!comfyUIConfig.isConnected) {
      alert('未连接到ComfyUI，请检查ComfyUI是否已启动');
      return;
    }
    
    // 更新当前设置
    if (settings) {
      currentSettings = { ...currentSettings, ...settings };
    }
    
    comfyUIConfig.status = '正在生成...';
    updateStatusDisplay();
    isProcessingImage = true;
    
    try {
      // 构建工作流
      const workflow = getWorkflow(currentSettings);
      
      // 发送到ComfyUI
      sendWorkflow(workflow);
    } catch (error) {
      comfyUIConfig.status = '生成工作流失败: ' + error.message;
      console.error('生成工作流失败:', error);
      isProcessingImage = false;
      updateStatusDisplay();
    }
  }
  
  // 构建工作流
  function getWorkflow(settings) {
    const selectedLora = loraModels[settings.loraIndex];
    let finalPrompt = "";
    
    // 确定使用哪个提示词
    if (settings.useDefaultPrompt) {
      finalPrompt = selectedLora.defaultPrompt;
    } else {
      // 自定义提示词 + 触发关键词
      finalPrompt = selectedLora.triggerWord + "," + settings.customPrompt;
    }
    
    console.log("使用Lora:", selectedLora.filename);
    console.log("使用提示词:", finalPrompt);
    
    // 生成一个随机种子
    const randomSeed = settings.randomSeed || Math.floor(Math.random() * 1000000000);
    
    // 基于greenf.json的工作流
    const workflow = {
      "6": {
        "inputs": {
          "text": finalPrompt,
          "clip": [
            "28",
            1
          ]
        },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": {
          "samples": [
            "13",
            0
          ],
          "vae": [
            "10",
            0
          ]
        },
        "class_type": "VAEDecode"
      },
      "10": {
        "inputs": {
          "vae_name": "FLUX_VAE.sft"
        },
        "class_type": "VAELoader"
      },
      "11": {
        "inputs": {
          "clip_name1": "t5xxl_fp8_e4m3fn.safetensors",
          "clip_name2": "clip_l.safetensors",
          "type": "flux",
          "device": "default"
        },
        "class_type": "DualCLIPLoader"
      },
      "12": {
        "inputs": {
          "unet_name": "flux_dev_fp8_11g.safetensors",
          "weight_dtype": "fp8_e4m3fn"
        },
        "class_type": "UNETLoader"
      },
      "13": {
        "inputs": {
          "noise": [
            "25",
            0
          ],
          "guider": [
            "22",
            0
          ],
          "sampler": [
            "16",
            0
          ],
          "sigmas": [
            "17",
            0
          ],
          "latent_image": [
            "36",
            0
          ]
        },
        "class_type": "SamplerCustomAdvanced"
      },
      "16": {
        "inputs": {
          "sampler_name": "euler"
        },
        "class_type": "KSamplerSelect"
      },
      "17": {
        "inputs": {
          "scheduler": "simple",
          "steps": 20,
          "denoise": 0.9600000000000002,
          "model": [
            "28",
            0
          ]
        },
        "class_type": "BasicScheduler"
      },
      "22": {
        "inputs": {
          "model": [
            "28",
            0
          ],
          "conditioning": [
            "6",
            0
          ]
        },
        "class_type": "BasicGuider"
      },
      "25": {
        "inputs": {
          "noise_seed": randomSeed
        },
        "class_type": "RandomNoise"
      },
      "28": {
        "inputs": {
          "lora_name": selectedLora.filename,
          "strength_model": 1,
          "strength_clip": 1,
          "model": [
            "12",
            0
          ],
          "clip": [
            "11",
            0
          ]
        },
        "class_type": "LoraLoader"
      },
      "34": {
        "inputs": {
          "filename_prefix": "ComfyUI",
          "images": [
            "8",
            0
          ]
        },
        "class_type": "SaveImage"
      },
      "36": {
        "inputs": {
          "width": 768,
          "height": 768,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage"
      }
    };
    
    return workflow;
  }
  
  // 发送工作流到ComfyUI
  function sendWorkflow(workflow) {
    try {
      // 获取HTTP URL
      const httpUrl = getHttpUrlFromWs(comfyUIConfig.serverAddress);
      
      // 准备提交数据
      const clientID = comfyUIConfig.clientId.toString();
      const promptData = {
        prompt: workflow,
        client_id: clientID
      };
      
      // 序列化数据
      const jsonData = JSON.stringify(promptData);
      
      debugLog('正在提交到ComfyUI:', httpUrl);
      comfyUIConfig.status = '正在提交生成任务...';
      updateStatusDisplay();
      
      // 发送POST请求
      fetch(`${httpUrl}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: jsonData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`服务器返回错误: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        comfyUIConfig.promptId = data.prompt_id;
        comfyUIConfig.status = '已提交请求，等待生成...';
        updateStatusDisplay();
        debugLog('工作流已提交，ID:', data.prompt_id);
      })
      .catch(error => {
        comfyUIConfig.status = '提交失败: ' + error.message;
        console.error('发送工作流失败:', error);
        isProcessingImage = false;
        updateStatusDisplay();
      });
    } catch (error) {
      comfyUIConfig.status = '请求序列化失败: ' + error.message;
      console.error('JSON序列化失败:', error);
      isProcessingImage = false;
      updateStatusDisplay();
    }
  }
  
  // 暴露公共方法，允许sketch.js调用
  p.generateImage = generateImage;
  p.getLoraModels = () => loraModels;
  p.getComfyUIStatus = () => comfyUIConfig.isConnected;
};
