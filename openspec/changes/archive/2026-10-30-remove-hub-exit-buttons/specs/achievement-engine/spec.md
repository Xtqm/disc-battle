# Spec Delta

## MODIFIED Requirements

### Requirement: Diegetic Main Menu Trophy Matrix UI Modal
The system SHALL provide an interactive modal accessible from the main menu displaying player achievement progression, completion percentage, unlocked timestamps, and reward previews.

#### Scenario: Initial page load rendering of Achievements navigation button
- **WHEN** the main menu renders upon initial application load
- **THEN** `#achievementsBtn` is present in `#mainMenuButtons` with compatibility bindings, while the primary player access point is elevated to the Program Hub `[ DIRECTIVES ]` tab.

#### Scenario: Inspection of Trophy Matrix modal
- **WHEN** the user opens the Achievements modal or activates `[ DIRECTIVES ]` in the Program Hub
- **THEN** the system displays overall completion percentage, a badge grid of all launch achievements, current progress bars for incremental goals, and visual previews of unlockable cosmetic skins.

#### Scenario: Trophy Matrix dismiss control in Program Hub
- **WHEN** the Trophy Matrix view is displayed within the Program Hub modal
- **THEN** internal return/dismiss buttons (`[ ESC // CLOSE ]`) are omitted, leaving modal exit exclusively to the Hub's top-right dismiss control.
