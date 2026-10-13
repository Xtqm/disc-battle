import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = [
  'test_auth_header.js',
  'test_auth_input_isolation.js',
  'test_auth_mock_provider.js',
  'test_auth_save_state.js',
  'test_auth_sfx.js',
  'test_auth_terminal_integration.js',
  'test_cloud_sync_resolver.js',
  'test_cross_tab_sync.js',
  'test_offline_resilience.js',
  'test_supabase_auth_provider.js',
  'test_supabase_cloud_sync.js',
  'test_auth_integration.js',
  'test_storage_manager.js',
  'test_economy_manager.js',
  'test_campaign_phase1.js',
  'test_campaign_phase2.js'
];

async function runTestSuite() {
  console.log(`\n======================================================`);
  console.log(`RUNNING FULL TRON DISC ARENA TEST SUITE (${testFiles.length} SUITES)`);
  console.log(`======================================================\n`);

  for (let i = 0; i < testFiles.length; i++) {
    const file = testFiles[i];
    const fullPath = path.join(__dirname, file);
    console.log(`[${i + 1}/${testFiles.length}] Running ${file}...`);

    await new Promise((resolve, reject) => {
      const child = spawn('node', [fullPath], { stdio: 'inherit' });
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Test suite ${file} failed with exit code ${code}`));
        }
      });
    });
  }

  console.log(`\n======================================================`);
  console.log(`ALL ${testFiles.length} TEST SUITES PASSED CLEANLY (100% SUCCESS)`);
  console.log(`======================================================\n`);
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test execution failed:', err.message);
  process.exit(1);
});
