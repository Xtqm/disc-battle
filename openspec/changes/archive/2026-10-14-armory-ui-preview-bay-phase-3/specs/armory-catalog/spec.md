# armory-catalog Specification Delta

## ADDED Requirements

### Requirement: Diegetic Main Menu Armory Navigation and Live Balance Counter
The system SHALL provide an Armory entrypoint within the main menu interface that displays the Armory modal, featuring category navigation tabs (`IDENTITY DISCS`, `PROGRAM CHASSIS`, `EXOTIC ARENAS`), modal dismiss controls, and a reactive live Bit balance counter.

#### Scenario: Opening Armory modal from main menu
- **WHEN** the player clicks the Armory button from the main menu
- **THEN** the system pauses background menu interactions, unlocks the cursor, displays the Armory modal overlay, defaults to the `IDENTITY DISCS` category, and stages the first catalog item in the 3D preview bay.

#### Scenario: Displaying and updating live Bit balance counter
- **WHEN** the Armory modal is opened or when currency changes occur via purchase or earning
- **THEN** the balance display renders the current Bit total formatted as `$B {balance}` and immediately updates upon any economy balance change.

#### Scenario: Switching catalog category tabs
- **WHEN** the player clicks a category tab (`IDENTITY DISCS`, `PROGRAM CHASSIS`, or `EXOTIC ARENAS`)
- **THEN** the system sets the active category tab state, populates the catalog grid with items belonging to that category, and stages the first item of that category in the 3D preview bay.

### Requirement: Split-Pane Catalog Grid and Integrated 3D Turntable Preview Bay
The system SHALL present a split-pane layout inside the Armory modal containing a scrollable item grid on the left and an interactive 3D turntable preview viewport with an item lore dossier on the right.

#### Scenario: Populating the scrollable item grid
- **WHEN** a category is selected in the Armory modal
- **THEN** the left pane displays a scrollable grid of item cards, each indicating item name, cost or unlock requirement, rarity accent, and current ownership/equipped badge.

#### Scenario: Selecting an item for 3D inspection
- **WHEN** the player clicks an item card in the catalog grid
- **THEN** the item card is marked with active focus styling, the right pane updates its dossier with the item's name, description, and shader parameters, and the 3D turntable bay immediately stages and rotates the selected item model.

#### Scenario: Interactive manual rotation in preview bay
- **WHEN** the player drags or swipes across the 3D preview viewport
- **THEN** the turntable rotates smoothly along yaw and pitch axes matching pointer movement, and automatically resumes idle auto-rotation after pointer release.

#### Scenario: Modal closure and WebGL resource teardown
- **WHEN** the Armory modal is closed via close button, overlay click, or Escape key
- **THEN** the system stops the turntable render loop, disposes all staged geometries and materials in the preview scene, hides the modal overlay, and restores the main menu view.

### Requirement: Contextual State-Driven Action Bar
The system SHALL render dynamic, state-sensitive action controls for the inspected item based on ownership, affordability, milestone locks, and loadout status.

#### Scenario: Inspecting an unowned Bit-purchasable item with sufficient Bits
- **WHEN** the inspected item is unowned, costs Bits, and the player has enough Bits to afford it
- **THEN** the action bar displays an enabled `[ FABRICATE // {cost} BITS ]` button.

#### Scenario: Inspecting an unowned Bit-purchasable item with insufficient Bits
- **WHEN** the inspected item is unowned, costs Bits, but the player has fewer Bits than the required cost
- **THEN** the action bar displays a disabled `[ FABRICATE // {cost} BITS ]` button accompanied by an amber warning message indicating insufficient Bits.

#### Scenario: Inspecting an achievement-gated milestone item
- **WHEN** the inspected item requires an unearned achievement
- **THEN** the action bar displays a disabled `[ LOCKED // REQUIRES: {milestoneName} ]` banner.

#### Scenario: Inspecting an owned but unequipped item
- **WHEN** the inspected item is unlocked in inventory but not currently equipped in the active loadout slot
- **THEN** the action bar renders an active `[ EQUIP TO LOADOUT ]` button.

#### Scenario: Inspecting the currently equipped item
- **WHEN** the inspected item matches the player's active loadout slot for that category
- **THEN** the action bar displays an illuminated `[ ACTIVE PROTOCOL ]` cyan badge and disables further equip actions.

### Requirement: Audio-Visual Fabrication Feedback and Purchase Fanfare
The system SHALL synthesize procedural audio sound effects and trigger neon visual fanfare animations upon fabricating or equipping an Armory cosmetic item.

#### Scenario: Executing a cosmetic fabrication purchase
- **WHEN** the player clicks the `[ FABRICATE // {cost} BITS ]` button for an eligible item
- **THEN** the system deducts Bits, grants the item to inventory, synthesizes a digital fabrication laser-sweep sound effect, triggers a pulsing neon border animation across the preview bay, and transforms the action button into `[ EQUIP TO LOADOUT ]`.

#### Scenario: Equipping an unlocked cosmetic item
- **WHEN** the player clicks `[ EQUIP TO LOADOUT ]` for an unlocked item
- **THEN** the system updates the loadout slot, persists the state, synthesizes a confirmation equip audio click, triggers a cyan pulse on the item card, and updates the action bar to display `[ ACTIVE PROTOCOL ]`.
