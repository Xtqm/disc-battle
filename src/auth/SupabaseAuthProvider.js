import { IAuthProvider } from './IAuthProvider.js';

/**
 * Generates guest handle in Tron subroutine format from a UID.
 * @param {string} uid
 * @returns {string}
 */
export function generateGuestHandle(uid) {
  const clean = (uid || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const shortId = clean.substring(0, 4) || 'GRID';
  return `GUEST_SUBROUTINE_${shortId}`;
}

/**
 * Resolves Supabase credentials from options, environment, or global scope.
 * @param {object} [opts]
 * @returns {{ url: string, anonKey: string }}
 */
export function resolveSupabaseConfig(opts = {}) {
  if (typeof window !== 'undefined' && window.__FORCE_SIMULATED_AUTH__) {
    return { url: '', anonKey: '' };
  }

  const url = opts.supabaseUrl ||
    (typeof process !== 'undefined' && process.env && (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)) ||
    (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.SUPABASE_URL) ||
    (typeof window !== 'undefined' && window.SUPABASE_URL) ||
    '';

  const anonKey = opts.supabaseAnonKey ||
    (typeof process !== 'undefined' && process.env && (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)) ||
    (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.SUPABASE_ANON_KEY) ||
    (typeof window !== 'undefined' && window.SUPABASE_ANON_KEY) ||
    '';

  return { url, anonKey };
}

/**
 * Removes OAuth authentication tokens and error fragments from the URL hash.
 */
export function cleanAuthUrlHash() {
  try {
    if (typeof window !== 'undefined' && window.location && window.history?.replaceState) {
      const hash = window.location.hash || '';
      if (hash && (hash.includes('access_token=') || hash.includes('error=') || hash.includes('refresh_token='))) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  } catch (_) {}
}

const MOCK_AUTH_STORAGE_KEY = 'tron_simulated_supabase_auth_session';

/**
 * In-memory simulated Supabase Auth client for offline or unconfigured environments.
 */
class InMemorySupabaseAuth {
  constructor() {
    this._user = null;
    this._session = null;
    this._listeners = new Set();
    this._loadPersistedSession();
  }

  _loadPersistedSession() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.user && parsed.session) {
            this._user = parsed.user;
            this._session = parsed.session;
          }
        }
      }
    } catch (_) {}
  }

  _persistSession() {
    try {
      if (typeof localStorage !== 'undefined') {
        if (this._session && this._user) {
          localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify({ user: this._user, session: this._session }));
        } else {
          localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
        }
      }
    } catch (_) {}
  }

  onAuthStateChange(callback) {
    this._listeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this._listeners.delete(callback);
          }
        }
      }
    };
  }

  _emit(event, session) {
    this._persistSession();
    for (const listener of this._listeners) {
      try {
        listener(event, session);
      } catch (e) {
        console.warn('InMemorySupabaseAuth listener error:', e);
      }
    }
  }

  async getSession() {
    return { data: { session: this._session }, error: null };
  }

  async getUser() {
    return { data: { user: this._user }, error: null };
  }

  async signInAnonymously() {
    if (this._session && this._user) {
      return { data: { user: this._user, session: this._session }, error: null };
    }
    const randomHex = Math.random().toString(16).substring(2, 10);
    const id = `00000000-0000-4000-8000-${randomHex.padEnd(12, '0')}`;
    this._user = {
      id,
      email: null,
      is_anonymous: true,
      user_metadata: { handle: generateGuestHandle(id) }
    };
    this._session = {
      access_token: `mock_jwt_anon_${id}`,
      user: this._user
    };
    this._emit('SIGNED_IN', this._session);
    return { data: { user: this._user, session: this._session }, error: null };
  }

  async linkIdentity(credentials = {}) {
    if (!this._user) {
      return { data: null, error: new Error('No active user to link identity') };
    }
    const provider = credentials.provider || 'custom';
    this._user.is_anonymous = false;
    this._user.app_metadata = { ...this._user.app_metadata, provider };
    this._session = {
      ...this._session,
      access_token: `mock_jwt_linked_${this._user.id}`,
      user: this._user
    };
    this._emit('USER_UPDATED', this._session);
    return { data: { user: this._user, session: this._session }, error: null };
  }

  async updateUser(attributes = {}) {
    if (!this._user) {
      return { data: null, error: new Error('No user currently signed in') };
    }
    if (attributes.email) {
      this._user.email = attributes.email;
      this._user.is_anonymous = false;
    }
    if (attributes.data) {
      this._user.user_metadata = {
        ...this._user.user_metadata,
        ...attributes.data
      };
    }
    this._session = { ...this._session, user: this._user };
    this._emit('USER_UPDATED', this._session);
    return { data: { user: this._user }, error: null };
  }

  async signInWithOAuth({ provider, options = {} }) {
    const id = this._user?.id || `00000000-0000-4000-8000-oauth${Date.now()}`;
    const handle = `${provider.toUpperCase()}_PROGRAM_${id.substring(0, 4)}`;
    this._user = {
      id,
      email: `pilot_${id.substring(0, 6)}@${provider}.grid`,
      is_anonymous: false,
      user_metadata: { handle, provider }
    };
    this._session = {
      access_token: `mock_jwt_oauth_${provider}_${id}`,
      user: this._user
    };
    this._emit('SIGNED_IN', this._session);
    return { data: { provider, url: options.redirectTo || null }, error: null };
  }

  async signInWithPassword({ email, password }) {
    const id = `00000000-0000-4000-8000-pass${Math.random().toString(16).substring(2, 6)}`;
    const handle = email.split('@')[0].toUpperCase().substring(0, 16);
    this._user = {
      id,
      email,
      is_anonymous: false,
      user_metadata: { handle }
    };
    this._session = {
      access_token: `mock_jwt_pass_${id}`,
      user: this._user
    };
    this._emit('SIGNED_IN', this._session);
    return { data: { user: this._user, session: this._session }, error: null };
  }

  async signUp({ email, password, options = {} }) {
    const id = `00000000-0000-4000-8000-reg${Math.random().toString(16).substring(2, 6)}`;
    const handle = options.data?.handle || email.split('@')[0].toUpperCase().substring(0, 16);
    this._user = {
      id,
      email,
      is_anonymous: false,
      user_metadata: { handle }
    };
    this._session = {
      access_token: `mock_jwt_reg_${id}`,
      user: this._user
    };
    this._emit('SIGNED_IN', this._session);
    return { data: { user: this._user, session: this._session }, error: null };
  }

  async signInWithOtp({ email, options = {} }) {
    return { data: { message: `Magic Link OTP sent to ${email}` }, error: null };
  }

  async signOut() {
    this._user = null;
    this._session = null;
    this._emit('SIGNED_OUT', null);
    return { error: null };
  }
}

/**
 * SupabaseAuthProvider - Standard IAuthProvider implementation using Supabase Auth.
 */
export class SupabaseAuthProvider extends IAuthProvider {
  /**
   * @param {object} [options]
   * @param {string} [options.supabaseUrl]
   * @param {string} [options.supabaseAnonKey]
   * @param {object} [options.client] Pre-instantiated Supabase client (e.g. for testing)
   */
  constructor(options = {}) {
    super();
    this._options = options;
    const { url, anonKey } = resolveSupabaseConfig(options);
    this._supabaseUrl = url;
    this._supabaseAnonKey = anonKey;
    this._client = options.client || null;
    this._currentUser = null;
    this._authSubscription = null;
    this._listeners = new Set();
    this._isInitialized = false;
  }

  get providerId() {
    return 'supabase';
  }

  get client() {
    return this._client;
  }

  /**
   * Initializes the Supabase client and verifies the existing session.
   * @returns {Promise<void>}
   */
  async init() {
    if (this._isInitialized) return;

    if (!this._client) {
      if (this._supabaseUrl && this._supabaseAnonKey) {
        try {
          let createClientFn = null;
          if (typeof window !== 'undefined' && window.supabase?.createClient) {
            createClientFn = window.supabase.createClient;
          } else if (typeof window === 'undefined') {
            const supabaseModule = await import('@supabase/supabase-js');
            createClientFn = supabaseModule.createClient;
          }
          if (typeof createClientFn === 'function') {
            this._client = createClientFn(this._supabaseUrl, this._supabaseAnonKey, {
              auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
              }
            });
          }
        } catch (err) {
          console.warn('SupabaseAuthProvider: Could not load @supabase/supabase-js, falling back to simulated client:', err);
        }
      }

      if (!this._client) {
        this._client = { auth: new InMemorySupabaseAuth() };
      }
    }

    // Subscribe to Supabase auth state change events
    if (this._client && this._client.auth) {
      const { data } = this._client.auth.onAuthStateChange((event, session) => {
        this._handleSupabaseAuthEvent(event, session);
      });
      this._authSubscription = data?.subscription || null;

      // Check current session or capture OAuth callback redirect
      try {
        const { data: sessionData } = await this._client.auth.getSession();
        if (sessionData?.session?.user) {
          this._currentUser = this._mapSupabaseUser(sessionData.session.user, sessionData.session);
          cleanAuthUrlHash();
        } else {
          cleanAuthUrlHash();
          // Automatically provision native anonymous user if no session exists
          await this.signInGuest();
        }
      } catch (sessionErr) {
        console.warn('SupabaseAuthProvider: Session check or guest sign-in encountered error, falling back to simulated client:', sessionErr);
        cleanAuthUrlHash();
        this._client = { auth: new InMemorySupabaseAuth() };
        await this.signInGuest();
      }
    }

    this._isInitialized = true;
  }

  /**
   * Returns current user identity.
   * @returns {object|null}
   */
  getCurrentUser() {
    return this._currentUser;
  }

  /**
   * Provisions or restores native anonymous authentication.
   * @param {boolean} [forceNew=false]
   * @returns {Promise<object>}
   */
  async signInGuest(forceNew = false) {
    if (!this._client) throw new Error('Supabase client is not initialized');

    if (forceNew && this._currentUser) {
      await this.signOut();
    }

    try {
      const { data, error } = await this._client.auth.signInAnonymously();
      if (error) {
        throw new Error(`Supabase signInAnonymously failed: ${error.message}`);
      }

      this._currentUser = this._mapSupabaseUser(data.user, data.session);
      this._notifyListeners(this._currentUser);
      return this._currentUser;
    } catch (err) {
      // If live Supabase anonymous sign-in failed (offline/disabled), smoothly fall back to simulated in-memory
      if (!(this._client.auth instanceof InMemorySupabaseAuth)) {
        console.warn('SupabaseAuthProvider: Falling back to in-memory guest auth:', err.message);
        this._client = { auth: new InMemorySupabaseAuth() };
        return this.signInGuest(forceNew);
      }
      throw err;
    }
  }

  /**
   * Upgrades an anonymous guest account by linking an external identity or credentials.
   * @param {object} credentials
   * @param {string} [credentials.provider] OAuth provider ('google', 'github')
   * @param {string} [credentials.email]
   * @param {string} [credentials.password]
   * @param {string} [credentials.handle]
   * @returns {Promise<object>}
   */
  async linkIdentity(credentials = {}) {
    if (!this._client) throw new Error('Supabase client is not initialized');

    if (credentials.provider) {
      // OAuth Identity Linking
      if (typeof this._client.auth.linkIdentity === 'function') {
        const { data, error } = await this._client.auth.linkIdentity({
          provider: credentials.provider,
          options: {
            redirectTo: typeof window !== 'undefined' ? (window.location.origin + window.location.pathname) : undefined
          }
        });
        if (error) throw new Error(`Supabase linkIdentity failed: ${error.message}`);
        return data;
      } else {
        // Fallback for providers without explicit linkIdentity
        return this.signInWithFederated(credentials.provider);
      }
    }

    if (credentials.email && credentials.password) {
      // Email/Password upgrade on anonymous user
      const { data, error } = await this._client.auth.updateUser({
        email: credentials.email,
        password: credentials.password,
        data: {
          handle: credentials.handle || this._currentUser?.handle || 'PROGRAM'
        }
      });
      if (error) throw new Error(`Supabase updateUser link failed: ${error.message}`);
      if (data?.user) {
        this._currentUser = this._mapSupabaseUser(data.user, null);
        this._notifyListeners(this._currentUser);
      }
      return this._currentUser;
    }

    throw new Error('linkIdentity requires either provider or email/password credentials');
  }

  /**
   * Signs in via OAuth provider (Google, GitHub).
   * @param {string} providerName
   * @param {object} [profile]
   * @returns {Promise<object>}
   */
  async signInWithFederated(providerName, profile = null) {
    if (!this._client) throw new Error('Supabase client is not initialized');

    // Flush active save state to local persistence before redirect to guarantee progression safety
    try {
      if (typeof localStorage !== 'undefined' && this._currentUser?.uid) {
        const saveStateKey = `tron_save_state_${this._currentUser.uid}`;
        const existing = localStorage.getItem(saveStateKey);
        if (existing) {
          const parsed = JSON.parse(existing);
          parsed.lastActiveAt = Date.now();
          localStorage.setItem(saveStateKey, JSON.stringify(parsed));
        }
      }
    } catch (_) {}

    const { data, error } = await this._client.auth.signInWithOAuth({
      provider: providerName.toLowerCase(),
      options: {
        redirectTo: typeof window !== 'undefined' ? (window.location.origin + window.location.pathname) : undefined
      }
    });

    if (error) throw new Error(`Supabase OAuth (${providerName}) failed: ${error.message}`);

    // If OAuth returns a user/session synchronously (such as in tests/mock mode)
    if (data?.session?.user || this._client.auth._user) {
      const u = data?.session?.user || this._client.auth._user;
      this._currentUser = this._mapSupabaseUser(u, data?.session || this._client.auth._session);
      this._notifyListeners(this._currentUser);
      return this._currentUser;
    }

    if (data?.url && typeof window !== 'undefined') {
      window.location.href = data.url;
    }

    return data;
  }

  /**
   * Signs in with direct passkey (Password or Magic Link OTP).
   * @param {string} email
   * @param {string} password
   * @param {string} [handle]
   * @returns {Promise<object>}
   */
  async signInWithCredentials(email, password, handle = '') {
    if (!this._client) throw new Error('Supabase client is not initialized');

    if (!email || !email.includes('@')) {
      throw new Error('Valid email address required.');
    }

    // If password is provided, attempt standard password authentication or anonymous user upgrade
    if (password && password.length >= 6) {
      // 1. If currently anonymous and registering new callsign, attempt upgrade in place
      if (this._currentUser?.isAnonymous && handle && typeof this._client.auth.updateUser === 'function') {
        try {
          const { data: updateData, error: updateError } = await this._client.auth.updateUser({
            email,
            password,
            data: { handle: handle.trim().toUpperCase() }
          });
          if (!updateError && updateData?.user) {
            this._currentUser = this._mapSupabaseUser(updateData.user, null);
            this._notifyListeners(this._currentUser);
            return this._currentUser;
          }
        } catch (_) {
          // Fall through to regular sign-in / sign-up if updateUser is unsupported or user exists
        }
      }

      // 2. Attempt sign-in with existing password credentials
      const { data, error } = await this._client.auth.signInWithPassword({ email, password });
      if (!error && data?.user) {
        this._currentUser = this._mapSupabaseUser(data.user, data.session);
        if (handle && this._currentUser.handle !== handle) {
          await this.updateHandle(handle);
        }
        this._notifyListeners(this._currentUser);
        return this._currentUser;
      }

      // 3. If sign-in failed due to non-existent account, attempt registration
      const { data: signData, error: signError } = await this._client.auth.signUp({
        email,
        password,
        options: {
          data: {
            handle: handle ? handle.trim().toUpperCase() : email.split('@')[0].toUpperCase().substring(0, 16)
          }
        }
      });

      if (signError) {
        throw new Error(signError.message || error?.message || 'Authentication failed');
      }

      if (signData?.user) {
        this._currentUser = this._mapSupabaseUser(signData.user, signData.session);
        this._notifyListeners(this._currentUser);
        return this._currentUser;
      }
    }

    // Password omitted or empty: Magic Link OTP workflow
    const { data, error } = await this._client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? (window.location.origin + window.location.pathname) : undefined
      }
    });

    if (error) {
      throw new Error(`Magic link dispatch failed: ${error.message}`);
    }

    return { email, magicLinkSent: true, message: 'Magic link dispatched to communications terminal.' };
  }

  /**
   * Updates user display handle / callsign.
   * @param {string} newHandle
   * @returns {Promise<object>}
   */
  async updateHandle(newHandle) {
    if (!this._client) throw new Error('Supabase client is not initialized');
    if (!newHandle) throw new Error('Handle cannot be empty');

    const sanitized = newHandle.trim().toUpperCase();
    const { data, error } = await this._client.auth.updateUser({
      data: { handle: sanitized }
    });

    if (error) {
      throw new Error(`Failed to update handle in Supabase: ${error.message}`);
    }

    if (this._currentUser) {
      this._currentUser.handle = sanitized;
      this._notifyListeners(this._currentUser);
    }

    return this._currentUser;
  }

  /**
   * Signs out current user session.
   * @returns {Promise<void>}
   */
  async signOut() {
    if (this._client?.auth) {
      await this._client.auth.signOut();
    }
    this._currentUser = null;
    this._notifyListeners(null);
  }

  /**
   * Subscribes to authentication state changes.
   * @param {(user: object|null) => void} callback
   * @returns {() => void}
   */
  onAuthStateChanged(callback) {
    this._listeners.add(callback);
    return () => {
      this._listeners.delete(callback);
    };
  }

  _notifyListeners(user) {
    for (const callback of this._listeners) {
      try {
        callback(user);
      } catch (err) {
        console.warn('SupabaseAuthProvider listener callback threw an error:', err);
      }
    }
  }

  _handleSupabaseAuthEvent(event, session) {
    if (session?.user) {
      this._currentUser = this._mapSupabaseUser(session.user, session);
    } else {
      this._currentUser = null;
    }
    this._notifyListeners(this._currentUser);
  }

  _mapSupabaseUser(user, session) {
    if (!user) return null;
    const isAnonymous = !!user.is_anonymous;
    const defaultHandle = isAnonymous
      ? generateGuestHandle(user.id)
      : (user.user_metadata?.handle || user.email?.split('@')[0]?.toUpperCase() || 'PROGRAM');

    return {
      uid: user.id,
      handle: user.user_metadata?.handle || defaultHandle,
      isAnonymous,
      token: session?.access_token || '',
      providerId: 'supabase',
      email: user.email || null,
      userMetadata: user.user_metadata || {}
    };
  }
}
