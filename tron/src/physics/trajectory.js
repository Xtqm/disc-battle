import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { scene, camera } from '../graphics/scene.js';
import { getTileAt, pillars } from '../entities/Arena.js';
import { tmp } from '../graphics/materials.js';
import { getPlayerCurveIntent } from '../input/keyboard.js';

export function simulatePath(origin, vel, maxBounces = 3, tMax = 1.5, step = 1 / 90, curve = 0) {
  const p = origin.clone(), v = vel.clone();
  const pts = [p.clone()], bounceAt = [];
  let bounces = 0, t = 0, hitFoe = null;
  let k = curve;
  const lim = config.ARENA - 1.5;

  while (t < tMax && bounces <= maxBounces) {
    t += step;

    if (k) {
      const vx = v.x, vy = v.y, vz = v.z;
      const speed = Math.hypot(vx, vy, vz);
      const hSpeed = Math.hypot(vx, vz);
      if (hSpeed > 1e-4) {
        const nx = -vz / hSpeed;
        const nz = vx / hSpeed;
        const latAcc = k * config.CURVE_ACCEL * step;
        let nvx = vx + nx * latAcc;
        let nvz = vz + nz * latAcc;
        const newSpeed = Math.hypot(nvx, vy, nvz);
        if (newSpeed > 1e-4) {
          const s = speed / newSpeed;
          v.x = nvx * s;
          v.y = vy * s;
          v.z = nvz * s;
        }
      }
      k *= Math.exp(-config.CURVE_LAMBDA * step);
    }

    p.addScaledVector(v, step);
    if (p.y > config.DISC_R) {
      p.y += (1.7 - p.y) * Math.min(1, step * 2.2);
    }

    // Floor collision & void check
    const yFloor = config.DISC_R;
    if (p.y <= yFloor) {
      const tile = getTileAt(p.x, p.z);
      const isSolid = tile && tile.state !== config.TILE_FALLEN && tile.state !== config.TILE_REBUILDING;
      if (isSolid) {
        p.y = yFloor;
        if (v.y < 0) {
          const sig = Math.abs(v.y) >= 1.0;
          v.y = -v.y * 0.65;
          v.x *= 0.95;
          v.z *= 0.95;
          if (Math.abs(v.y) < 1.0) v.y = 0;
          if (sig) {
            bounces++;
            bounceAt.push(p.clone());
          }
        }
      } else {
        v.y -= 25 * step;
      }
    }

    let hit = false;
    if (p.x >  lim) { p.x =  lim; v.x *= -1; hit = true; }
    if (p.x < -lim) { p.x = -lim; v.x *= -1; hit = true; }
    if (p.z >  lim) { p.z =  lim; v.z *= -1; hit = true; }
    if (p.z < -lim) { p.z = -lim; v.z *= -1; hit = true; }
    for (const pl of pillars) {
      const dx = p.x - pl.x, dz = p.z - pl.z;
      const dd = Math.hypot(dx, dz), min = pl.r + config.DISC_R;
      if (dd < min && dd > 1e-4) {
        const nx = dx / dd, nz = dz / dd;
        p.x = pl.x + nx * min; p.z = pl.z + nz * min;
        const dot = v.x * nx + v.z * nz;
        v.x -= 2 * dot * nx; v.z -= 2 * dot * nz;
        hit = true;
      }
    }
    if (hit) {
      bounces++;
      bounceAt.push(p.clone());
      k = -k * 0.5;
    }

    // Intercepts a foe program?
    const simFoes = state.foes;
    for (const f of simFoes) {
      if (p.distanceTo(tmp.copy(f.pos).setY(1.5 + (f.y || 0))) < config.FOE_R + config.DISC_R + .35) {
        hitFoe = { foe: f, point: p.clone(), bounces };
        pts.push(p.clone());
        return { pts, bounceAt, hitFoe };
      }
    }
    pts.push(p.clone());
  }
  return { pts, bounceAt, hitFoe };
}

// Visuals
export const trajLine = new THREE.Line(
  new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(1500 * 3), 3)),
  new THREE.LineDashedMaterial({ color: config.CYAN, dashSize: .45, gapSize: .35, transparent: true, opacity: .55,
                                 blending: THREE.AdditiveBlending, depthWrite: false })
);
trajLine.frustumCulled = false;

export const bouncePips = [];
for (let i = 0; i < 4; i++) {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(.35, .5, 20),
    new THREE.MeshBasicMaterial({ color: config.CYAN, transparent: true, opacity: .8, side: THREE.DoubleSide,
                                  blending: THREE.AdditiveBlending, depthWrite: false })
  );
  m.visible = false; bouncePips.push(m);
}

export const impactMark = new THREE.Mesh(
  new THREE.RingGeometry(.55, .75, 24),
  new THREE.MeshBasicMaterial({ color: config.WHITE, transparent: true, opacity: .9, side: THREE.DoubleSide,
                                blending: THREE.AdditiveBlending, depthWrite: false })
);
impactMark.visible = false;

export const threatLines = [];
for (let i = 0; i < 6; i++) {
  const l = new THREE.Line(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 3), 3)),
    new THREE.LineDashedMaterial({ color: config.ORANGE, dashSize: .3, gapSize: .5, transparent: true, opacity: .3,
                                   blending: THREE.AdditiveBlending, depthWrite: false })
  );
  l.frustumCulled = false; l.visible = false; threatLines.push(l);
}

export function initPhysicsVisuals(targetScene = scene) {
  if (!targetScene) return;
  if (!trajLine.parent) targetScene.add(trajLine);
  bouncePips.forEach(m => { if (!m.parent) targetScene.add(m); });
  if (!impactMark.parent) targetScene.add(impactMark);
  threatLines.forEach(l => { if (!l.parent) targetScene.add(l); });
}

if (typeof window !== 'undefined') {
  window.__tronInitPhysicsVisuals = initPhysicsVisuals;
}

export function updateThreatPaths() {
  if (!trajLine.parent && scene) initPhysicsVisuals(scene);
  let n = 0;
  for (const D of state.discs) {
    if (D.owner === 'player' || D.returning || n >= threatLines.length) continue;
    const L = threatLines[n++];
    const sim = simulatePath(D.pos.clone(), D.vel.clone(), 2, 0.8, 1 / 90, D.curve || 0);
    const arr = L.geometry.attributes.position.array;
    const c = Math.min(sim.pts.length, 400);
    for (let i = 0; i < c; i++) { arr[i*3] = sim.pts[i].x; arr[i*3+1] = sim.pts[i].y; arr[i*3+2] = sim.pts[i].z; }
    L.geometry.setDrawRange(0, c);
    L.geometry.attributes.position.needsUpdate = true;
    L.geometry.computeBoundingSphere();
    L.computeLineDistances();
    const toMe = tmp.copy(state.player.pos).setY(1.7).sub(D.pos).normalize();
    L.material.opacity = 0.18 + Math.max(0, D.vel.clone().normalize().dot(toMe)) * 0.5;
    L.visible = true;
  }
  for (let i = n; i < threatLines.length; i++) threatLines[i].visible = false;
}

export function updateTrajectory(aim, dt) {
  if (!trajLine.parent && scene) initPhysicsVisuals(scene);
  const show = state.player.alive && state.player.hasDisc;
  trajLine.visible = show;
  impactMark.visible = false;
  for (const p of bouncePips) p.visible = false;
  if (!show) return null;

  const chest = state.player.pos.clone().setY(1.7 + state.player.y);
  const dir = aim.point.clone().sub(chest).normalize();
  const origin = chest.clone().addScaledVector(dir, 1.1);
  const curve = getPlayerCurveIntent();
  const sim = simulatePath(origin, dir.clone().multiplyScalar(38), 3, 1.5, 1 / 90, curve);

  const willHit = !!sim.hitFoe;
  
  let rearKill = false;
  if (willHit && sim.hitFoe.foe) {
    const f = sim.hitFoe.foe;
    const rotY = f.obj ? f.obj.rotation.y : (f.yaw || 0);
    const fwdX = Math.sin(rotY);
    const fwdZ = Math.cos(rotY);
    const dx = sim.hitFoe.point.x - f.pos.x;
    const dz = sim.hitFoe.point.z - f.pos.z;
    const len = Math.hypot(dx, dz);
    if (len > 0.001) {
      const dot = (dx / len) * fwdX + (dz / len) * fwdZ;
      rearKill = (dot < 0.1 && sim.hitFoe.bounces > 0);
    }
  }

  const isCurving = Math.abs(curve) > 0.05;
  trajLine.material.color.setHex(rearKill ? config.WHITE : willHit ? config.ORANGE : isCurving ? 0x7cf6ff : config.CYAN);
  trajLine.material.opacity = willHit ? .95 : isCurving ? .75 : .45;
  trajLine.material.dashSize = isCurving ? 0.28 : 0.45;
  trajLine.material.gapSize = isCurving ? 0.20 : 0.35;

  const arr = trajLine.geometry.attributes.position.array;
  const n = Math.min(sim.pts.length, 1500);
  for (let i = 0; i < n; i++) {
    arr[i*3] = sim.pts[i].x; arr[i*3+1] = sim.pts[i].y; arr[i*3+2] = sim.pts[i].z;
  }
  trajLine.geometry.setDrawRange(0, n);
  trajLine.geometry.attributes.position.needsUpdate = true;
  trajLine.geometry.computeBoundingSphere();
  trajLine.computeLineDistances();

  sim.bounceAt.slice(0, 4).forEach((b, i) => {
    const pip = bouncePips[i];
    pip.visible = true; pip.position.copy(b);
    pip.lookAt(camera.position);
    pip.material.color.setHex(willHit ? config.ORANGE : isCurving ? 0x7cf6ff : config.CYAN);
    pip.scale.setScalar(1 + Math.sin(state.time * 7 + i) * .12);
  });

  const end = sim.hitFoe ? sim.hitFoe.point : sim.pts[sim.pts.length - 1];
  impactMark.visible = true;
  impactMark.position.copy(end);
  impactMark.lookAt(camera.position);
  impactMark.material.color.setHex(rearKill ? config.WHITE : willHit ? config.ORANGE : isCurving ? 0x7cf6ff : config.CYAN);
  impactMark.scale.setScalar((willHit ? 1.3 : .9) + Math.sin(state.time * 9) * .1);

  return { willHit, rearKill, bounces: sim.bounceAt.length };
}
