/*
  ESP32 HUZZAH32 + MPU6050 → BLE Keyboard (Arrow keys from acceleration)
  - Library: ESP32 BLE Keyboard (T-vK)
  - High-pass on ax to remove tilt
  - Quiet detection + hysteresis to stop flutter:
      * If |axHP| is tiny for a short time → lock CENTER (no output)
      * Cross START threshold → begin firing LEFT/RIGHT
      * Drop below STOP threshold → snap back to CENTER
  - Rate scales with |accel| (light shove = slow taps, strong shove = fast taps)
*/

#include <Wire.h>
#include <math.h>
#include <BleKeyboard.h>

// ---- I2C / IMU (HUZZAH32 pins) ----
#define SDA_PIN 23
#define SCL_PIN 22
const uint8_t MPU_ADDR         = 0x68;
const uint8_t REG_PWR_MGMT_1   = 0x6B;
const uint8_t REG_ACCEL_XOUT_H = 0x3B;
const uint8_t REG_WHO_AM_I     = 0x75;
const float   G_PER_LSB        = 1.0f / 16384.0f;

// ---- Loop timing ----
const uint16_t LOOP_HZ = 100;                 // 100 Hz sampling
const uint32_t LOOP_MS = 1000UL / LOOP_HZ;
unsigned long lastLoop = 0;

// ---- High-pass filter (remove gravity/tilt) ----
const float HPF_CUTOFF_HZ = 0.20f;            // low cutoff = strong tilt rejection
float hpf_alpha;                               // computed in setup
float prevAx = 0.0f;                           // previous raw ax (g)
float axHP   = 0.0f;                           // high-pass filtered ax (g)

// ---- Quiet / hysteresis thresholds ----
// Quiet = treat as CENTER even if slightly biased, to kill flutter.
const float QUIET_G         = 0.05f;           // |axHP| below this is "quiet"
const uint32_t QUIET_HOLD_MS = 120;            // must be quiet this long to lock CENTER

// Hysteresis thresholds for starting/stopping firing:
const float START_THRESH_G  = 0.16f;           // must exceed this to start firing
const float STOP_THRESH_G   = 0.08f;           // stop firing when below this

// ---- Rate mapping ----
const float  RATE_MID_G     = 0.20f;           // accel that maps to BASE_RATE_MS
const float  RATE_HIGH_G    = 0.60f;           // accel that maps to MIN_RATE_MS
const uint32_t BASE_RATE_MS = 250;             // interval at RATE_MID_G
const uint32_t MIN_RATE_MS  = 60;              // fastest interval at/above RATE_HIGH_G

// ---- State ----
enum DirState { CENTER, LEFT_ACTIVE, RIGHT_ACTIVE };
DirState state = CENTER;

unsigned long quietStart = 0;                  // when we first entered quiet
bool quietCounting = false;

unsigned long lastLeft  = 0;
unsigned long lastRight = 0;

BleKeyboard bleKB("ESP32-ArrowKeys");

// ---------- I2C helpers ----------
bool i2cWrite8(uint8_t dev, uint8_t reg, uint8_t val) {
  Wire.beginTransmission(dev);
  Wire.write(reg);
  Wire.write(val);
  return Wire.endTransmission(true) == 0;
}
bool i2cReadN(uint8_t dev, uint8_t reg, uint8_t n, uint8_t* buf) {
  Wire.beginTransmission(dev);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  int got = Wire.requestFrom(dev, n, (uint8_t)true);
  if (got != n) return false;
  for (int i=0; i<n; ++i) buf[i] = Wire.read();
  return true;
}
bool mpuInit() {
  if (!i2cWrite8(MPU_ADDR, REG_PWR_MGMT_1, 0x00)) return false; // wake
  delay(50);
  uint8_t id;
  if (!i2cReadN(MPU_ADDR, REG_WHO_AM_I, 1, &id)) return false;
  return (id == 0x68);
}
bool readAccelX(float &ax_g) {
  uint8_t b[2];
  if (!i2cReadN(MPU_ADDR, REG_ACCEL_XOUT_H, 2, b)) return false;
  int16_t ax = (b[0] << 8) | b[1];
  ax_g = ax * G_PER_LSB;
  return true;
}

// ---- rate map helper ----
uint32_t rateFromAccel(float mag) {
  float g = mag;
  if (g < RATE_MID_G) g = RATE_MID_G;
  if (g > RATE_HIGH_G) g = RATE_HIGH_G;
  float t = (g - RATE_MID_G) / (RATE_HIGH_G - RATE_MID_G);  // 0..1
  uint32_t rate = BASE_RATE_MS - (uint32_t)((BASE_RATE_MS - MIN_RATE_MS) * t);
  if (rate < MIN_RATE_MS) rate = MIN_RATE_MS;
  return rate;
}

void setup() {
  Serial.begin(115200);
  delay(150);
  Serial.println("\nBooting…");

  Wire.begin(SDA_PIN, SCL_PIN);
  delay(100);

  if (!mpuInit()) Serial.println("MPU6050 init FAIL");
  else            Serial.println("MPU6050 OK (WHO_AM_I=0x68)");

  bleKB.begin();

  // HPF alpha = RC / (RC + dt)
  const float dt = 1.0f / (float)LOOP_HZ;
  const float RC = 1.0f / (2.0f * PI * HPF_CUTOFF_HZ);
  hpf_alpha = RC / (RC + dt);
  Serial.print("HPF alpha = "); Serial.println(hpf_alpha, 5);

  // settle filter
  float ax0;
  for (int i=0; i<10; ++i) {
    if (readAccelX(ax0)) { prevAx = ax0; axHP = 0.0f; }
    delay(5);
  }
}

void loop() {
  unsigned long now = millis();
  if (now - lastLoop < LOOP_MS) return;
  lastLoop = now;

  if (!bleKB.isConnected()) return;

  float ax;
  if (!readAccelX(ax)) return;

  // High-pass filter: y[n] = a*(y[n-1] + x[n] - x[n-1])
  axHP = hpf_alpha * (axHP + ax - prevAx);
  prevAx = ax;

  float mag = fabs(axHP);
  bool isRight = (axHP > 0);

  // ---- Quiet detection → lock CENTER after QUIET_HOLD_MS ----
  if (mag < QUIET_G) {
    if (!quietCounting) {
      quietCounting = true;
      quietStart = now;
    } else if (now - quietStart >= QUIET_HOLD_MS) {
      // sustained quiet → force CENTER (no output, no chatter)
      if (state != CENTER) {
        state = CENTER;
        // reset timers so next burst isn't rate-limited by old timestamps
        lastLeft = lastRight = 0;
      }
    }
  } else {
    // not quiet anymore
    quietCounting = false;
  }

  // ---- State machine with hysteresis ----
  switch (state) {
    case CENTER:
      // stay centered until we exceed START threshold
      if (mag >= START_THRESH_G) {
        state = isRight ? RIGHT_ACTIVE : LEFT_ACTIVE;
      }
      break;

    case LEFT_ACTIVE:
      if (mag < STOP_THRESH_G || isRight) {
        // dropped below stop OR flipped sign → go idle/center and wait
        state = CENTER;
        break;
      }
      // fire left at rate mapped from magnitude
      if (now - lastLeft >= rateFromAccel(mag)) {
        bleKB.write(KEY_LEFT_ARROW);
        lastLeft = now;
        // Serial.printf("LEFT  | axHP=%.3f g  rate=%ums\n", axHP, rateFromAccel(mag));
      }
      break;

    case RIGHT_ACTIVE:
      if (mag < STOP_THRESH_G || !isRight) {
        state = CENTER;
        break;
      }
      if (now - lastRight >= rateFromAccel(mag)) {
        bleKB.write(KEY_RIGHT_ARROW);
        lastRight = now;
        // Serial.printf("RIGHT | axHP=%.3f g  rate=%ums\n", axHP, rateFromAccel(mag));
      }
      break;
  }

  // Optional: debug every ~150ms
  static uint8_t ctr=0;
  if (++ctr % 15 == 0) {
    const char* s = (state==CENTER?"C":(state==LEFT_ACTIVE?"L":"R"));
    Serial.print("axHP="); Serial.print(axHP,3);
    Serial.print("  |state="); Serial.print(s);
    Serial.print("  |quiet="); Serial.print(quietCounting?"*":"-");
    Serial.println();
  }
}
