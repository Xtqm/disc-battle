import { state } from '../core/state.js';
import { authEventBus, AuthEvents } from './events.js';
import { MockAuthProvider } from './MockAuthProvider.js';
import { SupabaseAuthProvider, resolveSupabaseConfig } from './SupabaseAuthProvider.js';
import { getOrCreateSaveState, updateSaveStats, updateSaveSettings, saveSaveState } from './saveState.js';
import { crossTabSync } from '../storage/CrossTabSync.js';
import { CloudSyncResolver, fetchRemoteSaveState, upsertRemoteSaveState } from '../storage/CloudSyncResolver.js';
import { offlineSyncQueue } from '../storage/OfflineSyncQueue.js';

/**
 * AuthManager - Central singleton orchestrating identity, authentication providers, and local save states.
 */
export class AuthManager {
  constructor() {
    this._provider = new MockAuthProvider();
    this._currentUser = null;
    this._saveState = null;
    this._unsubProvider = null;
    this._initPromise = null;
    this._crossTabUnsub = crossTabSync.onMessage((msg) => this._handleCrossTabMessage(msg));
    this._isSyncingCloud = false;
  }

  /**
   * Initializes the authentication system with an optional custom provider.
   * Auto-detects Supabase credentials if present, otherwise defaults to MockAuthProvider.
   * @param {import('./IAuthProvider.js').IAuthProvider} [provider]
   * @returns {Promise<{ user: object, saveState: object }>}
   */
  async init(provider = null) {
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      if (provider) {
        if (this._unsubProvider) {
          this._unsubProvider();
          this._unsubProvider = null;
        }
        this._provider = provider;
      } else {
        const { url, anonKey } = resolveSupabaseConfig();
        if (url || (typeof window !== 'undefined' && window.__USE_SUPABASE__)) {
          this._provider = new SupabaseAuthProvider();
        }
      }

      // Listen to auth changes from the active provider
      this._unsubProvider = this._provider.onAuthStateChanged((user) => {
        this._onProviderAuthStateChanged(user);
      });

      // Initialize provider
      await this._provider.init();
      const user = this._provider.getCurrentUser();
      this._applyUser(user);

      // Register offline queue status listener for auto-flush on reconnection
      let wasOnline = offlineSyncQueue.isOnline;
      offlineSyncQueue.onStatusChange((status) => {
        const justReconnected = status.isOnline && !wasOnline;
        wasOnline = status.isOnline;
        if (justReconnected && this._currentUser && this._provider?.client && offlineSyncQueue.size > 0) {
          this.syncCloudSave().catch(() => {});
        }
      });

      return {
        user: this._currentUser,
        saveState: this._saveState
      };
    })();

    return this._initPromise;
  }

  /**
   * Switches the active authentication provider at runtime.
   * @param {import('./IAuthProvider.js').IAuthProvider} newProvider
   * @returns {Promise<{ user: object, saveState: object }>}
   */
  async switchProvider(newProvider) {
    if (!newProvider) throw new Error('switchProvider: provider cannot be null');
    if (this._unsubProvider) {
      this._unsubProvider();
      this._unsubProvider = null;
    }
    this._provider = newProvider;
    this._unsubProvider = this._provider.onAuthStateChanged((user) => {
      this._onProviderAuthStateChanged(user);
    });
    await this._provider.init();
    const user = this._provider.getCurrentUser();
    this._applyUser(user);
    return { user: this._currentUser, saveState: this._saveState };
  }

  get currentUser() {
    return this._currentUser;
  }

  get saveState() {
    return this._saveState;
  }

  get provider() {
    return this._provider;
  }

  get providerId() {
    return this._provider ? this._provider.providerId : 'none';
  }

  /**
   * Signs into a guest session.
   * @param {boolean} [forceNew=false]
   * @returns {Promise<object>}
   */
  async signInGuest(forceNew = false) {
    if (!this._provider) throw new Error('AuthManager: No active auth provider.');
    const user = await this._provider.signInGuest(forceNew);
    this._applyUser(user);
    return user;
  }

  /**
   * Signs in or promotes user via direct passkey credentials.
   * @param {string} email
   * @param {string} password
   * @param {string} [handle]
   * @returns {Promise<object>}
   */
  async signInWithCredentials(email, password, handle = '') {
    if (!this._provider) throw new Error('AuthManager: No active auth provider.');
    const user = await this._provider.signInWithCredentials(email, password, handle);
    this._applyUser(user);
    return user;
  }

  /**
   * Signs in or links account via federated provider.
   * @param {string} providerName
   * @param {object} [profile]
   * @returns {Promise<object>}
   */
  async signInWithFederated(providerName, profile = null) {
    if (!this._provider) throw new Error('AuthManager: No active auth provider.');
    const user = await this._provider.signInWithFederated(providerName, profile);
    this._applyUser(user);
    return user;
  }

  /**
   * Updates user display handle / callsign and persists to save state.
   * @param {string} newCallsign
   * @returns {Promise<object>}
   */
  async updateCallsign(newCallsign) {
    if (!newCallsign || typeof newCallsign !== 'string') {
      throw new Error('Callsign must be a non-empty string.');
    }
    const sanitized = newCallsign.trim().toUpperCase();
    if (!/^[A-Za-z0-9_-]{3,16}$/.test(sanitized)) {
      throw new Error('Callsign must be 3-16 characters (letters, numbers, underscore, hyphen).');
    }
    if (this._provider && typeof this._provider.updateHandle === 'function') {
      await this._provider.updateHandle(sanitized);
    }
    if (this._currentUser) {
      this._currentUser.handle = sanitized;
    }
    if (this._saveState) {
      this._saveState.handle = sanitized;
      saveSaveState(this._saveState);
      this.syncCloudSave().catch(() => {});
    }
    authEventBus.emit(AuthEvents.PROFILE_UPDATED, { user: this._currentUser, saveState: this._saveState });
    return this._currentUser;
  }

  /**
   * Terminates the current authentication session.
   * @returns {Promise<void>}
   */
  async signOut() {
    if (!this._provider) return;
    await this._provider.signOut();
    this._applyUser(null);
  }


  /**
   * Updates combat statistics in the current user's save state.
   * @param {object} statsDelta
   * @returns {object|null}
   */
  recordStats(statsDelta) {
    if (!this._currentUser) return null;
    this._saveState = updateSaveStats(this._currentUser.uid, statsDelta);
    authEventBus.emit(AuthEvents.PROFILE_UPDATED, { user: this._currentUser, saveState: this._saveState });
    this.syncCloudSave().catch(() => {});
    return this._saveState;
  }

  /**
   * Updates settings in save state and applies them to active engine state.
   * @param {object} settingsDelta
   * @returns {object|null}
   */
  recordSettings(settingsDelta) {
    if (!this._currentUser) return null;
    this._saveState = updateSaveSettings(this._currentUser.uid, settingsDelta);

    if (this._saveState && this._saveState.settings) {
      if (typeof this._saveState.settings.sens === 'number') {
        state.sens = this._saveState.settings.sens;
      }
      if (typeof this._saveState.settings.invertY === 'boolean') {
        state.invertY = this._saveState.settings.invertY;
      }
    }

    authEventBus.emit(AuthEvents.PROFILE_UPDATED, { user: this._currentUser, saveState: this._saveState });
    this.syncCloudSave().catch(() => {});
    return this._saveState;
  }

  /**
   * Convenience listener for auth events.
   * @param {string} event
   * @param {Function} callback
   * @returns {() => void} Unsubscribe function
   */
  /**
   * Upgrades the current user session by linking an identity (OAuth or passkey).
   * @param {object} credentials
   * @returns {Promise<object>}
   */
  async linkIdentity(credentials) {
    if (!this._provider) throw new Error('AuthManager: No active auth provider.');
    if (typeof this._provider.linkIdentity !== 'function') {
      throw new Error(`Active provider "${this.providerId}" does not support linkIdentity.`);
    }
    const result = await this._provider.linkIdentity(credentials);
    const user = this._provider.getCurrentUser();
    if (user) {
      this._applyUser(user);
    }
    return result;
  }

  on(event, callback) {
    return authEventBus.on(event, callback);
  }

  _onProviderAuthStateChanged(user) {
    this._applyUser(user);
  }

  _handleCrossTabMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'AUTH_STATE_CHANGED') {
      const incomingUser = msg.payload?.user;
      if (incomingUser?.uid !== this._currentUser?.uid) {
        this._applyUser(incomingUser, { fromCrossTab: true });
      }
    } else if (msg.type === 'SAVE_STATE_UPDATED') {
      const incomingSave = msg.payload?.saveState;
      if (this._currentUser && incomingSave && incomingSave.userId === this._currentUser.uid) {
        // Monotonically merge save states to prevent multi-tab desynchronization
        this._saveState = CloudSyncResolver.resolve(this._saveState, incomingSave);
        saveSaveState(this._saveState, { broadcast: false });
        if (this._saveState && this._saveState.settings) {
          if (typeof this._saveState.settings.sens === 'number') {
            state.sens = this._saveState.settings.sens;
          }
          if (typeof this._saveState.settings.invertY === 'boolean') {
            state.invertY = this._saveState.settings.invertY;
          }
        }
        authEventBus.emit(AuthEvents.PROFILE_UPDATED, {
          user: this._currentUser,
          saveState: this._saveState,
          fromCrossTab: true
        });
      }
    }
  }

  /**
   * Synchronizes active save state with Supabase cloud database using Master Grid Protocol.
   * Monotonically resolves local and remote state, pushes updates, or queues if offline.
   * @returns {Promise<object|null>}
   */
  async syncCloudSave() {
    if (!this._currentUser || !this._currentUser.uid) return null;
    const client = this._provider?.client;
    if (!client || typeof client.from !== 'function') return this._saveState;
    if (this._isSyncingCloud) return this._saveState;

    this._isSyncingCloud = true;
    try {
      // 1. Fetch remote state
      const remoteState = await fetchRemoteSaveState(this._currentUser.uid, client);
      if (remoteState) {
        // 2. Monotonically resolve local and remote state
        const merged = CloudSyncResolver.resolve(this._saveState, remoteState);
        this._saveState = merged;
        saveSaveState(this._saveState, { broadcast: false });
      }

      // 3. Upsert resolved state to cloud
      if (this._saveState) {
        await upsertRemoteSaveState(this._saveState, client);
      }

      // 4. Drain pending offline queue mutations if online
      if (offlineSyncQueue.size > 0 && offlineSyncQueue.isOnline) {
        await offlineSyncQueue.flush(async (payload) => {
          if (payload && payload.userId === this._currentUser.uid) {
            await upsertRemoteSaveState(payload, client);
          }
          return true;
        });
      }

      authEventBus.emit(AuthEvents.PROFILE_UPDATED, {
        user: this._currentUser,
        saveState: this._saveState
      });
      return this._saveState;
    } catch (err) {
      console.warn('AuthManager: Cloud sync encountered network error, queueing mutation:', err);
      if (this._saveState) {
        offlineSyncQueue.enqueue(this._saveState);
      }
      return this._saveState;
    } finally {
      this._isSyncingCloud = false;
    }
  }

  _applyUser(user, options = {}) {
    this._currentUser = user;
    state.currentUser = user;

    if (user && user.uid) {
      this._saveState = getOrCreateSaveState(user.uid, user.handle);
      if (this._saveState && this._saveState.settings) {
        if (typeof this._saveState.settings.sens === 'number') {
          state.sens = this._saveState.settings.sens;
        }
        if (typeof this._saveState.settings.invertY === 'boolean') {
          state.invertY = this._saveState.settings.invertY;
        }
      }
      if (!options.fromCrossTab && this._provider?.client) {
        setTimeout(() => {
          this.syncCloudSave().catch(err => {
            console.warn('AuthManager: Background cloud sync error:', err);
          });
        }, 0);
      }
    } else {
      this._saveState = null;
    }

    if (!options.fromCrossTab) {
      try {
        crossTabSync.broadcastAuthState(this._currentUser);
      } catch (_) {}
    }

    authEventBus.emit(AuthEvents.STATE_CHANGED, {
      user: this._currentUser,
      saveState: this._saveState,
      providerId: this.providerId,
      fromCrossTab: !!options.fromCrossTab
    });
  }
}

export const authManager = new AuthManager();
