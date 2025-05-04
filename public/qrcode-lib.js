/**
 * 简化版QRCode库
 * 用在线API生成二维码，无任何依赖
 */

// 定义全局QRCode构造函数
window.QRCode = function(container, options) {
  // 处理选项
  if (typeof container === 'string') {
    container = document.getElementById(container);
  }
  
  if (!container) {
    console.error('QRCode: 未找到目标容器');
    return;
  }
  
  // 获取参数
  var text = options && options.text ? options.text : '';
  var width = options && options.width ? options.width : 256;
  var height = options && options.height ? options.height : 256;
  
  // 清空容器
  container.innerHTML = '';
  
  // 存储选项
  this._container = container;
  this._width = width;
  this._height = height;
  
  // 如果有初始文本，立即生成二维码
  if (text) {
    this.makeCode(text);
  }
};

// 添加方法
window.QRCode.prototype.clear = function() {
  if (this._container) {
    this._container.innerHTML = '';
  }
};

window.QRCode.prototype.makeCode = function(text) {
  // 清空容器
  this.clear();
  
  if (!text) {
    console.warn('QRCode: 没有提供文本');
    return;
  }
  
  try {
    // 创建一个图像元素，使用在线QR生成服务
    var img = document.createElement('img');
    img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=' + 
              this._width + 'x' + this._height + 
              '&data=' + encodeURIComponent(text);
    img.alt = '扫描二维码';
    img.style.width = this._width + 'px';
    img.style.height = this._height + 'px';
    
    // 添加到容器
    this._container.appendChild(img);
    
    console.log('二维码生成成功:', text);
  } catch (error) {
    console.error('生成二维码时出错:', error);
    
    // 显示错误信息和链接
    this._container.innerHTML = 
      '<div style="padding: 15px; background:#f8d7da; border-radius:4px; color:#721c24;">' +
      '<p>生成二维码失败</p>' +
      '<a href="' + text + '" target="_blank" style="word-break:break-all;">' + text + '</a>' +
      '</div>';
  }
};

// 添加必要的错误级别常量
window.QRCode.CorrectLevel = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2
};

console.log('Web API QRCode库已加载'); 