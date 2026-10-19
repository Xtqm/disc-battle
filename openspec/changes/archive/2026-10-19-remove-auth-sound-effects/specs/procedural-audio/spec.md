# Spec Delta

## REMOVED Requirements

### Requirement: Terminal Interface Audio Synthesis
**Reason**: Terminal audio effects (CRT boot sweep, typing keystroke clicks, access granted chime, and access denied buzz) played during the authentication terminal interaction are disruptive and have been eliminated to provide a calm, distraction-free authentication experience.
**Migration**: Authentication terminal interactions in `authTerminal.js` operate silently without triggering procedural audio synthesis. Underlying audio synthesis functions (`terminalOpen`, `terminalKey`, `accessGranted`, `errorBuzz`) remain exported in `src/audio/sfx.js` for other UI components that utilize them.
