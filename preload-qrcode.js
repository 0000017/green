/**
 * QRCode预加载脚本
 * 在应用启动时直接复制QRCode库到全局环境
 */

// 直接嵌入qrcode-generator库的主要功能代码
(function() {
  console.log('正在预加载QRCode...');
  
  try {
    // 尝试直接加载库
    const fs = require('fs');
    const path = require('path');
    
    // 获取qrcode.js文件的路径
    const qrcodePath = path.join(__dirname, 'node_modules/qrcode-generator/qrcode.js');
    
    // 加载库内容
    if (fs.existsSync(qrcodePath)) {
      // 复制库内容到公共目录
      const targetPath = path.join(__dirname, 'public/qrcode.js');
      fs.copyFileSync(qrcodePath, targetPath);
      console.log('已将QRCode库复制到public目录');
      
      // 创建全局加载脚本
      const loaderContent = `
        // 自动加载QRCode库
        document.addEventListener('DOMContentLoaded', function() {
          const script = document.createElement('script');
          script.src = '/public/qrcode.js';
          document.head.appendChild(script);
          console.log('QRCode库已自动加载');
        });
      `;
      
      // 保存加载脚本
      fs.writeFileSync(path.join(__dirname, 'public/qrcode-loader.js'), loaderContent);
      console.log('已创建QRCode加载脚本');
    } else {
      console.warn('未找到QRCode库文件');
    }
  } catch (error) {
    console.error('QRCode预加载失败:', error);
  }
})(); 