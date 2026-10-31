const { contextBridge, ipcRenderer } = require('electron');

// Expose protected desktop methods in the window object
contextBridge.exposeInMainWorld('isDesktop', true);
contextBridge.exposeInMainWorld('electronDesktop', {
  isDesktop: true,
  platform: process.platform,
  toggleFullscreen: () => ipcRenderer.send('desktop:toggle-fullscreen'),
  onFocusChange: (callback) => {
    ipcRenderer.on('desktop:focus-change', (_event, isFocused) => {
      callback(isFocused);
    });
  },
  loadProfile: () => ipcRenderer.invoke('desktop:load-profile'),
  saveProfile: (payload) => ipcRenderer.invoke('desktop:save-profile', payload),
  saveProfileSync: (payload) => ipcRenderer.send('desktop:save-profile-sync', payload)
});

// Suppress unintended drag & drop on window
window.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('dragover', (e) => e.preventDefault(), false);
  window.addEventListener('drop', (e) => e.preventDefault(), false);

  // Auto-manage audio on window focus / blur
  ipcRenderer.on('desktop:focus-change', (_event, isFocused) => {
    try {
      if (window.__tronAudioCtx) {
        if (!isFocused && window.__tronAudioCtx.state === 'running') {
          window.__tronAudioCtx.suspend();
        } else if (isFocused && window.__tronAudioCtx.state === 'suspended') {
          window.__tronAudioCtx.resume();
        }
      }
    } catch (_) {}
  });
});
