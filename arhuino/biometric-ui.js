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
        this.connected = false;
        this.dataHistory = {
            bpm: [],
            ibi: [],
            rmssd: [],
            gsr: []
        };
        this.historyLimit = 30; // 保存最近30个数据点
        this.defaultPort = 'COM5'; // 默认使用COM5端口
        
        // 缓存DOM引用以提高性能
        this.domElements = {};
        this.charts = {};
    }

    // 初始化UI
    async init(containerSelector = '#emotion-panel') {
        try {
            console.log('初始化生物传感器UI...', containerSelector);
            
            // 尝试获取容器元素
            this.container = document.querySelector(containerSelector);
            console.log('容器元素查找结果:', this.container);
            
            if (!this.container) {
                console.error(`找不到容器元素: ${containerSelector}，将等待500ms后重试`);
                // 尝试等待容器元素渲染完成
                await new Promise(resolve => setTimeout(resolve, 500));
                this.container = document.querySelector(containerSelector);
                console.log('重试查找容器元素结果:', this.container);
            }
            
            // 即使找不到特定容器也创建UI，但放在body中
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
        try {
            console.log('开始创建生物传感器UI...');
            
            // 添加必要的CSS样式
            this.addStyles();
            
            // 查找情感窗口容器
            const emotionWindow = document.querySelector('#emotion-floating-window');
            const emotionContent = document.querySelector('.floating-content');
            console.log('查找情感窗口结果:', emotionWindow);
            console.log('查找情感内容区域结果:', emotionContent);
            
            // 创建生物传感器面板
            const biometricPanel = document.createElement('div');
            biometricPanel.id = 'biometric-panel';
            biometricPanel.className = 'biometric-panel';
            
            // 创建连接状态显示
            this.statusElement = document.createElement('div');
            this.statusElement.id = 'biometric-status';
            this.statusElement.className = 'biometric-status';
            this.statusElement.textContent = '未连接';
            
            // 隐藏端口选择器但保留功能
            this.portSelector = document.createElement('select');
            this.portSelector.id = 'port-selector';
            this.portSelector.className = 'port-selector';
            this.portSelector.style.display = 'none';
            
            // 添加默认端口选项
            const defaultOption = document.createElement('option');
            defaultOption.value = this.defaultPort;
            defaultOption.textContent = this.defaultPort;
            defaultOption.selected = true;
            this.portSelector.appendChild(defaultOption);
            
            // 创建数据显示区
            this.valuesContainer = document.createElement('div');
            this.valuesContainer.id = 'biometric-values';
            this.valuesContainer.className = 'biometric-values';
            
            // 创建度量数据元素 - 垂直排列
            const metricsToDisplay = [
                { id: 'bpm', label: '心率', unit: 'BPM', color: '#4fd1c5' },
                { id: 'ibi', label: '心跳间隔', unit: 'ms', color: '#63b3ed' },
                { id: 'rmssd', label: 'RMSSD', unit: 'ms', color: '#9f7aea' },
                { id: 'gsr', label: 'GSR', unit: '', color: '#f6ad55' }
            ];
            
            metricsToDisplay.forEach(metric => {
                const metricElement = document.createElement('div');
                metricElement.className = 'biometric-metric';
                
                // 创建指标数据和标签部分
                const metricInfo = document.createElement('div');
                metricInfo.className = 'metric-info';
                
                const labelElement = document.createElement('span');
                labelElement.className = 'metric-label';
                labelElement.textContent = metric.label;
                
                const valueElement = document.createElement('span');
                valueElement.id = `biometric-${metric.id}`;
                valueElement.className = 'metric-value';
                valueElement.textContent = '0';
                valueElement.style.color = metric.color;
                
                const unitElement = document.createElement('span');
                unitElement.className = 'metric-unit';
                unitElement.textContent = metric.unit;
                
                metricInfo.appendChild(labelElement);
                metricInfo.appendChild(valueElement);
                metricInfo.appendChild(unitElement);
                
                // 创建图表容器
                const chartContainer = document.createElement('div');
                chartContainer.id = `chart-${metric.id}`;
                chartContainer.className = 'metric-chart';
                
                // 创建SVG元素用于绘制折线图
                const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svgElement.setAttribute('width', '100%');
                svgElement.setAttribute('height', '100%');
                svgElement.setAttribute('viewBox', '0 0 100 30');
                svgElement.setAttribute('preserveAspectRatio', 'none');
                
                // 创建折线图的路径
                const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                pathElement.setAttribute('stroke', metric.color);
                pathElement.setAttribute('stroke-width', '1');
                pathElement.setAttribute('fill', 'none');
                
                svgElement.appendChild(pathElement);
                chartContainer.appendChild(svgElement);
                
                // 将元素添加到指标容器
                metricElement.appendChild(metricInfo);
                metricElement.appendChild(chartContainer);
                
                this.valuesContainer.appendChild(metricElement);
                
                // 缓存DOM引用
                this.domElements[metric.id] = valueElement;
                this.charts[metric.id] = pathElement;
            });
            
            // 将元素添加到面板
            biometricPanel.appendChild(this.statusElement);
            biometricPanel.appendChild(this.portSelector);
            biometricPanel.appendChild(this.valuesContainer);
            
            // 创建隐藏的连接按钮 (自动连接模式)
            this.connectButton = document.createElement('button');
            this.connectButton.id = 'connect-button';
            this.connectButton.className = 'connect-button';
            this.connectButton.textContent = '连接';
            this.connectButton.style.display = 'none';
            biometricPanel.appendChild(this.connectButton);
            
            console.log('UI元素创建完成，尝试添加到DOM...');
            
            // 决定面板添加位置
            if (emotionWindow) {
                // 将面板添加到情感窗口之后
                emotionWindow.parentNode.insertBefore(biometricPanel, emotionWindow.nextSibling);
                console.log('面板已添加到情感窗口的后面');
            } else if (emotionContent) {
                // 添加到情感内容区域内部
                emotionContent.appendChild(biometricPanel);
                console.log('面板已添加到情感内容区域内部');
            } else if (this.container) {
                // 添加到容器附近
                if (this.container.parentNode) {
                    this.container.parentNode.insertBefore(biometricPanel, this.container.nextSibling);
                    console.log('面板已添加到容器的后面');
                } else {
                    this.container.appendChild(biometricPanel);
                    console.log('面板已添加到容器内部');
                }
            } else {
                // 如果都找不到，直接添加到body
                document.body.appendChild(biometricPanel);
                console.log('找不到合适位置，面板已添加到body');
            }
            
            // 设置面板样式以匹配情感窗口宽度
            if (emotionWindow) {
                const computedStyle = window.getComputedStyle(emotionWindow);
                const width = computedStyle.width;
                console.log('情感窗口宽度:', width);
                biometricPanel.style.width = width;
                biometricPanel.style.marginTop = '10px';
            }
            
            console.log('生物传感器UI创建完成');
        } catch (err) {
            console.error('创建生物传感器UI时出错:', err);
        }
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
                    this.domElements[key].textContent = '0';
                }
            });
            
            // 清空历史数据
            Object.keys(this.dataHistory).forEach(key => {
                this.dataHistory[key] = [];
            });
            
            // 重置图表
            Object.keys(this.charts).forEach(key => {
                if (this.charts[key]) {
                    this.charts[key].setAttribute('d', '');
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
        if (!this.connected || !data) return;
        
        try {
            // 确保数据有效
            const bpm = data.bpm !== undefined && !isNaN(data.bpm) ? Math.round(data.bpm) : null;
            const ibi = data.ibi !== undefined && !isNaN(data.ibi) ? Math.round(data.ibi) : null;
            const rmssd = data.rmssd !== undefined && !isNaN(data.rmssd) ? parseFloat(data.rmssd.toFixed(1)) : null;
            const gsrValue = data.gsrValue !== undefined ? data.gsrValue : null;
            
            // 更新数据历史
            if (bpm !== null) this.updateDataHistory('bpm', bpm);
            if (ibi !== null) this.updateDataHistory('ibi', ibi);
            if (rmssd !== null) this.updateDataHistory('rmssd', rmssd);
            if (gsrValue !== null) this.updateDataHistory('gsr', gsrValue);
            
            // 更新显示
            if (bpm !== null) this.updateMetric('bpm', bpm);
            if (ibi !== null) this.updateMetric('ibi', ibi);
            if (rmssd !== null) this.updateMetric('rmssd', rmssd.toFixed(1));
            if (gsrValue !== null) this.updateMetric('gsr', gsrValue);
            
            // 更新图表
            this.updateCharts();
        } catch (err) {
            console.error('更新生物传感器UI时出错:', err);
        }
    }
    
    // 更新数据历史
    updateDataHistory(metricId, value) {
        // 确保值是有效数值
        if (this.dataHistory[metricId] && !isNaN(value) && value !== null && value !== undefined) {
            this.dataHistory[metricId].push(value);
            
            // 限制历史记录长度
            if (this.dataHistory[metricId].length > this.historyLimit) {
                this.dataHistory[metricId].shift();
            }
        }
    }
    
    // 更新指标显示
    updateMetric(metricId, value) {
        if (this.domElements[metricId]) {
            this.domElements[metricId].textContent = value;
        }
    }
    
    // 更新图表
    updateCharts() {
        Object.keys(this.charts).forEach(metricId => {
            if (this.charts[metricId] && this.dataHistory[metricId].length > 0) {
                const data = this.dataHistory[metricId];
                const path = this.createSVGPath(data);
                this.charts[metricId].setAttribute('d', path);
            }
        });
    }
    
    // 创建SVG路径
    createSVGPath(data) {
        if (!data || data.length === 0) return '';
        
        // 找出最大值和最小值来缩放数据
        const validData = data.filter(value => !isNaN(value) && value !== null && value !== undefined);
        
        // 如果没有有效数据，返回空路径
        if (validData.length === 0) return '';
        
        const min = Math.min(...validData);
        const max = Math.max(...validData);
        const range = max - min || 1; // 避免除以零
        
        // 创建路径数据，确保跳过无效值
        let pathPoints = [];
        let moveCommand = true; // 是否需要使用M命令（移动到）而不是L命令（连线到）
        
        validData.forEach((value, index) => {
            const x = (index / (validData.length - 1)) * 100;
            const y = 30 - ((value - min) / range) * 25; // 将数据缩放到5-30范围内，并反转Y轴
            
            // 确保坐标是有效数字
            if (!isNaN(x) && !isNaN(y)) {
                if (moveCommand) {
                    pathPoints.push(`M${x},${y}`);
                    moveCommand = false;
                } else {
                    pathPoints.push(`L${x},${y}`);
                }
            } else {
                // 如果遇到无效坐标，下一个有效点需要使用M命令
                moveCommand = true;
            }
        });
        
        return pathPoints.join(' ');
    }

    // 添加样式
    addStyles() {
        try {
            console.log('添加生物传感器UI样式...');
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                .biometric-panel {
                    background-color: #1a1a1a;
                    border-radius: 8px;
                    padding: 10px;
                    margin-top: 10px;
                    font-family: Arial, sans-serif;
                    color: #e0e0e0;
                    width: 100%;
                    box-sizing: border-box;
                    border: 2px solid #333; /* 添加边框增强可见性 */
                    z-index: 1000; /* 确保UI在顶层 */
                }
                
                .biometric-status {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    color: #ccc;
                    background-color: #333;
                    margin-bottom: 8px;
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
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .biometric-metric {
                    background-color: #222;
                    padding: 8px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    height: 30px;
                }
                
                .metric-info {
                    display: flex;
                    align-items: baseline;
                    width: 100px;
                    flex-shrink: 0;
                }
                
                .metric-label {
                    font-size: 11px;
                    color: #999;
                    margin-right: 5px;
                    width: 60px;
                }
                
                .metric-value {
                    font-size: 16px;
                    font-weight: bold;
                    margin-right: 3px;
                }
                
                .metric-unit {
                    font-size: 10px;
                    color: #777;
                }
                
                .metric-chart {
                    flex-grow: 1;
                    height: 30px;
                    background-color: #1a1a1a;
                    border-radius: 3px;
                    overflow: hidden;
                }
                
                .connect-button {
                    display: none;
                }
            `;
            
            document.head.appendChild(styleElement);
            console.log('生物传感器UI样式已添加');
        } catch (err) {
            console.error('添加生物传感器UI样式时出错:', err);
        }
    }
}

// 创建并导出单例
const biometricUI = new BiometricUI();
module.exports = biometricUI; 