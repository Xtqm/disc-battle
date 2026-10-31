/**
 * desktop/steam.cjs - Safe Steamworks SDK Integration Subsystem
 *
 * Provides a resilient wrapper around steamworks.js.
 * Degrades safely to a no-op state without throwing errors when
 * Steam is uninstalled, offline, or running in an unsupported environment.
 */

let steamworks = null;
let client = null;
let isInitialized = false;
let currentAppId = null;

/**
 * Attempt to initialize the Steamworks client.
 * @param {number} [targetAppId] - Explicit App ID to use, defaults to env or 480 (Spacewar).
 * @returns {{ success: boolean, initialized?: boolean, appId?: number, personaName?: string, reason?: string }}
 */
function initSteam(targetAppId) {
  if (isInitialized && client) {
    return {
      success: true,
      initialized: true,
      appId: currentAppId,
      personaName: getPersonaName()
    };
  }

  try {
    steamworks = require('steamworks.js');
  } catch (err) {
    console.warn('[Steamworks] steamworks.js native module not available:', err.message);
    return { success: false, reason: 'Module not found: ' + err.message };
  }

  const resolvedAppId = process.env.STEAM_APP_ID
    ? parseInt(process.env.STEAM_APP_ID, 10)
    : (targetAppId || 480);

  try {
    client = steamworks.init(resolvedAppId);
    isInitialized = true;
    currentAppId = resolvedAppId;
    const persona = getPersonaName();
    console.log(`[Steamworks] Initialized successfully for App ID ${resolvedAppId}. Player: ${persona || 'Unknown'}`);
    return {
      success: true,
      initialized: true,
      appId: resolvedAppId,
      personaName: persona
    };
  } catch (err) {
    console.warn(`[Steamworks] Steam client initialization skipped (${err.message}). Safe offline mode enabled.`);
    isInitialized = false;
    client = null;
    return {
      success: false,
      reason: err.message
    };
  }
}

/**
 * Configure Chromium command line flags for Steam Overlay if supported.
 * Must be invoked prior to Electron app ready.
 */
function enableSteamOverlay() {
  try {
    if (!steamworks) {
      steamworks = require('steamworks.js');
    }
    if (steamworks && typeof steamworks.electronEnableSteamOverlay === 'function') {
      steamworks.electronEnableSteamOverlay();
    }
  } catch (_) {}
}

/**
 * Retrieve the current Steam persona name if connected.
 * @returns {string|null}
 */
function getPersonaName() {
  if (!isInitialized || !client) return null;
  try {
    return client.localplayer?.getName?.() || null;
  } catch (_) {
    return null;
  }
}

/**
 * Activate/unlock a Steam achievement by its identifier.
 * @param {string} achievementId - Steam API achievement name (e.g. 'ach_first_blood')
 * @returns {{ success: boolean, activated?: boolean, reason?: string }}
 */
function unlockAchievement(achievementId) {
  if (!isInitialized || !client) {
    return { success: false, reason: 'Steam not initialized' };
  }
  try {
    if (client.achievement && typeof client.achievement.activate === 'function') {
      const activated = client.achievement.activate(achievementId);
      console.log(`[Steamworks] Achievement '${achievementId}' activated:`, activated);
      return { success: true, activated };
    }
    return { success: false, reason: 'Achievement API unavailable' };
  } catch (err) {
    console.warn(`[Steamworks] Could not activate achievement '${achievementId}':`, err.message);
    return { success: false, reason: err.message };
  }
}

/**
 * Set a Steam Rich Presence key-value pair.
 * @param {string} key - Rich Presence key (e.g. 'steam_display', 'status')
 * @param {string} value - Contextual activity string
 * @returns {{ success: boolean, reason?: string }}
 */
function setRichPresence(key, value) {
  if (!isInitialized || !client) {
    return { success: false, reason: 'Steam not initialized' };
  }
  try {
    if (client.localplayer && typeof client.localplayer.setRichPresence === 'function') {
      client.localplayer.setRichPresence(key, value);
      return { success: true };
    }
    return { success: false, reason: 'Localplayer Rich Presence API unavailable' };
  } catch (err) {
    console.warn(`[Steamworks] Failed to set rich presence key '${key}':`, err.message);
    return { success: false, reason: err.message };
  }
}

/**
 * Retrieve current Steamworks connection status.
 */
function getStatus() {
  return {
    isInitialized,
    appId: currentAppId,
    personaName: getPersonaName()
  };
}

module.exports = {
  initSteam,
  enableSteamOverlay,
  unlockAchievement,
  setRichPresence,
  getStatus
};
