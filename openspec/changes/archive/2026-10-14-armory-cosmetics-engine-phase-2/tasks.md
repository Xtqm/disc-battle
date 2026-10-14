# Tasks

## 1. Mesh Semantic Tagging & Shader Foundation

- [x] 1.1 Tag sub-mesh components in `src/graphics/materials.js` for `makeDisc()` (`disc_outer`, `disc_face`, `disc_hub`, `disc_light`) and `makeProgram()` (`chassis_suit`, `chassis_trim`, `chassis_visor`, `chassis_back_disc`) to provide deterministic traversal hooks, and verify components retain explicit part identifiers.
- [x] 1.2 Ensure `makeDisc()` and `makeProgram()` construct dedicated material instances for character rigs and preview models to prevent unintended side effects on shared scene materials, verifying with unit tests.

## 2. Cosmetic Material Engine Implementation

- [x] 2.1 Implement `src/armory/CosmeticMaterialEngine.js` singleton with `init()`, `ArmoryManager` `LOADOUT_CHANGED` event subscription, and initial loadout hydration from storage on boot.
- [x] 2.2 Implement `applyDiscSkin(mesh, skinIdOrConfig)` to dynamically update outer rim emissive colors, core ring glow intensity, internal translucency, point light color, and optional retro wireframe overlay mesh creation/toggling.
- [x] 2.3 Implement `applyChassisSkin(playerRig, skinIdOrConfig)` to dynamically adjust armor plating PBR roughness/metalness, update neon circuit trim emissive colors across visor/torso/limbs, and synchronize back-mounted disc styling.
- [x] 2.4 Implement `getTrailConfig(discSkinId)` in `CosmeticMaterialEngine` to supply primary/secondary color interpolation and opacity parameters for projectile flight ribbons and particle trails.

## 3. WebGL Resource Management & Memory Safety

- [x] 3.1 Implement recursive `disposeHierarchy(object3D)` utility in `CosmeticMaterialEngine` to cleanly dispose geometries, materials, and textures on transient auxiliary meshes.
- [x] 3.2 Implement in-place mutation of Three.js `Color` instances and scalar uniforms on persistent materials to eliminate allocation churn during cosmetic updates, verifying with disposal and allocation unit tests.

## 4. Turntable Preview Renderer (`ArmoryPreviewScene.js`)

- [x] 4.1 Implement `src/armory/ArmoryPreviewScene.js` encapsulating an isolated `THREE.Scene`, `THREE.PerspectiveCamera`, `THREE.WebGLRenderer`, and dedicated studio key/fill lighting rig.
- [x] 4.2 Implement `previewDisc(discSkinId)` and `previewChassis(chassisSkinId)` staging methods that frame and center models with proper camera frustum positioning.
- [x] 4.3 Implement pointer drag / touch swipe rotation controls and smooth auto-rotation turntable loop with render throttling when paused or hidden.
- [x] 4.4 Implement `dispose()` teardown method on `ArmoryPreviewScene` that halts animation loops, removes DOM elements, disposes all scene objects/materials, and releases WebGL contexts.

## 5. Live Scene Integration & Verification

- [x] 5.1 Wire `CosmeticMaterialEngine` into `src/graphics/scene.js` (`initGraphics`) to automatically style `state.player.obj` upon scene boot.
- [x] 5.2 Update `src/entities/Disc.js` (`spawnDisc`) to apply active disc skin cosmetics and trail parameters when thrown by player.
- [x] 5.3 Create automated test suite `test/armory/cosmetic_material_engine.test.js` covering engine initialization, loadout event dispatching, disc/chassis skin application, wireframe toggling, memory disposal guarantees, and preview scene lifecycle, and verify `node test/runner.js armory` passes with 100% success.
