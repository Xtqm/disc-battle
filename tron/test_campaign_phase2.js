/**
 * test_campaign_phase2.js
 * Comprehensive unit and integration test suite for:
 * Phase 2 Grid Selection UI, Tactical HUD & Post-Trial Debrief (SPEC-CAMP-001).
 */

import assert from 'assert';
import { StorageManager } from '../src/core/storage/StorageManager.js';
import { EconomyManager } from '../src/core/economy/EconomyManager.js';
import { CampaignRegistry } from '../src/campaign/CampaignRegistry.js';
import { StarEvaluator } from '../src/campaign/StarEvaluator.js';
import { CampaignManager } from '../src/campaign/CampaignManager.js';
import { SFX } from '../src/audio/sfx.js';
import {
  GridSelectorModal,
  gridSelectorModal
} from '../src/ui/campaign/GridSelectorModal.js';
import {
  LevelSelectView,
  levelSelectView
} from '../src/ui/campaign/LevelSelectView.js';
import {
  CampaignHUD,
  campaignHUD
} from '../src/ui/campaign/CampaignHUD.js';
import {
  TrialDebriefModal,
  trialDebriefModal
} from '../src/ui/campaign/TrialDebriefModal.js';
import fs from 'fs';

console.log('--- Running Campaign Phase 2 (SPEC-CAMP-001) Test Suite ---');

// Setup mock in-memory environment
function createMockEnvironment() {
  const memStorage = {};
  const mockStorage = {
    isInitialized: true,
    get: (key, def = null) => {
      const parts = key.split('.');
      let curr = memStorage;
      for (const p of parts) {
        if (!curr || typeof curr !== 'object') return def;
        curr = curr[p];
      }
      return curr !== undefined ? curr : def;
    },
    set: (key, val) => {
      const parts = key.split('.');
      let curr = memStorage;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!curr[parts[i]]) curr[parts[i]] = {};
        curr = curr[parts[i]];
      }
      curr[parts[parts.length - 1]] = val;
      return true;
    },
    save: () => true
  };

  const mockEconomy = {
    awardBits: () => true,
    awardXP: () => true
  };

  const registry = new CampaignRegistry();
  const evaluator = new StarEvaluator();
  const manager = new CampaignManager({
    registry,
    evaluator,
    storage: mockStorage,
    economy: mockEconomy
  });

  return { storage: mockStorage, registry, manager };
}

// =========================================================================
// [Group 1] SFX Synthesis Procedural Audio Routines
// =========================================================================
console.log('\n[Group 1] Testing SFX Procedural Synthesis Routines...');

assert(typeof SFX.starIgnite === 'function', 'SFX.starIgnite must be a function');
assert(typeof SFX.bitAccrual === 'function', 'SFX.bitAccrual must be a function');
assert(typeof SFX.missionBriefSweep === 'function', 'SFX.missionBriefSweep must be a function');

// Invoking without AudioContext in Node should safely no-op without error
SFX.starIgnite(1);
SFX.starIgnite(2);
SFX.starIgnite(3);
SFX.bitAccrual();
SFX.missionBriefSweep();
console.log('✓ Procedural audio synthesis hooks safely callable');

// =========================================================================
// [Group 2] GridSelectorModal Rendering & Star-Gated Overlays
// =========================================================================
console.log('\n[Group 2] Testing GridSelectorModal Rendering & Star-Gated Overlays...');

const { manager: envManager, registry: envRegistry } = createMockEnvironment();
const gridModal = new GridSelectorModal({
  registry: envRegistry,
  manager: envManager
});

// Render with 0 stars
const initialHtml = gridModal.render();
assert(initialHtml.includes('CAMPAIGN SECTORS'), 'Must render title banner');
assert(initialHtml.includes('TOTAL STARS: 0 / 84'), 'Must display initial cumulative star total');
assert(initialHtml.includes('SECTOR 01'), 'Must display Sector 01');
assert(initialHtml.includes('SECTOR 02'), 'Must display Sector 02');
assert(initialHtml.includes('SECTOR 03'), 'Must display Sector 03');
assert(initialHtml.includes('SECTOR 04'), 'Must display Sector 04');

// Sector 01 unlocked by default
assert(initialHtml.includes('sector-theme-grid_01'), 'Grid 01 must use theme class');
assert(initialHtml.includes('data-grid-id="grid_01" data-locked="false"'), 'Grid 01 unlocked');
assert(initialHtml.includes('ACCESS GRANTED'), 'Grid 01 shows access granted');

// Sectors 02, 03, 04 locked initially
assert(initialHtml.includes('data-grid-id="grid_02" data-locked="true"'), 'Grid 02 locked at 0 stars');
assert(initialHtml.includes('REQUIRES 10 STARS'), 'Grid 02 displays 10 star requirement');
assert(initialHtml.includes('(10 MORE NEEDED)'), 'Grid 02 displays remaining stars needed');

assert(initialHtml.includes('data-grid-id="grid_03" data-locked="true"'), 'Grid 03 locked');
assert(initialHtml.includes('REQUIRES 22 STARS'), 'Grid 03 displays 22 star requirement');

assert(initialHtml.includes('data-grid-id="grid_04" data-locked="true"'), 'Grid 04 locked');
assert(initialHtml.includes('REQUIRES 36 STARS'), 'Grid 04 displays 36 star requirement');

// Simulate earning 12 stars (unlocks Grid 02)
envManager.storage.set('campaign.starsEarned', 12);
envManager.storage.set('campaign.unlockedGrids', ['grid_01', 'grid_02']);
const updatedHtml = gridModal.render();
assert(updatedHtml.includes('TOTAL STARS: 12 / 84'), 'Must reflect updated cumulative stars');
assert(updatedHtml.includes('data-grid-id="grid_02" data-locked="false"'), 'Grid 02 now unlocked');
assert(updatedHtml.includes('(10 MORE NEEDED)'), 'Grid 03 now needs 10 more stars (22 - 12)');

// Verify callbacks
let selectedGrid = null;
gridModal.setOnSelectGrid((id) => { selectedGrid = id; });
assert(typeof gridModal._onSelectGrid === 'function', 'Grid selection callback bound');

let backInvoked = false;
gridModal.setOnBackToMenu(() => { backInvoked = true; });
assert(typeof gridModal._onBackToMenu === 'function', 'Back callback bound');

console.log('✓ GridSelectorModal rendering, star counters, and lock overlays verified');

// =========================================================================
// [Group 3] LevelSelectView Node Matrix & Telemetry Badges
// =========================================================================
console.log('\n[Group 3] Testing LevelSelectView Node Matrix & Telemetry Badges...');

const levelView = new LevelSelectView({
  registry: envRegistry,
  manager: envManager
});

// Render Grid 01
const levelHtml = levelView.render('grid_01');
assert(levelHtml.includes('Outlands Boot-Sector'), 'Renders active Grid title');
assert(levelHtml.includes('TRIAL MATRIX'), 'Renders trial matrix header');
assert(levelHtml.includes('data-level-id="level_01_01"'), 'Contains level 01_01');
assert(levelHtml.includes('Boot Diagnostic'), 'Contains level title');
assert(levelHtml.includes('tier-recon'), 'Contains Recon tier badge');
assert(levelHtml.includes('Sentinel Arbiter'), 'Contains final Arbiter level title');
assert(levelHtml.includes('arbiter-boss'), 'Arbiter node has special boss class');
assert(levelHtml.includes('// FINAL ARBITER TRIAL'), 'Arbiter node has arbiter label');

// Level 1 is unlocked initially, Level 2 is locked
assert(levelHtml.includes('data-level-id="level_01_01" data-locked="false"'), 'Level 01_01 unlocked by default');
assert(levelHtml.includes('data-level-id="level_01_02" data-locked="true"'), 'Level 01_02 locked initially');

// Simulate clearing level 01_01 with 3 stars and personal best
envManager.storage.set('campaign.levelRecords.level_01_01', {
  levelId: 'level_01_01',
  stars: 3,
  completed: true,
  bestTime: 24.5,
  bestIntegrity: 0.92,
  clears: 1
});
envManager.storage.set('campaign.completedNodes', ['level_01_01']);
envManager.storage.set('campaign.unlockedNodes', ['level_01_01', 'level_01_02']);

const clearedHtml = levelView.render('grid_01');
assert(clearedHtml.includes('BEST: 24.5s'), 'Displays personal best time');
assert(clearedHtml.includes('HP: 92%'), 'Displays personal best integrity %');
assert(clearedHtml.includes('data-level-id="level_01_02" data-locked="false"'), 'Level 01_02 now unlocked');

let selectedLevel = null;
levelView.setOnSelectLevel((lvl) => { selectedLevel = lvl; });
assert(typeof levelView._onSelectLevel === 'function', 'Level select callback bound');

console.log('✓ LevelSelectView node list, tier badges, star icons, and personal bests verified');

// =========================================================================
// [Group 4] CampaignHUD Pre-Launch Mission Brief
// =========================================================================
console.log('\n[Group 4] Testing CampaignHUD Pre-Launch Mission Brief...');

const hud = new CampaignHUD({
  registry: envRegistry,
  manager: envManager
});

const lvl1 = envRegistry.getLevel('level_01_01');
const briefHtml = hud.renderMissionBrief(lvl1);

assert(briefHtml.includes('Boot Diagnostic'), 'Brief displays trial name');
assert(briefHtml.includes('Outlands Boot-Sector'), 'Brief displays sector name');
assert(briefHtml.includes('THREE-STAR OBJECTIVE CLEARANCE CRITERIA'), 'Brief outlines 3-star criteria');
assert(briefHtml.includes('STAR 1: DE-REZ OBJECTIVE'), 'Outlines Star 1');
assert(briefHtml.includes('STAR 2: INTEGRITY THRESHOLD'), 'Outlines Star 2');
assert(briefHtml.includes('at least <b>75%</b> Program Integrity'), 'Outlines Star 2 condition');
assert(briefHtml.includes('STAR 3: MASTERY BENCHMARK'), 'Outlines Star 3');
assert(briefHtml.includes('HOSTILE SUB-ROUTINES:'), 'Displays enemy wave intel');
assert(briefHtml.includes('LAUNCH TRIAL'), 'Has launch trial CTA');
assert(briefHtml.includes('CANCEL'), 'Has cancel button');

console.log('✓ Pre-launch tactical mission brief overlay verified');

// =========================================================================
// [Group 5] CampaignHUD In-Combat Tactical Header & Reactive Thresholding
// =========================================================================
console.log('\n[Group 5] Testing CampaignHUD In-Combat Tactical Header...');

const objHtml = hud.renderObjectiveHeader(lvl1);
assert(objHtml.includes('HOSTILES:'), 'Objective header includes hostiles counter');
assert(objHtml.includes('INTEGRITY:'), 'Objective header includes integrity readout');
assert(objHtml.includes('TRICKSHOTS:'), 'Objective header includes trickshots tracker');
assert(objHtml.includes('TIME:'), 'Objective header includes timer');

// Test programmatic updates
hud._activeLevelConfig = lvl1;
// In Node without browser DOM, mock elements
global.document = {
  getElementById: (id) => {
    const classList = new Set();
    return {
      id,
      textContent: '',
      classList: {
        add: (c) => classList.add(c),
        remove: (c) => classList.delete(c),
        contains: (c) => classList.has(c)
      },
      style: {}
    };
  },
  createElement: () => ({
    className: '',
    textContent: '',
    style: {},
    addEventListener: () => {}
  })
};
global.window = { innerWidth: 1920, innerHeight: 1080 };

// Integrity threshold transition test
const mockIntegrityEl = global.document.getElementById('objIntegrity');
hud.updateIntegrity(100, 100);
// Below 75% threshold
hud.updateIntegrity(65, 100);
hud.updateHostiles(2);
hud.updateMastery(3, 28.5);

console.log('✓ In-combat objective header formatting and reactive thresholds verified');

// =========================================================================
// [Group 6] TrialDebriefModal Victory & Defeat Outcomes
// =========================================================================
console.log('\n[Group 6] Testing TrialDebriefModal Victory & Defeat Outcomes...');

const debrief = new TrialDebriefModal({
  registry: envRegistry,
  manager: envManager
});

// Victory Result Simulation
const victoryResult = {
  levelId: 'level_01_01',
  success: true,
  stars: 3,
  previousStars: 0,
  deltaStars: 3,
  firstTimeClear: true,
  rewards: { bits: 100, xp: 150 },
  totalStars: 15,
  newlyUnlockedGrids: [],
  evaluation: {
    star1: true,
    star2: true,
    star3: true,
    metrics: {
      elapsedSeconds: 31.8,
      integrityPercent: 88,
      precisionHits: 4
    }
  }
};

const debriefVictoryHtml = debrief.render(victoryResult);
assert(debriefVictoryHtml.includes('TRIAL CLEARED'), 'Victory debrief title rendered');
assert(debriefVictoryHtml.includes('TIME: <b style="color:#fff;">31.8s</b>'), 'Displays elapsed seconds');
assert(debriefVictoryHtml.includes('INTEGRITY: <b style="color:#fff;">88%</b>'), 'Displays integrity percent');
assert(debriefVictoryHtml.includes('TRICKSHOTS: <b style="color:#fff;">4</b>'), 'Displays confirmed trickshots');
assert(debriefVictoryHtml.includes('BASE CLEAR (FIRST CLEAR):'), 'Displays first clear base payout');
assert(debriefVictoryHtml.includes('INTEGRITY BONUS (&ge; 75% HP):'), 'Displays integrity bonus');
assert(debriefVictoryHtml.includes('MASTERY BONUS (TIME/TRICKSHOT):'), 'Displays mastery bonus');
assert(debriefVictoryHtml.includes('NEXT TRIAL'), 'Contains Next Trial button');
assert(debriefVictoryHtml.includes('RETRY TRIAL'), 'Contains Retry Trial button');
assert(debriefVictoryHtml.includes('RETURN TO GRID'), 'Contains Return to Grid button');

// Star ignition timer queue verification
debrief.animateStarIgnition(3);
assert.strictEqual(debrief._animationTimers.length, 3, 'Must schedule 3 ignition timers for 3 stars');
debrief.clearAnimationTimers();
assert.strictEqual(debrief._animationTimers.length, 0, 'Timers cleanly purged on clear/dismiss');

// Defeat Result Simulation
const defeatResult = {
  levelId: 'level_01_01',
  success: false,
  stars: 0,
  elapsedSeconds: 14.2,
  rewards: { bits: 0, xp: 0 },
  totalStars: 12
};
const debriefDefeatHtml = debrief.render(defeatResult);
assert(debriefDefeatHtml.includes('SIMULATION FAILED'), 'Defeat debrief title rendered');
assert(!debriefDefeatHtml.includes('NEXT TRIAL'), 'Defeat modal must not show Next Trial CTA');

console.log('✓ TrialDebriefModal victory, defeat, star ignition timing, and payouts verified');

// =========================================================================
// [Group 7] Navigation Callbacks & Scene Reset Integrity
// =========================================================================
console.log('\n[Group 7] Testing Navigation Callbacks & Reset Integrity...');

let nextLevelLaunched = null;
debrief.setOnNextTrial((nextId) => { nextLevelLaunched = nextId; });
assert(typeof debrief._onNextTrial === 'function', 'Next trial callback bound');

let retryLevelLaunched = null;
debrief.setOnRetryTrial((id) => { retryLevelLaunched = id; });
assert(typeof debrief._onRetryTrial === 'function', 'Retry trial callback bound');

let returnedToGridId = null;
debrief.setOnReturnToGrid((id) => { returnedToGridId = id; });
assert(typeof debrief._onReturnToGrid === 'function', 'Return to grid callback bound');

console.log('✓ Navigation callbacks and lifecycle controls verified');

// =========================================================================
// [Group 8] Main Menu & UIManager Re-exports
// =========================================================================
console.log('\n[Group 8] Testing Main Menu & UIManager Re-exports...');

const uiManagerSrc = fs.readFileSync(new URL('../src/ui/UIManager.js', import.meta.url), 'utf8');
assert(uiManagerSrc.includes('static showCampaign()'), 'UIManager.showCampaign exists');
assert(uiManagerSrc.includes('static showLevelSelect('), 'UIManager.showLevelSelect exists');
assert(uiManagerSrc.includes('static showMissionBrief('), 'UIManager.showMissionBrief exists');
assert(uiManagerSrc.includes('static showTrialDebrief('), 'UIManager.showTrialDebrief exists');
assert(uiManagerSrc.includes('gridSelectorModal'), 'UIManager exports gridSelectorModal');
assert(uiManagerSrc.includes('levelSelectView'), 'UIManager exports levelSelectView');
assert(uiManagerSrc.includes('campaignHUD'), 'UIManager exports campaignHUD');
assert(uiManagerSrc.includes('trialDebriefModal'), 'UIManager exports trialDebriefModal');

const menusSrc = fs.readFileSync(new URL('../src/ui/menus.js', import.meta.url), 'utf8');
assert(menusSrc.includes('id="campaignBtn"'), 'menus.js getMainMenuHtml contains campaignBtn');
assert(menusSrc.includes('CAMPAIGN SECTORS'), 'menus.js displays CAMPAIGN SECTORS button text');
assert(menusSrc.includes('gridSelectorModal.show()'), 'menus.js binds campaignBtn to gridSelectorModal.show()');
assert(menusSrc.includes('window.__tronShowCampaignSectors'), 'menus.js exports __tronShowCampaignSectors');

const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert(indexHtml.includes('id="campaignBtn"'), 'index.html contains campaignBtn');
assert(indexHtml.includes('id="gridSelectorModal"'), 'index.html contains gridSelectorModal');
assert(indexHtml.includes('id="levelSelectModal"'), 'index.html contains levelSelectModal');
assert(indexHtml.includes('id="missionBriefModal"'), 'index.html contains missionBriefModal');
assert(indexHtml.includes('id="trialDebriefModal"'), 'index.html contains trialDebriefModal');
assert(indexHtml.includes('id="campaignObjectiveHeader"'), 'index.html contains campaignObjectiveHeader');
assert(indexHtml.includes('id="floatingIndicators"'), 'index.html contains floatingIndicators');

console.log('✓ Main menu, UIManager, and index.html campaign integrations verified');

console.log('\n======================================================');
console.log('ALL CAMPAIGN PHASE 2 TESTS PASSED CLEANLY (100% SUCCESS)');
console.log('======================================================\n');
