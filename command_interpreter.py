import re
from typing import Optional, Dict
from word2number import w2n

class CommandInterpreter:
    def __init__(self):
        # Common time-related words and their multipliers (in seconds)
        self.time_multipliers = {
            'second': 1, 'seconds': 1, 'sec': 1, 'secs': 1, 's': 1,
            'minute': 60, 'minutes': 60, 'min': 60, 'mins': 60, 'm': 60,
            'hour': 3600, 'hours': 3600, 'hr': 3600, 'hrs': 3600, 'h': 3600
        }

        # Command type indicators with more variations
        self.create_indicators = {'set', 'create', 'make', 'start', 'begin', 'add', 'new', 'timer'}
        self.pause_indicators = {'pause', 'hold', 'wait', 'suspend', 'freeze', 'stop'}
        self.resume_indicators = {'resume', 'continue', 'unpause', 'restart', 'unfreeze', 'go'}
        self.stop_indicators = {'stop', 'end', 'cancel', 'kill', 'terminate', 'abort'}
        self.delete_indicators = {'delete', 'remove', 'clear', 'destroy'}
        self.list_indicators = {'list', 'show', 'display', 'view', 'what', 'status', 'timers'}
        self.regimen_indicators = {'regimen', 'routine', 'sequence', 'workout', 'program'}

    def _extract_duration(self, text: str) -> Optional[int]:
        """Extract duration from text in various formats."""
        text = text.lower().strip()
        total_seconds = 0
        found_time = False

        # Handle combined formats first (e.g., "1 hour and 30 minutes", "1h30m")
        # Only match time units that are either standalone or directly attached to numbers
        time_parts = re.findall(r'(\d+)\s*([hms]|hours?|minutes?|seconds?|hrs?|mins?|secs?)\b', text)
        if time_parts:
            for value, unit in time_parts:
                unit = unit.lower().rstrip('s')  # Remove plural 's'
                try:
                    number = int(value)
                    if unit in ['h', 'hour', 'hr']:
                        total_seconds += number * 3600
                    elif unit in ['m', 'minute', 'min']:
                        total_seconds += number * 60
                    elif unit in ['second', 'sec']:
                        total_seconds += number
                    found_time = True
                except ValueError:
                    continue

        # Try numeric followed by time unit format with word boundaries
        if not found_time:
            # Only match complete time words, not parts of other words
            time_units = {
                'hours?': 3600, 'hrs?': 3600, 'h\\b': 3600,
                'minutes?': 60, 'mins?': 60, 'm\\b': 60,
                'seconds?': 1, 'secs?': 1, 's\\b': 1
            }
            
            for unit_pattern, multiplier in time_units.items():
                pattern = rf'(\d+)\s*({unit_pattern})'
                matches = re.finditer(pattern, text)
                for match in matches:
                    try:
                        total_seconds += int(match.group(1)) * multiplier
                        found_time = True
                    except ValueError:
                        continue

        # Try word numbers (e.g., "five minutes")
        if not found_time:
            for unit, multiplier in self.time_multipliers.items():
                pattern = rf'([a-zA-Z-]+)\s*{unit}'
                matches = re.finditer(pattern, text)
                for match in matches:
                    try:
                        from word2number import w2n
                        number = w2n.word_to_num(match.group(1))
                        total_seconds += number * multiplier
                        found_time = True
                    except (ValueError, ImportError):
                        continue

        # Try standalone numbers (assume minutes if no unit specified)
        if not found_time and re.search(r'\b\d+\b', text):
            match = re.search(r'\b(\d+)\b', text)
            if match:
                try:
                    total_seconds = int(match.group(1)) * 60  # Assume minutes
                    found_time = True
                except ValueError:
                    pass

        return int(total_seconds) if found_time else None

    def _extract_timer_name(self, text: str, duration_text: str) -> str:
        """Extract timer name from the command."""
        # Remove duration part from text
        text = text.replace(duration_text, '').strip()

        # Look for words after "for", "called", "named", etc.
        naming_phrases = ['called', 'named', 'for', 'label', 'titled']
        for prefix in naming_phrases:
            # Look for the naming phrase followed by the timer name
            pattern = rf'\b{prefix}\s+(.+?)(?:\s+(?:timer|for|and|$)|$)'
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Remove articles and common words
                name = re.sub(r'^(the|a|an)\s+', '', name, flags=re.IGNORECASE)
                name = re.sub(r'\b(timer|for)\b', '', name, flags=re.IGNORECASE).strip()
                # Clean up extra whitespace
                name = ' '.join(name.split())
                if name:
                    return name

        # Look for words that could be a name (excluding command words and time units)
        words = text.lower().split()
        exclude_words = (set(self.time_multipliers.keys()) | 
                        self.create_indicators | 
                        self.pause_indicators | 
                        self.resume_indicators | 
                        self.stop_indicators |
                        self.list_indicators |
                        {'a', 'an', 'the', 'timer', 'for', 'called', 'named', 'set'})

        potential_names = [w for w in words if w not in exclude_words]
        if potential_names:
            return " ".join(potential_names)

        # Default to "timer" if no name found
        return "timer"

    def interpret(self, text: str) -> Optional[Dict]:
        """Interpret the natural language command and return a structured command."""
        text = text.lower().strip()

        # Check for list command
        if any(indicator in text for indicator in self.list_indicators):
            return {"type": "list"}
        
        # Check for regimen commands
        if any(indicator in text for indicator in self.regimen_indicators):
            if any(word in text for word in ['run', 'start', 'execute', 'begin']):
                # Extract regimen name - look for the regimen name after action words
                name = None
                
                # Try to find regimen name after action words
                for action in ['run', 'start', 'execute', 'begin']:
                    if action in text:
                        # Split on the action word and look for regimen name after it
                        parts = text.split(action, 1)
                        if len(parts) > 1:
                            remaining = parts[1].strip()
                            # Remove articles and regimen indicators
                            remaining = re.sub(r'^(the|a|an)\s+', '', remaining)
                            for indicator in self.regimen_indicators:
                                remaining = remaining.replace(indicator, '').strip()
                            if remaining:
                                name = remaining
                                break
                
                # If no name found after action words, look for name around regimen indicators
                if not name:
                    for indicator in self.regimen_indicators:
                        if indicator in text:
                            # Look before and after the indicator
                            parts = text.split(indicator)
                            if len(parts) > 1:
                                # Check after the indicator first
                                after_text = parts[1].strip()
                                after_text = re.sub(r'^(the|a|an)\s+', '', after_text)
                                # Remove action words
                                for word in ['run', 'start', 'execute', 'begin']:
                                    after_text = after_text.replace(word, '').strip()
                                if after_text:
                                    name = after_text
                                    break
                                
                                # If nothing after, check before the indicator
                                before_text = parts[0].strip()
                                words = before_text.split()
                                if words:
                                    # Take the last word before the indicator as potential name
                                    potential_name = words[-1]
                                    if potential_name not in ['run', 'start', 'execute', 'begin', 'the', 'a', 'an']:
                                        name = potential_name
                                        break
                
                # Use the found name or default to "workout"
                return {"type": "run_regimen", "name": name if name else "workout"}
            elif any(word in text for word in ['list', 'show']):
                return {"type": "list_regimens"}
        
        # Check for clear all timers command
        if any(word in text for word in ['clear', 'delete', 'remove']) and any(word in text for word in ['all', 'everything', 'timers']):
            return {"type": "clear"}

        # Check for delete commands first (more specific)
        if any(indicator in text for indicator in self.delete_indicators):
            for indicator in self.delete_indicators:
                if indicator in text:
                    parts = text.split(indicator, 1)
                    if len(parts) > 1:
                        name = parts[1].strip()
                        name = re.sub(r'^(the|a|an)\s+', '', name)
                        name = name.replace('timer', '').strip()
                        if name:
                            return {"type": "delete", "name": name}
                    return {"type": "delete", "name": "timer"}

        # Check for pause/resume/stop commands
        for command_type, indicators in [
            ("pause", self.pause_indicators),
            ("resume", self.resume_indicators),
            ("stop", self.stop_indicators)
        ]:
            if any(indicator in text for indicator in indicators):
                # Extract timer name (everything after the command word)
                for indicator in indicators:
                    if indicator in text:
                        parts = text.split(indicator, 1)
                        if len(parts) > 1:
                            name = parts[1].strip()
                            name = re.sub(r'^(the|a|an)\s+', '', name)
                            name = name.replace('timer', '').strip()
                            if name:
                                return {"type": command_type, "name": name}
                        return {"type": command_type, "name": "timer"}

        # Handle create/start command
        duration = self._extract_duration(text)
        if duration:
            # Find the text that contains the duration
            duration_text = text  # Default to full text if we can't isolate duration part

            # Try to find the exact duration text that matched
            for unit in self.time_multipliers.keys():
                if unit in text:
                    # Find the number (word or digit) before the unit
                    match = re.search(rf'(\d+|\w+)\s*{unit}', text)
                    if match:
                        duration_text = match.group(0)
                        break

            name = self._extract_timer_name(text, duration_text)
            return {"type": "create", "name": name, "duration": duration}

        return None