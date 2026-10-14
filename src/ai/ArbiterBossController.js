/**
 * ArbiterBossController.js
 * Authoritative Rival Arbiter Boss AI Engine for Tron Disc Arena (SPEC-CAMP-001 Phase 3).
 *
 * Implements:
 * - Multi-layer Rival Shield absorption, damage isolation, and timed recharge mechanics.
 * - Aggressive multi-disc curve volleys with alternating lateral spin curvature.
 * - Reactive predictive dash-evasion routines with invulnerability frame windows.
 * - Boss state machine (ENGAGE, VOLLEY, EVADE, RECOVER).
 */

import * as THREE from '../../vendor/three.module.js';

export const ARBITER_CONFIGS = Object.freeze({
  level_01_06: Object.freeze({
    id: 'level_01_06',
    gridId: 'grid_01',
    name: 'SENTINEL ARBITER',
    title: 'OUTLANDS RECOVERY ARBITER',
    maxHp: 250,
    maxShields: 2,
    shieldRechargeDelay: 6.0,
    discSpeed: 30,
    curvePower: 0.55,
    volleyCount: 2,
    volleyInterval: 0.32,
    volleyCooldown: 4.5,
    dashCooldown: 3.5,
    dashSpeed: 22.0,
    skill: 0.88,
    primaryColor: 0x00e5ff
  }),
  level_02_07: Object.freeze({
    id: 'level_02_07',
    gridId: 'grid_02',
    name: 'SAILMASTER ARBITER',
    title: 'SOLAR LATTICE ARBITER',
    maxHp: 300,
    maxShields: 3,
    shieldRechargeDelay: 5.5,
    discSpeed: 33,
    curvePower: 0.65,
    volleyCount: 3,
    volleyInterval: 0.28,
    volleyCooldown: 4.0,
    dashCooldown: 3.0,
    dashSpeed: 24.0,
    skill: 0.92,
    primaryColor: 0xffaa00
  }),
  level_03_07: Object.freeze({
    id: 'level_03_07',
    gridId: 'grid_03',
    name: 'LEVIATHAN ARBITER',
    title: 'SIMULATION OVERSEER',
    maxHp: 350,
    maxShields: 3,
    shieldRechargeDelay: 5.0,
    discSpeed: 36,
    curvePower: 0.72,
    volleyCount: 3,
    volleyInterval: 0.25,
    volleyCooldown: 3.8,
    dashCooldown: 2.8,
    dashSpeed: 25.0,
    skill: 0.95,
    primaryColor: 0x7b2cbf
  }),
  level_04_08: Object.freeze({
    id: 'level_04_08',
    gridId: 'grid_04',
    name: 'MASTER CONTROL ARBITER',
    title: 'CORE APEX ARBITER',
    maxHp: 450,
    maxShields: 4,
    shieldRechargeDelay: 4.5,
    discSpeed: 40,
    curvePower: 0.85,
    volleyCount: 4,
    volleyInterval: 0.22,
    volleyCooldown: 3.2,
    dashCooldown: 2.4,
    dashSpeed: 28.0,
    skill: 0.98,
    primaryColor: 0xff0055
  })
});

export class ArbiterBossController {
  /**
   * @param {object} foe The bot entity instance in state.foes
   * @param {string} [levelId='level_01_06'] The Arbiter level ID
   */
  constructor(foe, levelId = 'level_01_06') {
    this.foe = foe;
    this.levelId = levelId;
    this.config = ARBITER_CONFIGS[levelId] || ARBITER_CONFIGS.level_01_06;

    this.name = this.config.name;
    this.title = this.config.title;
    this.gridId = this.config.gridId;
    this.primaryColor = this.config.primaryColor;

    // Multi-layer shield mechanics
    this.maxShields = this.config.maxShields;
    this.currentShields = this.maxShields;
    this.shieldRechargeDelay = this.config.shieldRechargeDelay;
    this.shieldRechargeTimer = 0;

    // Offensive curve-disc volleys
    this.volleyCount = this.config.volleyCount;
    this.volleyInterval = this.config.volleyInterval;
    this.volleyCooldown = this.config.volleyCooldown;
    this.volleyTimer = 0;
    this.isFiringVolley = false;
    this.volleyRemaining = 0;
    this.nextVolleyDiscTimer = 0;
    this.volleySign = 1;

    // Reactive dash-evasion
    this.dashCooldown = this.config.dashCooldown;
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashDuration = 0.22;
    this.dashTimeLeft = 0;
    this.dashDir = new THREE.Vector3();
    this.invulnerableTimer = 0;

    // State machine
    this.state = 'ENGAGE'; // ENGAGE, VOLLEY, EVADE, RECOVER
    this.listeners = new Map();

    // Attach to foe
    if (this.foe) {
      this.foe.isArbiter = true;
      this.foe.isBoss = true;
      this.foe.bossController = this;
      this.foe.hp = this.config.maxHp;
      this.foe.maxHp = this.config.maxHp;
      this.foe.skill = this.config.skill;
      this.foe.speed = 11.5 + (this.config.maxShields - 2) * 1.2;
    }
  }

  // ==========================================
  // Event Emitter
  // ==========================================
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
    }
  }

  emit(event, payload) {
    if (this.listeners.has(event)) {
      for (const handler of this.listeners.get(event)) {
        try {
          handler(payload);
        } catch (_) {}
      }
    }
  }

  // ==========================================
  // Damage & Shield Mechanics
  // ==========================================
  /**
   * Processes an incoming disc hit on the Arbiter.
   * Multi-layer shields completely absorb damage before core HP is exposed.
   * @param {number} dmg Incoming raw damage
   * @param {object} [disc] Projectile reference
   * @returns {{ absorbed: boolean, remainingShields: number, coreDamage: number, invulnerable: boolean }}
   */
  onHit(dmg, disc = null) {
    // If during i-frame evasion window, ignore
    if (this.invulnerableTimer > 0) {
      return { absorbed: true, remainingShields: this.currentShields, coreDamage: 0, invulnerable: true };
    }

    // Reset shield recharge timer on any confirmed hit
    this.shieldRechargeTimer = 0;

    // If multi-layer shield is active, absorb hit completely
    if (this.currentShields > 0) {
      this.currentShields--;
      this.emit('shield_hit', {
        remainingShields: this.currentShields,
        maxShields: this.maxShields,
        depleted: this.currentShields === 0
      });
      return {
        absorbed: true,
        remainingShields: this.currentShields,
        coreDamage: 0,
        invulnerable: false
      };
    }

    // Shields depleted -> core takes damage
    const coreDamage = Math.max(0, dmg);
    if (this.foe) {
      this.foe.hp -= coreDamage;
      this.foe.hurt = 0.5;
    }

    this.emit('core_hit', {
      hp: this.foe ? this.foe.hp : 0,
      maxHp: this.config.maxHp,
      damage: coreDamage
    });

    return {
      absorbed: false,
      remainingShields: 0,
      coreDamage,
      invulnerable: false
    };
  }

  // ==========================================
  // Update Loop
  // ==========================================
  /**
   * Frame update routine for Arbiter AI behaviors.
   * @param {number} dt Delta time in seconds
   * @param {object} player Target player entity
   * @param {Array<object>} incomingDiscs Active discs in play
   * @param {Function} [spawnDiscFn] Callback to spawn volley discs
   */
  update(dt, player, incomingDiscs = [], spawnDiscFn = null) {
    if (!this.foe || this.foe.hp <= 0) return;

    // 1. Tick Invulnerability & Evasion Frames
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
    }

    // 2. Process Active Dash Impulse
    if (this.isDashing) {
      this.dashTimeLeft -= dt;
      if (this.dashTimeLeft <= 0) {
        this.isDashing = false;
        this.state = 'ENGAGE';
      } else {
        // Move along dash trajectory
        this.foe.pos.x += this.dashDir.x * this.config.dashSpeed * dt;
        this.foe.pos.z += this.dashDir.z * this.config.dashSpeed * dt;
        return; // Dash overrides other movement
      }
    }

    // 3. Update Multi-Layer Shield Recharge
    if (this.currentShields < this.maxShields) {
      this.shieldRechargeTimer += dt;
      if (this.shieldRechargeTimer >= this.shieldRechargeDelay) {
        this.currentShields++;
        this.shieldRechargeTimer = 0;
        this.emit('shield_recharged', {
          currentShields: this.currentShields,
          maxShields: this.maxShields
        });
      }
    }

    // 4. Reactive Dash-Evasion against incoming player discs
    if (!this.isDashing && this.dashTimer <= 0 && player) {
      this._checkIncomingProjectiles(incomingDiscs);
    }

    // 5. Aggressive Curve-Disc Volleys
    this.volleyTimer += dt;
    if (this.isFiringVolley) {
      this.nextVolleyDiscTimer -= dt;
      if (this.nextVolleyDiscTimer <= 0) {
        this._fireVolleyDisc(player, spawnDiscFn);
      }
    } else if (this.volleyTimer >= this.volleyCooldown && player) {
      this._startVolley();
    }
  }

  // ==========================================
  // Evasion Trigger Logic
  // ==========================================
  _checkIncomingProjectiles(discs) {
    if (!Array.isArray(discs) || !this.foe) return;

    for (const d of discs) {
      if (!d || d.owner === this.foe || !d.vel) continue;

      const dx = this.foe.pos.x - d.pos.x;
      const dz = this.foe.pos.z - d.pos.z;
      const dist = Math.hypot(dx, dz);

      // Trigger dash if projectile is within 7m and approaching directly
      if (dist < 7.0 && dist > 0.5) {
        const velLen = Math.hypot(d.vel.x, d.vel.z);
        if (velLen > 0.1) {
          const vNormX = d.vel.x / velLen;
          const vNormZ = d.vel.z / velLen;
          const toFoeX = dx / dist;
          const toFoeZ = dz / dist;
          const dot = vNormX * toFoeX + vNormZ * toFoeZ;

          // Disc is heading straight at the Arbiter
          if (dot > 0.75) {
            this._triggerReactiveDash(vNormX, vNormZ);
            break;
          }
        }
      }
    }
  }

  _triggerReactiveDash(inX, inZ) {
    this.isDashing = true;
    this.dashTimeLeft = this.dashDuration;
    this.dashTimer = this.dashCooldown;
    this.invulnerableTimer = 0.25;
    this.state = 'EVADE';

    // Dash perpendicular to incoming projectile vector
    const sign = Math.random() < 0.5 ? 1 : -1;
    this.dashDir.set(-inZ * sign, 0, inX * sign).normalize();

    this.emit('evaded', {
      dir: this.dashDir.clone(),
      invulnerableDuration: 0.25
    });
  }

  // ==========================================
  // Curve-Disc Volley Attack
  // ==========================================
  _startVolley() {
    this.isFiringVolley = true;
    this.volleyRemaining = this.volleyCount;
    this.nextVolleyDiscTimer = 0;
    this.volleyTimer = 0;
    this.volleySign = Math.random() < 0.5 ? 1 : -1;
    this.state = 'VOLLEY';
  }

  _fireVolleyDisc(player, spawnDiscFn) {
    if (this.volleyRemaining <= 0) {
      this.isFiringVolley = false;
      this.state = 'ENGAGE';
      return;
    }

    this.volleyRemaining--;
    this.nextVolleyDiscTimer = this.volleyInterval;

    if (player && typeof spawnDiscFn === 'function') {
      const pPos = player.pos || { x: 0, y: 0, z: 0 };
      const fPos = this.foe.pos;

      const dx = pPos.x - fPos.x;
      const dz = pPos.z - fPos.z;
      const dist = Math.hypot(dx, dz) || 1;

      const origin = new THREE.Vector3(fPos.x, 1.7 + (this.foe.y || 0), fPos.z);
      const aimDir = new THREE.Vector3(dx / dist, 0, dz / dist);
      origin.addScaledVector(aimDir, 1.2);

      // Alternating lateral curve power
      const curve = this.config.curvePower * this.volleySign;
      this.volleySign *= -1; // alternate spin for next disc

      const vel = aimDir.clone().multiplyScalar(this.config.discSpeed);
      spawnDiscFn(origin, vel, this.foe, this.primaryColor, curve);

      this.emit('volley_disc_fired', {
        remaining: this.volleyRemaining,
        curve
      });
    }

    if (this.volleyRemaining <= 0) {
      this.isFiringVolley = false;
      this.state = 'ENGAGE';
    }
  }

  // ==========================================
  // Telemetry Snapshot
  // ==========================================
  /**
   * Retrieves live boss telemetry for HUD overlays.
   * @returns {object}
   */
  getTelemetry() {
    return {
      name: this.name,
      title: this.title,
      gridId: this.gridId,
      levelId: this.levelId,
      hp: Math.max(0, this.foe ? this.foe.hp : 0),
      maxHp: this.config.maxHp,
      shields: this.currentShields,
      maxShields: this.maxShields,
      rechargeProgress: this.currentShields < this.maxShields ? this.shieldRechargeTimer / this.shieldRechargeDelay : 1.0,
      state: this.state,
      primaryColor: this.primaryColor
    };
  }
}
