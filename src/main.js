const { app, BrowserWindow, Menu, dialog, ipcMain, Notification } = require('electron');
const fs = require('fs').promises;
const path = require('path');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // icon: path.join(__dirname, '..', 'build', 'icon.png') // Icon configured in build
    show: false // Don't show until ready
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on window when shown
    mainWindow.focus();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation and external navigation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
  
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
  });
});

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Timer Assistant',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Timer Assistant',
              message: 'Timer Assistant',
              detail: 'A desktop timer management application with natural language processing.\n\nVersion 1.0.0'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createMenu();
  setupIPC();
});

// IPC handlers for secure file operations
function setupIPC() {
  // File operations with security restrictions
  const ALLOWED_FILES = ['audio_settings.json', 'regimens.json'];
  
  ipcMain.handle('save-file', async (event, filename, data) => {
    try {
      // Security: restrict to allowed filenames only
      if (!ALLOWED_FILES.includes(filename)) {
        return { success: false, error: 'Filename not allowed' };
      }
      
      const userDataPath = app.getPath('userData');
      const filePath = require('path').join(userDataPath, filename);
      
      // Security: verify path is contained within userData
      const relativePath = require('path').relative(userDataPath, filePath);
      if (relativePath.includes('..') || require('path').isAbsolute(relativePath)) {
        return { success: false, error: 'Invalid file path' };
      }
      
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('load-file', async (event, filename) => {
    try {
      // Security: restrict to allowed filenames only
      if (!ALLOWED_FILES.includes(filename)) {
        return { success: false, error: 'Filename not allowed' };
      }
      
      const userDataPath = app.getPath('userData');
      const filePath = require('path').join(userDataPath, filename);
      
      // Security: verify path is contained within userData
      const relativePath = require('path').relative(userDataPath, filePath);
      if (relativePath.includes('..') || require('path').isAbsolute(relativePath)) {
        return { success: false, error: 'Invalid file path' };
      }
      
      const data = await fs.readFile(filePath, 'utf8');
      return { success: true, data: JSON.parse(data) };
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty defaults
        const defaults = filename === 'audio_settings.json' 
          ? { frequency: 880, duration: 500, interval: 1.0, alert_timeout: 120 }
          : {};
        return { success: true, data: defaults };
      }
      return { success: false, error: error.message };
    }
  });

  // Desktop notifications
  ipcMain.handle('show-notification', async (event, title, body) => {
    try {
      if (Notification.isSupported()) {
        new Notification({ title, body }).show();
        return { success: true };
      } else {
        return { success: false, error: 'Notifications not supported' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // App info
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });
}