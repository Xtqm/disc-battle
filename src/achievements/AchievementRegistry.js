/**
 * AchievementRegistry.js
 * Authoritative Launch Achievement Matrix & Progress Evaluation Engine
 * for Tron Disc Arena (SPEC-ACHIEVE-001).
 */

export const ACHIEVEMENT_CATEGORIES = Object.freeze({
  COMBAT: 'combat',
  CAMPAIGN: 'campaign',
  SURVIVAL: 'survival'
});

export const GRID_01_LEVEL_IDS = Object.freeze([
  'level_01_01',
  'level_01_02',
  'level_01_03',
  'level_01_04',
  'level_01_05',
  'level_01_06'
]);

/**
 * Launch matrix achievement definitions.
 */
export const LAUNCH_ACHIEVEMENTS = Object.freeze([
  Object.freeze({
    id: 'ach_first_blood',
    title: 'Initial Execution',
    description: 'De-rez first hostile program',
    category: ACHIEVEMENT_CATEGORIES.COMBAT,
    icon: '⚡',
    target: 1,
    metricKey: 'stats.totalDerezzes',
    reward: Object.freeze({
      bits: 100,
      cosmetic: null
    }),
    evaluate: (state) => {
      const current = Number(state?.stats?.totalDerezzes || 0);
      const target = 1;
      return {
        current,
        target,
        ratio: Math.min(1, current / target),
        satisfied: current >= target
      };
    }
  }),

  Object.freeze({
    id: 'ach_curve_god',
    title: 'Geometric Curved Path',
    description: 'Eliminate 25 hostiles with curving disc shots',
    category: ACHIEVEMENT_CATEGORIES.COMBAT,
    icon: '🌀',
    target: 25,
    metricKey: 'stats.curveEliminations',
    reward: Object.freeze({
      bits: 300,
      cosmetic: null
    }),
    evaluate: (state) => {
      const current = Number(state?.stats?.curveEliminations || 0);
      const target = 25;
      return {
        current,
        target,
        ratio: Math.min(1, current / target),
        satisfied: current >= target
      };
    }
  }),

  Object.freeze({
    id: 'ach_parry_king',
    title: 'Deflective Protocol',
    description: 'Parry 50 incoming enemy discs',
    category: ACHIEVEMENT_CATEGORIES.COMBAT,
    icon: '🛡️',
    target: 50,
    metricKey: 'stats.parriesExecuted',
    reward: Object.freeze({
      bits: 250,
      cosmetic: null
    }),
    evaluate: (state) => {
      const current = Number(state?.stats?.parriesExecuted || 0);
      const target = 50;
      return {
        current,
        target,
        ratio: Math.min(1, current / target),
        satisfied: current >= target
      };
    }
  }),

  Object.freeze({
    id: 'ach_untouchable',
    title: 'Flawless Subroutine',
    description: 'Complete any Grid trial with 100% integrity',
    category: ACHIEVEMENT_CATEGORIES.CAMPAIGN,
    icon: '💎',
    target: 1,
    metricKey: 'campaign.levelRecords',
    reward: Object.freeze({
      bits: 500,
      cosmetic: null
    }),
    evaluate: (state) => {
      const records = state?.campaign?.levelRecords || {};
      let flawlessCount = 0;
      for (const key of Object.keys(records)) {
        const rec = records[key];
        if (rec && rec.completed && (Number(rec.bestIntegrity || 0) >= 1.0 || Number(rec.finalIntegrity || 0) >= 1.0)) {
          flawlessCount++;
        }
      }
      const target = 1;
      const satisfied = flawlessCount >= target;
      return {
        current: Math.min(target, flawlessCount),
        target,
        ratio: satisfied ? 1 : 0,
        satisfied
      };
    }
  }),

  Object.freeze({
    id: 'ach_swarm_survivor',
    title: 'Endless Firewall',
    description: 'Survive 15 consecutive waves in Swarm Defense',
    category: ACHIEVEMENT_CATEGORIES.SURVIVAL,
    icon: '🔥',
    target: 15,
    metricKey: 'stats.swarmHighestWave',
    reward: Object.freeze({
      bits: 750,
      cosmetic: Object.freeze({
        category: 'discSkins',
        itemId: 'disc_corrupted_void',
        displayName: 'Corrupted Void'
      })
    }),
    evaluate: (state) => {
      const current = Math.max(
        Number(state?.stats?.swarmHighestWave || 0),
        Number(state?.stats?.highestWave || 0)
      );
      const target = 15;
      return {
        current,
        target,
        ratio: Math.min(1, current / target),
        satisfied: current >= target
      };
    }
  }),

  Object.freeze({
    id: 'ach_grid_one_master',
    title: 'Outlands Conqueror',
    description: 'Earn all 18 stars across Grid 01',
    category: ACHIEVEMENT_CATEGORIES.CAMPAIGN,
    icon: '👑',
    target: 18,
    metricKey: 'campaign.levelRecords',
    reward: Object.freeze({
      bits: 1000,
      cosmetic: Object.freeze({
        category: 'chassisSkins',
        itemId: 'chassis_arbiter',
        displayName: 'Sovereign Arbiter'
      })
    }),
    evaluate: (state) => {
      const records = state?.campaign?.levelRecords || {};
      let stars = 0;
      for (const levelId of GRID_01_LEVEL_IDS) {
        const record = records[levelId];
        if (record && typeof record.stars === 'number') {
          stars += record.stars;
        }
      }
      const target = 18;
      return {
        current: stars,
        target,
        ratio: Math.min(1, stars / target),
        satisfied: stars >= target
      };
    }
  })
]);

/**
 * Key-indexed map for constant-time lookup.
 */
export const ACHIEVEMENT_MAP = Object.freeze(
  LAUNCH_ACHIEVEMENTS.reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {})
);

/**
 * Retrieves a single achievement definition by ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getAchievement(id) {
  if (!id || typeof id !== 'string') return null;
  return ACHIEVEMENT_MAP[id] || null;
}

/**
 * Returns all registered achievement definitions.
 * @returns {Array<object>}
 */
export function getAllAchievements() {
  return [...LAUNCH_ACHIEVEMENTS];
}

/**
 * Returns achievement definitions filtered by category.
 * @param {string} category
 * @returns {Array<object>}
 */
export function getAchievementsByCategory(category) {
  if (!category || typeof category !== 'string') return [];
  return LAUNCH_ACHIEVEMENTS.filter((item) => item.category === category);
}

/**
 * Evaluates progress of an achievement against a given save state.
 * @param {string} achievementId
 * @param {object} saveState
 * @returns {{ current: number, target: number, ratio: number, satisfied: boolean }}
 */
export function calculateProgress(achievementId, saveState) {
  const ach = getAchievement(achievementId);
  if (!ach || typeof ach.evaluate !== 'function') {
    return { current: 0, target: 1, ratio: 0, satisfied: false };
  }
  return ach.evaluate(saveState);
}
