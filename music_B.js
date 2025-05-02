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
    }

    loadMusicFiles() {
        // 获取music文件夹中的音乐文件
        const musicFiles = [
            '久石譲 - The Rain (From Kikujiro Soundtrack).ncm',
            '何石 - 海鸥的夏天.ncm',
            'Aleile,麻枝准 - 過ぎ去りし夏.mp3',
            '昙轩 - 海の形.ncm',
            '久石譲 - 海.ncm',
            '刘嘉卓 - 晨.ncm',
            'Ólafur Arnalds - Doria.ncm',
            'Music therapy - Floating in the City.mp3',
            'Snatam Kaur - Kabir\'s Song.ncm',
            'Piano Peace - Solitude.ncm',
            'nunu - cheburashka.ncm',
            'Voice & Spirit - Ad Gure Nameh.ncm',
            '黛青塔娜,HAYA乐团 - 寂静的天空.ncm',
            '许嫚烜 - 天人合一.mp3',
            'Angela Harry - The Big Finale.ncm',
            '田原 - 50 Seconds From Now.ncm',
            'Terry Oldfield,Mike Oldfield - Moola Mantra.ncm',
            '风潮音乐 - 永恒之道.mp3',
            'Jane Winther - Singingbowls - Instrumental.ncm',
            'Snatam Kaur - Ek Ong Kar Sat Nam.ncm',
            'Oliver Shanti - Nuur el AB.mp3',
            '常成 - 颂钵冥想音乐空山秘境.mp3',
            'Ananda Giri - Oneness Blessing.mp3',
            'Stive Morgan - Magic World of Illusion.ncm',
            'Sudha - Tvameva.mp3',
            'Snatam Kaur - Jap Man Sat Nam.mp3',
            'Karunesh - Earthsong.ncm',
            'Manesh DeMoor - Jai Radha Madhav.mp3',
            'Yiruma - If I Could See You Again.ncm',
            'Ah Nee Mah - House of the Spirit.mp3',
            'Amrit Kirtan - Ong Namo Guru Dev Namo (Adi Mantra).mp3',
            'Enya - One By One.ncm',
            'Deva Premal,Miten - Om Kumara Mantra (Innocence).mp3',
            'Sudha - E Hia `Ai.ncm',
            'Julian Lloyd Webber,English Chamber Orchestra,Nicholas Cleobury - Kinderszenen, Op.15Träumerei (Arr. Palmer).ncm',
            'Amrit Kirtan - Wah Yantee.mp3',
            '风潮音乐 - 灵气.mp3',
            'Gurunam Singh - Dharti Hai.ncm',
            'Deva Premal - Idé Weré Weré.ncm',
            '何石 - 托斯卡纳艳阳下.ncm',
            'Joshua Bell - The Carnival of the Animals The Swan.ncm',
            '王雪山 - 治愈童年的创伤 情感排毒 洗去痛苦的潜意识冥想.ncm'
        ];

        // 将音乐文件路径添加到播放列表
        this.playlist = musicFiles.map(file => `./music/${file}`);

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
                <button class="prev-btn">◀</button>
                <button class="play-btn">▶</button>
                <button class="next-btn">▶</button>
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
        } else {
            this.audioElement.play().catch(error => {
                console.error('播放出错:', error);
                // 尝试播放MP3格式
                if (this.playlist[this.currentIndex].endsWith('.ncm')) {
                    const mp3Index = this.playlist.findIndex(file => file.endsWith('.mp3'));
                    if (mp3Index !== -1) {
                        this.currentIndex = mp3Index;
                        this.audioElement.src = this.playlist[this.currentIndex];
                        this.audioElement.load();
                        this.audioElement.play().catch(e => console.error('替代播放也失败:', e));
                    }
                }
            });
            playBtn.textContent = '⏸';
            this.playerBall.classList.add('playing');
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
        this.audioElement.src = this.playlist[this.currentIndex];
        this.audioElement.load();
        this.updateMusicTitle();
        
        // 如果当前正在播放，则加载新歌曲后继续播放
        if (this.isPlaying) {
            this.audioElement.play().catch(e => console.error('切换音乐失败:', e));
        }
    }

    updateMusicTitle() {
        const titleElem = this.expandedPlayer.querySelector('.music-title');
        const fullPath = this.playlist[this.currentIndex];
        const fileName = fullPath.split('/').pop();
        const musicName = fileName.replace(/\.[^/.]+$/, ""); // 移除扩展名
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
        
        .music-controls button {
            background-color: #13F88B;
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
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