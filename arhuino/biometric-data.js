// biometric-data.js
// 用于处理Arduino生物传感器数据的模块

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

class BiometricSensors {
    constructor() {
        this.port = null;
        this.parser = null;
        this.connected = false;
        this.portPath = '';
        this.dataListeners = [];
        this.lastData = {
            gsrValue: 0,
            bpm: 0,
            ibi: 600,
            rmssd: 0,
            hrvNorm: 0.5,
            ppgSlope: 0,
            ppgSlopeNorm: 0.5,
            signal: 0,
            timestamp: Date.now()
        };
    }

    // 列出可用串口
    async listPorts() {
        try {
            const ports = await SerialPort.list();
            return ports;
        } catch (err) {
            console.error('获取串口列表失败:', err);
            return [];
        }
    }

    // 连接到Arduino
    async connect(portPath, baudRate = 115200) {
        try {
            if (this.connected) {
                await this.disconnect();
            }

            this.portPath = portPath;
            this.port = new SerialPort({
                path: portPath,
                baudRate: baudRate,
                autoOpen: false
            });

            // 创建解析器，按行解析数据
            this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

            // 打开连接
            return new Promise((resolve, reject) => {
                this.port.open((err) => {
                    if (err) {
                        console.error('连接Arduino失败:', err.message);
                        reject(err);
                        return;
                    }

                    // 设置数据处理回调
                    this.parser.on('data', (data) => this.handleData(data));

                    // 设置错误处理
                    this.port.on('error', (err) => {
                        console.error('串口错误:', err.message);
                        this.notifyError(err);
                    });

                    // 设置关闭处理
                    this.port.on('close', () => {
                        console.log('串口连接已关闭');
                        this.connected = false;
                        this.notifyDisconnect();
                    });

                    this.connected = true;
                    console.log('成功连接到Arduino:', portPath);
                    resolve(true);
                });
            });
        } catch (err) {
            console.error('连接Arduino时出错:', err);
            throw err;
        }
    }

    // 断开连接
    async disconnect() {
        return new Promise((resolve) => {
            if (!this.connected || !this.port) {
                resolve(true);
                return;
            }

            this.port.close((err) => {
                if (err) {
                    console.error('断开连接失败:', err);
                }
                this.connected = false;
                this.port = null;
                this.parser = null;
                resolve(true);
            });
        });
    }

    // 处理接收到的数据
    handleData(data) {
        try {
            // 跳过标题行
            if (data.includes('GSR,BPM')) return;

            // 解析CSV格式数据
            const values = data.split(',').map(val => parseFloat(val.trim()));
            
            if (values.length >= 8) {
                this.lastData = {
                    gsrValue: values[0],
                    bpm: values[1] || 0,
                    ibi: values[2] || 600,
                    rmssd: values[3] || 0,
                    hrvNorm: values[4] || 0.5,
                    ppgSlope: values[5] || 0,
                    ppgSlopeNorm: values[6] || 0.5,
                    signal: values[7] || 0,
                    timestamp: Date.now()
                };

                // 通知所有监听器
                this.notifyListeners(this.lastData);
                
                // 触发自定义事件，方便页面中的其他模块使用
                this.dispatchBiometricEvent();
            }
        } catch (err) {
            console.error('解析数据错误:', err, 'Raw data:', data);
        }
    }

    // 添加数据监听器
    addDataListener(callback) {
        if (typeof callback === 'function') {
            this.dataListeners.push(callback);
            return true;
        }
        return false;
    }

    // 移除数据监听器
    removeDataListener(callback) {
        const index = this.dataListeners.indexOf(callback);
        if (index !== -1) {
            this.dataListeners.splice(index, 1);
            return true;
        }
        return false;
    }

    // 通知所有监听器有新数据
    notifyListeners(data) {
        this.dataListeners.forEach(listener => {
            try {
                listener(data);
            } catch (err) {
                console.error('数据监听器执行错误:', err);
            }
        });
    }

    // 通知错误
    notifyError(error) {
        // 创建自定义事件
        const event = new CustomEvent('biometricError', {
            detail: { error: error.message || '未知错误' }
        });
        document.dispatchEvent(event);
    }

    // 通知断开连接
    notifyDisconnect() {
        // 创建自定义事件
        const event = new CustomEvent('biometricDisconnect', {
            detail: { port: this.portPath }
        });
        document.dispatchEvent(event);
    }

    // 发送生物传感器数据事件
    dispatchBiometricEvent() {
        // 创建自定义事件
        const event = new CustomEvent('biometricDataUpdate', {
            detail: this.lastData
        });
        document.dispatchEvent(event);
    }

    // 获取最新数据
    getLatestData() {
        return this.lastData;
    }

    // 是否已连接
    isConnected() {
        return this.connected;
    }

    // 获取计算的情感相关指标
    getEmotionMetrics() {
        const { hrvNorm, bpm, ppgSlopeNorm } = this.lastData;
        
        // 根据多模态数据的三维情感模型文档计算指标
        // X轴（效价）: HRV归一化值映射到-100~+100
        const valenceFromHRV = (hrvNorm * 200) - 100;
        
        // Y轴（唤醒度）: BPM和PPG斜率
        // 将BPM归一化 (假设60-120范围)
        const bpmNorm = Math.min(Math.max((bpm - 60) / 60, 0), 1);
        const arousal = Math.min(0.6 * bpmNorm + 0.4 * ppgSlopeNorm, 1) * 100;
        
        return {
            valenceFromHRV, // HRV贡献的效价成分
            arousal, // 唤醒度
            bpmNorm, // 归一化心率
            ppgSlopeNorm, // 归一化PPG斜率
            hrvNorm // 归一化HRV
        };
    }
}

// 创建并导出单例
const biometricSensors = new BiometricSensors();
module.exports = biometricSensors; 