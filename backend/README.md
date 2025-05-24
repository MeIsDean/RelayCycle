# Plant Monitoring and Control System

A web-based system for monitoring plant cameras and controlling relays through configurable cycles.

## Features

- **Camera Management**
  - Multiple camera support
  - Live image viewing
  - Image history
  - Automatic image updates

- **Relay Control**
  - Configurable relay settings (pin, name, color)
  - Manual control
  - Status monitoring
  - Inverted logic support

- **Cycle Management**
  - Create custom cycles
  - Configure relay timing
  - Pause/Resume cycles
  - Enable/Disable cycles
  - Inter-cycle control

- **Emergency Features**
  - Emergency shutdown button
  - Automatic relay deactivation
  - Cycle interruption

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
node server.js
```

3. Start the React frontend:
```bash
cd camcontrol
npm install
npm start
```

## API Endpoints

### Camera
- `GET /api/cameras` - List all cameras
- `GET /api/camera/:cam` - Get camera images
- `GET /api/camera/:cam/last` - Get latest image
- `GET /api/camera/:cam/:file` - Get specific image
- `POST /api/upload` - Upload new image

### Relays
- `GET /api/relays` - List all relays
- `POST /api/relay` - Add/Update relay
- `POST /api/relay/:id/toggle` - Toggle relay
- `POST /api/relay/:id/set` - Set relay state

### Cycles
- `GET /api/cycles` - List all cycles
- `POST /api/cycle` - Add/Update cycle
- `POST /api/cycle/:id/pause` - Pause cycle
- `POST /api/cycle/:id/resume` - Resume cycle
- `POST /api/cycle/:id/disable` - Disable cycle
- `POST /api/cycle/:id/enable` - Enable cycle

### Emergency
- `POST /api/emergency-off` - Emergency shutdown

## ESP32 Integration

The system is designed to work with ESP32 devices:
- ESP32 with SIM card for main control
- ESP32-CAM modules for image capture
- Automatic image upload every 30 seconds
- Relay control through GPIO pins

## Security Notes

- The system currently runs without authentication
- Consider adding authentication for production use
- Implement rate limiting for API endpoints
- Secure the emergency shutdown feature 