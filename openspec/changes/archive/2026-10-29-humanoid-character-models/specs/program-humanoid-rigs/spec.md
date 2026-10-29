# Spec Delta

## Purpose

Defines the hierarchical anatomical humanoid 3D rig, movie-authentic Tron: Legacy styling (Flynn-style player visor vs Rinzler-style bot T-visor, dorsal magnetic disc docks, segmented composite armor plates), procedural kinematics (walking/running strides, jump tucks), and combat pose articulation for all program entities.

## ADDED Requirements

### Requirement: Hierarchical Anatomical Humanoid Rig
The system SHALL construct character 3D avatar rigs with an articulated parent-child joint hierarchy consisting of pelvis, segmented torso cuirass, neck, head with helmet, articulated shoulders, upper arms, forearms, hands, hips, thighs, shins, and boots.

#### Scenario: Rig hierarchy initialization
- **WHEN** a character avatar is instantiated via `makeProgram`
- **THEN** the root group contains an articulated parent-child anatomical hierarchy rather than unlinked floating geometric primitives.

#### Scenario: Part tag preservation for cosmetic engine compatibility
- **WHEN** the humanoid rig is constructed
- **THEN** core component meshes maintain standard `userData.part` identifiers (`chassis_suit`, `chassis_trim`, `chassis_visor`, `chassis_back_disc`, `chassis_halo`) permitting dynamic PBR armor and emissive tinting.

### Requirement: Role-Differentiated Tron: Legacy Helmet Optics
The system SHALL equip avatars with distinct helmet designs reflecting their role, rendering a sleek curved horizontal slit visor for player avatars and an aggressive illuminated T-visor aperture for combat AI bots and arena bosses.

#### Scenario: Player character helmet assembly
- **WHEN** the player avatar rig is created
- **THEN** the head is fitted with a smooth aerodynamic helmet and a curved horizontal slit visor with cyan or equipped cosmetic illumination.

#### Scenario: Combat bot helmet assembly
- **WHEN** a combat bot or arena boss avatar is created
- **THEN** the head is fitted with an aggressive enforcer helmet featuring an illuminated vertical and horizontal cross T-visor aperture.

#### Scenario: Boss scale and luminescent halo
- **WHEN** a Duel Boss or Arbiter Boss is spawned
- **THEN** the humanoid rig is scaled to 1.15x or 1.22x with an elevated-intensity local point light halo matching their tier color.

### Requirement: Dorsal Identity Disc Dock and Segmented Plating
The system SHALL provide a recessed dorsal C-ring magnetic dock on the upper spine between the shoulder blades that houses the Identity Disc when docked, integrated into segmented composite suit armor and recessed electroluminescent light channels.

#### Scenario: Identity disc docked state
- **WHEN** the avatar possesses an Identity Disc
- **THEN** the disc mesh is visible and positioned flush against the dorsal C-ring dock between the shoulder blades.

#### Scenario: Identity disc deployed in flight
- **WHEN** the avatar throws its Identity Disc into flight
- **THEN** the dorsal disc mesh becomes invisible until the disc returns or re-arming completes.

### Requirement: Procedural Locomotion and Combat Poses
The system SHALL articulate the humanoid joint hierarchy dynamically during movement and combat, executing antiphase arm/leg strides during running, aerial limb postures during jumps, and a two-handed forward defensive brace during holographic shield blocking.

#### Scenario: Running locomotion stride
- **WHEN** an avatar moves across the arena floor
- **THEN** hip joints swing legs in alternating antiphase with knee flexing and shoulder joints swing arms in counter-balance proportional to velocity.

#### Scenario: Aerial jump posture
- **WHEN** an avatar is airborne with upward or downward vertical velocity
- **THEN** legs trail aerodynamically while torso pitch tilts to reflect vertical acceleration.

#### Scenario: Holographic shield defensive brace
- **WHEN** the player activates the shield block action
- **THEN** both shoulders rotate forward and forearms elevate to brace the Identity Disc forward in front of the chest as a defensive parry barrier.
