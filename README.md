# Lane Runner Game - MAKERS of Change Challenge

An accessible lane runner game designed for the 2025 MAKERS of Change Assistive Technology Challenge. Built specifically for a child with cerebral palsy, featuring ESP32 wearable controller support and accessibility-focused design.

## 🎮 Game Features

- **3-lane runner gameplay** with smooth movement mechanics
- **Accessible design** with large objects, high contrast, and forgiving collision detection
- **Multiple input methods**: Keyboard (A/D keys, arrow keys) and gamepad support
- **ESP32 controller ready** for wearable IMU-based controls
- **Progressive difficulty** with gentle scaling for extended play sessions
- **Professional UI** with muted colors and clear visual feedback

## 🎨 Visual Design

- **Blue character** with detailed sprite-like appearance
- **Muted red cars** with realistic proportions and details (windshields, windows)
- **Responsive layout** that scales to any screen height while maintaining fixed width
- **Fade effects** on top and bottom edges for cinematic feel
- **4-second obstacle spacing** for accessible reaction times

## 🎯 Accessibility Features

- Large, clearly defined objects (120x60px player, 140x100px obstacles)
- High contrast colors optimized for visibility
- Forgiving collision detection with padding
- Auto-restart with visual countdown (3-2-1)
- No flashing lights or overwhelming effects
- Gentle difficulty progression

## 🚀 Deployment

This game is designed for easy Railway deployment:

1. Connect your GitHub repository to Railway
2. Railway automatically detects the `package.json`
3. Runs `npm install` and `npm start`
4. Game deploys to a live URL instantly

No environment variables or additional configuration required.

## 🛠 ESP32 Hardware Integration

The game includes complete documentation for ESP32 wearable controllers:

- **IMU sensor integration** (MPU-6050 or LSM6DS3)
- **BLE communication** for wireless control
- **Gesture detection** (tilt for lane changes, flick for actions)
- **Wearable design** with safety considerations
- **Battery management** and charging systems

See `/engineering club copy/` for detailed hardware specifications and firmware code.

## 🎯 Controls

- **Keyboard**: A/D keys or left/right arrow keys
- **Gamepad**: Left analog stick or D-pad
- **ESP32**: Arm tilt gestures (when connected)

## 🏆 Competition Context

Created for the 2025 MAKERS of Change Assistive Technology Challenge, focusing on:
- Making gaming accessible for children with motor challenges
- Sibling-inclusive gameplay design
- Real-world assistive technology implementation
- Professional presentation and documentation

## 🔧 Local Development

```bash
git clone https://github.com/Oliver-Tinapple/engclub1.git
cd engclub1
npm install
npm start
```

Game runs on `http://localhost:3000`

## 📁 Project Structure

```
├── index.html          # Main game page
├── script.js           # Game logic and rendering
├── style.css           # Responsive styling
├── package.json        # Railway deployment config
├── CLAUDE.md           # Development guidelines
└── engineering club copy/
    ├── ESP32_Game_Controller_Brief.txt
    ├── ESP32_Game_Controller_Pipeline.txt
    └── Hardware documentation and firmware
```

---

*Built with accessibility, inclusion, and real-world impact in mind.*