// emotion-model.js
// 基于Three.js的三维情感模型可视化模块

// 尝试获取THREE对象
let THREE;
try {
    if (typeof window !== 'undefined' && window.THREE) {
        console.log('使用全局THREE对象');
        THREE = window.THREE;
    } else {
        console.log('尝试require导入THREE');
        THREE = require('three');
    }
    console.log('THREE.js版本:', THREE.REVISION);
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
        this.emotionSphere = null;
        this.baseSphereRadius = 8; // 基础球体半径
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
        
        // 定义情感类型颜色映射 - 现在只用于标签显示，颜色由X轴决定
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
        
        // X轴颜色映射 (-100到+100 对应蓝到红)
        this.negativeColor = new THREE.Color(0x0000ff); // 蓝色 - 负效价
        this.positiveColor = new THREE.Color(0xff0000); // 红色 - 正效价
        
        // 粒子系统
        this.particles = null;
        this.particleCount = 200;
        this.particleSystem = null;
    }
    
    // 初始化Three.js场景
    init(containerSelector = '#emotion-model-container') {
        try {
            if (this.isInitialized) return true;
            
            console.log('初始化情感3D模型...');
            
            // 再次确保THREE对象可用
            if (!THREE || typeof THREE.Scene !== 'function') {
                console.error('THREE.js库未正确加载！请确保在页面中引入three.js库');
                
                // 尝试重新加载
                try {
                    if (typeof window !== 'undefined') {
                        THREE = window.THREE || require('three');
                        console.log('重新加载THREE成功，版本:', THREE.REVISION);
                    }
                } catch (reloadErr) {
                    console.error('重新加载THREE失败:', reloadErr);
                    return false;
                }
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
            this.scene.background = new THREE.Color(0xffffff); // 设置白色背景
            
            // 创建透视相机
            const aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
            
            // 设置相机位置为参考图中的视角 - 斜上方45度角视角
            this.camera.position.set(200, 150, 200);
            this.camera.lookAt(0, 0, 0);
            
            // 创建渲染器
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: false  // 禁用透明背景
            });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setClearColor(0xf5f5f5, 1); // 淡灰色背景，接近参考图
            this.container.appendChild(this.renderer.domElement);
            
            // 添加OrbitControls（如果可用）
            if (typeof OrbitControls === 'function') {
                this.controls = new OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true; // 添加阻尼效果
                this.controls.dampingFactor = 0.05;
                this.controls.rotateSpeed = 0.3;
                this.controls.minDistance = 50;
                this.controls.maxDistance = 400;
                
                // 设置初始视角，使情感球体清晰可见
                this.controls.target.set(0, 0, 0);
                
                // 限制垂直旋转角度，保持在俯视角度
                this.controls.minPolarAngle = Math.PI / 8; // 约22.5度
                this.controls.maxPolarAngle = Math.PI / 2.5; // 约72度
                
                this.controls.update();
                
                console.log('已启用OrbitControls');
            } else {
                // 设置默认相机位置
                this.camera.position.set(150, 100, 150);
                this.camera.lookAt(0, 0, 0);
            }
            
            // 添加灯光以改善可视化效果
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            this.scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(200, 200, 200);
            this.scene.add(directionalLight);
            
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
            
            // 立即渲染一帧，确保显示
            this.renderer.render(this.scene, this.camera);
            
            return true;
        } catch (err) {
            console.error('初始化情感3D模型出错:', err);
            console.error(err.stack);
            return false;
        }
    }
    
    // 创建坐标轴辅助和网格
    createAxisHelpers() {
        // 移除旧的复杂网格，改为简洁的坐标系
        
        // 创建简洁的X轴 (效价)
        const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-120, 0, 0),
            new THREE.Vector3(120, 0, 0)
        ]);
        const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
        this.scene.add(xAxis);
        this.axisHelpers.push(xAxis);
        
        // 创建X轴箭头
        const xArrowGeometry = new THREE.ConeGeometry(3, 10, 8);
        const xArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const xArrow = new THREE.Mesh(xArrowGeometry, xArrowMaterial);
        xArrow.position.set(120, 0, 0);
        xArrow.rotation.z = -Math.PI / 2;
        this.scene.add(xArrow);
        this.axisHelpers.push(xArrow);
        
        // 创建Y轴 (唤醒度)
        const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 120, 0)
        ]);
        const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
        this.scene.add(yAxis);
        this.axisHelpers.push(yAxis);
        
        // 创建Y轴箭头
        const yArrowGeometry = new THREE.ConeGeometry(3, 10, 8);
        const yArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const yArrow = new THREE.Mesh(yArrowGeometry, yArrowMaterial);
        yArrow.position.set(0, 120, 0);
        this.scene.add(yArrow);
        this.axisHelpers.push(yArrow);
        
        // 创建Z轴 (情感类型)
        const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, -120),
            new THREE.Vector3(0, 0, 120)
        ]);
        const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
        this.scene.add(zAxis);
        this.axisHelpers.push(zAxis);
        
        // 创建Z轴箭头
        const zArrowGeometry = new THREE.ConeGeometry(3, 10, 8);
        const zArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const zArrow = new THREE.Mesh(zArrowGeometry, zArrowMaterial);
        zArrow.position.set(0, 0, 120);
        zArrow.rotation.x = Math.PI / 2;
        this.scene.add(zArrow);
        this.axisHelpers.push(zArrow);
        
        // 添加原点标记
        const originGeometry = new THREE.SphereGeometry(2, 16, 16);
        const originMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const originSphere = new THREE.Mesh(originGeometry, originMaterial);
        originSphere.position.set(0, 0, 0);
        this.scene.add(originSphere);
        this.axisHelpers.push(originSphere);
        
        // 添加简单的网格线 - 只在XZ平面上显示
        const gridSize = 200;
        const gridDivisions = 10;
        const gridColor = 0xCCCCCC;
        
        const grid = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
        grid.position.y = 0;
        grid.material.transparent = true;
        grid.material.opacity = 0.3;
        this.scene.add(grid);
        this.axisHelpers.push(grid);
    }
    
    // 创建情感球体
    createEmotionSphere() {
        // 创建情感球体几何体 - 使用更小的半径，更接近参考图
        const geometry = new THREE.SphereGeometry(6, 32, 32);
        
        // 创建发光材质 - 初始为中性色
        const material = new THREE.MeshPhongMaterial({
            color: 0xd84dff, // 紫色，接近参考图
            shininess: 80,
            transparent: true,
            opacity: 0.7
        });
        
        // 创建发光球体
        this.emotionSphere = new THREE.Mesh(geometry, material);
        this.emotionSphere.position.set(0, 0, 0);
        this.scene.add(this.emotionSphere);
        
        // 添加情感球体光晕
        this.addGlow(this.emotionSphere);
        
        // 创建粒子系统
        this.createParticleSystem();
    }
    
    // 创建粒子系统
    createParticleSystem() {
        // 创建粒子几何体
        const particlesGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);
        
        // 初始化粒子位置和颜色
        for (let i = 0; i < this.particleCount; i++) {
            // 随机分布在球体周围
            const radius = this.baseSphereRadius * 3;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            
            // 初始颜色为白色
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 1;
            
            // 随机大小
            sizes[i] = 2 + Math.random() * 2;
        }
        
        // 设置粒子几何体属性
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // 创建粒子材质 - 使用自定义着色器增强外观
        const particleTexture = this.createParticleTexture();
        
        const particlesMaterial = new THREE.PointsMaterial({
            size: 3,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            map: particleTexture
        });
        
        // 创建粒子系统
        this.particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
        this.scene.add(this.particleSystem);
        
        // 保存粒子数据以便更新
        this.particles = {
            positions: positions,
            colors: colors,
            sizes: sizes,
            velocities: new Float32Array(this.particleCount * 3),
            geometry: particlesGeometry
        };
    }
    
    // 创建粒子纹理
    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // 创建一个圆形渐变
        const gradient = context.createRadialGradient(
            32, 32, 0,
            32, 32, 32
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        // 绘制圆形
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(32, 32, 32, 0, Math.PI * 2);
        context.fill();
        
        // 创建Three.js纹理
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    // 添加发光效果
    addGlow(object) {
        // 创建更大的球体作为光晕
        const glowGeometry = new THREE.SphereGeometry(this.baseSphereRadius * 1.7, 32, 32);
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
        // 清除原有DOM标签，改为使用CSS样式定位
        
        // X轴标签 (效价)
        const xLabel = document.createElement('div');
        xLabel.className = 'axis-label x-axis-label';
        xLabel.textContent = 'X轴 (效价)';
        xLabel.style.position = 'absolute';
        xLabel.style.right = '10%';
        xLabel.style.bottom = '48%';
        xLabel.style.fontSize = '14px';
        this.container.appendChild(xLabel);
        this.labels.xLabel = xLabel;
        
        // 标注范围
        const xRangeLabel = document.createElement('div');
        xRangeLabel.className = 'axis-label x-range-label';
        xRangeLabel.textContent = '-100~+100';
        xRangeLabel.style.position = 'absolute';
        xRangeLabel.style.right = '10%';
        xRangeLabel.style.bottom = '44%';
        xRangeLabel.style.fontSize = '12px';
        xRangeLabel.style.color = '#666';
        this.container.appendChild(xRangeLabel);
        this.labels.xRangeLabel = xRangeLabel;
        
        // Y轴标签 (唤醒度)
        const yLabel = document.createElement('div');
        yLabel.className = 'axis-label y-axis-label';
        yLabel.textContent = 'Y轴 (唤醒度)';
        yLabel.style.position = 'absolute';
        yLabel.style.left = '10%';
        yLabel.style.top = '10%';
        yLabel.style.fontSize = '14px';
        this.container.appendChild(yLabel);
        this.labels.yLabel = yLabel;
        
        // 标注范围
        const yRangeLabel = document.createElement('div');
        yRangeLabel.className = 'axis-label y-range-label';
        yRangeLabel.textContent = '0~100';
        yRangeLabel.style.position = 'absolute';
        yRangeLabel.style.left = '10%';
        yRangeLabel.style.top = '14%';
        yRangeLabel.style.fontSize = '12px';
        yRangeLabel.style.color = '#666';
        this.container.appendChild(yRangeLabel);
        this.labels.yRangeLabel = yRangeLabel;
        
        // Z轴标签 (情感类型)
        const zLabel = document.createElement('div');
        zLabel.className = 'axis-label z-axis-label';
        zLabel.textContent = 'Z轴 (情感类型)';
        zLabel.style.position = 'absolute';
        zLabel.style.right = '35%';
        zLabel.style.bottom = '10%';
        zLabel.style.fontSize = '14px';
        this.container.appendChild(zLabel);
        this.labels.zLabel = zLabel;
        
        // 当前情感类型标签
        const emotionTypeLabel = document.createElement('div');
        emotionTypeLabel.className = 'emotion-type-label';
        emotionTypeLabel.textContent = '未检测';
        emotionTypeLabel.style.position = 'absolute';
        emotionTypeLabel.style.left = '50%';
        emotionTypeLabel.style.top = '5%';
        emotionTypeLabel.style.transform = 'translateX(-50%)';
        emotionTypeLabel.style.background = 'rgba(0, 0, 0, 0.7)';
        emotionTypeLabel.style.padding = '5px 10px';
        emotionTypeLabel.style.borderRadius = '4px';
        this.container.appendChild(emotionTypeLabel);
        this.labels.emotionType = emotionTypeLabel;
        
        // 添加坐标系的名称标签 - 显示在左上角
        const coordSystemLabel = document.createElement('div');
        coordSystemLabel.className = 'axis-label coord-system-label';
        coordSystemLabel.textContent = '情感三维坐标系';
        coordSystemLabel.style.position = 'absolute';
        coordSystemLabel.style.left = '10px';
        coordSystemLabel.style.top = '10px';
        coordSystemLabel.style.fontSize = '16px';
        coordSystemLabel.style.fontWeight = 'bold';
        this.container.appendChild(coordSystemLabel);
        this.labels.coordSystemLabel = coordSystemLabel;
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
        
        // 添加调试日志
        console.log('情感模型接收到数据:', emotionData);
        
        // 更新最后的情感数据
        this.lastEmotionData = emotionData;
        
        // 更新模型位置
        this.updateEmotionModel(emotionData);
    }
    
    // 更新情感模型
    updateEmotionModel(emotionData) {
        if (!this.emotionSphere) {
            console.error('情感球体未初始化');
            return;
        }
        
        const { X, Y, Z, confidence } = emotionData;
        
        // 添加调试日志
        console.log(`更新情感模型: X=${X}, Y=${Y}, Z=${Z}, 置信度=${confidence}`);
        
        // 映射X坐标 (效价) 范围从 -100~100 到 -100~100
        const xPos = X;
        
        // 映射Y坐标 (唤醒度) 范围从 0~100 到 0~100
        const yPos = Y;
        
        // 获取Z坐标 (情感类型) 使用预定义的情感位置或默认值0
        const zPos = this.emotionZPos[Z] || 0;
        
        // 添加直接设置位置的代码，确保位置发生变化
        this.emotionSphere.position.set(xPos, yPos, zPos);
        
        // 基于X轴位置(-100到+100)计算颜色 - 从蓝色到红色的渐变
        const colorPosition = (X + 100) / 200; // 归一化为0-1
        const color = new THREE.Color().lerpColors(
            this.negativeColor,
            this.positiveColor,
            colorPosition
        );
        
        // 基于Y轴位置(0到100)调整明暗
        const brightness = 0.3 + (Y / 100) * 0.7; // 0.3-1.0
        color.multiplyScalar(brightness);
        
        // 更新情感球体颜色和不透明度
        this.updateEmotionColor(color, confidence);
        this.updateEmotionSize(confidence);
        
        // 更新轨迹
        this.updateTrail(xPos, yPos, zPos);
        
        // 更新粒子系统 - 基于情感类型改变粒子行为
        this.updateParticles(X, Y, Z, confidence);
        
        // 更新情感类型标签 - 使用类似参考图的格式
        if (this.labels.emotionType) {
            // 添加置信度显示，格式：情感类型 (置信度%)
            const confidencePercent = Math.round(confidence * 100);
            this.labels.emotionType.textContent = `${Z} (${confidencePercent}%)`;
            
            // 根据情感类型设置不同的颜色
            switch(Z) {
                case '开心':
                    this.labels.emotionType.style.background = 'rgba(255, 193, 7, 0.8)'; // 金黄色
                    break;
                case '悲伤':
                    this.labels.emotionType.style.background = 'rgba(33, 150, 243, 0.8)'; // 蓝色
                    break;
                case '愤怒':
                    this.labels.emotionType.style.background = 'rgba(244, 67, 54, 0.8)'; // 红色
                    break;
                case '惊讶':
                    this.labels.emotionType.style.background = 'rgba(255, 152, 0, 0.8)'; // 橙色
                    break;
                case '恐惧':
                    this.labels.emotionType.style.background = 'rgba(156, 39, 176, 0.8)'; // 紫色
                    break;
                case '厌恶':
                    this.labels.emotionType.style.background = 'rgba(76, 175, 80, 0.8)'; // 绿色
                    break;
                case '中性':
                    this.labels.emotionType.style.background = 'rgba(158, 158, 158, 0.8)'; // 灰色
                    break;
                default:
                    this.labels.emotionType.style.background = 'rgba(97, 97, 97, 0.8)'; // 深灰色
            }
        }
        
        // 确保渲染器更新
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    // 更新情感球体颜色 - 现在接收THREE.Color对象
    updateEmotionColor(color, confidence) {
        // 根据置信度调整不透明度
        const opacity = 0.3 + confidence * 0.7;
        
        // 更新主球体颜色和不透明度
        this.emotionSphere.material.color.copy(color);
        this.emotionSphere.material.opacity = opacity;
        
        // 更新光晕颜色
        if (this.emotionSphere.userData.glowMesh) {
            this.emotionSphere.userData.glowMesh.material.color.copy(color);
            this.emotionSphere.userData.glowMesh.material.opacity = opacity * 0.4;
        }
    }
    
    // 更新情感球体大小
    updateEmotionSize(confidence) {
        // 置信度越高，球体越大
        const minScale = 0.7;  // 最小缩放比例
        const maxScale = 1.5;  // 最大缩放比例
        
        // 计算当前缩放比例
        const scale = minScale + (confidence * (maxScale - minScale));
        
        // 应用平滑缩放
        const currentScale = this.emotionSphere.scale.x;
        const newScale = currentScale + (scale - currentScale) * 0.1;
        
        // 更新球体缩放
        this.emotionSphere.scale.set(newScale, newScale, newScale);
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
    
    // 更新粒子系统
    updateParticles(X, Y, Z, confidence) {
        if (!this.particleSystem || !this.particles) return;
        
        const positions = this.particles.positions;
        const colors = this.particles.colors;
        const sizes = this.particles.sizes;
        const velocities = this.particles.velocities;
        
        // 基于情感类型设置不同的行为模式
        let behavior = 'normal';
        let speed = 0.2 + (confidence * 0.5);
        let turbulence = 0.1;
        let sizeMultiplier = 1.0;
        
        switch (Z) {
            case '开心':
                behavior = 'expand';
                speed = 0.4 + (confidence * 0.6);
                turbulence = 0.05;
                sizeMultiplier = 1.5;
                break;
            case '悲伤':
                behavior = 'contract';
                speed = 0.1 + (confidence * 0.3);
                turbulence = 0.02;
                sizeMultiplier = 0.8;
                break;
            case '愤怒':
                behavior = 'turbulent';
                speed = 0.3 + (confidence * 0.7);
                turbulence = 0.3;
                sizeMultiplier = 1.4;
                break;
            case '惊讶':
                behavior = 'burst';
                speed = 0.5 + (confidence * 0.5);
                turbulence = 0.15;
                sizeMultiplier = 1.3;
                break;
            case '恐惧':
                behavior = 'erratic';
                speed = 0.2 + (confidence * 0.4);
                turbulence = 0.25;
                sizeMultiplier = 0.9;
                break;
            case '厌恶':
                behavior = 'repel';
                speed = 0.3 + (confidence * 0.4);
                turbulence = 0.2;
                sizeMultiplier = 1.1;
                break;
            case '中性':
                behavior = 'calm';
                speed = 0.1;
                turbulence = 0.01;
                sizeMultiplier = 1.0;
                break;
        }
        
        // 计算情感球体位置，作为粒子系统的中心
        const centerX = this.emotionSphere.position.x;
        const centerY = this.emotionSphere.position.y;
        const centerZ = this.emotionSphere.position.z;
        
        // 生成与X轴位置对应的颜色 (-100到+100 映射到蓝到红)
        const colorPosition = (X + 100) / 200; // 归一化为0-1
        const baseColor = new THREE.Color().lerpColors(
            this.negativeColor,
            this.positiveColor,
            colorPosition
        );
        
        // Y轴影响亮度
        const brightness = 0.5 + (Y / 100) * 0.5; // 0.5-1.0
        
        // 更新每个粒子
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            // 获取当前位置
            let x = positions[i3];
            let y = positions[i3 + 1];
            let z = positions[i3 + 2];
            
            // 计算到中心的距离
            const dx = x - centerX;
            const dy = y - centerY;
            const dz = z - centerZ;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            // 基于行为模式更新速度和位置
            switch (behavior) {
                case 'expand':
                    // 粒子向外扩散
                    velocities[i3] = (dx / distance) * speed;
                    velocities[i3 + 1] = (dy / distance) * speed;
                    velocities[i3 + 2] = (dz / distance) * speed;
                    break;
                case 'contract':
                    // 粒子向内收缩
                    velocities[i3] = -(dx / distance) * speed * 0.5;
                    velocities[i3 + 1] = -(dy / distance) * speed * 0.5;
                    velocities[i3 + 2] = -(dz / distance) * speed * 0.5;
                    break;
                case 'turbulent':
                    // 湍流运动
                    velocities[i3] += (Math.random() - 0.5) * turbulence;
                    velocities[i3 + 1] += (Math.random() - 0.5) * turbulence;
                    velocities[i3 + 2] += (Math.random() - 0.5) * turbulence;
                    break;
                case 'burst':
                    // 爆发式运动
                    if (Math.random() > 0.95) {
                        velocities[i3] = (Math.random() - 0.5) * speed * 3;
                        velocities[i3 + 1] = (Math.random() - 0.5) * speed * 3;
                        velocities[i3 + 2] = (Math.random() - 0.5) * speed * 3;
                    }
                    break;
                case 'erratic':
                    // 不规则运动
                    if (Math.random() > 0.7) {
                        velocities[i3] = (Math.random() - 0.5) * speed * 2;
                        velocities[i3 + 1] = (Math.random() - 0.5) * speed * 2;
                        velocities[i3 + 2] = (Math.random() - 0.5) * speed * 2;
                    }
                    break;
                case 'repel':
                    // 排斥运动
                    if (distance < this.baseSphereRadius * 5) {
                        velocities[i3] = (dx / distance) * speed;
                        velocities[i3 + 1] = (dy / distance) * speed;
                        velocities[i3 + 2] = (dz / distance) * speed;
                    }
                    break;
                case 'calm':
                    // 平静运动
                    velocities[i3] *= 0.95;
                    velocities[i3 + 1] *= 0.95;
                    velocities[i3 + 2] *= 0.95;
                    velocities[i3 + 1] -= 0.01; // 轻微下沉
                    break;
                default:
                    // 默认行为
                    velocities[i3] += (Math.random() - 0.5) * 0.1;
                    velocities[i3 + 1] += (Math.random() - 0.5) * 0.1;
                    velocities[i3 + 2] += (Math.random() - 0.5) * 0.1;
            }
            
            // 应用速度
            positions[i3] += velocities[i3];
            positions[i3 + 1] += velocities[i3 + 1];
            positions[i3 + 2] += velocities[i3 + 2];
            
            // 限制粒子距离，防止飞得太远
            const newDistance = Math.sqrt(
                Math.pow(positions[i3] - centerX, 2) + 
                Math.pow(positions[i3 + 1] - centerY, 2) + 
                Math.pow(positions[i3 + 2] - centerZ, 2)
            );
            
            if (newDistance > this.baseSphereRadius * 10) {
                // 重置回合理范围
                const angle1 = Math.random() * Math.PI * 2;
                const angle2 = Math.random() * Math.PI;
                const radius = this.baseSphereRadius * (3 + Math.random() * 5);
                
                positions[i3] = centerX + radius * Math.sin(angle2) * Math.cos(angle1);
                positions[i3 + 1] = centerY + radius * Math.sin(angle2) * Math.sin(angle1);
                positions[i3 + 2] = centerZ + radius * Math.cos(angle2);
                
                velocities[i3] = 0;
                velocities[i3 + 1] = 0;
                velocities[i3 + 2] = 0;
            }
            
            // 更新颜色 - 每个粒子根据距离中心的远近调整基础颜色
            const distanceFactor = Math.min(newDistance / (this.baseSphereRadius * 5), 1);
            const particleColor = baseColor.clone();
            
            // 调整亮度 - 融合Y轴的亮度影响
            particleColor.multiplyScalar(brightness * (1 - distanceFactor * 0.5));
            
            // 设置颜色
            colors[i3] = particleColor.r;
            colors[i3 + 1] = particleColor.g;
            colors[i3 + 2] = particleColor.b;
            
            // 更新粒子大小 - 情感强度(confidence)和情感类型(Z)影响
            const baseSizeFactor = 0.5 + confidence * 0.5; // 0.5-1.0
            const distanceSizeFactor = 1.0 - (distanceFactor * 0.3); // 距离越远越小
            // 加入随机波动
            const pulseFactor = 1.0 + (0.1 * Math.sin(Date.now() * 0.001 + i * 0.1));
            
            // 计算最终大小
            sizes[i] = (2 + Math.random() * 3) * baseSizeFactor * sizeMultiplier * distanceSizeFactor * pulseFactor;
        }
        
        // 更新粒子系统的几何体
        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.geometry.attributes.color.needsUpdate = true;
        this.particles.geometry.attributes.size.needsUpdate = true;
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
        
        // 检查并确保情感球体存在
        if (!this.emotionSphere) {
            console.error('情感球体不存在，无法进行动画渲染');
            return;
        }
        
        // 如果有轨道控制器，使用它
        if (this.controls) {
            this.controls.update();
        } else {
            // 否则使用默认的旋转动画
            const time = Date.now() * 0.0002;
            const radius = 200;
            this.camera.position.x = Math.sin(time) * radius;
            this.camera.position.z = Math.cos(time) * radius;
            this.camera.lookAt(0, 0, 0);
        }
        
        // 更新粒子动画
        if (this.particleSystem && this.particles) {
            // 添加一些轻微自动动画，即使没有情感数据更新也能有动态效果
            const positions = this.particles.positions;
            const velocities = this.particles.velocities;
            const sizes = this.particles.sizes;
            
            // 获取当前时间用于动画效果
            const time = Date.now() * 0.001;
            
            for (let i = 0; i < this.particleCount; i++) {
                const i3 = i * 3;
                
                // 添加一点随机运动
                velocities[i3] += (Math.random() - 0.5) * 0.03;
                velocities[i3 + 1] += (Math.random() - 0.5) * 0.03;
                velocities[i3 + 2] += (Math.random() - 0.5) * 0.03;
                
                // 阻尼因子 - 让粒子不会加速太快
                velocities[i3] *= 0.99;
                velocities[i3 + 1] *= 0.99;
                velocities[i3 + 2] *= 0.99;
                
                // 应用速度
                positions[i3] += velocities[i3];
                positions[i3 + 1] += velocities[i3 + 1];
                positions[i3 + 2] += velocities[i3 + 2];
                
                // 脉动大小效果 - 即使没有情感数据更新，粒子也会有呼吸感
                const pulseFactor = 1.0 + 0.2 * Math.sin(time * 2 + i * 0.1);
                sizes[i] = Math.max(sizes[i] * 0.98, 1.0) * pulseFactor;
                
                // 检查粒子是否飞得太远，如果是则重置位置
                const centerX = this.emotionSphere.position.x;
                const centerY = this.emotionSphere.position.y; 
                const centerZ = this.emotionSphere.position.z;
                
                const dx = positions[i3] - centerX;
                const dy = positions[i3 + 1] - centerY;
                const dz = positions[i3 + 2] - centerZ;
                const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                if (distance > this.baseSphereRadius * 15) {
                    // 重置到情感球周围
                    const angle1 = Math.random() * Math.PI * 2;
                    const angle2 = Math.random() * Math.PI;
                    const radius = this.baseSphereRadius * (3 + Math.random() * 4);
                    
                    positions[i3] = centerX + radius * Math.sin(angle2) * Math.cos(angle1);
                    positions[i3 + 1] = centerY + radius * Math.sin(angle2) * Math.sin(angle1);
                    positions[i3 + 2] = centerZ + radius * Math.cos(angle2);
                    
                    // 重置速度
                    velocities[i3] = 0;
                    velocities[i3 + 1] = 0;
                    velocities[i3 + 2] = 0;
                }
            }
            
            // 更新粒子系统
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.geometry.attributes.size.needsUpdate = true;
        }
        
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
        
        // 处理OrbitControls
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
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