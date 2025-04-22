/**
 * Green - 情感疗愈交互设计
 * 公共JavaScript工具库
 */

// 命名空间，避免全局变量污染
const Green = {
    // 当前版本
    version: '1.0.0',
    
    // 初始化函数
    init: function() {
        console.log('Green UI工具库初始化');
        Green.initScrollReveal();
        Green.initEventListeners();
        Green.preloadImages();
    },
    
    /**
     * DOM操作工具
     */
    dom: {
        // 获取元素，类似jQuery的$，支持CSS选择器
        get: function(selector) {
            return document.querySelector(selector);
        },
        
        // 获取所有匹配的元素
        getAll: function(selector) {
            return document.querySelectorAll(selector);
        },
        
        // 创建元素
        create: function(tag, attributes = {}, content = '') {
            const element = document.createElement(tag);
            
            // 设置属性
            for (const key in attributes) {
                if (key === 'class') {
                    element.className = attributes[key];
                } else if (key === 'dataset') {
                    for (const dataKey in attributes[key]) {
                        element.dataset[dataKey] = attributes[key][dataKey];
                    }
                } else {
                    element.setAttribute(key, attributes[key]);
                }
            }
            
            // 设置内容
            if (content) {
                element.innerHTML = content;
            }
            
            return element;
        },
        
        // 添加元素到父元素中
        append: function(parent, element) {
            if (typeof parent === 'string') {
                parent = this.get(parent);
            }
            parent.appendChild(element);
            return element;
        },
        
        // 添加或移除类
        toggleClass: function(element, className) {
            if (typeof element === 'string') {
                element = this.get(element);
            }
            element.classList.toggle(className);
            return element;
        },
        
        // 添加类
        addClass: function(element, className) {
            if (typeof element === 'string') {
                element = this.get(element);
            }
            element.classList.add(className);
            return element;
        },
        
        // 移除类
        removeClass: function(element, className) {
            if (typeof element === 'string') {
                element = this.get(element);
            }
            element.classList.remove(className);
            return element;
        },
        
        // 检查元素是否有某个类
        hasClass: function(element, className) {
            if (typeof element === 'string') {
                element = this.get(element);
            }
            return element.classList.contains(className);
        }
    },
    
    /**
     * 事件处理工具
     */
    events: {
        // 添加事件监听器
        on: function(element, event, callback) {
            if (typeof element === 'string') {
                element = Green.dom.get(element);
            }
            element.addEventListener(event, callback);
            return element;
        },
        
        // 移除事件监听器
        off: function(element, event, callback) {
            if (typeof element === 'string') {
                element = Green.dom.get(element);
            }
            element.removeEventListener(event, callback);
            return element;
        },
        
        // 触发一次性事件监听器
        once: function(element, event, callback) {
            if (typeof element === 'string') {
                element = Green.dom.get(element);
            }
            
            const wrapper = function(...args) {
                callback.apply(this, args);
                element.removeEventListener(event, wrapper);
            };
            
            element.addEventListener(event, wrapper);
            return element;
        },
        
        // 触发自定义事件
        trigger: function(element, eventName, detail = {}) {
            if (typeof element === 'string') {
                element = Green.dom.get(element);
            }
            
            const event = new CustomEvent(eventName, {
                bubbles: true,
                cancelable: true,
                detail: detail
            });
            
            element.dispatchEvent(event);
            return element;
        }
    },
    
    /**
     * 动画效果工具
     */
    animation: {
        // 淡入效果
        fadeIn: function(element, duration = 300, callback) {
            if (typeof element === 'string') {
                element = Green.dom.get(element);
            }
            
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = 0;
            element.style.display = '';
            
            // 强制回流
            element.offsetHeight;
            
            element.style.opacity = 1;
            
            setTimeout(() => {
                element.style.transition = '';
                if (callback) callback(element);
            }, duration);
            
            return element;
        },
        
        // 淡出效果
        fadeOut: function(element, duration = 300, callback) {
            if (typeof element === 'string') {
                element = Green.dom.get(element);
            }
            
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = 1;
            
            // 强制回流
            element.offsetHeight;
            
            element.style.opacity = 0;
            
            setTimeout(() => {
                element.style.display = 'none';
                element.style.transition = '';
                if (callback) callback(element);
            }, duration);
            
            return element;
        },
        
        // 从下方滑入
        slideUp: function(element, duration = 300, callback) {
            if (typeof element === 'string') {
                element = Green.dom.get(element);
            }
            
            element.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`;
            element.style.transform = 'translateY(20px)';
            element.style.opacity = 0;
            element.style.display = '';
            
            // 强制回流
            element.offsetHeight;
            
            element.style.transform = 'translateY(0)';
            element.style.opacity = 1;
            
            setTimeout(() => {
                element.style.transition = '';
                if (callback) callback(element);
            }, duration);
            
            return element;
        }
    },
    
    /**
     * 数据处理工具
     */
    data: {
        // 本地存储数据
        saveLocal: function(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (error) {
                console.error('保存数据失败:', error);
                return false;
            }
        },
        
        // 获取本地存储数据
        getLocal: function(key) {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            } catch (error) {
                console.error('获取数据失败:', error);
                return null;
            }
        },
        
        // 删除本地存储数据
        removeLocal: function(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('删除数据失败:', error);
                return false;
            }
        },
        
        // 复制对象
        clone: function(obj) {
            return JSON.parse(JSON.stringify(obj));
        },
        
        // 合并对象
        merge: function(target, ...sources) {
            return Object.assign(target, ...sources);
        }
    },
    
    /**
     * 工具函数
     */
    utils: {
        // 防抖函数
        debounce: function(func, wait = 300) {
            let timeout;
            return function(...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        },
        
        // 节流函数
        throttle: function(func, limit = 300) {
            let inThrottle;
            return function(...args) {
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },
        
        // 随机ID生成
        generateId: function(prefix = 'green-') {
            return `${prefix}${Math.random().toString(36).substring(2, 9)}`;
        },
        
        // 格式化日期
        formatDate: function(date, format = 'YYYY-MM-DD') {
            if (!(date instanceof Date)) {
                date = new Date(date);
            }
            
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const seconds = date.getSeconds();
            
            return format
                .replace('YYYY', year)
                .replace('MM', month.toString().padStart(2, '0'))
                .replace('DD', day.toString().padStart(2, '0'))
                .replace('HH', hours.toString().padStart(2, '0'))
                .replace('mm', minutes.toString().padStart(2, '0'))
                .replace('ss', seconds.toString().padStart(2, '0'));
        },
        
        // 判断是否移动设备
        isMobile: function() {
            return window.innerWidth <= 768;
        }
    },
    
    /**
     * 初始化滚动显示效果
     */
    initScrollReveal: function() {
        const revealElements = document.querySelectorAll('.reveal');
        
        // 没有元素时直接返回
        if (!revealElements.length) return;
        
        const revealHandler = Green.utils.throttle(() => {
            revealElements.forEach(element => {
                const elementTop = element.getBoundingClientRect().top;
                const windowHeight = window.innerHeight;
                
                if (elementTop < windowHeight * 0.85) {
                    element.classList.add('active');
                }
            });
        }, 100);
        
        // 初始运行一次
        revealHandler();
        
        // 添加滚动监听
        window.addEventListener('scroll', revealHandler);
    },
    
    /**
     * 初始化全局事件监听器
     */
    initEventListeners: function() {
        // 处理卡片悬停效果
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                Green.dom.addClass(this, 'hover');
            });
            
            card.addEventListener('mouseleave', function() {
                Green.dom.removeClass(this, 'hover');
            });
        });
        
        // 处理按钮点击特效
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                const originalTransform = this.style.transform || '';
                this.style.transform = `${originalTransform} scale(0.95)`;
                
                setTimeout(() => {
                    this.style.transform = originalTransform;
                }, 150);
            });
        });
    },
    
    /**
     * 预加载图片
     * @param {Array} images - 可选的要预加载的图片URL数组
     */
    preloadImages: function(images = []) {
        // 如果没有提供图片数组，尝试查找页面中的data-preload属性
        if (!images.length) {
            const preloadElements = document.querySelectorAll('[data-preload]');
            preloadElements.forEach(element => {
                const urls = element.dataset.preload.split(',');
                images.push(...urls);
            });
        }
        
        // 预加载每个图片
        images.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }
};

// 页面加载完成后自动初始化
document.addEventListener('DOMContentLoaded', Green.init);

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Green;
} else {
    window.Green = Green;
} 