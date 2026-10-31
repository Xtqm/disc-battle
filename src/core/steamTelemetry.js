/**
 * src/core/steamTelemetry.js
 * Steam Rich Presence Telemetry Dispatcher for Tron Disc Arena
 */

import { state } from './state.js';

let lastStatus = null;

/**
 * Directly update Steam Rich Presence status token.
 * Throttles duplicate consecutive updates and safely handles web/offline environments.
 * @param {string} statusText
 */
export function updateSteamRichPresence(statusText) {
  if (!statusText || statusText === lastStatus) return;
  lastStatus = statusText;

  if (
    typeof window !== 'undefined' &&
    window.electronDesktop &&
    typeof window.electronDesktop.steamSetRichPresence === 'function'
  ) {
    try {
      window.electronDesktop.steamSetRichPresence('status', statusText).catch(() => {});
      window.electronDesktop.steamSetRichPresence('steam_display', statusText).catch(() => {});
    } catch (_) {}
  }
}

/**
 * Updates Rich Presence dynamically derived from active game state and mode.
 */
export function syncGameStateRichPresence() {
  if (!state.running) {
    updateSteamRichPresence('In Main Menu');
    return;
  }

  if (state.paused) {
    updateSteamRichPresence('System Paused');
    return;
  }

  if (state.gameMode === 'swarm') {
    const wave = state.wave || 1;
    updateSteamRichPresence(`Swarm Arena — Cycle ${wave}`);
  } else if (state.gameMode === 'campaign') {
    const grid = state.activeGridId || '01';
    const trial = state.campaignLevelId || 'Active';
    updateSteamRichPresence(`Campaign — Grid ${grid} (${trial})`);
  } else if (state.gameMode === 'duel_ai' || state.gameMode === 'duel') {
    updateSteamRichPresence('1v1 Combat Trial');
  } else if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
    updateSteamRichPresence('Multiplayer Arena');
  } else {
    updateSteamRichPresence('In Disc Arena');
  }
}
