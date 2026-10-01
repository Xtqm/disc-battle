import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { scene, camera } from '../graphics/scene.js';
import { makeProgram } from '../graphics/materials.js';
import { burst } from '../graphics/particles.js';
import { tiles, tileMatIntact, tileEdgeMatIntact, triggerTileWarning } from '../entities/Arena.js';
import { spawnDisc } from '../entities/Disc.js';
import { initNetwork, getRoomRef, roomSetDoc, roomGetDoc, roomUpdateDoc, roomOnSnapshot } from './firebaseSetup.js';
import { tryLock, focusGame, setCursor } from '../input/InputManager.js';
import { shake } from '../ui/UIManager.js';
import { updateHUD, message, el } from '../ui/hud.js';
import { requestFullScreen } from '../ui/modals.js';

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
    const textarea = document.createElement('textarea');
    textarea.value = code;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
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
    
    const maxPlayers = data.mode === '2v2' ? 4 : 2;
    let assignedRole = null;
    let currentPlayers = 0;
    
    const players = data.players || { p1: data.hostId, p2: null, p3: null, p4: null };
    
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

export function startMultiplayerDuel(role, roomCode, mode = '1v1') {
  state.gameMode = mode === '2v2' ? 'duos_multi' : 'duel_multi';
  state.playerRole = role;
  state.currentRoomId = roomCode;
  state.lastProcessedThrowId = null;
  state.netSyncTimer = 0;
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'none';

  for (const f of state.foes) scene.remove(f.obj);
  for (const t of state.teammates) scene.remove(t.obj);
  for (const key in state.multiPlayers) {
    if (state.multiPlayers[key] && state.multiPlayers[key].obj) scene.remove(state.multiPlayers[key].obj);
  }
  for (const d of state.discs) scene.remove(d.obj);
  state.foes = []; state.teammates = []; state.multiPlayers = {}; state.discs = [];

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
  if (typeof window !== 'undefined' && window.__tronStartCountdown) {
    window.__tronStartCountdown(3.0);
  }
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
    
    startMultiplayerDuel(state.playerRole, state.currentRoomId, data.mode || '1v1');
    message('CHALLENGERS DETECTED — FIGHT!');
    return;
  }

  if (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') return;

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
      
      if (state.playerRole === 'p1' && vCount === pCount && vCount > 0) {
        const roomRef = getRoomRef(state.currentRoomId);
        const resetPatch = {
          status: 'active',
          lastThrow: null,
          fallen: [],
          rematchVotes: { p1: false, p2: false, p3: false, p4: false }
        };
        for (const k in data.players) {
          if (data.players[k]) {
            resetPatch[`state.${k}.hp`] = 100;
          }
        }
        roomUpdateDoc(roomRef, resetPatch);
      }
    } else {
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
    if (typeof window !== 'undefined' && window.__tronShowModeSelectMenu) {
      window.__tronShowModeSelectMenu();
    }
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
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'flex';
  if (overlay) overlay.innerHTML = `<div class="card" style="border-color:#b026ff;box-shadow:0 0 60px rgba(176,38,255,.3);">
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
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'flex';
  const subtitle = state.gameOverReason || 'YOU WERE ELIMINATED IN THE ARENA';
  if (overlay) overlay.innerHTML = `<div class="card dead">
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
  if (typeof document !== 'undefined' && document.pointerLockElement) {
    document.exitPointerLock();
  }
  setCursor();
}
