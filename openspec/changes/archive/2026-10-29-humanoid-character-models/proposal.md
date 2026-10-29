# Proposal

## Why

Player and bot avatars in the arena currently consist of unarticulated floating geometric capsules and spheres, giving characters an unpolished, abstract appearance devoid of the iconic visual identity of the *Tron* franchise. Rebuilding the character avatars into anatomical humanoid rigs modeled after the aesthetic of *Tron: Legacy* (2010)—complete with segmented composite armor plating, recessed electroluminescent (EL) light ribbons, role-differentiated helmets, and procedural stride and combat kinematics—dramatically elevates combat readability, immersion, and production fidelity.

## What Changes

- **Articulated Humanoid Rig**: Re-architect `makeProgram()` from primitive floating geometric volumes into a hierarchical parent-child anatomical joint tree (pelvis, torso cuirass, neck, head/helmet, articulated shoulders/elbows/hands, and hips/knees/boots).
- **Movie-Authentic Tron: Legacy Styling**:
  - Segmented matte/carbon armor plating with recessed electroluminescent circuitry channels.
  - Flush dorsal magnetic C-ring dock between the shoulder blades where the Identity Disc is docked.
  - Mag-boots with luminescent sole rims and contoured shin greaves.
- **Role-Differentiated Visor & Helmet Optics**:
  - **Player Character**: Streamlined aerodynamic helmet with a smooth curved horizontal slit visor (Flynn / ISO style) and dual-chevron chest circuitry.
  - **Combat AI & Bosses**: Aggressive combat helmet featuring illuminated cross/T-visor optics (Rinzler / Black Guard style) and angular enforcer rib armor.
- **Procedural Kinematics & Combat Poses**:
  - Locomotion strides: Antiphase leg swings with knee flex and counter-balancing arm swings synced to movement velocity.
  - Aerial jump poses: Aerodynamic trailing limbs during jumps and air recovery.
  - Holographic shield deflection stance: Two-handed forward brace raising the Identity Disc in front of the chest during blocking.
  - Combat damage telegraphs: High-frequency directional hurt tremors and parry telegraph bursts.
- **Backward Compatibility**: Preserve existing `userData.part` identifiers (`chassis_suit`, `chassis_trim`, `chassis_visor`, `chassis_back_disc`, `chassis_halo`) to ensure seamless integration with `CosmeticMaterialEngine` PBR shaders, wireframe overlays, armory loadouts, and multiplayer network replication.

## Capabilities

### New Capabilities
- `program-humanoid-rigs`: Defines the hierarchical anatomical humanoid 3D rig, movie-authentic *Tron: Legacy* styling (Flynn-style player visor vs Rinzler-style bot T-visor, dorsal magnetic disc docks, segmented composite armor plates), procedural kinematics (walking/running strides, jump tucks), and combat pose articulation for all program entities.

### Modified Capabilities
<!-- None: Core gameplay mechanics, projectile physics, and loadout definitions remain unchanged. -->

## Impact

- **Affected Code**:
  - `src/graphics/materials.js`: Complete re-architecture of `makeProgram(color)` into a hierarchical humanoid rig with role-differentiated helmet options.
  - `src/entities/Player.js`: Procedural limb animation update loop (walking stride, jumping pose, two-handed block shield stance).
  - `src/entities/Bot.js`: Procedural locomotion articulation, boss scale/lighting preservation, hurt tremors, and combat parry telegraphs.
  - `src/armory/CosmeticMaterialEngine.js`: Verification of traversal and material mutation across the new articulated humanoid hierarchy.
  - `src/armory/ArmoryPreviewScene.js` & `src/network/roomManager.js`: Avatars displayed on pedestals and in multiplayer lobbies automatically inherit the upgraded humanoid models.
- **APIs & Dependencies**: Zero external asset dependencies; continues using Three.js procedural geometries with zero load latency or asset streaming requirements.
