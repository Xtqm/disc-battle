# Gamepad Input Specification

## Purpose

Provides native Web Gamepad API integration for desktop browsers, enabling twin-stick locomotion and camera aiming, ergonomic combat button dispatch, and haptic rumble actuation for modern game controllers.

## Requirements

### Requirement: Controller Lifecycle and Device Discovery
The system SHALL detect connected game controllers via the standard Web Gamepad API, tracking connection and disconnection events and identifying active standard-mapped gamepads.

#### Scenario: Gamepad Connected
- **WHEN** a gamepad is connected or activated via USB or Bluetooth
- **THEN** the system registers the device and enables controller polling in the game loop.

#### Scenario: Gamepad Disconnected
- **WHEN** a connected gamepad is disconnected during active gameplay
- **THEN** the system cleanly releases active controller inputs and resets analog deflections to zero without interrupting keyboard or mouse fallback.

### Requirement: Twin-Stick Locomotion and Camera Aiming
The system SHALL translate left analog stick deflection into omnidirectional character locomotion and right analog stick deflection into continuous camera yaw and pitch rotation with deadzone filtering.

#### Scenario: Analog movement outside deadzone
- **WHEN** the left analog stick is tilted beyond the 0.12 deadzone threshold
- **THEN** the player character moves in the corresponding arena direction proportional to stick deflection.

#### Scenario: Stick deflection within deadzone
- **WHEN** an analog stick deflection magnitude is within the 0.12 deadzone
- **THEN** the system outputs a zero vector to prevent stick drift.

#### Scenario: Right stick camera rotation
- **WHEN** the right analog stick is tilted horizontally or vertically
- **THEN** the camera yaw and pitch rotate continuously with pitch clamped between -0.6 and 0.55 radians.

### Requirement: Combat Action Button Dispatch
The system SHALL map standard controller face buttons, triggers, and bumpers to character combat actions including disc throws, shield blocking, jumps, dashes, and curve trajectory intents.

#### Scenario: Trigger disc throw
- **WHEN** the player presses the right trigger (R2) and holds an identity disc
- **THEN** the system executes a disc throw along the current camera aim vector.

#### Scenario: Trigger shield block
- **WHEN** the player holds the left trigger (L2)
- **THEN** the system engages holographic shield blocking, releasing it when the trigger is released.

#### Scenario: Face button jump and double jump
- **WHEN** the player presses the south button (Cross / A) while grounded or in the air with jumps remaining
- **THEN** the system triggers a vertical jump impulse.

#### Scenario: Dash impulse
- **WHEN** the player presses the east or west button (Circle / Square / B) with sufficient energy
- **THEN** the system triggers a directional dash impulse consuming 25 energy.

#### Scenario: Bumper curve spin intent
- **WHEN** the player holds the left bumper (L1) or right bumper (R1) prior to or during a disc throw
- **THEN** the disc launches with the corresponding negative or positive Magnus lateral curve spin.

#### Scenario: Pause toggle
- **WHEN** the player presses the Start / Options button (Button 9) during active play
- **THEN** the system toggles game pause state.

### Requirement: Haptic Rumble Actuation
The system SHALL actuate dual-motor vibration effects on supporting gamepads during high-impact combat events including disc impacts, shield parries, and damage reception.

#### Scenario: Shield parry haptic feedback
- **WHEN** an incoming hostile disc is successfully blocked by the player's shield
- **THEN** the system triggers a brief vibration pulse on the controller's haptic actuators.

#### Scenario: Unsupported haptics fallback
- **WHEN** a connected controller does not expose a standard vibration actuator
- **THEN** combat gameplay proceeds normally without runtime exceptions.

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
