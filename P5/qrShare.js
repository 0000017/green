/**
 * Green - 二维码图片分享工具
 * 用于通过二维码将创作分享到同一网络下的手机
 */

// 全局变量
let serverURL = null;
let isServerInitialized = false;

// 检查是否在Electron环境中
const isElectron = (typeof window !== 'undefined' && window.process && window.process.type === 'renderer');

// 如果在Electron环境中，导入IPC模块
let ipcRenderer = null;
if (isElectron) {
  try {
    ipcRenderer = window.require('electron').ipcRenderer;
    console.log('已加载Electron IPC渲染器');
  } catch (e) {
    console.error('加载Electron IPC渲染器失败:', e);
  }
}

// 在应用启动时初始化分享服务器
function initImageShareServer() {
  return new Promise((resolve, reject) => {
    // 检查IPC是否可用
    if (!ipcRenderer) {
      console.error('IPC渲染器不可用，无法与主进程通信');
      reject(new Error('IPC通信不可用'));
      return;
    }
    
    // 避免重复初始化
    if (isServerInitialized && serverURL) {
      console.log('服务器已初始化，URL:', serverURL);
      resolve(serverURL);
      return;
    }
    
    console.log('通过IPC请求初始化图片分享服务器...');
    
    // 发送初始化请求到主进程
    ipcRenderer.send('init-image-share-server');
    
    // 监听服务器初始化响应
    ipcRenderer.once('image-share-server-initialized', (event, data) => {
      if (data.success) {
        serverURL = data.serverURL;
        isServerInitialized = true;
        console.log('图片分享服务器已成功初始化，URL:', serverURL);
        resolve(serverURL);
      } else {
        console.error('图片分享服务器初始化失败:', data.error);
        reject(new Error(data.error));
      }
    });
    
    // 设置超时
    setTimeout(() => {
      if (!isServerInitialized) {
        reject(new Error('图片分享服务器初始化超时'));
      }
    }, 5000);
  });
}

// 分享图片并显示二维码
function shareImageWithQRCode(imageDataURL, customFilename) {
  const filename = customFilename || `Green作品-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
  
  // 检查是否已初始化
  if (!isServerInitialized) {
    // 显示加载中提示
    showLoadingMessage('正在准备分享服务...');
    
    // 初始化服务器
    initImageShareServer()
      .then(() => {
        // 初始化成功后隐藏加载提示并继续分享
        hideLoadingMessage();
        uploadAndShare(imageDataURL, filename);
      })
      .catch(error => {
        // 隐藏加载提示并显示错误
        hideLoadingMessage();
        console.error('初始化图片分享服务失败:', error);
        showErrorMessage('无法启动分享服务: ' + error.message);
      });
  } else {
    // 已初始化，直接上传并分享
    uploadAndShare(imageDataURL, filename);
  }
}

// 上传并分享图片
function uploadAndShare(imageDataURL, filename) {
  if (!ipcRenderer) {
    showErrorMessage('无法连接到分享服务');
    return;
  }
  
  // 显示加载中提示
  showLoadingMessage('正在生成分享链接...');
  
  // 发送图片数据和文件名到主进程
  ipcRenderer.send('share-image', { imageData: imageDataURL, filename: filename });
  
  // 监听分享结果
  ipcRenderer.once('image-shared', (event, data) => {
    // 隐藏加载提示
    hideLoadingMessage();
    
    if (data.success) {
      showQRCodeModal(data.shareURL);
    } else {
      showErrorMessage('分享失败: ' + (data.error || '未知错误'));
    }
  });
  
  // 设置超时
  setTimeout(() => {
    hideLoadingMessage();
    if (!document.querySelector('.qr-modal')) {
      showErrorMessage('分享请求超时，请稍后重试');
    }
  }, 10000);
}

// 显示加载中消息
function showLoadingMessage(message) {
  // 移除可能存在的旧消息
  hideLoadingMessage();
  
  const loadingEl = document.createElement('div');
  loadingEl.id = 'qr-loading-message';
  loadingEl.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <p>${message}</p>
    </div>
  `;
  
  document.body.appendChild(loadingEl);
  
  // 添加样式
  if (!document.getElementById('qr-loading-styles')) {
    const style = document.createElement('style');
    style.id = 'qr-loading-styles';
    style.textContent = `
      #qr-loading-message {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 3000;
      }
      .loading-content {
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      }
      .loading-spinner {
        width: 40px;
        height: 40px;
        margin: 0 auto 15px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #4caf50;
        border-radius: 50%;
        animation: spin 2s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

// 隐藏加载中消息
function hideLoadingMessage() {
  const loadingEl = document.getElementById('qr-loading-message');
  if (loadingEl) {
    document.body.removeChild(loadingEl);
  }
}

// 显示二维码弹窗
function showQRCodeModal(shareURL) {
  // 创建弹窗容器
  const modal = document.createElement('div');
  modal.className = 'qr-modal';
  
  // 设置弹窗内容
  modal.innerHTML = `
    <div class="qr-modal-content">
      <span class="qr-modal-close">&times;</span>
      <h3>扫描二维码下载图片</h3>
      <p>请用手机扫描下方二维码"</p>
      <p>手机请连接校园网"i_sicau_wifi6”<p>
      <div id="qrcode-container"></div>
      <p class="qr-url">${shareURL}</p>
      <p class="qr-expires">链接10分钟内有效</p>
    </div>
  `;
  
  // 添加到文档中
  document.body.appendChild(modal);
  
  // 生成二维码
  generateQRCode('qrcode-container', shareURL);
  
  // 添加关闭按钮功能
  modal.querySelector('.qr-modal-close').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // 添加点击背景关闭弹窗
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
  
  // 添加样式
  applyQRModalStyles();
}

// 生成二维码
function generateQRCode(elementId, data) {
  console.log('正在生成二维码...');
  
  try {
    const container = document.getElementById(elementId);
    if (!container) {
      console.error('未找到二维码容器:', elementId);
      return;
    }
    
    // 清空容器
    container.innerHTML = '';
    
    // 检查QRCode是否可用
    if (typeof QRCode === 'function') {
      // 直接使用QRCode构造函数生成二维码
      new QRCode(container, {
        text: data,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
      console.log('二维码生成成功');
    } else {
      // QRCode不可用，显示链接
      console.error('QRCode库未加载，显示普通链接');
      container.innerHTML = `
        <div style="padding: 20px; background: #f8d7da; color: #721c24; border-radius: 5px;">
          <p>无法生成二维码，请使用以下链接：</p>
          <a href="${data}" target="_blank" style="word-break: break-all;">${data}</a>
        </div>
      `;
    }
  } catch (error) {
    console.error('生成二维码时出错:', error);
    // 尝试获取容器
    const container = document.getElementById(elementId);
    if (container) {
      // 显示错误信息和链接
      container.innerHTML = `
        <div style="padding: 20px; background: #f8d7da; color: #721c24; border-radius: 5px;">
          <p>生成二维码失败: ${error.message}</p>
          <a href="${data}" target="_blank" style="word-break: break-all;">${data}</a>
        </div>
      `;
    }
  }
}

// 动态加载QRCode库
function loadQRCodeLibrary() {
  return new Promise((resolve, reject) => {
    if (typeof QRCode === 'function') {
      resolve();
      return;
    }
    
    // 尝试多种可能的路径
    const possiblePaths = [
      // 1. 本地安装的库
      'node_modules/qrcode-generator/qrcode.js',
      // 2. 相对路径
      '../node_modules/qrcode-generator/qrcode.js',
      // 3. 绝对路径
      '/node_modules/qrcode-generator/qrcode.js',
      // 4. CDN备选
      'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'
    ];
    
    // 创建加载失败计数器
    let failedAttempts = 0;
    
    // 尝试加载第一个路径
    tryLoadScript(0);
    
    // 尝试加载指定索引的脚本
    function tryLoadScript(index) {
      if (index >= possiblePaths.length) {
        // 所有路径都尝试失败
        reject(new Error('无法加载QRCode库，所有已知路径均失败'));
        return;
      }
      
      const script = document.createElement('script');
      script.src = possiblePaths[index];
      
      script.onload = () => {
        console.log('成功加载QRCode库:', possiblePaths[index]);
        resolve();
      };
      
      script.onerror = () => {
        failedAttempts++;
        console.warn(`加载QRCode库失败(${failedAttempts}/${possiblePaths.length}):`, possiblePaths[index]);
        // 尝试下一个路径
        tryLoadScript(index + 1);
      };
      
      document.head.appendChild(script);
    }
  });
}

// 初始尝试加载QRCode库，不等待结果
loadQRCodeLibrary().then(() => {
  console.log('QRCode库预加载成功');
}).catch(error => {
  console.warn('QRCode库预加载失败:', error);
});

// 应用QR弹窗样式
function applyQRModalStyles() {
  // 检查是否已经添加了样式
  if (document.getElementById('qr-modal-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'qr-modal-styles';
  style.textContent = `
    .qr-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      backdrop-filter: blur(3px);
    }
    .qr-modal-content {
      background-color: rgba(20, 31, 20, 0.95);
      padding: 30px;
      border-radius: 20px;
      max-width: 90%;
      width: 350px;
      text-align: center;
      position: relative;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(183, 254, 93, 0.1);
      color: #EEEEEE;
    }
    .qr-modal-close {
      position: absolute;
      top: 15px;
      right: 15px;
      font-size: 24px;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.7);
      transition: all 0.2s;
      width: 25px;
      height: 25px;
      line-height: 22px;
      text-align: center;
      border-radius: 50%;
    }
    .qr-modal-close:hover {
      color: white;
      background-color: rgba(255, 255, 255, 0.2);
    }
    #qrcode-container {
      margin: 20px auto;
      width: 256px;
      height: 256px;
      background-color: rgba(255, 255, 255, 0.9);
      padding: 10px;
      border-radius: 10px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    #qrcode-container img {
      display: block;
      max-width: 100%;
      max-height: 100%;
    }
    .qr-url {
      word-break: break-all;
      color: rgba(255, 255, 255, 0.7);
      font-size: 12px;
      margin: 15px 0 5px;
      background: rgba(0, 0, 0, 0.2);
      padding: 8px;
      border-radius: 4px;
    }
    .qr-expires {
      color: #B7FE5D;
      font-size: 14px;
      margin-top: 5px;
    }
    .qr-modal h3 {
      margin-top: 0;
      margin-bottom: 15px;
      color: #B7FE5D;
      font-size: 20px;
    }
    .qr-modal p {
      margin: 10px 0;
      color: #EEEEEE;
    }
  `;
  document.head.appendChild(style);
}

// 显示错误信息
function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'share-error';
  errorDiv.innerHTML = `
    <div class="share-error-content">
      <span class="share-error-close">&times;</span>
      <h4>分享出错</h4>
      <p>${message}</p>
    </div>
  `;
  
  document.body.appendChild(errorDiv);
  
  // 添加关闭按钮事件
  errorDiv.querySelector('.share-error-close').addEventListener('click', () => {
    document.body.removeChild(errorDiv);
  });
  
  // 应用样式
  if (!document.getElementById('share-error-styles')) {
    const style = document.createElement('style');
    style.id = 'share-error-styles';
    style.textContent = `
      .share-error {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2000;
        max-width: 300px;
      }
      .share-error-content {
        background-color: #f8d7da;
        color: #721c24;
        padding: 15px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        position: relative;
      }
      .share-error-close {
        position: absolute;
        top: 5px;
        right: 10px;
        font-size: 18px;
        cursor: pointer;
      }
      .share-error h4 {
        margin-top: 0;
        margin-bottom: 10px;
      }
    `;
    document.head.appendChild(style);
  }
  
  // 5秒后自动关闭
  setTimeout(() => {
    if (document.body.contains(errorDiv)) {
      document.body.removeChild(errorDiv);
    }
  }, 5000);
}

// 导出函数
window.QRShareTool = {
  shareImageWithQRCode,
  showQRCodeModal,
  initImageShareServer
}; 