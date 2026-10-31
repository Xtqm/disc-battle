const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

// Hardware acceleration and GPU switches
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let mainWindow = null;

function createWindow() {
  Menu.setApplicationMenu(null); // Remove default OS application menu bar

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    title: 'TRON :: DISC ARENA',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      spellcheck: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.env.ELECTRON_TEST_MODE === '1') {
      console.log('ELECTRON_DESKTOP_READY: Game window successfully initialized');
      setTimeout(() => {
        app.quit();
      }, 1500);
    }
  });

  // Suppress context menus (right-click reserved for combat mechanics)
  mainWindow.webContents.on('context-menu', (event) => {
    event.preventDefault();
  });

  // Intercept system shortcuts to prevent reloads and enable seamless fullscreen toggle
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = input.key.toLowerCase();

    // Prevent reload shortcuts (F5, Ctrl+R, Ctrl+Shift+R)
    if (
      key === 'f5' ||
      (input.control && key === 'r')
    ) {
      event.preventDefault();
      return;
    }

    // Prevent browser print / save / close-tab shortcuts
    if (input.control && (key === 'p' || key === 's' || key === 'w')) {
      event.preventDefault();
      return;
    }

    // Toggle fullscreen on F11 or Alt+Enter
    if (key === 'f11' || (input.alt && key === 'enter')) {
      event.preventDefault();
      const isCurrentlyFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isCurrentlyFullScreen);
      return;
    }
  });

  // Window focus / blur lifecycle notifications
  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('desktop:focus-change', true);
    }
  });

  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('desktop:focus-change', false);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers
ipcMain.on('desktop:toggle-fullscreen', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
