# Design

## Context

Avatars in Tron Disc Arena are instantiated via `makeProgram(color)` in [`src/graphics/materials.js`](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/graphics/materials.js#L37-L75). The existing implementation attaches flat, disconnected geometric primitives (a single capsule torso, sphere head, box visor, and floating limb capsules) directly to the root group. While this allowed initial gameplay testing, it lacks anatomical realism, joint articulation, and the iconic aesthetic of the *Tron* film franchise.

See `proposal.md` for motivation and `specs/program-humanoid-rigs/spec.md` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Construct a hierarchical parent-child anatomical joint tree in pure Three.js code for all program entities.
- Implement movie-authentic *Tron: Legacy* (2010) styling: dark segmented armor cuirass, recessed electroluminescent (EL) light lines, and a flush dorsal magnetic C-ring Identity Disc dock.
- Provide role-differentiated helmet designs: smooth curved horizontal slit visor (Flynn/ISO style) for players and an aggressive illuminated T-visor (Rinzler style) for AI bots and arena bosses.
- Add procedural limb kinematics for locomotion strides, airborne flight tucks, and a defensive two-handed shield deflection pose.
- Maintain 100% backward compatibility with [`CosmeticMaterialEngine.js`](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/armory/CosmeticMaterialEngine.js) PBR shaders and wireframe overlays.

**Non-Goals:**
- External `.glb`/`.gltf` asset loading and skeletal `SkinnedMesh` rigging (retained as a future Phase 2 candidate).
- Changes to projectile hitboxes, combat physics, or collision radius constants (`config.PLAYER_R`, `config.FOE_R`).

## Decisions

### 1. Hierarchical Joint Hierarchy vs. Flat Geometry
- **Decision**: Structure the rig into parent-child pivot nodes:
  - `Root -> Pelvis -> Torso -> Neck -> Helmet/Visor`
  - `Torso -> Left/Right Shoulders (Pivots) -> Upper Arms -> Forearms -> Hands`
  - `Pelvis -> Left/Right Hips (Pivots) -> Thighs -> Knees -> Shins -> Mag-Boots`
- **Rationale**: A hierarchical pivot tree enables realistic procedural rotation of limbs (e.g., hips and shoulders rotate around their sockets, carrying forearms and boots with them) without manual coordinate calculation.
- **Alternatives Considered**: 
  - *Skeletal bone weights / SkinnedMesh*: Requires external rigging pipeline and skin weight assets.
  - *Vertex shader deformers*: Heavy math in shaders; breaks hit detection and part identification.

### 2. Procedural Three.js Segmented Geometry
- **Decision**: Model armor plates and body segments using native Three.js primitives (`CapsuleGeometry`, `CylinderGeometry`, `BoxGeometry`, `TorusGeometry`) styled with bevels and recesses.
- **Rationale**: 
  - Zero network overhead and instant startup (no async asset downloads).
  - Clean separation into `chassis_suit` (dark PBR armor), `chassis_trim` (recessed neon channels), `chassis_visor`, and `chassis_back_disc`.
- **Alternatives Considered**: Single static merged mesh. Rejected because merging eliminates dynamic limb pivots and prevents `CosmeticMaterialEngine` from independently updating suit metalness vs neon emission.

### 3. Parameterized Rig Factory: `makeProgram(color, options)`
- **Decision**: Extend `makeProgram(color, { isPlayer = false, helmetType = 'rinzler' } = {})`:
  - Player avatars receive the smooth aerodynamic helmet with a curved horizontal slit visor (`helmetType: 'flynn'`) and dual-chevron chest trim.
  - Bot and boss avatars receive the enforcer helmet with vertical-horizontal T-visor optics (`helmetType: 'rinzler'`) and angular enforcer rib trim.
- **Rationale**: Single authoritative factory prevents code duplication while enforcing clean role differentiation.
- **Alternatives Considered**: Separate `makePlayerProgram()` and `makeBotProgram()` functions. Rejected to avoid duplicating suit and limb construction code.

### 4. Shared Procedural Kinematics Helper
- **Decision**: Create a reusable kinematics function `animateProgramKinematics(rig, dt, { speed, vy, grounded, blocking, hurt })` in `src/graphics/materials.js` (or a dedicated kinematics module) consumed by both `updatePlayer` and `updateFoes`.
  - **Running**: Antiphase hip and shoulder swings (`Math.sin(time * 10) * angle`) with knee flexion.
  - **Blocking**: Shoulders pivot forward (`rotation.x = -0.7`), forearms elevate (`rotation.x = -0.5`), and the Identity Disc aligns forward between the hands.
  - **Jumping**: Legs trail back slightly (`rotation.x = 0.3`), arms sweep outward for balance.
- **Rationale**: Centralizing limb animation ensures bot movement visually matches player movement while honoring bot-specific hurt tremors.

## Risks / Trade-offs

- **[Risk] Draw call count per character**: Additional mesh parts per rig could increase draw calls.
  - *Mitigation*: All suit parts share a single `userData.suitMaterial` instance, and all neon trims share a single `userData.litMaterial` instance per rig. Three.js efficiently batches these materials.
- **[Risk] Cosmetic Material Engine desynchronization**: New parts might fail to receive cosmetic chassis skins or wireframe overlays.
  - *Mitigation*: Rig adheres strictly to `userData.part = 'chassis_suit' | 'chassis_trim' | 'chassis_visor' | 'chassis_back_disc' | 'chassis_halo'`. Comprehensive traversal tests will verify that loadouts apply to all new sub-meshes.
- **[Risk] Multiplayer and Armory preview scene regressions**: Other scenes might instantiate programs without passing options.
  - *Mitigation*: Default options `{ isPlayer: false, helmetType: 'rinzler' }` ensure all legacy calls succeed without breakage.
