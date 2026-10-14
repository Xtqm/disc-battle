# Technical Design: Dynamic Three.js Cosmetic Shader & Material Engine (SPEC-ARMORY-001 Phase 2)

## Context

Tron Disc Arena operates on a Three.js WebGL rendering pipeline (`vendor/three.module.js`). Phase 1 of SPEC-ARMORY-001 implemented the authoritative catalog (`ArmoryCatalog.js`), currency transactions, persistent unlocks (`StorageManager`), and loadout equipment tracking (`ArmoryManager.js`). Equipped cosmetics are currently tracked as string identifiers in player profile storage (`loadout.activeDisc`, `loadout.activeChassis`, etc.), but the 3D meshes instantiated during gameplay (`makeDisc`, `makeProgram`) use hardcoded colors (`config.CYAN` / `config.ORANGE`) and static PBR values.

Phase 2 introduces `CosmeticMaterialEngine` to bridge the gap between abstract loadout states and the live WebGL scene graph, and `ArmoryPreviewScene` to provide an interactive 3D inspection viewport for cosmetic skins inside the Armory UI.

## Goals / Non-Goals

**Goals:**
- Provide a decoupled, event-driven `CosmeticMaterialEngine` that listens to `ArmoryManager.LOADOUT_CHANGED` and updates the player's 3D Identity Disc and Program Chassis meshes without requiring scene or entity re-instantiation.
- Support deep visual customization defined by catalog shader parameters: outer rim emissive colors, core ring glow scaling, point light colors, optional retro wireframe overlays, armor plating PBR roughness/metalness, and neon circuit trim emissive tones.
- Supply flight ribbon and particle trail color interpolation parameters (`primaryHex`, `secondaryEmissiveHex`, `trailOpacity`) for thrown projectiles.
- Guarantee memory-safe WebGL resource management: mutate Three.js `Color` and scalar uniform values in-place on permanent meshes, and explicitly `.dispose()` any transient materials, textures, or overlay geometries upon cosmetic swaps.
- Deliver `ArmoryPreviewScene`, a lightweight, isolated Three.js sub-scene/camera rig for rendering rotating 3D previews of any disc or chassis skin with pointer drag controls, auto-turntable animation, and robust lifecycle disposal.

**Non-Goals:**
- Armory HTML/CSS UI modal layout and shop buy/equip buttons (handled in Phase 3 Armory Interface).
- Arena floor tile and environment map dynamic cosmetic restyling (deferred to map skinning phase).
- Bot / AI opponent dynamic cosmetic randomized skins (bots continue using team-assigned colors).
- Custom GLSL vertex/fragment shader programs requiring manual WebGL uniform bindings beyond Three.js built-in PBR/Basic shaders and particle buffers.

## Decisions

### 1. In-Place Mesh Traversal & Semantic Part Tagging
- **Decision**: Rather than rebuilding or replacing the entire player rig or disc mesh whenever a skin changes, tag mesh components inside `makeDisc()` and `makeProgram()` via `userData.part` (e.g. `'disc_outer'`, `'disc_face'`, `'disc_light'`, `'chassis_suit'`, `'chassis_trim'`). The engine traverses the existing object hierarchy and mutates existing material properties and light colors directly.
- **Rationale**: Rebuilding meshes during gameplay causes brief frame drops, breaks active animations or physics parent hierarchies, and creates unnecessary GC pressure. In-place property mutation (`color.set()`, `roughness = X`, `metalness = Y`) executes in microseconds with zero allocations.
- **Alternatives Considered**:
  - *Full Mesh Replacement*: Destroying `state.player.obj` and adding a new instance. Rejected due to potential race conditions with camera tracking, collision capsules, and held disc references.

### 2. Retro Wireframe Overlay as Modular Auxiliary Mesh
- **Decision**: For disc skins that enable retro wireframes (such as `disc_corrupted_void`), attach a dedicated auxiliary child mesh using `THREE.WireframeGeometry` or `THREE.MeshBasicMaterial({ wireframe: true })` tagged with `userData.isWireframeOverlay = true`. When switching to a non-wireframe skin, immediately detach and call `.dispose()` on both the auxiliary material and geometry.
- **Rationale**: Setting `wireframe: true` on the primary outer rim material completely eliminates solid shading, resulting in an unreadable silhouette. A dual-layer overlay maintains solid inner luminance while superimposing vector neon wireframes.
- **Alternatives Considered**:
  - *Custom Shader with Barycentric Wireframe*: Requires custom GLSL attributes and shaders. Excessive complexity for simple retro aesthetics on low-poly primitives.

### 3. Flight Ribbon & Particle Trail Interpolation Pipeline
- **Decision**: In `CosmeticMaterialEngine`, expose a query helper `getTrailConfig(discSkinId)` returning `{ primaryColor, secondaryColor, opacity, glowIntensity }`. In `Disc.js` (`spawnDisc`), when spawned by the player, attach these cosmetic parameters to disc state `D.cosmetics`. During particle bursts and ribbon extrusion, interpolate colors between `primaryColor` and `secondaryColor` along normalized vertex lifetimes.
- **Rationale**: Preserves the existing zero-allocation particle system in `particles.js` while allowing skins to dynamically control the start and end of photon wakes (e.g. Neon Amber transitioning to deep red, or Plasma Violet transitioning to ultraviolet).
- **Alternatives Considered**:
  - *Full Three.js Ribbon Mesh Geometry per Disc*: Creating a dynamic ribbon geometry per disc per frame can cause high GC overhead unless tightly pooled. Exposing cosmetic parameters to the existing particle and ribbon pools avoids new allocations.

### 4. Isolated Preview Scene with Dynamic Render Loop Throttling
- **Decision**: `ArmoryPreviewScene` encapsulates its own `THREE.Scene`, `THREE.PerspectiveCamera`, and `THREE.WebGLRenderer`. It manages an internal `requestAnimationFrame` loop that checks whether its host container is visible in the DOM or paused. If hidden, the loop idles without executing `renderer.render()`, saving GPU cycles.
- **Rationale**: Keeps preview rendering completely isolated from the main game's rendering loop (`scene.js`), preventing race conditions, camera pollution, and overlay interference.
- **Alternatives Considered**:
  - *Viewport Scissor Testing on Main WebGLRenderer*: Rendering the preview using a scissor rectangle on the main canvas. Rejected because main scene post-processing, bloom passes, and camera matrices would interfere with the preview rig, and pointer events would conflict with main menu handlers.

### 5. Explicit WebGL Disposal Lifecycle Protocol
- **Decision**: Implement a standardized `disposeHierarchy(object3D)` utility that recursively disposes child geometries, materials (handling array materials and textures), and light references, followed by calling `renderer.dispose()` and `renderer.forceContextLoss()`.
- **Rationale**: WebGL contexts and GPU buffers are not automatically freed by JavaScript garbage collection. Explicit disposal prevents VRAM exhaustion across repeated Armory modal opens and preview skin cycling.
- **Alternatives Considered**:
  - *Relying on Garbage Collection*: Leaves WebGL buffer and shader program leaks in the browser GPU driver.

## Component Architecture

```mermaid
graph TD
    AM[ArmoryManager] -->|LOADOUT_CHANGED event| CME[CosmeticMaterialEngine]
    AC[ArmoryCatalog] -->|Shader Parameters| CME
    
    subgraph "Gameplay Scene Graph"
        PR[Player Character Rig]
        ID[Identity Disc Mesh]
        TR[Disc Flight Trail / Particles]
        CME -->|Mutate PBR & Circuit Emissives| PR
        CME -->|Mutate Emissive, Glow, Light, Wireframe| ID
        CME -->|Supply Primary/Secondary Colors| TR
    end
    
    subgraph "Armory UI Preview Rig"
        APS[ArmoryPreviewScene]
        APS -->|Instantiate Isolated Meshes| PV[Preview Pivot Mesh]
        CME -->|Apply Queried Cosmetic Skins| PV
        APS -->|Turntable Drag & Auto-Rotation| PV
        APS -->|dispose()| GPU[WebGL VRAM Cleanup]
    end
```

## Risks / Trade-offs

- **[Risk] High memory usage if multiple preview instances are opened without cleanup**
  → *Mitigation*: Enforce strict singleton usage or single active instance in `ArmoryPreviewScene`, auto-dispose existing scene before instantiating a new one, and invoke `.dispose()` on modal close.

- **[Risk] Materials mutated during preview affect live player meshes**
  → *Mitigation*: Ensure `makeDisc()` and `makeProgram()` instantiate fresh materials for preview meshes rather than referencing shared module-level material singletons (such as `wallMat` or `glowMat`).

- **[Risk] Headless/Node.js test environments lack WebGL context**
  → *Mitigation*: Design `CosmeticMaterialEngine` and `ArmoryPreviewScene` to gracefully handle mock Three.js objects or run unit tests verifying material properties, uniform values, and event bindings without requiring a physical GPU context.
