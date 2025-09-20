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

    async loadRegimens() {
        try {
            // Use file-based persistence through Electron IPC
            if (window.electronAPI) {
                const result = await window.electronAPI.loadFile(this.regimensFile);
                if (result.success && result.data) {
                    return result.data;
                }
            }
            return {};
        } catch (error) {
            this._print(`Error loading regimens: ${error.message}`);
            return {};
        }
    }

    async saveRegimens(regimens) {
        try {
            // Use file-based persistence through Electron IPC
            if (window.electronAPI) {
                await window.electronAPI.saveFile(this.regimensFile, regimens);
            }
        } catch (error) {
            this._print(`Error saving regimens: ${error.message}`);
        }
    }

    async createRegimen(name, timers) {
        const regimens = await this.loadRegimens();
        regimens[name] = timers;
        await this.saveRegimens(regimens);
        this._print(`Created regimen '${name}' with ${timers.length} timer(s)`);
    }

    async listRegimens() {
        const regimens = await this.loadRegimens();
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

    async runRegimen(name) {
        const regimens = await this.loadRegimens();
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
    async getRegimens() {
        return await this.loadRegimens();
    }

    // Delete a regimen
    async deleteRegimen(name) {
        const regimens = await this.loadRegimens();
        if (name in regimens) {
            delete regimens[name];
            await this.saveRegimens(regimens);
            this._print(`Deleted regimen '${name}'`);
            return true;
        } else {
            this._print(`Regimen '${name}' not found`);
            return false;
        }
    }

    // Check if a regimen exists
    async regimenExists(name) {
        const regimens = await this.loadRegimens();
        return name in regimens;
    }

    // Get regimen details
    async getRegimen(name) {
        const regimens = await this.loadRegimens();
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