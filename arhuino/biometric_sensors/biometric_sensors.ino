/*
 * 生物传感器数据采集程序
 * 用于Arduino Uno R3与Grove GSR皮电传感器和PulseSensor脉搏心率传感器
 * 采集基于多模态数据的三维情感模型所需数据
 */

// 定义引脚
#define GSR_PIN A0          // Grove GSR传感器连接到模拟输入A0
#define PULSE_PIN A1        // PulseSensor传感器连接到模拟输入A1
#define PULSE_LED_PIN 13    // 用于显示心跳的LED（Arduino内置）

// 变量声明
int gsrValue = 0;           // GSR原始值
float conductance = 0.0;    // 皮肤电导率

// 脉搏传感器相关变量
volatile int BPM;           // 每分钟心跳次数
volatile int Signal;        // 原始脉搏传感器数据
volatile int IBI = 600;     // 心跳间隔时间(ms)
volatile boolean Pulse = false; // 脉搏状态
volatile boolean QS = false;    // 检测到脉搏标志

// 计算HRV的变量
unsigned long lastBeatTime = 0;  // 上一次心跳时间
int beatTimes[10];              // 存储最近10次心跳时间间隔
int beatIndex = 0;              // 心跳时间数组索引
float RMSSD = 0;                // HRV的RMSSD值
float HRV_norm = 0.5;           // 归一化HRV (0-1)

// 上升斜率计算
float lastPPGValue = 0;        // 上一次PPG值
float ppgSlope = 0;            // PPG上升斜率
float ppgSlopeNorm = 0.5;      // 归一化斜率 (0-1)
unsigned long lastTime = 0;    // 上次测量时间

// 串口通信速率
#define BAUD_RATE 115200

void setup() {
  // 初始化串口通信
  Serial.begin(BAUD_RATE);
  
  // 设置LED引脚为输出
  pinMode(PULSE_LED_PIN, OUTPUT);
  
  // 初始化数组
  for (int i = 0; i < 10; i++) {
    beatTimes[i] = 600; // 初始默认值
  }
  
  Serial.println("GSR,BPM,IBI,RMSSD,HRV_norm,PPG_Slope,PPG_Slope_norm,Signal");
  delay(1000); // 给设备启动时间
}

void loop() {
  // 获取当前时间
  unsigned long currentTime = millis();
  
  // 1. 读取GSR传感器数据
  gsrValue = analogRead(GSR_PIN);
  // 计算电导率（根据Grove GSR传感器特性）
  conductance = (1024.0 - (float)gsrValue) / (float)gsrValue;
  
  // 2. 读取脉搏传感器数据
  Signal = analogRead(PULSE_PIN);
  
  // 3. 简单脉搏检测算法
  processPulse(Signal, currentTime);
  
  // 4. 计算PPG斜率（间隔50ms计算一次）
  if (currentTime - lastTime >= 50) {
    float timeDelta = (currentTime - lastTime) / 1000.0; // 转换为秒
    ppgSlope = (Signal - lastPPGValue) / timeDelta;
    
    // 归一化斜率（根据实际项目调整范围）
    // 假设最大斜率为2.0V/s
    ppgSlopeNorm = constrain(ppgSlope / 2.0, 0, 1);
    
    lastPPGValue = Signal;
    lastTime = currentTime;
  }
  
  // 5. 发送数据到串口（格式化为CSV）
  if (currentTime % 100 == 0) { // 每100ms发送一次
    Serial.print(gsrValue); Serial.print(",");
    Serial.print(BPM); Serial.print(",");
    Serial.print(IBI); Serial.print(",");
    Serial.print(RMSSD); Serial.print(",");
    Serial.print(HRV_norm); Serial.print(",");
    Serial.print(ppgSlope); Serial.print(",");
    Serial.print(ppgSlopeNorm); Serial.print(",");
    Serial.println(Signal);
  }
  
  // 短暂延迟，保持采样率
  delay(10);
}

void processPulse(int signal, unsigned long currentTime) {
  static int threshold = 550;  // 脉搏检测阈值（需要根据实际调整）
  static int peak = 550;       // 脉搏峰值
  static int trough = 550;     // 脉搏谷值
  static int signalPrev = 0;   // 上一次信号值
  static boolean firstBeat = true;  // 是否为第一次心跳
  static unsigned long lastBeatTime = 0; // 上次心跳时间
  
  // 动态调整阈值
  threshold = (peak + trough) / 2;
  
  // 检测心跳（信号上升穿过阈值）
  if (signal > threshold && signalPrev <= threshold) {
    digitalWrite(PULSE_LED_PIN, HIGH);  // 点亮LED指示心跳
    
    // 计算心跳间隔
    int currentIBI = currentTime - lastBeatTime;
    
    // 有效心跳
    if (currentIBI > 300 && currentIBI < 1500) {
      // 更新IBI
      IBI = currentIBI;
      
      // 存储心跳间隔用于HRV计算
      beatTimes[beatIndex] = IBI;
      beatIndex = (beatIndex + 1) % 10;
      
      // 计算BPM
      BPM = 60000 / IBI;
      
      // 计算RMSSD (HRV指标)
      if (!firstBeat) {
        calculateRMSSD();
      }
      
      // 设置心跳标志
      Pulse = true;
      QS = true;
      firstBeat = false;
    }
    
    lastBeatTime = currentTime;
  }
  
  // 检测信号峰值
  if (signal > peak) {
    peak = signal;
  }
  
  // 检测信号谷值
  if (signal < trough) {
    trough = signal;
  }
  
  // 重置LED
  if (signal < threshold && signalPrev >= threshold) {
    digitalWrite(PULSE_LED_PIN, LOW);  // 关闭LED
    Pulse = false;
  }
  
  // 自动调整阈值（缓慢下降，防止误触发）
  if (currentTime % 2000 == 0) {
    peak = peak * 0.95;
    trough = trough * 1.05;
  }
  
  signalPrev = signal;  // 更新上一次信号值
}

// 计算RMSSD - 相邻心跳间隔差值的均方根
void calculateRMSSD() {
  float sumSquaredDiffs = 0;
  int validIntervals = 0;
  
  // 计算相邻间隔差值的平方和
  for (int i = 0; i < 9; i++) {
    int diff = beatTimes[(beatIndex + i + 1) % 10] - beatTimes[(beatIndex + i) % 10];
    if (abs(diff) < 300) { // 过滤异常值
      sumSquaredDiffs += diff * diff;
      validIntervals++;
    }
  }
  
  // 计算均方根
  if (validIntervals > 0) {
    RMSSD = sqrt(sumSquaredDiffs / validIntervals);
    
    // 归一化HRV (映射RMSSD到0-1范围)
    // 基于文档中提到的范围: 低HRV<20ms, 高HRV>50ms
    HRV_norm = constrain((RMSSD - 20) / 30.0, 0, 1);
  }
} 