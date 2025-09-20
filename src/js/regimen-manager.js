class RegimenManager {
    constructor(timerManager, outputCallback = null) {
        this.timerManager = timerManager;
        this.outputCallback = outputCallback;
        this.regimensFile = "regimens.json";
        this.currentRegimen = null;
        this.currentRegimenQueue = [];
        this.currentRegimenName = "";
    }

    _print(message) {
        if (this.outputCallback) {
            this.outputCallback(message);
        } else {
            console.log(message);
        }
    }

    loadRegimens() {
        try {
            // Use localStorage for regimens persistence in Electron
            const regimensData = localStorage.getItem(this.regimensFile);
            if (regimensData) {
                return JSON.parse(regimensData);
            }
            return {};
        } catch (error) {
            this._print(`Error loading regimens: ${error.message}`);
            return {};
        }
    }

    saveRegimens(regimens) {
        try {
            // Use localStorage for regimens persistence in Electron
            localStorage.setItem(this.regimensFile, JSON.stringify(regimens));
        } catch (error) {
            this._print(`Error saving regimens: ${error.message}`);
        }
    }

    createRegimen(name, timers) {
        const regimens = this.loadRegimens();
        regimens[name] = timers;
        this.saveRegimens(regimens);
        this._print(`Created regimen '${name}' with ${timers.length} timer(s)`);
    }

    listRegimens() {
        const regimens = this.loadRegimens();
        if (Object.keys(regimens).length === 0) {
            this._print("No regimens available");
            return;
        }

        this._print("Available regimens:");
        for (const [name, timers] of Object.entries(regimens)) {
            const timerList = timers.map(t => `${t.name} (${t.duration}s)`).join(", ");
            this._print(`- ${name}: ${timerList}`);
        }
    }

    runRegimen(name) {
        const regimens = this.loadRegimens();
        if (!(name in regimens)) {
            this._print(`Regimen '${name}' not found`);
            return;
        }

        this.currentRegimenName = name;
        this.currentRegimenQueue = [...regimens[name]]; // Create a copy

        if (this.currentRegimenQueue.length === 0) {
            this._print(`Regimen '${name}' is empty`);
            return;
        }

        // Start the first timer in the regimen
        this._startNextTimer();
    }

    _startNextTimer() {
        if (this.currentRegimenQueue.length === 0) {
            this._print(`Regimen '${this.currentRegimenName}' completed!`);
            this.currentRegimenName = "";
            return;
        }

        const nextTimer = this.currentRegimenQueue.shift();
        const timerName = `${this.currentRegimenName}_${nextTimer.name}`;

        this._print(`Starting regimen timer: ${timerName} (${nextTimer.duration}s)`);

        // Create and start the timer
        this.timerManager.createTimer(timerName, nextTimer.duration);
    }

    onTimerComplete(timerName) {
        if (!this.currentRegimenName) {
            return;
        }

        // Check if this timer is part of the current regimen
        if (timerName.startsWith(`${this.currentRegimenName}_`)) {
            // Start the next timer in the regimen after a short delay
            setTimeout(() => {
                this._startNextTimer();
            }, 1000); // Brief pause between timers
        }
    }

    // Get regimens for UI display
    getRegimens() {
        return this.loadRegimens();
    }

    // Delete a regimen
    deleteRegimen(name) {
        const regimens = this.loadRegimens();
        if (name in regimens) {
            delete regimens[name];
            this.saveRegimens(regimens);
            this._print(`Deleted regimen '${name}'`);
            return true;
        } else {
            this._print(`Regimen '${name}' not found`);
            return false;
        }
    }

    // Check if a regimen exists
    regimenExists(name) {
        const regimens = this.loadRegimens();
        return name in regimens;
    }

    // Get regimen details
    getRegimen(name) {
        const regimens = this.loadRegimens();
        return regimens[name] || null;
    }

    // Stop current regimen
    stopCurrentRegimen() {
        if (this.currentRegimenName) {
            this._print(`Stopping regimen '${this.currentRegimenName}'`);
            this.currentRegimenName = "";
            this.currentRegimenQueue = [];
        }
    }

    // Get current regimen status
    getCurrentRegimenStatus() {
        if (!this.currentRegimenName) {
            return null;
        }

        return {
            name: this.currentRegimenName,
            remaining: this.currentRegimenQueue.length,
            total: this.getRegimen(this.currentRegimenName)?.length || 0
        };
    }
}

// Make RegimenManager available globally
window.RegimenManager = RegimenManager;