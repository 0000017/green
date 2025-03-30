/* 
 * Grove GSR Sensor Basic Demo
 * 功能：实时采集皮肤电导数据并滤波输出
 * 接线：GSR传感器 → A0引脚
 */

const int GSR_PIN = A0;       // 传感器连接引脚
const int SAMPLE_SIZE = 30;   // 滑动窗口采样数量（建议30-50）
int rawValue;                 // 原始传感器读数
float filteredValue;          // 滤波后数值
float gsrBuffer[SAMPLE_SIZE]; // 数据缓存数组
int bufferIndex = 0;          // 缓存索引

// 动态基线校准参数
float baseline = 0;           
const float CALIBRATION_TIME = 5.0; // 初始校准时间（秒）

void setup() {
  Serial.begin(115200);
  pinMode(GSR_PIN, INPUT);
  
  // 初始校准（用户需保持静止）
  calibrateSensor();
  Serial.println("Calibration complete. Start measuring...");
}

void loop() {
  // 1. 读取原始数据
  rawValue = analogRead(GSR_PIN);
  
  // 2. 滑动平均滤波
  gsrBuffer[bufferIndex] = rawValue;
  bufferIndex = (bufferIndex + 1) % SAMPLE_SIZE;
  
  // 3. 计算滤波值（排除基线偏移）
  filteredValue = 0;
  for (int i=0; i<SAMPLE_SIZE; i++) {
    filteredValue += gsrBuffer[i];
  }
  filteredValue = (filteredValue / SAMPLE_SIZE) - baseline;
  
  // 4. 串口输出（含时间戳）
  Serial.print(millis()/1000.0, 2);    // 时间（秒）
  Serial.print("\tRaw: ");
  Serial.print(rawValue);
  Serial.print("\tFiltered: ");
  Serial.println(filteredValue, 1);    // 保留1位小数
  
  delay(20); // 采样间隔约50Hz（可根据需求调整）
}

// 自动基线校准
void calibrateSensor() {
  float sum = 0;
  unsigned long startTime = millis();
  
  Serial.println("Calibrating... Do not touch the sensor!");
  while (millis() - startTime < CALIBRATION_TIME * 1000) {
    sum += analogRead(GSR_PIN);
    delay(50);
  }
  
  baseline = sum / (CALIBRATION_TIME * 20); // 计算平均基线值
}