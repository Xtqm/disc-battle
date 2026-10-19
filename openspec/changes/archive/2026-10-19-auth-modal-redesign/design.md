# Technical Design: Grid Authorization Terminal Redesign

## Context

See [proposal.md](proposal.md) for background and motivation.

The current authorization terminal is implemented across `index.html` (modal DOM and CSS) and `src/ui/authTerminal.js` (modal lifecycle, DOM event bindings, and interaction with `AuthManager`). The terminal currently displays all options—guest callsign commit, dual tabs, email/password credentials, magic link, and federated sync—simultaneously within a single card styled with dense monospace fonts and heavy scanline filters.

## Goals / Non-Goals

**Goals:**
- Replace CRT scanline styling and Courier New monospace with the game's sleek Main Menu aesthetic (`Segoe UI`, 12px rounded glassmorphism, cyan glowing borders).
- Elevate Quick Sync (Google, Discord, GitHub) to the top of Step 1 for 1-click cloud sync.
- Provide a clean 2-step onboarding wizard:
  - **Step 1**: Mode switch between "Sign In" and "Create Account".
  - **Sign In**: Direct login via Quick Sync or Email/Passkey; bypasses Step 2 completely.
  - **Step 2 (Create Account)**: Callsign customization pre-filled with the player's OAuth username or guest moniker before final commitment.
- Restrict modal dismissal strictly to the explicit top-right `[ X ]` button, eliminating accidental dismissals from backdrop clicks or Escape key presses during input.

**Non-Goals:**
- In-game Settings menu for post-auth callsign editing (out of scope, planned for a future update).
- Changes to Supabase backend schemas, RLS policies, or `TronSaveState` serialization formats.

## Decisions

### 1. Unified Main Menu Visual Language
* **Decision**: Adopt the core `.card` styling from `index.html` with `border-radius: 12px`, deep translucent background (`rgba(1, 14, 22, 0.88)`), subtle glow (`box-shadow: 0 0 50px rgba(79, 242, 255, 0.18)`), and crisp `Segoe UI` typography. Obtrusive `.terminal-scanlines` are removed from input cards.
* **Alternatives Considered**: 
  - *Keep Courier New with lower scanline opacity*: Still leaves small text jagged and visually noisy compared to the main menu.
  - *Completely flat modern web modal*: Loses the Tron sci-fi atmosphere. Retaining the glowing cyan/amber borders and futuristic button treatments strikes the perfect balance.

### 2. Two-Step Client State Machine (`authTerminal.js`)
* **Decision**: Structure the terminal modal into distinct UI states controlled via helper functions:
  - `STATE_SIGNIN` (Step 1): Quick Sync prominent, Email/Passkey fields, `[ SIGN IN TO THE GRID ]` button, Magic Link text button.
  - `STATE_SIGNUP_STEP1` (Step 1): Quick Sync prominent, Email/Passkey fields, `[ CONTINUE TO CALLSIGN -> ]` button.
  - `STATE_SIGNUP_STEP2` (Step 2): Back navigation button, Callsign input (pre-filled), and `[ INITIALIZE IDENTITY & ENTER THE GRID ]` final action.
* **Alternatives Considered**:
  - *Single huge form with Callsign at the bottom*: Overwhelms new users with too many required inputs up front and confuses returning sign-in users.

### 3. Smart Callsign Pre-filling
* **Decision**: In Step 2, pre-fill the Callsign field using the best available identity metadata:
  1. OAuth platform user handle / display name (Google, Discord, GitHub) if available.
  2. Email prefix if signing up with email (e.g. `USER` from `user@grid.tron`).
  3. Current guest handle (e.g. `GUEST_4821`).
  The player can review or edit this handle before final confirmation.
* **Alternatives Considered**:
  - *Auto-generating a random name and skipping step 2*: Denies players agency over their persistent combat moniker.

### 4. Strict Exit Isolation
* **Decision**: Wire dismissal exclusively to the `[ X ]` button (`#btnCloseTerminal`). Clicking the modal overlay backdrop and pressing the `Escape` key while the terminal is active will NOT dismiss the modal, preventing lost form input.
* **Alternatives Considered**:
  - *Keep Escape dismissal*: Risk of accidental cancellation when users press Escape expecting to blur an input field or cancel a dropdown.

## Risks / Trade-offs

- **[Risk] Test suite breakages due to changed element IDs or Escape key dismissal**: Existing tests in `test/auth/auth_input_isolation.test.js` assert that Escape dismisses the terminal.
  - *Mitigation*: Update integration tests to assert that `Escape` is safely captured/ignored and verify explicit dismissal through the `[ X ]` button.
- **[Risk] OAuth redirect losing Step 2 context**: In browsers where OAuth uses a full page redirect instead of a popup, the page reloads after provider authentication.
  - *Mitigation*: On session initialization, if a user has just authenticated and lacks a customized handle (or is flagged for new registration), detect this state and open Step 2 to allow callsign finalization, or assign the provider handle automatically if modal was bypassed.
