import * as THREE from './vendor/three.module.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { state, player } from './state.js';
import { config } from './config.js';
import { renderer, scene, camera, checkOrientation, key, d, floor, grid, ring, tiles, tileGeo, tileEdgeGeo, tileMatIntact, tileEdgeMatIntact, tileGroup, worldToTile, tileToWorld, getTileAt, findNearestIntactTile, wallMat, glowMat, pillars, pillarSpots, tmp, _discMat, _fwd, _r0, _u0, _uBank, _rBank, _localX, _localY, _duelToP, _duelSide, _duelWant, _duelSafe, _duelCoverDir, _duelLead, _duelAimDir, _duelOrigin, _duelEvade, makeProgram, discGeo, makeDisc, sparks, burst, triggerTileWarning, spawnTileDeRezSparks, updateTiles, getPillarCoverPoint, findBestCoverPillar, updateDuelFoe } from './graphics.js';
import { getAudioCtx, playDeRezSound, playWarningSound, playTileDropSound } from './audio.js';
import { simulatePath, trajLine, bouncePips, impactMark, threatLines, updateThreatPaths, updateTrajectory, resolveCircle, lineOfSight } from './physics.js';
import { EAT, getPlayerCurveIntent, codeOf, onDown, onUp, canvas, overlay, startMode, startGame, pauseGame, resumeGame, restartMatch, showModeSelect, getMainMenuHtml, showModeSelectMenu, bindMainMenuEvents, pauseBtn, onPauseClick, resumeBtn, onResumeClick, restartBtn, onRestartClick, modeSelectBtn, onModeSelectClick, btnCopyCode, btnConfirmJoin, btnCancelRoom, joinRoomInput, tryLock, setCursor, focusGame, isLocked, look, showSens, moveStartPos, touchMove, lookLastPos, joyBase, joyThumb, R_STICK, showJoystick, updateJoystick, hideJoystick, updateCurveButtons, onTouchStart, onTouchMove, onTouchEnd, bindMobileButtons } from './input.js';
import { updateHUD, resetGame, spawnDuelBoss, spawnWave, throwDisc, _ro, aimTarget, aimDir, spawnDisc, damagePlayer, killFoe } from './entities.js';
import { el, msgEl, message, showGameOver, shake, requestFullScreen } from './ui.js';
import { startCountdown } from './main.js';

config.appId = typeof __app_id !== 'undefined' ? __app_id : 'tron-disc-arena';
state.db = null, state.auth = null, state.currentUser = null;

state.currentRoomId = null;
state.playerRole = null; // 'p1' (host) or 'p2' (guest)
state.roomUnsubscribe = null;
state.duelOpponent = null;
state.lastProcessedThrowId = null;
state.roomFallenTiles = [];
state.netSyncTimer = 0;

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
    if (window.__useMockNetwork !== false && (typeof BroadcastChannel !== 'undefined' || typeof localStorage !== 'undefined')) {
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
    if (window.__useMockNetwork !== false) {
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

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function copyRoomCode(code) {
  try {
    const el = document.createElement('textarea');
    el.value = code;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    message('ROOM CODE COPIED');
  } catch (err) {
    message('CODE: ' + code);
  }
}

export function showHostWaitingModal(code, mode) {
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'none';
  const rm = document.getElementById('roomModal');
  if (rm) rm.style.display = 'flex';
  const rt = document.getElementById('roomTitle');
  if (rt) rt.textContent = mode === '2v2' ? 'DUOS ROOM' : 'DUEL ROOM';
  const rs = document.getElementById('roomSubtitle');
  if (rs) rs.textContent = 'SHARE THIS CODE WITH YOUR FRIENDS';
  const rcd = document.getElementById('roomCodeDisplay');
  if (rcd) {
    rcd.style.display = 'block';
    rcd.textContent = code;
  }
  const hwb = document.getElementById('hostWaitBlock');
  if (hwb) hwb.style.display = 'block';
  const ind = hwb.querySelector('.waiting-indicator');
  if (ind) {
    const required = mode === '2v2' ? 4 : 2;
    ind.textContent = `WAITING FOR PLAYERS (1/${required})...`;
  }
  const jib = document.getElementById('joinInputBlock');
  if (jib) jib.style.display = 'none';
}

export function showJoinInputModal() {
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'none';
  const rm = document.getElementById('roomModal');
  if (rm) rm.style.display = 'flex';
  const rt = document.getElementById('roomTitle');
  if (rt) rt.textContent = 'JOIN DUEL';
  const rs = document.getElementById('roomSubtitle');
  if (rs) {
    rs.textContent = 'ENTER 4-DIGIT CODE';
    rs.style.color = '#a5f0fa';
  }
  const rcd = document.getElementById('roomCodeDisplay');
  if (rcd) rcd.style.display = 'none';
  const hwb = document.getElementById('hostWaitBlock');
  if (hwb) hwb.style.display = 'none';
  const jib = document.getElementById('joinInputBlock');
  if (jib) jib.style.display = 'block';
  const inp = document.getElementById('joinRoomInput');
  if (inp) {
    inp.value = '';
    setTimeout(() => inp.focus(), 50);
  }
}

export async function onClickCreateRoom(e, mode = '1v1') {
  if (state.isTouchDevice) {
    requestFullScreen();
  }
  if (e) {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
  }
  try {
    await initNetwork();
    if (!state.currentUser) {
      message('MULTIPLAYER OFFLINE');
      return;
    }
    const code = generateRoomCode();
    state.currentRoomId = code;
    state.playerRole = 'p1';
    state.roomFallenTiles = [];

    const roomRef = getRoomRef(code);
    await roomSetDoc(roomRef, {
      code,
      mode,
      createdAt: Date.now(),
      status: 'waiting',
      players: {
        p1: state.currentUser.uid,
        p2: null,
        p3: null,
        p4: null
      },
      state: {
        p1: { x: -8, y: 0, z: 18, yaw: 3.14, pitch: -0.1, hp: 100, blocking: false, hasDisc: true },
        p2: { x: -8, y: 0, z: -18, yaw: 0, pitch: -0.1, hp: 100, blocking: false, hasDisc: true },
        p3: { x: 8, y: 0, z: 18, yaw: 3.14, pitch: -0.1, hp: 100, blocking: false, hasDisc: true },
        p4: { x: 8, y: 0, z: -18, yaw: 0, pitch: -0.1, hp: 100, blocking: false, hasDisc: true }
      },
      lastThrow: null,
      fallen: [],
      rematchVotes: { p1: false, p2: false, p3: false, p4: false }
    });

    showHostWaitingModal(code, mode);

    if (state.roomUnsubscribe) { state.roomUnsubscribe(); state.roomUnsubscribe = null; }
    state.roomUnsubscribe = roomOnSnapshot(roomRef, (snap) => {
      onRoomSnapshot(snap);
    }, (err) => {
      console.warn("Room snapshot error:", err);
      message("CONNECTION ERROR");
    });
  } catch (err) {
    console.error("Create room error:", err);
    message('FAILED TO CREATE ROOM');
  }
}

export async function onClickConfirmJoin(e) {
  if (state.isTouchDevice) {
    requestFullScreen();
  }
  if (e) {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
  }
  const inp = document.getElementById('joinRoomInput');
  const code = (inp ? inp.value.trim().toUpperCase() : '');
  if (code.length !== 4) {
    message('ENTER 4-CHAR CODE');
    return;
  }

  const btn = document.getElementById('btnConfirmJoin');
  const originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.textContent = 'CONNECTING...';
    btn.disabled = true;
  }
  if (inp) inp.disabled = true;

  try {
    await initNetwork();
    if (!state.currentUser) {
      throw new Error('OFFLINE - MULTIPLAYER REQUIRES DATA CONNECTION');
    }
    const roomRef = getRoomRef(code);
    const snap = await roomGetDoc(roomRef);
    if (!snap.exists()) {
      throw new Error('ROOM CODE NOT FOUND');
    }
    const data = snap.data();
    if (data.status !== 'waiting') {
      throw new Error('ROOM IN SESSION OR FULL');
    }
    
    // Find an empty slot
    const maxPlayers = data.mode === '2v2' ? 4 : 2;
    let assignedRole = null;
    let currentPlayers = 0;
    
    // Ensure players object exists
    const players = data.players || { p1: data.hostId, p2: null, p3: null, p4: null }; // Fallback for old schema
    
    for (let i = 1; i <= maxPlayers; i++) {
      const role = 'p' + i;
      if (players[role]) {
        currentPlayers++;
      } else if (!assignedRole) {
        assignedRole = role;
      }
    }
    
    if (!assignedRole) {
      throw new Error('ROOM FULL');
    }
    
    state.currentRoomId = code;
    state.playerRole = assignedRole;
    state.roomFallenTiles = data.fallen || [];
    state.gameMode = data.mode === '2v2' ? 'duos_multi' : 'duel_multi';

    const patch = {
      [`players.${assignedRole}`]: state.currentUser.uid
    };
    
    if (currentPlayers + 1 === maxPlayers) {
      patch.status = 'active';
    }

    await roomUpdateDoc(roomRef, patch);

    const rm = document.getElementById('roomModal');
    if (rm) rm.style.display = 'none';

    if (state.roomUnsubscribe) { state.roomUnsubscribe(); state.roomUnsubscribe = null; }
    state.roomUnsubscribe = roomOnSnapshot(roomRef, (snap) => {
      onRoomSnapshot(snap);
    }, (err) => {
      console.warn("Room snapshot error:", err);
      message("CONNECTION ERROR");
    });

    if (patch.status === 'active') {
      startMultiplayerDuel(assignedRole, code, data.mode);
      message('CONNECTED TO ARENA — FIGHT!');
    } else {
      showHostWaitingModal(code, data.mode);
      message('WAITING FOR PLAYERS...');
    }
  } catch (err) {
    console.error("Join room error:", err);
    message('COULD NOT CONNECT');
    const rs = document.getElementById('roomSubtitle');
    if (rs) {
      rs.textContent = err.message || "CONNECTION FAILED";
      rs.style.color = '#ff3838';
    }
  } finally {
    if (btn) {
      btn.textContent = originalText;
      btn.disabled = false;
    }
    if (inp) inp.disabled = false;
  }
}

state.multiPlayers = {};
state.teammates = [];

export function startMultiplayerDuel(role, roomCode, mode = '1v1') {
  state.gameMode = mode === '2v2' ? 'duos_multi' : 'duel_multi';
  state.playerRole = role;
  state.currentRoomId = roomCode;
  state.lastProcessedThrowId = null;
  state.netSyncTimer = 0;
  if (overlay) overlay.style.display = 'none';

  for (const f of state.foes) scene.remove(f.obj);
  for (const t of state.teammates) scene.remove(t.obj);
  for (const key in state.multiPlayers) {
    if (state.multiPlayers[key] && state.multiPlayers[key].obj) scene.remove(state.multiPlayers[key].obj);
  }
  for (const d of state.discs) scene.remove(d.obj);
  state.foes = []; state.teammates = []; state.multiPlayers = {}; state.discs = [];

  // Reset arena tiles
  for (const tile of tiles.values()) {
    tile.state = config.TILE_INTACT;
    tile.timer = 0;
    tile.regenTimer = 0;
    tile.mesh.position.y = tile.origY;
    tile.mesh.visible = true;
    if (tile.slabMesh.material !== tileMatIntact) {
      tile.slabMesh.material.dispose();
      tile.edgeMesh.material.dispose();
      tile.slabMesh.material = tileMatIntact;
      tile.edgeMesh.material = tileEdgeMatIntact;
    }
  }

  const spawns = {
    p1: { x: -8, z: 18, yaw: Math.PI, team: 1 },
    p2: { x: -8, z: -18, yaw: 0, team: 2 },
    p3: { x: 8, z: 18, yaw: Math.PI, team: 1 },
    p4: { x: 8, z: -18, yaw: 0, team: 2 }
  };
  
  if (mode === '1v1') {
    spawns.p1.x = 0; spawns.p2.x = 0;
  }

  const mySpawn = spawns[role];
  state.player.pos.set(mySpawn.x, 0, mySpawn.z);
  state.player.yaw = mySpawn.yaw;
  state.player.pitch = -0.1;
  state.player.vel.set(0, 0, 0);
  state.player.y = 0;
  state.player.vy = 0;
  state.player.grounded = true;
  state.player.jumps = 0;
  state.player.hp = 100;
  state.player.energy = 100;
  state.player.hasDisc = true;
  state.player.alive = true;
  state.player.blocking = false;
  state.player.obj.visible = true;
  state.player.obj.position.copy(state.player.pos);
  state.player.obj.rotation.y = state.player.yaw;
  state.player.obj.userData.backDisc.visible = true;

  const maxPlayers = mode === '2v2' ? 4 : 2;
  for (let i = 1; i <= maxPlayers; i++) {
    const r = 'p' + i;
    if (r === role) continue;
    
    const isTeammate = spawns[r].team === mySpawn.team;
    const color = isTeammate ? config.CYAN : config.PURPLE;
    const oppObj = makeProgram(color);
    scene.add(oppObj);
    
    const s = spawns[r];
    oppObj.position.set(s.x, 0, s.z);
    oppObj.rotation.y = s.yaw;
    
    const mp = {
      role: r,
      obj: oppObj,
      pos: new THREE.Vector3(s.x, 0, s.z),
      targetPos: new THREE.Vector3(s.x, 0, s.z),
      y: 0,
      targetY: 0,
      yaw: s.yaw,
      targetYaw: s.yaw,
      hp: 100,
      blocking: false,
      hasDisc: true,
      alive: true,
      team: s.team
    };
    
    state.multiPlayers[r] = mp;
    if (isTeammate) state.teammates.push(mp);
    else state.foes.push(mp);
  }
  
  // Legacy alias for 1v1 logic
  if (mode === '1v1') {
    state.duelOpponent = state.foes[0];
  } else {
    state.duelOpponent = null;
  }

  state.running = true;
  state.paused = false;
  state.justResumed = true;
  state.gameOverT = 0;
  state.gameOverReason = '';

  const fwd = new THREE.Vector3(-Math.sin(state.player.yaw), 0, -Math.cos(state.player.yaw));
  const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const camOff = new THREE.Vector3()
    .addScaledVector(fwd, -4.2)
    .addScaledVector(side, 1.35)
    .setY(2.2 - state.player.pitch * 5.0);
  camera.position.copy(state.player.pos).add(camOff);
  const look = state.player.pos.clone().add(new THREE.Vector3(0, 2.0, 0)).addScaledVector(side, 1.7).addScaledVector(fwd, 14);
  camera.lookAt(look);

  updateHUD();
  startCountdown(3.0);
  tryLock();
  focusGame();
}

export function onRoomSnapshot(snap) {
  if (!snap.exists()) return;
  const data = snap.data();
  if (!data) return;

  if (data.status === 'active' && (!state.running || state.gameMode === 'swarm')) {
    const rm = document.getElementById('roomModal');
    if (rm) rm.style.display = 'none';
    const jm = document.getElementById('joinModal');
    if (jm) jm.style.display = 'none';
    
    // Use the stored gameMode to prevent double-starting if we just set running = true,
    // though !running should cover it.
    startMultiplayerDuel(state.playerRole, state.currentRoomId, data.mode || '1v1');
    message('CHALLENGERS DETECTED — FIGHT!');
    return;
  }

  if (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') return;

  // Process all remote players
  if (data.state) {
    for (const r in state.multiPlayers) {
      const oppData = data.state[r];
      const opp = state.multiPlayers[r];
      if (oppData && opp) {
        opp.targetPos.set(oppData.x, 0, oppData.z);
        opp.targetY = oppData.y || 0;
        opp.targetYaw = oppData.yaw;
        if (oppData.hp !== undefined) opp.hp = oppData.hp;
        opp.blocking = !!oppData.blocking;
        if (oppData.hasDisc !== undefined) opp.hasDisc = oppData.hasDisc;

        if (oppData.hp <= 0 && opp.alive) {
          opp.alive = false;
          burst(opp.pos.clone().setY(opp.y + 1.4), opp.team === state.multiPlayers[state.playerRole]?.team ? config.CYAN : config.PURPLE, 80, 15);
          opp.obj.visible = false;
        }
      }
    }
  }

  // Fallback for old schema where it was at the root
  for (const r in state.multiPlayers) {
    if (data.state && data.state[r]) continue;
    const oppData = data[r];
    const opp = state.multiPlayers[r];
    if (oppData && opp) {
      opp.targetPos.set(oppData.x, 0, oppData.z);
      opp.targetY = oppData.y || 0;
      opp.targetYaw = oppData.yaw;
      if (oppData.hp !== undefined) opp.hp = oppData.hp;
      opp.blocking = !!oppData.blocking;
      if (oppData.hasDisc !== undefined) opp.hasDisc = oppData.hasDisc;

      if (oppData.hp <= 0 && opp.alive) {
        opp.alive = false;
        burst(opp.pos.clone().setY(opp.y + 1.4), config.PURPLE, 80, 15);
        opp.obj.visible = false;
      }
    }
  }

  if (data.lastThrow && data.lastThrow.id !== state.lastProcessedThrowId && data.lastThrow.sender !== state.playerRole) {
    state.lastProcessedThrowId = data.lastThrow.id;
    const t = data.lastThrow;
    const opp = state.multiPlayers[t.sender];
    if (opp) {
      const origin = new THREE.Vector3(t.x, t.y, t.z);
      const vel = new THREE.Vector3(t.vx, t.vy, t.vz);
      const oppDisc = spawnDisc(origin, vel, opp, opp.team === (state.multiPlayers[state.playerRole]?.team || 1) ? config.CYAN : config.PURPLE, t.curve || 0);
      oppDisc.remoteThrowId = t.id;
      opp.hasDisc = false;
      if (opp.obj && opp.obj.userData && opp.obj.userData.backDisc) {
        opp.obj.userData.backDisc.visible = false;
      }
      shake(0.08);
    }
  }

  if (state.playerRole !== 'p1' && Array.isArray(data.fallen)) {
    for (const item of data.fallen) {
      const [ix, iz] = Array.isArray(item) ? item : item.split('_').map(Number);
      const tileKey = `${ix}_${iz}`;
      const t = tiles.get(tileKey);
      if (t && t.state === config.TILE_INTACT) {
        triggerTileWarning(t, config.PURPLE);
      }
    }
  }

  if (data.status === 'finished') {
    if (!state.running) {
      // Update rematch votes display
      const rv = data.rematchVotes || {};
      let vCount = 0;
      let pCount = 0;
      const players = data.players || { p1: true, p2: true };
      for (const k in players) {
        if (players[k]) {
          pCount++;
          if (rv[k]) vCount++;
        }
      }
      const voteLabel = document.getElementById('rematchVoteLabel');
      if (voteLabel) {
        voteLabel.textContent = `REMATCH VOTES: ${vCount} / ${pCount}`;
      }
      
      // If host, check if all voted yes
      if (state.playerRole === 'p1' && vCount === pCount && vCount > 0) {
        const roomRef = getRoomRef(state.currentRoomId);
        const resetPatch = {
          status: 'active',
          lastThrow: null,
          fallen: [],
          rematchVotes: { p1: false, p2: false, p3: false, p4: false }
        };
        // Reset everyone's HP
        for (const k in data.players) {
          if (data.players[k]) {
            resetPatch[`state.${k}.hp`] = 100;
          }
        }
        roomUpdateDoc(roomRef, resetPatch);
      }
    } else {
      // Transition to game over screen
      let isWin = false;
      if (data.mode === '2v2') {
        const myTeam = (state.playerRole === 'p1' || state.playerRole === 'p3') ? 1 : 2;
        isWin = data.winnerTeam === myTeam;
      } else {
        isWin = data.winner === state.playerRole;
      }
      if (isWin) {
        showMultiplayerVictory(data);
      } else {
        showMultiplayerDefeat(data);
      }
    }
  }
}

export function syncNetworkState(dt) {
  if (!state.db || !state.currentRoomId || (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi')) return;
  if (!state.currentUser) return;
  state.netSyncTimer -= dt;
  if (state.netSyncTimer > 0) return;
  state.netSyncTimer = 0.055; // ~18 Hz

  const roomRef = getRoomRef(state.currentRoomId);
  const myState = {
    x: +state.player.pos.x.toFixed(2),
    y: +state.player.y.toFixed(2),
    z: +state.player.pos.z.toFixed(2),
    yaw: +state.player.yaw.toFixed(2),
    pitch: +state.player.pitch.toFixed(2),
    hp: state.player.hp,
    blocking: state.player.blocking,
    hasDisc: state.player.hasDisc
  };

  const payload = {};
  payload[`state.${state.playerRole}`] = myState;
  
  // Backwards compatibility sync just in case
  payload[state.playerRole] = myState;

  roomUpdateDoc(roomRef, payload).catch(err => console.warn("Sync err:", err));
}

export function onTileDestabilizedByHost(ix, iz) {
  if ((state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') || state.playerRole !== 'p1') return;
  if (!state.currentRoomId || !state.db || !state.currentUser) return;
  const tileStr = `${ix}_${iz}`;
  const alreadyAdded = state.roomFallenTiles.some(item => Array.isArray(item) ? (item[0] === ix && item[1] === iz) : item === tileStr);
  if (!alreadyAdded) {
    state.roomFallenTiles.push(tileStr);
    const roomRef = getRoomRef(state.currentRoomId);
    roomUpdateDoc(roomRef, {
      fallen: state.roomFallenTiles
    }).catch(err => console.warn("Fallen tiles sync err:", err));
  }
}

export function renderGameOverActions(data) {
  let btnHtml = '';
  if (data) {
    btnHtml = `
      <button id="voteRematchBtn" class="btn" style="border-color:var(--cyan);color:var(--cyan);margin-bottom:12px;">VOTE REMATCH</button>
      <div id="rematchVoteLabel" style="font-size:12px;letter-spacing:2px;margin-bottom:20px;">REMATCH VOTES: 0 / 0</div>
    `;
  }
  return btnHtml + `<button id="multiMenuBtn" class="btn purple">RETURN TO MENU</button>`;
}

export function bindGameOverActions() {
  const btn = el('multiMenuBtn');
  if (btn) btn.onclick = (e) => {
    e.stopPropagation();
    teardownMultiplayer();
    showModeSelectMenu();
  };
  
  const voteBtn = el('voteRematchBtn');
  if (voteBtn) {
    voteBtn.onclick = (e) => {
      e.stopPropagation();
      voteBtn.textContent = 'VOTED';
      voteBtn.disabled = true;
      const roomRef = getRoomRef(state.currentRoomId);
      const patch = {};
      patch[`rematchVotes.${state.playerRole}`] = true;
      roomUpdateDoc(roomRef, patch);
    };
  }
}

export function showMultiplayerVictory(data = null) {
  state.running = false;
  overlay.style.display = 'flex';
  overlay.innerHTML = `<div class="card" style="border-color:#b026ff;box-shadow:0 0 60px rgba(176,38,255,.3);">
    <h1 style="color:#d896ff;text-shadow:0 0 30px #b026ff">VICTORY</h1>
    <h2>GRID SECURED</h2>
    <div style="font-size:15px;letter-spacing:4px;margin-bottom:26px">
      ROOM <b style="color:#fff">${state.currentRoomId || '----'}</b> &nbsp;·&nbsp; ROLE <b style="color:#fff">${state.playerRole ? state.playerRole.toUpperCase() : ''}</b>
    </div>
    <div class="menu-actions" style="max-width:320px;margin:0 auto">
      ${renderGameOverActions(data)}
    </div>
  </div>`;
  bindGameOverActions();
}

export function showMultiplayerDefeat(data = null) {
  state.running = false;
  overlay.style.display = 'flex';
  const subtitle = state.gameOverReason || 'YOU WERE ELIMINATED IN THE ARENA';
  overlay.innerHTML = `<div class="card dead">
    <h1>DEREZZED</h1>
    <h2>${subtitle}</h2>
    <div style="font-size:15px;letter-spacing:4px;margin-bottom:26px">
      ROOM <b style="color:#fff">${state.currentRoomId || '----'}</b> &nbsp;·&nbsp; ROLE <b style="color:#fff">${state.playerRole ? state.playerRole.toUpperCase() : ''}</b>
    </div>
    <div class="menu-actions" style="max-width:320px;margin:0 auto">
      ${renderGameOverActions(data)}
    </div>
  </div>`;
  bindGameOverActions();
}

export function teardownMultiplayer() {
  if (state.roomUnsubscribe) {
    state.roomUnsubscribe();
    state.roomUnsubscribe = null;
  }
  if (state.duelOpponent && state.duelOpponent.obj) {
    scene.remove(state.duelOpponent.obj);
    state.duelOpponent = null;
  }
  for (const d of state.discs) scene.remove(d.obj);
  state.discs = [];
  state.currentRoomId = null;
  state.playerRole = null;
  state.lastProcessedThrowId = null;
  state.roomFallenTiles = [];
  state.gameMode = 'swarm';
  state.running = false;
  state.paused = false;
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  setCursor();
}
