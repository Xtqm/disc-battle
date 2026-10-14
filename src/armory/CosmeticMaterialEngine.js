/**
 * CosmeticMaterialEngine.js
 * Dynamic Three.js Material & Cosmetic Shader Engine for Tron Disc Arena (SPEC-ARMORY-001 Phase 2).
 * Translates active Armory loadout selections into live WebGL mesh materials,
 * handles retro wireframe overlays, supplies flight trail shader parameters,
 * and enforces zero-leak WebGL resource disposal.
 */

import * as THREE from '../../vendor/three.module.js';
import { ARMORY_CATEGORIES, getCatalogItem } from './ArmoryCatalog.js';
import { armoryManager as defaultArmoryManager, ArmoryEvents } from './ArmoryManager.js';
import { config } from '../core/config.js';

/**
 * PBR surface presets for Program Chassis armor plating.
 */
export const CHASSIS_PBR_PRESETS = Object.freeze({
  chassis_default: Object.freeze({
    roughness: 0.35,
    metalness: 0.9,
    suitColor: 0x07090c
  }),
  chassis_infiltrator: Object.freeze({
    roughness: 0.85,
    metalness: 0.2,
    suitColor: 0x040608
  }),
  chassis_iso_guardian: Object.freeze({
    roughness: 0.2,
    metalness: 0.95,
    suitColor: 0x121210
  }),
  chassis_black_guard: Object.freeze({
    roughness: 0.3,
    metalness: 0.9,
    suitColor: 0x0a0404
  }),
  chassis_arbiter: Object.freeze({
    roughness: 0.15,
    metalness: 0.85,
    suitColor: 0xe0e0e0
  })
});

/**
 * Recursively disposes all geometries, materials, and textures attached to an Object3D hierarchy.
 * @param {THREE.Object3D} object3D
 */
export function disposeHierarchy(object3D) {
  if (!object3D) return;

  object3D.traverse((child) => {
    if (child.isMesh || child.isPoints || child.isLine) {
      if (child.geometry && typeof child.geometry.dispose === 'function') {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          for (const mat of child.material) {
            if (mat && typeof mat.dispose === 'function') {
              mat.dispose();
            }
          }
        } else if (typeof child.material.dispose === 'function') {
          child.material.dispose();
        }
      }
    }
  });

  if (object3D.parent) {
    object3D.parent.remove(object3D);
  }
}

export class CosmeticMaterialEngine {
  /**
   * @param {object} [options]
   * @param {import('./ArmoryManager.js').ArmoryManager} [options.armory]
   * @param {THREE.Group} [options.playerObj]
   * @param {THREE.Group|THREE.Mesh} [options.playerDiscMesh]
   */
  constructor(options = {}) {
    this.armory = options.armory || defaultArmoryManager;
    this.playerObj = options.playerObj || null;
    this.playerDiscMesh = options.playerDiscMesh || null;
    this._unsubscribeArmory = null;
    this.isInitialized = false;

    // Track active cosmetic IDs
    this.activeDiscSkinId = null;
    this.activeChassisSkinId = null;
  }

  /**
   * Initializes the engine, subscribes to ArmoryManager loadout changes,
   * and hydrates initial materials from storage.
   * @param {object} [options]
   * @returns {CosmeticMaterialEngine}
   */
  init(options = {}) {
    if (options.armory) this.armory = options.armory;
    if (options.playerObj) this.playerObj = options.playerObj;
    if (options.playerDiscMesh) this.playerDiscMesh = options.playerDiscMesh;

    // Unsubscribe from prior armory instance if present
    if (this._unsubscribeArmory) {
      this._unsubscribeArmory();
      this._unsubscribeArmory = null;
    }

    if (this.armory && typeof this.armory.on === 'function') {
      this._unsubscribeArmory = this.armory.on(ArmoryEvents.LOADOUT_CHANGED, (payload) => {
        this.onLoadoutChanged(payload);
      });
    }

    this.hydrateFromLoadout();
    this.isInitialized = true;
    return this;
  }

  /**
   * Sets the active player character 3D rig and immediately applies loadout styling.
   * @param {THREE.Group} rig
   */
  setPlayerRig(rig) {
    this.playerObj = rig;
    if (this.isInitialized) {
      this.hydrateFromLoadout();
    }
  }

  /**
   * Sets the active player Identity Disc mesh instance and immediately applies styling.
   * @param {THREE.Group|THREE.Mesh} mesh
   */
  setPlayerDiscMesh(mesh) {
    this.playerDiscMesh = mesh;
    if (this.isInitialized) {
      this.hydrateFromLoadout();
    }
  }

  /**
   * Resolves cosmetic item definition from an ID or configuration object.
   * @param {string} category
   * @param {string|object} itemOrId
   * @returns {object|null}
   */
  resolveItem(category, itemOrId) {
    if (!itemOrId) return null;
    if (typeof itemOrId === 'object') {
      if (itemOrId.shader) return itemOrId;
      if (itemOrId.id) {
        const found = getCatalogItem(itemOrId.id);
        if (found) return found;
      }
      return itemOrId;
    }
    return getCatalogItem(itemOrId);
  }

  /**
   * Reads active loadout from ArmoryManager and updates all registered 3D meshes.
   */
  hydrateFromLoadout() {
    if (!this.armory || typeof this.armory.getEquippedLoadout !== 'function') return;

    const loadout = this.armory.getEquippedLoadout();
    if (!loadout) return;

    if (loadout.discSkin) {
      this.activeDiscSkinId = loadout.discSkin;
      if (this.playerDiscMesh) {
        this.applyDiscSkin(this.playerDiscMesh, loadout.discSkin);
      }
      if (this.playerObj && this.playerObj.userData && this.playerObj.userData.backDisc) {
        this.applyDiscSkin(this.playerObj.userData.backDisc, loadout.discSkin);
      }
    }

    if (loadout.chassisSkin && this.playerObj) {
      this.activeChassisSkinId = loadout.chassisSkin;
      this.applyChassisSkin(this.playerObj, loadout.chassisSkin);
    }
  }

  /**
   * Handles LOADOUT_CHANGED event dispatched by ArmoryManager.
   * @param {object} payload
   */
  onLoadoutChanged(payload) {
    if (!payload || !payload.category) return;
    const { category, itemId } = payload;

    if (category === ARMORY_CATEGORIES.DISC_SKINS) {
      this.activeDiscSkinId = itemId;
      if (this.playerDiscMesh) {
        this.applyDiscSkin(this.playerDiscMesh, itemId);
      }
      if (this.playerObj && this.playerObj.userData && this.playerObj.userData.backDisc) {
        this.applyDiscSkin(this.playerObj.userData.backDisc, itemId);
      }
    } else if (category === ARMORY_CATEGORIES.CHASSIS_SKINS) {
      this.activeChassisSkinId = itemId;
      if (this.playerObj) {
        this.applyChassisSkin(this.playerObj, itemId);
      }
    }
  }

  /**
   * Applies Disc Skin configuration to an Identity Disc mesh group or sub-mesh.
   * Mutates existing colors in-place and manages retro wireframe overlays.
   * @param {THREE.Object3D} discMesh
   * @param {string|object} skinIdOrConfig
   * @returns {boolean} True if successfully applied
   */
  applyDiscSkin(discMesh, skinIdOrConfig) {
    if (!discMesh) return false;

    const item = this.resolveItem(ARMORY_CATEGORIES.DISC_SKINS, skinIdOrConfig);
    const shader = item?.shader || {
      primaryHex: '#00f3ff',
      secondaryEmissiveHex: '#0066ff',
      trailOpacity: 0.85,
      wireframeToggle: false,
      glowIntensity: 1.5
    };

    const primaryColor = new THREE.Color(shader.primaryHex);
    const secondaryColor = new THREE.Color(shader.secondaryEmissiveHex);
    const glowScale = typeof shader.glowIntensity === 'number' ? shader.glowIntensity : 1.5;

    // Direct single mesh case (e.g. back-mounted simplified disc)
    if (discMesh.isMesh && discMesh.material && discMesh.userData.part === 'chassis_back_disc') {
      if (discMesh.material.color) {
        discMesh.material.color.copy(primaryColor);
      }
      return true;
    }

    // Traverse disc hierarchy and mutate parts in-place
    let outerMesh = discMesh.userData?.outerMesh || null;
    let faceMesh = discMesh.userData?.faceMesh || null;
    let hubMesh = discMesh.userData?.hubMesh || null;
    let pointLight = discMesh.userData?.pointLight || null;

    if (!outerMesh || !faceMesh || !pointLight) {
      discMesh.traverse((child) => {
        if (child.userData?.part === 'disc_outer') outerMesh = child;
        else if (child.userData?.part === 'disc_face') faceMesh = child;
        else if (child.userData?.part === 'disc_hub') hubMesh = child;
        else if (child.userData?.part === 'disc_light' || child.isPointLight) pointLight = child;
        else if (!outerMesh && child.isMesh && child.geometry?.type === 'TorusGeometry') outerMesh = child;
        else if (!faceMesh && child.isMesh && child.geometry?.type === 'CircleGeometry') faceMesh = child;
      });
    }

    // 1. Outer rim emissive update
    if (outerMesh && outerMesh.material && outerMesh.material.color) {
      outerMesh.material.color.copy(primaryColor);
    }

    // 2. Translucent face disc update
    if (faceMesh && faceMesh.material && faceMesh.material.color) {
      faceMesh.material.color.copy(primaryColor);
      faceMesh.material.opacity = Math.min(0.65, 0.22 * (glowScale / 1.5));
      faceMesh.material.transparent = true;
    }

    // 3. Central hub color
    if (hubMesh && hubMesh.material && hubMesh.material.color) {
      hubMesh.material.color.set(config.WHITE || 0xffffff);
    }

    // 4. Point light radiance update
    if (pointLight) {
      pointLight.color.copy(primaryColor);
      pointLight.intensity = 2.4 * (glowScale / 1.5);
    }

    // 5. Retro Wireframe Overlay Management
    const shouldHaveWireframe = !!shader.wireframeToggle;
    let wireframeMesh = discMesh.userData?.wireframeOverlay;

    if (shouldHaveWireframe) {
      if (!wireframeMesh) {
        // Instantiate auxiliary wireframe overlay geometry and material
        const radius = config.DISC_R || 0.6;
        const wfGeo = new THREE.TorusGeometry(radius, 0.088, 8, 20);
        const wfMat = new THREE.MeshBasicMaterial({
          color: secondaryColor,
          wireframe: true,
          transparent: true,
          opacity: 0.85
        });
        wireframeMesh = new THREE.Mesh(wfGeo, wfMat);
        wireframeMesh.userData.isWireframeOverlay = true;
        wireframeMesh.userData.part = 'disc_wireframe_overlay';
        discMesh.add(wireframeMesh);
        discMesh.userData.wireframeOverlay = wireframeMesh;
      } else {
        // Mutate existing wireframe overlay color in-place
        if (wireframeMesh.material && wireframeMesh.material.color) {
          wireframeMesh.material.color.copy(secondaryColor);
        }
        wireframeMesh.visible = true;
      }
    } else {
      // Cleanly dispose and detach existing wireframe overlay
      if (wireframeMesh) {
        discMesh.remove(wireframeMesh);
        if (wireframeMesh.geometry && typeof wireframeMesh.geometry.dispose === 'function') {
          wireframeMesh.geometry.dispose();
        }
        if (wireframeMesh.material && typeof wireframeMesh.material.dispose === 'function') {
          wireframeMesh.material.dispose();
        }
        discMesh.userData.wireframeOverlay = null;
      }
    }

    return true;
  }

  /**
   * Applies Program Chassis skin configurations to the player rig.
   * Adjusts armor plating PBR properties, neon trim emissives, and back-mounted disc.
   * @param {THREE.Group} playerRig
   * @param {string|object} skinIdOrConfig
   * @returns {boolean} True if successfully applied
   */
  applyChassisSkin(playerRig, skinIdOrConfig) {
    if (!playerRig) return false;

    const item = this.resolveItem(ARMORY_CATEGORIES.CHASSIS_SKINS, skinIdOrConfig);
    const shader = item?.shader || {
      primaryHex: '#00f3ff',
      secondaryEmissiveHex: '#0066ff',
      glowIntensity: 1.2
    };

    const primaryColor = new THREE.Color(shader.primaryHex);
    const secondaryColor = new THREE.Color(shader.secondaryEmissiveHex);
    const glowScale = typeof shader.glowIntensity === 'number' ? shader.glowIntensity : 1.2;

    // Resolve PBR parameters from presets or skin properties
    const skinId = typeof skinIdOrConfig === 'string' ? skinIdOrConfig : (item?.id || 'chassis_default');
    const preset = CHASSIS_PBR_PRESETS[skinId] || CHASSIS_PBR_PRESETS.chassis_default;
    const roughness = typeof shader.roughness === 'number' ? shader.roughness : preset.roughness;
    const metalness = typeof shader.metalness === 'number' ? shader.metalness : preset.metalness;
    const suitColor = new THREE.Color(preset.suitColor);

    // 1. Direct mutation via cached rig materials
    if (playerRig.userData?.suitMaterial) {
      playerRig.userData.suitMaterial.roughness = roughness;
      playerRig.userData.suitMaterial.metalness = metalness;
      playerRig.userData.suitMaterial.color.copy(suitColor);
    }
    if (playerRig.userData?.litMaterial) {
      playerRig.userData.litMaterial.color.copy(primaryColor);
    }

    // 2. Traversal guard for decoupled or multi-material rigs
    playerRig.traverse((child) => {
      const part = child.userData?.part;

      if (part === 'chassis_suit' && child.material) {
        if (child.material.color) child.material.color.copy(suitColor);
        if ('roughness' in child.material) child.material.roughness = roughness;
        if ('metalness' in child.material) child.material.metalness = metalness;
      } else if ((part === 'chassis_trim' || part === 'chassis_visor') && child.material) {
        if (child.material.color) child.material.color.copy(primaryColor);
      } else if (part === 'chassis_halo' || (child.isPointLight && child !== playerRig.userData?.halo)) {
        child.color.copy(primaryColor);
        child.intensity = 1.6 * (glowScale / 1.2);
      }
    });

    if (playerRig.userData?.halo) {
      playerRig.userData.halo.color.copy(primaryColor);
      playerRig.userData.halo.intensity = 1.6 * (glowScale / 1.2);
    }

    // 3. Synchronize back-mounted disc styling with active equipped disc skin
    const activeDisc = this.activeDiscSkinId || this.armory?.getEquippedLoadout?.()?.discSkin || 'disc_default';
    if (playerRig.userData?.backDisc) {
      this.applyDiscSkin(playerRig.userData.backDisc, activeDisc);
    }

    return true;
  }

  /**
   * Supplies flight trail parameters for projectile flight ribbons and particle systems.
   * @param {string} [discSkinId]
   * @returns {{ primaryHex: string, secondaryEmissiveHex: string, primaryColor: THREE.Color, secondaryColor: THREE.Color, opacity: number, glowIntensity: number }}
   */
  getTrailConfig(discSkinId) {
    const skinId = discSkinId || this.activeDiscSkinId || this.armory?.getEquippedLoadout?.()?.discSkin || 'disc_default';
    const item = this.resolveItem(ARMORY_CATEGORIES.DISC_SKINS, skinId);
    const shader = item?.shader || {
      primaryHex: '#00f3ff',
      secondaryEmissiveHex: '#0066ff',
      trailOpacity: 0.85,
      glowIntensity: 1.5
    };

    return {
      primaryHex: shader.primaryHex,
      secondaryEmissiveHex: shader.secondaryEmissiveHex,
      primaryColor: new THREE.Color(shader.primaryHex),
      secondaryColor: new THREE.Color(shader.secondaryEmissiveHex),
      opacity: typeof shader.trailOpacity === 'number' ? shader.trailOpacity : 0.85,
      glowIntensity: typeof shader.glowIntensity === 'number' ? shader.glowIntensity : 1.5
    };
  }

  /**
   * Cleans up engine subscriptions, disposes wireframe overlays, and clears references.
   */
  dispose() {
    if (this._unsubscribeArmory) {
      this._unsubscribeArmory();
      this._unsubscribeArmory = null;
    }

    if (this.playerDiscMesh && this.playerDiscMesh.userData?.wireframeOverlay) {
      const wf = this.playerDiscMesh.userData.wireframeOverlay;
      this.playerDiscMesh.remove(wf);
      if (wf.geometry && typeof wf.geometry.dispose === 'function') wf.geometry.dispose();
      if (wf.material && typeof wf.material.dispose === 'function') wf.material.dispose();
      this.playerDiscMesh.userData.wireframeOverlay = null;
    }

    this.playerObj = null;
    this.playerDiscMesh = null;
    this.isInitialized = false;
  }
}

// Global authoritative singleton instance
export const cosmeticMaterialEngine = new CosmeticMaterialEngine();
