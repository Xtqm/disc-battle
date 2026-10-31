# Spec Delta: armory-catalog

## MODIFIED Requirements

### Requirement: Shader and Visual Parameter Specification
The system SHALL define structured visual rendering parameters for all cosmetic items, including primary color, secondary emissive color, trail opacity, and wireframe toggle.

#### Scenario: Retrieving visual parameters for rendering
- **WHEN** a graphics pipeline reads an item's visual properties
- **THEN** the item definition provides primaryHex, secondaryEmissiveHex, trailOpacity, and wireframeToggle.

#### Scenario: Free baseline cosmetics configuration
- **WHEN** default baseline items (`disc_default`, `chassis_default`, `arena_grid_01`) are queried
- **THEN** the system provides default cyan and blue Arc League athletic grid aesthetics with unlockType set to free.

### Requirement: Diegetic Main Menu Armory Navigation and Live Balance Counter
The system SHALL provide an Armory entrypoint within the main menu interface that displays the Armory modal, featuring category navigation tabs (`KINETIC DISCS`, `ATHLETE RIGS`, `STADIUM ARENAS`), modal dismiss controls, and a reactive live Arc Credits balance counter.

#### Scenario: Initial page load rendering of Armory navigation button
- **WHEN** the main menu renders upon initial application load
- **THEN** `#armoryBtn` is present in `#mainMenuButtons` with compatibility bindings, while the primary player access point is elevated to the Program Hub `[ LOADOUT ]` or `[ OUTFITTING ]` tab.

#### Scenario: Opening Armory modal from main menu
- **WHEN** the player clicks the Armory button or activates `[ OUTFITTING ]` in the Program Hub
- **THEN** the system pauses background menu interactions, unlocks the cursor, displays the Armory interface, defaults to the `KINETIC DISCS` category, and stages the equipped or first catalog item in the 3D preview bay.

#### Scenario: Displaying and updating live Bit balance counter
- **WHEN** the Armory modal is opened or when currency changes occur via purchase or earning
- **THEN** the balance display renders the current Arc Credits total formatted as `CR {balance}` and immediately updates upon any economy balance change.

#### Scenario: Switching catalog category tabs
- **WHEN** the player clicks a category tab (`KINETIC DISCS`, `ATHLETE RIGS`, or `STADIUM ARENAS`)
- **THEN** the system sets the active category tab state, populates the catalog grid with items belonging to that category, and stages the first item of that category in the 3D preview bay.

#### Scenario: Armory dismiss control in Program Hub
- **WHEN** the Armory view is displayed within the Program Hub modal
- **THEN** internal return/dismiss buttons (`[ESC // RETURN]`) are omitted, leaving modal exit exclusively to the Hub's top-right dismiss control.

### Requirement: Contextual State-Driven Action Bar
The system SHALL render dynamic, state-sensitive action controls for the inspected item based on ownership, affordability, milestone locks, and loadout status.

#### Scenario: Inspecting an unowned Bit-purchasable item with sufficient Bits
- **WHEN** the inspected item is unowned, costs Arc Credits, and the player has enough Credits to afford it
- **THEN** the action bar displays an enabled `[ ACQUIRE // {cost} CREDITS ]` button.

#### Scenario: Inspecting an unowned Bit-purchasable item with insufficient Bits
- **WHEN** the inspected item is unowned, costs Arc Credits, but the player has fewer Credits than the required cost
- **THEN** the action bar displays a disabled `[ ACQUIRE // {cost} CREDITS ]` button accompanied by an amber warning message indicating insufficient Credits.

#### Scenario: Inspecting an achievement-gated milestone item
- **WHEN** the inspected item requires an unearned achievement
- **THEN** the action bar displays a disabled `[ LOCKED // REQUIRES: {milestoneName} ]` banner.

#### Scenario: Inspecting an owned but unequipped item
- **WHEN** the inspected item is unlocked in inventory but not currently equipped in the active loadout slot
- **THEN** the action bar renders an active `[ EQUIP TO LOADOUT ]` button.

#### Scenario: Inspecting the currently equipped item
- **WHEN** the inspected item matches the player's active loadout slot for that category
- **THEN** the action bar displays an illuminated `[ ACTIVE PROTOCOL ]` cyan badge and disables further equip actions.
