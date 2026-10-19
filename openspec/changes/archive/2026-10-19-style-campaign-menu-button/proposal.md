# Proposal

## Why

The "CAMPAIGN SECTORS" button on the main menu is currently unstyled and renders as a dark, unlit element without neon borders or glowing drop shadows, inconsistent with the cyber-neon aesthetics of adjacent buttons (`ENTER SWARM`, `HOST MATCH`, `JOIN ONLINE MATCH`). Defining standardized styling for `.campaign-btn` elevates the campaign mode as a prominent game feature and unifies campaign call-to-action buttons across the game.

## What Changes

- Add `.campaign-btn` CSS class definition to `index.html` using a signature Gold/Amber theme (`var(--star-gold, #ffd700)`), consistent with campaign star progression.
- Style `.campaign-btn` with glowing neon borders, inset/outer box-shadows, and interactive hover states (`translateY(-2px)`, expanded glow, and brightened background/text) consistent with `.swarm-btn`, `.duel-btn`, and `.multi-btn`.
- Ensure buttons sharing `.campaign-btn` in campaign modals (`#btnLaunchTrial` in `CampaignHUD.js` and `#btnDebriefNext` in `TrialDebriefModal.js`) inherit the unified campaign theme.
- Add test coverage verifying `.campaign-btn` styling rules exist and adhere to the design system.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `campaign-progression`: Update requirement to mandate visual styling and interactive hover states for the Campaign Sectors navigation button on the main menu and campaign action controls.

## Impact

- Affected files: `index.html`, `src/ui/menus.js`, `test/campaign/campaign_phase2.test.js`.
- No breaking changes or API modifications; purely visual and UI presentation enhancements.
