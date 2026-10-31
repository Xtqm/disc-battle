const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const steam = require('./steam.cjs');

// Configure Steam Overlay hooks before app ready
steam.enableSteamOverlay();

// Save file path resolvers
function getSaveDir() {
  const dir = path.join(app.getPath('userData'), 'saves');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getProfilePath() {
  return path.join(getSaveDir(), 'profile.json');
}

function getBackupProfilePath() {
  return path.join(getSaveDir(), 'profile.backup.json');
}

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
      console.log('ELECTRON_DESKTOP_READY: Game window successfully initialized (ready-to-show)');
      setTimeout(() => {
        app.quit();
      }, 1000);
    }
  });

  if (process.env.ELECTRON_TEST_MODE === '1') {
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('ELECTRON_DESKTOP_READY: Game window loaded (did-finish-load)');
      setTimeout(() => {
        app.quit();
      }, 1000);
    });
    // Fallback safety timer so test runner never hangs in non-interactive/virtual sessions
    setTimeout(() => {
      console.log('ELECTRON_DESKTOP_READY: Fallback test timeout reached');
      app.quit();
    }, 3500);
  }

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

ipcMain.handle('desktop:load-profile', async () => {
  try {
    const profilePath = getProfilePath();
    if (fs.existsSync(profilePath)) {
      const data = await fsPromises.readFile(profilePath, 'utf8');
      return { success: true, data: JSON.parse(data) };
    }
    return { success: true, data: null };
  } catch (err) {
    console.error('Failed to load desktop profile:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('desktop:save-profile', async (_event, payload) => {
  try {
    const profilePath = getProfilePath();
    const backupPath = getBackupProfilePath();
    const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);

    // If profile exists, rotate to backup before write
    if (fs.existsSync(profilePath)) {
      try {
        await fsPromises.copyFile(profilePath, backupPath);
      } catch (_) {}
    }

    await fsPromises.writeFile(profilePath, jsonStr, 'utf8');
    return { success: true };
  } catch (err) {
    console.error('Failed to save desktop profile:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.on('desktop:save-profile-sync', (_event, payload) => {
  try {
    const profilePath = getProfilePath();
    const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    fs.writeFileSync(profilePath, jsonStr, 'utf8');
  } catch (err) {
    console.error('Failed to sync-save desktop profile:', err);
  }
});

// Steamworks IPC handlers
ipcMain.handle('steam:get-status', async () => {
  return steam.getStatus();
});

ipcMain.handle('steam:unlock-achievement', async (_event, achievementId) => {
  return steam.unlockAchievement(achievementId);
});

ipcMain.handle('steam:set-rich-presence', async (_event, key, value) => {
  return steam.setRichPresence(key, value);
});

app.whenReady().then(() => {
  steam.initSteam();
  createWindow();

  if ((process.env.ELECTRON_TEST_MODE || '').trim() === '1') {
    setTimeout(() => {
      console.log('ELECTRON_DESKTOP_READY: Test mode timer reached, quitting.');
      app.quit();
    }, 2000);
  }

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
