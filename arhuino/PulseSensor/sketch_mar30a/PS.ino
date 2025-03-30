#include <PulseSensorPlayground.h>

#define PULSE_SENSOR_PIN A0
#define BAUD_RATE 115200

PulseSensorPlayground pulseSensor;

void setup() {
  Serial.begin(BAUD_RATE);
  
  // 新版库配置（网页6）
  pulseSensor.analogInput(PULSE_SENSOR_PIN);  // 设置传感器引脚
  pulseSensor.setThreshold(550);              // 动态阈值（范围200-800）

  if (!pulseSensor.begin()) {
    Serial.println("Sensor initialization failed!");
    while(1);
  }
}

void loop() {
  // 实时数据采集（网页1原理）
  if (pulseSensor.sawStartOfBeat()) {  // 检测到有效心跳
    printSensorData();
  }
  delay(10);  // 保持100Hz采样率（网页6推荐）
}

void printSensorData() {
  // 获取核心数据（网页7方法）
  int currentBPM = pulseSensor.getBeatsPerMinute();
  int lastIBI = pulseSensor.getInterBeatIntervalMs();
  int signalRaw = pulseSensor.getLatestSample();  // 原始信号值
  
  // 信号质量评估（网页1算法）
  int signalQuality = map(
    abs(signalRaw - pulseSensor.getPulseAmplitude()), 
    0, 800, 100, 0
  );  // 振幅波动越小质量越高

  // 带校验的数据输出
  if(signalQuality < 20) {
    Serial.println("Warning: Low Signal Quality");
    return;
  }
  
  Serial.print("BPM:"); Serial.print(currentBPM);
  Serial.print(" IBI:"); Serial.print(lastIBI);
  Serial.print(" Signal:"); Serial.println(signalQuality);
}