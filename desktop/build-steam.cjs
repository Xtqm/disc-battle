const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('--- Starting Steam Depot Packaging ---');

// 1. Ensure steam_appid.txt exists in project root
const rootAppIdFile = path.join(__dirname, '..', 'steam_appid.txt');
const defaultAppId = process.env.STEAM_APP_ID || '480';
if (!fs.existsSync(rootAppIdFile)) {
  fs.writeFileSync(rootAppIdFile, defaultAppId.trim() + '\n', 'utf8');
  console.log(`Created root steam_appid.txt with App ID: ${defaultAppId.trim()}`);
}

// 2. Build unpacked Windows directory with electron-builder
console.log('Running electron-builder --win --dir ...');
execSync('npx electron-builder --win --dir', { stdio: 'inherit' });

// 3. Copy steam_appid.txt into dist/win-unpacked
const unpackedDir = path.join(__dirname, '..', 'dist', 'win-unpacked');
if (fs.existsSync(unpackedDir)) {
  const targetAppIdFile = path.join(unpackedDir, 'steam_appid.txt');
  fs.copyFileSync(rootAppIdFile, targetAppIdFile);
  console.log(`Successfully verified and copied steam_appid.txt into ${targetAppIdFile}`);
} else {
  console.warn(`Unpacked directory not found at ${unpackedDir}`);
}

console.log('--- Steam Depot Packaging Complete ---');
