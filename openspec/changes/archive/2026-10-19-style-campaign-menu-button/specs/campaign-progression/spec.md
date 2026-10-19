# Spec Delta

## ADDED Requirements

### Requirement: Campaign Main Menu Launch Button Styling
The system SHALL style the Campaign Sectors main menu button with signature gold neon borders, glowing accent drop-shadows, and interactive hover elevation states consistent with the primary game mode launch buttons.

#### Scenario: Rendering standard state on main menu
- **WHEN** the main menu renders `#campaignBtn`
- **THEN** the button displays a gold border (`#ffd700`), gold text accent, and glowing box-shadow accents.

#### Scenario: Hovering campaign launch button
- **WHEN** the player hovers over or focuses `#campaignBtn`
- **THEN** the button elevates (`translateY(-2px)`), deepens background illumination, and intensifies glowing box-shadows.

#### Scenario: Styling campaign action controls in modals
- **WHEN** campaign action buttons bearing `.campaign-btn` are rendered inside campaign modals (such as Launch Trial and Next Trial)
- **THEN** they inherit the cohesive gold neon styling and interactive hover states.
