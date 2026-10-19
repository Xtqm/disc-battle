# Proposal: Redesign Grid Authorization Terminal UX & Typography

## Why

The current Grid Authorization Terminal (`#authModal`) suffers from high cognitive friction and poor legibility: heavy CRT scanlines cutting through small monospace text (`Courier New`), dense jargon-heavy labels (`GRID COMM IDENT // EMAIL`), and 13 stacked glowing borders. Furthermore, account credentials and guest callsign customization are intermixed in a single cluttered view without clear visual hierarchy.

Redesigning the authorization modal adopts the game's clean, legible Main Menu design language (crisp `Segoe UI` typography, 12px rounded glassmorphism, no obstructive scanlines), places 1-click Quick Sync front-and-center, and introduces a streamlined 2-step onboarding wizard for account creation.

## What Changes

- **Clean Main Menu Design System**: Refactor `#authModal` styling to match the Main Menu: rounded corners (`border-radius: 12px`), crisp legible typography (`Segoe UI` base with glowing title accents), transparent glassmorphism, and removal of intrusive text-cutting scanline overlays.
- **Quick Sync Precedence**: Elevate federated OAuth providers (Google, Discord, GitHub) to the top of Step 1 as the recommended 1-click sync method.
- **Two-Step Account Creation Flow**:
  - **Step 1 (Authentication)**: Clear mode switch between "Sign In" and "Create Account". Quick Sync prominent at top, clean Email / Passkey input below.
  - **Sign In Bypass**: Returning users authenticating via Sign In or recognized Quick Sync authenticate in one step; Step 2 is completely bypassed.
  - **Step 2 (Callsign Initialization)**: New account registration transitions to a dedicated second step to configure their combat Callsign (display name, 3-16 chars). Callsigns are pre-filled automatically with their Google/Discord handle or guest ID for customization.
- **Dedicated Exit Control**: Restrict modal dismissal strictly to an explicit `[ X ]` exit button in the top-right corner to prevent accidental closures while filling credentials.
- **De-cluttered Terminology**: Replace redundant double-slash sci-fi labels (`GRID COMM IDENT // EMAIL`, `ENCRYPTED PASSKEY // SECURITY PHRASE`) with clean, direct labels (`Email Address`, `Passkey / Password`).

## Capabilities

### Modified Capabilities
- `user-identity`: Updates the `Grid Authorization Terminal Modal` requirement to replace CRT scanlines/heavy monospace with clean legible typography, replace the simultaneous tabbed layout with a 2-step registration flow (Quick Sync precedence, sign-in step-2 bypass, callsign pre-filling), and enforce explicit `[ X ]` dismissal.

## Impact

- **UI / Styles**: `index.html` (modal markup, CSS classes for `.auth-terminal-card`, `.tab-btn`, `.sync-btn`, inputs, and typography).
- **Client Logic**: `src/ui/authTerminal.js` (multi-step state transitions, OAuth pre-fill logic, step-1 vs step-2 validation, close handler restrictions).
- **Tests**: `test/auth/auth_terminal_integration.test.js` and `test/auth/auth_input_isolation.test.js` updated to verify the new 2-step flow, pre-filling, and explicit exit behavior.
