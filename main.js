const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const SerialPort = require('serialport'); // 确保导入SerialPort

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html'); 
 

  const port = new SerialPort('COM5', { baudRate: 9600 }); // 修改为你的串口

  port.on('data', (data) => {
    mainWindow.webContents.send('serial-data', data.toString());
  });
}

app.whenReady().then(createWindow);

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
