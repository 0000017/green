const { app, BrowserWindow } = require('electron');
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
        // 设置窗口为全屏，可根据需要调整
        // fullscreen: true,
        // 无边框窗口，可根据需要开启
        // frame: false
    });

    win.loadFile('index.html');
    
    // 开发时可以打开开发者工具
    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();
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
