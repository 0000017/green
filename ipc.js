// ipc.js
const { ipcRenderer } = require('electron');

ipcRenderer.on('serial-data', (event, data) => {
    document.getElementById('bpm').innerText = `心率: ${data} BPM`;
});

ipcRenderer.on('arousal-data', (event, data) => {
    // 将 GSR 数据发送到 renderer.js
    window.updateEmotionPoint(0.5, data/1024, 0.5);
});