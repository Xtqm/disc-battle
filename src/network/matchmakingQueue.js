/**
 * matchmakingQueue.js - Automated Queue & Warm-up Sparring Arena Manager
 * 
 * Manages the matchmaking state machine:
 * IDLE -> SEARCHING / SPARRING -> CONNECTING -> MATCHED
 * 
 * While searching, the player immediately enters an interactive local sparring arena
 * against an AI combatant. When a peer is located and WebRTC handshake completes,
 * the session seamlessly hot-swaps to the human challenger.
 */

import { state } from '../core/state.js';
import { WebRTCPeer } from './webrtcPeer.js';
import { SignalingBridge } from './signalingBridge.js';

let _fastPacketHandler = (data) => {
  if (!data || !data.role || !state.multiPlayers) return;
  const opp = state.multiPlayers[data.role];
  if (!opp || !data.state) return;
  if (opp.targetPos) opp.targetPos.set(data.state.x, 0, data.state.z);
  opp.targetY = data.state.y;
  opp.targetYaw = data.state.yaw;
  opp.targetPitch = data.state.pitch;
  opp.hp = data.state.hp;
  opp.blocking = data.state.blocking;
  opp.hasDisc = data.state.hasDisc;
};

export function registerFastPacketHandler(fn) {
  _fastPacketHandler = fn;
}

let _remoteThrowHandler = null;
let _remoteTileHandler = null;

export function registerMatchmakingCombatHandlers(onThrow, onTile) {
  _remoteThrowHandler = onThrow;
  _remoteTileHandler = onTile;
}

function safeMessage(txt) {
  try {
    if (typeof window !== 'undefined' && window.__arcMessage) {
      window.__arcMessage(txt);
    }
  } catch (_) {}
}

export const QUEUE_STATES = {
  IDLE: 'IDLE',
  SEARCHING: 'SEARCHING',
  SPARRING: 'SPARRING',
  CONNECTING: 'CONNECTING',
  MATCHED: 'MATCHED'
};

export class MatchmakingQueue {
  constructor() {
    this.status = QUEUE_STATES.IDLE;
    this.elapsedSeconds = 0;
    this.peerId = 'player_' + Math.random().toString(36).substring(2, 9);
    this.matchedPeerId = null;
    this.assignedRole = null;
    this.bridge = null;
    this.peer = null;
    this.onMatchSuccess = null;
    this.onStatusChange = null;
    this._interval = null;
  }

  /**
   * Enters matchmaking queue and begins background peer search
   * @param {Object} [options]
   * @param {Function} [options.onMatchSuccess] - Called when peer DataChannel is open
   * @param {Function} [options.onStatusChange] - Called when state changes
   */
  startQueue(options = {}) {
    if (this.status !== QUEUE_STATES.IDLE) return;

    this.onMatchSuccess = options.onMatchSuccess || null;
    this.onStatusChange = options.onStatusChange || null;
    this.elapsedSeconds = 0;
    this.matchedPeerId = null;
    this.assignedRole = null;

    this._setStatus(QUEUE_STATES.SEARCHING);
    state.matchmakingQueueState = QUEUE_STATES.SEARCHING;

    // Connect to global matchmaking signaling pool
    this.bridge = new SignalingBridge({
      peerId: this.peerId,
      roomCode: 'matchmaking_pool'
    });

    this.bridge.onPeerJoined = (remotePeerId) => {
      this._handleDiscoveredPeer(remotePeerId);
    };

    this.bridge.onOffer = async (offer, senderId) => {
      if (this.status === QUEUE_STATES.SEARCHING || this.status === QUEUE_STATES.SPARRING) {
        await this._handleIncomingOffer(offer, senderId);
      }
    };

    this.bridge.onAnswer = async (answer, senderId) => {
      if (this.status === QUEUE_STATES.CONNECTING && this.peer && senderId === this.matchedPeerId) {
        await this.peer.setAnswer(answer);
      }
    };

    this.bridge.onCandidate = async (candidate, senderId) => {
      if (this.peer && senderId === this.matchedPeerId) {
        await this.peer.addIceCandidate(candidate);
      }
    };

    this.bridge.connect('matchmaking_pool');

    // Timer tick for queue duration readout
    this._interval = setInterval(() => {
      this.elapsedSeconds++;
      state.queueTimer = this.elapsedSeconds;
      this._updateQueueHUD();
    }, 1000);
  }

  _setStatus(newStatus) {
    this.status = newStatus;
    state.matchmakingQueueState = newStatus;
    if (this.onStatusChange) {
      this.onStatusChange(newStatus);
    }
  }

  /**
   * Evaluates discovered peer for matchmaking handshake
   * @param {string} remotePeerId 
   */
  async _handleDiscoveredPeer(remotePeerId) {
    if (this.status !== QUEUE_STATES.SEARCHING && this.status !== QUEUE_STATES.SPARRING) return;
    if (remotePeerId === this.peerId) return;

    // Deterministic host selection: lexicographically smaller peerId acts as Host (p1)
    const isHost = this.peerId < remotePeerId;
    if (isHost) {
      this.matchedPeerId = remotePeerId;
      this.assignedRole = 'p1';
      state.playerRole = 'p1';
      this._setStatus(QUEUE_STATES.CONNECTING);

      this._initPeerConnection(true, remotePeerId);

      try {
        const offer = await this.peer.createOffer();
        this.bridge.sendOffer(offer, remotePeerId);
      } catch (err) {
        console.warn('Error dispatching matchmaking offer:', err);
        this.cancelQueue();
      }
    }
  }

  async _handleIncomingOffer(offer, hostPeerId) {
    this.matchedPeerId = hostPeerId;
    this.assignedRole = 'p2';
    state.playerRole = 'p2';
    this._setStatus(QUEUE_STATES.CONNECTING);

    this._initPeerConnection(false, hostPeerId);

    try {
      const answer = await this.peer.createAnswer(offer);
      this.bridge.sendAnswer(answer, hostPeerId);
    } catch (err) {
      console.warn('Error answering matchmaking offer:', err);
      this.cancelQueue();
    }
  }

  _initPeerConnection(isHost, targetPeerId) {
    if (this.peer) {
      try { this.peer.close(); } catch (_) {}
    }

    this.peer = new WebRTCPeer({
      isHost,
      onLocalCandidate: (candidate) => {
        if (this.bridge && this.matchedPeerId) {
          this.bridge.sendCandidate(candidate, this.matchedPeerId);
        }
      },
      onFastMessage: (data) => {
        _fastPacketHandler(data);
      },
      onReliableMessage: (msg) => {
        if (!msg) return;
        if (msg.type === 'DISC_THROW' || msg.type === 'DISC_PARRY') {
          if (_remoteThrowHandler) _remoteThrowHandler(msg.lastThrow);
        } else if (msg.type === 'TILE_DESTABILIZED') {
          if (_remoteTileHandler) _remoteTileHandler(msg);
        }
      },
      onConnectionChange: (connState) => {
        if (connState === 'connected') {
          this._handleConnectionSuccess();
        } else if (connState === 'failed' || connState === 'disconnected') {
          if (this.status === QUEUE_STATES.CONNECTING) {
            console.warn('Peer connection failed during handshake, returning to search pool');
            this._setStatus(QUEUE_STATES.SEARCHING);
          }
        }
      }
    });

    state.webrtcPeer = this.peer;
    state.signalingBridge = this.bridge;
  }

  _handleConnectionSuccess() {
    this._setStatus(QUEUE_STATES.MATCHED);
    this._clearTimer();

    safeMessage('CHALLENGER DETECTED // COMMENCING DUEL');

    if (this.onMatchSuccess) {
      this.onMatchSuccess({
        peer: this.peer,
        role: this.assignedRole,
        opponentId: this.matchedPeerId
      });
    }
  }

  _updateQueueHUD() {
    if (typeof document === 'undefined') return;
    const banner = document.getElementById('matchmakingQueueHUD');
    if (banner) {
      const mins = Math.floor(this.elapsedSeconds / 60);
      const secs = String(this.elapsedSeconds % 60).padStart(2, '0');
      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="hud-pulse-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#00ffff;box-shadow:0 0 8px #00ffff;animation:pulse 1.2s infinite;"></span>
          <span style="font-family:'Orbitron',sans-serif;font-size:12px;letter-spacing:2px;color:#00ffff;">
            SEARCHING FOR OPPONENT // ${mins}:${secs}
          </span>
          <button id="btnCancelQueueHud" style="background:rgba(255,0,85,0.2);border:1px solid #ff0055;color:#ff0055;font-family:'Orbitron',sans-serif;font-size:10px;padding:3px 8px;cursor:pointer;letter-spacing:1px;">
            CANCEL
          </button>
        </div>
      `;
      const btn = document.getElementById('btnCancelQueueHud');
      if (btn) {
        btn.onclick = () => this.cancelQueue();
      }
    }
  }

  cancelQueue() {
    this._clearTimer();

    if (this.bridge) {
      this.bridge.disconnect();
      this.bridge = null;
    }
    if (this.peer && this.status !== QUEUE_STATES.MATCHED) {
      this.peer.close();
      this.peer = null;
    }

    this._setStatus(QUEUE_STATES.IDLE);
    state.matchmakingQueueState = QUEUE_STATES.IDLE;
    state.queueTimer = 0;

    if (typeof document !== 'undefined') {
      const banner = document.getElementById('matchmakingQueueHUD');
      if (banner) banner.style.display = 'none';
    }

    safeMessage('MATCHMAKING CANCELLED');
  }

  _clearTimer() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
}

export const matchmakingQueue = new MatchmakingQueue();
