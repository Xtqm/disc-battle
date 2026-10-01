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
  const outer = new THREE.Mesh(discGeo(), new THREE.MeshBasicMaterial({ color }));
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(config.DISC_R - .06, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .22, side: THREE.DoubleSide })
  );
  const hub = new THREE.Mesh(new THREE.TorusGeometry(.2, .05, 6, 20), new THREE.MeshBasicMaterial({ color: config.WHITE }));
  g.add(outer, face, hub);
  g.add(new THREE.PointLight(color, 2.4, 10));
  return g;
}

export function makeProgram(color) {
  const g = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: .35, metalness: .9 });
  const lit = new THREE.MeshBasicMaterial({ color });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.55, 1.0, 6, 12), suit);
  torso.position.y = 1.5; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.38, 16, 12), suit);
  head.position.y = 2.42; head.castShadow = true; g.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(.5, .14, .1), lit);
  visor.position.set(0, 2.45, .33); g.add(visor);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .75, 4, 8), suit);
    leg.position.set(s * .26, .55, 0); leg.castShadow = true; g.add(leg);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .7, 4, 8), suit);
    arm.position.set(s * .72, 1.6, 0); arm.castShadow = true; g.add(arm);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.5, .06), lit);
    strip.position.set(s * .58, 1.5, .16); g.add(strip);
    const shin = new THREE.Mesh(new THREE.BoxGeometry(.05, .8, .05), lit);
    shin.position.set(s * .26, .55, .2); g.add(shin);
  }
  const belt = new THREE.Mesh(new THREE.TorusGeometry(.56, .045, 6, 24), lit);
  belt.rotation.x = Math.PI / 2; belt.position.y = 1.0; g.add(belt);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(.5, .06, .06), lit);
  chest.position.set(0, 1.85, .5); g.add(chest);
  // back-mounted disc
  const disc = new THREE.Mesh(discGeo(), new THREE.MeshBasicMaterial({ color }));
  disc.position.set(0, 1.8, -.45); disc.rotation.x = Math.PI / 2; g.add(disc);
  g.userData.backDisc = disc;
  const halo = new THREE.PointLight(color, 1.6, 9); halo.position.y = 1.5; g.add(halo);
  return g;
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
