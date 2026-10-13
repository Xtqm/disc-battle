import * as THREE from '../../vendor/three.module.js';
import { config } from '../core/config.js';
import { pillars, tiles } from '../entities/Arena.js';

export function resolveCircle(pos, radius, y = 0) {
  const lim = config.ARENA - 1.4 - radius;
  pos.x = THREE.MathUtils.clamp(pos.x, -lim, lim);
  pos.z = THREE.MathUtils.clamp(pos.z, -lim, lim);

  for (const p of pillars) {
    const dx = pos.x - p.x, dz = pos.z - p.z;
    const dist = Math.hypot(dx, dz), min = p.r + radius;
    if (dist < min && dist > 0.0001) {
      pos.x = p.x + dx / dist * min;
      pos.z = p.z + dz / dist * min;
    }
  }

  // Vertical edge colliders for intact tiles when entity is in falling zone (y < -0.2m)
  if (y < -0.2) {
    const minIX = Math.max(0, Math.floor((pos.x - radius + config.ARENA) / config.TILE_W));
    const maxIX = Math.min(config.TILE_N - 1, Math.floor((pos.x + radius + config.ARENA) / config.TILE_W));
    const minIZ = Math.max(0, Math.floor((pos.z - radius + config.ARENA) / config.TILE_W));
    const maxIZ = Math.min(config.TILE_N - 1, Math.floor((pos.z + radius + config.ARENA) / config.TILE_W));

    for (let ix = minIX; ix <= maxIX; ix++) {
      for (let iz = minIZ; iz <= maxIZ; iz++) {
        const t = tiles.get(`${ix}_${iz}`);
        if (!t || t.state === config.TILE_FALLEN || t.state === config.TILE_REBUILDING) continue;

        const tMinX = -config.ARENA + ix * config.TILE_W;
        const tMaxX = -config.ARENA + (ix + 1) * config.TILE_W;
        const tMinZ = -config.ARENA + iz * config.TILE_W;
        const tMaxZ = -config.ARENA + (iz + 1) * config.TILE_W;

        const cx = Math.max(tMinX, Math.min(pos.x, tMaxX));
        const cz = Math.max(tMinZ, Math.min(pos.z, tMaxZ));
        const dx = pos.x - cx;
        const dz = pos.z - cz;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius && distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          pos.x += (dx / dist) * push;
          pos.z += (dz / dist) * push;
        } else if (distSq <= 1e-6) {
          const dL = pos.x - tMinX;
          const dR = tMaxX - pos.x;
          const dB = pos.z - tMinZ;
          const dT = tMaxZ - pos.z;
          const minD = Math.min(dL, dR, dB, dT);
          if (minD === dL) pos.x = tMinX - radius;
          else if (minD === dR) pos.x = tMaxX + radius;
          else if (minD === dB) pos.z = tMinZ - radius;
          else pos.z = tMaxZ + radius;
        }
      }
    }
  }
}

export function lineOfSight(a, b) {
  for (const p of pillars) {
    const ax = a.x - p.x, az = a.z - p.z, bx = b.x - p.x, bz = b.z - p.z;
    const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
    let t = L ? -(ax * dx + az * dz) / L : 0;
    t = THREE.MathUtils.clamp(t, 0, 1);
    const cx = ax + dx * t, cz = az + dz * t;
    if (Math.hypot(cx, cz) < p.r + .5) return false;
  }
  return true;
}
