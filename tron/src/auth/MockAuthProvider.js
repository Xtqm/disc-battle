import { IAuthProvider } from './IAuthProvider.js';

const STORAGE_KEY = 'tron_auth_guest';

/**
 * Safe local storage wrapper with in-memory fallback for private browsing / blocked storage.
 */
class SafeStorage {
  constructor() {
    this._memory = new Map();
  }

  getItem(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (_) {}
    return this._memory.get(key) || null;
  }

  setItem(key, value) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
    } catch (_) {}
    this._memory.set(key, String(value));
  }

  removeItem(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
    } catch (_) {}
    this._memory.delete(key);
  }
}

const storage = new SafeStorage();

/**
 * Generates an RFC4122 v4 UUID with crypto.randomUUID or pseudo-random fallback.
 * @returns {string}
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a themed Tron guest handle from a UID.
 * @param {string} uid
 * @returns {string}
 */
export function generateGuestHandle(uid) {
  const shortId = (uid || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'GRID';
  return `GUEST_SUBROUTINE_${shortId}`;
}

/**
 * MockAuthProvider - Zero-barrier guest authentication provider for offline-first boot.
 */
export class MockAuthProvider extends IAuthProvider {
  constructor() {
    super();
    this._currentUser = null;
    this._listeners = new Set();
    this._initialized = false;
  }

  get providerId() {
    return 'mock';
  }

  /**
   * Initializes the mock provider, loading an existing guest session or provisioning a new one.
   * @returns {Promise<void>}
   */
  async init() {
    if (this._initialized) return;

    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.uid) {
          this._currentUser = {
            uid: parsed.uid,
            handle: parsed.handle || generateGuestHandle(parsed.uid),
            isAnonymous: true,
            providerId: this.providerId,
            token: parsed.token || `mock_token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            createdAt: parsed.createdAt || Date.now(),
            lastLoginAt: Date.now()
          };
          // Update lastLoginAt
          storage.setItem(STORAGE_KEY, JSON.stringify(this._currentUser));
        }
      }
    } catch (err) {
      console.warn('MockAuthProvider: Failed reading existing guest identity, re-provisioning:', err);
    }

    if (!this._currentUser) {
      await this.signInGuest();
    }

    this._initialized = true;
    this._notify();
  }

  getCurrentUser() {
    return this._currentUser;
  }

  /**
   * Signs in or provisions a guest identity.
   * @param {boolean} [forceNew=false] If true, generates a fresh guest identity regardless of existing storage.
   * @returns {Promise<{ uid: string, handle: string, isAnonymous: boolean, token: string, providerId: string }>}
   */
  async signInGuest(forceNew = false) {
    if (!forceNew && this._currentUser) {
      return this._currentUser;
    }

    const uid = generateUUID();
    const handle = generateGuestHandle(uid);
    const token = `mock_token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    const identity = {
      uid,
      handle,
      isAnonymous: true,
      providerId: this.providerId,
      token,
      createdAt: now,
      lastLoginAt: now
    };

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(identity));
    } catch (err) {
      console.warn('MockAuthProvider: Failed persisting guest identity:', err);
    }

    this._currentUser = identity;
    this._notify();
    return identity;
  }

  async signOut() {
    this._currentUser = null;
    this._notify();
  }

  onAuthStateChanged(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('MockAuthProvider.onAuthStateChanged: callback must be a function');
    }
    this._listeners.add(callback);

    // Immediately notify caller of current state via microtask
    queueMicrotask(() => {
      try {
        callback(this._currentUser);
      } catch (err) {
        console.error('MockAuthProvider auth listener callback error:', err);
      }
    });

    return () => {
      this._listeners.delete(callback);
    };
  }

  _notify() {
    const user = this._currentUser;
    for (const listener of Array.from(this._listeners)) {
      try {
        listener(user);
      } catch (err) {
        console.error('MockAuthProvider listener error:', err);
      }
    }
  }
}
