// emotion-recognition.js
class EmotionRecognition {
    constructor() {
        this.videoElement = null;
        this.canvasElement = null;
        this.ctx = null;
        this.face_cascade = null;
        this.isProcessing = false;
        this.currentEmotion = '未检测';
        this.confidenceScore = 0;
        this.emotionLabels = ['开心', '悲伤', '愤怒', '惊讶', '恐惧', '厌恶', '中性'];
        this.lastFrameTime = 0;
        this.targetFPS = 30;
        this.frameInterval = 1000 / this.targetFPS;
    }

    // 初始化OpenCV和模型
    async init(videoElement, canvasElement) {
        try {
            this.videoElement = videoElement;
            this.canvasElement = canvasElement;
            this.ctx = canvasElement.getContext('2d');

            // 等待OpenCV加载完成
            if (typeof cv === 'undefined') {
                await new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.src = 'https://docs.opencv.org/4.5.4/opencv.js';
                    script.onload = resolve;
                    document.head.appendChild(script);
                });
            }

            // 加载人脸检测模型
            const response = await fetch('haarcascade_frontalface_default.xml');
            const modelText = await response.text();
            this.face_cascade = new cv.CascadeClassifier();
            this.face_cascade.load(modelText);

            return true;
        } catch (err) {
            console.error('初始化失败:', err);
            throw new Error('情绪识别初始化失败: ' + err.message);
        }
    }

    // 启动视频处理
    start() {
        if (!this.face_cascade || !this.videoElement || !this.canvasElement) {
            console.error('模块未完全初始化');
            return;
        }

        this.isProcessing = true;
        this.processVideo();
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
            try {
                this.detectEmotion();
                this.lastFrameTime = currentTime;
            } catch (err) {
                console.error('处理视频帧时出错:', err);
                this.stop();
                throw new Error('视频处理错误: ' + err.message);
            }
        }

        requestAnimationFrame(() => this.processVideo());
    }

    // 检测情绪
    detectEmotion() {
        let src = null;
        let gray = null;
        let faces = null;

        try {
            // 绘制当前视频帧到canvas
            this.ctx.drawImage(
                this.videoElement, 
                0, 0, 
                this.canvasElement.width, 
                this.canvasElement.height
            );
            
            // 从canvas获取图像数据
            const imageData = this.ctx.getImageData(
                0, 0, 
                this.canvasElement.width, 
                this.canvasElement.height
            );
            
            // 转换为OpenCV格式
            src = cv.matFromImageData(imageData);
            gray = new cv.Mat();
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
            
            // 创建输出矩阵
            faces = new cv.RectVector();
            
            // 检测人脸
            this.face_cascade.detectMultiScale(gray, faces, 1.1, 3, 0);
            
            // 在canvas上标记检测到的人脸
            for (let i = 0; i < faces.size(); ++i) {
                const face = faces.get(i);
                
                // 绘制人脸矩形
                this.ctx.strokeStyle = '#00ff00';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(face.x, face.y, face.width, face.height);
                
                // 在实际应用中，这里需要调用情绪分析模型
                this.simulateEmotionDetection(face);
                
                // 显示情绪标签
                this.ctx.fillStyle = '#00ff00';
                this.ctx.font = '16px Arial';
                this.ctx.fillText(
                    `${this.currentEmotion} (${Math.round(this.confidenceScore*100)}%)`, 
                    face.x, 
                    face.y - 10
                );
            }
            
            // 如果没有检测到人脸
            if (faces.size() === 0) {
                this.currentEmotion = '未检测';
                this.confidenceScore = 0;
            }
            
            // 触发情绪变化事件
            this.dispatchEmotionEvent();
        } catch (err) {
            console.error('情绪检测失败:', err);
            throw err;
        } finally {
            // 确保释放内存
            if (src) src.delete();
            if (gray) gray.delete();
            if (faces) faces.delete();
        }
    }
    
    // 模拟情绪检测（实际项目中应该替换为真实的模型推理）
    simulateEmotionDetection(face) {
        // 在真实项目中，这里应该从人脸区域提取特征，然后使用模型推理
        // 这里我们简单模拟一个结果
        const emotionIndex = Math.floor(Math.random() * this.emotionLabels.length);
        this.currentEmotion = this.emotionLabels[emotionIndex];
        this.confidenceScore = 0.4 + Math.random() * 0.6; // 随机置信度 40%-100%
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

module.exports = EmotionRecognition;