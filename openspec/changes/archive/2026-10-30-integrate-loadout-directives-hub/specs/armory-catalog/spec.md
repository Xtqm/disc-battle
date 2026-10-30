# Spec Delta

## MODIFIED Requirements

### Requirement: Diegetic Main Menu Armory Navigation and Live Balance Counter
The system SHALL provide an Armory entrypoint within the main menu interface that displays the Armory modal, featuring category navigation tabs (`IDENTITY DISCS`, `PROGRAM CHASSIS`, `EXOTIC ARENAS`), modal dismiss controls, and a reactive live Bit balance counter.

#### Scenario: Initial page load rendering of Armory navigation button
- **WHEN** the main menu renders upon initial application load
- **THEN** `#armoryBtn` is present in `#mainMenuButtons` with compatibility bindings, while the primary player access point is elevated to the Program Hub `[ LOADOUT ]` tab.

#### Scenario: Opening Armory modal from main menu
- **WHEN** the player clicks the Armory button or activates `[ LOADOUT ]` in the Program Hub
- **THEN** the system pauses background menu interactions, unlocks the cursor, displays the Armory interface, defaults to the `IDENTITY DISCS` category, and stages the equipped or first catalog item in the 3D preview bay.

#### Scenario: Displaying and updating live Bit balance counter
- **WHEN** the Armory modal is opened or when currency changes occur via purchase or earning
- **THEN** the balance display renders the current Bit total formatted as `$B {balance}` and immediately updates upon any economy balance change.

#### Scenario: Switching catalog category tabs
- **WHEN** the player clicks a category tab (`IDENTITY DISCS`, `PROGRAM CHASSIS`, or `EXOTIC ARENAS`)
- **THEN** the system sets the active category tab state, populates the catalog grid with items belonging to that category, and stages the first item of that category in the 3D preview bay.
