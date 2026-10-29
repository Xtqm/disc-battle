import * as THREE from '../../vendor/three.module.js';
import { config } from '../core/config.js';

// Shared materials
export const wallMat = new THREE.MeshStandardMaterial({ color: 0x04141c, roughness: .4, metalness: .9 });
export const glowMat = new THREE.MeshBasicMaterial({ color: config.CYAN });
export const tileMatIntact = new THREE.MeshStandardMaterial({ color: 0x07202c, roughness: .28, metalness: .8 });
export const tileEdgeMatIntact = new THREE.LineBasicMaterial({ color: 0x187588, transparent: true, opacity: .75, depthWrite: false });

export function discGeo() {
  return new THREE.TorusGeometry(config.DISC_R, .085, 8, 40);
}

export function makeDisc(color) {
  const g = new THREE.Group();
  g.userData.part = 'disc_root';
  const outer = new THREE.Mesh(discGeo(), new THREE.MeshBasicMaterial({ color }));
  outer.userData.part = 'disc_outer';
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(config.DISC_R - .06, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .22, side: THREE.DoubleSide })
  );
  face.userData.part = 'disc_face';
  const hub = new THREE.Mesh(new THREE.TorusGeometry(.2, .05, 6, 20), new THREE.MeshBasicMaterial({ color: config.WHITE }));
  hub.userData.part = 'disc_hub';
  g.add(outer, face, hub);
  const light = new THREE.PointLight(color, 2.4, 10);
  light.userData.part = 'disc_light';
  g.add(light);
  g.userData.outerMesh = outer;
  g.userData.faceMesh = face;
  g.userData.hubMesh = hub;
  g.userData.pointLight = light;
  return g;
}

export function makeProgram(color, options = {}) {
  const isPlayer = !!(options.isPlayer || options.helmetType === 'flynn');
  const helmetType = options.helmetType || (isPlayer ? 'flynn' : 'rinzler');

  const g = new THREE.Group();
  g.userData.part = 'chassis_root';
  g.userData.isPlayer = isPlayer;
  g.userData.helmetType = helmetType;

  // Shared dedicated material instances for this rig
  const suit = new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.35, metalness: 0.9 });
  const lit = new THREE.MeshBasicMaterial({ color });
  g.userData.suitMaterial = suit;
  g.userData.litMaterial = lit;

  // 1. Pelvis Base (world y = 1.05)
  const pelvis = new THREE.Group();
  pelvis.position.y = 1.05;
  pelvis.userData.name = 'pelvis';
  g.add(pelvis);

  const pelvisMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.24, 8), suit);
  pelvisMesh.castShadow = true;
  pelvisMesh.userData.part = 'chassis_suit';
  pelvis.add(pelvisMesh);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 6, 20), lit);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.06;
  belt.userData.part = 'chassis_trim';
  pelvis.add(belt);

  // 2. Abdomen / Spine lower (relative to pelvis)
  const abdomen = new THREE.Group();
  abdomen.position.y = 0.20;
  abdomen.userData.name = 'abdomen';
  pelvis.add(abdomen);

  const abdomenMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.22, 8), suit);
  abdomenMesh.castShadow = true;
  abdomenMesh.userData.part = 'chassis_suit';
  abdomen.add(abdomenMesh);

  const spineTrim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.20, 0.04), lit);
  spineTrim.position.set(0, 0, -0.22);
  spineTrim.userData.part = 'chassis_trim';
  abdomen.add(spineTrim);

  // 3. Upper Torso Cuirass
  const torso = new THREE.Group();
  torso.position.y = 0.26;
  torso.userData.name = 'torso';
  abdomen.add(torso);

  const torsoCuirass = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.38, 8), suit);
  torsoCuirass.castShadow = true;
  torsoCuirass.userData.part = 'chassis_suit';
  torso.add(torsoCuirass);

  // Pectoral / Chest plate
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.16), suit);
  chestPlate.position.set(0, 0.04, 0.12);
  chestPlate.castShadow = true;
  chestPlate.userData.part = 'chassis_suit';
  torso.add(chestPlate);

  // Chest light ribbons (Tron: Legacy styling)
  if (isPlayer) {
    const chestTrim = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.05), lit);
    chestTrim.position.set(0, 0.06, 0.21);
    chestTrim.userData.part = 'chassis_trim';
    torso.add(chestTrim);
  } else {
    const chestTrim = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.05), lit);
    chestTrim.position.set(0, 0.04, 0.21);
    chestTrim.userData.part = 'chassis_trim';
    torso.add(chestTrim);
  }

  // Dorsal C-Ring dock between shoulder blades
  const dorsalDock = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 6, 20), lit);
  dorsalDock.position.set(0, 0.08, -0.22);
  dorsalDock.userData.part = 'chassis_trim';
  torso.add(dorsalDock);

  // 4. Neck & Collar
  const neck = new THREE.Group();
  neck.position.y = 0.28;
  neck.userData.name = 'neck';
  torso.add(neck);

  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.12, 8), suit);
  neckMesh.userData.part = 'chassis_suit';
  neck.add(neckMesh);

  // 5. Head & Helmet
  const head = new THREE.Group();
  head.position.y = 0.16;
  head.userData.name = 'head';
  neck.add(head);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), suit);
  helmet.scale.set(0.92, 1.05, 1.05);
  helmet.castShadow = true;
  helmet.userData.part = 'chassis_suit';
  head.add(helmet);

  // Visor: exactly 1 mesh tagged 'chassis_visor'
  let visor;
  if (isPlayer) {
    // Flynn/ISO style: sleek curved horizontal slit visor
    visor = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.10, 0.10), lit);
    visor.position.set(0, 0.02, 0.26);
    visor.userData.part = 'chassis_visor';
    head.add(visor);
  } else {
    // Rinzler/Enforcer style: illuminated cross T-visor aperture
    const tShape = new THREE.Shape();
    tShape.moveTo(-0.16, 0.07);
    tShape.lineTo(0.16, 0.07);
    tShape.lineTo(0.16, 0.01);
    tShape.lineTo(0.04, 0.01);
    tShape.lineTo(0.04, -0.15);
    tShape.lineTo(-0.04, -0.15);
    tShape.lineTo(-0.04, 0.01);
    tShape.lineTo(-0.16, 0.01);
    tShape.closePath();
    const tGeo = new THREE.ShapeGeometry(tShape);
    visor = new THREE.Mesh(tGeo, lit);
    visor.position.set(0, 0.02, 0.29);
    visor.userData.part = 'chassis_visor';
    head.add(visor);
  }

  // 6. Shoulders & Arms (left and right)
  let leftShoulder, rightShoulder, leftElbow, rightElbow;
  for (const s of [-1, 1]) {
    const isLeft = s === -1;
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.38, 0.12, 0);
    shoulder.userData.name = isLeft ? 'leftShoulder' : 'rightShoulder';
    torso.add(shoulder);

    if (isLeft) leftShoulder = shoulder;
    else rightShoulder = shoulder;

    // Shoulder pauldron
    const pauldron = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.14, 4, 8), suit);
    pauldron.position.set(s * 0.02, 0.02, 0);
    pauldron.castShadow = true;
    pauldron.userData.part = 'chassis_suit';
    shoulder.add(pauldron);

    // Shoulder trim accent
    const shoulderTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.03), lit);
    shoulderTrim.position.set(s * 0.10, 0.02, 0);
    shoulderTrim.userData.part = 'chassis_trim';
    shoulder.add(shoulderTrim);

    // Upper Arm (bicep/tricep)
    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.26, 4, 8), suit);
    upperArm.position.set(0, -0.16, 0);
    upperArm.castShadow = true;
    upperArm.userData.part = 'chassis_suit';
    shoulder.add(upperArm);

    // Upper arm lateral trim strip
    const armTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.03), lit);
    armTrim.position.set(s * 0.09, -0.16, 0.04);
    armTrim.userData.part = 'chassis_trim';
    shoulder.add(armTrim);

    // Elbow joint pivot
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.32, 0);
    elbow.userData.name = isLeft ? 'leftElbow' : 'rightElbow';
    shoulder.add(elbow);

    if (isLeft) leftElbow = elbow;
    else rightElbow = elbow;

    // Elbow guard
    const elbowGuard = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), suit);
    elbowGuard.userData.part = 'chassis_suit';
    elbow.add(elbowGuard);

    // Forearm / Gauntlet
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.26, 8), suit);
    forearm.position.set(0, -0.15, 0);
    forearm.castShadow = true;
    forearm.userData.part = 'chassis_suit';
    elbow.add(forearm);

    // Gauntlet trim strip
    const gauntletTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.03), lit);
    gauntletTrim.position.set(0, -0.15, 0.08);
    gauntletTrim.userData.part = 'chassis_trim';
    elbow.add(gauntletTrim);

    // Hand
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.05), suit);
    hand.position.set(0, -0.31, 0);
    hand.userData.part = 'chassis_suit';
    elbow.add(hand);
  }

  // 7. Hips & Legs (left and right)
  let leftHip, rightHip, leftKnee, rightKnee;
  for (const s of [-1, 1]) {
    const isLeft = s === -1;
    const hip = new THREE.Group();
    hip.position.set(s * 0.16, -0.08, 0);
    hip.userData.name = isLeft ? 'leftHip' : 'rightHip';
    pelvis.add(hip);

    if (isLeft) leftHip = hip;
    else rightHip = hip;

    // Thigh plate
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.32, 4, 8), suit);
    thigh.position.set(0, -0.18, 0);
    thigh.castShadow = true;
    thigh.userData.part = 'chassis_suit';
    hip.add(thigh);

    // Outer thigh neon stripe
    const thighTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.30, 0.03), lit);
    thighTrim.position.set(s * 0.11, -0.18, 0);
    thighTrim.userData.part = 'chassis_trim';
    hip.add(thighTrim);

    // Knee joint pivot
    const knee = new THREE.Group();
    knee.position.set(0, -0.38, 0);
    knee.userData.name = isLeft ? 'leftKnee' : 'rightKnee';
    hip.add(knee);

    if (isLeft) leftKnee = knee;
    else rightKnee = knee;

    // Knee cop plate
    const kneeCop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.10), suit);
    kneeCop.position.set(0, 0, 0.04);
    kneeCop.userData.part = 'chassis_suit';
    knee.add(kneeCop);

    // Shin greave
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.30, 8), suit);
    shin.position.set(0, -0.18, 0);
    shin.castShadow = true;
    shin.userData.part = 'chassis_suit';
    knee.add(shin);

    // Front shin EL strip
    const shinTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.03), lit);
    shinTrim.position.set(0, -0.18, 0.08);
    shinTrim.userData.part = 'chassis_trim';
    knee.add(shinTrim);

    // Mag-Boot armor
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.22), suit);
    boot.position.set(0, -0.38, 0.04);
    boot.castShadow = true;
    boot.userData.part = 'chassis_suit';
    knee.add(boot);

    // Mag-Boot glowing sole rim
    const soleRim = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.23), lit);
    soleRim.position.set(0, -0.44, 0.04);
    soleRim.userData.part = 'chassis_trim';
    knee.add(soleRim);
  }

  // 8. Back-mounted disc (child of root for direct world/rig coordinate parity)
  const disc = new THREE.Mesh(discGeo(), new THREE.MeshBasicMaterial({ color }));
  disc.position.set(0, 1.8, -0.45);
  disc.rotation.x = Math.PI / 2;
  disc.userData.part = 'chassis_back_disc';
  g.add(disc);
  g.userData.backDisc = disc;

  // 9. Halo PointLight
  const halo = new THREE.PointLight(color, 1.6, 9);
  halo.position.y = 1.5;
  halo.userData.part = 'chassis_halo';
  g.add(halo);
  g.userData.halo = halo;

  // 10. Cache joint handles on rig userData
  g.userData.joints = {
    pelvis,
    abdomen,
    torso,
    neck,
    head,
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftHip,
    rightHip,
    leftKnee,
    rightKnee
  };
  g.userData.pelvis = pelvis;
  g.userData.torso = torso;
  g.userData.head = head;
  g.userData.leftShoulder = leftShoulder;
  g.userData.rightShoulder = rightShoulder;
  g.userData.leftElbow = leftElbow;
  g.userData.rightElbow = rightElbow;
  g.userData.leftHip = leftHip;
  g.userData.rightHip = rightHip;
  g.userData.leftKnee = leftKnee;
  g.userData.rightKnee = rightKnee;

  return g;
}

export function animateProgramKinematics(rig, dt, params = {}) {
  if (!rig || !rig.userData || !rig.userData.joints) return;
  const {
    speed = 0,
    vy = 0,
    grounded = true,
    blocking = false,
    hurt = 0,
    time = 0
  } = params;

  const {
    torso,
    head,
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftHip,
    rightHip,
    leftKnee,
    rightKnee
  } = rig.userData.joints;

  // 1. Locomotion running strides vs idle
  if (grounded && speed > 0.4) {
    const runRate = Math.min(speed * 1.1, 14);
    rig.userData._runCycle = (rig.userData._runCycle || 0) + dt * runRate;
    const cycle = rig.userData._runCycle;
    const strideAmp = Math.min(speed / 9, 1) * 0.65;

    // Hips swing in antiphase
    leftHip.rotation.x = Math.sin(cycle) * strideAmp;
    rightHip.rotation.x = -Math.sin(cycle) * strideAmp;

    // Knees flex backwards
    leftKnee.rotation.x = Math.max(0, -Math.sin(cycle)) * (strideAmp * 1.15);
    rightKnee.rotation.x = Math.max(0, Math.sin(cycle)) * (strideAmp * 1.15);

    // Torso subtle counter-rotation
    torso.rotation.y = THREE.MathUtils.lerp(torso.rotation.y, Math.sin(cycle) * 0.08, dt * 10);

    // Arms counter-swing opposite to legs (if not blocking)
    if (!blocking) {
      leftShoulder.rotation.x = -Math.sin(cycle) * (strideAmp * 0.85);
      rightShoulder.rotation.x = Math.sin(cycle) * (strideAmp * 0.85);
      leftShoulder.rotation.y = THREE.MathUtils.lerp(leftShoulder.rotation.y, 0, dt * 10);
      rightShoulder.rotation.y = THREE.MathUtils.lerp(rightShoulder.rotation.y, 0, dt * 10);
      leftShoulder.rotation.z = THREE.MathUtils.lerp(leftShoulder.rotation.z, 0, dt * 10);
      rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, 0, dt * 10);

      leftElbow.rotation.x = -0.15 - Math.max(0, Math.sin(cycle)) * 0.35;
      rightElbow.rotation.x = -0.15 - Math.max(0, -Math.sin(cycle)) * 0.35;
    }
  } else if (grounded) {
    // Idle rest stance
    leftHip.rotation.x = THREE.MathUtils.lerp(leftHip.rotation.x, 0, dt * 10);
    rightHip.rotation.x = THREE.MathUtils.lerp(rightHip.rotation.x, 0, dt * 10);
    leftKnee.rotation.x = THREE.MathUtils.lerp(leftKnee.rotation.x, 0, dt * 10);
    rightKnee.rotation.x = THREE.MathUtils.lerp(rightKnee.rotation.x, 0, dt * 10);
    torso.rotation.y = THREE.MathUtils.lerp(torso.rotation.y, 0, dt * 10);

    if (!blocking) {
      leftShoulder.rotation.x = THREE.MathUtils.lerp(leftShoulder.rotation.x, 0.04, dt * 10);
      rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, 0.04, dt * 10);
      leftShoulder.rotation.y = THREE.MathUtils.lerp(leftShoulder.rotation.y, 0, dt * 10);
      rightShoulder.rotation.y = THREE.MathUtils.lerp(rightShoulder.rotation.y, 0, dt * 10);
      leftShoulder.rotation.z = THREE.MathUtils.lerp(leftShoulder.rotation.z, 0, dt * 10);
      rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, 0, dt * 10);

      leftElbow.rotation.x = THREE.MathUtils.lerp(leftElbow.rotation.x, -0.15, dt * 10);
      rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, -0.15, dt * 10);
    }
  } else {
    // Airborne / Jump: legs trail aerodynamically backwards
    leftHip.rotation.x = THREE.MathUtils.lerp(leftHip.rotation.x, 0.28, dt * 8);
    rightHip.rotation.x = THREE.MathUtils.lerp(rightHip.rotation.x, 0.22, dt * 8);
    leftKnee.rotation.x = THREE.MathUtils.lerp(leftKnee.rotation.x, 0.35, dt * 8);
    rightKnee.rotation.x = THREE.MathUtils.lerp(rightKnee.rotation.x, 0.45, dt * 8);

    if (!blocking) {
      // Arms sweep outwards and slightly forward
      leftShoulder.rotation.x = THREE.MathUtils.lerp(leftShoulder.rotation.x, -0.32, dt * 8);
      rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, -0.32, dt * 8);
      leftShoulder.rotation.z = THREE.MathUtils.lerp(leftShoulder.rotation.z, -0.30, dt * 8);
      rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, 0.30, dt * 8);
      leftElbow.rotation.x = THREE.MathUtils.lerp(leftElbow.rotation.x, -0.35, dt * 8);
      rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, -0.35, dt * 8);
    }
  }

  // 2. Shield Deflection Defense Stance
  if (blocking) {
    // Shoulders rotate forward and inward, elbows bend to brace disc in front of chest
    leftShoulder.rotation.x = THREE.MathUtils.lerp(leftShoulder.rotation.x, -0.75, dt * 18);
    rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, -0.75, dt * 18);
    leftShoulder.rotation.y = THREE.MathUtils.lerp(leftShoulder.rotation.y, 0.32, dt * 18);
    rightShoulder.rotation.y = THREE.MathUtils.lerp(rightShoulder.rotation.y, -0.32, dt * 18);
    leftShoulder.rotation.z = THREE.MathUtils.lerp(leftShoulder.rotation.z, 0.18, dt * 18);
    rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, -0.18, dt * 18);

    leftElbow.rotation.x = THREE.MathUtils.lerp(leftElbow.rotation.x, -0.65, dt * 18);
    rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, -0.65, dt * 18);
  }

  // 3. Hurt Reaction: high-frequency twitch/tremor
  if (hurt > 0) {
    torso.rotation.z = Math.sin(time * 55) * 0.08;
    head.rotation.y = Math.sin(time * 45) * 0.06;
  } else {
    torso.rotation.z = THREE.MathUtils.lerp(torso.rotation.z, 0, dt * 12);
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, 0, dt * 12);
  }
}

// Scratch vector / matrix pool for zero garbage collection overhead
export const tmp = new THREE.Vector3();
export const _discMat = new THREE.Matrix4();
export const _fwd = new THREE.Vector3();
export const _r0 = new THREE.Vector3();
export const _u0 = new THREE.Vector3();
export const _uBank = new THREE.Vector3();
export const _rBank = new THREE.Vector3();
export const _localX = new THREE.Vector3();
export const _localY = new THREE.Vector3();

// Duel AI reusable scratch vectors
export const _duelToP = new THREE.Vector3();
export const _duelSide = new THREE.Vector3();
export const _duelWant = new THREE.Vector3();
export const _duelSafe = new THREE.Vector3();
export const _duelCoverDir = new THREE.Vector3();
export const _duelLead = new THREE.Vector3();
export const _duelAimDir = new THREE.Vector3();
export const _duelOrigin = new THREE.Vector3();
export const _duelEvade = new THREE.Vector3();
