import { storageManager } from './storage/StorageManager.js';
import { setMasterVolume, setSFXVolume } from '../audio/synth.js';

export const DEFAULT_SETTINGS = Object.freeze({
  displayMode: 'fullscreen', // 'fullscreen' | 'windowed'
  fpsCap: 60,                // 60, 120, 144, 0 (uncapped)
  masterVolume: 1.0,         // 0.0 - 1.0
  sfxVolume: 1.0,            // 0.0 - 1.0
  muteOnBlur: true,
  bloom: true,
  particles: true
});

export class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this._listeners = new Set();
  }

  /**
   * Initializes and restores persistent user settings.
   * @returns {object}
   */
  load() {
    try {
      const stored = storageManager.get('settings', null);
      if (stored && typeof stored === 'object') {
        this.settings = { ...DEFAULT_SETTINGS, ...stored };
      }
    } catch (_) {}
    this.applyAll();
    return this.settings;
  }

  get(key, fallback = null) {
    return this.settings[key] ?? fallback;
  }

  set(key, value) {
    this.settings[key] = value;
    try {
      storageManager.set(`settings.${key}`, value);
    } catch (_) {}
    this.apply(key, value);
    this.emitChange(key, value);
  }

  setAll(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      storageManager.set('settings', this.settings);
    } catch (_) {}
    this.applyAll();
    this.emitChange('*', this.settings);
  }

  apply(key, value) {
    if (key === 'masterVolume') {
      setMasterVolume(value);
    } else if (key === 'sfxVolume') {
      setSFXVolume(value);
    }
  }

  applyAll() {
    setMasterVolume(this.settings.masterVolume);
    setSFXVolume(this.settings.sfxVolume);
  }

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  emitChange(key, value) {
    for (const fn of this._listeners) {
      try { fn(key, value, this.settings); } catch (_) {}
    }
  }
}

export const settingsManager = new SettingsManager();
