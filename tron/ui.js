import * as THREE from './vendor/three.module.js';
import { state, player } from './state.js';
import { config } from './config.js';
import { renderer, scene, camera, checkOrientation, key, d, floor, grid, ring, tiles, tileGeo, tileEdgeGeo, tileMatIntact, tileEdgeMatIntact, tileGroup, worldToTile, tileToWorld, getTileAt, findNearestIntactTile, wallMat, glowMat, pillars, pillarSpots, tmp, _discMat, _fwd, _r0, _u0, _uBank, _rBank, _localX, _localY, _duelToP, _duelSide, _duelWant, _duelSafe, _duelCoverDir, _duelLead, _duelAimDir, _duelOrigin, _duelEvade, makeProgram, discGeo, makeDisc, sparks, burst, triggerTileWarning, spawnTileDeRezSparks, updateTiles, getPillarCoverPoint, findBestCoverPillar, updateDuelFoe } from './graphics.js';
import { getAudioCtx, playDeRezSound, playWarningSound, playTileDropSound } from './audio.js';
import { simulatePath, trajLine, bouncePips, impactMark, threatLines, updateThreatPaths, updateTrajectory, resolveCircle, lineOfSight } from './physics.js';
import { mockStore, mockListeners, initMockNetwork, mockDocRef, mockSetDoc, mockGetDoc, mockUpdateDoc, mockOnSnapshot, initNetwork, getRoomRef, roomSetDoc, roomGetDoc, roomUpdateDoc, roomOnSnapshot, generateRoomCode, copyRoomCode, showHostWaitingModal, showJoinInputModal, onClickCreateRoom, onClickConfirmJoin, startMultiplayerDuel, onRoomSnapshot, syncNetworkState, onTileDestabilizedByHost, renderGameOverActions, bindGameOverActions, showMultiplayerVictory, showMultiplayerDefeat, teardownMultiplayer } from './network.js';
import { EAT, getPlayerCurveIntent, codeOf, onDown, onUp, canvas, overlay, startMode, startGame, pauseGame, resumeGame, restartMatch, showModeSelect, getMainMenuHtml, showModeSelectMenu, bindMainMenuEvents, pauseBtn, onPauseClick, resumeBtn, onResumeClick, restartBtn, onRestartClick, modeSelectBtn, onModeSelectClick, btnCopyCode, btnConfirmJoin, btnCancelRoom, joinRoomInput, tryLock, setCursor, focusGame, isLocked, look, showSens, moveStartPos, touchMove, lookLastPos, joyBase, joyThumb, R_STICK, showJoystick, updateJoystick, hideJoystick, updateCurveButtons, onTouchStart, onTouchMove, onTouchEnd, bindMobileButtons } from './input.js';
import { updateHUD, resetGame, spawnDuelBoss, spawnWave, throwDisc, _ro, aimTarget, aimDir, spawnDisc, damagePlayer, killFoe } from './entities.js';
import { clock, update, loop } from './main.js';

export const el = id => document.getElementById(id);
export const msgEl = el('msg');
state.msgT = 0;
export function message(t) {
  msgEl.textContent = t;
  msgEl.style.opacity = 1;
  state.msgT = 2;
  if (t === 'SURFACE COLLAPSE — JUMP / DASH!') {
    msgEl.style.color = 'var(--orange)';
    msgEl.style.textShadow = '0 0 28px var(--orange), 0 0 10px #ffffff';
  } else if (t === 'RIVAL CAUGHT DISC!' || t === 'RIVAL COUNTER-CATCH!') {
    msgEl.style.color = 'var(--orange)';
    msgEl.style.textShadow = '0 0 28px var(--orange), 0 0 10px #ffffff';
  } else if (t === 'DEFLECTED!') {
    msgEl.style.color = '#ffffff';
    msgEl.style.textShadow = '0 0 24px var(--cyan), 0 0 8px #ffffff';
  } else {
    msgEl.style.color = 'var(--cyan)';
    msgEl.style.textShadow = '0 0 22px var(--cyan)';
  }
}

export function showGameOver() {
  overlay.style.display = 'flex';
  const title = state.gameMode === 'duel' ? 'DUEL ELIMINATED' : 'DEREZZED';
  const subtitle = state.gameOverReason || 'YOUR DISC WAS CLAIMED';
  const stats = state.gameMode === 'duel'
    ? `TIERS CLEARED <b style="color:#fff">${duelTier - 1}</b> &nbsp;·&nbsp; SCORE <b style="color:#fff">${score}</b>`
    : `CYCLES SURVIVED <b style="color:#fff">${wave - 1}</b> &nbsp;·&nbsp; SCORE <b style="color:#fff">${score}</b>`;
  overlay.innerHTML = `<div class="card dead">
    <h1>${title}</h1>
    <h2>${subtitle}</h2>
    <div style="font-size:15px;letter-spacing:4px;margin-bottom:26px">
      ${stats}
    </div>
    <div class="menu-actions" style="max-width:320px;margin:0 auto">
      <button id="recompileBtn" class="btn">RE-COMPILE (${gameMode.toUpperCase()})</button>
      <button id="returnMenuBtn" class="btn" style="border-color:var(--orange);color:#ffb37a">MODE SELECT</button>
    </div>
  </div>`;
  const rc = el('recompileBtn');
  if (rc) rc.onclick = (e) => {
    e.stopPropagation();
    state.player.obj.visible = true;
    overlay.style.display = 'none';
    resetGame();
    state.paused = false;
    state.justResumed = true;
    tryLock();
    focusGame();
  };
  const rm = el('returnMenuBtn');
  if (rm) rm.onclick = (e) => {
    e.stopPropagation();
    state.player.obj.visible = true;
    showModeSelectMenu();
  };
  state.gameOverT = 1;
}

// camera shake
state.shakeAmt = 0;
export function shake(v) { state.shakeAmt = Math.min(state.shakeAmt + v, .8); }
