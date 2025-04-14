// biometric-ui.js
// 用于在情绪识别悬浮窗口中显示生物传感器数据的UI模块

const biometricSensors = require('./biometric-data');

class BiometricUI {
    constructor() {
        this.container = null;
        this.portSelector = null;
        this.connectButton = null;
        this.statusElement = null;
        this.valuesContainer = null;
        this.chartContainer = null;
        this.chart = null;
        this.connected = false;
        this.dataPoints = [];
        this.defaultPort = 'COM5'; // 默认使用COM5端口
        
        // 缓存DOM引用以提高性能
        this.domElements = {};
    }

    // 初始化UI
    async init(containerSelector = '#emotion-panel') {
        try {
            console.log('初始化生物传感器UI...');
            
            // 获取容器元素
            this.container = document.querySelector(containerSelector);
            if (!this.container) {
                throw new Error(`找不到容器元素: ${containerSelector}`);
            }
            
            // 创建UI元素
            await this.createUI();
            
            // 绑定事件监听器
            this.bindEvents();
            
            // 自动连接到默认端口(COM5)
            setTimeout(() => {
                this.autoConnectToDefaultPort();
            }, 1500);
            
            console.log('生物传感器UI初始化完成');
            return true;
        } catch (err) {
            console.error('初始化生物传感器UI时出错:', err);
            return false;
        }
    }

    // 创建UI元素
    async createUI() {
        // 添加必要的CSS样式
        this.addStyles();
        
        // 创建生物传感器面板
        const biometricPanel = document.createElement('div');
        biometricPanel.id = 'biometric-panel';
        biometricPanel.className = 'biometric-panel';
        
        // 创建连接控制区
        const connectionControls = document.createElement('div');
        connectionControls.className = 'connection-controls';
        
        // 创建端口选择器 (隐藏, 但保留功能以防需要)
        this.portSelector = document.createElement('select');
        this.portSelector.id = 'port-selector';
        this.portSelector.className = 'port-selector';
        this.portSelector.style.display = 'none'; // 隐藏选择器
        
        // 添加默认端口选项
        const defaultOption = document.createElement('option');
        defaultOption.value = this.defaultPort;
        defaultOption.textContent = this.defaultPort;
        defaultOption.selected = true;
        this.portSelector.appendChild(defaultOption);
        
        // 创建连接状态显示
        this.statusElement = document.createElement('div');
        this.statusElement.id = 'biometric-status';
        this.statusElement.className = 'biometric-status';
        this.statusElement.textContent = '未连接';
        
        // 创建连接按钮
        this.connectButton = document.createElement('button');
        this.connectButton.id = 'connect-button';
        this.connectButton.className = 'connect-button';
        this.connectButton.textContent = '断开连接';
        this.connectButton.style.display = 'none'; // 默认隐藏按钮，采用自动连接
        
        // 将控制元素添加到连接控制区
        connectionControls.appendChild(this.portSelector);
        connectionControls.appendChild(this.connectButton);
        connectionControls.appendChild(this.statusElement);
        
        // 创建数据显示区
        this.valuesContainer = document.createElement('div');
        this.valuesContainer.id = 'biometric-values';
        this.valuesContainer.className = 'biometric-values';
        
        // 创建度量数据元素
        const metricsToDisplay = [
            { id: 'bpm', label: '心率', unit: 'BPM' },
            { id: 'ibi', label: '心跳间隔', unit: 'ms' },
            { id: 'rmssd', label: 'RMSSD', unit: 'ms' },
            { id: 'gsr', label: 'GSR', unit: '' }
        ];
        
        metricsToDisplay.forEach(metric => {
            const metricElement = document.createElement('div');
            metricElement.className = 'biometric-metric';
            
            const labelElement = document.createElement('span');
            labelElement.className = 'metric-label';
            labelElement.textContent = metric.label;
            
            const valueElement = document.createElement('span');
            valueElement.id = `biometric-${metric.id}`;
            valueElement.className = 'metric-value';
            valueElement.textContent = '--';
            
            const unitElement = document.createElement('span');
            unitElement.className = 'metric-unit';
            unitElement.textContent = metric.unit;
            
            metricElement.appendChild(labelElement);
            metricElement.appendChild(valueElement);
            metricElement.appendChild(unitElement);
            
            this.valuesContainer.appendChild(metricElement);
            
            // 缓存DOM引用
            this.domElements[metric.id] = valueElement;
        });
        
        // 创建融合指标显示
        const fusedMetricsElement = document.createElement('div');
        fusedMetricsElement.className = 'fused-metrics';
        
        // 创建效价指标显示
        const valenceElement = document.createElement('div');
        valenceElement.className = 'fused-metric';
        
        const valenceLabel = document.createElement('span');
        valenceLabel.className = 'metric-label';
        valenceLabel.textContent = '效价';
        
        const valenceValue = document.createElement('span');
        valenceValue.id = 'biometric-valence';
        valenceValue.className = 'metric-value';
        valenceValue.textContent = '0';
        
        valenceElement.appendChild(valenceLabel);
        valenceElement.appendChild(valenceValue);
        
        // 创建唤醒度指标显示
        const arousalElement = document.createElement('div');
        arousalElement.className = 'fused-metric';
        
        const arousalLabel = document.createElement('span');
        arousalLabel.className = 'metric-label';
        arousalLabel.textContent = '唤醒度';
        
        const arousalValue = document.createElement('span');
        arousalValue.id = 'biometric-arousal';
        arousalValue.className = 'metric-value';
        arousalValue.textContent = '0';
        
        arousalElement.appendChild(arousalLabel);
        arousalElement.appendChild(arousalValue);
        
        fusedMetricsElement.appendChild(valenceElement);
        fusedMetricsElement.appendChild(arousalElement);
        
        // 缓存DOM引用
        this.domElements['valence'] = valenceValue;
        this.domElements['arousal'] = arousalValue;
        
        // 将元素添加到面板
        biometricPanel.appendChild(connectionControls);
        biometricPanel.appendChild(this.valuesContainer);
        biometricPanel.appendChild(fusedMetricsElement);
        
        // 将面板添加到容器
        this.container.appendChild(biometricPanel);
    }

    // 绑定事件监听器
    bindEvents() {
        // 连接按钮点击事件
        this.connectButton.addEventListener('click', () => {
            if (this.connected) {
                this.disconnect();
            } else {
                this.connect();
            }
        });
        
        // 监听生物传感器数据更新事件
        document.addEventListener('biometricDataUpdate', (event) => {
            this.updateUI(event.detail);
        });
        
        // 监听错误事件
        document.addEventListener('biometricError', (event) => {
            console.error('生物传感器错误:', event.detail.error);
            this.showStatus('错误: ' + event.detail.error, 'error');
            
            // 错误后自动尝试重新连接
            setTimeout(() => {
                if (!this.connected) {
                    this.autoConnectToDefaultPort();
                }
            }, 3000);
        });
        
        // 监听断开连接事件
        document.addEventListener('biometricDisconnect', () => {
            this.updateConnectionUI(false);
            
            // 断开连接后自动尝试重新连接
            setTimeout(() => {
                if (!this.connected) {
                    this.autoConnectToDefaultPort();
                }
            }, 3000);
        });
    }

    // 自动连接到默认端口
    async autoConnectToDefaultPort() {
        try {
            if (this.connected) return;
            
            this.showStatus('正在连接到' + this.defaultPort + '...', 'connecting');
            
            const connected = await biometricSensors.connect(this.defaultPort);
            
            if (connected) {
                this.connected = true;
                this.updateConnectionUI(true);
                this.showStatus('已连接到' + this.defaultPort, 'connected');
            } else {
                this.showStatus('连接失败', 'error');
                
                // 连接失败后稍后重试
                setTimeout(() => {
                    if (!this.connected) {
                        this.autoConnectToDefaultPort();
                    }
                }, 5000);
            }
        } catch (err) {
            console.error('连接到Arduino时出错:', err);
            this.showStatus('连接错误', 'error');
            
            // 错误后稍后重试
            setTimeout(() => {
                if (!this.connected) {
                    this.autoConnectToDefaultPort();
                }
            }, 5000);
        }
    }

    // 手动连接到选中端口
    async connect() {
        try {
            const selectedPort = this.portSelector.value;
            
            if (!selectedPort) {
                this.showStatus('请选择一个端口', 'warning');
                return;
            }
            
            this.showStatus('正在连接...', 'connecting');
            this.connectButton.disabled = true;
            
            const connected = await biometricSensors.connect(selectedPort);
            
            if (connected) {
                this.connected = true;
                this.updateConnectionUI(true);
                this.showStatus('已连接', 'connected');
            } else {
                this.showStatus('连接失败', 'error');
            }
        } catch (err) {
            console.error('连接到Arduino时出错:', err);
            this.showStatus('连接错误: ' + err.message, 'error');
        } finally {
            this.connectButton.disabled = false;
        }
    }

    // 断开连接
    async disconnect() {
        try {
            this.showStatus('正在断开连接...', 'connecting');
            this.connectButton.disabled = true;
            
            await biometricSensors.disconnect();
            
            this.connected = false;
            this.updateConnectionUI(false);
            this.showStatus('已断开连接', 'disconnected');
        } catch (err) {
            console.error('断开连接时出错:', err);
            this.showStatus('断开连接错误: ' + err.message, 'error');
        } finally {
            this.connectButton.disabled = false;
        }
    }

    // 更新连接状态UI
    updateConnectionUI(connected) {
        this.connected = connected;
        
        if (connected) {
            this.connectButton.textContent = '断开连接';
            this.connectButton.classList.add('connected');
            this.statusElement.classList.add('connected');
        } else {
            this.connectButton.textContent = '连接';
            this.connectButton.classList.remove('connected');
            this.statusElement.classList.remove('connected');
            
            // 重置数据显示
            Object.keys(this.domElements).forEach(key => {
                if (this.domElements[key]) {
                    this.domElements[key].textContent = '--';
                }
            });
        }
    }

    // 显示状态信息
    showStatus(message, type = 'info') {
        if (this.statusElement) {
            this.statusElement.textContent = message;
            
            // 移除所有状态类
            this.statusElement.classList.remove('info', 'error', 'warning', 'connecting', 'connected', 'disconnected');
            
            // 添加对应的状态类
            this.statusElement.classList.add(type);
        }
    }

    // 更新UI显示数据
    updateUI(data) {
        if (!this.connected) return;
        
        // 更新基本数据显示
        if (this.domElements.bpm) {
            this.domElements.bpm.textContent = Math.round(data.bpm);
        }
        
        if (this.domElements.ibi) {
            this.domElements.ibi.textContent = Math.round(data.ibi);
        }
        
        if (this.domElements.rmssd) {
            this.domElements.rmssd.textContent = data.rmssd.toFixed(1);
        }
        
        if (this.domElements.gsr) {
            this.domElements.gsr.textContent = data.gsrValue;
        }
        
        // 获取计算的情感指标
        const emotionMetrics = biometricSensors.getEmotionMetrics();
        
        // 更新融合指标
        if (this.domElements.valence) {
            this.domElements.valence.textContent = Math.round(emotionMetrics.valenceFromHRV);
            
            // 根据值设置颜色
            const hue = 120 + (emotionMetrics.valenceFromHRV / 100) * 120;
            this.domElements.valence.style.color = `hsl(${hue}, 80%, 50%)`;
        }
        
        if (this.domElements.arousal) {
            this.domElements.arousal.textContent = Math.round(emotionMetrics.arousal);
            
            // 根据值设置颜色
            const brightness = 40 + (emotionMetrics.arousal / 100) * 40;
            this.domElements.arousal.style.color = `hsl(0, 80%, ${brightness}%)`;
        }
    }

    // 添加样式
    addStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .biometric-panel {
                background-color: #1a1a1a;
                border-radius: 8px;
                padding: 10px;
                margin-top: 10px;
                font-family: Arial, sans-serif;
                color: #e0e0e0;
            }
            
            .connection-controls {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                gap: 8px;
            }
            
            .port-selector {
                flex: 1;
                background-color: #333;
                color: #e0e0e0;
                border: 1px solid #555;
                border-radius: 4px;
                padding: 4px;
                font-size: 12px;
            }
            
            .connect-button {
                background-color: #444;
                color: #e0e0e0;
                border: 1px solid #555;
                border-radius: 4px;
                padding: 4px 8px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s;
            }
            
            .connect-button:hover {
                background-color: #555;
            }
            
            .connect-button.connected {
                background-color: #33665e;
            }
            
            .connect-button.connected:hover {
                background-color: #407d73;
            }
            
            .biometric-status {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                color: #ccc;
                background-color: #333;
                width: 100%;
                text-align: center;
            }
            
            .biometric-status.connected {
                background-color: #2b593f;
                color: #a3ffd7;
            }
            
            .biometric-status.error {
                background-color: #592b2b;
                color: #ffa3a3;
            }
            
            .biometric-values {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .biometric-metric {
                background-color: #222;
                padding: 6px;
                border-radius: 4px;
                display: flex;
                flex-direction: column;
            }
            
            .metric-label {
                font-size: 10px;
                color: #999;
                margin-bottom: 2px;
            }
            
            .metric-value {
                font-size: 18px;
                font-weight: bold;
                color: #4fd1c5;
            }
            
            .metric-unit {
                font-size: 10px;
                color: #777;
                margin-left: 2px;
            }
            
            .fused-metrics {
                display: flex;
                gap: 8px;
            }
            
            .fused-metric {
                flex: 1;
                background-color: #222;
                padding: 6px;
                border-radius: 4px;
                display: flex;
                flex-direction: column;
            }
        `;
        
        document.head.appendChild(styleElement);
    }
}

// 创建并导出单例
const biometricUI = new BiometricUI();
module.exports = biometricUI; 