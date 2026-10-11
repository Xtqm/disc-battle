/**
 * AuthEventBus - Lightweight publish/subscribe event bus for identity and authentication lifecycle.
 * Decouples auth state changes from UI, state management, and multiplayer subsystems.
 */

export const AuthEvents = Object.freeze({
  STATE_CHANGED: 'auth:state_changed',
  PROFILE_UPDATED: 'auth:profile_updated',
  ERROR: 'auth:error'
});

export class AuthEventBus {
  constructor() {
    this._listeners = new Map();
  }

  /**
   * Subscribes a listener to an authentication event.
   * @param {string} event
   * @param {Function} callback
   * @returns {() => void} Unsubscribe function
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('AuthEventBus.on: callback must be a function');
    }
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    return () => this.off(event, callback);
  }

  /**
   * Unsubscribes a listener from an authentication event.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this._listeners.delete(event);
      }
    }
  }

  /**
   * Dispatches an event with payload to all registered listeners.
   * @param {string} event
   * @param {any} data
   */
  emit(event, data) {
    const set = this._listeners.get(event);
    if (!set || set.size === 0) return;
    for (const callback of Array.from(set)) {
      try {
        callback(data);
      } catch (err) {
        console.error(`AuthEventBus handler error for event "${event}":`, err);
      }
    }
  }

  /**
   * Removes all listeners for all events or a specific event.
   * @param {string} [event]
   */
  clear(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }
}

export const authEventBus = new AuthEventBus();
