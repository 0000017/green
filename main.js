const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

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
        frame: false
    });

    win.loadFile('index.html');
    
    // 开发时可以打开开发者工具
    // win.webContents.openDevTools();
    
    // 创建窗口后立即设置为全屏
    win.setFullScreen(true);
    
    // 注册ESC键退出全屏快捷键
    globalShortcut.register('Escape', () => {
        if (win.isFullScreen()) {
            win.setFullScreen(false);
        }
    });
    
    // 当窗口关闭时注销快捷键
    win.on('closed', () => {
        globalShortcut.unregisterAll();
    });
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
