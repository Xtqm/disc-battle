# Design

## Context

The Grid Authorization Terminal (`src/ui/authTerminal.js`) previously imported `SFX` from `../audio/sfx.js` and played procedural audio effects across several user interactions:
- Modal display: `SFX.terminalOpen()`
- Form navigation & input: `SFX.terminalKey()` on tab switches and input typing events
- Authentication success: `SFX.accessGranted()` upon login, passkey authorization, OAuth completion, and handle update
- Authentication errors: `SFX.errorBuzz()` upon validation failure, empty input, or provider exceptions

Several other UI components (such as `ArmoryModal.js`, `GridSelectorModal.js`, `LevelSelectView.js`, and `TrialDebriefModal.js`) call these same SFX utility methods.

## Goals / Non-Goals

**Goals:**
- Eliminate all sound effect triggers in `src/ui/authTerminal.js` to ensure the authentication and account creation workflows are completely silent.
- Clean up the `SFX` import and any event listener bindings whose sole purpose was to trigger audio clicks on keystrokes.
- Preserve all procedural synth methods and exports in `src/audio/sfx.js` so other game subsystems and tests remain unaffected.
- Verify silent operation through updated/augmented unit and integration tests.

**Non-Goals:**
- Removing sound effects from other game interfaces (e.g., Armory, Campaign menus, or combat disc sounds).
- Deleting procedural audio generators from `src/audio/sfx.js`.
- Adding user settings or configuration flags for authentication audio.

## Decisions

### Decision 1: Direct Removal vs. Mute Configuration Flag
- **Choice**: Directly remove all `SFX` calls and listeners from `src/ui/authTerminal.js`.
- **Rationale**: The user wants authentication sound effects removed. Introducing a mute flag or toggle adds unnecessary complexity, configuration state, and bundle overhead for audio that is not wanted.
- **Alternatives Considered**:
  - *Add a config flag (`state.authAudio = false`)*: Rejected because auth audio is specifically deprecated and no option is required.
  - *Mute AudioContext during auth*: Rejected because background music or ambient sounds might be affected.

### Decision 2: Maintain `SFX` Preset Methods in `src/audio/sfx.js`
- **Choice**: Keep `terminalOpen`, `terminalKey`, `accessGranted`, and `errorBuzz` in `src/audio/sfx.js`.
- **Rationale**: Other UI subsystems (e.g., `ArmoryModal`, `LevelSelectView`, `GridSelectorModal`, `TrialDebriefModal`) rely on these methods. Keeping them avoids breaking those systems or their unit tests.

### Decision 3: Event Listener Cleanup
- **Choice**: Remove event listeners attached strictly for keystroke audio feedback (such as `input` listeners that only invoke `SFX.terminalKey()`).
- **Rationale**: Avoids redundant event listeners executing empty callbacks during text entry.

## Risks / Trade-offs

- **[Risk] Removing functional logic along with audio calls**
  → *Mitigation*: Inspect each call site in `src/ui/authTerminal.js`. For listeners that perform validation or UI updates alongside SFX, remove only the SFX invocation. For listeners whose sole purpose was calling `SFX.terminalKey()`, safely remove the listener.

- **[Risk] Breaking test assertions expecting audio triggers**
  → *Mitigation*: Run the full test suite (`node test/auth/auth_sfx.test.js`, `node test/auth/auth_header.test.js`, `node test/auth/auth_terminal_integration.test.js`, etc.) and ensure all tests pass.
