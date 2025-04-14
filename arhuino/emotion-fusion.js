// emotion-fusion.js
// 情感数据融合模块 - 集成表情识别和生物传感器数据

const biometricSensors = require('./biometric-data');

class EmotionFusion {
    constructor() {
        this.lastFacialEmotion = {
            emotion: '未检测',
            valence: 0,      // 效价值 (-100 ~ +100)
            confidence: 0    // 置信度 (0-1)
        };
        
        this.lastBiometricData = null;
        this.fusedData = {
            X: 0,            // X轴 (效价)
            Y: 0,            // Y轴 (唤醒度)
            Z: '未检测',      // Z轴 (情感类型)
            confidence: 0    // 融合置信度
        };
        
        this.updateListeners = [];
        this.initialized = false;
    }
    
    // 初始化融合模块
    init() {
        if (this.initialized) return true;
        
        try {
            console.log('初始化情感融合模块...');
            
            // 监听表情识别事件
            document.addEventListener('emotionDetected', this.handleFacialEmotion.bind(this));
            
            // 监听生物传感器数据事件
            document.addEventListener('biometricDataUpdate', this.handleBiometricData.bind(this));
            
            // 创建结果发送定时器 (每200ms更新一次融合结果)
            setInterval(() => this.computeAndDispatchResults(), 200);
            
            this.initialized = true;
            console.log('情感融合模块初始化完成');
            return true;
        } catch (err) {
            console.error('初始化情感融合模块时出错:', err);
            return false;
        }
    }
    
    // 处理表情识别数据
    handleFacialEmotion(event) {
        const emotionData = event.detail;
        
        if (!emotionData || !emotionData.emotion) return;
        
        // 从表情映射到效价值
        let valence = 0;
        const emotion = emotionData.emotion;
        
        // 基于情绪类型映射效价值
        switch (emotion) {
            case '开心':
                valence = 80;
                break;
            case '悲伤':
                valence = -70;
                break;
            case '愤怒':
                valence = -80;
                break;
            case '惊讶':
                valence = 30;
                break;
            case '恐惧':
                valence = -60;
                break;
            case '厌恶':
                valence = -75;
                break;
            case '中性':
                valence = 0;
                break;
            default:
                valence = 0;
        }
        
        // 按照置信度调整效价强度
        valence = valence * (emotionData.confidence || 0.5);
        
        this.lastFacialEmotion = {
            emotion: emotion,
            valence: valence,
            confidence: emotionData.confidence || 0.5
        };
    }
    
    // 处理生物传感器数据
    handleBiometricData(event) {
        this.lastBiometricData = event.detail;
    }
    
    // 计算并分发融合结果
    computeAndDispatchResults() {
        if (!this.lastBiometricData) return;
        
        // 获取生物传感器情感指标
        const biometricMetrics = biometricSensors.getEmotionMetrics();
        
        // 计算X轴 (效价) - 表情与HRV融合
        // 公式: X = 0.7×表情效价 + 0.3×(HRV_norm×200-100)
        const valenceFromHRV = biometricMetrics.valenceFromHRV;
        const X = (0.7 * this.lastFacialEmotion.valence) + (0.3 * valenceFromHRV);
        
        // 计算Y轴 (唤醒度) - 主要基于生理指标
        // 公式: Y = 0.6×BPM_norm + 0.4×PPG_斜率_norm
        const Y = biometricMetrics.arousal;
        
        // 确定Z轴 (情感类型)
        // 逻辑: 当表情置信度高时使用表情分类，否则结合生理信号特征
        let Z = this.lastFacialEmotion.emotion;
        let confidence = this.lastFacialEmotion.confidence;
        
        // 如果表情置信度低于阈值，使用生理信号辅助判断
        if (confidence < 0.8 && this.lastBiometricData) {
            const { bpm, ibi, ppgSlope } = this.lastBiometricData;
            
            // 根据生理特征验证或修正情感类型
            if (Z === '开心' && !(bpm >= 90 && bpm <= 110)) {
                confidence *= 0.8; // 降低置信度
            } else if (Z === '愤怒' && !(bpm > 100 && ppgSlope > 1.0)) {
                confidence *= 0.7; // 降低置信度
            } else if (Z === '悲伤' && !(bpm < 70)) {
                confidence *= 0.7; // 降低置信度
            } else {
                // 生理数据支持表情判断，略微提高置信度
                confidence = Math.min(confidence * 1.1, 1.0);
            }
            
            // 如果表情置信度低且生理信号特征明显，根据生理特征判断情感
            if (confidence < 0.4) {
                if (bpm >= 90 && bpm <= 110 && biometricMetrics.hrvNorm > 0.7) {
                    Z = '开心';
                    confidence = 0.6;
                } else if (bpm > 100 && ppgSlope > 1.0 && biometricMetrics.hrvNorm < 0.3) {
                    Z = '愤怒';
                    confidence = 0.6;
                } else if (bpm < 60 && ppgSlope < 0.3) {
                    Z = '悲伤';
                    confidence = 0.5;
                }
            }
        }
        
        // 更新融合数据
        this.fusedData = {
            X: Math.round(X),  // 四舍五入到整数
            Y: Math.round(Y),  // 四舍五入到整数
            Z: Z,
            confidence: confidence
        };
        
        // 发送融合结果事件
        this.dispatchFusionEvent();
        
        // 通知所有监听器
        this.notifyListeners();
    }
    
    // 发送融合结果事件
    dispatchFusionEvent() {
        const event = new CustomEvent('emotionFusionUpdate', {
            detail: this.fusedData
        });
        document.dispatchEvent(event);
    }
    
    // 添加更新监听器
    addUpdateListener(callback) {
        if (typeof callback === 'function') {
            this.updateListeners.push(callback);
            return true;
        }
        return false;
    }
    
    // 移除监听器
    removeUpdateListener(callback) {
        const index = this.updateListeners.indexOf(callback);
        if (index !== -1) {
            this.updateListeners.splice(index, 1);
            return true;
        }
        return false;
    }
    
    // 通知所有监听器
    notifyListeners() {
        this.updateListeners.forEach(listener => {
            try {
                listener(this.fusedData);
            } catch (err) {
                console.error('融合数据监听器执行错误:', err);
            }
        });
    }
    
    // 获取最新融合结果
    getLatestFusionData() {
        return this.fusedData;
    }
}

// 创建并导出单例
const emotionFusion = new EmotionFusion();
module.exports = emotionFusion; 