const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');

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
    
    // 当窗口关闭时注销快捷键
    win.on('closed', () => {
        globalShortcut.unregisterAll();
    });
    
    console.log('主窗口已创建');
}

app.whenReady().then(() => {
    createWindow();
    
    // 禁用默认的Alt键菜单显示行为
    app.on('browser-window-created', (e, win) => {
        win.setAutoHideMenuBar(true);
        win.setMenuBarVisibility(false);
    });
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
