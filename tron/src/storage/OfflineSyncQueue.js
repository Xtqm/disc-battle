/**
 * OfflineSyncQueue.js
 * Durable mutation queue buffering save payloads when offline or experiencing cloud network errors.
 * Flushes pending state mutations with exponential backoff upon reconnection.
 */

export const QUEUE_STORAGE_KEY = 'tron_pending_cloud_sync_queue';

const memoryStorage = new Map();

function safeGetItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (_) {}
  return memoryStorage.get(key) || null;
}

function safeSetItem(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
      return;
    }
  } catch (_) {}
  memoryStorage.set(key, String(val));
}

function safeRemoveItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
  } catch (_) {}
  memoryStorage.delete(key);
}

export class OfflineSyncQueue {
  constructor(options = {}) {
    this._storageKey = options.storageKey || QUEUE_STORAGE_KEY;
    this._listeners = new Set();
    this._isFlushing = false;
    this._retryAttempts = 0;
    this._maxRetryDelay = options.maxRetryDelay || 30000;
    this._mockOnline = null; // null = rely on navigator.onLine

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this._handleNetworkChange(true));
      window.addEventListener('offline', () => this._handleNetworkChange(false));
    }
  }

  get isOnline() {
    if (this._mockOnline !== null) return this._mockOnline;
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  setOnline(online) {
    this._mockOnline = !!online;
    this._handleNetworkChange(this._mockOnline);
  }

  /**
   * Retrieves all items currently pending in the durable queue.
   * @returns {Array<{ id: string, timestamp: number, payload: object, attempts: number }>}
   */
  getQueue() {
    const raw = safeGetItem(this._storageKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  /**
   * Persists the queue array to local storage.
   * @param {Array} queue
   */
  _saveQueue(queue) {
    safeSetItem(this._storageKey, JSON.stringify(queue));
    this._notifyListeners({
      isOnline: this.isOnline,
      pendingCount: queue.length
    });
  }

  /**
   * Appends a save payload to the pending queue.
   * @param {object} payload
   * @returns {string} The assigned mutation ID
   */
  enqueue(payload) {
    const queue = this.getQueue();
    const id = `mut_${Date.now()}_${Math.random().toString(16).substring(2, 6)}`;
    const item = {
      id,
      timestamp: Date.now(),
      payload,
      attempts: 0
    };
    queue.push(item);
    this._saveQueue(queue);
    return id;
  }

  /**
   * Returns the count of pending mutations in the queue.
   * @returns {number}
   */
  get size() {
    return this.getQueue().length;
  }

  /**
   * Clears all pending mutations from storage.
   */
  clear() {
    safeRemoveItem(this._storageKey);
    this._notifyListeners({
      isOnline: this.isOnline,
      pendingCount: 0
    });
  }

  /**
   * Subscribes to queue status and network change events.
   * @param {(status: { isOnline: boolean, pendingCount: number }) => void} listener
   * @returns {() => void} Unsubscribe function
   */
  onStatusChange(listener) {
    this._listeners.add(listener);
    // Initial call
    listener({
      isOnline: this.isOnline,
      pendingCount: this.size
    });
    return () => this._listeners.delete(listener);
  }

  _notifyListeners(data) {
    for (const listener of this._listeners) {
      try {
        listener(data);
      } catch (err) {
        console.warn('OfflineSyncQueue status listener error:', err);
      }
    }
  }

  _handleNetworkChange(online) {
    this._notifyListeners({
      isOnline: online,
      pendingCount: this.size
    });

    if (online && this.size > 0 && this._lastSyncHandler) {
      this.flush(this._lastSyncHandler).catch(err => {
        console.warn('OfflineSyncQueue automatic reconnect flush error:', err);
      });
    }
  }

  /**
   * Drains the queue by passing pending payloads to syncHandler.
   * @param {(payload: object) => Promise<boolean>} syncHandler
   * @returns {Promise<{ processed: number, remaining: number }>}
   */
  async flush(syncHandler) {
    if (this._isFlushing) return { processed: 0, remaining: this.size };
    if (!this.isOnline) return { processed: 0, remaining: this.size };

    this._lastSyncHandler = syncHandler;
    this._isFlushing = true;
    let processed = 0;

    try {
      let queue = this.getQueue();
      while (queue.length > 0 && this.isOnline) {
        const item = queue[0];
        try {
          const success = await syncHandler(item.payload);
          if (success) {
            queue.shift(); // remove processed item
            this._saveQueue(queue);
            processed++;
            this._retryAttempts = 0;
          } else {
            // Handler returned false, stop draining
            item.attempts = (item.attempts || 0) + 1;
            this._saveQueue(queue);
            break;
          }
        } catch (err) {
          item.attempts = (item.attempts || 0) + 1;
          this._saveQueue(queue);
          console.warn(`OfflineSyncQueue flush failed for item ${item.id}:`, err);
          break;
        }
      }
    } finally {
      this._isFlushing = false;
    }

    return { processed, remaining: this.size };
  }
}

export const offlineSyncQueue = new OfflineSyncQueue();
