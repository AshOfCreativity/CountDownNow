class TimerApp {
    constructor() {
        // Initialize components
        this.timerManager = new TimerManager();
        this.commandInterpreter = new CommandInterpreter();
        this.alertManager = new AlertManager();
        this.regimenManager = new RegimenManager(this.timerManager, this.printOutput.bind(this));
        
        // Connect components
        this.timerManager.setOutputCallback(this.printOutput.bind(this));
        this.timerManager.setAlertManager(this.alertManager);
        this.timerManager.setRegimenManager(this.regimenManager);
        
        // UI elements
        this.commandInput = document.getElementById('commandInput');
        this.enterButton = document.getElementById('enterButton');
        this.outputText = document.getElementById('outputText');
        this.activeTimersContainer = document.getElementById('activeTimersContainer');
        
        // Button elements
        this.audioSettingsButton = document.getElementById('audioSettingsButton');
        this.regimensButton = document.getElementById('regimensButton');
        this.helpButton = document.getElementById('helpButton');
        
        // Modal elements
        this.audioSettingsModal = document.getElementById('audioSettingsModal');
        this.regimensModal = document.getElementById('regimensModal');
        this.modalOverlay = document.getElementById('modalOverlay');
        
        // Timer displays
        this.timerLabels = new Map();
        
        // Initialize UI
        this.initializeEventListeners();
        this.showHelp();
        this.commandInput.focus();
        
        // Start timer update loop
        this.startTimerUpdateLoop();
    }

    initializeEventListeners() {
        // Command input
        this.commandInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.processCommand();
            }
        });
        
        this.enterButton.addEventListener('click', () => {
            this.processCommand();
        });
        
        // Button listeners
        this.audioSettingsButton.addEventListener('click', () => {
            this.showAudioSettings();
        });
        
        this.regimensButton.addEventListener('click', () => {
            this.showRegimenSettings();
        });
        
        this.helpButton.addEventListener('click', () => {
            this.showHelp();
        });
        
        // Modal listeners
        this.initializeModalListeners();
    }

    initializeModalListeners() {
        // Audio Settings Modal
        const closeAudioSettings = document.getElementById('closeAudioSettings');
        const testBeepButton = document.getElementById('testBeepButton');
        const saveSettingsButton = document.getElementById('saveSettingsButton');
        const applyCloseButton = document.getElementById('applyCloseButton');
        
        closeAudioSettings.addEventListener('click', () => {
            this.hideModal(this.audioSettingsModal);
        });
        
        testBeepButton.addEventListener('click', () => {
            this.testBeep();
        });
        
        saveSettingsButton.addEventListener('click', () => {
            this.saveAudioSettings();
        });
        
        applyCloseButton.addEventListener('click', () => {
            this.saveAudioSettings();
            this.hideModal(this.audioSettingsModal);
        });
        
        // Audio settings sliders
        this.initializeAudioSliders();
        
        // Regimens Modal
        const closeRegimens = document.getElementById('closeRegimens');
        closeRegimens.addEventListener('click', () => {
            this.hideModal(this.regimensModal);
        });
        
        // Tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Regimen actions
        this.initializeRegimenListeners();
        
        // Modal overlay
        this.modalOverlay.addEventListener('click', () => {
            this.hideAllModals();
        });
    }

    initializeAudioSliders() {
        const frequencySlider = document.getElementById('frequencySlider');
        const durationSlider = document.getElementById('durationSlider');
        const intervalSlider = document.getElementById('intervalSlider');
        const timeoutSlider = document.getElementById('timeoutSlider');
        
        const frequencyValue = document.getElementById('frequencyValue');
        const durationValue = document.getElementById('durationValue');
        const intervalValue = document.getElementById('intervalValue');
        const timeoutValue = document.getElementById('timeoutValue');
        
        // Load current settings
        const settings = this.alertManager.getAudioSettings();
        frequencySlider.value = settings.frequency;
        durationSlider.value = settings.duration;
        intervalSlider.value = settings.interval;
        timeoutSlider.value = this.alertManager.alertTimeout;
        
        // Update value displays
        frequencyValue.textContent = `${settings.frequency} Hz`;
        durationValue.textContent = `${settings.duration} ms`;
        intervalValue.textContent = `${settings.interval.toFixed(1)} sec`;
        timeoutValue.textContent = `${this.alertManager.alertTimeout} sec`;
        
        // Add event listeners
        frequencySlider.addEventListener('input', (e) => {
            frequencyValue.textContent = `${e.target.value} Hz`;
        });
        
        durationSlider.addEventListener('input', (e) => {
            durationValue.textContent = `${e.target.value} ms`;
        });
        
        intervalSlider.addEventListener('input', (e) => {
            intervalValue.textContent = `${parseFloat(e.target.value).toFixed(1)} sec`;
        });
        
        timeoutSlider.addEventListener('input', (e) => {
            timeoutValue.textContent = `${e.target.value} sec`;
        });
    }

    initializeRegimenListeners() {
        const runRegimenButton = document.getElementById('runRegimenButton');
        const runRegimenInput = document.getElementById('runRegimenInput');
        const addTimerButton = document.getElementById('addTimerButton');
        const saveRegimenButton = document.getElementById('saveRegimenButton');
        
        runRegimenButton.addEventListener('click', () => {
            this.runRegimen();
        });
        
        runRegimenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.runRegimen();
            }
        });
        
        addTimerButton.addEventListener('click', () => {
            this.addTimerEntry();
        });
        
        saveRegimenButton.addEventListener('click', () => {
            this.saveRegimen();
        });
    }

    showHelp() {
        const helpText = `Welcome to Timer Assistant!
Just type what you want in natural language:

Timer Examples:
- "set a 5 minute timer for coffee break"
- "start a 25 min pomodoro timer"
- "create 1 hour meeting timer"
- "pause the coffee timer"
- "show all timers"
- "stop meeting timer"

Regimen Examples:
- "run workout regimen"
- "start pomodoro routine"
- "show regimens"
- "list all regimens"

The assistant will understand your intent and execute the command.
`;
        this.outputText.textContent = helpText;
    }

    printOutput(text) {
        // Check if this is a timer update message
        const timerUpdate = text.match(/^\[(.*?)\]:\s*(.*)$/);
        if (timerUpdate) {
            const [, name, info] = timerUpdate;
            if (info.includes("Complete")) {
                this.updateTimerDisplay(name, "Done!", "complete");
                this.outputText.textContent += `Timer '${name}' completed!\n`;
            } else {
                // Check if timer is paused
                const timer = this.timerManager.getTimer(name);
                const status = timer && timer.paused ? "paused" : "running";
                this.updateTimerDisplay(name, info, status);
            }
        } else {
            this.outputText.textContent += `${text}\n`;
        }
        this.outputText.scrollTop = this.outputText.scrollHeight;
    }

    updateTimerDisplay(name, timeStr, status) {
        if (!this.timerLabels.has(name)) {
            // Create new timer frame
            const timerFrame = document.createElement('div');
            timerFrame.className = 'timer-item';
            
            const icon = document.createElement('span');
            icon.className = 'timer-icon';
            
            const text = document.createElement('span');
            text.className = 'timer-text';
            
            timerFrame.appendChild(icon);
            timerFrame.appendChild(text);
            this.activeTimersContainer.appendChild(timerFrame);
            
            this.timerLabels.set(name, {
                frame: timerFrame,
                icon: icon,
                text: text
            });
        }
        
        const timerDisplay = this.timerLabels.get(name);
        
        // Update status icon and class
        let statusIcon = "⏱️";
        timerDisplay.frame.className = 'timer-item';
        
        if (status === "paused") {
            statusIcon = "⏸️";
            timerDisplay.frame.classList.add('timer-paused');
        } else if (status === "running") {
            statusIcon = "⏱️";
            timerDisplay.frame.classList.add('timer-running');
        } else if (status === "complete") {
            statusIcon = "⚠️";
            timerDisplay.frame.classList.add('timer-complete');
        }
        
        timerDisplay.icon.textContent = statusIcon;
        timerDisplay.text.textContent = `${name}: ${timeStr}`;
    }

    removeTimerDisplay(name) {
        if (this.timerLabels.has(name)) {
            const timerDisplay = this.timerLabels.get(name);
            timerDisplay.frame.remove();
            this.timerLabels.delete(name);
        }
    }

    processCommand() {
        const commandText = this.commandInput.value.trim();
        if (!commandText) {
            return;
        }

        this.commandInput.value = ""; // Clear input

        if (commandText.toLowerCase() === "help") {
            this.showHelp();
            return;
        }

        if (commandText.toLowerCase() === "exit") {
            if (window.require) {
                const { remote } = window.require('electron');
                remote.getCurrentWindow().close();
            }
            return;
        }

        // Process command through interpreter
        try {
            const result = this.commandInterpreter.interpret(commandText);
            if (result) {
                this.timerManager.executeCommand(result);
                this.printOutput(`Executed: ${commandText}`);
            } else {
                this.printOutput("I didn't understand that command. Try rephrasing or type 'help'.");
            }
        } catch (error) {
            this.printOutput(`Error: ${error.message}`);
        }
    }

    showAudioSettings() {
        // Load current settings
        const settings = this.alertManager.getAudioSettings();
        
        document.getElementById('frequencySlider').value = settings.frequency;
        document.getElementById('durationSlider').value = settings.duration;
        document.getElementById('intervalSlider').value = settings.interval;
        document.getElementById('timeoutSlider').value = this.alertManager.alertTimeout;
        
        document.getElementById('frequencyValue').textContent = `${settings.frequency} Hz`;
        document.getElementById('durationValue').textContent = `${settings.duration} ms`;
        document.getElementById('intervalValue').textContent = `${settings.interval.toFixed(1)} sec`;
        document.getElementById('timeoutValue').textContent = `${this.alertManager.alertTimeout} sec`;
        
        this.showModal(this.audioSettingsModal);
    }

    testBeep() {
        // Update settings first
        const frequency = parseInt(document.getElementById('frequencySlider').value);
        const duration = parseInt(document.getElementById('durationSlider').value);
        const interval = parseFloat(document.getElementById('intervalSlider').value);
        
        this.alertManager.setAudioSettings(frequency, duration, interval);
        this.alertManager.testBeep();
    }

    saveAudioSettings() {
        const frequency = parseInt(document.getElementById('frequencySlider').value);
        const duration = parseInt(document.getElementById('durationSlider').value);
        const interval = parseFloat(document.getElementById('intervalSlider').value);
        const timeout = parseInt(document.getElementById('timeoutSlider').value);
        
        this.alertManager.setAudioSettings(frequency, duration, interval);
        this.alertManager.alertTimeout = timeout;
        this.alertManager.saveSettings();
        
        // Restart active alerts with new settings
        this.alertManager.restartActiveAlerts();
        
        this.printOutput(`✓ Audio settings SAVED! Frequency: ${frequency}Hz, Duration: ${duration}ms, Interval: ${interval.toFixed(1)}s, Max Duration: ${timeout}s`);
    }

    showRegimenSettings() {
        this.refreshRegimenList();
        this.showModal(this.regimensModal);
    }

    refreshRegimenList() {
        const regimenList = document.getElementById('regimenList');
        const regimens = this.regimenManager.getRegimens();
        
        if (Object.keys(regimens).length === 0) {
            regimenList.textContent = "No regimens found. Create one using the 'Create Regimen' tab.";
        } else {
            let listText = "";
            for (const [name, timers] of Object.entries(regimens)) {
                listText += `Regimen: ${name}\n`;
                timers.forEach((timer, index) => {
                    listText += `  ${index + 1}. ${timer.name} - ${timer.duration}s\n`;
                });
                listText += "\n";
            }
            regimenList.textContent = listText;
        }
    }

    runRegimen() {
        const name = document.getElementById('runRegimenInput').value.trim();
        if (name) {
            this.regimenManager.runRegimen(name);
            this.printOutput(`Started regimen: ${name}`);
            document.getElementById('runRegimenInput').value = "";
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
        
        if (tabName === 'view') {
            this.refreshRegimenList();
        } else if (tabName === 'create') {
            this.resetCreateForm();
        }
    }

    resetCreateForm() {
        document.getElementById('regimenName').value = "";
        const timerEntries = document.getElementById('timerEntries');
        timerEntries.innerHTML = "";
        this.addTimerEntry(); // Add initial entry
    }

    addTimerEntry() {
        const timerEntries = document.getElementById('timerEntries');
        
        const entryDiv = document.createElement('div');
        entryDiv.className = 'timer-entry';
        
        entryDiv.innerHTML = `
            <label>Name:</label>
            <input type="text" class="timer-name" placeholder="Timer name">
            <label>Duration (seconds):</label>
            <input type="number" class="timer-duration" placeholder="Duration" min="1">
            <button type="button" class="remove-timer-button">Remove</button>
        `;
        
        const removeButton = entryDiv.querySelector('.remove-timer-button');
        removeButton.addEventListener('click', () => {
            entryDiv.remove();
        });
        
        timerEntries.appendChild(entryDiv);
    }

    saveRegimen() {
        const name = document.getElementById('regimenName').value.trim();
        if (!name) {
            this.printOutput("Please enter a regimen name");
            return;
        }

        const timerEntries = document.querySelectorAll('.timer-entry');
        const timers = [];
        
        for (const entry of timerEntries) {
            const timerName = entry.querySelector('.timer-name').value.trim();
            const durationStr = entry.querySelector('.timer-duration').value.trim();
            
            if (timerName && durationStr) {
                const duration = parseInt(durationStr);
                if (isNaN(duration) || duration <= 0) {
                    this.printOutput(`Invalid duration: ${durationStr}`);
                    return;
                }
                timers.push({ name: timerName, duration: duration });
            }
        }

        if (timers.length === 0) {
            this.printOutput("Please add at least one timer");
            return;
        }

        this.regimenManager.createRegimen(name, timers);
        this.printOutput(`Created regimen '${name}' with ${timers.length} timer(s)`);
        this.refreshRegimenList();
        this.resetCreateForm();
    }

    showModal(modal) {
        this.modalOverlay.classList.remove('hidden');
        modal.classList.remove('hidden');
    }

    hideModal(modal) {
        modal.classList.add('hidden');
        this.modalOverlay.classList.add('hidden');
    }

    hideAllModals() {
        this.audioSettingsModal.classList.add('hidden');
        this.regimensModal.classList.add('hidden');
        this.modalOverlay.classList.add('hidden');
    }

    startTimerUpdateLoop() {
        // Update timer displays every second
        setInterval(() => {
            for (const [name, timer] of this.timerManager.timers) {
                if (timer.running && !timer.paused) {
                    const status = timer.paused ? "paused" : "running";
                    this.updateTimerDisplay(name, timer.formatTime(timer.remaining), status);
                }
            }
        }, 1000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TimerApp();
});