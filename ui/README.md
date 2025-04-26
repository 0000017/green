# Green - 情感疗愈交互设计 UI系统文档

## 项目概述

Green是一个基于表达性艺术疗愈和情感计算系统的情感疗愈应用。主要功能是通过P5.js预设绘画效果辅助用户表达和发掘内心情感，并通过情感计算系统获取用户生理数据（情绪、心率、皮电等），构建情感可视系统，帮助用户更好地认知自己的情绪状态。

## UI模块结构

项目UI模块采用了模块化设计，主要由以下部分组成：

```
ui/
├── css/               # 样式文件目录
│   ├── navigator.css  # 页面导航系统样式
│   └── welcome.css    # 欢迎页面专用样式
├── js/                # JavaScript脚本目录
│   ├── navigator.js   # 页面导航系统逻辑
│   └── welcome.js     # 欢迎页面脚本
└── pages/             # 页面模板目录
    ├── welcome.html   # 欢迎页面
    ├── intro.html     # 项目介绍页面
    ├── device-setup.html     # 设备设置页面
    ├── drawing-preset.html   # 绘画预设页面
    ├── emotion-preset.html   # 情感预设页面
    └── analysis.html         # 效果评估页面
```

## 页面流程

应用遵循以下页面流程，引导用户完成整个体验：

1. **欢迎页面** (welcome.html)：应用启动首页，展示应用名称和设计理念
2. **介绍页面** (intro.html)：介绍应用功能和使用方法
3. **设备设置页面** (device-setup.html)：引导用户连接并测试情感计算设备
4. **绘画预设页面** (drawing-preset.html)：用户选择绘画风格和工具
5. **情感预设页面** (emotion-preset.html)：设置情感计算系统参数
6. **主应用页面** (main-app-page)：核心功能页面，集成绘画和情感分析
7. **分析页面** (analysis.html)：展示用户情感变化和使用结果

## 整体架构

### 核心功能模块

1. **页面导航系统**
   - 动态加载页面内容，无需刷新整个应用
   - 支持页面间平滑过渡动画
   - 维护导航历史记录，支持返回功能
   - 特殊处理主应用页面，保持其独立性

2. **面部情绪识别模块** (opencv/)
   - 基于face-api.js识别面部表情
   - 提供实时情绪分类和置信度
   - 可视化显示识别结果

3. **生物传感器模块** (arhuino/)
   - 通过Arduino采集生理数据（心率、皮电）
   - 计算心率变异性、脉搏波形等衍生指标
   - 提供数据可视化界面
   - 串口通信与数据处理

4. **情感融合系统**
   - 将面部情绪与生理数据融合为三维情感模型
   - X轴（效价）：表情效价 + 心率变异性
   - Y轴（唤醒度）：心率 + 脉搏信号特征
   - Z轴（情感类型）：表情分类为主，生理数据验证

5. **P5.js绘画工具** (P5/)
   - 基于情感数据生成不同绘画效果
   - 支持多种绘画工具和模式
   - 响应情感变化调整画面参数

6. **3D情感模型可视化** (three/)
   - 使用Three.js构建三维情感空间
   - 实时显示用户当前情感状态
   - 可交互旋转和缩放模型

### 应用核心流程

```
输入设备 → 数据采集 → 情感计算 → 交互响应 → 数据分析
  ↑           ↑           ↑           ↑           ↑
摄像头      Arduino     多模态融合   绘画工具     报告
传感器                               3D可视化
```

## 导航系统

### 核心特性

- **自动页面加载**：通过JavaScript动态加载页面内容，避免完整页面刷新
- **平滑过渡动画**：页面之间使用淡入淡出效果实现平滑过渡
- **导航按钮**：自动生成"前进"和"后退"按钮，方便用户操作
- **历史记录**：支持返回到之前访问的页面
- **特殊页面处理**：对主应用页面等特殊页面提供自定义处理逻辑

### 主应用页面特殊处理

主应用页面（绘画和情感分析页面）是核心功能页面，它有特殊的处理逻辑：

- 内容直接嵌入在index.html的main-app-content元素中，不是单独的HTML文件
- 使用特殊路径标记（'#main-app-content'）而非HTML文件路径
- 不受导航系统样式影响，保持原有设计和功能
- 在导航流程中可以正常访问，但不显示导航按钮
- 避免CSS样式冲突，使主应用页面的复杂组件能正常工作

### 子页面导航逻辑

某些页面（如分析页面）包含自己的子导航系统，实现内部内容的分步导航。以下是实现子页面导航的关键要点：

#### 1. 子页面初始化问题

子页面可能遇到的主要问题是初始化时机：当作为独立页面加载时，通过`DOMContentLoaded`事件初始化；当作为主应用的子页面动态加载时，需要通过`pageLoaded`事件初始化。

解决方案：
```javascript
// 将初始化逻辑封装为函数
function initSubPageContent() {
    // 初始化子页面的UI和功能
}

// 双重事件监听，确保在任何场景下都能正确初始化
document.addEventListener('DOMContentLoaded', function() {
    // 作为独立页面加载时初始化
    if (!window.subPageInitialized) {
        initSubPageContent();
        window.subPageInitialized = true;
    }
});

// 监听主应用的页面加载事件
window.addEventListener('pageLoaded', function(event) {
    // 确认是目标子页面被加载
    if (event.detail.pageId === 'your-page-id' && !window.subPageInitialized) {
        // 延迟短暂时间确保DOM已完全加载
        setTimeout(initSubPageContent, 50);
        window.subPageInitialized = true;
    }
});
```

#### 2. 多级导航实现方案

对于像分析页面(analysis.html)这样的多步骤页面，可以实现内部的子导航系统：

```javascript
// 在子页面中定义步骤导航
function setupStepNavigation() {
    const prevBtn = document.getElementById('prev-step-btn');
    const nextBtn = document.getElementById('next-step-btn');
    const steps = document.querySelectorAll('.step-content');
    
    let currentStep = 0;
    
    // 更新显示哪个步骤内容
    function updateStepVisibility() {
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });
        
        // 更新按钮状态
        prevBtn.disabled = currentStep === 0;
        nextBtn.disabled = currentStep === steps.length - 1;
    }
    
    // 事件监听
    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            updateStepVisibility();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentStep < steps.length - 1) {
            currentStep++;
            updateStepVisibility();
        }
    });
    
    // 初始化显示
    updateStepVisibility();
}
```

#### 3. 子页面与主导航系统集成

要使子页面能够访问主导航系统的功能，并实现页面间的正确导航：

```html
<!-- 在子页面HTML中添加 -->
<script>
    // 连接到父窗口的导航系统
    document.addEventListener('DOMContentLoaded', function() {
        // 如果是在主应用中加载的
        if (window.parent && window.parent.navigateToPage) {
            // 复用父窗口的导航函数
            window.navigateToPage = window.parent.navigateToPage;
            
            // 修复页面内部的导航链接
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetPage = this.getAttribute('data-target');
                    window.navigateToPage(targetPage);
                });
            });
        }
    });
</script>
```

#### 4. 页面状态保存与恢复

为了确保在子页面之间导航时不丢失用户输入：

```javascript
// 保存子页面状态到localStorage
function saveSubPageState() {
    const state = {
        step: currentStep,
        // 其他需要保存的数据
        formData: collectFormData()
    };
    localStorage.setItem('subPageState', JSON.stringify(state));
}

// 恢复子页面状态
function restoreSubPageState() {
    const savedState = localStorage.getItem('subPageState');
    if (savedState) {
        const state = JSON.parse(savedState);
        currentStep = state.step;
        // 恢复其他数据
        restoreFormData(state.formData);
        updateStepVisibility();
    }
}
```

#### 5. 避免事件冲突

确保子页面的导航事件不会冒泡到父页面导航系统：

```javascript
// 阻止事件冒泡
subPageNavButton.addEventListener('click', function(e) {
    e.stopPropagation();  // 阻止事件冒泡
    handleSubNavigation();
});
```

## 使用方法

### 开发者指南

#### 添加新页面

1. 在`ui/pages/`目录下创建新的HTML页面文件
2. 在`ui/js/navigator.js`文件中的`PAGE_FLOW`和`PAGE_TITLES`数组中添加页面信息：

```javascript
// 页面顺序定义
const PAGE_FLOW = [
    // ... 现有页面 ...
    'your-new-page',
    // ... 其他页面 ...
];

// 页面标题映射
const PAGE_TITLES = {
    // ... 现有页面 ...
    'your-new-page': 'Green - 你的新页面标题',
    // ... 其他页面 ...
};
```

3. 在`index.html`的页面容器中添加新页面的容器：

```html
<div id="page-container" class="page-container">
    <!-- ... 现有页面容器 ... -->
    <div id="your-new-page" class="app-page"></div>
    <!-- ... 其他页面容器 ... -->
</div>
```

#### 注册特殊页面

如果新页面需要特殊处理（如主应用页面），在`SPECIAL_PAGES`对象中添加配置：

```javascript
const SPECIAL_PAGES = {
    // ... 现有特殊页面 ...
    'your-special-page': {
        skipNavigation: true,  // 跳过导航按钮
        skipTransition: true   // 跳过过渡动画
    }
};
```

#### 页面间导航

在页面内部，可以使用以下代码实现页面跳转：

```javascript
// 跳转到特定页面
if (window.navigateToPage) {
    window.navigateToPage('target-page-id');
}

// 返回上一页
if (window.goBack) {
    window.goBack();
}
```

### 页面开发注意事项

1. **样式隔离**：每个页面应尽量使用独立的CSS类名，避免样式冲突
2. **页面加载事件**：可以监听`pageLoaded`事件获取页面加载完成的通知
3. **脚本执行**：导航系统会自动执行页面内的脚本代码
4. **响应式设计**：所有页面应支持不同尺寸的屏幕

## 技术依赖

### 前端技术
- **原生JavaScript**：核心导航逻辑和UI交互
- **CSS3**：现代CSS特性实现过渡动画和响应式布局
- **Fetch API**：异步加载页面内容
- **P5.js**：创意绘画库，实现情感响应的艺术表达
- **Three.js**：3D图形渲染，构建三维情感模型可视化
- **dat.GUI**：提供轻量级控制面板

### 后端与通信
- **Electron**：桌面应用框架，创建跨平台应用
- **SerialPort**：与Arduino通信，采集生物传感器数据
- **Node.js**：运行时环境，支持串口通信和文件操作

### 数据处理
- **face-api.js**：面部情绪识别，基于TensorFlow.js
- **Arduino**：固件程序处理传感器原始数据

## 未来改进计划

- 支持更复杂的页面过渡动画
- 添加页面加载进度指示
- 实现页面状态保存和恢复
- 增强错误处理和用户提示
- 集成更多生物传感器，丰富情感数据采集
- 改进情感融合算法，提高情感识别准确性
- 扩展P5.js绘画预设，适应更多情感状态
