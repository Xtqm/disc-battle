/**
 * CloudSyncResolver.js
 * Implements the "Master Grid Protocol" for strictly monotonic cloud save synchronization.
 * Guarantees that progress (bits, levels, star mastery, inventory, achievements)
 * is non-decreasing across all devices and sessions.
 */

/**
 * Normalizes state object into standard save schema with default values.
 * @param {object|null} state
 * @returns {object}
 */
export function normalizeSaveState(state = {}) {
  const s = state || {};
  const stats = s.stats || {};
  const settings = s.settings || {};

  return {
    version: s.version || 1,
    userId: s.userId || '',
    handle: s.handle || 'PROGRAM',
    createdAt: s.createdAt || Date.now(),
    lastActiveAt: s.lastActiveAt || Date.now(),
    bits: Math.max(0, Number(s.bits || 0)),
    level: Math.max(1, Number(s.level || 1)),
    starMastery: { ...(s.starMastery || {}) },
    inventory: Array.isArray(s.inventory) ? Array.from(new Set(s.inventory)) : ['disc_default'],
    achievements: Array.isArray(s.achievements) ? Array.from(new Set(s.achievements)) : [],
    stats: {
      matchesPlayed: Math.max(0, Number(stats.matchesPlayed || 0)),
      wins: Math.max(0, Number(stats.wins || 0)),
      highestWave: Math.max(1, Number(stats.highestWave || 1)),
      highestTier: Math.max(1, Number(stats.highestTier || 1)),
      totalScore: Math.max(0, Number(stats.totalScore || 0))
    },
    settings: {
      sens: typeof settings.sens === 'number' ? settings.sens : 0.0022,
      invertY: typeof settings.invertY === 'boolean' ? settings.invertY : false
    }
  };
}

/**
 * Merges StarMastery dictionaries by taking the maximum star count per level.
 * @param {Record<string|number, number>} localStars
 * @param {Record<string|number, number>} cloudStars
 * @returns {Record<string|number, number>}
 */
export function mergeStarMastery(localStars = {}, cloudStars = {}) {
  const merged = {};
  const allKeys = new Set([
    ...Object.keys(localStars || {}),
    ...Object.keys(cloudStars || {})
  ]);

  for (const key of allKeys) {
    const localVal = Number((localStars && localStars[key]) || 0);
    const cloudVal = Number((cloudStars && cloudStars[key]) || 0);
    merged[key] = Math.max(localVal, cloudVal);
  }

  return merged;
}

/**
 * Merges array collections via mathematical set union.
 * @param {string[]} localList
 * @param {string[]} cloudList
 * @returns {string[]}
 */
export function mergeSetUnion(localList = [], cloudList = []) {
  const set = new Set([
    ...(Array.isArray(localList) ? localList : []),
    ...(Array.isArray(cloudList) ? cloudList : [])
  ]);
  return Array.from(set);
}

/**
 * Validates that candidateState is strictly monotonic relative to baselineState.
 * Returns an array of violations (empty array if valid).
 * @param {object} candidate
 * @param {object} baseline
 * @param {string} baselineName ('Local' | 'Cloud')
 * @returns {string[]}
 */
export function evaluateMonotonicInvariants(candidate, baseline, baselineName = 'Baseline') {
  const violations = [];

  if (candidate.bits < baseline.bits) {
    violations.push(`Bits decreased: ${candidate.bits} < ${baselineName}.bits (${baseline.bits})`);
  }

  if (candidate.level < baseline.level) {
    violations.push(`Level decreased: ${candidate.level} < ${baselineName}.level (${baseline.level})`);
  }

  // Star mastery checks
  for (const [lvl, stars] of Object.entries(baseline.starMastery || {})) {
    const candidateStars = candidate.starMastery?.[lvl] || 0;
    if (candidateStars < stars) {
      violations.push(`StarMastery decreased on level ${lvl}: ${candidateStars} < ${baselineName}.stars (${stars})`);
    }
  }

  // Inventory set inclusion checks
  const candidateInventory = new Set(candidate.inventory || []);
  for (const item of (baseline.inventory || [])) {
    if (!candidateInventory.has(item)) {
      violations.push(`Inventory item missing: "${item}" was revoked from ${baselineName}`);
    }
  }

  // Achievements set inclusion checks
  const candidateAchievements = new Set(candidate.achievements || []);
  for (const ach of (baseline.achievements || [])) {
    if (!candidateAchievements.has(ach)) {
      violations.push(`Achievement missing: "${ach}" was revoked from ${baselineName}`);
    }
  }

  // Cumulative stats checks
  if (candidate.stats.matchesPlayed < baseline.stats.matchesPlayed) {
    violations.push(`Matches played decreased: ${candidate.stats.matchesPlayed} < ${baselineName} (${baseline.stats.matchesPlayed})`);
  }
  if (candidate.stats.wins < baseline.stats.wins) {
    violations.push(`Wins decreased: ${candidate.stats.wins} < ${baselineName} (${baseline.stats.wins})`);
  }
  if (candidate.stats.highestWave < baseline.stats.highestWave) {
    violations.push(`Highest wave decreased: ${candidate.stats.highestWave} < ${baselineName} (${baseline.stats.highestWave})`);
  }
  if (candidate.stats.highestTier < baseline.stats.highestTier) {
    violations.push(`Highest tier decreased: ${candidate.stats.highestTier} < ${baselineName} (${baseline.stats.highestTier})`);
  }
  if (candidate.stats.totalScore < baseline.stats.totalScore) {
    violations.push(`Total score decreased: ${candidate.stats.totalScore} < ${baselineName} (${baseline.stats.totalScore})`);
  }

  return violations;
}

/**
 * CloudSyncResolver - Executes the Master Grid Protocol merge.
 */
export class CloudSyncResolver {
  /**
   * Merges local and cloud save states using monotonic rules.
   * @param {object|null} localInput
   * @param {object|null} cloudInput
   * @returns {object} The resolved merged state
   */
  static resolve(localInput, cloudInput) {
    if (!localInput && !cloudInput) {
      return normalizeSaveState({});
    }
    if (!localInput) return normalizeSaveState(cloudInput);
    if (!cloudInput) return normalizeSaveState(localInput);

    const local = normalizeSaveState(localInput);
    const cloud = normalizeSaveState(cloudInput);

    // Master Grid Protocol:
    // Bits = max(Local, Cloud)
    const mergedBits = Math.max(local.bits, cloud.bits);

    // Level = max(Local, Cloud)
    const mergedLevel = Math.max(local.level, cloud.level);

    // StarMastery = max(Local, Cloud) per level
    const mergedStarMastery = mergeStarMastery(local.starMastery, cloud.starMastery);

    // Inventory = Local ∪ Cloud
    const mergedInventory = mergeSetUnion(local.inventory, cloud.inventory);

    // Achievements = Local ∪ Cloud
    const mergedAchievements = mergeSetUnion(local.achievements, cloud.achievements);

    // Stats = max across cumulative fields
    const mergedStats = {
      matchesPlayed: Math.max(local.stats.matchesPlayed, cloud.stats.matchesPlayed),
      wins: Math.max(local.stats.wins, cloud.stats.wins),
      highestWave: Math.max(local.stats.highestWave, cloud.stats.highestWave),
      highestTier: Math.max(local.stats.highestTier, cloud.stats.highestTier),
      totalScore: Math.max(local.stats.totalScore, cloud.stats.totalScore)
    };

    // Settings & Handle: Most recent active tab/session takes precedence
    const preferCloudMeta = (cloud.lastActiveAt || 0) > (local.lastActiveAt || 0);
    const resolvedHandle = preferCloudMeta && cloud.handle && cloud.handle !== 'PROGRAM'
      ? cloud.handle
      : (local.handle || cloud.handle || 'PROGRAM');

    const resolvedSettings = preferCloudMeta
      ? { ...local.settings, ...cloud.settings }
      : { ...cloud.settings, ...local.settings };

    const resolved = {
      version: Math.max(local.version, cloud.version),
      userId: local.userId || cloud.userId,
      handle: resolvedHandle,
      createdAt: Math.min(local.createdAt || Date.now(), cloud.createdAt || Date.now()),
      lastActiveAt: Math.max(local.lastActiveAt || 0, cloud.lastActiveAt || 0, Date.now()),
      bits: mergedBits,
      level: mergedLevel,
      starMastery: mergedStarMastery,
      inventory: mergedInventory,
      achievements: mergedAchievements,
      stats: mergedStats,
      settings: resolvedSettings
    };

    // Strictly enforce non-decreasing invariant verification
    const localViolations = evaluateMonotonicInvariants(resolved, local, 'Local');
    const cloudViolations = evaluateMonotonicInvariants(resolved, cloud, 'Cloud');
    const allViolations = [...localViolations, ...cloudViolations];

    if (allViolations.length > 0) {
      throw new Error(`Master Grid Protocol Invariant Violation: ${allViolations.join('; ')}`);
    }

    return resolved;
  }
}

/**
 * Maps camelCase TronSaveState to Postgres snake_case save_states table row.
 * @param {object} saveState
 * @returns {object}
 */
export function saveStateToRow(saveState) {
  if (!saveState) return null;
  const normalized = normalizeSaveState(saveState);
  return {
    user_id: normalized.userId,
    handle: normalized.handle,
    bits: normalized.bits,
    level: normalized.level,
    star_mastery: normalized.starMastery,
    inventory: normalized.inventory,
    achievements: normalized.achievements,
    stats: normalized.stats,
    settings: normalized.settings,
    created_at: new Date(normalized.createdAt || Date.now()).toISOString(),
    last_active_at: new Date(normalized.lastActiveAt || Date.now()).toISOString(),
    version: normalized.version
  };
}

/**
 * Maps Postgres snake_case save_states table row to camelCase TronSaveState.
 * @param {object} row
 * @returns {object}
 */
export function rowToSaveState(row) {
  if (!row) return null;
  return normalizeSaveState({
    userId: row.user_id,
    handle: row.handle || 'PROGRAM',
    bits: Number(row.bits || 0),
    level: Number(row.level || 1),
    starMastery: typeof row.star_mastery === 'object' && row.star_mastery !== null ? row.star_mastery : {},
    inventory: Array.isArray(row.inventory) ? row.inventory : ['disc_default'],
    achievements: Array.isArray(row.achievements) ? row.achievements : [],
    stats: typeof row.stats === 'object' && row.stats !== null ? row.stats : {},
    settings: typeof row.settings === 'object' && row.settings !== null ? row.settings : {},
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    lastActiveAt: row.last_active_at ? new Date(row.last_active_at).getTime() : Date.now(),
    version: Number(row.version || 1)
  });
}

/**
 * Fetches remote save state for a user from Supabase save_states table.
 * @param {string} userId
 * @param {object} client Supabase client instance
 * @returns {Promise<object|null>}
 */
export async function fetchRemoteSaveState(userId, client) {
  if (!client || typeof client.from !== 'function' || !userId) return null;
  try {
    const { data, error } = await client
      .from('save_states')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('CloudSyncResolver: fetchRemoteSaveState error:', error);
      return null;
    }
    if (!data) return null;
    return rowToSaveState(data);
  } catch (err) {
    console.warn('CloudSyncResolver: fetchRemoteSaveState exception:', err);
    return null;
  }
}

/**
 * Upserts a save state into Supabase save_states table.
 * @param {object} saveState
 * @param {object} client Supabase client instance
 * @returns {Promise<object|null>}
 */
export async function upsertRemoteSaveState(saveState, client) {
  if (!client || typeof client.from !== 'function' || !saveState || !saveState.userId) return null;
  const row = saveStateToRow(saveState);
  const { data, error } = await client
    .from('save_states')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .maybeSingle();

  if (error) {
    console.warn('CloudSyncResolver: upsertRemoteSaveState error:', error);
    throw error;
  }
  return data ? rowToSaveState(data) : saveState;
}

CloudSyncResolver.saveStateToRow = saveStateToRow;
CloudSyncResolver.rowToSaveState = rowToSaveState;
CloudSyncResolver.fetchRemote = fetchRemoteSaveState;
CloudSyncResolver.upsertRemote = upsertRemoteSaveState;
