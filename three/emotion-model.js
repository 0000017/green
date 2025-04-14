// emotion-model.js
// 基于Three.js的三维情感模型可视化模块

const THREE = require('three');

class EmotionModel {
    constructor() {
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.emotionSphere = null;
        this.emotionTrail = [];
        this.maxTrailPoints = 100;
        this.axisHelpers = [];
        this.labels = {};
        this.animationId = null;
        this.isInitialized = false;
        this.lastEmotionData = {
            X: 0,      // 效价 (-100 to +100)
            Y: 0,      // 唤醒度 (0 to 100)
            Z: '未检测',  // 情感类型
            confidence: 0 // 置信度
        };
        
        // 定义情感类型颜色映射
        this.emotionColors = {
            '开心': 0xffeb3b,   // 黄色
            '悲伤': 0x3f51b5,   // 蓝色
            '愤怒': 0xf44336,   // 红色
            '惊讶': 0xff9800,   // 橙色
            '恐惧': 0x9c27b0,   // 紫色
            '厌恶': 0x4caf50,   // 绿色
            '中性': 0xfafafa,   // 白色
            '未检测': 0x9e9e9e   // 灰色
        };
        
        // 情感类型到位置的映射
        this.emotionZPos = {
            '开心': 80,
            '惊讶': 50,
            '中性': 0,
            '悲伤': -50,
            '恐惧': -60,
            '愤怒': -70,
            '厌恶': -80,
            '未检测': 0
        };
    }
    
    // 初始化Three.js场景
    init(containerSelector = '#emotion-model-container') {
        try {
            if (this.isInitialized) return true;
            
            console.log('初始化情感3D模型...');
            
            // 获取容器元素
            this.container = document.querySelector(containerSelector);
            if (!this.container) {
                console.error(`找不到容器元素: ${containerSelector}`);
                // 创建容器元素
                this.container = document.createElement('div');
                this.container.id = 'emotion-model-container';
                document.body.appendChild(this.container);
                console.log('已创建新的情感模型容器');
            }
            
            // 设置容器样式
            this.container.style.position = 'absolute';
            this.container.style.bottom = '20px';
            this.container.style.right = '20px';
            this.container.style.width = '300px';
            this.container.style.height = '300px';
            this.container.style.zIndex = '1000';
            this.container.style.overflow = 'hidden';
            
            // 创建场景
            this.scene = new THREE.Scene();
            
            // 创建透视相机
            const aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
            this.camera.position.set(170, 120, 170);
            this.camera.lookAt(0, 0, 0);
            
            // 创建渲染器
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true  // 启用透明背景
            });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setClearColor(0x000000, 0); // 透明背景
            this.container.appendChild(this.renderer.domElement);
            
            // 创建坐标轴和网格
            this.createAxisHelpers();
            
            // 创建情感球体
            this.createEmotionSphere();
            
            // 创建坐标轴标签
            this.createAxisLabels();
            
            // 添加轨迹线
            this.createTrailLine();
            
            // 添加窗口大小变化监听
            window.addEventListener('resize', this.onWindowResize.bind(this));
            
            // 绑定情感融合数据更新事件
            document.addEventListener('emotionFusionUpdate', this.handleEmotionUpdate.bind(this));
            
            // 开始动画循环
            this.animate();
            
            this.isInitialized = true;
            console.log('情感3D模型初始化完成');
            return true;
        } catch (err) {
            console.error('初始化情感3D模型出错:', err);
            return false;
        }
    }
    
    // 创建坐标轴辅助和网格
    createAxisHelpers() {
        // 创建坐标轴辅助 (小一些避免干扰视觉)
        const axisHelper = new THREE.AxesHelper(120);
        this.scene.add(axisHelper);
        this.axisHelpers.push(axisHelper);
        
        // 创建网格
        const gridHelperXY = new THREE.GridHelper(200, 10, 0x888888, 0x444444);
        gridHelperXY.position.y = -100;
        this.scene.add(gridHelperXY);
        this.axisHelpers.push(gridHelperXY);
        
        // 创建X/Z平面的网格
        const gridHelperXZ = new THREE.GridHelper(200, 10, 0x888888, 0x444444);
        gridHelperXZ.rotation.x = Math.PI / 2;
        gridHelperXZ.position.z = -100;
        this.scene.add(gridHelperXZ);
        this.axisHelpers.push(gridHelperXZ);
        
        // 创建Y/Z平面的网格
        const gridHelperYZ = new THREE.GridHelper(200, 10, 0x888888, 0x444444);
        gridHelperYZ.rotation.z = Math.PI / 2;
        gridHelperYZ.position.x = -100;
        this.scene.add(gridHelperYZ);
        this.axisHelpers.push(gridHelperYZ);
    }
    
    // 创建情感球体
    createEmotionSphere() {
        // 创建情感球体几何体
        const geometry = new THREE.SphereGeometry(8, 32, 32);
        
        // 创建发光材质
        const material = new THREE.MeshBasicMaterial({
            color: this.emotionColors['未检测'],
            transparent: true,
            opacity: 0.8
        });
        
        // 创建发光球体
        this.emotionSphere = new THREE.Mesh(geometry, material);
        this.emotionSphere.position.set(0, 0, 0);
        this.scene.add(this.emotionSphere);
        
        // 添加情感球体光晕
        this.addGlow(this.emotionSphere);
    }
    
    // 添加发光效果
    addGlow(object) {
        // 创建更大的球体作为光晕
        const glowGeometry = new THREE.SphereGeometry(12, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: object.material.color,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        object.add(glowMesh);
        
        // 保存引用以便更新颜色
        object.userData.glowMesh = glowMesh;
    }
    
    // 创建坐标轴标签
    createAxisLabels() {
        // 创建CSS2D渲染器进行标签渲染
        // 由于Three.js的CSS2DRenderer可能需要额外导入，这里用普通DOM元素代替
        
        // X轴标签 (效价)
        const xPositiveLabel = document.createElement('div');
        xPositiveLabel.className = 'axis-label';
        xPositiveLabel.textContent = '正效价';
        xPositiveLabel.style.position = 'absolute';
        xPositiveLabel.style.color = '#ffffff';
        xPositiveLabel.style.fontSize = '12px';
        xPositiveLabel.style.fontWeight = 'bold';
        xPositiveLabel.style.right = '25%';
        xPositiveLabel.style.bottom = '50%';
        this.container.appendChild(xPositiveLabel);
        this.labels.xPositive = xPositiveLabel;
        
        const xNegativeLabel = document.createElement('div');
        xNegativeLabel.className = 'axis-label';
        xNegativeLabel.textContent = '负效价';
        xNegativeLabel.style.position = 'absolute';
        xNegativeLabel.style.color = '#ffffff';
        xNegativeLabel.style.fontSize = '12px';
        xNegativeLabel.style.fontWeight = 'bold';
        xNegativeLabel.style.left = '25%';
        xNegativeLabel.style.bottom = '50%';
        this.container.appendChild(xNegativeLabel);
        this.labels.xNegative = xNegativeLabel;
        
        // Y轴标签 (唤醒度)
        const yPositiveLabel = document.createElement('div');
        yPositiveLabel.className = 'axis-label';
        yPositiveLabel.textContent = '高唤醒';
        yPositiveLabel.style.position = 'absolute';
        yPositiveLabel.style.color = '#ffffff';
        yPositiveLabel.style.fontSize = '12px';
        yPositiveLabel.style.fontWeight = 'bold';
        yPositiveLabel.style.left = '50%';
        yPositiveLabel.style.top = '10%';
        yPositiveLabel.style.transform = 'translateX(-50%)';
        this.container.appendChild(yPositiveLabel);
        this.labels.yPositive = yPositiveLabel;
        
        const yNegativeLabel = document.createElement('div');
        yNegativeLabel.className = 'axis-label';
        yNegativeLabel.textContent = '低唤醒';
        yNegativeLabel.style.position = 'absolute';
        yNegativeLabel.style.color = '#ffffff';
        yNegativeLabel.style.fontSize = '12px';
        yNegativeLabel.style.fontWeight = 'bold';
        yNegativeLabel.style.left = '50%';
        yNegativeLabel.style.bottom = '10%';
        yNegativeLabel.style.transform = 'translateX(-50%)';
        this.container.appendChild(yNegativeLabel);
        this.labels.yNegative = yNegativeLabel;
        
        // Z轴标签 (情感类型)
        const zPositiveLabel = document.createElement('div');
        zPositiveLabel.className = 'axis-label';
        zPositiveLabel.textContent = '积极情绪';
        zPositiveLabel.style.position = 'absolute';
        zPositiveLabel.style.color = '#ffffff';
        zPositiveLabel.style.fontSize = '12px';
        zPositiveLabel.style.fontWeight = 'bold';
        zPositiveLabel.style.left = '70%';
        zPositiveLabel.style.top = '70%';
        this.container.appendChild(zPositiveLabel);
        this.labels.zPositive = zPositiveLabel;
        
        const zNegativeLabel = document.createElement('div');
        zNegativeLabel.className = 'axis-label';
        zNegativeLabel.textContent = '消极情绪';
        zNegativeLabel.style.position = 'absolute';
        zNegativeLabel.style.color = '#ffffff';
        zNegativeLabel.style.fontSize = '12px';
        zNegativeLabel.style.fontWeight = 'bold';
        zNegativeLabel.style.left = '30%';
        zNegativeLabel.style.top = '70%';
        this.container.appendChild(zNegativeLabel);
        this.labels.zNegative = zNegativeLabel;
        
        // 当前情感类型标签
        const emotionTypeLabel = document.createElement('div');
        emotionTypeLabel.className = 'emotion-type-label';
        emotionTypeLabel.textContent = '未检测';
        emotionTypeLabel.style.position = 'absolute';
        emotionTypeLabel.style.color = '#ffffff';
        emotionTypeLabel.style.fontSize = '16px';
        emotionTypeLabel.style.fontWeight = 'bold';
        emotionTypeLabel.style.left = '50%';
        emotionTypeLabel.style.top = '5%';
        emotionTypeLabel.style.transform = 'translateX(-50%)';
        emotionTypeLabel.style.background = 'rgba(0, 0, 0, 0.5)';
        emotionTypeLabel.style.padding = '5px 10px';
        emotionTypeLabel.style.borderRadius = '4px';
        this.container.appendChild(emotionTypeLabel);
        this.labels.emotionType = emotionTypeLabel;
    }
    
    // 创建轨迹线
    createTrailLine() {
        // 初始化一个点
        const points = [new THREE.Vector3(0, 0, 0)];
        
        // 创建轨迹线几何体
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // 创建轨迹线材质
        const material = new THREE.LineBasicMaterial({
            color: 0x4fc3f7,
            transparent: true,
            opacity: 0.6,
            linewidth: 1
        });
        
        // 创建轨迹线
        this.trailLine = new THREE.Line(geometry, material);
        this.scene.add(this.trailLine);
    }
    
    // 处理情感数据更新
    handleEmotionUpdate(event) {
        const emotionData = event.detail;
        
        if (!emotionData) return;
        
        // 更新最后的情感数据
        this.lastEmotionData = emotionData;
        
        // 更新模型位置
        this.updateEmotionModel(emotionData);
    }
    
    // 更新情感模型
    updateEmotionModel(emotionData) {
        if (!this.emotionSphere) return;
        
        const { X, Y, Z, confidence } = emotionData;
        
        // 映射X坐标 (效价) 范围从 -100~100 到 -100~100
        const xPos = X;
        
        // 映射Y坐标 (唤醒度) 范围从 0~100 到 0~100
        const yPos = Y;
        
        // 获取Z坐标 (情感类型) 使用预定义的情感位置或默认值0
        const zPos = this.emotionZPos[Z] || 0;
        
        // 平滑过渡到新位置
        this.animatePositionChange(xPos, yPos, zPos);
        
        // 更新情感球体颜色
        const color = this.emotionColors[Z] || this.emotionColors['未检测'];
        this.updateEmotionColor(color, confidence);
        
        // 更新轨迹
        this.updateTrail(xPos, yPos, zPos);
        
        // 更新情感类型标签
        if (this.labels.emotionType) {
            this.labels.emotionType.textContent = Z;
            // 添加置信度显示
            const confidencePercent = Math.round(confidence * 100);
            this.labels.emotionType.textContent = `${Z} (${confidencePercent}%)`;
        }
    }
    
    // 平滑过渡到新位置
    animatePositionChange(targetX, targetY, targetZ) {
        const sphere = this.emotionSphere;
        const currentX = sphere.position.x;
        const currentY = sphere.position.y;
        const currentZ = sphere.position.z;
        
        // 使用线性插值平滑过渡
        sphere.position.x += (targetX - currentX) * 0.1;
        sphere.position.y += (targetY - currentY) * 0.1;
        sphere.position.z += (targetZ - currentZ) * 0.1;
    }
    
    // 更新情感球体颜色
    updateEmotionColor(color, confidence) {
        // 根据置信度调整不透明度
        const opacity = 0.3 + confidence * 0.7;
        
        // 更新主球体颜色和不透明度
        this.emotionSphere.material.color.set(color);
        this.emotionSphere.material.opacity = opacity;
        
        // 更新光晕颜色
        if (this.emotionSphere.userData.glowMesh) {
            this.emotionSphere.userData.glowMesh.material.color.set(color);
            this.emotionSphere.userData.glowMesh.material.opacity = opacity * 0.4;
        }
    }
    
    // 更新轨迹线
    updateTrail(x, y, z) {
        // 添加新点到轨迹
        this.emotionTrail.push(new THREE.Vector3(x, y, z));
        
        // 限制轨迹点数量
        if (this.emotionTrail.length > this.maxTrailPoints) {
            this.emotionTrail.shift();
        }
        
        // 更新轨迹线几何体
        const geometry = new THREE.BufferGeometry().setFromPoints(this.emotionTrail);
        this.trailLine.geometry.dispose();
        this.trailLine.geometry = geometry;
    }
    
    // 处理窗口大小变化
    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        
        // 更新相机宽高比
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        
        // 更新渲染器大小
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
    
    // 动画循环
    animate() {
        if (!this.isInitialized) return;
        
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        
        // 旋转相机围绕原点
        const time = Date.now() * 0.0002;
        const radius = 200;
        this.camera.position.x = Math.sin(time) * radius;
        this.camera.position.z = Math.cos(time) * radius;
        this.camera.lookAt(0, 0, 0);
        
        // 渲染场景
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    // 停止渲染
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    // 清理资源
    dispose() {
        this.stop();
        
        // 移除事件监听器
        window.removeEventListener('resize', this.onWindowResize);
        document.removeEventListener('emotionFusionUpdate', this.handleEmotionUpdate);
        
        // 清理Three.js资源
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
        
        // 移除DOM元素
        Object.values(this.labels).forEach(label => {
            if (label && label.parentNode) {
                label.parentNode.removeChild(label);
            }
        });
        
        // 移除渲染器和容器
        if (this.renderer) {
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
            this.renderer.dispose();
        }
        
        this.isInitialized = false;
    }
}

// 创建并导出单例
const emotionModel = new EmotionModel();
module.exports = emotionModel; 