/**
 * CampaignRegistry.js
 * Authoritative Campaign Data Registry for Tron Disc Arena (SPEC-CAMP-001).
 * Defines structured metadata for Grid 01 through Grid 04 (28 levels total),
 * cumulative Star unlock thresholds, enemy wave compositions, AI difficulty tiers,
 * Star condition thresholds, and base Bit/XP reward payouts.
 */

export const DIFFICULTY_TIERS = Object.freeze({
  RECON: 'RECON',
  INTRUDER: 'INTRUDER',
  GUARDIAN: 'GUARDIAN',
  ELITE: 'ELITE',
  ARBITER: 'ARBITER'
});

export const LEVEL_TYPES = Object.freeze({
  TRIAL: 'trial',
  ARBITER: 'arbiter'
});

/**
 * Full campaign registry defining all 4 Grids and 28 levels.
 */
export const CAMPAIGN_GRIDS = Object.freeze([
  {
    id: 'grid_01',
    name: 'Outlands Boot-Sector',
    description: 'Decommissioned periphery sectors. Basic combat routines, introductory light-cycle sector aesthetics.',
    requiredStars: 0,
    levels: [
      {
        id: 'level_01_01',
        gridId: 'grid_01',
        index: 1,
        name: 'Boot Diagnostic',
        description: 'Initialize sub-routines and neutralize roaming baseline recon programs.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.RECON,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.RECON, count: 1, hp: 50 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 45,
          minPrecisionHits: 2
        },
        payouts: {
          firstClearBits: 100,
          repeatClearBits: 25,
          firstClearXp: 150,
          repeatClearXp: 30
        }
      },
      {
        id: 'level_01_02',
        gridId: 'grid_01',
        index: 2,
        name: 'Subroutine Skirmish',
        description: 'Two recon hostiles detected probing sector boundaries.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.RECON,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.RECON, count: 2, hp: 60 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 45,
          minPrecisionHits: 2
        },
        payouts: {
          firstClearBits: 120,
          repeatClearBits: 25,
          firstClearXp: 175,
          repeatClearXp: 35
        }
      },
      {
        id: 'level_01_03',
        gridId: 'grid_01',
        index: 3,
        name: 'Packet Diverter',
        description: 'Hostile intruder unit coordinating with recon sentries.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.INTRUDER,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.RECON, count: 2, hp: 60 }] },
          { waveNumber: 2, enemies: [{ type: DIFFICULTY_TIERS.INTRUDER, count: 1, hp: 90 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 50,
          minPrecisionHits: 3
        },
        payouts: {
          firstClearBits: 140,
          repeatClearBits: 30,
          firstClearXp: 200,
          repeatClearXp: 40
        }
      },
      {
        id: 'level_01_04',
        gridId: 'grid_01',
        index: 4,
        name: 'Buffer Overflow',
        description: 'Multiple agile intruders infiltrating the stack.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.INTRUDER,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.INTRUDER, count: 2, hp: 90 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 55,
          minPrecisionHits: 3
        },
        payouts: {
          firstClearBits: 160,
          repeatClearBits: 30,
          firstClearXp: 225,
          repeatClearXp: 45
        }
      },
      {
        id: 'level_01_05',
        gridId: 'grid_01',
        index: 5,
        name: 'Memory Leak',
        description: 'Heavily armored guardian unit fortifying the outbound gateway.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.GUARDIAN,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.INTRUDER, count: 2, hp: 80 }] },
          { waveNumber: 2, enemies: [{ type: DIFFICULTY_TIERS.GUARDIAN, count: 1, hp: 140 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 60,
          minPrecisionHits: 4
        },
        payouts: {
          firstClearBits: 180,
          repeatClearBits: 35,
          firstClearXp: 250,
          repeatClearXp: 50
        }
      },
      {
        id: 'level_01_06',
        gridId: 'grid_01',
        index: 6,
        name: 'Sentinel Arbiter',
        description: 'Commander of the Outlands boot sector. High kinetic disc output and tactical jump evasion.',
        type: LEVEL_TYPES.ARBITER,
        difficultyTier: DIFFICULTY_TIERS.ARBITER,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.ARBITER, count: 1, hp: 250 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 90,
          minPrecisionHits: 5
        },
        payouts: {
          firstClearBits: 500,
          repeatClearBits: 100,
          firstClearXp: 500,
          repeatClearXp: 100
        }
      }
    ]
  },
  {
    id: 'grid_02',
    name: 'Solar Sail Junction',
    description: 'High-speed transit conduits. Fast flankers, ricochet testing grounds, dynamic cover.',
    requiredStars: 10,
    levels: [
      {
        id: 'level_02_01',
        gridId: 'grid_02',
        index: 1,
        name: 'Lightstream Ingress',
        description: 'Penetrate the solar sail perimeter defense line.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.INTRUDER,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.INTRUDER, count: 2, hp: 95 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 50,
          minPrecisionHits: 3
        },
        payouts: {
          firstClearBits: 150,
          repeatClearBits: 30,
          firstClearXp: 250,
          repeatClearXp: 50
        }
      },
      {
        id: 'level_02_02',
        gridId: 'grid_02',
        index: 2,
        name: 'Beamline Bypass',
        description: 'Neutralize rapid patrol squads flanking lightstream conduits.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.INTRUDER,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.INTRUDER, count: 3, hp: 90 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 50,
          minPrecisionHits: 3
        },
        payouts: {
          firstClearBits: 160,
          repeatClearBits: 30,
          firstClearXp: 275,
          repeatClearXp: 55
        }
      },
      {
        id: 'level_02_03',
        gridId: 'grid_02',
        index: 3,
        name: 'Photon Deflection',
        description: 'Guardians using specular deflection tactics.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.GUARDIAN,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.INTRUDER, count: 1, hp: 90 }, { type: DIFFICULTY_TIERS.GUARDIAN, count: 1, hp: 150 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 55,
          minPrecisionHits: 4
        },
        payouts: {
          firstClearBits: 180,
          repeatClearBits: 35,
          firstClearXp: 300,
          repeatClearXp: 60
        }
      },
      {
        id: 'level_02_04',
        gridId: 'grid_02',
        index: 4,
        name: 'Coronal Flare',
        description: 'Multi-wave assault under solar flare electromagnetic interference.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.GUARDIAN,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.INTRUDER, count: 2, hp: 90 }] },
          { waveNumber: 2, enemies: [{ type: DIFFICULTY_TIERS.GUARDIAN, count: 2, hp: 140 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 60,
          minPrecisionHits: 4
        },
        payouts: {
          firstClearBits: 200,
          repeatClearBits: 35,
          firstClearXp: 325,
          repeatClearXp: 65
        }
      },
      {
        id: 'level_02_05',
        gridId: 'grid_02',
        index: 5,
        name: 'Sail Rigging',
        description: 'Elite programs deployed on narrow sail suspension struts.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.ELITE,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.ELITE, count: 1, hp: 180 }] },
          { waveNumber: 2, enemies: [{ type: DIFFICULTY_TIERS.INTRUDER, count: 2, hp: 90 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 65,
          minPrecisionHits: 5
        },
        payouts: {
          firstClearBits: 220,
          repeatClearBits: 40,
          firstClearXp: 350,
          repeatClearXp: 70
        }
      },
      {
        id: 'level_02_06',
        gridId: 'grid_02',
        index: 6,
        name: 'Prism Array',
        description: 'Heavily defended junction requiring ricochet angle mastery.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.ELITE,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.GUARDIAN, count: 2, hp: 140 }] },
          { waveNumber: 2, enemies: [{ type: DIFFICULTY_TIERS.ELITE, count: 1, hp: 190 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 70,
          minPrecisionHits: 5
        },
        payouts: {
          firstClearBits: 240,
          repeatClearBits: 40,
          firstClearXp: 375,
          repeatClearXp: 75
        }
      },
      {
        id: 'level_02_07',
        gridId: 'grid_02',
        index: 7,
        name: 'Sailmaster Arbiter',
        description: 'Master of the Solar Sail. Exceptional speed, curved disc throws, and pillar kiting.',
        type: LEVEL_TYPES.ARBITER,
        difficultyTier: DIFFICULTY_TIERS.ARBITER,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.ARBITER, count: 1, hp: 300 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 90,
          minPrecisionHits: 6
        },
        payouts: {
          firstClearBits: 500,
          repeatClearBits: 100,
          firstClearXp: 600,
          repeatClearXp: 120
        }
      }
    ]
  },
  {
    id: 'grid_03',
    name: 'Sea of Simulation',
    description: 'Dynamic floor hazards, void chasms, aggressive hunter AI swarms.',
    requiredStars: 22,
    levels: [
      {
        id: 'level_03_01',
        gridId: 'grid_03',
        index: 1,
        name: 'Deep Flux Crossing',
        description: 'Floor tiles de-rezzing over the open simulation abyss.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.GUARDIAN,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.GUARDIAN, count: 2, hp: 150 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 55,
          minPrecisionHits: 4
        },
        payouts: {
          firstClearBits: 180,
          repeatClearBits: 35,
          firstClearXp: 350,
          repeatClearXp: 70
        }
      },
      {
        id: 'level_03_02',
        gridId: 'grid_03',
        index: 2,
        name: 'Void Abyss',
        description: 'Avoid plunging into the simulation abyss while engaging skirmishers.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.GUARDIAN,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.INTRUDER, count: 2, hp: 95 }, { type: DIFFICULTY_TIERS.GUARDIAN, count: 1, hp: 150 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 60,
          minPrecisionHits: 4
        },
        payouts: {
          firstClearBits: 200,
          repeatClearBits: 35,
          firstClearXp: 375,
          repeatClearXp: 75
        }
      },
      {
        id: 'level_03_03',
        gridId: 'grid_03',
        index: 3,
        name: 'Ripple Protocol',
        description: 'Agile elite fighters attempting to force void falls.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.ELITE,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.ELITE, count: 1, hp: 200 }] },
          { waveNumber: 2, enemies: [{ type: DIFFICULTY_TIERS.INTRUDER, count: 2, hp: 95 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 65,
          minPrecisionHits: 5
        },
        payouts: {
          firstClearBits: 210,
          repeatClearBits: 40,
          firstClearXp: 400,
          repeatClearXp: 80
        }
      },
      {
        id: 'level_03_04',
        gridId: 'grid_03',
        index: 4,
        name: 'Null Pointer',
        description: 'Rapid-fire squads trapping user programs on isolated platforms.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.ELITE,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.GUARDIAN, count: 2, hp: 150 }] },
          { waveNumber: 2, enemies: [{ type: DIFFICULTY_TIERS.ELITE, count: 1, hp: 200 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 70,
          minPrecisionHits: 5
        },
        payouts: {
          firstClearBits: 220,
          repeatClearBits: 40,
          firstClearXp: 425,
          repeatClearXp: 85
        }
      },
      {
        id: 'level_03_05',
        gridId: 'grid_03',
        index: 5,
        name: 'Logic Chasm',
        description: 'Dual elite battle across crumbling terrain.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.ELITE,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.ELITE, count: 2, hp: 190 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 70,
          minPrecisionHits: 6
        },
        payouts: {
          firstClearBits: 230,
          repeatClearBits: 45,
          firstClearXp: 450,
          repeatClearXp: 90
        }
      },
      {
        id: 'level_03_06',
        gridId: 'grid_03',
        index: 6,
        name: 'Recursive Tide',
        description: 'Swarms of coordinated hunter AI surging in waves.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.ELITE,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.INTRUDER, count: 3, hp: 95 }] },
          { waveNumber: 2, enemies: [{ type: DIFFICULTY_TIERS.GUARDIAN, count: 2, hp: 150 }] },
          { waveNumber: 3, enemies: [{ type: DIFFICULTY_TIERS.ELITE, count: 1, hp: 210 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 75,
          minPrecisionHits: 6
        },
        payouts: {
          firstClearBits: 250,
          repeatClearBits: 45,
          firstClearXp: 475,
          repeatClearXp: 95
        }
      },
      {
        id: 'level_03_07',
        gridId: 'grid_03',
        index: 7,
        name: 'Subroutine Sovereign',
        description: 'Ruler of the Simulation Sea. Devastating kinetic disc bursts and counter-catch mastery.',
        type: LEVEL_TYPES.ARBITER,
        difficultyTier: DIFFICULTY_TIERS.ARBITER,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.ARBITER, count: 1, hp: 350 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 95,
          minPrecisionHits: 7
        },
        payouts: {
          firstClearBits: 500,
          repeatClearBits: 100,
          firstClearXp: 750,
          repeatClearXp: 150
        }
      }
    ]
  },
  {
    id: 'grid_04',
    name: 'The Core Pinnacle',
    description: 'The epicenter of the Grid. Elite dual-disc combatants, maximum AI aggression, master control.',
    requiredStars: 36,
    levels: [
      {
        id: 'level_04_01',
        gridId: 'grid_04',
        index: 1,
        name: 'Monolithic Gateway',
        description: 'Breach the fortified gates protecting the Core processor.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.ELITE,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.ELITE, count: 2, hp: 200 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 65,
          minPrecisionHits: 5
        },
        payouts: {
          firstClearBits: 200,
          repeatClearBits: 40,
          firstClearXp: 500,
          repeatClearXp: 100
        }
      },
      {
        id: 'level_04_02',
        gridId: 'grid_04',
        index: 2,
        name: 'Register File',
        description: 'Intense firefights among the register banks.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.ELITE,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.GUARDIAN, count: 2, hp: 160 }] },
          { waveNumber: 2, enemies: [{ type: DIFFICULTY_TIERS.ELITE, count: 1, hp: 210 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 70,
          minPrecisionHits: 5
        },
        payouts: {
          firstClearBits: 210,
          repeatClearBits: 40,
          firstClearXp: 520,
          repeatClearXp: 105
        }
      },
      {
        id: 'level_04_03',
        gridId: 'grid_04',
        index: 3,
        name: 'Pipeline Stall',
        description: 'Survive tactical ambush in the arithmetic execution pipeline.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.ELITE,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.INTRUDER, count: 2, hp: 100 }] },
          { waveNumber: 2, enemies: [{ type: DIFFICULTY_TIERS.ELITE, count: 2, hp: 210 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 70,
          minPrecisionHits: 6
        },
        payouts: {
          firstClearBits: 220,
          repeatClearBits: 45,
          firstClearXp: 540,
          repeatClearXp: 110
        }
      },
      {
        id: 'level_04_04',
        gridId: 'grid_04',
        index: 4,
        name: 'Branch Hazard',
        description: 'Extreme ricochet hazard sector with minimal intact footing.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.ELITE,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.GUARDIAN, count: 2, hp: 160 }] },
          { waveNumber: 2, enemies: [{ type: DIFFICULTY_TIERS.ELITE, count: 2, hp: 220 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 75,
          minPrecisionHits: 6
        },
        payouts: {
          firstClearBits: 230,
          repeatClearBits: 45,
          firstClearXp: 560,
          repeatClearXp: 115
        }
      },
      {
        id: 'level_04_05',
        gridId: 'grid_04',
        index: 5,
        name: 'Instruction Cache',
        description: 'Fast-cycle tactical AI units executing synchronized crossfire.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.ELITE,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.ELITE, count: 2, hp: 220 }] },
          { waveNumber: 2, enemies: [{ type: DIFFICULTY_TIERS.ELITE, count: 2, hp: 220 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 75,
          minPrecisionHits: 6
        },
        payouts: {
          firstClearBits: 240,
          repeatClearBits: 45,
          firstClearXp: 580,
          repeatClearXp: 120
        }
      },
      {
        id: 'level_04_06',
        gridId: 'grid_04',
        index: 6,
        name: 'Interrupt Vector',
        description: 'Relentless priority assault threatening total stack termination.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.ELITE,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.GUARDIAN, count: 2, hp: 160 }] },
          { waveNumber: 2, enemies: [{ type: DIFFICULTY_TIERS.ELITE, count: 2, hp: 230 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 80,
          minPrecisionHits: 7
        },
        payouts: {
          firstClearBits: 250,
          repeatClearBits: 50,
          firstClearXp: 600,
          repeatClearXp: 125
        }
      },
      {
        id: 'level_04_07',
        gridId: 'grid_04',
        index: 7,
        name: 'Privileged Execution',
        description: 'Penultimate trial guarding the inner Core sanctum.',
        type: LEVEL_TYPES.TRIAL,
        difficultyTier: DIFFICULTY_TIERS.ELITE,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.INTRUDER, count: 3, hp: 100 }] },
          { waveNumber: 2, enemies: [{ type: DIFFICULTY_TIERS.GUARDIAN, count: 2, hp: 160 }] },
          { waveNumber: 3, enemies: [{ type: DIFFICULTY_TIERS.ELITE, count: 2, hp: 240 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 85,
          minPrecisionHits: 7
        },
        payouts: {
          firstClearBits: 250,
          repeatClearBits: 50,
          firstClearXp: 650,
          repeatClearXp: 130
        }
      },
      {
        id: 'level_04_08',
        gridId: 'grid_04',
        index: 8,
        name: 'Master Control Arbiter',
        description: 'Supreme Overseer of the Core. Ultimate disc speed, predictive lead targeting, and maximum shield endurance.',
        type: LEVEL_TYPES.ARBITER,
        difficultyTier: DIFFICULTY_TIERS.ARBITER,
        waves: [
          { waveNumber: 1, enemies: [{ type: DIFFICULTY_TIERS.ARBITER, count: 1, hp: 450 }] }
        ],
        starThresholds: {
          minIntegrityRatio: 0.75,
          targetTimeSeconds: 100,
          minPrecisionHits: 8
        },
        payouts: {
          firstClearBits: 500,
          repeatClearBits: 100,
          firstClearXp: 1000,
          repeatClearXp: 200
        }
      }
    ]
  }
]);

export class CampaignRegistry {
  constructor(grids = CAMPAIGN_GRIDS) {
    this._grids = grids;
    this._gridMap = new Map();
    this._levelMap = new Map();

    for (const grid of this._grids) {
      this._gridMap.set(grid.id, grid);
      for (const level of grid.levels) {
        this._levelMap.set(level.id, level);
      }
    }
  }

  /**
   * Retrieves all campaign Grids.
   * @returns {Array<object>}
   */
  getAllGrids() {
    return this._grids;
  }

  /**
   * Retrieves a Grid by ID.
   * @param {string} gridId
   * @returns {object|null}
   */
  getGrid(gridId) {
    if (!gridId || typeof gridId !== 'string') return null;
    return this._gridMap.get(gridId) || null;
  }

  /**
   * Retrieves a level by ID.
   * @param {string} levelId
   * @returns {object|null}
   */
  getLevel(levelId) {
    if (!levelId || typeof levelId !== 'string') return null;
    return this._levelMap.get(levelId) || null;
  }

  /**
   * Retrieves all levels for a specific Grid.
   * @param {string} gridId
   * @returns {Array<object>}
   */
  getLevelsForGrid(gridId) {
    const grid = this.getGrid(gridId);
    return grid ? [...grid.levels] : [];
  }

  /**
   * Determines if a Grid is unlocked based on cumulative star total.
   * @param {string} gridId
   * @param {number} totalStars
   * @returns {boolean}
   */
  isGridUnlocked(gridId, totalStars = 0) {
    const grid = this.getGrid(gridId);
    if (!grid) return false;
    const stars = typeof totalStars === 'number' && Number.isFinite(totalStars) ? Math.max(0, Math.floor(totalStars)) : 0;
    return stars >= grid.requiredStars;
  }

  /**
   * Retrieves the next level sequentially across grids.
   * @param {string} levelId
   * @returns {object|null}
   */
  getNextLevel(levelId) {
    const current = this.getLevel(levelId);
    if (!current) return null;

    const grid = this.getGrid(current.gridId);
    if (!grid) return null;

    const currentIndex = grid.levels.findIndex(l => l.id === levelId);
    if (currentIndex >= 0 && currentIndex < grid.levels.length - 1) {
      return grid.levels[currentIndex + 1];
    }

    // Check next grid
    const gridIndex = this._grids.findIndex(g => g.id === current.gridId);
    if (gridIndex >= 0 && gridIndex < this._grids.length - 1) {
      const nextGrid = this._grids[gridIndex + 1];
      return nextGrid.levels.length > 0 ? nextGrid.levels[0] : null;
    }

    return null;
  }

  /**
   * Checks whether a level is unlocked based on completed levels and cumulative stars.
   * Level 1 of any unlocked Grid is unlocked.
   * Subsequent levels in an unlocked Grid require the preceding level in that Grid to be completed.
   * @param {string} levelId
   * @param {Array<string>|Set<string>} completedLevelIds
   * @param {number} totalStars
   * @returns {boolean}
   */
  isLevelUnlocked(levelId, completedLevelIds = [], totalStars = 0) {
    const level = this.getLevel(levelId);
    if (!level) return false;

    if (!this.isGridUnlocked(level.gridId, totalStars)) {
      return false;
    }

    // First level of an unlocked grid is always unlocked
    if (level.index === 1) {
      return true;
    }

    const completedSet = completedLevelIds instanceof Set ? completedLevelIds : new Set(completedLevelIds);
    const grid = this.getGrid(level.gridId);
    const previousLevel = grid.levels.find(l => l.index === level.index - 1);
    return previousLevel ? completedSet.has(previousLevel.id) : false;
  }

  /**
   * Computes the maximum possible stars across all registered levels (3 per level).
   * @returns {number}
   */
  calculateMaxPossibleStars() {
    let total = 0;
    for (const grid of this._grids) {
      total += grid.levels.length * 3;
    }
    return total;
  }
}

export const campaignRegistry = new CampaignRegistry();
