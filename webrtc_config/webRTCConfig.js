/**
 * WebRTC通信配置参数
 * 根据示例代码调整的WebRTC配置，专为与TouchDesigner兼容设计
 * 本配置文件定义了WebRTC连接所需的全部参数，包括服务器配置、媒体约束、信令消息格式等
 */

// WebRTC配置对象 - 包含所有WebRTC连接相关的配置参数
const webRTCConfig = {
    // WebRTC STUN/TURN服务器配置
    // STUN服务器用于NAT穿透，帮助WebRTC连接发现公网IP和端口
    peerConnectionConfig: {
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"  // Google提供的公共STUN服务器
            }
            // 可以添加更多STUN服务器或TURN服务器以提高连接成功率
            // TURN服务器在STUN失败时提供中继功能
        ]
    },

    // 媒体约束 - 定义音视频流的参数
    // 这些参数决定了WebRTC连接中使用的音视频质量和特性
    mediaConstraints: {
        audio: true,  // 启用音频传输
        video: true   // 启用视频传输
        // 可以进一步定义详细参数，如分辨率、帧率等
        // 例如: video: {width: {ideal: 1280}, height: {ideal: 720}}
    },

    // 信令消息模板 - 严格匹配TouchDesigner期望的格式
    // 这个格式必须精确匹配，否则TD无法正确解析消息
    // 所有与TD的信令交换都必须遵循此格式
    signalingMessageTemplate: {
        metadata: {
            apiVersion: '1.0.1',    // API版本号，必须与TD匹配
            compVersion: '1.0.1',   // 组件版本号，必须与TD匹配
            compOrigin: 'WebRTC',   // 组件来源标识
            projectName: 'TDWebRTCWebDemo'  // 项目名称标识
        },
        signalingType: "",  // 信令类型：Offer, Answer, Ice, CallStart, CallEnd等
        sender: null,       // 发送者ID，由服务器填充
        target: "",        // 目标接收者ID
        content: {}         // 消息内容，根据消息类型变化
    },

    // 数据通道配置 - 用于发送控制数据
    // 注意：通道名称必须与TouchDesigner期望的完全一致
    // 这些通道用于发送鼠标和键盘控制信息到TD
    dataChannels: {
        mouse: {
            label: "MouseData",  // 鼠标数据通道名称，必须是这个名称才能被TD识别
            enabled: true,      // 是否启用此通道
            options: {
                ordered: true    // 有序传输，确保数据按发送顺序到达
                // 可添加其他选项如maxRetransmits等
            }
        },
        keyboard: {
            label: "KeyboardData",  // 键盘数据通道名称，必须是这个名称才能被TD识别
            enabled: true,         // 是否启用此通道
            options: {
                ordered: true       // 有序传输，确保数据按发送顺序到达
            }
        }
    },

    // 信令服务器配置 - WebSocket服务器连接参数
    // 信令服务器负责在WebRTC对等连接建立前交换必要信息
    signalingServerConfig: {
        url: "ws://localhost:9000",  // WebSocket服务器地址
        reconnectInterval: 5000      // 连接断开后的重连间隔(毫秒)
    },

    // 完美协商设置 - 处理WebRTC协商冲突
    // 当双方同时发起协商时，需要一种机制来解决冲突
    // 这是基于WebRTC完美协商模式(Perfect Negotiation pattern)的实现
    perfectNegotiation: {
        polite: true,                    // 是否为礼貌方(后确定)，礼貌方在冲突时会让步
        makingOffer: false,              // 是否正在创建offer的标志
        ignoreOffer: false,              // 是否忽略收到的offer的标志
        isSettingRemoteAnswerPending: false  // 是否正在设置远程answer的标志
    }
};

// 导出配置
module.exports = webRTCConfig;