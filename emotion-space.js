import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// 创建场景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

// 创建相机
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / 2 / window.innerHeight, 0.1, 1000);
camera.position.set(2, 2, 2);
camera.lookAt(0, 0, 0);

// 创建渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth / 2, window.innerHeight);

// 创建坐标轴
const axesHelper = new THREE.AxesHelper(1.5);
scene.add(axesHelper);

// 创建网格
const gridHelper = new THREE.GridHelper(2, 20);
scene.add(gridHelper);

// 创建控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 创建坐标轴标签
const createLabel = (text, position) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '48px Arial';
    context.fillStyle = 'black';
    context.fillText(text, 10, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(0.5, 0.5, 1);
    return sprite;
};

// 添加标签
scene.add(createLabel('效价', new THREE.Vector3(1.7, 0, 0)));
scene.add(createLabel('唤醒度', new THREE.Vector3(0, 1.7, 0)));
scene.add(createLabel('情感类型', new THREE.Vector3(0, 0, 1.7)));

// 创建情感点
const emotionPoint = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
scene.add(emotionPoint);

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// 窗口大小调整
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / 2 / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
});

// 导出初始化函数
export function initEmotionSpace(container) {
    container.appendChild(renderer.domElement);
    animate();
    return {
        updateEmotionPoint: (valence, arousal, type) => {
            emotionPoint.position.set(
                valence * 1.5 - 0.75,  // 效价 (-0.75 到 0.75)
                arousal * 1.5 - 0.75,  // 唤醒度 (-0.75 到 0.75)
                type * 1.5 - 0.75      // 情感类型 (-0.75 到 0.75)
            );
        }
    };
}