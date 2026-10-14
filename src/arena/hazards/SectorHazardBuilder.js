/**
 * SectorHazardBuilder.js
 * Authoritative Sector Themes & Environmental Hazards Engine for Tron Disc Arena (SPEC-CAMP-001 Phase 3).
 *
 * Manages sector-specific visual themes:
 * - Grid 01 (Outlands Boot-Sector): Cyan neon (#00e5ff), reflective slate floor, static ricochet pillars.
 * - Grid 02 (Solar Sail Junction): Amber/orange lattice (#ffaa00), vertical jump pads, elevated platforms.
 * - Grid 03 (Sea of Simulation): Deep cobalt/violet (#7b2cbf / #3a0ca3), oscillating forcefield barriers, timed laser gates.
 * - Grid 04 (The Core Pinnacle): Crimson/gold (#ff0055 / #ffd700), lethal floor de-rez void zones.
 */

import * as THREE from '../../../vendor/three.module.js';

export const SECTOR_THEMES = Object.freeze({
  grid_01: Object.freeze({
    id: 'grid_01',
    name: 'Outlands Boot-Sector',
    mapId: 'arena_grid_01',
    primaryColor: 0x00e5ff,
    secondaryColor: 0x04141c,
    floorColor: 0x07202c,
    edgeColor: 0x187588,
    wallColor: 0x04141c,
    glowColor: 0x00e5ff,
    roughness: 0.15,
    metalness: 0.85,
    description: 'Reflective slate floor with static ricochet pillars.'
  }),
  grid_02: Object.freeze({
    id: 'grid_02',
    name: 'Solar Sail Junction',
    mapId: 'arena_solar_sail',
    primaryColor: 0xffaa00,
    secondaryColor: 0x2b1400,
    floorColor: 0x1c1005,
    edgeColor: 0xff8800,
    wallColor: 0x150b03,
    glowColor: 0xffaa00,
    roughness: 0.3,
    metalness: 0.7,
    description: 'Amber lattice floor with vertical jump pads and elevated turret platforms.'
  }),
  grid_03: Object.freeze({
    id: 'grid_03',
    name: 'Sea of Simulation',
    mapId: 'arena_sea_sim',
    primaryColor: 0x7b2cbf,
    secondaryColor: 0x10002b,
    floorColor: 0x0d0221,
    edgeColor: 0x9d4edd,
    wallColor: 0x0a0118,
    glowColor: 0x3a0ca3,
    roughness: 0.2,
    metalness: 0.8,
    description: 'Deep cobalt/violet theme with oscillating forcefields and timed laser gates.'
  }),
  grid_04: Object.freeze({
    id: 'grid_04',
    name: 'The Core Pinnacle',
    mapId: 'arena_core_pinnacle',
    primaryColor: 0xff0055,
    secondaryColor: 0x2b000d,
    floorColor: 0x1a0008,
    edgeColor: 0xffd700,
    wallColor: 0x120005,
    glowColor: 0xff0055,
    roughness: 0.18,
    metalness: 0.9,
    description: 'Crimson and gold theme with lethal floor de-rez void zones.'
  })
});

export class SectorHazardBuilder {
  /**
   * @param {object} [options]
   * @param {THREE.Scene} [options.scene]
   */
  constructor(options = {}) {
    this.scene = options.scene || null;
    this.activeGridId = 'grid_01';

    /** @type {Array<object>} */
    this.jumpPads = [];
    /** @type {Array<object>} */
    this.ricochetPillars = [];
    /** @type {Array<object>} */
    this.elevatedPlatforms = [];
    /** @type {Array<object>} */
    this.forcefields = [];
    /** @type {Array<object>} */
    this.laserGates = [];
    /** @type {Array<object>} */
    this.voidZones = [];

    /** @type {THREE.Group|null} */
    this.hazardGroup = null;
  }

  /**
   * Retrieves theme configuration for a given Grid ID.
   * @param {string} [gridId='grid_01']
   * @returns {object}
   */
  getTheme(gridOrMapId = 'grid_01') {
    if (SECTOR_THEMES[gridOrMapId]) return SECTOR_THEMES[gridOrMapId];
    for (const theme of Object.values(SECTOR_THEMES)) {
      if (theme.mapId === gridOrMapId) return theme;
    }
    return SECTOR_THEMES.grid_01;
  }

  /**
   * Applies sector theme styling to arena floor tiles and perimeter walls.
   * @param {string} gridId
   * @param {Map<string, object>} tiles
   * @param {Array<object>} walls
   */
  applySectorTheme(gridId, tiles, walls) {
    const theme = this.getTheme(gridId);
    this.activeGridId = theme.id;

    if (tiles && typeof tiles.values === 'function') {
      for (const tile of tiles.values()) {
        if (tile && tile.slabMesh && tile.edgeMesh) {
          if (tile.slabMesh.material) {
            tile.slabMesh.material.color.setHex(theme.floorColor);
            tile.slabMesh.material.roughness = theme.roughness;
            tile.slabMesh.material.metalness = theme.metalness;
          }
          if (tile.edgeMesh.material) {
            tile.edgeMesh.material.color.setHex(theme.edgeColor);
          }
          tile.warningColor = theme.primaryColor;
        }
      }
    }

    if (Array.isArray(walls)) {
      for (const w of walls) {
        if (w.mesh && w.mesh.material) {
          w.mesh.material.color.setHex(theme.wallColor);
        }
        if (w.glow && w.glow.material) {
          w.glow.material.color.setHex(theme.glowColor);
        }
      }
    }
  }

  /**
   * Builds and instantiates hazards specific to the target Grid.
   * @param {string} gridId
   * @param {THREE.Scene} [scene]
   * @param {Map<string, object>} [tiles]
   * @returns {THREE.Group}
   */
  buildSectorHazards(gridId, scene = this.scene, tiles = null) {
    this.teardown(scene);
    this.scene = scene;
    const theme = this.getTheme(gridId);
    this.activeGridId = theme.id;

    this.hazardGroup = new THREE.Group();
    this.hazardGroup.name = `SectorHazards_${theme.id}`;

    switch (theme.id) {
      case 'grid_01':
        this._buildGrid01Hazards(theme);
        break;
      case 'grid_02':
        this._buildGrid02Hazards(theme);
        break;
      case 'grid_03':
        this._buildGrid03Hazards(theme);
        break;
      case 'grid_04':
        this._buildGrid04Hazards(theme, tiles);
        break;
      default:
        this._buildGrid01Hazards(theme);
        break;
    }

    if (scene && typeof scene.add === 'function') {
      scene.add(this.hazardGroup);
    }

    return this.hazardGroup;
  }

  // ==========================================
  // Grid 01: Outlands Boot-Sector
  // Reflective slate floor, static ricochet pillars
  // ==========================================
  _buildGrid01Hazards(theme) {
    const spots = [
      { x: -14, z: -14 },
      { x: 14, z: -14 },
      { x: -14, z: 14 },
      { x: 14, z: 14 }
    ];

    const pillarMat = new THREE.MeshStandardMaterial({
      color: theme.secondaryColor,
      roughness: 0.15,
      metalness: 0.9
    });
    const glowMat = new THREE.MeshBasicMaterial({ color: theme.primaryColor });

    for (const spot of spots) {
      const r = 1.8, h = 6.0;
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 6), pillarMat);
      mesh.position.set(spot.x, h / 2, spot.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const ring = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.25, 6), glowMat);
      ring.position.set(spot.x, h, spot.z);

      this.hazardGroup.add(mesh, ring);
      this.ricochetPillars.push({
        x: spot.x,
        z: spot.z,
        r,
        h,
        mesh,
        ring
      });
    }
  }

  // ==========================================
  // Grid 02: Solar Sail Junction
  // Amber lattice, vertical jump pads, elevated platforms
  // ==========================================
  _buildGrid02Hazards(theme) {
    // 1. Vertical Jump Pads
    const padSpots = [
      { x: -15, z: 0 },
      { x: 15, z: 0 },
      { x: 0, z: -15 },
      { x: 0, z: 15 }
    ];

    const padMat = new THREE.MeshStandardMaterial({
      color: 0x2b1400,
      roughness: 0.2,
      metalness: 0.8,
      emissive: theme.primaryColor,
      emissiveIntensity: 0.6
    });
    const padRingMat = new THREE.MeshBasicMaterial({ color: theme.primaryColor });

    for (const spot of padSpots) {
      const radius = 2.2;
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.2, 16), padMat);
      mesh.position.set(spot.x, 0.1, spot.z);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.08, 6, 24), padRingMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(spot.x, 0.22, spot.z);

      this.hazardGroup.add(mesh, ring);
      this.jumpPads.push({
        x: spot.x,
        z: spot.z,
        radius,
        impulse: 16.0,
        cooldown: 0,
        mesh,
        ring,
        baseY: 0.1
      });
    }

    // 2. Elevated Turret Platforms
    const platSpots = [
      { x: -22, z: -22 },
      { x: 22, z: 22 }
    ];

    const platMat = new THREE.MeshStandardMaterial({
      color: theme.secondaryColor,
      roughness: 0.3,
      metalness: 0.85
    });

    for (const spot of platSpots) {
      const width = 7.0, height = 3.0, depth = 7.0;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), platMat);
      mesh.position.set(spot.x, height / 2, spot.z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;

      const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth));
      const edgeMesh = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: theme.primaryColor }));
      edgeMesh.position.copy(mesh.position);

      this.hazardGroup.add(mesh, edgeMesh);
      this.elevatedPlatforms.push({
        x: spot.x,
        z: spot.z,
        y: height,
        width,
        depth,
        mesh,
        edgeMesh,
        minX: spot.x - width / 2,
        maxX: spot.x + width / 2,
        minZ: spot.z - depth / 2,
        maxZ: spot.z + depth / 2
      });
    }
  }

  // ==========================================
  // Grid 03: Sea of Simulation
  // Deep cobalt/violet, oscillating forcefield barriers, timed laser gates
  // ==========================================
  _buildGrid03Hazards(theme) {
    // 1. Oscillating Forcefield Barriers
    const ffSpots = [
      { x: 0, z: -16, width: 14.0, height: 4.5, axis: 'x' },
      { x: 0, z: 16, width: 14.0, height: 4.5, axis: 'x' }
    ];

    for (const spot of ffSpots) {
      const ffGeo = new THREE.BoxGeometry(spot.width, spot.height, 0.4);
      const ffMat = new THREE.MeshStandardMaterial({
        color: theme.primaryColor,
        emissive: theme.primaryColor,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.75,
        roughness: 0.1,
        metalness: 0.9
      });
      const mesh = new THREE.Mesh(ffGeo, ffMat);
      mesh.position.set(spot.x, spot.height / 2, spot.z);

      const pylonGeo = new THREE.CylinderGeometry(0.5, 0.5, spot.height, 8);
      const pylonMat = new THREE.MeshStandardMaterial({ color: 0x10002b, metalness: 0.9, roughness: 0.2 });
      const p1 = new THREE.Mesh(pylonGeo, pylonMat);
      p1.position.set(spot.x - spot.width / 2, spot.height / 2, spot.z);
      const p2 = new THREE.Mesh(pylonGeo, pylonMat);
      p2.position.set(spot.x + spot.width / 2, spot.height / 2, spot.z);

      this.hazardGroup.add(mesh, p1, p2);
      this.forcefields.push({
        mesh,
        x: spot.x,
        z: spot.z,
        width: spot.width,
        height: spot.height,
        axis: spot.axis,
        period: 4.0,
        timer: 0,
        active: true,
        halfW: spot.width / 2,
        halfD: 0.5
      });
    }

    // 2. Timed Laser Gates
    const laserSpots = [
      { x1: -20, z1: -5, x2: -20, z2: 5 },
      { x2: 20, z1: -5, x1: 20, z2: 5 }
    ];

    const laserMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.9
    });

    for (const spot of laserSpots) {
      const len = Math.hypot(spot.x2 - spot.x1, spot.z2 - spot.z1);
      const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, len, 8);
      const beam = new THREE.Mesh(beamGeo, laserMat.clone());
      beam.rotation.x = Math.PI / 2;
      beam.position.set((spot.x1 + spot.x2) / 2, 1.2, (spot.z1 + spot.z2) / 2);

      const pylonMat = new THREE.MeshStandardMaterial({ color: 0x1a0008, metalness: 0.9, roughness: 0.2 });
      const pyl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.4, 8), pylonMat);
      pyl1.position.set(spot.x1, 1.2, spot.z1);
      const pyl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.4, 8), pylonMat);
      pyl2.position.set(spot.x2, 1.2, spot.z2);

      this.hazardGroup.add(beam, pyl1, pyl2);
      this.laserGates.push({
        beam,
        spot,
        period: 3.5,
        activeDuration: 1.6,
        timer: 0,
        active: true,
        damage: 30
      });
    }
  }

  // ==========================================
  // Grid 04: The Core Pinnacle
  // Crimson/gold, lethal floor de-rez void zones
  // ==========================================
  _buildGrid04Hazards(theme, tiles) {
    // 1. Central Jump Pad to bridge the de-rez void
    const centerPad = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.5, 0.2, 16),
      new THREE.MeshStandardMaterial({
        color: 0x2b000d,
        emissive: theme.primaryColor,
        emissiveIntensity: 0.8,
        metalness: 0.85
      })
    );
    centerPad.position.set(0, 0.1, 0);
    this.hazardGroup.add(centerPad);

    this.jumpPads.push({
      x: 0,
      z: 0,
      radius: 2.5,
      impulse: 18.0,
      cooldown: 0,
      mesh: centerPad,
      ring: null,
      baseY: 0.1
    });

    // 2. Void Zones configuration
    // Inner quadrants around center drop into permanent void
    const voidTileCoords = [
      // 4 moat tiles around center
      { ix: 11, iz: 9 }, { ix: 12, iz: 9 },
      { ix: 11, iz: 14 }, { ix: 12, iz: 14 },
      { ix: 9, iz: 11 }, { ix: 9, iz: 12 },
      { ix: 14, iz: 11 }, { ix: 14, iz: 12 }
    ];

    this.voidZones = voidTileCoords.map(c => ({
      ix: c.ix,
      iz: c.iz,
      x: -36 + (c.ix + 0.5) * 3, // based on config.ARENA=36, TILE_W=3
      z: -36 + (c.iz + 0.5) * 3,
      radius: 1.5
    }));

    if (tiles && typeof tiles.get === 'function') {
      for (const vz of this.voidZones) {
        const t = tiles.get(`${vz.ix}_${vz.iz}`);
        if (t) {
          t.state = 2; // fallen
          if (t.mesh) t.mesh.visible = false;
        }
      }
    }
  }

  // ==========================================
  // Frame Update Loop
  // ==========================================
  /**
   * Updates all active sector hazards per animation frame.
   * @param {number} dt Delta time in seconds
   * @param {object} [context]
   * @param {object} [context.player]
   * @param {Array<object>} [context.foes]
   * @param {Function} [context.onPlayerDamage]
   * @param {Function} [context.onPlaySound]
   */
  update(dt, context = {}) {
    const player = context.player;
    const foes = context.foes || [];

    // 1. Update Jump Pads
    for (const pad of this.jumpPads) {
      if (pad.cooldown > 0) {
        pad.cooldown -= dt;
      }

      // Pulse pad visual
      if (pad.mesh && pad.mesh.material && pad.mesh.material.emissiveIntensity !== undefined) {
        pad.mesh.material.emissiveIntensity = 0.5 + 0.3 * Math.sin(Date.now() * 0.006);
      }

      // Check player jump pad trigger
      if (player && pad.cooldown <= 0) {
        const dx = player.pos.x - pad.x;
        const dz = player.pos.z - pad.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= pad.radius && (player.y === undefined || player.y <= 1.0)) {
          player.vy = pad.impulse;
          player.grounded = false;
          pad.cooldown = 0.6;
          if (typeof context.onPlaySound === 'function') {
            context.onPlaySound('jump_pad');
          }
        }
      }

      // Check bot jump pad triggers
      for (const f of foes) {
        if (!f || f.dead) continue;
        const dx = f.pos.x - pad.x;
        const dz = f.pos.z - pad.z;
        if (Math.hypot(dx, dz) <= pad.radius && (f.y === undefined || f.y <= 1.0) && pad.cooldown <= 0) {
          f.vy = pad.impulse;
          f.grounded = false;
          pad.cooldown = 0.6;
        }
      }
    }

    // 2. Update Oscillating Forcefields
    for (const ff of this.forcefields) {
      ff.timer += dt;
      // Cycle: active when sine > -0.2
      const sine = Math.sin((ff.timer * Math.PI * 2) / ff.period);
      ff.active = sine > -0.2;

      if (ff.mesh && ff.mesh.material) {
        const targetOpacity = ff.active ? 0.75 : 0.12;
        ff.mesh.material.opacity = targetOpacity;
        ff.mesh.material.emissiveIntensity = ff.active ? 0.8 + 0.2 * Math.sin(Date.now() * 0.01) : 0.1;
      }

      // Push back combatants if forcefield is solid
      if (ff.active && player) {
        this._resolveEntityForcefieldCollision(player, ff);
      }
      if (ff.active) {
        for (const f of foes) {
          if (f && !f.dead) this._resolveEntityForcefieldCollision(f, ff);
        }
      }
    }

    // 3. Update Timed Laser Gates
    for (const lg of this.laserGates) {
      lg.timer = (lg.timer + dt) % lg.period;
      lg.active = lg.timer < lg.activeDuration;

      if (lg.beam && lg.beam.material) {
        lg.beam.material.opacity = lg.active ? 0.95 : 0.1;
        lg.beam.visible = lg.active || (lg.timer > lg.period - 0.5); // warning flash
      }

      if (lg.active && player) {
        // Line segment distance check
        const d = this._distToSegment(player.pos.x, player.pos.z, lg.spot.x1, lg.spot.z1, lg.spot.x2, lg.spot.z2);
        if (d < 1.0 && (player.y === undefined || player.y < 2.0)) {
          if (typeof context.onPlayerDamage === 'function') {
            context.onPlayerDamage(lg.damage * dt * 2.5);
          } else if (typeof player.takeDamage === 'function') {
            player.takeDamage(lg.damage * dt * 2.5);
          }
        }
      }
    }
  }

  _resolveEntityForcefieldCollision(entity, ff) {
    const pos = entity.pos;
    if (!pos) return;
    const dx = Math.abs(pos.x - ff.x);
    const dz = Math.abs(pos.z - ff.z);
    if (dx < ff.halfW + 0.8 && dz < ff.halfD + 0.8) {
      if (ff.axis === 'x') {
        const pushZ = pos.z > ff.z ? (ff.halfD + 0.8) : -(ff.halfD + 0.8);
        pos.z = ff.z + pushZ;
      } else {
        const pushX = pos.x > ff.x ? (ff.halfW + 0.8) : -(ff.halfW + 0.8);
        pos.x = ff.x + pushX;
      }
    }
  }

  _distToSegment(px, pz, x1, z1, x2, z2) {
    const l2 = (x2 - x1) ** 2 + (z2 - z1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, pz - z1);
    let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), pz - (z1 + t * (z2 - z1)));
  }

  /**
   * Checks whether a moving disc collides with an active forcefield or static pillar.
   * @param {object} disc
   * @returns {boolean} True if deflection was applied
   */
  checkDiscCollision(disc) {
    if (!disc || !disc.pos || !disc.vel) return false;

    // Check forcefields
    for (const ff of this.forcefields) {
      if (!ff.active) continue;
      const dx = Math.abs(disc.pos.x - ff.x);
      const dz = Math.abs(disc.pos.z - ff.z);
      if (dx < ff.halfW + 0.3 && dz < ff.halfD + 0.3) {
        if (ff.axis === 'x') {
          disc.vel.z *= -1;
        } else {
          disc.vel.x *= -1;
        }
        return true;
      }
    }

    // Check ricochet pillars
    for (const p of this.ricochetPillars) {
      const dx = disc.pos.x - p.x;
      const dz = disc.pos.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < p.r + 0.25) {
        const nx = dx / dist;
        const nz = dz / dist;
        const dot = disc.vel.x * nx + disc.vel.z * nz;
        disc.vel.x -= 2 * dot * nx;
        disc.vel.z -= 2 * dot * nz;
        return true;
      }
    }

    return false;
  }

  /**
   * Cleans up all hazard meshes, disposes resources, and resets hazard state.
   * @param {THREE.Scene} [scene=this.scene]
   */
  teardown(scene = this.scene) {
    if (this.hazardGroup) {
      if (scene && typeof scene.remove === 'function') {
        scene.remove(this.hazardGroup);
      }
      this.hazardGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      this.hazardGroup = null;
    }

    this.jumpPads = [];
    this.ricochetPillars = [];
    this.elevatedPlatforms = [];
    this.forcefields = [];
    this.laserGates = [];
    this.voidZones = [];
  }
}

export const sectorHazardBuilder = new SectorHazardBuilder();
