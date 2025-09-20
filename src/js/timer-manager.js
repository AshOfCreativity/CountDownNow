class Timer {
    constructor(name, duration) {
        this.name = name;
        this.duration = duration;
        this.remaining = duration;
        this.running = false;
        this.paused = false;
        this.intervalId = null;
        this.startTime = null;
        this.callback = null;
        this.alerting = false;
        this.completionCallback = null;
    }

    formatTime(seconds) {
        if (seconds <= 0) {
            return "0m";
        }

        const minutes = Math.floor(seconds / 60);
        if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${seconds}s`;
        }
    }

    run() {
        this.startTime = new Date();
        let lastOutput = "";

        const tick = () => {
            if (this.remaining > 0 && this.running) {
                if (!this.paused) {
                    const currentOutput = this.formatTime(this.remaining);
                    if (currentOutput !== lastOutput) {
                        if (this.callback) {
                            this.callback(`[${this.name}]: ${currentOutput}`);
                        }
                        lastOutput = currentOutput;
                    }
                    this.remaining -= 1;
                }
                
                this.intervalId = setTimeout(tick, 1000);
            } else if (this.remaining <= 0 && this.running) {
                if (this.callback) {
                    this.callback(`[${this.name}]: Complete!`);
                    this.alerting = true;
                    
                    if (this.completionCallback) {
                        this.completionCallback(this.name);
                    }
                }
            }
        };

        this.intervalId = setTimeout(tick, 1000);
    }

    stop() {
        this.running = false;
        if (this.intervalId) {
            clearTimeout(this.intervalId);
            this.intervalId = null;
        }
    }
}

class TimerManager {
    constructor() {
        this.timers = new Map();
        this.outputCallback = null;
        this.alertManager = null;
        this.regimenManager = null;
    }

    setOutputCallback(callback) {
        this.outputCallback = callback;
        
        // Initialize regimen manager with callback if it exists
        if (!this.regimenManager && window.RegimenManager) {
            this.regimenManager = new RegimenManager(this, callback);
        }
    }

    setAlertManager(alertManager) {
        this.alertManager = alertManager;
    }

    setRegimenManager(regimenManager) {
        this.regimenManager = regimenManager;
    }

    _print(message) {
        if (this.outputCallback) {
            this.outputCallback(message);
        } else {
            console.log(message);
        }
    }

    createTimer(name, duration) {
        if (this.timers.has(name)) {
            const existingTimer = this.timers.get(name);
            if (existingTimer.alerting && this.alertManager) {
                this.alertManager.stopAlert(name);
                existingTimer.alerting = false;
                existingTimer.duration = duration;
                existingTimer.remaining = duration;
                existingTimer.running = true;
                existingTimer.paused = false;
                this._print(`Refreshed timer '${name}' (${existingTimer.formatTime(duration)})`);
                return;
            }
            throw new Error(`Timer '${name}' already exists`);
        }

        const timer = new Timer(name, duration);
        timer.callback = this._print.bind(this);
        
        if (this.regimenManager) {
            timer.completionCallback = this.regimenManager.onTimerComplete.bind(this.regimenManager);
        }
        
        this.timers.set(name, timer);
        this._print(`Created timer '${name}' (${timer.formatTime(duration)})`);

        // Send initial timer state to display
        this._print(`[${name}]: ${timer.formatTime(duration)}`);

        // Automatically start the timer
        this.startTimer(name);
    }

    startTimer(name) {
        if (!this.timers.has(name)) {
            throw new Error(`Timer '${name}' does not exist`);
        }

        const timer = this.timers.get(name);
        if (timer.running) {
            this._print(`Timer '${name}' is already running`);
            return;
        }

        // Stop any existing alert
        if (timer.alerting && this.alertManager) {
            this.alertManager.stopAlert(name);
            timer.alerting = false;
        }

        timer.running = true;
        timer.paused = false;
        timer.run();

        // Set up alert when timer completes
        const checkAndAlert = () => {
            if (timer.running && timer.remaining <= 0 && this.alertManager) {
                this.alertManager.startAlert(name);
            }
        };

        // Check for completion after a delay
        setTimeout(() => {
            const checkInterval = setInterval(() => {
                if (timer.remaining <= 0 || !timer.running) {
                    clearInterval(checkInterval);
                    if (timer.remaining <= 0 && timer.running) {
                        checkAndAlert();
                    }
                }
            }, 1000);
        }, 1000);
    }

    pauseTimer(name) {
        if (!this.timers.has(name)) {
            throw new Error(`Timer '${name}' does not exist`);
        }

        const timer = this.timers.get(name);
        if (!timer.running) {
            this._print(`Timer '${name}' is not running`);
            return;
        }

        timer.paused = true;
        this._print(`[${name}]: ${timer.formatTime(timer.remaining)}`);

        // Stop alert if timer is alerting
        if (timer.alerting && this.alertManager) {
            this.alertManager.stopAlert(name);
            timer.alerting = false;
        }
    }

    resumeTimer(name) {
        if (!this.timers.has(name)) {
            throw new Error(`Timer '${name}' does not exist`);
        }

        const timer = this.timers.get(name);
        if (!timer.running) {
            this._print(`Timer '${name}' is not running`);
            return;
        }

        // Stop alert if timer is alerting
        if (timer.alerting && this.alertManager) {
            this.alertManager.stopAlert(name);
            timer.alerting = false;
        }

        timer.paused = false;
        this._print(`[${name}]: ${timer.formatTime(timer.remaining)}`);
    }

    stopTimer(name) {
        if (!this.timers.has(name)) {
            throw new Error(`Timer '${name}' does not exist`);
        }

        const timer = this.timers.get(name);
        timer.stop();
        timer.remaining = timer.duration;

        // Stop alert if timer is alerting
        if (timer.alerting && this.alertManager) {
            this.alertManager.stopAlert(name);
            timer.alerting = false;
        }

        this._print(`Stopped timer '${name}'`);
        this._print(`[${name}]: Complete!`);
    }

    deleteTimer(name) {
        if (!this.timers.has(name)) {
            throw new Error(`Timer '${name}' does not exist`);
        }

        const timer = this.timers.get(name);
        
        // Stop alert if timer is alerting
        if (timer.alerting && this.alertManager) {
            this.alertManager.stopAlert(name);
        }

        this.stopTimer(name);
        this.timers.delete(name);
        this._print(`Deleted timer '${name}'`);
    }

    listTimers() {
        if (this.timers.size === 0) {
            this._print("No active timers");
            return;
        }

        for (const [name, timer] of this.timers) {
            if (timer.running) {
                this._print(`[${name}]: ${timer.formatTime(timer.remaining)}`);
            }
        }
    }

    stopAllTimers() {
        if (this.alertManager) {
            this.alertManager.stopAllAlerts();
        }
        
        for (const name of this.timers.keys()) {
            this.stopTimer(name);
        }
    }

    clearAllTimers() {
        if (this.timers.size === 0) {
            this._print("No timers to clear");
            return;
        }

        // Stop all alerts first
        if (this.alertManager) {
            this.alertManager.stopAllAlerts();
        }

        // Get list of timer names
        const timerNames = Array.from(this.timers.keys());

        // Clear all timers
        for (const timer of this.timers.values()) {
            timer.stop();
        }
        this.timers.clear();

        this._print(`Cleared ${timerNames.length} timer(s): ${timerNames.join(', ')}`);

        // Notify the UI to remove all timer displays
        if (this.uiUpdateCallback) {
            for (const name of timerNames) {
                this.uiUpdateCallback('remove_timer', name);
            }
        }
    }

    executeCommand(command) {
        const cmdType = command.type;

        try {
            switch (cmdType) {
                case "create":
                    this.createTimer(command.name, command.duration);
                    break;
                case "start":
                    this.startTimer(command.name);
                    break;
                case "pause":
                    this.pauseTimer(command.name);
                    break;
                case "resume":
                    this.resumeTimer(command.name);
                    break;
                case "stop":
                    this.stopTimer(command.name);
                    break;
                case "delete":
                    this.deleteTimer(command.name);
                    break;
                case "list":
                    this.listTimers();
                    break;
                case "clear":
                    this.clearAllTimers();
                    break;
                case "run_regimen":
                    if (this.regimenManager) {
                        this.regimenManager.runRegimen(command.name);
                    } else {
                        this._print("Regimen manager not initialized");
                    }
                    break;
                case "list_regimens":
                    if (this.regimenManager) {
                        this.regimenManager.listRegimens();
                    } else {
                        this._print("Regimen manager not initialized");
                    }
                    break;
                default:
                    this._print(`Unknown command type: ${cmdType}`);
            }
        } catch (error) {
            this._print(`Error: ${error.message}`);
        }
    }

    // Get timer by name for UI updates
    getTimer(name) {
        return this.timers.get(name);
    }

    // Get all timers
    getAllTimers() {
        return Array.from(this.timers.values());
    }
}

// Make TimerManager available globally
window.TimerManager = TimerManager;