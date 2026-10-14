# Spec Delta

## Purpose

Establishes the authoritative Armory catalog registry, cosmetic shader metadata, atomic purchase validation pipeline, inventory entitlement tracking, and persistent loadout controller for Tron Disc Arena (SPEC-ARMORY-001 Phase 1).

## ADDED Requirements

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
