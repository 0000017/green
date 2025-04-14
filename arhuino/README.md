# 生物传感器模块 - 情感数据采集系统

本模块用于通过Arduino采集生物传感器数据，并与表情识别数据集成，构建基于多模态数据的三维情感模型。

## 硬件要求

- Arduino Uno R3
- Grove GSR（皮电传感器）连接到模拟输入A0
- PulseSensor（脉搏心率传感器）连接到模拟输入A1

## 数据流程

1. Arduino采集原始生物信号数据：
   - 皮肤电导率（GSR）
   - 脉搏波形（PPG）
   - 心率（BPM）
   - 心跳间隔（IBI）

2. 计算衍生指标：
   - 心率变异性（HRV）的RMSSD值
   - PPG波形上升斜率

3. 通过串口将数据发送到电脑

4. Electron应用接收数据并进行显示

5. 情感融合模块将传感器数据与表情识别数据融合，构建三维情感模型：
   - X轴（效价）：表情效价 + 心跳间隔（IBI/HRV）
   - Y轴（唤醒度）：心率（BPM）+ PPG信号动态特征
   - Z轴（情感类型）：表情分类为主，生理信号验证

## 文件说明

- `biometric_sensors.ino` - Arduino程序，用于传感器数据采集
- `biometric-data.js` - Node.js模块，处理Arduino串口数据
- `biometric-ui.js` - UI模块，显示传感器数据
- `emotion-fusion.js` - 数据融合模块，整合表情识别与生物传感器数据

## 使用方法

1. 将`biometric_sensors.ino`上传到Arduino板
2. 启动Electron应用
3. 在表情识别窗口中，使用下拉菜单选择Arduino设备的COM端口
4. 点击"连接"按钮开始采集数据

## 注意事项

- 传感器需要正确校准才能获得准确数据
- GSR传感器对皮肤接触质量敏感，需确保稳定接触
- PulseSensor需要正确放置在有脉搏信号的位置（例如指尖或耳垂）
- Arduino波特率设置为115200，确保与代码一致

## 调试信息

如果采集数据异常，可以查看以下信息：

1. 检查Arduino串口监视器能否正常接收数据（波特率115200）
2. 检查Electron应用控制台是否有错误信息
3. 传感器放置是否正确，接触是否良好

## 依赖项

- serialport: "^13.0.0"
- @serialport/parser-readline: "^13.0.0" 