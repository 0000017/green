/**
 * 二维码辅助工具
 * 提供简化的二维码生成接口
 */

// 全局二维码辅助对象
window.QRHelper = {
  /**
   * 创建二维码
   * @param {string} elementId - 容器元素ID
   * @param {string} text - 二维码内容
   */
  generate: function(elementId, text) {
    console.log('QRHelper: 开始生成二维码');
    
    // 获取容器
    const container = document.getElementById(elementId);
    if (!container) {
      console.error('QRHelper: 未找到容器元素', elementId);
      return;
    }
    
    // 清空容器
    container.innerHTML = '';
    
    try {
      // 检查QRCode库是否可用
      if (typeof QRCode === 'function') {
        // 使用QRCode库生成二维码
        new QRCode(container, {
          text: text,
          width: 256,
          height: 256,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
        console.log('QRHelper: 二维码生成成功');
      } else {
        // QRCode不可用，显示文本链接
        console.warn('QRHelper: QRCode库不可用，显示文本链接');
        container.innerHTML = `
          <div style="padding: 20px; text-align: center;">
            <p>无法生成二维码，请使用链接：</p>
            <a href="${text}" target="_blank" style="word-break: break-all;">${text}</a>
          </div>
        `;
      }
    } catch (error) {
      // 处理错误
      console.error('QRHelper: 生成二维码时出错', error);
      container.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <p>生成二维码失败: ${error.message}</p>
          <a href="${text}" target="_blank" style="word-break: break-all;">${text}</a>
        </div>
      `;
    }
  }
}; 