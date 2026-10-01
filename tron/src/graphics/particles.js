import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';

export const sparks = [];

export function burst(pos, color, n = 22, power = 10, targetScene = null) {
  if (state.isTouchDevice) n = Math.max(1, Math.round(n * 0.5));
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(n * 3), v = [];
  for (let i = 0; i < n; i++) {
    p[i*3] = pos.x; p[i*3+1] = pos.y; p[i*3+2] = pos.z;
    v.push(new THREE.Vector3(Math.random()-.5, Math.random()*.9, Math.random()-.5).normalize().multiplyScalar(power*(.4+Math.random())));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: .3, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  
  if (targetScene) {
    targetScene.add(pts);
  } else if (typeof window !== 'undefined' && window.__tronScene) {
    window.__tronScene.add(pts);
  }
  sparks.push({ pts, v, life: 0.85, max: 0.85 });
}

export function updateSparks(dt, targetScene) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= dt;
    const a = s.pts.geometry.attributes.position;
    for (let j = 0; j < s.v.length; j++) {
      s.v[j].y -= 16 * dt;
      a.array[j*3] += s.v[j].x * dt;
      a.array[j*3+1] += s.v[j].y * dt;
      a.array[j*3+2] += s.v[j].z * dt;
      if (a.array[j*3+1] < .05) {
        a.array[j*3+1] = .05;
        s.v[j].y *= -.35;
        s.v[j].x *= .7;
        s.v[j].z *= .7;
      }
    }
    a.needsUpdate = true;
    s.pts.material.opacity = Math.max(0, s.life / s.max);
    if (s.life <= 0) {
      if (targetScene) targetScene.remove(s.pts);
      else if (s.pts.parent) s.pts.parent.remove(s.pts);
      s.pts.geometry.dispose();
      sparks.splice(i, 1);
    }
  }
}
