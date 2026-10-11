/**
 * IAuthProvider - Standard contract for identity providers in Tron Disc Arena.
 * Ensures a provider-agnostic interface across mock, guest, and remote authentication systems.
 */
export class IAuthProvider {
  /**
   * Unique identifier of the authentication provider (e.g. 'mock', 'firebase').
   * @type {string}
   */
  get providerId() {
    return 'abstract';
  }

  /**
   * Initializes the authentication provider and checks for existing sessions.
   * @returns {Promise<void>}
   */
  async init() {
    throw new Error('IAuthProvider: init() must be implemented by subclass.');
  }

  /**
   * Returns the currently authenticated user identity or null.
   * @returns {{ uid: string, handle: string, isAnonymous: boolean, token?: string, providerId: string } | null}
   */
  getCurrentUser() {
    throw new Error('IAuthProvider: getCurrentUser() must be implemented by subclass.');
  }

  /**
   * Authenticates or restores an anonymous guest sub-routine session.
   * @returns {Promise<{ uid: string, handle: string, isAnonymous: boolean, token?: string, providerId: string }>}
   */
  async signInGuest() {
    throw new Error('IAuthProvider: signInGuest() must be implemented by subclass.');
  }

  /**
   * Terminates the current authentication session.
   * @returns {Promise<void>}
   */
  async signOut() {
    throw new Error('IAuthProvider: signOut() must be implemented by subclass.');
  }

  /**
   * Authorizes or converts session with direct credentials.
   * @param {string} email
   * @param {string} password
   * @param {string} [handle]
   * @returns {Promise<object>}
   */
  async signInWithCredentials(email, password, handle) {
    throw new Error('IAuthProvider: signInWithCredentials() must be implemented by subclass.');
  }

  /**
   * Links or signs in via federated external provider.
   * @param {string} providerName
   * @param {object} [profile]
   * @returns {Promise<object>}
   */
  async signInWithFederated(providerName, profile) {
    throw new Error('IAuthProvider: signInWithFederated() must be implemented by subclass.');
  }

  /**
   * Updates the active user callsign / display handle.
   * @param {string} newHandle
   * @returns {Promise<object>}
   */
  async updateHandle(newHandle) {
    throw new Error('IAuthProvider: updateHandle() must be implemented by subclass.');
  }

  /**
   * Subscribes a listener to authentication state transitions.
   * @param {(user: { uid: string, handle: string, isAnonymous: boolean, token?: string, providerId: string } | null) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  onAuthStateChanged(callback) {
    throw new Error('IAuthProvider: onAuthStateChanged() must be implemented by subclass.');
  }
}

