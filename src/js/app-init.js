// Initialize async components after DOM is ready
class AppInitializer extends TimerApp {
    async initializeAsync() {
        try {
            // Load saved audio settings
            if (this.alertManager && this.alertManager.loadSettings) {
                await this.alertManager.loadSettings();
            }
        } catch (error) {
            console.error('Error during async initialization:', error);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AppInitializer();
});