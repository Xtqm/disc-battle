/**
 * signalingBridge.js - Ephemeral Peer Signaling for WebRTC Negotiation
 * 
 * Exclusively handles out-of-band signaling (SDP offer/answer, ICE candidates, room presence)
 * using Supabase Realtime broadcast channels (zero database writes) with fallback to
 * local BroadcastChannel for offline / multi-tab / unit testing.
 */

import { resolveSupabaseConfig } from '../auth/SupabaseAuthProvider.js';

export class SignalingBridge {
  /**
   * @param {Object} options
   * @param {string} options.peerId - Unique identifier for the local peer
   * @param {string} [options.roomCode] - Specific room identifier or 'matchmaking_pool'
   * @param {Object} [options.supabaseClient] - Optional injected Supabase client instance
   * @param {Function} [options.onOffer] - (offer, senderId) => {}
   * @param {Function} [options.onAnswer] - (answer, senderId) => {}
   * @param {Function} [options.onCandidate] - (candidate, senderId) => {}
   * @param {Function} [options.onPeerJoined] - (peerId, meta) => {}
   * @param {Function} [options.onPeerLeft] - (peerId) => {}
   */
  constructor(options = {}) {
    this.peerId = options.peerId || 'peer_' + Math.random().toString(36).substring(2, 9);
    this.roomCode = options.roomCode || 'global';
    this.supabaseClient = options.supabaseClient || null;

    this.onOffer = options.onOffer || (() => {});
    this.onAnswer = options.onAnswer || (() => {});
    this.onCandidate = options.onCandidate || (() => {});
    this.onPeerJoined = options.onPeerJoined || (() => {});
    this.onPeerLeft = options.onPeerLeft || (() => {});

    this.channel = null;
    this.mockChannel = null;
    this.isSubscribed = false;
  }

  /**
   * Connects to the signaling channel for the specified room code
   * @param {string} [roomCode]
   */
  async connect(roomCode) {
    if (roomCode) {
      this.roomCode = roomCode;
    }
    const channelName = `arc_signal_${this.roomCode}`;

    if (this.supabaseClient && typeof this.supabaseClient.channel === 'function') {
      try {
        this.channel = this.supabaseClient.channel(channelName, {
          config: { broadcast: { self: false } }
        });

        this.channel
          .on('broadcast', { event: 'signal' }, (payload) => {
            this._handleSignalPacket(payload.payload || payload);
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              this.isSubscribed = true;
              this.sendPresence({ joined: true });
            }
          });
      } catch (err) {
        console.warn('Supabase Realtime signaling connection failed, falling back to mock:', err);
        this._initMockChannel(channelName);
      }
    } else {
      this._initMockChannel(channelName);
    }
  }

  _initMockChannel(channelName) {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.mockChannel = new BroadcastChannel(channelName);
        this.mockChannel.onmessage = (event) => {
          if (event.data) {
            this._handleSignalPacket(event.data);
          }
        };
        this.isSubscribed = true;
        this.sendPresence({ joined: true });
      } catch (_) {
        this.isSubscribed = true;
      }
    } else {
      this.isSubscribed = true;
    }
  }

  _handleSignalPacket(packet) {
    if (!packet || packet.senderId === this.peerId) return;

    // Direct routing: if target is specified, ignore if not meant for us
    if (packet.targetId && packet.targetId !== this.peerId) return;

    switch (packet.type) {
      case 'offer':
        this.onOffer(packet.payload, packet.senderId);
        break;
      case 'answer':
        this.onAnswer(packet.payload, packet.senderId);
        break;
      case 'candidate':
        this.onCandidate(packet.payload, packet.senderId);
        break;
      case 'presence':
        if (packet.payload && packet.payload.joined) {
          this.onPeerJoined(packet.senderId, packet.payload);
        } else if (packet.payload && packet.payload.left) {
          this.onPeerLeft(packet.senderId);
        }
        break;
      default:
        break;
    }
  }

  _dispatch(type, payload, targetId = null) {
    const packet = {
      type,
      senderId: this.peerId,
      targetId,
      payload,
      timestamp: Date.now()
    };

    if (this.channel && this.isSubscribed && typeof this.channel.send === 'function') {
      this.channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: packet
      }).catch(err => console.warn('Signaling broadcast error:', err));
    }

    if (this.mockChannel) {
      this.mockChannel.postMessage(packet);
    }
  }

  sendOffer(offer, targetId) {
    this._dispatch('offer', offer, targetId);
  }

  sendAnswer(answer, targetId) {
    this._dispatch('answer', answer, targetId);
  }

  sendCandidate(candidate, targetId) {
    this._dispatch('candidate', candidate, targetId);
  }

  sendPresence(meta = {}) {
    this._dispatch('presence', meta);
  }

  disconnect() {
    this.sendPresence({ left: true });
    this.isSubscribed = false;

    if (this.channel && typeof this.channel.unsubscribe === 'function') {
      try { this.channel.unsubscribe(); } catch (_) {}
      this.channel = null;
    }

    if (this.mockChannel) {
      try { this.mockChannel.close(); } catch (_) {}
      this.mockChannel = null;
    }
  }
}
