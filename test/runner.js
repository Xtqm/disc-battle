import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DOMAINS = {
  auth: [
    'auth/auth_header.test.js',
    'auth/auth_input_isolation.test.js',
    'auth/auth_mock_provider.test.js',
    'auth/auth_save_state.test.js',
    'auth/auth_sfx.test.js',
    'auth/supabase_auth_provider.test.js',
    'auth/auth_terminal_integration.test.js',
    'auth/auth_integration.test.js'
  ],
  storage: [
    'storage/storage_manager.test.js',
    'storage/cloud_sync_resolver.test.js',
    'storage/cross_tab_sync.test.js',
    'storage/offline_resilience.test.js',
    'storage/supabase_cloud_sync.test.js'
  ],
  economy: [
    'economy/economy_manager.test.js',
    'economy/swarm_economy_bridge.test.js',
    'economy/duel_economy_bridge.test.js',
    'ui/duel_map_selector.test.js'
  ],
  armory: [
    'armory/armory_manager.test.js',
    'armory/cosmetic_material_engine.test.js',
    'armory/armory_modal.test.js'
  ],
  graphics: [
    'graphics/humanoid_rig.test.js'
  ],
  campaign: [
    'campaign/campaign_phase1.test.js',
    'campaign/campaign_phase2.test.js',
    'campaign/campaign_phase3.test.js'
  ],
  achievements: [
    'achievements/achievement_registry.test.js',
    'achievements/achievement_manager.test.js',
    'audio/achievement_sfx.test.js',
    'ui/achievement_toast.test.js',
    'ui/achievements_modal.test.js'
  ],
  gameplay: [
    'gameplay/mouse_camera_input.test.js',
    'gameplay/camera_combat_stability.test.js',
    'gameplay/physics_and_combat.test.js',
    'gameplay/fullscreen_mode.test.js',
    'gameplay/mobile_controls.test.js',
    'gameplay/mobile_modal_scrolling.test.js',
    'gameplay/multiplayer.test.js',
    'gameplay/rematch.test.js',
    'gameplay/unified_flow.test.js',
    'ui/duel_map_selector.test.js'
  ]
};

async function main() {
  const filterArg = process.argv[2]?.toLowerCase().trim();
  let testQueue = [];
  let scopeLabel = 'FULL TRON DISC ARENA TEST SUITE';

  if (filterArg && filterArg !== 'all') {
    if (!TEST_DOMAINS[filterArg]) {
      console.error(`\n❌ Unknown test domain: "${filterArg}"`);
      console.error(`Available domains: ${Object.keys(TEST_DOMAINS).join(', ')}, all\n`);
      process.exit(1);
    }
    testQueue = TEST_DOMAINS[filterArg];
    scopeLabel = `DOMAIN SUITE: [${filterArg.toUpperCase()}]`;
  } else {
    for (const domain of Object.keys(TEST_DOMAINS)) {
      testQueue.push(...TEST_DOMAINS[domain]);
    }
  }

  console.log(`\n======================================================`);
  console.log(`RUNNING ${scopeLabel} (${testQueue.length} SUITES)`);
  console.log(`======================================================\n`);

  const startTime = Date.now();

  for (let i = 0; i < testQueue.length; i++) {
    const relativeTestPath = testQueue[i];
    const fullTestPath = path.join(__dirname, relativeTestPath);
    console.log(`\n[${i + 1}/${testQueue.length}] Running ${relativeTestPath}...`);

    await new Promise((resolve, reject) => {
      const child = spawn('node', [fullTestPath], { stdio: 'inherit' });
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Test suite ${relativeTestPath} failed with exit code ${code}`));
        }
      });
    });
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n======================================================`);
  console.log(`ALL ${testQueue.length} TEST SUITES PASSED CLEANLY in ${durationSec}s (100% SUCCESS)`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error('\n❌ Test execution failed:', err.message);
  process.exit(1);
});
