/**
 * webrtcPeer.js - Peer-to-Peer WebRTC DataChannel Manager for Arc League
 * 
 * Provides low-latency, zero-server UDP-like data transport between peers:
 * - Unreliable / unordered DataChannel for 30-60 Hz player kinematics
 * - Reliable / ordered DataChannel for discrete combat events (throws, parries, damage)
 * - Automatic STUN candidate gathering and ICE lifecycle management
 * - Headless mock adapter for automated test runners
 */

export const DEFAULT_RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export class WebRTCPeer {
  /**
   * @param {Object} options
   * @param {boolean} options.isHost - Whether this peer acts as host (offer creator)
   * @param {Function} [options.onFastMessage] - Callback for kinematic packets (x, y, z, yaw, pitch)
   * @param {Function} [options.onReliableMessage] - Callback for discrete match events (throw, hit, tiles)
   * @param {Function} [options.onConnectionChange] - Callback when connection status changes ('connecting', 'connected', 'disconnected', 'failed')
   * @param {Function} [options.onLocalCandidate] - Callback when a local ICE candidate is gathered
   * @param {Object} [options.rtcConfig] - Optional RTCPeerConnection configuration
   * @param {boolean} [options.isMock] - Force mock mode for Node.js unit tests
   */
  constructor(options = {}) {
    this.isHost = !!options.isHost;
    this.onFastMessage = options.onFastMessage || (() => {});
    this.onReliableMessage = options.onReliableMessage || (() => {});
    this.onConnectionChange = options.onConnectionChange || (() => {});
    this.onLocalCandidate = options.onLocalCandidate || (() => {});
    this.rtcConfig = options.rtcConfig || DEFAULT_RTC_CONFIG;

    this.connectionState = 'idle'; // 'idle' | 'connecting' | 'connected' | 'closed' | 'failed'
    this.peerConnection = null;
    this.fastChannel = null;
    this.reliableChannel = null;
    this.pendingCandidates = [];

    this.isMock = options.isMock || (typeof RTCPeerConnection === 'undefined');
    if (this.isMock) {
      this._initMock();
    } else {
      this._initReal();
    }
  }

  _initReal() {
    try {
      this.peerConnection = new RTCPeerConnection(this.rtcConfig);

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.onLocalCandidate(event.candidate.toJSON ? event.candidate.toJSON() : event.candidate);
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection.connectionState;
        this._updateState(state);
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection.iceConnectionState;
        if (state === 'failed' || state === 'disconnected') {
          this._updateState(state);
        }
      };

      if (this.isHost) {
        // Host creates both channels
        this.fastChannel = this.peerConnection.createDataChannel('arc_kinematics', {
          ordered: false,
          maxRetransmits: 0
        });
        this._setupChannel(this.fastChannel, 'fast');

        this.reliableChannel = this.peerConnection.createDataChannel('arc_events', {
          ordered: true
        });
        this._setupChannel(this.reliableChannel, 'reliable');
      } else {
        // Guest receives channels from host
        this.peerConnection.ondatachannel = (event) => {
          const ch = event.channel;
          if (ch.label === 'arc_kinematics') {
            this.fastChannel = ch;
            this._setupChannel(ch, 'fast');
          } else if (ch.label === 'arc_events') {
            this.reliableChannel = ch;
            this._setupChannel(ch, 'reliable');
          }
        };
      }
    } catch (err) {
      console.warn('WebRTCPeer real initialization failed, falling back to mock:', err);
      this._initMock();
    }
  }

  _setupChannel(channel, type) {
    channel.onopen = () => {
      if (this._bothChannelsOpen()) {
        this._updateState('connected');
      }
    };

    channel.onclose = () => {
      this._updateState('disconnected');
    };

    channel.onerror = (err) => {
      console.warn(`WebRTCPeer channel [${type}] error:`, err);
    };

    channel.onmessage = (event) => {
      try {
        const parsed = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (type === 'fast') {
          this.onFastMessage(parsed);
        } else {
          this.onReliableMessage(parsed);
        }
      } catch (err) {
        console.warn(`Error parsing WebRTC [${type}] payload:`, err);
      }
    };
  }

  _bothChannelsOpen() {
    return (
      this.fastChannel &&
      this.fastChannel.readyState === 'open' &&
      this.reliableChannel &&
      this.reliableChannel.readyState === 'open'
    );
  }

  _updateState(state) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.onConnectionChange(state);
    }
  }

  /**
   * Generates a local SDP offer (Host only)
   * @returns {Promise<Object>} SDP offer object
   */
  async createOffer() {
    if (this.isMock) {
      return this._mockCreateOffer();
    }
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return this.peerConnection.localDescription;
  }

  /**
   * Accepts remote offer and generates a local SDP answer (Guest only)
   * @param {Object} offer - Remote SDP offer
   * @returns {Promise<Object>} SDP answer object
   */
  async createAnswer(offer) {
    if (this.isMock) {
      return this._mockCreateAnswer(offer);
    }
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    this._flushPendingCandidates();
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return this.peerConnection.localDescription;
  }

  /**
   * Completes the handshake by setting the remote answer (Host only)
   * @param {Object} answer - Remote SDP answer
   */
  async setAnswer(answer) {
    if (this.isMock) {
      return this._mockSetAnswer(answer);
    }
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    this._flushPendingCandidates();
  }

  /**
   * Adds a gathered ICE candidate from the remote peer
   * @param {Object} candidate - RTCIceCandidate descriptor
   */
  async addIceCandidate(candidate) {
    if (!candidate) return;
    if (this.isMock) {
      return;
    }
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('Failed to add remote ICE candidate:', err);
    }
  }

  _flushPendingCandidates() {
    while (this.pendingCandidates.length > 0) {
      const c = this.pendingCandidates.shift();
      this.addIceCandidate(c);
    }
  }

  /**
   * Transmits high-frequency kinematics data over the fast unordered channel
   * @param {Object} data 
   * @returns {boolean} Whether transmission was queued
   */
  sendFast(data) {
    if (this.isMock) {
      return this._mockSend('fast', data);
    }
    if (this.fastChannel && this.fastChannel.readyState === 'open') {
      this.fastChannel.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }

  /**
   * Transmits discrete, ordered match events over the reliable channel
   * @param {Object} data 
   * @returns {boolean} Whether transmission was dispatched
   */
  sendReliable(data) {
    if (this.isMock) {
      return this._mockSend('reliable', data);
    }
    if (this.reliableChannel && this.reliableChannel.readyState === 'open') {
      this.reliableChannel.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }

  close() {
    this._updateState('closed');
    if (this.fastChannel) {
      try { this.fastChannel.close(); } catch (_) {}
      this.fastChannel = null;
    }
    if (this.reliableChannel) {
      try { this.reliableChannel.close(); } catch (_) {}
      this.reliableChannel = null;
    }
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (_) {}
      this.peerConnection = null;
    }
    if (this._mockChannel) {
      try { this._mockChannel.close(); } catch (_) {}
      this._mockChannel = null;
    }
  }

  // --------------------------------------------------------------------------
  // Headless Mock Mode (For Node.js Unit Testing & Offline Emulation)
  // --------------------------------------------------------------------------
  _initMock() {
    this._mockPeer = null;
    this.connectionState = 'connecting';
  }

  connectMockPeer(otherPeer) {
    this._mockPeer = otherPeer;
    otherPeer._mockPeer = this;
    this._updateState('connected');
    otherPeer._updateState('connected');
  }

  _mockCreateOffer() {
    return Promise.resolve({ type: 'offer', sdp: 'mock_offer_sdp' });
  }

  _mockCreateAnswer(offer) {
    return Promise.resolve({ type: 'answer', sdp: 'mock_answer_sdp' });
  }

  _mockSetAnswer(answer) {
    return Promise.resolve();
  }

  _mockSend(type, data) {
    if (this.connectionState !== 'connected') {
      return false;
    }
    if (this._mockPeer && this._mockPeer.connectionState === 'connected') {
      const copy = JSON.parse(JSON.stringify(data));
      if (type === 'fast') {
        this._mockPeer.onFastMessage(copy);
      } else {
        this._mockPeer.onReliableMessage(copy);
      }
      return true;
    }
    return false;
  }
}
