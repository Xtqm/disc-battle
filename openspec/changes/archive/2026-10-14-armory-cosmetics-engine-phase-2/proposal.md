# Proposal: Phase 2: Dynamic Three.js Cosmetic Shader & Material Engine (SPEC-ARMORY-001)

## Why

Following Phase 1 of SPEC-ARMORY-001 (which established catalog metadata, economy transactions, persistent unlock storage, and loadout equipment tracking), the equipped cosmetics currently exist only as serialized IDs in storage. The active 3D gameplay meshes—specifically the player's Identity Disc, disc flight trails, and Program Chassis avatar—continue to render with static hardcoded colors and default materials. Without a dynamic material and shader application engine, player loadout selections have no visual manifestation in the arena, and the upcoming Armory UI lacks an interactive 3D inspection mechanism for previewing unlocked or purchasable items prior to acquisition. Phase 2 introduces `CosmeticMaterialEngine` and `ArmoryPreviewScene` to dynamically translate loadout configurations into live Three.js shaders and materials, manage WebGL GPU resources safely without memory leaks, and render high-performance 3D turntable previews for cosmetic inspection.

## What Changes

- **Dynamic Cosmetic Material Engine (`src/armory/CosmeticMaterialEngine.js`)**:
  - Implement `CosmeticMaterialEngine` singleton that binds to `ArmoryManager` and coordinates with the live Three.js scene graph.
  - Subscribe to `LOADOUT_CHANGED` events from `ArmoryManager` and automatically hydrate visual materials from the active loadout on initialization/boot.
  - Apply **Disc Skin** configurations to the player's Identity Disc meshes (and held/thrown instances):
    - Update outer rim emissive color (`MeshBasicMaterial` / `MeshStandardMaterial` emissive).
    - Modulate core ring glow intensity and inner translucency matching item shader definitions.
    - Dynamically recolor attached `PointLight` components to cast matching ambient photon radiance.
    - Toggle retro wireframe overlay meshes or wireframe material properties when specified by catalog shaders (e.g. `disc_corrupted_void`).
  - Apply **Disc Flight Trail Shader** parameters:
    - Supply interpolated primary and secondary emissive hex colors and opacity values to active disc flight ribbons and particle trails.
  - Apply **Program Chassis Skin** configurations to the player character rig:
    - Update armor plating base materials (torso, head, limbs) with configurable `roughness`, `metalness`, and diffuse tone.
    - Dynamically update neon circuit strips, visor, belt, and chest trim materials with primary/secondary emissive colors.
    - Synchronize back-mounted disc mesh styling to match equipped disc skin.

- **Memory-Safe WebGL Resource Management**:
  - Implement in-place mutation of Three.js `Color` instances, scalar uniforms, and opacity properties where meshes persist to minimize object allocations and avoid garbage collection hiccups.
  - Enforce explicit `.dispose()` calls on transient materials, generated overlay geometries, or swapped textures when cosmetics change, preventing WebGL GPU memory leaks and dangling shader programs.
  - Provide safe cleanup and detachment hooks when tearing down or reinitializing meshes.

- **Interactive Turntable Preview Scene (`src/armory/ArmoryPreviewScene.js`)**:
  - Create a self-contained, lightweight Three.js sub-scene and camera rig designed for embedding within the Armory UI modal or canvas overlay.
  - Render an isolated, smoothly rotating 3D preview of any queried Disc skin or Program Chassis model with dedicated studio key and rim lighting.
  - Support manual rotation/drag controls and auto-rotation turntable idle animation with frame-rate throttling when hidden/idle.
  - Provide a clean `.dispose()` and resize API ensuring zero residual WebGL contexts or animation loop leaks upon closing the Armory preview.

- **Automated Test Suite (`test/armory/cosmetic_material_engine.test.js`)**:
  - Unit test `CosmeticMaterialEngine` loadout event subscription, initial loadout boot sync, disc material mutation, chassis material mutation, and wireframe overlay toggling.
  - Test memory disposal guarantees (asserting `.dispose()` invocation counts on swapped materials).
  - Test `ArmoryPreviewScene` instantiation, item staging, turntable animation updates, and destruction lifecycle.

## Capabilities

### New Capabilities
*(None — Phase 2 builds directly upon the existing `armory-catalog` capability specification established in Phase 1).*

### Modified Capabilities
- `armory-catalog`: Adds requirements for runtime Three.js cosmetic material application (Identity Disc outer rim, core glow, point light, and retro wireframe overlay), dynamic flight trail ribbon and particle color interpolation, Program Chassis armor plate PBR tuning and neon circuit emissives, memory-safe WebGL resource disposal, and isolated 3D turntable preview scene rendering.

## Impact

- **New Files**:
  - `src/armory/CosmeticMaterialEngine.js`: Event-driven material and shader applicator for Identity Discs, trails, and Program Chassis rigs.
  - `src/armory/ArmoryPreviewScene.js`: Dedicated Three.js turntable preview renderer and camera rig for cosmetic inspection.
  - `test/armory/cosmetic_material_engine.test.js`: Domain unit tests verifying material styling, loadout synchronization, disposal lifecycle, and preview staging.
- **Modified Files**:
  - `src/graphics/materials.js`: Expose structured material hooks or tags on `makeDisc` and `makeProgram` to facilitate deterministic cosmetic traversal and uniform mutation.
  - `src/entities/Disc.js`: Integrate cosmetic material updates for active and thrown player discs and flight ribbons.
  - `src/graphics/scene.js`: Initialize and register `CosmeticMaterialEngine` upon player rig and scene initialization.
  - `package.json`: Ensure test runner includes cosmetic engine tests under `npm run test:armory`.
- **Dependencies**: Uses existing Three.js (`vendor/three.module.js`), `ArmoryManager`, `ArmoryCatalog`, and `StorageManager`. Zero additional external npm dependencies.
