import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { getRoomRef, roomUpdateDoc } from './firebaseSetup.js';

/**
 * Ingests incoming fast kinematics packet from WebRTC DataChannel
 * @param {Object} data 
 */
export function handleIncomingFastPacket(data) {
  if (!data || !data.role) return;
  const oppRole = data.role;
  const opp = state.multiPlayers[oppRole];
  if (!opp) return;
  const s = data.state;
  if (!s) return;
  if (opp.targetPos) {
    opp.targetPos.set(s.x, 0, s.z);
  }
  opp.targetY = s.y;
  opp.targetYaw = s.yaw;
  opp.targetPitch = s.pitch;
  opp.hp = s.hp;
  opp.blocking = s.blocking;
  opp.hasDisc = s.hasDisc;
}

/**
 * Synchronizes local player kinematics across WebRTC DataChannel (up to 50 Hz)
 * with graceful fallback to legacy document polling if WebRTC is not active.
 * @param {number} dt 
 */
export function syncNetworkState(dt) {
  if (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') return;
  if (!state.currentRoomId || !state.playerRole) return;

  state.netSyncTimer -= dt;
  if (state.netSyncTimer > 0) return;

  const isWebRTC = !!(state.webrtcPeer && state.webrtcPeer.connectionState === 'connected');
  // 50 Hz for direct WebRTC peer channel, ~18 Hz for legacy database polling
  state.netSyncTimer = isWebRTC ? 0.02 : 0.055;

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

  // 1. Direct WebRTC DataChannel (Zero cloud database writes)
  if (isWebRTC) {
    state.webrtcPeer.sendFast({
      role: state.playerRole,
      state: myState
    });
    return;
  }

  // 2. Legacy database / mock channel fallback
  if (state.db && state.currentUser) {
    const roomRef = getRoomRef(state.currentRoomId);
    const payload = {};
    payload[`state.${state.playerRole}`] = myState;
    payload[state.playerRole] = myState;
    roomUpdateDoc(roomRef, payload).catch(err => console.warn("Sync err:", err));
  }
}

/**
 * Broadcasts tile drop event from host to all peers
 * @param {number} ix 
 * @param {number} iz 
 */
export function onTileDestabilizedByHost(ix, iz) {
  if ((state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') || state.playerRole !== 'p1') return;
  if (!state.currentRoomId) return;

  const tileStr = `${ix}_${iz}`;
  const alreadyAdded = state.roomFallenTiles.some(item => Array.isArray(item) ? (item[0] === ix && item[1] === iz) : item === tileStr);
  if (!alreadyAdded) {
    state.roomFallenTiles.push(tileStr);

    if (state.webrtcPeer && state.webrtcPeer.connectionState === 'connected') {
      state.webrtcPeer.sendReliable({
        type: 'TILE_DESTABILIZED',
        tile: tileStr,
        fallen: state.roomFallenTiles
      });
      return;
    }

    if (state.db && state.currentUser) {
      const roomRef = getRoomRef(state.currentRoomId);
      roomUpdateDoc(roomRef, {
        fallen: state.roomFallenTiles
      }).catch(err => console.warn("Fallen tiles sync err:", err));
    }
  }
}

/**
 * Updates remote player positions with linear interpolation
 * @param {number} dt 
 */
export function updateRemotePlayers(dt) {
  if (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') return;
  for (const key in state.multiPlayers) {
    const opp = state.multiPlayers[key];
    if (!opp || !opp.obj || !opp.alive) continue;
    if (opp.targetPos) {
      opp.pos.lerp(opp.targetPos, dt * 16);
    }
    opp.y = THREE.MathUtils.lerp(opp.y || 0, opp.targetY || 0, dt * 16);
    opp.obj.position.copy(opp.pos);
    opp.obj.position.y = opp.y;
    opp.yaw = THREE.MathUtils.lerp(
      opp.yaw !== undefined ? opp.yaw : opp.obj.rotation.y,
      opp.targetYaw,
      dt * 14
    );
    opp.obj.rotation.y = opp.yaw;
    if (opp.obj.userData && opp.obj.userData.backDisc) {
      opp.obj.userData.backDisc.visible = opp.hasDisc;
      if (opp.blocking && opp.hasDisc) {
        opp.obj.userData.backDisc.position.set(-0.06, -0.15, 0.22);
        opp.obj.userData.backDisc.rotation.set(0.65, 0.35, 0);
      } else {
        opp.obj.userData.backDisc.position.set(0.04, -0.28, 0.02);
        opp.obj.userData.backDisc.rotation.set(0, Math.PI / 2, 0);
      }
    }
  }
}
