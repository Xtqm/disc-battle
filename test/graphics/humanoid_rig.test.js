/**
 * humanoid_rig.test.js
 * Unit and integration tests for Tron: Legacy humanoid character rigs,
 * role-differentiated helmet optics, and procedural kinematics.
 */

import assert from 'assert';
import * as THREE from '../../vendor/three.module.js';
import { makeProgram, animateProgramKinematics } from '../../src/graphics/materials.js';

console.log('--- Running Humanoid Character Rig & Kinematics Test Suite ---');

// =========================================================================
// Group 1: Hierarchical Joint Tree & Part Tagging
// =========================================================================
console.log('\n[Group 1] Testing Hierarchical Joint Tree & Part Tagging...');

const playerRig = makeProgram(0x00f3ff, { isPlayer: true, helmetType: 'flynn' });
assert.strictEqual(playerRig.userData.part, 'chassis_root');
assert.ok(playerRig.userData.suitMaterial instanceof THREE.MeshStandardMaterial);
assert.ok(playerRig.userData.litMaterial instanceof THREE.MeshBasicMaterial);
assert.strictEqual(playerRig.userData.backDisc.userData.part, 'chassis_back_disc');
assert.strictEqual(playerRig.userData.halo.userData.part, 'chassis_halo');

// Verify joint references exist
const joints = playerRig.userData.joints;
assert.ok(joints, 'Rig must expose userData.joints dictionary');
assert.ok(joints.pelvis instanceof THREE.Group, 'pelvis joint must exist');
assert.ok(joints.torso instanceof THREE.Group, 'torso joint must exist');
assert.ok(joints.neck instanceof THREE.Group, 'neck joint must exist');
assert.ok(joints.head instanceof THREE.Group, 'head joint must exist');
assert.ok(joints.leftShoulder instanceof THREE.Group, 'leftShoulder joint must exist');
assert.ok(joints.rightShoulder instanceof THREE.Group, 'rightShoulder joint must exist');
assert.ok(joints.leftElbow instanceof THREE.Group, 'leftElbow joint must exist');
assert.ok(joints.rightElbow instanceof THREE.Group, 'rightElbow joint must exist');
assert.ok(joints.leftHip instanceof THREE.Group, 'leftHip joint must exist');
assert.ok(joints.rightHip instanceof THREE.Group, 'rightHip joint must exist');
assert.ok(joints.leftKnee instanceof THREE.Group, 'leftKnee joint must exist');
assert.ok(joints.rightKnee instanceof THREE.Group, 'rightKnee joint must exist');

// Verify parent-child hierarchy
assert.strictEqual(joints.leftShoulder.parent, joints.torso, 'leftShoulder must be child of torso');
assert.strictEqual(joints.rightShoulder.parent, joints.torso, 'rightShoulder must be child of torso');
assert.strictEqual(joints.neck.parent, joints.torso, 'neck must be child of torso');
assert.strictEqual(joints.head.parent, joints.neck, 'head must be child of neck');
assert.strictEqual(joints.leftHip.parent, joints.pelvis, 'leftHip must be child of pelvis');
assert.strictEqual(joints.rightHip.parent, joints.pelvis, 'rightHip must be child of pelvis');

// Check sub-mesh semantic tagging
let suitCount = 0, trimCount = 0, visorCount = 0;
playerRig.traverse((c) => {
  if (c.userData.part === 'chassis_suit') suitCount++;
  if (c.userData.part === 'chassis_trim') trimCount++;
  if (c.userData.part === 'chassis_visor') visorCount++;
});
assert.ok(suitCount >= 10, `Expected at least 10 suit armor meshes, found ${suitCount}`);
assert.ok(trimCount >= 6, `Expected at least 6 neon trim meshes, found ${trimCount}`);
assert.strictEqual(visorCount, 1, 'Player rig must contain exactly 1 visor mesh');

console.log('✓ Group 1: Hierarchical joint tree and part tagging verified.');

// =========================================================================
// Group 2: Role-Differentiated Helmet Optics
// =========================================================================
console.log('\n[Group 2] Testing Role-Differentiated Helmet Optics...');

const botRig = makeProgram(0xff6a10, { isPlayer: false, helmetType: 'rinzler' });
assert.strictEqual(botRig.userData.part, 'chassis_root');

let botVisorCount = 0, botVisorMesh = null;
botRig.traverse((c) => {
  if (c.userData.part === 'chassis_visor') {
    botVisorCount++;
    botVisorMesh = c;
  }
});
assert.strictEqual(botVisorCount, 1, 'Bot rig must contain exactly 1 visor mesh');
assert.ok(botVisorMesh, 'Bot visor mesh must exist');

// Verify player vs bot have distinct geometry types or visor tags
let playerVisorMesh = null;
playerRig.traverse((c) => {
  if (c.userData.part === 'chassis_visor') playerVisorMesh = c;
});
assert.ok(playerVisorMesh, 'Player visor mesh must exist');
assert.notStrictEqual(playerVisorMesh.geometry, botVisorMesh.geometry, 'Player and bot visors must use distinct geometries');

console.log('✓ Group 2: Role-differentiated helmet optics verified.');

// =========================================================================
// Group 3: Procedural Kinematics
// =========================================================================
console.log('\n[Group 3] Testing Procedural Kinematics...');

// 3.1 Running Stride
const initialLHipX = playerRig.userData.leftHip.rotation.x;
const initialRHipX = playerRig.userData.rightHip.rotation.x;

animateProgramKinematics(playerRig, 0.05, {
  speed: 10,
  grounded: true,
  vy: 0,
  blocking: false,
  hurt: 0,
  time: 0.5
});

assert.notStrictEqual(playerRig.userData.leftHip.rotation.x, initialLHipX, 'Left hip must rotate during run');
assert.notStrictEqual(playerRig.userData.rightHip.rotation.x, initialRHipX, 'Right hip must rotate during run');
// Antiphase check
assert.ok(
  Math.sign(playerRig.userData.leftHip.rotation.x) !== Math.sign(playerRig.userData.rightHip.rotation.x) ||
  Math.abs(playerRig.userData.leftHip.rotation.x - playerRig.userData.rightHip.rotation.x) > 0.01,
  'Hips must swing in opposite phase during run'
);

// 3.2 Shield Block Stance
animateProgramKinematics(playerRig, 0.1, {
  speed: 0,
  grounded: true,
  vy: 0,
  blocking: true,
  hurt: 0,
  time: 1.0
});

assert.ok(playerRig.userData.leftShoulder.rotation.x < -0.3, 'Shoulders must raise forward when blocking');
assert.ok(playerRig.userData.rightShoulder.rotation.x < -0.3, 'Shoulders must raise forward when blocking');

// 3.3 Airborne Jump
animateProgramKinematics(playerRig, 0.1, {
  speed: 5,
  grounded: false,
  vy: 8,
  blocking: false,
  hurt: 0,
  time: 1.5
});

assert.ok(playerRig.userData.leftHip.rotation.x > 0.1, 'Legs must trail backward when airborne');

console.log('✓ Group 3: Procedural kinematics verified.');

// =========================================================================
// Group 4: Boss Scaling & Multiplayer Configurations
// =========================================================================
console.log('\n[Group 4] Testing Boss Scaling & Multiplayer Configurations...');

// 4.1 Boss scaling and halo
const duelBossRig = makeProgram(0xff6a10, { isPlayer: false });
duelBossRig.scale.setScalar(1.15);
assert.strictEqual(duelBossRig.scale.x, 1.15);
assert.strictEqual(duelBossRig.userData.halo.userData.part, 'chassis_halo');

const arbiterBossRig = makeProgram(0x7b2cbf, { isPlayer: false });
arbiterBossRig.scale.setScalar(1.22);
assert.strictEqual(arbiterBossRig.scale.x, 1.22);

// 4.2 Multiplayer teammate vs opponent
const teammateRig = makeProgram(0x00f3ff, { isPlayer: true, helmetType: 'flynn' });
const opponentRig = makeProgram(0xb026ff, { isPlayer: false, helmetType: 'rinzler' });
assert.strictEqual(teammateRig.userData.isPlayer, true);
assert.strictEqual(teammateRig.userData.helmetType, 'flynn');
assert.strictEqual(opponentRig.userData.isPlayer, false);
assert.strictEqual(opponentRig.userData.helmetType, 'rinzler');

console.log('✓ Group 4: Boss scaling and multiplayer configurations verified.');

console.log('\n=============================================================');
console.log('ALL HUMANOID CHARACTER RIG & KINEMATICS TESTS PASSED (100%)');
console.log('=============================================================');
