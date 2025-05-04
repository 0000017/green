const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { networkInterfaces } = require('os');

// 创建图片分享服务器
class ImageShareServer {
  constructor() {
    this.app = express();
    this.port = 3500; // 使用不同于主应用的端口
    this.shareFolderPath = path.join(__dirname, '../temp_shares');
    this.serverURL = '';
    
    // 初始化
    this.init();
  }
  
  init() {
    // 确保临时存储目录存在
    if (!fs.existsSync(this.shareFolderPath)) {
      fs.mkdirSync(this.shareFolderPath, { recursive: true });
      console.log(`创建临时分享目录: ${this.shareFolderPath}`);
    }
    
    // 设置中间件
    this.app.use(bodyParser.json({ limit: '50mb' }));
    this.app.use('/shared', express.static(this.shareFolderPath));
    
    // 设置路由
    this.setupRoutes();
    
    // 启动定时清理任务
    this.setupCleanupTask();
  }
  
  // 获取本地IP地址
  getLocalIP() {
    const interfaces = networkInterfaces();
    let ipAddress = 'localhost';
    
    // 查找有效的非内部IPv4地址
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // 跳过内部网络地址和非IPv4地址
        if (iface.family === 'IPv4' && !iface.internal) {
          ipAddress = iface.address;
          return ipAddress;
        }
      }
    }
    
    console.log(`使用本地IP地址: ${ipAddress}`);
    return ipAddress;
  }
  
  // 配置API路由
  setupRoutes() {
    // 处理图片分享请求
    this.app.post('/api/share-image', (req, res) => {
      try {
        const { imageData } = req.body;
        
        // 从base64数据创建图片文件
        const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
        const fileName = `artwork-${Date.now()}.png`;
        const filePath = path.join(this.shareFolderPath, fileName);
        
        fs.writeFileSync(filePath, base64Data, 'base64');
        
        // 创建图片访问URL
        const shareURL = `http://${this.getLocalIP()}:${this.port}/download/${fileName}`;
        
        res.json({
          success: true,
          shareURL,
          fileName,
          expiresIn: '10分钟'
        });
        
        console.log(`图片分享成功: ${fileName}`);
      } catch (err) {
        console.error('分享图片失败:', err);
        res.status(500).json({
          success: false,
          message: err.message
        });
      }
    });
    
    // 提供下载页面
    this.app.get('/download/:fileName', (req, res) => {
      const { fileName } = req.params;
      const filePath = path.join(this.shareFolderPath, fileName);
      
      if (fs.existsSync(filePath)) {
        res.sendFile(path.join(__dirname, '../server/download.html'));
      } else {
        res.status(404).send('图片不存在或已过期');
      }
    });
  }
  
  // 设置定期清理过期图片的任务
  setupCleanupTask() {
    // 每5分钟清理一次过期的图片（超过10分钟的图片）
    setInterval(() => {
      try {
        if (fs.existsSync(this.shareFolderPath)) {
          const files = fs.readdirSync(this.shareFolderPath);
          const now = Date.now();
          
          files.forEach(file => {
            const filePath = path.join(this.shareFolderPath, file);
            const stats = fs.statSync(filePath);
            const fileAge = (now - stats.ctimeMs) / 1000 / 60; // 分钟
            
            if (fileAge > 10) {
              fs.unlinkSync(filePath);
              console.log(`已删除过期图片: ${file}`);
            }
          });
        }
      } catch (error) {
        console.error('清理过期图片时出错:', error);
      }
    }, 5 * 60 * 1000);
  }
  
  // 启动服务器
  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        this.serverURL = `http://${this.getLocalIP()}:${this.port}`;
        console.log(`图片分享服务器运行在 ${this.serverURL}`);
        resolve(this.serverURL);
      });
    });
  }
  
  // 停止服务器
  stop() {
    if (this.server) {
      this.server.close();
      console.log('图片分享服务器已停止');
    }
  }
}

module.exports = ImageShareServer; 