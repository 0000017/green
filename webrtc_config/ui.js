/**
 * UI相关功能模块
 * 负责处理用户界面交互、状态显示和全屏模式
 */

// 连接状态显示控制
let statusVisible = false; // 初始状态为隐藏
let tracksVisible = false; // 轨道管理面板是否可见

/**
 * 初始化用户界面
 * 创建状态显示元素并设置相关事件监听器
 */
function initializeUI() {
    // 创建连接状态显示
    const connectionStatus = document.createElement('div');
    connectionStatus.id = 'connection-status';
    connectionStatus.className = 'disconnected hidden'; // 初始状态为断开连接且隐藏
    connectionStatus.textContent = '未连接';
    document.body.appendChild(connectionStatus);
    
    // 创建轨道管理面板（初始隐藏）
    const tracksPanel = document.createElement('div');
    tracksPanel.id = 'tracks-panel';
    tracksPanel.className = 'hidden';
    document.body.appendChild(tracksPanel);
    
    // 确保从页面加载开始就是全屏模式
    try {
        // 当用户点击页面时请求全屏模式
        document.body.addEventListener('click', (e) => {
            // 排除控制按钮和面板的点击
            if (e.target.id !== 'status-toggle' && 
                e.target.id !== 'connection-status' && 
                !e.target.closest('#tracks-panel')) {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.log(`全屏请求被拒绝: ${err.message}`);
                    });
                }
            }
        });
        
        console.log('全屏事件监听器已添加');
    } catch (error) {
        console.error('全屏模式设置失败:', error);
    }
    
    // 添加状态切换按钮的点击事件处理程序
    setupStatusToggle();
}

/**
 * 设置状态切换按钮的点击事件
 */
function setupStatusToggle() {
    const connectionStatus = document.getElementById('connection-status');
    const tracksPanel = document.getElementById('tracks-panel');
    const statusToggle = document.getElementById('status-toggle');
    
    if (!connectionStatus || !statusToggle || !tracksPanel) return;
    
    // 只在第一次调用时添加事件监听器
    if (!window.statusEventListenersAdded) {
        // 添加状态切换按钮的点击事件
        statusToggle.addEventListener('click', () => {
            statusVisible = !statusVisible;
            
            if (statusVisible) {
                // 先让状态展示出来
                connectionStatus.style.zIndex = '150'; // 设置更高的z-index
                connectionStatus.classList.remove('hidden');
                
                // 如果点击显示状态，也显示轨道面板
                if (tracksPanel.children.length > 0) {
                    tracksPanel.classList.remove('hidden');
                    tracksVisible = true;
                }
            } else {
                // 隐藏所有面板
                connectionStatus.classList.add('hidden');
                tracksPanel.classList.add('hidden');
                tracksVisible = false;
                
                // 延迟重置z-index，等待动画完成
                setTimeout(() => {
                    connectionStatus.style.zIndex = '99';
                }, 300);
            }
        });
        
        // 添加按钮动画效果
        statusToggle.addEventListener('mouseover', () => {
            statusToggle.style.transform = 'scale(1.1)';
        });
        
        statusToggle.addEventListener('mouseout', () => {
            statusToggle.style.transform = '';
        });
        
        window.statusEventListenersAdded = true;
    }
}

/**
 * 更新连接状态显示
 * @param {string} status - 连接状态类名('connected', 'disconnected', 'connecting')
 * @param {string} message - 显示的状态消息
 */
function updateConnectionStatus(status, message) {
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) {
        // 更新类名和文本内容
        connectionStatus.className = status;
        
        // 确保hidden类名不被覆盖（如果当前状态为隐藏）
        if (!statusVisible) {
            connectionStatus.classList.add('hidden');
        } else {
            // 如果可见，确保z-index足够高
            connectionStatus.style.zIndex = '150';
        }
        
        connectionStatus.textContent = message;
    }
}

/**
 * 更新轨道列表
 * @param {Array} tracks - 轨道列表数组，每个元素包含id和label属性
 */
function updateTracks(tracks) {
    const tracksPanel = document.getElementById('tracks-panel');
    if (!tracksPanel) return;
    
    // 清空现有轨道
    tracksPanel.innerHTML = '';
    
    // 添加标题
    const title = document.createElement('div');
    title.textContent = '可用轨道:';
    title.style.color = '#fff';
    title.style.marginBottom = '5px';
    title.style.fontWeight = 'bold';
    tracksPanel.appendChild(title);
    
    // 添加轨道按钮
    if (tracks && tracks.length > 0) {
        tracks.forEach(track => {
            const button = document.createElement('button');
            button.className = 'track-button';
            button.textContent = track.label || `轨道 ${track.id}`;
            button.dataset.trackId = track.id;
            
            button.addEventListener('click', () => {
                // 点击时触发轨道选择事件
                if (typeof window.onTrackSelected === 'function') {
                    window.onTrackSelected(track.id);
                    
                    // 高亮选中的轨道
                    document.querySelectorAll('.track-button').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    button.classList.add('active');
                }
            });
            
            tracksPanel.appendChild(button);
        });
        
        // 如果状态已经可见，也显示轨道面板
        if (statusVisible) {
            tracksPanel.classList.remove('hidden');
            tracksVisible = true;
        }
    } else {
        const noTracks = document.createElement('div');
        noTracks.textContent = '无可用轨道';
        noTracks.style.color = '#999';
        noTracks.style.fontSize = '12px';
        tracksPanel.appendChild(noTracks);
    }
}

// 文档加载完成后初始化UI
document.addEventListener('DOMContentLoaded', initializeUI);

// 暴露公共方法
window.updateConnectionStatus = updateConnectionStatus;
window.updateTracks = updateTracks; 