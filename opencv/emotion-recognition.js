// emotion-recognition.js
class EmotionRecognition {
    constructor() {
        this.videoElement = null;
        this.canvasElement = null;
        this.ctx = null;
        this.isProcessing = false;
        this.currentEmotion = '未检测';
        this.confidenceScore = 0;
        this.emotionLabels = ['开心', '悲伤', '愤怒', '惊讶', '恐惧', '厌恶', '中性'];
        this.lastFrameTime = 0;
        this.targetFPS = 15; // 降低FPS提高性能
        this.frameInterval = 1000 / this.targetFPS;
        this.initialized = false;
        this.detectionOptions = null;
        this.useFallbackDetection = false; // 是否使用模拟检测
    }

    // 初始化face-api.js和模型
    async init(videoElement, canvasElement) {
        try {
            console.log('表情识别初始化开始');
            
            if (!videoElement || !canvasElement) {
                throw new Error('视频或画布元素未提供');
            }
            
            this.videoElement = videoElement;
            this.canvasElement = canvasElement;
            this.ctx = canvasElement.getContext('2d');
            
            if (!this.ctx) {
                throw new Error('无法获取画布上下文');
            }

            // 修复face-api.js的canvas创建问题
            try {
                faceapi.env.monkeyPatch({
                    Canvas: HTMLCanvasElement,
                    Image: HTMLImageElement,
                    ImageData: ImageData,
                    Video: HTMLVideoElement,
                    createCanvasElement: () => document.createElement('canvas'),
                    createImageElement: () => document.createElement('img')
                });
            } catch (patchError) {
                console.warn('无法修补face-api环境:', patchError);
            }

            // 加载模型
            try {
                await this.loadFaceApiModels();
                
                // 设置检测选项
                this.detectionOptions = new faceapi.TinyFaceDetectorOptions({
                    inputSize: 224,
                    scoreThreshold: 0.5
                });
                
                console.log('face-api.js初始化成功');
                this.useFallbackDetection = false;
            } catch (faceApiError) {
                console.error('无法加载face-api.js模型:', faceApiError);
                console.log('将使用模拟检测模式');
                this.useFallbackDetection = true;
            }

            this.initialized = true;
            console.log('表情识别模块初始化成功');
            return true;
        } catch (err) {
            console.error('初始化失败:', err);
            throw new Error('情绪识别初始化失败: ' + err.message);
        }
    }
    
    // 加载face-api.js模型
    async loadFaceApiModels() {
        // 使用本地模型路径
        const MODEL_URL = './opencv/emotion_model/face-api.js/weights';
        
        try {
            console.log(`加载表情识别模型...`);
            
            // 确保face-api.js已加载
            if (typeof faceapi === 'undefined') {
                throw new Error('face-api.js未加载，检查页面引用');
            }
            
            // 加载模型
            await faceapi.nets.tinyFaceDetector.load(MODEL_URL);
            await faceapi.nets.faceExpressionNet.load(MODEL_URL);
            
            console.log(`模型加载成功`);
            return true;
        } catch (error) {
            console.error(`模型加载失败:`, error);
            
            // 使用备选方法
            try {
                console.log('尝试使用备选方法加载...');
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ]);
                console.log('备选加载成功');
                return true;
            } catch (backupError) {
                throw new Error(`模型加载失败: ${error.message}`);
            }
        }
    }

    // 启动视频处理
    start() {
        if (!this.initialized) {
            console.error('模块未初始化');
            return false;
        }
        
        if (!this.videoElement || !this.canvasElement) {
            console.error('缺少视频或画布元素');
            return false;
        }

        this.isProcessing = true;
        this.processVideo();
        return true;
    }

    // 停止视频处理
    stop() {
        this.isProcessing = false;
    }

    // 处理视频帧
    processVideo() {
        if (!this.isProcessing) return;

        const currentTime = performance.now();
        const elapsed = currentTime - this.lastFrameTime;

        if (elapsed >= this.frameInterval) {
            this.detectEmotion().catch(err => {
                console.error('处理视频帧时出错:', err);
            });
            this.lastFrameTime = currentTime;
        }

        requestAnimationFrame(() => this.processVideo());
    }

    // 检测情绪
    async detectEmotion() {
        try {
            // 确保视频已加载并播放
            if (this.videoElement.paused || this.videoElement.ended || this.videoElement.readyState < 2) {
                return;
            }
            
            // 调整canvas尺寸
            this.canvasElement.width = this.videoElement.videoWidth || 640;
            this.canvasElement.height = this.videoElement.videoHeight || 480;
            
            // 绘制当前视频帧到canvas
            this.ctx.drawImage(
                this.videoElement, 
                0, 0, 
                this.canvasElement.width, 
                this.canvasElement.height
            );
            
            // 根据可用的检测方法选择
            if (!this.useFallbackDetection && typeof faceapi !== 'undefined') {
                await this.detectWithFaceApi();
            } else {
                this.simulateDetection();
            }
            
            // 触发情绪变化事件
            this.dispatchEmotionEvent();
        } catch (err) {
            console.error('情绪检测失败:', err);
            this.simulateDetection();
        }
    }
    
    // 使用face-api.js检测
    async detectWithFaceApi() {
        try {
            // 确保视频元素是有效的
            if (!this.videoElement || this.videoElement.readyState < 2) {
                return;
            }
            
            // 进行人脸检测和表情识别
            const detectTask = faceapi.detectAllFaces(
                this.videoElement, 
                this.detectionOptions
            );
            
            const detectWithExpressions = await detectTask.withFaceExpressions();
            
            // 清除画布并绘制视频帧
            this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
            this.ctx.drawImage(
                this.videoElement, 
                0, 0, 
                this.canvasElement.width, 
                this.canvasElement.height
            );
            
            // 处理检测结果
            if (detectWithExpressions && Array.isArray(detectWithExpressions) && detectWithExpressions.length > 0) {
                // 绘制检测结果
                for (const detection of detectWithExpressions) {
                    // 确保检测结果有效
                    if (!detection || !detection.detection || !detection.detection.box) {
                        continue;
                    }
                    
                    // 获取人脸框
                    const box = detection.detection.box;
                    
                    // 绘制人脸矩形
                    this.ctx.strokeStyle = '#00ff00';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(box.x, box.y, box.width, box.height);
                    
                    // 分析表情
                    if (detection.expressions) {
                        const emotionResult = this.getTopEmotion(detection.expressions);
                        
                        this.currentEmotion = this.mapEmotion(emotionResult.emotion);
                        this.confidenceScore = emotionResult.confidence;
                        
                        // 显示情绪标签
                        this.ctx.fillStyle = '#00ff00';
                        this.ctx.font = '16px Arial';
                        this.ctx.fillText(
                            `${this.currentEmotion} (${Math.round(this.confidenceScore*100)}%)`, 
                            box.x, 
                            box.y - 10
                        );
                    }
                }
            } else {
                // 如果没有检测到人脸
                this.currentEmotion = '未检测';
                this.confidenceScore = 0;
            }
        } catch (err) {
            console.error('Face API检测失败:', err);
            this.simulateDetection();
        }
    }
    
    // 简化版的模拟情绪（后备方案）
    simulateDetection() {
        // 显示提示信息
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, this.canvasElement.height - 30, this.canvasElement.width, 30);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            '表情识别未能加载，显示模拟数据', 
            this.canvasElement.width / 2, 
            this.canvasElement.height - 10
        );
        
        // 生成模拟数据
        const emotionResult = this.simulateEmotion();
        this.currentEmotion = this.emotionLabels[emotionResult.emotion];
        this.confidenceScore = emotionResult.confidence;
    }
    
    // 模拟情绪（作为后备）
    simulateEmotion() {
        const emotionIndex = Math.floor(Math.random() * this.emotionLabels.length);
        return {
            emotion: emotionIndex,
            confidence: 0.5 + Math.random() * 0.5 // 随机置信度 50%-100%
        };
    }
    
    // 获取最高置信度的表情
    getTopEmotion(expressions) {
        let maxConfidence = 0;
        let topEmotion = 'neutral';
        
        for (const [emotion, confidence] of Object.entries(expressions)) {
            if (confidence > maxConfidence) {
                maxConfidence = confidence;
                topEmotion = emotion;
            }
        }
        
        return {
            emotion: topEmotion,
            confidence: maxConfidence
        };
    }
    
    // 将face-api.js的表情映射到中文
    mapEmotion(emotion) {
        const map = {
            'happy': '开心',
            'sad': '悲伤',
            'angry': '愤怒',
            'surprised': '惊讶',
            'fearful': '恐惧',
            'disgusted': '厌恶',
            'neutral': '中性'
        };
        
        return map[emotion] || '未知';
    }
    
    // 触发情绪变化事件
    dispatchEmotionEvent() {
        const event = new CustomEvent('emotionDetected', {
            detail: {
                emotion: this.currentEmotion,
                confidence: this.confidenceScore
            }
        });
        document.dispatchEvent(event);
    }
    
    // 获取当前情绪
    getCurrentEmotion() {
        return {
            emotion: this.currentEmotion,
            confidence: this.confidenceScore
        };
    }
}

// 导出EmotionRecognition类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmotionRecognition;
} else if (typeof define === 'function' && define.amd) {
    define([], function() { return EmotionRecognition; });
} else {
    window.EmotionRecognition = EmotionRecognition;
}