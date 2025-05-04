const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const ImageShareServer = require('./server/imageShare');

// 创建并存储服务器实例的变量
let imageShareServer = null;

// 添加应用错误处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

// 创建主窗口
function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false, // 允许加载本地资源
        },
        // 设置窗口为全屏
        fullscreen: true,
        // 无边框窗口，提供更完整的全屏体验
        frame: false,
        // 设置应用图标
        icon: path.join(__dirname, 'ui/asset/App_icon.png')
    });

    // 添加页面加载错误处理
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('页面加载失败:', errorDescription);
    });

    win.loadFile('index.html');
    
    win.webContents.on('did-finish-load', () => {
        win.webContents.setZoomFactor(1.0);
        console.log('内容已放大两倍');
    });
    
    // 创建窗口后立即设置为全屏
    win.setFullScreen(true);
    
    // 注册ESC键退出全屏快捷键
    globalShortcut.register('Escape', () => {
        if (win.isFullScreen()) {
            win.setFullScreen(false);
        }
    });
    
    // 注册Ctrl+E显示/隐藏表情识别悬浮窗口快捷键
    globalShortcut.register('CommandOrControl+E', () => {
        win.webContents.executeJavaScript(`
            if (typeof window.toggleEmotionWindow === 'function') {
                window.toggleEmotionWindow();
            } else {
                console.error('表情识别窗口切换函数未定义');
            }
        `);
    });
    
    // 注册Ctrl+H显示/隐藏整个情感分析容器快捷键
    globalShortcut.register('CommandOrControl+H', () => {
        win.webContents.executeJavaScript(`
            if (typeof window.toggleEmotionContainer === 'function') {
                window.toggleEmotionContainer();
            } else {
                console.error('情感分析容器切换函数未定义');
            }
        `);
    });
    
    // 当窗口关闭时注销快捷键
    win.on('closed', () => {
        globalShortcut.unregisterAll();
    });
    
    console.log('主窗口已创建');
}

// 启动图片分享服务
function initImageShareServer() {
    try {
        // 如果服务器实例已存在，先停止
        if (imageShareServer) {
            imageShareServer.stop();
        }
        
        // 创建服务器实例
        imageShareServer = new ImageShareServer();
        
        // 启动服务器
        imageShareServer.start().then(serverURL => {
            console.log(`图片分享服务已启动: ${serverURL}`);
        }).catch(err => {
            console.error('启动图片分享服务失败:', err);
        });
        
        return true;
    } catch (error) {
        console.error('初始化图片分享服务器失败:', error);
        return false;
    }
}

// 应用初始化
app.whenReady().then(() => {
    // 初始化图片分享服务
    initImageShareServer();
    
    // 创建主窗口
    createWindow();
    
    // 禁用默认的Alt键菜单显示行为
    app.on('browser-window-created', (e, win) => {
        win.setAutoHideMenuBar(true);
        win.setMenuBarVisibility(false);
    });
});

// 应用退出清理
app.on('will-quit', () => {
    // 停止图片分享服务
    if (imageShareServer) {
        console.log('停止图片分享服务...');
        imageShareServer.stop();
        imageShareServer = null;
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// 在现有的ipcMain监听器部分添加以下代码
ipcMain.on('emotion-data', (event, data) => {
    // 你可以在这里处理接收到的表情数据
    // 例如，将其记录下来或传递给其他进程
    console.log('接收到表情数据:', data);
});

// 处理IPC请求
// 在现有的ipcMain监听器部分添加以下代码
ipcMain.on('init-image-share-server', (event) => {
    console.log('收到初始化图片分享服务器请求');
    try {
        // 如果服务器已经初始化，直接返回成功
        if (imageShareServer && imageShareServer.serverURL) {
            event.reply('image-share-server-initialized', {
                success: true,
                serverURL: imageShareServer.serverURL
            });
            return;
        }
        
        // 初始化服务器
        const result = initImageShareServer();
        
        // 等待服务器启动
        if (imageShareServer) {
            imageShareServer.start().then(serverURL => {
                console.log(`图片分享服务已启动: ${serverURL}`);
                event.reply('image-share-server-initialized', {
                    success: true,
                    serverURL: serverURL
                });
            }).catch(err => {
                console.error('启动图片分享服务失败:', err);
                event.reply('image-share-server-initialized', {
                    success: false,
                    error: err.message || '启动服务失败'
                });
            });
        } else {
            event.reply('image-share-server-initialized', {
                success: false,
                error: '创建服务器实例失败'
            });
        }
    } catch (error) {
        console.error('处理初始化请求时出错:', error);
        event.reply('image-share-server-initialized', {
            success: false,
            error: error.message || '未知错误'
        });
    }
});

// 处理图片分享请求
ipcMain.on('share-image', (event, data) => {
    console.log('收到图片分享请求');
    
    // 检查服务器是否已初始化
    if (!imageShareServer) {
        event.reply('image-shared', {
            success: false,
            error: '图片分享服务未初始化'
        });
        return;
    }
    
    try {
        // 获取图片数据和文件名
        const { imageData, filename } = data;
        
        // 检查数据是否有效
        if (!imageData || typeof imageData !== 'string') {
            throw new Error('无效的图片数据');
        }
        
        // 获取服务器实例app
        const app = imageShareServer.app;
        if (!app) {
            throw new Error('无法访问服务器实例');
        }
        
        // 处理图片数据 - 直接调用服务器的API接口
        const express = require('express');
        const bodyParser = require('body-parser');
        const fs = require('fs');
        const path = require('path');
        
        // 获取本地IP
        const localIP = imageShareServer.getLocalIP();
        const port = imageShareServer.port || 3500;
        
        // 准备保存图片数据
        const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
        // 使用自定义文件名或生成默认文件名
        const fileName = filename || `artwork-${Date.now()}.png`;
        const filePath = path.join(imageShareServer.shareFolderPath, fileName);
        
        // 确保目录存在
        if (!fs.existsSync(imageShareServer.shareFolderPath)) {
            fs.mkdirSync(imageShareServer.shareFolderPath, { recursive: true });
        }
        
        // 写入文件
        fs.writeFileSync(filePath, base64Data, 'base64');
        
        // 创建分享URL
        const shareURL = `http://${localIP}:${port}/download/${fileName}`;
        
        // 返回结果给渲染进程
        event.reply('image-shared', {
            success: true,
            shareURL: shareURL,
            fileName: fileName,
            expiresIn: '10分钟'
        });
        
        console.log(`图片分享成功: ${fileName}`);
    } catch (error) {
        console.error('处理图片分享请求时出错:', error);
        event.reply('image-shared', {
            success: false,
            error: error.message || '分享失败'
        });
    }
});
