import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';

config.appId = typeof __app_id !== 'undefined' ? __app_id : 'tron-disc-arena';
state.db = null;
state.auth = null;
state.currentUser = null;

// Mock peer network for multi-tab testing / offline fallback
state.mockChannel = null;
export const mockStore = new Map();
export const mockListeners = new Map();

export function initMockNetwork() {
  if (state.currentUser) return;
  const dummyUid = 'user_' + Math.random().toString(36).substring(2, 9);
  state.currentUser = { uid: dummyUid, isAnonymous: true };
  state.auth = { currentUser: state.currentUser };
  state.db = { isMock: true };

  if (!state.mockChannel && typeof BroadcastChannel !== 'undefined') {
    state.mockChannel = new BroadcastChannel('tron_disc_arena_mock_net_' + config.appId);
    state.mockChannel.onmessage = (e) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.type === 'doc_set' || msg.type === 'doc_update') {
        mockStore.set(msg.path, msg.data);
        const set = mockListeners.get(msg.path);
        if (set) {
          const snap = {
            exists: () => true,
            data: () => JSON.parse(JSON.stringify(msg.data))
          };
          for (const cb of set) {
            try { cb(snap); } catch (err) { console.error(err); }
          }
        }
      } else if (msg.type === 'doc_query') {
        let stored = mockStore.get(msg.path);
        if (!stored && typeof localStorage !== 'undefined') {
          try {
            const item = localStorage.getItem('tron_doc_' + msg.path);
            if (item) stored = JSON.parse(item);
          } catch (_) {}
        }
        if (stored) {
          mockStore.set(msg.path, stored);
          state.mockChannel.postMessage({ type: 'doc_set', path: msg.path, data: stored });
        }
      }
    };
  }
}

export function mockDocRef(path, id) {
  return { isMock: true, path, id };
}

export function mockSetDoc(ref, data) {
  if (!state.currentUser) return Promise.resolve();
  const serialized = JSON.parse(JSON.stringify(data));
  mockStore.set(ref.path, serialized);
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('tron_doc_' + ref.path, JSON.stringify(serialized)); } catch (_) {}
  }
  if (state.mockChannel) {
    state.mockChannel.postMessage({ type: 'doc_set', path: ref.path, data: serialized });
  }
  const set = mockListeners.get(ref.path);
  if (set) {
    const snap = { exists: () => true, data: () => JSON.parse(JSON.stringify(serialized)) };
    for (const cb of set) {
      try { cb(snap); } catch (err) { console.error(err); }
    }
  }
  return Promise.resolve();
}

export function mockGetDoc(ref) {
  let data = mockStore.get(ref.path);
  if (!data && typeof localStorage !== 'undefined') {
    try {
      const item = localStorage.getItem('tron_doc_' + ref.path);
      if (item) {
        data = JSON.parse(item);
        mockStore.set(ref.path, data);
      }
    } catch (_) {}
  }
  return Promise.resolve({
    exists: () => !!data,
    data: () => data ? JSON.parse(JSON.stringify(data)) : null
  });
}

export function mockUpdateDoc(ref, patch) {
  if (!state.currentUser) return Promise.resolve();
  let existing = mockStore.get(ref.path);
  if (!existing && typeof localStorage !== 'undefined') {
    try {
      const item = localStorage.getItem('tron_doc_' + ref.path);
      if (item) existing = JSON.parse(item);
    } catch (_) {}
  }
  const merged = Object.assign({}, existing || {}, JSON.parse(JSON.stringify(patch)));
  if (patch.p1 && existing && existing.p1) merged.p1 = Object.assign({}, existing.p1, patch.p1);
  if (patch.p2 && existing && existing.p2) merged.p2 = Object.assign({}, existing.p2, patch.p2);

  mockStore.set(ref.path, merged);
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('tron_doc_' + ref.path, JSON.stringify(merged)); } catch (_) {}
  }
  if (state.mockChannel) {
    state.mockChannel.postMessage({ type: 'doc_update', path: ref.path, data: merged });
  }
  const set = mockListeners.get(ref.path);
  if (set) {
    const snap = { exists: () => true, data: () => JSON.parse(JSON.stringify(merged)) };
    for (const cb of set) {
      try { cb(snap); } catch (err) { console.error(err); }
    }
  }
  return Promise.resolve();
}

export function mockOnSnapshot(ref, onUpdate, onError) {
  if (!mockListeners.has(ref.path)) {
    mockListeners.set(ref.path, new Set());
  }
  const set = mockListeners.get(ref.path);
  set.add(onUpdate);

  mockGetDoc(ref).then(snap => {
    if (snap.exists() && set.has(onUpdate)) {
      try { onUpdate(snap); } catch (err) { if (onError) onError(err); }
    } else if (state.mockChannel) {
      state.mockChannel.postMessage({ type: 'doc_query', path: ref.path });
    }
  });

  return () => {
    set.delete(onUpdate);
  };
}

export async function initNetwork() {
  if (state.db) return;
  if (typeof __firebase_config === 'undefined' || !__firebase_config) {
    if (typeof window !== 'undefined' && window.__useMockNetwork !== false && (typeof BroadcastChannel !== 'undefined' || typeof localStorage !== 'undefined')) {
      initMockNetwork();
      return;
    }
    console.warn("No Firebase configuration found; multiplayer offline.");
    return;
  }
  try {
    const firebaseConfig = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
    const app = initializeApp(firebaseConfig);
    state.auth = getAuth(app);
    state.db = getFirestore(app);

    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
      await signInWithCustomToken(state.auth, __initial_auth_token);
    } else {
      await signInAnonymously(state.auth);
    }
    state.currentUser = state.auth.currentUser;
  } catch (err) {
    console.warn("Firebase initialization error:", err);
    state.db = null;
    if (typeof window !== 'undefined' && window.__useMockNetwork !== false) {
      initMockNetwork();
    }
  }
}

export function getRoomRef(roomCode) {
  if (state.db && state.db.isMock) {
    return mockDocRef(`artifacts/${config.appId}/public/data/rooms/${roomCode}`, roomCode);
  }
  return doc(state.db, 'artifacts', config.appId, 'public', 'data', 'rooms', roomCode);
}

export function roomSetDoc(roomRef, data) {
  if (!state.currentUser) return Promise.resolve();
  if (roomRef && roomRef.isMock) {
    return mockSetDoc(roomRef, data);
  }
  return setDoc(roomRef, data);
}

export function roomGetDoc(roomRef) {
  if (roomRef && roomRef.isMock) {
    return mockGetDoc(roomRef);
  }
  return getDoc(roomRef);
}

export function roomUpdateDoc(roomRef, data) {
  if (!state.currentUser) return Promise.resolve();
  if (roomRef && roomRef.isMock) {
    return mockUpdateDoc(roomRef, data);
  }
  return updateDoc(roomRef, data);
}

export function roomOnSnapshot(roomRef, onUpdate, onError) {
  if (roomRef && roomRef.isMock) {
    return mockOnSnapshot(roomRef, onUpdate, onError);
  }
  return onSnapshot(roomRef, onUpdate, onError);
}
