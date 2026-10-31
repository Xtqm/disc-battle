# Spec Delta

## ADDED Requirements

### Requirement: Gamepad Menu and Modal Navigation
The system SHALL support directional menu navigation, interactive element focus highlighting, and modal dismissal using game controller inputs whenever menus or overlay modals are active.

#### Scenario: Navigating menu elements with D-pad
- **WHEN** a menu or modal is active and the player presses Up or Down on the D-pad
- **THEN** keyboard/gamepad focus advances to the adjacent interactive button and displays a visible neon focus ring.

#### Scenario: Confirming focused element
- **WHEN** an interactive element has gamepad focus and the player presses controller Button 0 (A / Cross)
- **THEN** the focused button's click handler is triggered.

#### Scenario: Dismissing active modal
- **WHEN** an overlay modal is open and the player presses controller Button 1 (B / Circle)
- **THEN** the modal is dismissed and focus returns to the underlying menu.
