import { state } from '../core/state.js';
import { authEventBus, AuthEvents } from './events.js';
import { MockAuthProvider } from './MockAuthProvider.js';
import { getOrCreateSaveState, updateSaveStats, updateSaveSettings } from './saveState.js';

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
  }

  /**
   * Initializes the authentication system with an optional custom provider.
   * Defaults to MockAuthProvider for zero-barrier guest access.
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
      }

      // Listen to auth changes from the active provider
      this._unsubProvider = this._provider.onAuthStateChanged((user) => {
        this._onProviderAuthStateChanged(user);
      });

      // Initialize provider
      await this._provider.init();
      const user = this._provider.getCurrentUser();
      this._applyUser(user);

      return {
        user: this._currentUser,
        saveState: this._saveState
      };
    })();

    return this._initPromise;
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
    return this._saveState;
  }

  /**
   * Convenience listener for auth events.
   * @param {string} event
   * @param {Function} callback
   * @returns {() => void} Unsubscribe function
   */
  on(event, callback) {
    return authEventBus.on(event, callback);
  }

  _onProviderAuthStateChanged(user) {
    this._applyUser(user);
  }

  _applyUser(user) {
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
    } else {
      this._saveState = null;
    }

    authEventBus.emit(AuthEvents.STATE_CHANGED, {
      user: this._currentUser,
      saveState: this._saveState,
      providerId: this.providerId
    });
  }
}

export const authManager = new AuthManager();
