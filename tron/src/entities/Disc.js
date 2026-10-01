import * as THREE from '../../vendor/three.module.js';
import { state, player } from '../core/state.js';
import { config } from '../core/config.js';
import { scene } from '../graphics/scene.js';
import { makeDisc, tmp, _discMat, _fwd, _r0, _u0, _uBank, _rBank, _localX, _localY } from '../graphics/materials.js';
import { burst } from '../graphics/particles.js';
import { shake, message } from '../ui/UIManager.js';
import { lineOfSight } from '../physics/collision.js';
import { getTileAt, triggerTileWarning, pillars } from './Arena.js';
import { onTileDestabilizedByHost } from '../network/sync.js';
import { damagePlayer } from './Player.js';
import { SFX } from '../audio/sfx.js';
import { getRoomRef, roomUpdateDoc } from '../network/firebaseSetup.js';

export function spawnDisc(pos, vel, owner, color, curve = 0) {
  const obj = makeDisc(color);
  obj.position.copy(pos);
  scene.add(obj);
  const d = {
    obj,
    pos: pos.clone(),
    vel: vel.clone(),
    owner,
    originalOwner: owner,
    color,
    bounces: 0,
    deflectBounces: 0,
    deflectTime: 0,
    isDeflected: false,
    t: 0,
    returning: false,
    spin: 0,
    curve,
    hitFoes: new Set()
  };
  state.discs.push(d);
  return d;
}

export function updateDiscs(dt) {
  for (let i = state.discs.length - 1; i >= 0; i--) {
    const D = state.discs[i];
    D.t += dt;
    D.spin += dt * 26;

    const holder = D.owner === 'player' ? player : D.owner;
    let holderAlive = false;
    if (D.owner === 'player') holderAlive = state.player.alive;
    else if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
      if (D.owner && D.owner.alive !== undefined) holderAlive = D.owner.alive;
    } else {
      holderAlive = state.foes.includes(D.owner);
    }

    if (!holderAlive) {
      scene.remove(D.obj);
      state.discs.splice(i, 1);
      continue;
    }

    // Deflection miss handling
    if (D.isDeflected) {
      D.deflectTime = (D.deflectTime || 0) + dt;
      if ((D.deflectTime >= 1.5 || (D.deflectBounces || 0) >= 2) && !D.returning) {
        D.isDeflected = false;
        D.returning = true;
        const targetFoe = (D.originalOwner && state.foes.includes(D.originalOwner)) ? D.originalOwner : (state.foes[0] || null);
        if (targetFoe) {
          D.owner = targetFoe;
          D.color = config.ORANGE;
          D.obj.traverse(o => {
            if (o.material && o.material.color) o.material.color.setHex(config.ORANGE);
            if (o.isPointLight) o.color.setHex(config.ORANGE);
          });
        }
      }
    }

    if (!D.returning && (D.t > 1.5 || D.bounces >= 3)) D.returning = true;

    if (D.returning) {
      const home = holder.pos.clone().setY(1.7 + (holder.y || 0));
      const dir = home.sub(D.pos);
      const L = dir.length();
      dir.normalize();
      D.vel.lerp(dir.multiplyScalar(34), 1 - Math.pow(.0005, dt));
      if (L < 1.4) {
        if (D.owner === 'player') {
          state.player.hasDisc = true;
        } else if (D.owner) {
          D.owner.hasDisc = true;
          if (D.owner.obj && D.owner.obj.userData && D.owner.obj.userData.backDisc) {
            D.owner.obj.userData.backDisc.visible = true;
          }
        }
        scene.remove(D.obj);
        state.discs.splice(i, 1);
        continue;
      }
    } else if (D.curve) {
      const vx = D.vel.x, vy = D.vel.y, vz = D.vel.z;
      const speed = Math.hypot(vx, vy, vz);
      const hSpeed = Math.hypot(vx, vz);
      if (hSpeed > 1e-4) {
        const nx = -vz / hSpeed;
        const nz = vx / hSpeed;
        const latAcc = D.curve * config.CURVE_ACCEL * dt;
        let nvx = vx + nx * latAcc;
        let nvz = vz + nz * latAcc;
        const newSpeed = Math.hypot(nvx, vy, nvz);
        if (newSpeed > 1e-4) {
          const s = speed / newSpeed;
          D.vel.x = nvx * s;
          D.vel.y = vy * s;
          D.vel.z = nvz * s;
        }
      }
      D.curve *= Math.exp(-config.CURVE_LAMBDA * dt);
    }

    D.pos.addScaledVector(D.vel, dt);
    if (D.pos.y > config.DISC_R) {
      D.pos.y += (1.7 - D.pos.y) * Math.min(1, dt * 2.2);
    }

    // Floor collision & void plunge
    const yFloor = config.DISC_R;
    const tile = getTileAt(D.pos.x, D.pos.z);
    const isSolid = tile && tile.state !== config.TILE_FALLEN && tile.state !== config.TILE_REBUILDING;

    if (D.pos.y <= yFloor) {
      if (isSolid) {
        if (tile && tile.state === config.TILE_INTACT) {
          triggerTileWarning(tile, D.color);
          if ((state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') && state.playerRole === 'p1') {
            onTileDestabilizedByHost(tile.ix, tile.iz);
          }
        }
        D.pos.y = yFloor;
        if (D.vel.y < 0) {
          const significant = Math.abs(D.vel.y) >= 1.0;
          D.vel.y = -D.vel.y * 0.65;
          D.vel.x *= 0.95;
          D.vel.z *= 0.95;
          if (Math.abs(D.vel.y) < 1.0) D.vel.y = 0;
          if (significant && !D.returning) {
            D.bounces++;
            if (D.hitFoes) D.hitFoes.clear();
            burst(D.pos.clone(), D.color, 10, 6);
            shake(.06);
          }
        }
      } else {
        D.vel.y -= 25 * dt;
        D.voidTime = (D.voidTime || 0) + dt;
        if ((D.voidTime > 1.5 || D.pos.y < -12) && !D.returning) {
          D.returning = true;
        }
      }
    }

    // Wall bounce
    const lim = config.ARENA - 1.5;
    let bounced = false;
    if (D.pos.x > lim) { D.pos.x = lim; D.vel.x *= -1; bounced = true; }
    if (D.pos.x < -lim) { D.pos.x = -lim; D.vel.x *= -1; bounced = true; }
    if (D.pos.z > lim) { D.pos.z = lim; D.vel.z *= -1; bounced = true; }
    if (D.pos.z < -lim) { D.pos.z = -lim; D.vel.z *= -1; bounced = true; }

    // Pillar bounce
    for (const p of pillars) {
      const dx = D.pos.x - p.x, dz = D.pos.z - p.z;
      const dd = Math.hypot(dx, dz), min = p.r + config.DISC_R;
      if (dd < min && dd > .001) {
        const nx = dx / dd, nz = dz / dd;
        D.pos.x = p.x + nx * min;
        D.pos.z = p.z + nz * min;
        const dot = D.vel.x * nx + D.vel.z * nz;
        D.vel.x -= 2 * dot * nx;
        D.vel.z -= 2 * dot * nz;
        bounced = true;
      }
    }
    if (bounced) {
      if (D.isDeflected) {
        D.deflectBounces = (D.deflectBounces || 0) + 1;
      }
      if (!D.returning) {
        D.bounces++;
        if (D.hitFoes) D.hitFoes.clear();
        D.curve = -D.curve * 0.5;
        burst(D.pos.clone(), D.color, 10, 6);
        shake(.06);
      }
    }

    // Disc collision against characters
    let discCaught = false;
    if (D.owner === 'player') {
      for (const f of state.foes) {
        if (D.hitFoes && D.hitFoes.has(f)) continue;
        const fCenter = tmp.copy(f.pos).setY(1.5 + (f.y || 0));
        const dist = D.pos.distanceTo(fCenter);

        // AI Threat Detection & Catch Window for deflected discs
        if (D.isDeflected && dist <= 2.2) {
          const toFoe = fCenter.clone().sub(D.pos);
          const movingToward = D.vel.dot(toFoe) > 0;
          const fwd = new THREE.Vector3(
            Math.sin(f.obj.rotation.y),
            0,
            Math.cos(f.obj.rotation.y)
          ).normalize();
          const toDisc = D.pos.clone().sub(f.pos).setY(0);
          const toDiscLen = toDisc.length();
          const facingDot = toDiscLen > 1e-4 ? fwd.dot(toDisc.normalize()) : 1;
          const hasLos = lineOfSight(f.pos, D.pos);

          if (movingToward && facingDot > 0.2 && hasLos) {
            const catchChance = ((state.gameMode === 'duel' || state.gameMode === 'duel_ai') && f.isBoss)
              ? Math.min(0.85, 0.75 + ((state.tier || state.duelTier) - 1) * 0.03)
              : 0.35;
            if (Math.random() < catchChance) {
              scene.remove(D.obj);
              state.discs.splice(i, 1);
              f.hasDisc = true;
              if (f.obj && f.obj.userData && f.obj.userData.backDisc) {
                f.obj.userData.backDisc.visible = true;
              }
              burst(f.pos.clone().setY(1.7 + (f.y || 0)), config.WHITE, 28, 11);
              burst(f.pos.clone().setY(1.7 + (f.y || 0)), config.ORANGE, 14, 7);
              shake(0.2);
              message('RIVAL CAUGHT DISC!');
              f.cd = 0.35 + Math.random() * 0.4;
              if (f.isBoss) f.state = 'ATTACK';
              discCaught = true;
              break;
            } else {
              if (!D.hitFoes) D.hitFoes = new Set();
              D.hitFoes.add(f);
              const critDmg = 85 + D.bounces * 20;
              f.hp -= critDmg;
              f.hurt = 0.8;
              f.cd = Math.max(f.cd, 0.8);
              state.score += 150;
              message('DEFLECTION HIT!');
              burst(D.pos.clone(), config.WHITE, 32, 12);
              burst(D.pos.clone(), config.ORANGE, 20, 8);
              shake(0.25);
              if (f.hp <= 0) {
                if (typeof window !== 'undefined' && window.__tronKillFoe) {
                  window.__tronKillFoe(f);
                }
              } else {
                D.vel.multiplyScalar(-0.4);
                D.vel.x += (Math.random() - 0.5) * 4;
                D.vel.z += (Math.random() - 0.5) * 4;
                D.vel.y = Math.random() * 2 + 1;
                D.isDeflected = false;
                D.color = config.ORANGE;
                D.obj.traverse(o => {
                  if (o.material && o.material.color) o.material.color.setHex(config.ORANGE);
                  if (o.isPointLight) o.color.setHex(config.ORANGE);
                });
                D.owner = f;
                D.returning = true;
              }
              discCaught = true;
              break;
            }
          }
        }

        if (dist < config.FOE_R + config.DISC_R + .35) {
          if (!D.hitFoes) D.hitFoes = new Set();
          D.hitFoes.add(f);

          if (D.isDeflected) {
            const critDmg = 85 + D.bounces * 20;
            f.hp -= critDmg;
            f.hurt = 0.8;
            f.cd = Math.max(f.cd, 0.8);
            state.score += 150;
            message('DEFLECTION HIT!');
            burst(D.pos.clone(), config.WHITE, 32, 12);
            burst(D.pos.clone(), config.ORANGE, 20, 8);
            shake(0.25);
            if (f.hp <= 0) {
              if (typeof window !== 'undefined' && window.__tronKillFoe) {
                window.__tronKillFoe(f);
              }
            } else {
              D.vel.multiplyScalar(-0.4);
              D.vel.x += (Math.random() - 0.5) * 4;
              D.vel.z += (Math.random() - 0.5) * 4;
              D.vel.y = Math.random() * 2 + 1;
              D.isDeflected = false;
              D.color = config.ORANGE;
              D.obj.traverse(o => {
                if (o.material && o.material.color) o.material.color.setHex(config.ORANGE);
                if (o.isPointLight) o.color.setHex(config.ORANGE);
              });
              D.owner = f;
              D.returning = true;
            }
            discCaught = true;
            break;
          }

          const fwd = new THREE.Vector3(
            Math.sin(f.obj.rotation.y),
            0,
            Math.cos(f.obj.rotation.y)
          ).normalize();

          const dRel = D.pos.clone().sub(f.pos).setY(0);
          if (dRel.lengthSq() > 1e-6) dRel.normalize();
          const posRear = dRel.dot(fwd) < 0.05;

          const vNorm = D.vel.clone().setY(0);
          if (vNorm.lengthSq() > 1e-6) vNorm.normalize();
          const velRear = vNorm.dot(fwd) > 0.05;
          const rear = posRear || velRear;

          let dmg = 55 + D.bounces * 18;
          if (rear && D.bounces > 0) {
            dmg = (55 + D.bounces * 18) * 2.0;
            state.score += 150;
            message('REAR STRIKE  x2');
            burst(D.pos.clone(), config.WHITE, 34, 13);
            shake(.3);
          } else if (rear) {
            dmg *= 1.4;
            state.score += 60;
            burst(D.pos.clone(), config.WHITE, 20, 10);
            shake(.18);
          } else {
            burst(D.pos.clone(), config.ORANGE, 24, 9);
            shake(.15);
          }

          f.hp -= dmg;
          f.hurt = .25;
          state.score += 25;
          D.returning = true;
          if (f.hp <= 0) {
            if (typeof window !== 'undefined' && window.__tronKillFoe) {
              window.__tronKillFoe(f);
            }
          }

          if (D.pos.distanceTo(tmp.copy(holder.pos).setY(1.7 + (holder.y || 0))) < 1.4) {
            state.player.hasDisc = true;
            scene.remove(D.obj);
            state.discs.splice(i, 1);
            discCaught = true;
          }
          break;
        }
      }
    } else if (state.player.alive) {
      let isTeammate = false;
      if (state.gameMode === 'duos_multi' && D.owner && D.owner.team !== undefined) {
        const myTeam = (state.playerRole === 'p1' || state.playerRole === 'p3') ? 1 : 2;
        if (D.owner.team === myTeam) isTeammate = true;
      }
      
      const pc = tmp.copy(state.player.pos).setY(1.5 + state.player.y);
      if (!isTeammate && D.pos.distanceTo(pc) < config.PLAYER_R + config.DISC_R + .35) {
        const toDisc = D.pos.clone().sub(pc).setY(0).normalize();
        const facing = new THREE.Vector3(-Math.sin(state.player.yaw), 0, -Math.cos(state.player.yaw));
        if (state.player.blocking && state.player.hasDisc && toDisc.dot(facing) > .35) {
          burst(D.pos.clone(), config.WHITE, 30, 12);
          shake(.25);
          state.score += 50;
          D.originalOwner = (D.owner !== 'player') ? D.owner : (D.originalOwner || state.foes[0]);
          D.owner = 'player';
          D.color = config.WHITE;
          D.isDeflected = true;
          D.returning = false;
          D.bounces = 0;
          D.deflectBounces = 0;
          D.deflectTime = 0;
          D.t = 0;
          D.curve = 0;
          if (D.hitFoes) D.hitFoes.clear();
          D.obj.traverse(o => {
            if (o.material && o.material.color) o.material.color.setHex(config.WHITE);
            if (o.isPointLight) o.color.setHex(config.WHITE);
          });
          const incomingSpd = D.vel.length();
          const spd = Math.max(36, incomingSpd * 1.25);
          let targetFoe = (D.originalOwner && state.foes.includes(D.originalOwner)) ? D.originalOwner : state.foes[0];
          if (!targetFoe && state.foes.length > 0) targetFoe = state.foes[0];
          if (targetFoe) {
            const dirToRival = targetFoe.pos.clone().setY(1.7 + (targetFoe.y || 0)).sub(D.pos).normalize();
            D.vel.copy(dirToRival).multiplyScalar(spd);
          } else {
            D.vel.copy(facing).multiplyScalar(spd);
          }

          if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
            if (state.db && state.currentRoomId && state.currentUser) {
              const roomRef = getRoomRef(state.currentRoomId);
              roomUpdateDoc(roomRef, {
                lastThrow: {
                  id: Math.random().toString(36).substring(2, 9),
                  sender: state.playerRole,
                  x: +D.pos.x.toFixed(2),
                  y: +D.pos.y.toFixed(2),
                  z: +D.pos.z.toFixed(2),
                  vx: +D.vel.x.toFixed(2),
                  vy: +D.vel.y.toFixed(2),
                  vz: +D.vel.z.toFixed(2),
                  curve: 0
                }
              }).catch(err => console.warn("Parry sync err:", err));
            }
          }
          D.pos.addScaledVector(toDisc, 1.2);
          message('DEFLECTED!');
        } else {
          const behind = toDisc.dot(facing) < -0.25;
          damagePlayer((16 + D.bounces * 6) * (behind && D.bounces > 0 ? 1.8 : 1));
          if (behind && D.bounces > 0) message('HIT FROM BEHIND');
          burst(D.pos.clone(), config.ORANGE, 18, 7);
          shake(0.18);

          D.vel.multiplyScalar(-0.45);
          D.vel.x += (Math.random() - 0.5) * 4;
          D.vel.z += (Math.random() - 0.5) * 4;
          D.vel.y = Math.random() * 2 + 1;
          D.bounces = 0;
          D.curve = 0;
          D.isDeflected = false;
          D.returning = true;

          if (D.pos.distanceTo(tmp.copy(holder.pos).setY(1.7 + (holder.y || 0))) < 1.4) {
            if (D.owner === 'player') {
              state.player.hasDisc = true;
            } else if (D.owner) {
              D.owner.hasDisc = true;
              if (D.owner.obj && D.owner.obj.userData && D.owner.obj.userData.backDisc) {
                D.owner.obj.userData.backDisc.visible = true;
              }
            }
            scene.remove(D.obj);
            state.discs.splice(i, 1);
            discCaught = true;
            SFX.catchDisc();
          }
        }
      }
    }

    if (discCaught) continue;

    D.obj.position.copy(D.pos);
    const vx = D.vel.x, vy = D.vel.y, vz = D.vel.z;
    const spd = Math.hypot(vx, vy, vz);
    const hSpd = Math.hypot(vx, vz);
    if (hSpd > 1e-4 && spd > 1e-4) {
      _fwd.set(vx / spd, vy / spd, vz / spd);
      _r0.set(-vz / hSpd, 0, vx / hSpd);
      _u0.crossVectors(_r0, _fwd);

      const beta = (D.curve || 0) * 0.45 + Math.sin(D.spin * 0.2) * 0.08;
      const sinB = Math.sin(beta), cosB = Math.cos(beta);
      _uBank.copy(_u0).multiplyScalar(cosB).addScaledVector(_r0, sinB);
      _rBank.copy(_r0).multiplyScalar(cosB).addScaledVector(_u0, -sinB);

      const sinS = Math.sin(D.spin), cosS = Math.cos(D.spin);
      _localX.copy(_rBank).multiplyScalar(cosS).addScaledVector(_fwd, sinS);
      _localY.copy(_fwd).multiplyScalar(cosS).addScaledVector(_rBank, -sinS);

      _discMat.makeBasis(_localX, _localY, _uBank);
      D.obj.quaternion.setFromRotationMatrix(_discMat);
    } else {
      D.obj.rotation.set(Math.PI / 2 + Math.sin(D.spin * .2) * .25, 0, D.spin);
    }
  }
}
