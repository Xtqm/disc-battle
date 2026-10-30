# Design: Remove Redundant Exit Buttons from Hub Loadout and Directives Views

## Context

In Phase 2, `ArmoryModal` and `AchievementsModal` were embedded into the Program Hub (`#authModal`) under tabs `[ LOADOUT ]` and `[ DIRECTIVES ]`. The screenshots uploaded by the user reveal that both components render their own inner exit buttons:
1. Loadout: `[ESC // RETURN]` (`#armoryCloseBtn`) on the right side of the category bar next to the Bit counter.
2. Directives: `[ ESC // CLOSE ]` (`#achievementsCloseBtn`) on the right side of the Trophy Matrix title header.

Because the parent Terminal Hub modal already provides an explicit `[ X ]` dismiss button (`#btnCloseTerminal`) in the top-right corner, these inner buttons are confusing duplicates that crowd header layouts.

## Goals / Non-Goals

**Goals:**
- Eliminate `[ESC // RETURN]` and `[ ESC // CLOSE ]` from the inner headers when viewed within the Program Hub.
- Preserve clean alignment of remaining elements (e.g., Bit counter in Loadout header, sync progress bar in Directives).
- Maintain standalone backward compatibility with existing tests that mock or expect close button DOM nodes.

**Non-Goals:**
- Removing the top-right `[ X ]` dismiss button (`#btnCloseTerminal`) of the main modal.
- Altering Escape key handling on `#authModal`.

## Decisions

### 1. Context-Aware Rendering via `this._inHub`
- **Decision**: In `ArmoryModal.render()` and `AchievementsModal.render()`, condition the rendering of `#armoryCloseBtn` and `#achievementsCloseBtn` on `!this._inHub`.
- **Rationale**: When `this._inHub` is true (set by `authTerminal.js` when mounting), the inner close button is completely omitted from the HTML markup. When running standalone (in tests or independent views), the button renders as normal.

### 2. Defensive CSS Suppression in `.auth-terminal-card`
- **Decision**: Add CSS rules in `index.html`:
  ```css
  .auth-terminal-card #armoryCloseBtn,
  .auth-terminal-card #achievementsCloseBtn {
    display: none !important;
  }
  ```
- **Rationale**: Acts as a fail-safe ensuring that any nested exit buttons are suppressed within the Terminal Hub modal under all circumstances.

## Risks / Trade-offs

- **[Risk] Null element references during event binding**: In `bindEvents`, `root.querySelector('#armoryCloseBtn')` or `root.querySelector('#achievementsCloseBtn')` will return `null` when omitted.
  → *Mitigation*: Both `ArmoryModal.js` and `AchievementsModal.js` already wrap button binding in `if (closeBtn) { ... }`, so omitting the element causes no errors or unhandled exceptions.
