import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { getRoomRef, roomUpdateDoc } from './firebaseSetup.js';

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
  
  // Backwards compatibility sync
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

export function updateRemotePlayers(dt) {
  if (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi') return;
  for (const key in state.multiPlayers) {
    const opp = state.multiPlayers[key];
    if (!opp || !opp.obj || !opp.alive) continue;
    opp.pos.lerp(opp.targetPos, dt * 16);
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
        opp.obj.userData.backDisc.position.set(0, 1.75, .75);
        opp.obj.userData.backDisc.rotation.x = 0;
      } else {
        opp.obj.userData.backDisc.position.set(0, 1.8, -.45);
        opp.obj.userData.backDisc.rotation.x = Math.PI / 2;
      }
    }
  }
}
