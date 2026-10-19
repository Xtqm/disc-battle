# Proposal

## Why

The sound effects currently played during the authentication terminal interaction (modal boot sweep hum, typing keystroke clicks, access granted chimes, and error buzzes) can feel jarring and annoying to players entering credentials, switching modes, or creating an account. Removing audio playback from the authentication terminal provides a calm, distraction-free authentication experience.

## What Changes

- Remove all sound effect invocations (`SFX.terminalOpen()`, `SFX.terminalKey()`, `SFX.accessGranted()`, `SFX.errorBuzz()`) and the `SFX` import from `src/ui/authTerminal.js`.
- Update the `procedural-audio` capability specification to remove the requirement for terminal interface audio synthesis during authentication workflows.
- Retain the underlying audio synthesis functions in `src/audio/sfx.js` (`terminalOpen`, `terminalKey`, `accessGranted`, `errorBuzz`) as generic utility audio presets since they are reused across other game UI modals (such as Armory, Campaign Level Select, and Trial Debrief).
- Ensure existing test suites remain clean and add verification that authentication terminal interactions operate silently without triggering SFX.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `procedural-audio`: Remove `Requirement: Terminal Interface Audio Synthesis` (and associated modal boot, typing click, access chime, and error buzz scenarios) from the authentication terminal flow so that authentication is entirely silent.

## Impact

- Affected Code:
  - `src/ui/authTerminal.js`: Remove `SFX` import and all sound effect calls across modal open, tab switching, input typing, credential submission, errors, and success handlers.
  - `test/auth/auth_sfx.test.js`: Update or add assertions confirming authentication terminal interaction executes silently without calling SFX.
- Systems/APIs:
  - Authentication flow will execute silently.
  - No breaking changes to `src/audio/sfx.js` export contracts or other UI subsystems that call these audio presets.
