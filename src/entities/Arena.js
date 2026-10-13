import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { scene } from '../graphics/scene.js';
import { wallMat, glowMat, tileMatIntact, tileEdgeMatIntact } from '../graphics/materials.js';
export { tileMatIntact, tileEdgeMatIntact };
import { burst } from '../graphics/particles.js';
import { playWarningSound, playTileDropSound } from '../audio/sfx.js';
import { shake } from '../ui/UIManager.js';

// Map: key `${ix}_${iz}` -> { mesh, slabMesh, edgeMesh, state, timer, origY, ix, iz, center, regenTimer, warningColor }
export const tiles = new Map();

export const tileGeo = new THREE.BoxGeometry(config.TILE_W - 0.08, 0.35, config.TILE_W - 0.08);
export const tileEdgeGeo = new THREE.EdgesGeometry(tileGeo);

export const tileGroup = new THREE.Group();
scene.add(tileGroup);

export function initTiles() {
  tiles.clear();
  while (tileGroup.children.length > 0) {
    tileGroup.remove(tileGroup.children[0]);
  }
  for (let ix = 0; ix < config.TILE_N; ix++) {
    for (let iz = 0; iz < config.TILE_N; iz++) {
      const cx = -config.ARENA + (ix + 0.5) * config.TILE_W;
      const cz = -config.ARENA + (iz + 0.5) * config.TILE_W;
      const mesh = new THREE.Group();
      mesh.position.set(cx, 0, cz);

      const slabMesh = new THREE.Mesh(tileGeo, tileMatIntact);
      slabMesh.position.y = -0.175;
      slabMesh.receiveShadow = true;

      const edgeMesh = new THREE.LineSegments(tileEdgeGeo, tileEdgeMatIntact);
      edgeMesh.position.y = -0.175;

      mesh.add(slabMesh, edgeMesh);
      tileGroup.add(mesh);

      tiles.set(`${ix}_${iz}`, {
        mesh,
        slabMesh,
        edgeMesh,
        state: config.TILE_INTACT,
        timer: 0,
        origY: 0,
        ix,
        iz,
        center: new THREE.Vector3(cx, 0, cz),
        regenTimer: 0,
        warningColor: config.CYAN
      });
    }
  }
}
initTiles();

export function worldToTile(x, z) {
  const ix = Math.min(config.TILE_N - 1, Math.max(0, Math.floor((x + config.ARENA) / config.TILE_W)));
  const iz = Math.min(config.TILE_N - 1, Math.max(0, Math.floor((z + config.ARENA) / config.TILE_W)));
  return { ix, iz };
}

export function tileToWorld(ix, iz) {
  return {
    x: -config.ARENA + (ix + 0.5) * config.TILE_W,
    z: -config.ARENA + (iz + 0.5) * config.TILE_W
  };
}

export function getTileAt(x, z) {
  if (Math.abs(x) > config.ARENA || Math.abs(z) > config.ARENA) return null;
  const { ix, iz } = worldToTile(x, z);
  return tiles.get(`${ix}_${iz}`) || null;
}

export function findNearestIntactTile(x, z) {
  const { ix: cix, iz: ciz } = worldToTile(x, z);
  let best = null;
  let bestDistSq = Infinity;
  for (let r = 1; r <= 8; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const nx = cix + dx, nz = ciz + dz;
        if (nx < 0 || nx >= config.TILE_N || nz < 0 || nz >= config.TILE_N) continue;
        const t = tiles.get(`${nx}_${nz}`);
        if (t && t.state === config.TILE_INTACT) {
          const w = tileToWorld(nx, nz);
          const d2 = (w.x - x) ** 2 + (w.z - z) ** 2;
          if (d2 < bestDistSq) {
            bestDistSq = d2;
            best = w;
          }
        }
      }
    }
    if (best) return best;
  }
  return { x: 0, z: 0 };
}

// Perimeter walls
export const walls = [];
for (let i = 0; i < 4; i++) {
  const w = new THREE.Mesh(new THREE.BoxGeometry(config.ARENA * 2 + 2, 9, 1.4), wallMat);
  const g = new THREE.Mesh(new THREE.BoxGeometry(config.ARENA * 2 + 2, .22, 1.7), glowMat);
  const a = i * Math.PI / 2;
  const p = new THREE.Vector3(Math.sin(a) * config.ARENA, 4.5, Math.cos(a) * config.ARENA);
  w.position.copy(p); w.rotation.y = a; w.receiveShadow = true;
  g.position.set(p.x, 9.1, p.z); g.rotation.y = a;
  scene.add(w, g);
  walls.push({ mesh: w, glow: g });
  for (let k = -config.ARENA + 6; k < config.ARENA; k += 11) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(.18, 8.4, .1), glowMat);
    s.position.set(p.x + Math.cos(a) * k, 4.4, p.z - Math.sin(a) * k);
    s.rotation.y = a; scene.add(s);
  }
}

// Pillars = cover + ricochet cylinders
export const pillars = [];
export const pillarSpots = [[-20,-20],[20,-20],[-20,20],[20,20],[0,-30],[0,30],[-31,0],[31,0]];
for (const [x, z] of pillarSpots) {
  const r = 2.1, h = 6.5;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 6), wallMat);
  m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  const e = new THREE.Mesh(new THREE.CylinderGeometry(r + .05, r + .05, .2, 6), glowMat);
  e.position.set(x, h, z); scene.add(e);
  pillars.push({ x, z, r });
}

export function triggerTileWarning(tile, color = config.CYAN) {
  if (!tile || tile.state !== config.TILE_INTACT) return;
  tile.state = config.TILE_WARNING;
  tile.timer = config.TILE_WARN_DURATION;
  tile.warningColor = color;
  tile.slabMesh.material = new THREE.MeshStandardMaterial({
    color: 0x07202c,
    roughness: .28,
    metalness: .8,
    emissive: color,
    emissiveIntensity: 1.0,
    transparent: true
  });
  tile.edgeMesh.material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1.0
  });
  playWarningSound();
}

export function spawnTileDeRezSparks(cx, cz) {
  const hw = (config.TILE_W - 0.08) * 0.5;
  const pts = [
    new THREE.Vector3(cx - hw, 0.1, cz - hw),
    new THREE.Vector3(cx + hw, 0.1, cz - hw),
    new THREE.Vector3(cx + hw, 0.1, cz + hw),
    new THREE.Vector3(cx - hw, 0.1, cz + hw),
    new THREE.Vector3(cx, 0.1, cz)
  ];
  for (const p of pts) burst(p, config.CYAN, 12, 8);
  playTileDropSound();
  shake(0.12);
}

export function updateTiles(dt) {
  for (const tile of tiles.values()) {
    if (tile.state === config.TILE_INTACT) continue;

    if (tile.state === config.TILE_WARNING) {
      tile.timer -= dt;
      const strobe = 0.5 + 0.5 * Math.sin(state.time * 40);
      const isWhite = Math.sin(state.time * 40) > 0;
      const col = isWhite ? 0xffffff : (tile.warningColor || config.CYAN);

      tile.slabMesh.material.emissive.setHex(col);
      tile.slabMesh.material.emissiveIntensity = 0.5 + strobe * 1.5;
      tile.edgeMesh.material.color.setHex(col);
      tile.edgeMesh.material.opacity = strobe;

      // Shake tile vertically by +-0.05m
      tile.mesh.position.y = tile.origY + Math.sin(state.time * 60) * 0.05;

      if (tile.timer <= 0) {
        tile.state = config.TILE_FALLEN;
        tile.regenTimer = 0;
        tile.mesh.position.y = tile.origY;
        spawnTileDeRezSparks(tile.center.x, tile.center.z);
      }
    } else if (tile.state === config.TILE_FALLEN) {
      tile.mesh.position.y -= 25 * dt;

      if (tile.mesh.position.y <= tile.origY - 15) {
        tile.mesh.visible = false;
      }

      tile.regenTimer = (tile.regenTimer || 0) + dt;
      if (tile.regenTimer >= config.TILE_REGEN_DELAY) {
        tile.state = config.TILE_REBUILDING;
        tile.mesh.visible = true;
        tile.mesh.position.y = tile.origY - 15;
        tile.slabMesh.material.emissive.setHex(config.CYAN);
        tile.slabMesh.material.emissiveIntensity = 0.5;
        tile.edgeMesh.material.color.setHex(config.CYAN);
        playWarningSound();
      }
    } else if (tile.state === config.TILE_REBUILDING) {
      tile.mesh.position.y += 8.0 * dt;
      const holoPulse = 0.5 + 0.5 * Math.sin(state.time * 12);
      tile.slabMesh.material.emissiveIntensity = holoPulse;
      tile.edgeMesh.material.opacity = holoPulse;

      if (tile.mesh.position.y >= tile.origY) {
        tile.mesh.position.y = tile.origY;
        tile.state = config.TILE_INTACT;
        tile.timer = 0;
        tile.regenTimer = 0;
        if (tile.slabMesh.material !== tileMatIntact) {
          tile.slabMesh.material.dispose();
          tile.edgeMesh.material.dispose();
          tile.slabMesh.material = tileMatIntact;
          tile.edgeMesh.material = tileEdgeMatIntact;
        }
        burst(new THREE.Vector3(tile.center.x, 0.1, tile.center.z), config.CYAN, 16, 6);
      }
    }
  }
}

export function rebuildArenaTiles() {
  for (const tile of tiles.values()) {
    tile.state = config.TILE_INTACT;
    tile.timer = 0;
    tile.regenTimer = 0;
    tile.mesh.position.y = tile.origY;
    tile.mesh.visible = true;
    if (tile.slabMesh.material !== tileMatIntact) {
      tile.slabMesh.material.dispose();
      tile.edgeMesh.material.dispose();
      tile.slabMesh.material = tileMatIntact;
      tile.edgeMesh.material = tileEdgeMatIntact;
    }
  }
}
