/**
 * CrossTabSync.js
 * Orchestrates real-time synchronization across multiple open browser tabs
 * using BroadcastChannel with storage event fallback.
 * Prevents race conditions and desynchronization without circular event cascades.
 */

export const CHANNEL_NAME = 'tron_grid_sync';
export const STORAGE_SYNC_KEY = 'tron_crosstab_storage_event';

// In-memory bus for environments without native BroadcastChannel or localStorage (e.g. Node tests)
const mockBus = new Set();

export class CrossTabSync {
  /**
   * @param {object} [options]
   * @param {string} [options.channelName]
   * @param {string} [options.tabId]
   */
  constructor(options = {}) {
    this.tabId = options.tabId || `tab_${Math.random().toString(36).substring(2, 9)}`;
    this.channelName = options.channelName || CHANNEL_NAME;
    this._listeners = new Set();
    this._channel = null;
    this._storageHandler = null;

    this._initChannel();
  }

  _initChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this._channel = new BroadcastChannel(this.channelName);
        if (typeof this._channel.unref === 'function') {
          this._channel.unref();
        }
        this._channel.onmessage = (event) => {
          this._handleIncomingMessage(event.data);
        };
      } catch (err) {
        console.warn('CrossTabSync: BroadcastChannel initialization failed:', err);
      }
    }

    if (!this._channel && typeof window !== 'undefined') {
      // Fallback: window storage event
      this._storageHandler = (event) => {
        if (event.key === STORAGE_SYNC_KEY && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            this._handleIncomingMessage(data);
          } catch (_) {}
        }
      };
      window.addEventListener('storage', this._storageHandler);
    }

    // Always register on internal mock bus for headless/Node execution
    mockBus.add(this);
  }

  /**
   * Dispatches a message to all other tabs.
   * @param {string} type 
   * @param {object} payload 
   */
  broadcast(type, payload = {}) {
    const message = {
      type,
      sourceTabId: this.tabId,
      timestamp: Date.now(),
      payload
    };

    if (this._channel) {
      try {
        this._channel.postMessage(message);
      } catch (err) {
        console.warn('CrossTabSync: Broadcast failed:', err);
      }
    } else if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(message));
      } catch (_) {}
    }

    // Dispatch to peer CrossTabSync instances in the same process (testing support)
    for (const peer of mockBus) {
      if (peer !== this && peer.channelName === this.channelName) {
        try {
          peer._handleIncomingMessage(message);
        } catch (e) {
          console.warn('Peer message delivery failed:', e);
        }
      }
    }
  }

  /**
   * Broadcasts an authentication state transition.
   * @param {object|null} user 
   */
  broadcastAuthState(user) {
    this.broadcast('AUTH_STATE_CHANGED', { user });
  }

  /**
   * Broadcasts a save state update.
   * @param {object} saveState 
   */
  broadcastSaveState(saveState) {
    this.broadcast('SAVE_STATE_UPDATED', { saveState });
  }

  /**
   * Subscribes to cross-tab messages.
   * @param {(message: { type: string, sourceTabId: string, timestamp: number, payload: object }) => void} callback 
   * @returns {() => void}
   */
  onMessage(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  _handleIncomingMessage(message) {
    if (!message || typeof message !== 'object') return;
    // Suppress loopback echoes
    if (message.sourceTabId === this.tabId) return;

    for (const listener of this._listeners) {
      try {
        listener(message);
      } catch (err) {
        console.warn('CrossTabSync listener callback error:', err);
      }
    }
  }

  destroy() {
    mockBus.delete(this);
    if (this._channel) {
      try { this._channel.close(); } catch (_) {}
      this._channel = null;
    }
    if (this._storageHandler && typeof window !== 'undefined') {
      window.removeEventListener('storage', this._storageHandler);
      this._storageHandler = null;
    }
    this._listeners.clear();
  }
}

export const crossTabSync = new CrossTabSync();
