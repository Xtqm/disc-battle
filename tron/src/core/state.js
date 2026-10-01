import * as THREE from '../../vendor/three.module.js';

export const state = {
  isTouchDevice: (typeof window !== 'undefined' && ('ontouchstart' in window)) ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches),
  orientationPaused: false,
  gameMode: 'swarm',
  tier: 1,
  duelTier: 1,
  countdownTimer: 0,
  lastCountdownSec: 0,
  fightDisplayTimer: 0,
  onCountdownEnd: null,
  foes: [],
  discs: [],
  wave: 1,
  score: 0,
  running: false,
  spawnTimer: 0,
  gameOverT: 0,
  db: null,
  auth: null,
  currentUser: null,
  currentRoomId: null,
  playerRole: null,
  roomUnsubscribe: null,
  duelOpponent: null,
  lastProcessedThrowId: null,
  roomFallenTiles: [],
  netSyncTimer: 0,
  mockChannel: null,
  multiPlayers: {},
  teammates: [],
  paused: false,
  lastPauseToggle: 0,
  justResumed: false,
  sens: 0.0022,
  invertY: false,
  steerX: 0,
  steerY: 0,
  cursorX: typeof innerWidth !== 'undefined' ? innerWidth / 2 : 0,
  cursorY: typeof innerHeight !== 'undefined' ? innerHeight / 2 : 0,
  moveTouchId: null,
  lookTouchId: null,
  lookMomentumX: 0,
  lookMomentumY: 0,
  touchJumpHeld: false,
  touchDashRequested: false,
  touchBlocking: false,
  touchCurveL: false,
  touchCurveR: false,
  gameOverReason: '',
  msgT: 0,
  shakeAmt: 0,
  time: 0,
  keys: {},
  joystick: { active: false, x: 0, y: 0, baseX: 0, baseY: 0, curX: 0, curY: 0 },
  audioCtx: null
};

export const touchState = {
  get moveId() { return state.moveTouchId; },
  set moveId(v) { state.moveTouchId = v; },
  get moveTouchId() { return state.moveTouchId; },
  set moveTouchId(v) { state.moveTouchId = v; },
  get lookId() { return state.lookTouchId; },
  set lookId(v) { state.lookTouchId = v; },
  get lookTouchId() { return state.lookTouchId; },
  set lookTouchId(v) { state.lookTouchId = v; },
  lastLookX: 0,
  lastLookY: 0,
  lookMomentumX: 0,
  lookMomentumY: 0
};

Object.defineProperty(state, 'lookMomentumX', {
  get() { return touchState.lookMomentumX; },
  set(v) { touchState.lookMomentumX = v; },
  configurable: true,
  enumerable: true
});
Object.defineProperty(state, 'lookMomentumY', {
  get() { return touchState.lookMomentumY; },
  set(v) { touchState.lookMomentumY = v; },
  configurable: true,
  enumerable: true
});

export const player = {
  obj: null,
  pos: new THREE.Vector3(0, 0, 14), 
  vel: new THREE.Vector3(),
  yaw: Math.PI, 
  pitch: -0.12, 
  hp: 100, 
  energy: 100, 
  hasDisc: true, 
  blocking: false,
  discCharge: 1, 
  dashCd: 0, 
  hurtFlash: 0, 
  alive: true,
  y: 0, 
  vy: 0, 
  grounded: true, 
  jumps: 0, 
  jumpHeld: false
};

state.player = player;
