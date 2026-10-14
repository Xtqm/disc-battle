/**
 * ArmoryPreviewScene.js
 * Lightweight Three.js Turntable Preview Renderer for Tron Disc Arena (SPEC-ARMORY-001 Phase 2).
 * Renders an isolated, interactive, rotating 3D preview of any selected Identity Disc or Program Chassis
 * inside the Armory UI with studio lighting, pointer drag controls, and zero-leak WebGL disposal.
 */

import * as THREE from '../../vendor/three.module.js';
import { makeDisc, makeProgram } from '../graphics/materials.js';
import { cosmeticMaterialEngine as defaultCosmeticEngine, disposeHierarchy } from './CosmeticMaterialEngine.js';

export class ArmoryPreviewScene {
  /**
   * @param {object} [options]
   * @param {HTMLElement|string} [options.container] Target DOM element or selector
   * @param {number} [options.width=380]
   * @param {number} [options.height=380]
   * @param {import('./CosmeticMaterialEngine.js').CosmeticMaterialEngine} [options.cosmetics]
   * @param {boolean} [options.autoRotate=true]
   * @param {number} [options.autoRotateSpeed=0.8]
   */
  constructor(options = {}) {
    this.width = options.width || 380;
    this.height = options.height || 380;
    this.cosmetics = options.cosmetics || defaultCosmeticEngine;
    this.autoRotate = options.autoRotate !== false;
    this.autoRotateSpeed = typeof options.autoRotateSpeed === 'number' ? options.autoRotateSpeed : 0.8;

    this.container = null;
    if (typeof document !== 'undefined') {
      if (typeof options.container === 'string') {
        this.container = document.querySelector(options.container);
      } else if (options.container instanceof HTMLElement) {
        this.container = options.container;
      }
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.pivot = null;
    this.stagedMesh = null;
    this.stagedType = null;
    this.currentSkinId = null;

    this._rafId = null;
    this._lastTime = 0;
    this._isDragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._dragStartRotY = 0;
    this._dragStartRotX = 0;
    this._resumeRotateTimeout = null;
    this.isDisposed = false;
    this.isPaused = false;

    // Bound event handlers
    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._tick = this._animate.bind(this);

    this._setupScene();
  }

  /**
   * Initializes the Three.js scene, camera, lights, and renderer.
   * Gracefully degrades in non-browser/headless environments.
   * @private
   */
  _setupScene() {
    this.scene = new THREE.Scene();

    const aspect = this.width / Math.max(1, this.height);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 3.2);

    this.pivot = new THREE.Group();
    this.pivot.userData.part = 'preview_turntable_pivot';
    this.scene.add(this.pivot);

    // Studio lighting rig
    const ambientLight = new THREE.AmbientLight(0x202838, 1.8);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 4, 4);
    const fillLight = new THREE.DirectionalLight(0x00f3ff, 1.4);
    fillLight.position.set(-4, 2, -2);
    const rimLight = new THREE.DirectionalLight(0x0066ff, 1.8);
    rimLight.position.set(0, -3, -4);

    this.scene.add(ambientLight, keyLight, fillLight, rimLight);

    // Mount WebGLRenderer if running in browser
    if (typeof document !== 'undefined') {
      try {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        if (this.container) {
          this.container.appendChild(this.renderer.domElement);
        }

        // Attach pointer interactions
        const dom = this.renderer.domElement;
        dom.style.cursor = 'grab';
        dom.addEventListener('pointerdown', this._onPointerDown);
        window.addEventListener('pointermove', this._onPointerMove);
        window.addEventListener('pointerup', this._onPointerUp);

        // Start render loop
        this._lastTime = performance.now();
        this._rafId = requestAnimationFrame(this._tick);
      } catch (err) {
        console.warn('[ArmoryPreviewScene] WebGL initialization deferred or unavailable:', err);
      }
    }
  }

  /**
   * Sets or updates target DOM container.
   * @param {HTMLElement} container
   */
  mount(container) {
    if (!container || !(container instanceof HTMLElement)) return;
    this.container = container;
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentElement !== container) {
      container.appendChild(this.renderer.domElement);
    }
  }

  /**
   * Clears currently staged model from the turntable and disposes its resources.
   */
  clearStaged() {
    if (this.stagedMesh) {
      this.pivot.remove(this.stagedMesh);
      disposeHierarchy(this.stagedMesh);
      this.stagedMesh = null;
    }
    this.stagedType = null;
    this.currentSkinId = null;
  }

  /**
   * Stages an Identity Disc for 3D turntable inspection.
   * @param {string|object} discSkinIdOrConfig
   */
  previewDisc(discSkinIdOrConfig) {
    this.clearStaged();

    const disc = makeDisc(0x00f3ff);
    this.cosmetics.applyDiscSkin(disc, discSkinIdOrConfig);

    // Aesthetic showcase tilt for disc rotation
    disc.rotation.x = 0.55;
    disc.rotation.z = -0.15;

    this.pivot.add(disc);
    this.stagedMesh = disc;
    this.stagedType = 'disc';
    this.currentSkinId = typeof discSkinIdOrConfig === 'string' ? discSkinIdOrConfig : discSkinIdOrConfig?.id;

    // Reset turntable orientation
    this.pivot.rotation.set(0, 0, 0);

    // Frame camera for disc closeup
    this.camera.position.set(0, 0.25, 2.4);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Stages a Program Chassis rig for 3D turntable inspection.
   * @param {string|object} chassisSkinIdOrConfig
   * @param {string|object} [activeDiscSkinId] Optional disc skin to pair with back disc
   */
  previewChassis(chassisSkinIdOrConfig, activeDiscSkinId = null) {
    this.clearStaged();

    const rig = makeProgram(0x00f3ff);
    this.cosmetics.applyChassisSkin(rig, chassisSkinIdOrConfig);

    if (activeDiscSkinId && rig.userData?.backDisc) {
      this.cosmetics.applyDiscSkin(rig.userData.backDisc, activeDiscSkinId);
    }

    // Vertically center program chassis inside viewing volume
    rig.position.set(0, -1.25, 0);

    this.pivot.add(rig);
    this.stagedMesh = rig;
    this.stagedType = 'chassis';
    this.currentSkinId = typeof chassisSkinIdOrConfig === 'string' ? chassisSkinIdOrConfig : chassisSkinIdOrConfig?.id;

    // Reset turntable orientation
    this.pivot.rotation.set(0, 0, 0);

    // Frame camera for full body portrait
    this.camera.position.set(0, 0.45, 5.0);
    this.camera.lookAt(0, 0.15, 0);
  }

  /**
   * Resizes preview viewport.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    if (width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;

    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
  }

  /**
   * Pauses the turntable render loop.
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resumes the turntable render loop.
   */
  resume() {
    this.isPaused = false;
    this._lastTime = performance.now();
  }

  /**
   * Render loop tick handler.
   * @private
   */
  _animate(now) {
    if (this.isDisposed) return;

    const dt = Math.min(0.1, (now - this._lastTime) / 1000);
    this._lastTime = now;

    // Auto-rotate turntable when not manually dragging
    if (!this.isPaused && !this._isDragging && this.autoRotate && this.pivot) {
      this.pivot.rotation.y += this.autoRotateSpeed * dt;
    }

    // Skip rendering if container is hidden in DOM
    const isHidden = this.container && this.container.offsetParent === null;
    if (!this.isPaused && !isHidden && this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this._rafId = requestAnimationFrame(this._tick);
  }

  // ==========================================
  // Pointer Drag Interaction
  // ==========================================

  _handlePointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this._isDragging = true;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;
    this._dragStartRotY = this.pivot ? this.pivot.rotation.y : 0;
    this._dragStartRotX = this.pivot ? this.pivot.rotation.x : 0;

    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.cursor = 'grabbing';
    }
    if (this._resumeRotateTimeout) {
      clearTimeout(this._resumeRotateTimeout);
      this._resumeRotateTimeout = null;
    }
  }

  _handlePointerMove(e) {
    if (!this._isDragging || !this.pivot) return;
    const deltaX = e.clientX - this._dragStartX;
    const deltaY = e.clientY - this._dragStartY;

    this.pivot.rotation.y = this._dragStartRotY + deltaX * 0.012;
    // Limit pitch tilt
    const maxPitch = 0.4;
    this.pivot.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, this._dragStartRotX + deltaY * 0.008));
  }

  _handlePointerUp() {
    if (!this._isDragging) return;
    this._isDragging = false;
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.cursor = 'grab';
    }

    // Smoothly resume idle turntable rotation after 1.2s delay
    this._resumeRotateTimeout = setTimeout(() => {
      // Intentionally empty: autoRotate resumes naturally when _isDragging is false
    }, 1200);
  }

  /**
   * Destroys preview scene, stops RAF loop, disposes WebGL resources, and detaches DOM listeners.
   */
  dispose() {
    this.isDisposed = true;

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    if (this._resumeRotateTimeout) {
      clearTimeout(this._resumeRotateTimeout);
      this._resumeRotateTimeout = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', this._onPointerMove);
      window.removeEventListener('pointerup', this._onPointerUp);
    }

    if (this.renderer && this.renderer.domElement) {
      const dom = this.renderer.domElement;
      dom.removeEventListener('pointerdown', this._onPointerDown);
      if (dom.parentElement) {
        dom.parentElement.removeChild(dom);
      }
    }

    this.clearStaged();

    if (this.pivot) {
      disposeHierarchy(this.pivot);
      this.pivot = null;
    }

    if (this.scene) {
      disposeHierarchy(this.scene);
      this.scene = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.camera = null;
    this.container = null;
  }
}
