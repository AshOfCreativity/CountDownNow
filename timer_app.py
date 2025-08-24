import tkinter as tk
from tkinter import ttk
import re
from timer_manager import TimerManager
from command_interpreter import CommandInterpreter

class TimerApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Timer Assistant")
        self.root.geometry("800x500")

        # Set theme for better appearance
        style = ttk.Style()
        style.theme_use('clam')

        self.timer_manager = TimerManager()
        self.command_interpreter = CommandInterpreter()
        
        # Load saved audio settings on startup
        self.timer_manager.alert_manager.load_settings()

        # Create main container with left and right panes
        self.paned_window = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        self.paned_window.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Left pane for input and general output
        self.left_pane = ttk.Frame(self.paned_window)
        self.paned_window.add(self.left_pane, weight=2)

        # Right pane for active timers
        self.right_pane = ttk.Frame(self.paned_window)
        self.paned_window.add(self.right_pane, weight=1)

        # Set up left pane components
        self.setup_left_pane()

        # Set up right pane components
        self.setup_right_pane()

        # Set up timer manager callback
        self.timer_manager.set_output_callback(self.print_output)

        # Initial help message
        self.show_help()

        # Set focus to entry
        self.command_entry.focus_set()

    def setup_left_pane(self):
        # Input frame
        self.input_frame = ttk.Frame(self.left_pane)
        self.input_frame.pack(fill=tk.X, padx=5, pady=5)

        # Command input with placeholder
        self.command_var = tk.StringVar()
        self.command_entry = ttk.Entry(
            self.input_frame, 
            textvariable=self.command_var,
            font=('Arial', 12)
        )
        self.command_entry.pack(fill=tk.X, expand=True, side=tk.LEFT, padx=(0, 5))
        self.command_entry.bind('<Return>', self.process_command)

        # Enter button
        self.enter_button = ttk.Button(
            self.input_frame,
            text="Enter",
            command=lambda: self.process_command(None)
        )
        self.enter_button.pack(side=tk.RIGHT)

        # Output text area with scrollbar
        self.output_frame = ttk.Frame(self.left_pane)
        self.output_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        self.scrollbar = ttk.Scrollbar(self.output_frame)
        self.scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.output_text = tk.Text(
            self.output_frame,
            font=('Arial', 10),
            yscrollcommand=self.scrollbar.set
        )
        self.output_text.pack(fill=tk.BOTH, expand=True)
        self.scrollbar.config(command=self.output_text.yview)

        # Button frame at bottom of left pane
        button_frame = ttk.Frame(self.left_pane)
        button_frame.pack(fill=tk.X, padx=5, pady=5)

        # Audio Settings button
        audio_button = ttk.Button(button_frame, text="Audio Settings", command=self.show_audio_settings)
        audio_button.pack(side=tk.LEFT, padx=5)

        # Regimen Settings button
        regimen_button = ttk.Button(button_frame, text="Regimens", command=self.show_regimen_settings)
        regimen_button.pack(side=tk.LEFT, padx=5)

        # Help button
        help_button = ttk.Button(button_frame, text="Help", command=self.show_help)
        help_button.pack(side=tk.RIGHT, padx=5)

    def setup_right_pane(self):
        # Active Timers label
        self.timer_label = ttk.Label(
            self.right_pane,
            text="Active Timers",
            font=('Arial', 12, 'bold')
        )
        self.timer_label.pack(pady=5)

        # Frame for active timers
        self.active_timers_frame = ttk.Frame(self.right_pane)
        self.active_timers_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Dictionary to keep track of timer labels
        self.timer_labels = {}

    def show_help(self):
        help_text = """Welcome to Timer Assistant!
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
"""
        self.output_text.delete('1.0', tk.END)
        self.output_text.insert('1.0', help_text)

    def show_audio_settings(self):
        """Show audio settings window"""
        settings_window = tk.Toplevel(self.root)
        settings_window.title("Audio Settings")
        settings_window.geometry("400x350")
        settings_window.resizable(False, False)

        # Load saved settings first
        self.timer_manager.alert_manager.load_settings()
        
        # Get current settings
        current_settings = self.timer_manager.alert_manager.get_audio_settings()

        # Frequency setting
        freq_frame = ttk.Frame(settings_window)
        freq_frame.pack(fill=tk.X, padx=20, pady=10)
        ttk.Label(freq_frame, text="Beep Frequency (Hz):").pack(anchor=tk.W)
        freq_var = tk.IntVar(value=current_settings['frequency'])
        freq_scale = ttk.Scale(freq_frame, from_=200, to=2000, variable=freq_var, orient=tk.HORIZONTAL)
        freq_scale.pack(fill=tk.X, pady=5)
        freq_label = ttk.Label(freq_frame, text=f"{freq_var.get()} Hz")
        freq_label.pack()

        # Duration setting
        dur_frame = ttk.Frame(settings_window)
        dur_frame.pack(fill=tk.X, padx=20, pady=10)
        ttk.Label(dur_frame, text="Beep Duration (ms):").pack(anchor=tk.W)
        dur_var = tk.IntVar(value=current_settings['duration'])
        dur_scale = ttk.Scale(dur_frame, from_=100, to=2000, variable=dur_var, orient=tk.HORIZONTAL)
        dur_scale.pack(fill=tk.X, pady=5)
        dur_label = ttk.Label(dur_frame, text=f"{dur_var.get()} ms")
        dur_label.pack()

        # Interval setting
        int_frame = ttk.Frame(settings_window)
        int_frame.pack(fill=tk.X, padx=20, pady=10)
        ttk.Label(int_frame, text="Interval Between Beeps (seconds):").pack(anchor=tk.W)
        int_var = tk.DoubleVar(value=current_settings['interval'])
        int_scale = ttk.Scale(int_frame, from_=0.1, to=5.0, variable=int_var, orient=tk.HORIZONTAL)
        int_scale.pack(fill=tk.X, pady=5)
        int_label = ttk.Label(int_frame, text=f"{int_var.get():.1f} sec")
        int_label.pack()

        # Notification timeout setting
        timeout_frame = ttk.Frame(settings_window)
        timeout_frame.pack(fill=tk.X, padx=20, pady=10)
        ttk.Label(timeout_frame, text="Max Alert Duration (seconds):").pack(anchor=tk.W)
        timeout_var = tk.IntVar(value=self.timer_manager.alert_manager.alert_timeout)
        timeout_scale = ttk.Scale(timeout_frame, from_=10, to=600, variable=timeout_var, orient=tk.HORIZONTAL)
        timeout_scale.pack(fill=tk.X, pady=5)
        timeout_label = ttk.Label(timeout_frame, text=f"{timeout_var.get()} sec")
        timeout_label.pack()

        # Update labels when scales change
        def update_freq_label(*args):
            freq_label.config(text=f"{freq_var.get()} Hz")
        def update_dur_label(*args):
            dur_label.config(text=f"{dur_var.get()} ms")
        def update_int_label(*args):
            int_label.config(text=f"{int_var.get():.1f} sec")
        def update_timeout_label(*args):
            timeout_label.config(text=f"{timeout_var.get()} sec")

        freq_var.trace('w', update_freq_label)
        dur_var.trace('w', update_dur_label)
        int_var.trace('w', update_int_label)
        timeout_var.trace('w', update_timeout_label)

        # Buttons
        button_frame = ttk.Frame(settings_window)
        button_frame.pack(fill=tk.X, padx=20, pady=20)

        def apply_settings():
            # Apply settings immediately
            self.timer_manager.alert_manager.set_audio_settings(
                frequency=freq_var.get(),
                duration=dur_var.get(),
                interval=int_var.get()
            )
            self.timer_manager.alert_manager.alert_timeout = timeout_var.get()

            # Save the alert timeout setting as well
            self.timer_manager.alert_manager.save_settings()

            # If there are any active alerts, restart them with new settings
            active_alerts = list(self.timer_manager.alert_manager.active_alerts.keys())
            for timer_name in active_alerts:
                if timer_name in self.timer_manager.alert_manager.active_alerts:
                    # Stop and restart alert with new settings
                    self.timer_manager.alert_manager.stop_alert(timer_name)
                    self.timer_manager.alert_manager.start_alert(timer_name)

            self.print_output(f"Audio settings updated and saved! Frequency: {freq_var.get()}Hz, Duration: {dur_var.get()}ms, Interval: {int_var.get():.1f}s, Max Duration: {timeout_var.get()}s")
            settings_window.destroy()

        def test_beep():
            try:
                if hasattr(self.timer_manager.alert_manager, 'WINSOUND_AVAILABLE') and self.timer_manager.alert_manager.WINSOUND_AVAILABLE:
                    import winsound
                    winsound.Beep(freq_var.get(), dur_var.get())
                else:
                    print("\a")  # Fallback beep
            except:
                print("\a")  # Fallback beep

        def save_settings():
            # Save settings without closing window
            self.timer_manager.alert_manager.set_audio_settings(
                frequency=freq_var.get(),
                duration=dur_var.get(),
                interval=int_var.get()
            )
            self.timer_manager.alert_manager.alert_timeout = timeout_var.get()
            self.timer_manager.alert_manager.save_settings()
            
            # Show confirmation in a more prominent way
            save_button.config(text="SAVED!", state="disabled")
            self.root.after(2000, lambda: save_button.config(text="Save Settings", state="normal"))
            self.print_output(f"✓ Audio settings SAVED! Frequency: {freq_var.get()}Hz, Duration: {dur_var.get()}ms, Interval: {int_var.get():.1f}s, Max Duration: {timeout_var.get()}s")

        ttk.Button(button_frame, text="Test Beep", command=test_beep).pack(side=tk.LEFT, padx=5)
        save_button = ttk.Button(button_frame, text="Save Settings", command=save_settings)
        save_button.pack(side=tk.LEFT, padx=5)
        
        def apply_and_save():
            save_settings()
            settings_window.destroy()
        
        ttk.Button(button_frame, text="Apply & Close", command=apply_and_save).pack(side=tk.RIGHT, padx=5)
        ttk.Button(button_frame, text="Cancel", command=settings_window.destroy).pack(side=tk.RIGHT)

    def update_timer_display(self, name: str, time_str: str, status: str):
        """Update or create a timer display in the right pane"""
        if name not in self.timer_labels:
            # Create new timer frame
            timer_frame = ttk.Frame(self.active_timers_frame)
            timer_frame.pack(fill=tk.X, pady=2)

            # Timer name and remaining time
            label = ttk.Label(
                timer_frame,
                font=('Arial', 10),
                anchor='w'
            )
            label.pack(side=tk.LEFT, padx=5)

            self.timer_labels[name] = {
                'frame': timer_frame,
                'label': label
            }

        # Update label text with status icon
        status_icon = "⏸️" if status == "paused" else "⏱️" if status == "running" else "⚠️"
        self.timer_labels[name]['label'].config(
            text=f"{status_icon} {name}: {time_str}"
        )

    def remove_timer_display(self, name: str):
        """Remove a timer display from the right pane"""
        if name in self.timer_labels:
            self.timer_labels[name]['frame'].destroy()
            del self.timer_labels[name]

    def print_output(self, text):
        """Handle output from timer manager"""
        # Check if this is a timer update message
        timer_update = re.match(r'\[(.*?)\]:\s*(.*)', text)
        if timer_update:
            name, info = timer_update.groups()
            if "Complete" in info:
                status = "complete"
                self.update_timer_display(name, "Done!", status)
                self.output_text.insert('end', f"Timer '{name}' completed!\n")
            else:
                status = "running"
                if name in self.timer_labels:
                    # Check if timer is paused
                    timer = self.timer_manager.timers.get(name)
                    if timer and timer.paused:
                        status = "paused"
                self.update_timer_display(name, info, status)
        else:
            self.output_text.insert('end', f"{text}\n")
        self.output_text.see('end')

    def process_command(self, event=None):
        command_text = self.command_var.get().strip()
        if not command_text:
            return

        self.command_var.set("")  # Clear input

        if command_text.lower() == "help":
            self.show_help()
            return

        if command_text.lower() == "exit":
            self.root.quit()
            return

        # Process command through interpreter
        try:
            result = self.command_interpreter.interpret(command_text)
            if result:
                self.timer_manager.execute_command(result)
                self.print_output(f"Executed: {command_text}")
            else:
                self.print_output("I didn't understand that command. Try rephrasing or type 'help'.")
        except:
            self.print_output("I didn't understand that command. Try rephrasing or type 'help'.")

    def show_regimen_settings(self):
        """Show regimen management window"""
        regimens_window = tk.Toplevel(self.root)
        regimens_window.title("Regimen Management")
        regimens_window.geometry("600x500")
        regimens_window.resizable(True, True)

        # Create notebook for tabs
        notebook = ttk.Notebook(regimens_window)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Tab 1: List existing regimens
        list_frame = ttk.Frame(notebook)
        notebook.add(list_frame, text="View Regimens")

        # Regimen list
        list_label = ttk.Label(list_frame, text="Available Regimens:", font=('Arial', 12, 'bold'))
        list_label.pack(anchor=tk.W, pady=5)

        # Scrollable text area for regimens
        list_text_frame = ttk.Frame(list_frame)
        list_text_frame.pack(fill=tk.BOTH, expand=True, pady=5)

        list_scrollbar = ttk.Scrollbar(list_text_frame)
        list_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        list_text = tk.Text(list_text_frame, yscrollcommand=list_scrollbar.set, font=('Arial', 10))
        list_text.pack(fill=tk.BOTH, expand=True)
        list_scrollbar.config(command=list_text.yview)

        # Load and display regimens
        def refresh_regimen_list():
            if self.timer_manager.regimen_manager:
                regimens = self.timer_manager.regimen_manager.load_regimens()
                list_text.delete('1.0', tk.END)
                if regimens:
                    for name, timers in regimens.items():
                        list_text.insert('end', f"Regimen: {name}\n")
                        for i, timer in enumerate(timers, 1):
                            list_text.insert('end', f"  {i}. {timer['name']} - {timer['duration']}s\n")
                        list_text.insert('end', "\n")
                else:
                    list_text.insert('end', "No regimens found. Create one using the 'Create Regimen' tab.")

        refresh_regimen_list()

        # Run regimen button
        run_frame = ttk.Frame(list_frame)
        run_frame.pack(fill=tk.X, pady=5)

        ttk.Label(run_frame, text="Run regimen:").pack(side=tk.LEFT)
        run_entry = ttk.Entry(run_frame)
        run_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)

        def run_regimen():
            name = run_entry.get().strip()
            if name:
                if self.timer_manager.regimen_manager:
                    self.timer_manager.regimen_manager.run_regimen(name)
                    self.print_output(f"Started regimen: {name}")
                run_entry.delete(0, tk.END)

        ttk.Button(run_frame, text="Run", command=run_regimen).pack(side=tk.RIGHT)

        # Tab 2: Create new regimen
        create_frame = ttk.Frame(notebook)
        notebook.add(create_frame, text="Create Regimen")

        # Regimen name
        name_frame = ttk.Frame(create_frame)
        name_frame.pack(fill=tk.X, pady=5)
        ttk.Label(name_frame, text="Regimen Name:").pack(side=tk.LEFT)
        name_entry = ttk.Entry(name_frame)
        name_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)

        # Timer list
        timer_frame = ttk.Frame(create_frame)
        timer_frame.pack(fill=tk.BOTH, expand=True, pady=5)

        ttk.Label(timer_frame, text="Timers in sequence:", font=('Arial', 10, 'bold')).pack(anchor=tk.W)

        # Scrollable frame for timer entries
        canvas = tk.Canvas(timer_frame)
        scrollbar = ttk.Scrollbar(timer_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        timer_entries = []

        def add_timer_entry():
            entry_frame = ttk.Frame(scrollable_frame)
            entry_frame.pack(fill=tk.X, pady=2)

            ttk.Label(entry_frame, text="Name:").pack(side=tk.LEFT)
            name_entry = ttk.Entry(entry_frame, width=15)
            name_entry.pack(side=tk.LEFT, padx=2)

            ttk.Label(entry_frame, text="Duration (seconds):").pack(side=tk.LEFT, padx=(10,0))
            duration_entry = ttk.Entry(entry_frame, width=10)
            duration_entry.pack(side=tk.LEFT, padx=2)

            def remove_entry():
                timer_entries.remove((entry_frame, name_entry, duration_entry))
                entry_frame.destroy()

            ttk.Button(entry_frame, text="Remove", command=remove_entry).pack(side=tk.RIGHT)

            timer_entries.append((entry_frame, name_entry, duration_entry))

        # Add initial timer entry
        add_timer_entry()

        # Buttons
        button_frame = ttk.Frame(create_frame)
        button_frame.pack(fill=tk.X, pady=5)

        ttk.Button(button_frame, text="Add Timer", command=add_timer_entry).pack(side=tk.LEFT)

        def save_regimen():
            name = name_entry.get().strip()
            if not name:
                self.print_output("Please enter a regimen name")
                return

            timers = []
            for _, name_ent, duration_ent in timer_entries:
                timer_name = name_ent.get().strip()
                duration_str = duration_ent.get().strip()

                if timer_name and duration_str:
                    try:
                        duration = int(duration_str)
                        timers.append({"name": timer_name, "duration": duration})
                    except ValueError:
                        self.print_output(f"Invalid duration: {duration_str}")
                        return

            if not timers:
                self.print_output("Please add at least one timer")
                return

            if self.timer_manager.regimen_manager:
                self.timer_manager.regimen_manager.create_regimen(name, timers)
                self.print_output(f"Created regimen '{name}' with {len(timers)} timer(s)")
                refresh_regimen_list()
                # Clear form
                name_entry.delete(0, tk.END)
                # Reset timer entries
                for entry_frame, _, _ in timer_entries:
                    entry_frame.destroy()
                timer_entries.clear()
                add_timer_entry()

        ttk.Button(button_frame, text="Save Regimen", command=save_regimen).pack(side=tk.RIGHT)

    def run(self):
        # Make sure the window appears on top when started
        self.root.lift()
        self.root.attributes('-topmost', True)
        self.root.attributes('-topmost', False)
        self.root.mainloop()

if __name__ == "__main__":
    app = TimerApp()
    app.run()