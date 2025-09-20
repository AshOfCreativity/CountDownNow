# Timer Assistant (JavaScript/Electron)

A desktop timer management application with natural language processing, built with JavaScript and Electron.

## Features

- **Natural Language Commands**: Set timers using natural language like "set a 5 minute timer for coffee break"
- **Multiple Timers**: Run multiple timers simultaneously with individual controls
- **Audio Alerts**: Customizable beep notifications when timers complete
- **Regimens**: Create and run sequences of timers (e.g., workout routines, pomodoro sessions)
- **Persistent Settings**: Audio settings and regimens are saved automatically
- **Cross-Platform**: Runs on Windows, macOS, and Linux

## Installation

### Development
```bash
npm install
npm start
```

### Building for Distribution
```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build-win    # Windows
npm run build-mac    # macOS
npm run build-linux  # Linux

# Create distributable packages
npm run dist
```

## Usage

### Timer Commands
- `"set a 5 minute timer for coffee break"`
- `"start a 25 min pomodoro timer"`
- `"create 1 hour meeting timer"`
- `"pause the coffee timer"`
- `"resume coffee timer"`
- `"stop meeting timer"`
- `"show all timers"`
- `"clear all timers"`

### Regimen Commands
- `"run workout regimen"`
- `"start pomodoro routine"`
- `"show regimens"`
- `"list all regimens"`

### UI Features
- **Audio Settings**: Customize beep frequency, duration, and interval
- **Regimen Manager**: Create and manage timer sequences
- **Active Timers Panel**: Visual display of running timers with status indicators

## Architecture

### Components
- **TimerManager**: Core timer functionality with JavaScript timers
- **CommandInterpreter**: Natural language processing for user commands
- **AlertManager**: Audio notifications using Web Audio API
- **RegimenManager**: Timer sequences with automatic progression
- **TimerApp**: Main application UI and integration

### Data Persistence
- Settings and regimens are stored in localStorage
- Cross-platform compatibility maintained through Electron

## Development

### Project Structure
```
src/
├── main.js              # Electron main process
├── index.html           # Application UI
├── css/
│   └── styles.css       # Application styling
└── js/
    ├── timer-manager.js     # Core timer functionality
    ├── command-interpreter.js # Natural language processing
    ├── alert-manager.js     # Audio notifications
    ├── regimen-manager.js   # Timer sequences
    └── app.js              # Main application logic
```

### Key Technologies
- **Electron**: Desktop application framework
- **Web Audio API**: Cross-platform audio notifications
- **LocalStorage**: Data persistence
- **Regular Expressions**: Command parsing and duration extraction

## Packaging

The application uses electron-builder for creating distributable packages:
- Windows: NSIS installer and portable executable
- macOS: DMG and ZIP archives
- Linux: AppImage and DEB packages

## Migration from Python

This JavaScript version replaces the original Python/Tkinter implementation with:
- Electron for cross-platform desktop deployment
- Web Audio API instead of system-specific audio libraries
- LocalStorage instead of JSON file persistence
- JavaScript timers instead of Python threading

All original functionality has been preserved while improving cross-platform compatibility and deployment options.