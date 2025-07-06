
import json
import os
from typing import Dict, List, Optional, Callable

class RegimenManager:
    def __init__(self, timer_manager, output_callback: Optional[Callable[[str], None]] = None):
        self.timer_manager = timer_manager
        self.output_callback = output_callback
        self.regimens_file = "regimens.json"
        self.current_regimen = None
        self.current_regimen_queue = []
        self.current_regimen_name = ""
        
    def _print(self, message: str):
        """Print message using callback if available"""
        if self.output_callback:
            self.output_callback(message)
        else:
            print(message)
    
    def load_regimens(self) -> Dict:
        """Load regimens from file"""
        if not os.path.exists(self.regimens_file):
            return {}
        try:
            with open(self.regimens_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            self._print(f"Error loading regimens: {str(e)}")
            return {}
    
    def save_regimens(self, regimens: Dict):
        """Save regimens to file"""
        try:
            with open(self.regimens_file, 'w') as f:
                json.dump(regimens, f, indent=2)
        except Exception as e:
            self._print(f"Error saving regimens: {str(e)}")
    
    def create_regimen(self, name: str, timers: List[Dict]):
        """Create a new regimen"""
        regimens = self.load_regimens()
        regimens[name] = timers
        self.save_regimens(regimens)
        self._print(f"Created regimen '{name}' with {len(timers)} timer(s)")
    
    def list_regimens(self):
        """List all available regimens"""
        regimens = self.load_regimens()
        if not regimens:
            self._print("No regimens available")
            return
        
        self._print("Available regimens:")
        for name, timers in regimens.items():
            timer_list = ", ".join([f"{t['name']} ({t['duration']}s)" for t in timers])
            self._print(f"- {name}: {timer_list}")
    
    def run_regimen(self, name: str):
        """Start a regimen - creates first timer in sequence"""
        regimens = self.load_regimens()
        if name not in regimens:
            self._print(f"Regimen '{name}' not found")
            return
        
        self.current_regimen_name = name
        self.current_regimen_queue = regimens[name].copy()
        
        if not self.current_regimen_queue:
            self._print(f"Regimen '{name}' is empty")
            return
        
        # Start the first timer in the regimen
        self._start_next_timer()
    
    def _start_next_timer(self):
        """Start the next timer in the current regimen queue"""
        if not self.current_regimen_queue:
            self._print(f"Regimen '{self.current_regimen_name}' completed!")
            self.current_regimen_name = ""
            return
        
        next_timer = self.current_regimen_queue.pop(0)
        timer_name = f"{self.current_regimen_name}_{next_timer['name']}"
        
        self._print(f"Starting regimen timer: {timer_name} ({next_timer['duration']}s)")
        
        # Create and start the timer
        self.timer_manager.create_timer(timer_name, next_timer['duration'])
    
    def on_timer_complete(self, timer_name: str):
        """Called when a timer completes - check if it's part of a regimen"""
        if not self.current_regimen_name:
            return
        
        # Check if this timer is part of the current regimen
        if timer_name.startswith(f"{self.current_regimen_name}_"):
            # Start the next timer in the regimen after a short delay
            import threading
            import time
            
            def delayed_start():
                time.sleep(1)  # Brief pause between timers
                self._start_next_timer()
            
            thread = threading.Thread(target=delayed_start)
            thread.daemon = True
            thread.start()
