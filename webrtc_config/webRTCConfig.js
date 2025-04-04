/**
 * WebRTC通信配置参数
 * 根据示例代码调整的WebRTC配置
 */

// WebRTC配置
const webRTCConfig = {
    // WebRTC STUN/TURN服务器配置
    peerConnectionConfig: {
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"
            }
        ]
    },

    // 媒体约束
    mediaConstraints: {
        audio: true,
        video: true
    },

    // 信令消息模板 - 严格匹配TouchDesigner期望的格式
    signalingMessageTemplate: {
        metadata: {
            apiVersion: '1.0.1',
            compVersion: '1.0.1',
            compOrigin: 'WebRTC',
            projectName: 'TDWebRTCWebDemo'
        },
        signalingType: "",
        sender: null, // 由服务器填充
        target: "",
        content: {}
    },

    // 数据通道配置
    dataChannels: {
        mouse: {
            label: "MouseData",
            enabled: true,
            options: {
                ordered: true
            }
        },
        keyboard: {
            label: "KeyboardData",
            enabled: true,
            options: {
                ordered: true
            }
        }
    },

    // 信令服务器配置
    signalingServerConfig: {
        url: "ws://localhost:9000",
        reconnectInterval: 5000
    },

    // 完美协商设置
    perfectNegotiation: {
        polite: true,
        makingOffer: false,
        ignoreOffer: false,
        isSettingRemoteAnswerPending: false
    }
};

// 导出配置
module.exports = webRTCConfig; 