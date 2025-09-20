class CommandInterpreter {
    constructor() {
        // Common time-related words and their multipliers (in seconds)
        this.timeMultipliers = {
            'second': 1, 'seconds': 1, 'sec': 1, 'secs': 1, 's': 1,
            'minute': 60, 'minutes': 60, 'min': 60, 'mins': 60, 'm': 60,
            'hour': 3600, 'hours': 3600, 'hr': 3600, 'hrs': 3600, 'h': 3600
        };

        // Command type indicators with more variations
        this.createIndicators = new Set(['set', 'create', 'make', 'start', 'begin', 'add', 'new', 'timer']);
        this.pauseIndicators = new Set(['pause', 'hold', 'wait', 'suspend', 'freeze', 'stop']);
        this.resumeIndicators = new Set(['resume', 'continue', 'unpause', 'restart', 'unfreeze', 'go']);
        this.stopIndicators = new Set(['stop', 'end', 'cancel', 'kill', 'terminate', 'abort']);
        this.deleteIndicators = new Set(['delete', 'remove', 'clear', 'destroy']);
        this.listIndicators = new Set(['list', 'show', 'display', 'view', 'what', 'status', 'timers']);
        this.regimenIndicators = new Set(['regimen', 'routine', 'sequence', 'workout', 'program']);
    }

    _extractDuration(text) {
        text = text.toLowerCase().trim();
        let totalSeconds = 0;
        let foundTime = false;

        // Handle combined formats first (e.g., "1 hour and 30 minutes", "1h30m")
        const timePartsRegex = /(\d+)\s*([hms]|hours?|minutes?|seconds?|hrs?|mins?|secs?)\b/g;
        let match;
        while ((match = timePartsRegex.exec(text)) !== null) {
            const value = parseInt(match[1]);
            let unit = match[2].toLowerCase().replace(/s$/, ''); // Remove plural 's'
            
            if (unit === 'h' || unit === 'hour' || unit === 'hr') {
                totalSeconds += value * 3600;
            } else if (unit === 'm' || unit === 'minute' || unit === 'min') {
                totalSeconds += value * 60;
            } else if (unit === 'second' || unit === 'sec') {
                totalSeconds += value;
            }
            foundTime = true;
        }

        // Try numeric followed by time unit format with word boundaries
        if (!foundTime) {
            const timeUnits = {
                'hours?': 3600, 'hrs?': 3600, 'h\\b': 3600,
                'minutes?': 60, 'mins?': 60, 'm\\b': 60,
                'seconds?': 1, 'secs?': 1, 's\\b': 1
            };
            
            for (const [unitPattern, multiplier] of Object.entries(timeUnits)) {
                const pattern = new RegExp(`(\\d+)\\s*(${unitPattern})`, 'g');
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    totalSeconds += parseInt(match[1]) * multiplier;
                    foundTime = true;
                }
            }
        }

        // Try word numbers (e.g., "five minutes") using simple word-to-number conversion
        if (!foundTime) {
            const wordNumbers = {
                'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
                'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
                'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
                'twenty-one': 21, 'twenty-two': 22, 'twenty-three': 23, 'twenty-four': 24,
                'twenty-five': 25, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60
            };

            for (const [unit, multiplier] of Object.entries(this.timeMultipliers)) {
                const pattern = new RegExp(`([a-zA-Z-]+)\\s*${unit}`, 'g');
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    const wordNumber = wordNumbers[match[1]];
                    if (wordNumber !== undefined) {
                        totalSeconds += wordNumber * multiplier;
                        foundTime = true;
                    }
                }
            }
        }

        // Try standalone numbers (assume minutes if no unit specified)
        if (!foundTime) {
            const numberMatch = text.match(/\b(\d+)\b/);
            if (numberMatch) {
                totalSeconds = parseInt(numberMatch[1]) * 60; // Assume minutes
                foundTime = true;
            }
        }

        return foundTime ? Math.floor(totalSeconds) : null;
    }

    _extractTimerName(text, durationText) {
        // Remove duration part from text
        text = text.replace(durationText, '').trim();

        // Look for words after "for", "called", "named", etc.
        const namingPhrases = ['called', 'named', 'for', 'label', 'titled'];
        for (const prefix of namingPhrases) {
            const pattern = new RegExp(`\\b${prefix}\\s+(.+?)(?:\\s+(?:timer|for|and|$)|$)`, 'i');
            const match = text.match(pattern);
            if (match) {
                let name = match[1].trim();
                // Remove articles and common words
                name = name.replace(/^(the|a|an)\s+/i, '');
                name = name.replace(/\b(timer|for)\b/gi, '').trim();
                // Clean up extra whitespace
                name = name.replace(/\s+/g, ' ');
                if (name) {
                    return name;
                }
            }
        }

        // Look for words that could be a name (excluding command words and time units)
        const words = text.toLowerCase().split(/\s+/);
        const excludeWords = new Set([
            ...Object.keys(this.timeMultipliers),
            ...this.createIndicators,
            ...this.pauseIndicators,
            ...this.resumeIndicators,
            ...this.stopIndicators,
            ...this.listIndicators,
            'a', 'an', 'the', 'timer', 'for', 'called', 'named', 'set'
        ]);

        const potentialNames = words.filter(w => !excludeWords.has(w) && w.length > 0);
        if (potentialNames.length > 0) {
            return potentialNames.join(" ");
        }

        // Default to "timer" if no name found
        return "timer";
    }

    interpret(text) {
        text = text.toLowerCase().trim();

        // Check for list command
        if (Array.from(this.listIndicators).some(indicator => text.includes(indicator))) {
            return { type: "list" };
        }

        // Check for regimen commands
        if (Array.from(this.regimenIndicators).some(indicator => text.includes(indicator))) {
            if (['run', 'start', 'execute', 'begin'].some(word => text.includes(word))) {
                // Extract regimen name - look for the regimen name after action words
                let name = null;

                // Try to find regimen name after action words
                for (const action of ['run', 'start', 'execute', 'begin']) {
                    if (text.includes(action)) {
                        const parts = text.split(action);
                        if (parts.length > 1) {
                            let remaining = parts[1].trim();
                            // Remove articles and regimen indicators
                            remaining = remaining.replace(/^(the|a|an)\s+/, '');
                            for (const indicator of this.regimenIndicators) {
                                remaining = remaining.replace(new RegExp(indicator, 'g'), '').trim();
                            }
                            if (remaining) {
                                name = remaining;
                                break;
                            }
                        }
                    }
                }

                // If no name found after action words, look for name around regimen indicators
                if (!name) {
                    for (const indicator of this.regimenIndicators) {
                        if (text.includes(indicator)) {
                            const parts = text.split(indicator);
                            if (parts.length > 1) {
                                // Check after the indicator first
                                let afterText = parts[1].trim();
                                afterText = afterText.replace(/^(the|a|an)\s+/, '');
                                // Remove action words
                                for (const word of ['run', 'start', 'execute', 'begin']) {
                                    afterText = afterText.replace(new RegExp(word, 'g'), '').trim();
                                }
                                if (afterText) {
                                    name = afterText;
                                    break;
                                }

                                // If nothing after, check before the indicator
                                const beforeText = parts[0].trim();
                                const words = beforeText.split(/\s+/);
                                if (words.length > 0) {
                                    const potentialName = words[words.length - 1];
                                    if (!['run', 'start', 'execute', 'begin', 'the', 'a', 'an'].includes(potentialName)) {
                                        name = potentialName;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                // Use the found name or default to "workout"
                return { type: "run_regimen", name: name || "workout" };
            } else if (['list', 'show'].some(word => text.includes(word))) {
                return { type: "list_regimens" };
            }
        }

        // Check for clear all timers command
        if (['clear', 'delete', 'remove'].some(word => text.includes(word)) && 
            ['all', 'everything', 'timers'].some(word => text.includes(word))) {
            return { type: "clear" };
        }

        // Check for delete commands first (more specific)
        if (Array.from(this.deleteIndicators).some(indicator => text.includes(indicator))) {
            for (const indicator of this.deleteIndicators) {
                if (text.includes(indicator)) {
                    const parts = text.split(indicator);
                    if (parts.length > 1) {
                        let name = parts[1].trim();
                        name = name.replace(/^(the|a|an)\s+/, '');
                        name = name.replace(/timer/g, '').trim();
                        if (name) {
                            return { type: "delete", name: name };
                        }
                    }
                    return { type: "delete", name: "timer" };
                }
            }
        }

        // Check for pause/resume/stop commands
        const commandTypes = [
            ["pause", this.pauseIndicators],
            ["resume", this.resumeIndicators],
            ["stop", this.stopIndicators]
        ];

        for (const [commandType, indicators] of commandTypes) {
            if (Array.from(indicators).some(indicator => text.includes(indicator))) {
                // Extract timer name (everything after the command word)
                for (const indicator of indicators) {
                    if (text.includes(indicator)) {
                        const parts = text.split(indicator);
                        if (parts.length > 1) {
                            let name = parts[1].trim();
                            name = name.replace(/^(the|a|an)\s+/, '');
                            name = name.replace(/timer/g, '').trim();
                            if (name) {
                                return { type: commandType, name: name };
                            }
                        }
                        return { type: commandType, name: "timer" };
                    }
                }
            }
        }

        // Handle create/start command
        const duration = this._extractDuration(text);
        if (duration) {
            // Find the text that contains the duration
            let durationText = text; // Default to full text if we can't isolate duration part

            // Try to find the exact duration text that matched
            for (const unit of Object.keys(this.timeMultipliers)) {
                if (text.includes(unit)) {
                    // Find the number (word or digit) before the unit
                    const match = text.match(new RegExp(`(\\d+|\\w+)\\s*${unit}`));
                    if (match) {
                        durationText = match[0];
                        break;
                    }
                }
            }

            const name = this._extractTimerName(text, durationText);
            return { type: "create", name: name, duration: duration };
        }

        return null;
    }
}

// Make CommandInterpreter available globally
window.CommandInterpreter = CommandInterpreter;