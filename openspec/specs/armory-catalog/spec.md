# armory-catalog Specification

## Purpose
Establishes the authoritative Armory catalog registry, cosmetic shader metadata, atomic purchase validation pipeline, inventory entitlement tracking, and persistent loadout controller for Tron Disc Arena (SPEC-ARMORY-001 Phase 1).

## Requirements

### Requirement: Categorized Armory Item Metadata Registry
The system SHALL maintain a structured catalog registry indexing cosmetic items and functional variants across four core categories: discSkins, chassisSkins, unlockedMaps, and discTypes.

#### Scenario: Querying catalog items by category
- **WHEN** a system requests all items for a valid category (`discSkins`, `chassisSkins`, `unlockedMaps`, or `discTypes`)
- **THEN** the system returns an array of immutable catalog item records containing id, displayName, category, cost, unlockType, and visual parameters.

#### Scenario: Querying with invalid category
- **WHEN** a system requests items for an unrecognized category
- **THEN** the system returns an empty list without throwing an unhandled exception.

#### Scenario: Looking up item by identifier
- **WHEN** a system queries a specific item ID across the catalog
- **THEN** the system returns the corresponding catalog item definition or null if not found.

### Requirement: Shader and Visual Parameter Specification
The system SHALL define structured visual rendering parameters for all cosmetic items, including primary color, secondary emissive color, trail opacity, and wireframe toggle.

#### Scenario: Retrieving visual parameters for rendering
- **WHEN** a graphics pipeline reads an item's visual properties
- **THEN** the item definition provides primaryHex, secondaryEmissiveHex, trailOpacity, and wireframeToggle.

#### Scenario: Free baseline cosmetics configuration
- **WHEN** default baseline items (`disc_default`, `chassis_default`, `arena_grid_01`) are queried
- **THEN** the system provides default cyan and blue Tron grid visual aesthetics with unlockType set to free.

### Requirement: Unlock Condition and Ownership Verification
The system SHALL verify item ownership and unlock criteria based on stored inventory, default entitlements, and achievement requirements.

#### Scenario: Verifying free or default item ownership
- **WHEN** checking unlock status for default free items
- **THEN** the system identifies the item as unlocked even if absent from stored inventory arrays.

#### Scenario: Verifying purchased item ownership
- **WHEN** checking unlock status for an item present in the player's stored inventory category
- **THEN** the system returns true.

#### Scenario: Verifying locked item ownership
- **WHEN** checking unlock status for an unpurchased item that is not free and not in stored inventory
- **THEN** the system returns false.

### Requirement: Purchase Feasibility and Affordability Validation
The system SHALL validate purchase eligibility before executing a transaction, checking existing ownership, Bit balance affordability, and achievement gating.

#### Scenario: Checking affordability for affordable locked item
- **WHEN** a player with sufficient Bits queries purchase feasibility for an unowned Bits-priced item
- **THEN** the system reports purchase eligibility as true.

#### Scenario: Checking affordability with insufficient Bits
- **WHEN** a player with fewer Bits than the item cost queries purchase feasibility
- **THEN** the system reports purchase eligibility as false.

#### Scenario: Checking purchase eligibility for already owned item
- **WHEN** checking purchase feasibility for an item the player already owns
- **THEN** the system rejects the purchase query with an item-already-owned status.

#### Scenario: Checking purchase eligibility for achievement-gated item
- **WHEN** checking purchase feasibility for an item gated by an unearned achievement
- **THEN** the system rejects purchase eligibility.

### Requirement: Atomic Currency Spending and Inventory Grant
The system SHALL execute atomic Bits deduction via the economy engine and immediately append the granted item identifier to persistent inventory storage upon a valid purchase.

#### Scenario: Successfully purchasing a Bits-priced item
- **WHEN** an eligible purchase is requested for a valid locked item
- **THEN** the system deducts the item cost via EconomyManager, appends the item identifier to the relevant inventory category in StorageManager, persists the state, and returns true.

#### Scenario: Rejecting purchase when currency deduction fails
- **WHEN** a purchase is attempted with insufficient Bits or invalid parameters
- **THEN** the system leaves inventory unchanged, aborts the transaction, and returns false.

#### Scenario: Emitting item unlock event
- **WHEN** an item is successfully purchased and unlocked
- **THEN** the system broadcasts an ARMORY_ITEM_UNLOCKED event containing category, itemId, item metadata, and cost.

### Requirement: Loadout Configuration and Equipment Management
The system SHALL manage active equipped items across all loadout categories, enforcing ownership validation before permitting equipment changes.

#### Scenario: Equipping an unlocked item
- **WHEN** a player equips an unlocked item in a valid category
- **THEN** the system updates the corresponding loadout slot in StorageManager, persists the change, and emits a LOADOUT_CHANGED event.

#### Scenario: Rejecting equipping a locked item
- **WHEN** a player attempts to equip an item that is locked and unowned
- **THEN** the system rejects the request, retains the previous equipped item, and returns false.

#### Scenario: Retrieving equipped loadout
- **WHEN** the game queries the active loadout
- **THEN** the system returns the current equipped item identifiers for disc skins, chassis skins, active map, and disc type.

### Requirement: Dynamic Identity Disc Cosmetic Material Application
The system SHALL apply active disc skin cosmetic configurations to the player's 3D Identity Disc mesh instances, updating the outer rim emissive color, core ring glow intensity, internal face translucency, attached PointLight radiance, and optional retro wireframe overlay.

#### Scenario: Applying standard emissive disc skin
- **WHEN** an equipped disc skin without wireframe is applied to an Identity Disc mesh
- **THEN** the outer rim material color matches `shader.primaryHex`, the PointLight color matches `shader.primaryHex`, the core ring glow intensity scales by `shader.glowIntensity`, and any wireframe overlay mesh is hidden or removed.

#### Scenario: Applying wireframe overlay disc skin
- **WHEN** an equipped disc skin with `wireframeToggle: true` (e.g. `disc_corrupted_void`) is applied
- **THEN** the system attaches or activates an accented wireframe overlay mesh on the disc geometry with secondary emissive coloration while preserving the core ring glow.

#### Scenario: Dynamic skin swap on loadout changed event
- **WHEN** `ArmoryManager` emits a `LOADOUT_CHANGED` event for category `discSkins`
- **THEN** the system immediately updates the player's active held disc mesh and unthrown disc state to reflect the newly equipped disc skin parameters.

### Requirement: Dynamic Disc Flight Ribbon and Trail Interpolation
The system SHALL configure projectile flight ribbons and particle trails generated by thrown discs using the active disc skin's primary color, secondary emissive color, and opacity parameters.

#### Scenario: Spawning flight ribbon for equipped disc skin
- **WHEN** a player throws an Identity Disc with an equipped cosmetic skin
- **THEN** the spawned flight ribbon or particle trail adopts `shader.primaryHex` as its leading color, interpolates toward `shader.secondaryEmissiveHex` along its trail length, and clamps maximum opacity to `shader.trailOpacity`.

#### Scenario: Retaining owner skin styling through bounces
- **WHEN** a thrown cosmetically-skinned disc deflects off walls or arena pillars
- **THEN** the disc retains its owner's cosmetic skin and trail color interpolation until caught or deflected by an opponent.

### Requirement: Dynamic Program Chassis Material Configuration
The system SHALL apply equipped chassis skin configurations to the player character 3D rig, adjusting armor plating surface properties (roughness, metalness, diffuse tone) and updating neon circuit trim emissive colors across visor, torso, limb strips, and back-mounted disc.

#### Scenario: Applying chassis skin to player rig
- **WHEN** an equipped chassis skin is applied to the player model
- **THEN** the armor plating standard materials receive the skin's roughness and metalness values, and the emissive circuit strips (visor, belt, chest, limbs) update to `shader.primaryHex` and `shader.secondaryEmissiveHex`.

#### Scenario: Synchronizing back-mounted disc with equipped disc skin
- **WHEN** player chassis materials are updated or initialized
- **THEN** the back-mounted disc mesh on the player rig synchronizes its visual colors with the active equipped disc skin.

### Requirement: Memory-Safe WebGL Resource Disposal and Uniform Mutation
The system SHALL mutate Three.js Color instances, scalar uniforms, and opacity properties in-place where materials persist, and SHALL explicitly call `.dispose()` on transient materials, geometries, and textures when items are swapped or discarded.

#### Scenario: In-place material property mutation
- **WHEN** swapping between cosmetics that share compatible material types
- **THEN** the system updates color, emissive, and opacity properties directly on existing materials without constructing new material instances.

#### Scenario: Disposal of transient wireframe or custom materials
- **WHEN** replacing a cosmetic item that instantiated unique auxiliary materials or geometry overlays
- **THEN** the system calls `.dispose()` on discarded auxiliary materials and geometries to release WebGL GPU resources and prevent memory leaks.

### Requirement: Turntable 3D Cosmetic Preview Renderer
The system SHALL provide an isolated Three.js preview scene and camera rig capable of rendering an interactive, rotating 3D preview of any catalog Disc skin or Program Chassis model for inspection within the Armory UI.

#### Scenario: Staging a disc skin for turntable inspection
- **WHEN** the Armory UI requests a preview of a specific disc skin
- **THEN** the preview scene clears existing preview meshes, instantiates the disc model with the specified cosmetic shader configuration, centers it in the camera frustum, and initiates turntable rotation.

#### Scenario: Staging a chassis skin for turntable inspection
- **WHEN** the Armory UI requests a preview of a specific chassis skin
- **THEN** the preview scene instantiates the Program Chassis rig with the specified cosmetic materials, positions the camera at a framed full-body view, and rotates smoothly on the yaw axis.

#### Scenario: Interactive manual rotation and drag controls
- **WHEN** a user interacts with the preview viewport via pointer drag or touch swipe
- **THEN** the preview turntable updates yaw rotation proportionally to pointer delta and resumes auto-rotation when interaction ceases.

#### Scenario: Teardown and disposal of preview renderer
- **WHEN** the preview renderer is destroyed or its parent modal is closed
- **THEN** the system halts the animation loop, removes all objects from the preview sub-scene, disposes materials and geometries, and releases WebGL canvas resources.
