/**
 * WebRTC通信配置参数
 * 包含与远程客户端建立实时通信所需的所有关键参数
 * 全面配置适用于新项目
 */

// RTCPeerConnection完整配置
const peerConnectionConfig = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302" // Google提供的公共STUN服务器
    },
    // 可以添加TURN服务器配置，用于NAT/防火墙穿透
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'username',
    //   credential: 'password'
    // }
  ],
  // 可选高级配置
  iceTransportPolicy: 'all', // 'all' 或 'relay'（仅使用TURN服务器）
  bundlePolicy: 'balanced', // 'balanced', 'max-bundle' 或 'max-compat'
  rtcpMuxPolicy: 'require', // 'require' 或 'negotiate'
  // 注意：以下参数在某些浏览器可能不支持
  // iceCandidatePoolSize: 10, // 预生成ICE候选数量
  // sdpSemantics: 'unified-plan' // 'unified-plan' 或 'plan-b'
};

// 媒体约束完整配置
const mediaConstraints = {
  audio: {
    echoCancellation: true, // 回声消除
    noiseSuppression: true, // 噪声抑制
    autoGainControl: true,  // 自动增益控制
    sampleRate: 48000,      // 采样率
    sampleSize: 16,         // 采样大小
    channelCount: 2,        // 声道数量
    latency: 0.01,          // 延迟时间（秒）
  },
  video: {
    width: { ideal: 1280 },     // 理想宽度
    height: { ideal: 720 },     // 理想高度
    frameRate: { ideal: 30 },   // 理想帧率
    facingMode: 'user',         // 'user'前置摄像头，'environment'后置摄像头
    aspectRatio: { ideal: 1.7777777778 }, // 16:9
  }
};

// 简化的媒体约束（兼容性更好）
const simpleMediaConstraints = {
  audio: true,
  video: true
};

// 数据通道完整配置
const dataChannels = {
  mouse: {
    label: 'MouseData',       // 鼠标数据通道标签
    ordered: true,            // 是否保证消息顺序
    maxRetransmits: 1,        // 最大重传次数（低延迟场景）
    maxPacketLifeTime: 100,   // 消息最大生命周期（毫秒）
    protocol: '',             // 应用层协议描述
    negotiated: false,        // 是否预协商通道ID
    id: null,                 // 通道ID（negotiated为true时必须指定）
    priority: 'high'          // 'high', 'medium', 'low', 或 'very-low'
  },
  keyboard: {
    label: 'KeyboardData',    // 键盘数据通道标签
    ordered: true,
    maxRetransmits: 0,        // 设为0表示不重传（类UDP模式）
    maxPacketLifeTime: null,  // 不设置超时
    priority: 'high'
  },
  // 可扩展为其他数据通道
  chat: {
    label: 'ChatData',        // 聊天数据通道
    ordered: true,            // 需要保证消息顺序
    maxRetransmits: null,     // 无限重传直到成功
    maxPacketLifeTime: null,  // 无超时限制
    priority: 'medium'        // 中等优先级
  }
};

// 信令服务器配置
const signalingServerConfig = {
  url: 'ws://localhost:3000', // 更新为本地信令服务器地址
  reconnectInterval: 2000,     // 重连间隔（毫秒）
  maxReconnectAttempts: 10,    // 最大重连尝试次数
  pingInterval: 30000,         // 心跳间隔（毫秒）
  pingTimeout: 5000            // 心跳超时（毫秒）
};

// 信令消息格式
const signalingMessageTemplate = {
  metadata: {
    apiVersion: '1.0.1',
    compVersion: '1.0.1',
    compOrigin: 'WebRTC',
    projectName: 'TDWebRTCWebDemo'
  },
  signalingType: "", // "Offer", "Answer", "Ice", "CallStart", "CallEnd"
  sender: null,      // 由服务器填充
  target: "",        // 目标客户端标识
  content: {}        // 根据消息类型不同而变化
};

// 完美协商配置
const perfectNegotiationConfig = {
  polite: false,                   // 是否为"礼貌"端（冲突时让步）
  makingOfferState: {
    making: false,                 // 是否正在创建offer
    rollbackNeeded: false          // 是否需要回滚
  },
  ignoreOfferState: {
    ignoring: false,               // 是否忽略收到的offer
    offerCollision: false          // 是否发生offer冲突
  },
  remoteDescriptionState: {
    settingRemoteAnswerPending: false  // 是否正在设置远程answer
  }
};

// 连接状态监控配置
const connectionMonitorConfig = {
  monitorInterval: 2000,           // 监控间隔（毫秒）
  iceCandidateTimeout: 5000,       // ICE候选收集超时（毫秒）
  connectionTimeout: 10000,        // 连接建立超时（毫秒）
  reconnectThreshold: 3,           // 连续失败几次后尝试重连
  statsGatheringInterval: 1000,    // 统计数据收集间隔（毫秒）
  iceRestartOnFailure: true,       // 连接失败时是否自动重启ICE
  onStatsTriggers: {
    packetLossThreshold: 0.05,     // 丢包率超过5%触发事件
    bitrateDropThreshold: 0.3,     // 比特率下降超过30%触发事件
    roundTripTimeThreshold: 500    // RTT超过500ms触发事件
  }
};

// 导出所有配置项
module.exports = {
  peerConnectionConfig,
  mediaConstraints,
  simpleMediaConstraints,
  dataChannels,
  signalingServerConfig,
  signalingMessageTemplate,
  perfectNegotiationConfig,
  connectionMonitorConfig
}; 