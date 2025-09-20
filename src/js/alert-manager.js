class AlertManager {
    constructor() {
        this.activeAlerts = new Map();
        this.alertStopFlags = new Map();
        this.settingsFile = "audio_settings.json";
        
        // Default settings
        this.alertTimeout = 120; // 2 minutes in seconds
        this.volume = 100; // Volume percentage (1-100)
        this.beepFrequency = 880; // Hz
        this.beepDuration = 500; // milliseconds
        this.beepInterval = 1.0; // seconds between beeps
        
        // Audio context for cross-platform beep generation
        this.audioContext = null;
        this.initializeAudioContext();
        
        // Load saved settings
        this.loadSettings();
    }

    initializeAudioContext() {
        try {
            // Initialize Web Audio API
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported, using fallback beep');
            this.audioContext = null;
        }
    }

    _playBeep() {
        if (this.audioContext) {
            try {
                // Create oscillator for beep sound
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.setValueAtTime(this.beepFrequency, this.audioContext.currentTime);
                oscillator.type = 'square';
                
                // Set volume (convert percentage to gain)
                gainNode.gain.setValueAtTime(this.volume / 100 * 0.1, this.audioContext.currentTime);
                
                // Play beep for specified duration
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + this.beepDuration / 1000);
                
                return true;
            } catch (e) {
                console.warn('Failed to play beep with Web Audio API:', e);
                return false;
            }
        }
        return false;
    }

    _playAlert(timerName) {
        const playLoop = () => {
            if (this.alertStopFlags.get(timerName)) {
                return; // Stop the loop
            }

            // Try to play beep, fallback to console beep if failed
            if (!this._playBeep()) {
                console.log('\x07'); // ASCII bell character
                console.log(`Timer ${timerName} completed!`);
            }

            // Schedule next beep
            setTimeout(playLoop, this.beepInterval * 1000);
        };

        playLoop();
    }

    startAlert(timerName) {
        // Stop existing alert if any
        this.stopAlert(timerName);

        // Resume audio context if suspended (required for some browsers)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Show desktop notification
        this._showDesktopNotification(timerName);

        // Set up new alert
        this.alertStopFlags.set(timerName, false);
        
        // Start alert with timeout
        this._alertWithTimeout(timerName);
    }

    _alertWithTimeout(timerName) {
        const startTime = Date.now();
        
        // Start the alert loop
        this._playAlert(timerName);
        
        // Set timeout to stop alert after specified duration
        const timeoutId = setTimeout(() => {
            this.stopAlert(timerName);
        }, this.alertTimeout * 1000);
        
        this.activeAlerts.set(timerName, timeoutId);
    }

    stopAlert(timerName) {
        if (this.alertStopFlags.has(timerName)) {
            this.alertStopFlags.set(timerName, true);
            
            if (this.activeAlerts.has(timerName)) {
                clearTimeout(this.activeAlerts.get(timerName));
                this.activeAlerts.delete(timerName);
            }
            
            // Clean up after a short delay
            setTimeout(() => {
                this.alertStopFlags.delete(timerName);
            }, 1000);
        }
    }

    stopAllAlerts() {
        for (const timerName of this.activeAlerts.keys()) {
            this.stopAlert(timerName);
        }
    }

    setAudioSettings(frequency = null, duration = null, interval = null) {
        if (frequency !== null) {
            this.beepFrequency = Math.max(37, Math.min(20000, parseInt(frequency)));
        }
        if (duration !== null) {
            this.beepDuration = Math.max(10, Math.min(5000, parseInt(duration)));
        }
        if (interval !== null) {
            this.beepInterval = Math.max(0.1, Math.min(10.0, parseFloat(interval)));
        }
        
        // Automatically save settings when changed
        this.saveSettings();
    }

    getAudioSettings() {
        return {
            frequency: this.beepFrequency,
            duration: this.beepDuration,
            interval: this.beepInterval
        };
    }

    async saveSettings() {
        const settings = {
            frequency: this.beepFrequency,
            duration: this.beepDuration,
            interval: this.beepInterval,
            alert_timeout: this.alertTimeout
        };
        
        try {
            // Use file-based persistence through Electron IPC
            if (window.electronAPI) {
                await window.electronAPI.saveFile(this.settingsFile, settings);
            }
        } catch (error) {
            console.error('Error saving audio settings:', error);
        }
    }

    async loadSettings() {
        try {
            // Use file-based persistence through Electron IPC
            if (window.electronAPI) {
                const result = await window.electronAPI.loadFile(this.settingsFile);
                if (result.success && result.data) {
                    const settings = result.data;
                    this.beepFrequency = settings.frequency || 880;
                    this.beepDuration = settings.duration || 500;
                    this.beepInterval = settings.interval || 1.0;
                    this.alertTimeout = settings.alert_timeout || 120;
                }
            }
        } catch (error) {
            console.error('Error loading audio settings:', error);
        }
    }

    // Test beep function for settings
    testBeep() {
        if (!this._playBeep()) {
            console.log('\x07'); // Fallback beep
            console.log('Test beep!');
        }
    }

    // Show desktop notification
    async _showDesktopNotification(timerName) {
        try {
            if (window.electronAPI) {
                await window.electronAPI.showNotification(
                    'Timer Complete',
                    `Timer '${timerName}' has finished!`
                );
            }
        } catch (error) {
            console.warn('Desktop notification failed:', error);
        }
    }

    // Method to restart alerts with new settings
    restartActiveAlerts() {
        const activeNames = Array.from(this.activeAlerts.keys());
        for (const timerName of activeNames) {
            if (this.activeAlerts.has(timerName)) {
                // Stop and restart alert with new settings
                this.stopAlert(timerName);
                setTimeout(() => {
                    this.startAlert(timerName);
                }, 100);
            }
        }
    }
}

// Make AlertManager available globally
window.AlertManager = AlertManager;