// 音乐播放器实现
class MusicPlayer {
    constructor() {
        this.audioElement = new Audio();
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isExpanded = false;
        this.container = null;
        this.playerBall = null;
        this.expandedPlayer = null;
        // 拖动相关属性
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
    }

    init() {
        this.loadMusicFiles();
        this.createPlayerUI();
        this.setupEventListeners();
        // 设置默认为播放状态
        setTimeout(() => {
            this.togglePlay();
        }, 1000);
    }

    loadMusicFiles() {
        // 获取music文件夹中的音乐文件 - 只包含浏览器支持的格式和实际存在的文件
        const musicFiles = [
            'Aleile,麻枝准 - 過ぎ去りし夏.mp3',
            'Music therapy - Floating in the City.mp3',
            '许嫚烜 - 天人合一.mp3',
            '风潮音乐 - 永恒之道.mp3',
            'Oliver Shanti - Nuur el AB.mp3',
            '常成 - 颂钵冥想音乐空山秘境.mp3',
            'Ananda Giri - Oneness Blessing.mp3',
            'Sudha - Tvameva.mp3',
            'Snatam Kaur - Jap Man Sat Nam.mp3',
            'Manesh DeMoor - Jai Radha Madhav.mp3',
            'Ah Nee Mah - House of the Spirit.mp3',
            'Amrit Kirtan - Ong Namo Guru Dev Namo (Adi Mantra).mp3',
            'Deva Premal,Miten - Om Kumara Mantra (Innocence).mp3',
            'Amrit Kirtan - Wah Yantee.mp3',
            '风潮音乐 - 灵气.mp3'
        ];

        // 检查当前运行环境和URL
        const isFileProtocol = window.location.protocol === 'file:';
        const baseUrl = isFileProtocol ? '' : window.location.origin;
        
        // 将音乐文件路径添加到播放列表，使用相对路径
        this.playlist = musicFiles.map(file => {
            // 对文件名进行URL编码，以处理特殊字符
            const encodedFileName = encodeURIComponent(file);
            return `music/${encodedFileName}`;
        });

        // 如果播放列表为空，添加一个提示
        if (this.playlist.length === 0) {
            console.warn('没有找到可播放的音乐文件，请确保音乐文件位于 ./music/ 目录下，并且是 .mp3、.wav 或 .ogg 格式');
        }

        // 设置初始音乐
        if (this.playlist.length > 0) {
            this.audioElement.src = this.playlist[0];
            this.audioElement.load();
        }
    }

    createPlayerUI() {
        // 创建悬浮球容器
        this.container = document.createElement('div');
        this.container.className = 'music-player-container';
        document.body.appendChild(this.container);

        // 创建悬浮球
        this.playerBall = document.createElement('div');
        this.playerBall.className = 'music-player-ball';
        this.playerBall.innerHTML = '<i class="music-icon">♪</i>';
        this.container.appendChild(this.playerBall);

        // 创建展开后的播放器
        this.expandedPlayer = document.createElement('div');
        this.expandedPlayer.className = 'music-player-expanded';
        this.expandedPlayer.style.display = 'none';
        this.expandedPlayer.innerHTML = `
            <div class="music-controls">
                <button class="control-btn prev-btn">◀</button>
                <button class="control-btn play-btn">▶</button>
                <button class="control-btn next-btn">▶</button>
            </div>
            <div class="music-title"></div>
        `;
        this.container.appendChild(this.expandedPlayer);

        // 更新当前音乐名称
        this.updateMusicTitle();
    }

    setupEventListeners() {
        // 悬浮球点击事件
        this.playerBall.addEventListener('click', (e) => {
            // 如果正在拖动则不触发点击事件
            if (this.isDragging) {
                e.stopPropagation();
                return;
            }
            this.toggleExpand();
        });

        // 播放/暂停按钮
        const playBtn = this.expandedPlayer.querySelector('.play-btn');
        playBtn.addEventListener('click', () => this.togglePlay());

        // 上一曲按钮
        const prevBtn = this.expandedPlayer.querySelector('.prev-btn');
        prevBtn.addEventListener('click', () => this.playPrev());

        // 下一曲按钮
        const nextBtn = this.expandedPlayer.querySelector('.next-btn');
        nextBtn.addEventListener('click', () => this.playNext());

        // 音乐结束时自动播放下一曲
        this.audioElement.addEventListener('ended', () => this.playNext());
        
        // 音频播放状态事件
        this.audioElement.addEventListener('playing', () => {
            this.isPlaying = true;
            playBtn.textContent = '⏸';
            this.playerBall.classList.add('playing');
        });
        
        this.audioElement.addEventListener('pause', () => {
            this.isPlaying = false;
            playBtn.textContent = '▶';
            this.playerBall.classList.remove('playing');
        });

        // 添加拖动事件监听
        this.setupDragEvents();
    }

    // 设置拖动相关事件
    setupDragEvents() {
        // 开始拖动
        this.container.addEventListener('mousedown', (e) => {
            // 记录开始位置
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            
            // 设置容器样式
            this.container.style.transition = 'none';
            this.container.style.cursor = 'grabbing';
            
            // 阻止默认行为和冒泡
            e.preventDefault();
        });
        
        // 拖动过程
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            // 计算位移
            const offsetX = e.clientX - this.dragStartX;
            const offsetY = e.clientY - this.dragStartY;
            
            // 获取当前位置
            const currentLeft = parseInt(getComputedStyle(this.container).left) || 0;
            const currentTop = parseInt(getComputedStyle(this.container).top) || 0;
            
            // 更新位置
            const newLeft = currentLeft + offsetX;
            const newTop = currentTop + offsetY;
            
            // 应用新位置
            this.container.style.left = `${newLeft}px`;
            this.container.style.top = `${newTop}px`;
            this.container.style.right = 'auto';
            this.container.style.bottom = 'auto';
            
            // 更新拖动起始点
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
        });
        
        // 结束拖动
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.container.style.cursor = 'grab';
                this.container.style.transition = 'all 0.3s ease';
            }
        });
        
        // 离开窗口时也结束拖动
        document.addEventListener('mouseleave', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.container.style.cursor = 'grab';
                this.container.style.transition = 'all 0.3s ease';
            }
        });
    }

    toggleExpand() {
        this.isExpanded = !this.isExpanded;
        if (this.isExpanded) {
            this.expandedPlayer.style.display = 'block';
            this.playerBall.classList.add('expanded');
        } else {
            this.expandedPlayer.style.display = 'none';
            this.playerBall.classList.remove('expanded');
        }
    }

    togglePlay() {
        const playBtn = this.expandedPlayer.querySelector('.play-btn');
        if (this.isPlaying) {
            this.audioElement.pause();
            playBtn.textContent = '▶';
            this.playerBall.classList.remove('playing');
            this.container.classList.remove('playing');
        } else {
            if (this.playlist.length === 0) {
                console.error('播放列表为空，无法播放');
                return;
            }
            
            this.audioElement.play().catch(error => {
                console.error('播放出错:', error);
                // 尝试播放下一首
                this.playNext();
            });
            playBtn.textContent = '⏸';
            this.playerBall.classList.add('playing');
            this.container.classList.add('playing');
        }
        this.isPlaying = !this.isPlaying;
    }

    playNext() {
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        this.loadAndPlayCurrent();
    }

    playPrev() {
        this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        this.loadAndPlayCurrent();
    }

    loadAndPlayCurrent() {
        // 检查当前索引是否有效
        if (this.playlist.length === 0) {
            console.error('播放列表为空，无法加载音乐');
            return;
        }
        
        if (this.currentIndex < 0 || this.currentIndex >= this.playlist.length) {
            console.error('播放索引无效，重置为0');
            this.currentIndex = 0;
        }
        
        // 在加载前先移除之前的错误监听器
        const errorHandler = () => {
            console.error('音乐文件加载失败:', this.playlist[this.currentIndex]);
            // 记录当前索引，以避免无限循环
            const failedIndex = this.currentIndex;
            this.playNext();
            // 如果播放下一首后索引没变或回到了失败的索引，说明所有歌曲都无法播放
            if (this.currentIndex === failedIndex || this.playlist.length <= 1) {
                console.error('所有音乐文件均无法播放');
                this.isPlaying = false;
                const playBtn = this.expandedPlayer.querySelector('.play-btn');
                if (playBtn) playBtn.textContent = '▶';
                this.playerBall.classList.remove('playing');
            }
        };
        
        this.audioElement.removeEventListener('error', errorHandler);
        this.audioElement.addEventListener('error', errorHandler, { once: true });
        
        this.audioElement.src = this.playlist[this.currentIndex];
        this.audioElement.load();
        this.updateMusicTitle();
        
        // 如果当前正在播放，则加载新歌曲后继续播放
        if (this.isPlaying) {
            this.audioElement.play().catch(error => {
                console.error('切换音乐失败:', error);
            });
        }
    }

    updateMusicTitle() {
        const titleElem = this.expandedPlayer.querySelector('.music-title');
        const fullPath = this.playlist[this.currentIndex];
        // 从路径中提取文件名并解码URL编码
        const encodedFileName = fullPath.split('/').pop();
        const fileName = decodeURIComponent(encodedFileName);
        // 移除扩展名
        const musicName = fileName.replace(/\.[^/.]+$/, "");
        titleElem.textContent = musicName;
    }
}

// 添加CSS样式
function addStyle() {
    const style = document.createElement('style');
    style.textContent = `
        .music-player-container {
            position: fixed;
            bottom: 80px;
            right: 20px;
            z-index: 1001;
            cursor: grab;
        }
        
        .music-player-ball {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background-color: rgba(19, 248, 139, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        }
        
        .music-player-ball.playing {
            animation: pulse 1.5s infinite;
        }
        
        .music-player-ball.expanded {
            background-color: rgba(19, 248, 139, 0.9);
        }
        
        .music-icon {
            color: white;
            font-size: 24px;
            font-style: normal;
        }
        
        .music-player-expanded {
            position: absolute;
            bottom: 60px;
            right: 0;
            width: 200px;
            background-color: rgba(255, 255, 255, 0.9);
            border-radius: 10px;
            padding: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        .music-controls {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        
        .control-btn {
            background-color: #15CC83 !important;
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            transition: all 0.3s ease;
        }
        
        .control-btn:hover {
            background-color: #0DD67A !important;
            transform: scale(1.05);
        }
        
        .control-btn:active {
            background-color: #0BB566 !important;
            transform: scale(0.95);
        }
        
        .prev-btn, .next-btn {
            font-size: 12px;
        }
        
        .play-btn {
            font-size: 16px;
        }
        
        .music-title {
            font-size: 12px;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #000000;
            font-weight: 500;
            margin-top: 5px;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
}

// 初始化音乐播放器
window.addEventListener('DOMContentLoaded', () => {
    addStyle();
    window.musicPlayer = new MusicPlayer();
    window.musicPlayer.init();
}); 