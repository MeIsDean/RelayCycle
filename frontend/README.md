# ESP32 Kamera & Relais Control System

A comprehensive control system for managing ESP32 cameras and relays, with features for image capture, relay control, and automated cycles.

## Server Features

### Camera Management
- **Image Upload**: Supports JPG image uploads from ESP32 cameras
- **Image Storage**: Automatically organizes images by camera in timestamped files
- **Image Retrieval**: 
  - Get latest image from any camera
  - Browse camera history
  - Download images by date
  - Automatic cleanup of invalid files

### Relay Control
- **Relay Management**:
  - Create and configure relays with custom IDs, pins, and names
  - Toggle relay states (on/off)
  - Set relay states directly
  - Support for inverted relay logic
  - Custom color coding for relays
- **Real-time Updates**: WebSocket-based real-time relay state updates
- **Emergency Control**: Emergency shutdown feature to turn off all relays

### Cycle Management
- **Automated Cycles**:
  - Create custom cycles with multiple time points
  - Configure relay actions at specific times
  - Set cycle duration and start points
  - Support for cycle interactions (pause/resume/disable/enable)
- **Cycle Control**:
  - Start/stop cycles
  - Pause/resume functionality
  - Enable/disable cycles
  - Automatic state persistence
- **Cycle Actions**:
  - Relay control within cycles
  - Inter-cycle control (one cycle can control another)
  - Support for multiple actions per time point

### Data Persistence
- Automatic saving of:
  - Relay configurations
  - Cycle definitions
  - Running cycle states
- Periodic data backup (every 5 seconds)
- State recovery on server restart

### Debug Features
- Comprehensive debug endpoint
- Real-time system state monitoring
- Performance metrics
- Error logging

## API Endpoints

### Camera Endpoints
- `GET /api/cameras` - List all cameras
- `GET /api/camera/:cam` - Get camera history
- `GET /api/camera/:cam/last` - Get latest image
- `GET /api/camera/:cam/:file` - Get specific image
- `POST /api/upload` - Upload new image

### Relay Endpoints
- `GET /api/relays` - List all relays
- `POST /api/relay` - Create/update relay
- `POST /api/relay/:id/toggle` - Toggle relay state
- `POST /api/relay/:id/set` - Set relay state

### Cycle Endpoints
- `GET /api/cycles` - List all cycles
- `POST /api/cycle` - Create/update cycle
- `POST /api/cycle/:id/start` - Start cycle
- `POST /api/cycle/:id/stop` - Stop cycle
- `POST /api/cycle/:id/pause` - Pause cycle
- `POST /api/cycle/:id/resume` - Resume cycle
- `POST /api/cycle/:id/disable` - Disable cycle
- `POST /api/cycle/:id/enable` - Enable cycle
- `DELETE /api/cycle/:id` - Delete cycle

### Emergency Endpoint
- `POST /api/emergency-off` - Emergency shutdown

### Debug Endpoint
- `GET /api/debug` - Get system state

## WebSocket Features
- Real-time relay state updates
- Automatic reconnection handling
- JSON-based message format

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
node server.js
```

The server will run on port 4000, with WebSocket server on port 4001.

## Development

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Available Scripts

In the project directory, you can run:

#### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

#### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

#### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

#### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
