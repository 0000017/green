// emotion-model.js
// 基于Three.js的三维情感模型可视化模块

// 尝试获取THREE对象
let THREE;
try {
    if (typeof window !== 'undefined' && window.THREE) {
        console.log('使用全局THREE对象');
        THREE = window.THREE;
    } else if (typeof require === 'function') {
        console.log('尝试require导入THREE');
        THREE = require('three');
    } else {
        throw new Error('无法加载THREE.js库');
    }
    console.log('THREE.js版本:', THREE.REVISION || 'unknown');
} catch (err) {
    console.error('无法加载THREE库:', err);
    // 如果THREE对象加载失败，提供一个占位对象，以防脚本继续执行
    THREE = {
        Scene: function() { return {}; },
        PerspectiveCamera: function() { return {}; },
        WebGLRenderer: function() { return { setSize: function(){}, render: function(){} }; },
        Color: function() { return {}; },
        Vector3: function() { return {}; },
        AxesHelper: function() { return {}; },
        GridHelper: function() { return {}; },
        SphereGeometry: function() { return {}; },
        MeshPhongMaterial: function() { return { color: {set: function(){}}, opacity: 0 }; },
        MeshBasicMaterial: function() { return { color: {set: function(){}}, opacity: 0 }; },
        LineBasicMaterial: function() { return {}; },
        Mesh: function() { return { position: {x:0,y:0,z:0}, add: function(){}, userData: {} }; },
        Line: function() { return {}; },
        BufferGeometry: function() { return { setFromPoints: function(){return this;}, dispose: function(){} }; },
        BufferAttribute: function() { return {}; },
        CanvasTexture: function() { return {}; },
        Points: function() { return { position: {x:0,y:0,z:0}, add: function(){}, userData: {} }; },
        ShaderMaterial: function() { return {}; },
        AdditiveBlending: 2,
        BackSide: 0,
        AmbientLight: function() { return {}; },
        DirectionalLight: function() { return { position: {set: function(){}} }; }
    };
}

// 尝试导入OrbitControls
let OrbitControls;
try {
    // 使用动态导入方式，兼容ES Module和CommonJS
    const THREE_PATH = typeof window !== 'undefined' ? window.THREE_PATH || '' : '';
    
    // 方法1：直接创建一个基本的OrbitControls替代实现
    OrbitControls = function(camera, domElement) {
        this.object = camera;
        this.domElement = domElement;
        
        // 基本属性
        this.enabled = true;
        this.target = new THREE.Vector3();
        this.enableDamping = false;
        this.dampingFactor = 0.05;
        this.enableZoom = true;
        this.zoomSpeed = 1.0;
        this.enableRotate = true;
        this.rotateSpeed = 1.0;
        this.enablePan = true;
        this.panSpeed = 1.0;
        this.minDistance = 0;
        this.maxDistance = Infinity;
        
        // 基本方法
        this.update = function() {
            return true;
        };
        
        this.dispose = function() {
            return;
        };
        
        // 简单实现旋转逻辑
        let isMouseDown = false;
        let lastMouseX = 0;
        let lastMouseY = 0;
        
        const onMouseDown = (event) => {
            isMouseDown = true;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
        };
        
        const onMouseMove = (event) => {
            if (!isMouseDown) return;
            
            const deltaX = event.clientX - lastMouseX;
            const deltaY = event.clientY - lastMouseY;
            
            // 简单的相机旋转
            const rotSpeed = 0.005;
            camera.position.x = camera.position.x * Math.cos(rotSpeed * deltaX) + 
                               camera.position.z * Math.sin(rotSpeed * deltaX);
            camera.position.z = camera.position.z * Math.cos(rotSpeed * deltaX) - 
                               camera.position.x * Math.sin(rotSpeed * deltaX);
            
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            
            camera.lookAt(this.target);
        };
        
        const onMouseUp = () => {
            isMouseDown = false;
        };
        
        // 绑定事件
        if (domElement) {
            domElement.addEventListener('mousedown', onMouseDown, false);
            domElement.addEventListener('mousemove', onMouseMove, false);
            domElement.addEventListener('mouseup', onMouseUp, false);
            
            // 移除事件的方法
            this.dispose = function() {
                domElement.removeEventListener('mousedown', onMouseDown, false);
                domElement.removeEventListener('mousemove', onMouseMove, false);
                domElement.removeEventListener('mouseup', onMouseUp, false);
            };
        }
    };
    
    console.log('使用自定义OrbitControls实现');
} catch (err) {
    console.error('无法实现OrbitControls:', err);
    // 创建占位OrbitControls
    OrbitControls = function() {
        return {
            update: function() {},
            dispose: function() {}
        };
    };
}

class EmotionModel {
    constructor() {
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // 移除原有的emotionSphere，改为纯粒子系统
        this.emotionSphere = null;
        
        // 坐标系范围 - 放大三倍
        this.axisLength = 300;
        this.axisHelpers = [];
        this.labels = {};
        this.animationId = null;
        this.isInitialized = false;
        
        // 情感数据
        this.lastEmotionData = {
            Y: 0,      // 效价 (-100 to +100)，原来是X轴
            Z: 0,      // 唤醒度 (0 to 100)，原来是Y轴
            X: '未检测',  // 情感类型，原来是Z轴
            confidence: 0 // 置信度
        };
        
        // 情感类型在X轴上的位置映射 - 放大三倍
        this.emotionXPos = {
            '开心': 240,     // X轴靠前
            '惊讶': 180,
            '中性': 150,
            '恐惧': 120,
            '悲伤': 90,
            '厌恶': 60,
            '愤怒': 30,     // X轴靠后
            '未检测': 0
        };
        
        // 情感类型的颜色映射 - 用于粒子基础颜色
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
        
        // 粒子系统参数
        this.baseParticleCount = 300; // 基础粒子数量
        this.currentParticleCount = 300; // 当前显示的粒子数量
        this.maxParticleCount = 1000; // 最大粒子数量限制
        this.particles = null;
        this.particleSystem = null;
    }
    
    // 初始化Three.js场景
    init(containerSelector = '#emotion-model-container') {
        try {
            if (this.isInitialized) return true;
            
            console.log('初始化情感3D模型...');
            
            // 确保THREE对象可用
            if (!THREE || typeof THREE.Scene !== 'function') {
                console.error('THREE.js库未正确加载！请确保在页面中引入three.js库');
                return false;
            }
            
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
            
            // 设置容器样式 - 调整为更大的尺寸
            this.container.style.position = 'absolute';
            this.container.style.bottom = '20px';
            this.container.style.right = '20px';
            this.container.style.width = '500px';
            this.container.style.height = '500px';
            this.container.style.zIndex = '1000';
            this.container.style.overflow = 'hidden';
            
            // 创建场景
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x000000); // 黑色背景
            
            // 创建透视相机
            const aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000);
            
            // 设置相机位置 - 放大三倍
            this.camera.position.set(600, 300, 600);
            this.camera.lookAt(75, 120, 0);
            
            // 创建渲染器
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true
            });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setClearColor(0x000000, 1);
            this.container.appendChild(this.renderer.domElement);
            
            // 添加OrbitControls（如果可用）
            if (typeof OrbitControls === 'function') {
                this.controls = new OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true; // 添加阻尼效果
                this.controls.dampingFactor = 0.05;
                this.controls.rotateSpeed = 0.5;
                this.controls.minDistance = 150;  // 调整最小距离
                this.controls.maxDistance = 1200; // 调整最大距离
                
                // 设置初始视角 - 与camera.lookAt保持一致
                this.controls.target.set(75, 120, 0);
                
                // 限制垂直旋转角度，保持在俯视角度
                this.controls.minPolarAngle = Math.PI / 6; // 约30度
                this.controls.maxPolarAngle = Math.PI / 2.5; // 约72度
                
                this.controls.update();
                
                console.log('已启用OrbitControls');
            }
            
            // 添加灯光以改善可视化效果
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            this.scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(200, 200, 200);
            this.scene.add(directionalLight);
            
            // 创建简化的坐标系 - 只使用正向轴
            this.createAxisHelpers();
            
            // 创建坐标轴标签
            this.createAxisLabels();
            
            // 创建粒子系统
            this.createParticleSystem();
            
            // 添加窗口大小变化监听
            window.addEventListener('resize', this.onWindowResize.bind(this));
            
            // 绑定情感融合数据更新事件
            document.addEventListener('emotionFusionUpdate', this.handleEmotionUpdate.bind(this));
            
            // 开始动画循环
            this.animate();
            
            this.isInitialized = true;
            console.log('情感3D模型初始化完成');
            
            // 立即渲染一帧，确保显示
            this.renderer.render(this.scene, this.camera);
            
            return true;
        } catch (err) {
            console.error('初始化情感3D模型出错:', err);
            console.error(err.stack);
            return false;
        }
    }
    
    // 创建坐标轴辅助 - 只使用正向轴，符合参考图
    createAxisHelpers() {
        // 创建X轴 (情感类型) 放在X轴的位置上
        const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(this.axisLength, 0, 0)
        ]);
        const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
        const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
        this.scene.add(xAxis);
        this.axisHelpers.push(xAxis);
        
        // 创建X轴箭头
        const xArrowGeometry = new THREE.ConeGeometry(3, 6, 8);
        const xArrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const xArrow = new THREE.Mesh(xArrowGeometry, xArrowMaterial);
        xArrow.position.set(this.axisLength, 0, 0);
        xArrow.rotation.z = -Math.PI / 2;
        this.scene.add(xArrow);
        this.axisHelpers.push(xArrow);
        
        // 创建Y轴 (效价) 放在Y轴的位置上
        const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, this.axisLength, 0)
        ]);
        const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
        const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
        this.scene.add(yAxis);
        this.axisHelpers.push(yAxis);
        
        // 创建Y轴箭头
        const yArrowGeometry = new THREE.ConeGeometry(3, 6, 8);
        const yArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const yArrow = new THREE.Mesh(yArrowGeometry, yArrowMaterial);
        yArrow.position.set(0, this.axisLength, 0);
        this.scene.add(yArrow);
        this.axisHelpers.push(yArrow);
        
        // 创建Z轴 (唤醒度) 放在Z轴的位置上
        const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, this.axisLength)
        ]);
        const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });
        const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
        this.scene.add(zAxis);
        this.axisHelpers.push(zAxis);
        
        // 创建Z轴箭头
        const zArrowGeometry = new THREE.ConeGeometry(3, 6, 8);
        const zArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        const zArrow = new THREE.Mesh(zArrowGeometry, zArrowMaterial);
        zArrow.position.set(0, 0, this.axisLength);
        zArrow.rotation.x = Math.PI / 2;
        this.scene.add(zArrow);
        this.axisHelpers.push(zArrow);
        
        // 添加原点标记
        const originGeometry = new THREE.SphereGeometry(2, 16, 16);
        const originMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const originSphere = new THREE.Mesh(originGeometry, originMaterial);
        originSphere.position.set(0, 0, 0);
        this.scene.add(originSphere);
        this.axisHelpers.push(originSphere);
        
        // 添加刻度线
        // X轴刻度
        for (let i = 20; i <= this.axisLength; i += 20) {
            const tickGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(i, 0, 0),
                new THREE.Vector3(i, 5, 0)
            ]);
            const tickMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
            const tick = new THREE.Line(tickGeometry, tickMaterial);
            this.scene.add(tick);
            this.axisHelpers.push(tick);
        }
        
        // Y轴刻度
        for (let i = 20; i <= this.axisLength; i += 20) {
            const tickGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, i, 0),
                new THREE.Vector3(5, i, 0)
            ]);
            const tickMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
            const tick = new THREE.Line(tickGeometry, tickMaterial);
            this.scene.add(tick);
            this.axisHelpers.push(tick);
        }
        
        // Z轴刻度
        for (let i = 20; i <= this.axisLength; i += 20) {
            const tickGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, i),
                new THREE.Vector3(5, 0, i)
            ]);
            const tickMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
            const tick = new THREE.Line(tickGeometry, tickMaterial);
            this.scene.add(tick);
            this.axisHelpers.push(tick);
        }
    }
    
    // 创建坐标轴标签
    createAxisLabels() {
        // 使用Three.js文本精灵替代HTML标签
        const createTextSprite = (text, position, color = 0xffffff) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const fontSize = 36; // 增大字体大小
            canvas.width = 512; // 增大画布尺寸
            canvas.height = 128;
            
            context.font = `bold ${fontSize}px Arial`; // 加粗字体
            context.fillStyle = '#ffffff';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, canvas.width / 2, canvas.height / 2);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                color: color,
                transparent: true,
                depthWrite: false
            });
            
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.copy(position);
            sprite.scale.set(90, 30, 1); // 增大标签尺寸
            this.scene.add(sprite);
            
            return sprite;
        };
        
        // X轴标签 (情感类型) - 调整位置
        const xLabelPos = new THREE.Vector3(this.axisLength + 45, 0, 0);
        const xLabel = createTextSprite('X轴 (情感类型)', xLabelPos, 0xff0000);
        this.axisHelpers.push(xLabel);
        
        // Y轴标签 (效价) - 调整位置
        const yLabelPos = new THREE.Vector3(0, this.axisLength + 45, 0);
        const yLabel = createTextSprite('Y轴 (效价)', yLabelPos, 0x00ff00);
        this.axisHelpers.push(yLabel);
        
        // Y轴范围标签 - 调整位置
        const yRangePos = new THREE.Vector3(0, this.axisLength + 45, 30);
        const yRange = createTextSprite('-100~+100', yRangePos, 0x00ff00);
        this.axisHelpers.push(yRange);
        
        // Z轴标签 (唤醒度) - 调整位置
        const zLabelPos = new THREE.Vector3(0, 0, this.axisLength + 45);
        const zLabel = createTextSprite('Z轴 (唤醒度)', zLabelPos, 0x0000ff);
        this.axisHelpers.push(zLabel);
        
        // Z轴范围标签 - 调整位置
        const zRangePos = new THREE.Vector3(0, 0, this.axisLength + 45, 30);
        const zRange = createTextSprite('0~100', zRangePos, 0x0000ff);
        this.axisHelpers.push(zRange);
        
        // 仍然保留当前情感类型标签为HTML，便于更新
        const emotionTypeLabel = document.createElement('div');
        emotionTypeLabel.className = 'emotion-type-label';
        emotionTypeLabel.textContent = '未检测';
        emotionTypeLabel.style.position = 'absolute';
        emotionTypeLabel.style.left = '50%';
        emotionTypeLabel.style.top = '5%';
        emotionTypeLabel.style.transform = 'translateX(-50%)';
        emotionTypeLabel.style.background = 'rgba(0, 0, 0, 0.7)';
        emotionTypeLabel.style.padding = '8px 15px'; // 增大内边距
        emotionTypeLabel.style.borderRadius = '6px'; // 增大圆角
        emotionTypeLabel.style.color = '#ffffff';
        emotionTypeLabel.style.fontSize = '24px'; // 增大字体
        emotionTypeLabel.style.fontWeight = 'bold'; // 加粗字体
        this.container.appendChild(emotionTypeLabel);
        this.labels.emotionType = emotionTypeLabel;
        
        // 添加坐标系的名称标签
        const coordSystemLabel = document.createElement('div');
        coordSystemLabel.className = 'axis-label coord-system-label';
        coordSystemLabel.textContent = '情感三维坐标系';
        coordSystemLabel.style.position = 'absolute';
        coordSystemLabel.style.left = '15px';
        coordSystemLabel.style.top = '15px';
        coordSystemLabel.style.fontSize = '24px'; // 增大字体
        coordSystemLabel.style.fontWeight = 'bold';
        coordSystemLabel.style.color = '#ffffff';
        coordSystemLabel.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)'; // 添加文字阴影增强可读性
        this.container.appendChild(coordSystemLabel);
        this.labels.coordSystemLabel = coordSystemLabel;
    }
    
    // 创建粒子系统
    createParticleSystem() {
        // 创建粒子几何体
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxParticleCount * 3);
        const colors = new Float32Array(this.maxParticleCount * 3);
        const sizes = new Float32Array(this.maxParticleCount);
        
        // 初始化粒子位置在远离中心的位置
        for (let i = 0; i < this.maxParticleCount; i++) {
            const i3 = i * 3;
            // 将初始粒子放在视野外
            positions[i3] = (Math.random() - 0.5) * 1000;
            positions[i3 + 1] = (Math.random() - 0.5) * 1000;
            positions[i3 + 2] = (Math.random() - 0.5) * 1000;
            
            // 初始颜色为暗灰色（几乎看不见）
            colors[i3] = 0.3;     // 增加初始可见度
            colors[i3 + 1] = 0.3;
            colors[i3 + 2] = 0.3;
            
            // 初始大小很小
            sizes[i] = 0.5;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // 创建粒子纹理
        const particleTexture = this.createDefaultParticleTexture();
        
        // 使用PointsMaterial，移除发光效果
        const material = new THREE.PointsMaterial({
            size: 15, // 保持粒子大小
            sizeAttenuation: true,
            map: particleTexture,
            alphaTest: 0.5,      // 增加透明度测试阈值
            transparent: true,
            vertexColors: true,
            blending: THREE.NormalBlending, // 使用普通混合模式替代加法混合
            depthWrite: true,    // 启用深度写入
            depthTest: true      // 确保深度测试
        });
        
        // 创建粒子系统
        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
        
        this.particles = {
            positions: positions,
            colors: colors,
            sizes: sizes,
            velocities: new Float32Array(this.maxParticleCount * 3),
            targetPositions: new Float32Array(this.maxParticleCount * 3),
            active: new Array(this.maxParticleCount).fill(false), // 跟踪粒子是否激活
            life: new Array(this.maxParticleCount).fill(0), // 粒子寿命
            maxLife: new Array(this.maxParticleCount).fill(0) // 粒子最大寿命
        };
        
        // 初始化粒子速度
        for (let i = 0; i < this.maxParticleCount * 3; i++) {
            this.particles.velocities[i] = 0;
            this.particles.targetPositions[i] = this.particles.positions[i];
        }
    }
    
    // 创建默认粒子纹理 - 移除发光效果，使用实心圆点
    createDefaultParticleTexture() {
        const canvas = document.createElement('canvas');
        // 保持高分辨率提高清晰度
        canvas.width = 128; 
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // 创建圆形实心粒子，移除径向渐变发光效果
        ctx.fillStyle = '#ffffff'; // 纯白色
        ctx.beginPath();
        ctx.arc(64, 64, 60, 0, Math.PI * 2);
        ctx.fill();
        
        // 添加边缘以增强立体感
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    // 处理情感数据更新
    handleEmotionUpdate(event) {
        if (!event || !event.detail) return;
        
        const data = event.detail;
        
        // 检查数据字段并记录接收到的原始数据
        console.log('接收到情感数据:', data);
        
        // 数据适配 - 确保与新的坐标轴定义匹配
        // 检查必要的字段是否存在
        if (data.valence === undefined || data.arousal === undefined || 
            (data.dominant_emotion === undefined && data.emotion === undefined)) {
            console.warn('情感数据格式不完整:', data);
            return;
        }
        
        // 提取情感类型 - 兼容不同的字段名
        const emotionType = data.dominant_emotion || data.emotion || '未检测';
        
        // 使用新的坐标轴定义存储数据
        this.lastEmotionData = {
            Y: data.valence,              // Y轴 - 效价 (-100 to +100)
            Z: data.arousal,              // Z轴 - 唤醒度 (0 to 100)
            X: emotionType,               // X轴 - 情感类型
            confidence: data.confidence || 0.5
        };
        
        console.log('处理后的情感数据映射:', this.lastEmotionData);
        
        // 更新情感类型标签
        if (this.labels.emotionType) {
            this.labels.emotionType.textContent = `${this.lastEmotionData.X} (${Math.round(this.lastEmotionData.confidence * 100)}%)`;
            
            // 根据情感类型设置标签颜色
            const color = this.emotionColors[this.lastEmotionData.X] || this.emotionColors['未检测'];
            const r = ((color >> 16) & 255);
            const g = ((color >> 8) & 255);
            const b = (color & 255);
            this.labels.emotionType.style.color = `rgb(${r}, ${g}, ${b})`;
        }
        
        // 计算当前应显示的粒子数量（基于置信度）
        const confidenceScale = Math.min(Math.max(this.lastEmotionData.confidence, 0.3), 1.0);
        this.currentParticleCount = Math.round(this.baseParticleCount * confidenceScale);
        
        // 限制粒子数量在最大范围内
        this.currentParticleCount = Math.min(this.currentParticleCount, this.maxParticleCount);
        
        // 更新粒子系统
        this.updateParticleSystem();
    }
    
    // 更新粒子系统以反映当前情感状态
    updateParticleSystem() {
        if (!this.particleSystem || !this.particles) return;
        
        // 获取情感数据
        const valence = this.lastEmotionData.Y; // 效价 (-100 to +100) - Y轴
        const arousal = this.lastEmotionData.Z; // 唤醒度 (0 to 100) - Z轴
        const emotionType = this.lastEmotionData.X; // 情感类型 - X轴
        const confidence = this.lastEmotionData.confidence; // 0 to 1
        
        // 检查情感类型是否存在于映射中，如果不存在则使用"未检测"
        const validEmotionType = this.emotionXPos.hasOwnProperty(emotionType) ? emotionType : '未检测';
        
        // 获取情感类型的X轴位置
        const emotionTypePos = this.emotionXPos[validEmotionType];
        
        // 获取情感类型的基础颜色
        const emotionColor = this.emotionColors[validEmotionType] || this.emotionColors['未检测'];
        const r = ((emotionColor >> 16) & 255) / 255;
        const g = ((emotionColor >> 8) & 255) / 255;
        const b = (emotionColor & 255) / 255;
        
        // 确保arousal和valence是数值型，如果不是则使用默认值
        const safeArousal = typeof arousal === 'number' ? arousal : 0;
        const safeValence = typeof valence === 'number' ? valence : 0;
        
        // 亮度影响因子（基于唤醒度）- 调整为正常亮度
        const brightness = Math.max(0.7, safeArousal / 100 * 1.2);
        
        // 遍历活跃粒子
        for (let i = 0; i < this.currentParticleCount; i++) {
            const i3 = i * 3;
            
            // 激活粒子
            if (!this.particles.active[i]) {
                this.particles.active[i] = true;
                this.particles.life[i] = 0;
                this.particles.maxLife[i] = 30 + Math.random() * 100; // 随机生命周期
                
                // 起始位置设置在情感点附近的随机位置 - 调整偏移比例
                const offsetScale = 90; // 放大三倍
                this.particles.positions[i3] = Math.max(0, emotionTypePos) + (Math.random() - 0.5) * offsetScale; // X轴 - 情感类型
                this.particles.positions[i3 + 1] = Math.max(0, (safeValence + 100) / 2 / 100 * this.axisLength) + (Math.random() - 0.5) * offsetScale; // Y轴 - 效价
                this.particles.positions[i3 + 2] = Math.max(0, (safeArousal / 100) * this.axisLength) + (Math.random() - 0.5) * offsetScale; // Z轴 - 唤醒度
            }
            
            // 更新生命周期
            this.particles.life[i]++;
            
            // 计算生命周期百分比
            const lifePercent = this.particles.life[i] / this.particles.maxLife[i];
            
            // 计算目标位置 - 确保始终在正轴上
            // 情感类型在X轴
            const targetX = emotionTypePos;
            
            // Y轴是效价(-100到+100)，映射到0-100范围
            const mappedValence = (safeValence + 100) / 2; // 将-100到100映射到0到100
            const targetY = (mappedValence / 100) * this.axisLength; // 映射到0到axisLength
            
            // Z轴是唤醒度(0到100)
            const targetZ = (safeArousal / 100) * this.axisLength;
            
            // 粒子簇的大小基于置信度 - 放大
            const clusterSize = 150 * (1 - confidence * 0.7); // 放大三倍
            
            // 随机偏移，创建云状效果，但确保粒子不会进入负轴区域
            const randomOffsetX = (Math.random() * 0.7) * clusterSize;
            const randomOffsetY = (Math.random() * 0.7) * clusterSize;
            const randomOffsetZ = (Math.random() * 0.7) * clusterSize;
            
            // 设置粒子的目标位置，确保在正轴范围内
            this.particles.targetPositions[i3] = Math.max(0, targetX + randomOffsetX); // X轴 - 情感类型
            this.particles.targetPositions[i3 + 1] = Math.max(0, targetY + randomOffsetY); // Y轴 - 效价
            this.particles.targetPositions[i3 + 2] = Math.max(0, targetZ + randomOffsetZ); // Z轴 - 唤醒度
            
            // 计算粒子大小和颜色基于生命周期
            const sizeFactor = Math.sin(lifePercent * Math.PI); // 0->1->0
            const colorFactor = Math.sin(lifePercent * Math.PI); // 直接使用完整周期，移除淡入淡出效果
            
            // 根据情感类型调整颜色，使用更饱和的颜色
            this.particles.colors[i3] = Math.min(1.0, r * brightness) * colorFactor;
            this.particles.colors[i3 + 1] = Math.min(1.0, g * brightness) * colorFactor;
            this.particles.colors[i3 + 2] = Math.min(1.0, b * brightness) * colorFactor;
            
            // 调整粒子大小 - 更大更明显
            this.particles.sizes[i] = (20 + confidence * 40) * sizeFactor; // 进一步放大粒子
            
            // 如果粒子寿命结束，重置它
            if (lifePercent >= 1.0) {
                this.particles.active[i] = false;
            }
        }
        
        // 隐藏未使用的粒子（将它们移到视野外）
        for (let i = this.currentParticleCount; i < this.maxParticleCount; i++) {
            const i3 = i * 3;
            // 将非活跃粒子放在视野外
            this.particles.positions[i3] = 9999;
            this.particles.positions[i3 + 1] = 9999;
            this.particles.positions[i3 + 2] = 9999;
            // 设置颜色为透明
            this.particles.colors[i3] = 0;
            this.particles.colors[i3 + 1] = 0;
            this.particles.colors[i3 + 2] = 0;
            // 设置大小为0
            this.particles.sizes[i] = 0;
        }
        
        // 更新几何体属性
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.geometry.attributes.color.needsUpdate = true;
        this.particleSystem.geometry.attributes.size.needsUpdate = true;
    }
    
    // 更新粒子位置（平滑过渡效果）
    updateParticlePositions() {
        if (!this.particles) return;
        
        const damping = 0.15; // 阻尼系数 - 增加为更快的反应
        const dt = 0.016; // 时间步长
        
        // 更新粒子位置
        for (let i = 0; i < this.currentParticleCount; i++) {
            const i3 = i * 3;
            
            if (this.particles.active[i]) {
                // 简单的弹簧物理系统
                for (let j = 0; j < 3; j++) {
                    const idx = i3 + j;
                    const force = (this.particles.targetPositions[idx] - this.particles.positions[idx]) * damping;
                    this.particles.velocities[idx] += force;
                    this.particles.velocities[idx] *= 0.95; // 阻力
                    this.particles.positions[idx] += this.particles.velocities[idx] * dt;
                }
                
                // 添加一些随机运动使粒子看起来更活跃
                this.particles.positions[i3] += (Math.random() - 0.5) * 0.3;
                this.particles.positions[i3 + 1] += (Math.random() - 0.5) * 0.3;
                this.particles.positions[i3 + 2] += (Math.random() - 0.5) * 0.3;
            }
        }
    }
    
    // 动画循环
    animate() {
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        
        // 更新控制器
        if (this.controls) {
            this.controls.update();
        }
        
        // 更新粒子位置
        this.updateParticlePositions();
        
        // 渲染场景
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    // 窗口大小调整响应
    onWindowResize() {
        if (!this.camera || !this.renderer || !this.container) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    // 停止动画并清理资源
    dispose() {
        // 停止动画循环
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // 移除事件监听器
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        document.removeEventListener('emotionFusionUpdate', this.handleEmotionUpdate.bind(this));
        
        // 清理标签
        if (this.labels) {
            Object.values(this.labels).forEach(label => {
                if (label && label.parentNode) {
                    label.parentNode.removeChild(label);
                }
            });
            this.labels = {};
        }
        
        // 清理场景中的对象
        if (this.scene) {
            // 移除坐标轴辅助
            this.axisHelpers.forEach(helper => {
                this.scene.remove(helper);
            });
            this.axisHelpers = [];
            
            // 移除粒子系统
            if (this.particleSystem) {
                this.scene.remove(this.particleSystem);
                this.particleSystem.geometry.dispose();
                this.particleSystem.material.dispose();
                this.particleSystem = null;
            }
            
            // 清空场景
            while (this.scene.children.length > 0) {
                const object = this.scene.children[0];
                this.scene.remove(object);
            }
        }
        
        // 清理渲染器
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement) {
                this.container.removeChild(this.renderer.domElement);
            }
            this.renderer = null;
        }
        
        // 重置属性
        this.camera = null;
        this.scene = null;
        this.controls = null;
        this.container = null;
        this.isInitialized = false;
        this.particles = null;
        
        console.log('情感3D模型已释放资源');
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    // 创建实例并导出
    const emotionModel = new EmotionModel();
    module.exports = emotionModel;
} else {
    // 浏览器环境，将其附加到窗口对象
    window.EmotionModel = EmotionModel;
    window.emotionModel = new EmotionModel();
}

// 创建实例并自动初始化 - 改为仅在浏览器环境且没有require时执行
if (typeof module === 'undefined' || !module.exports) {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            console.log('情感3D模型模块加载完成，等待初始化...');
            // 如果window.emotionModel已存在，则不需要再创建
            if (!window.emotionModel) {
                window.emotionModel = new EmotionModel();
            }
            
            // 延迟初始化，确保容器元素已创建
            setTimeout(() => {
                if (window.emotionModel && typeof window.emotionModel.init === 'function') {
                    window.emotionModel.init();
                }
            }, 1000);
        } catch (err) {
            console.error('初始化情感3D模型失败:', err);
        }
    });
} 