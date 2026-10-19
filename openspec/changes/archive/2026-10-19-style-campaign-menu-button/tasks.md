# Tasks

## 1. CSS Styling Implementation

- [x] 1.1 Add `.campaign-btn` and `.campaign-btn:hover` CSS class declarations to `index.html` using the Star Gold theme (`var(--star-gold, #ffd700)`), dual inset/outset neon drop shadows, and interactive hover elevation, and verify the rule syntax renders properly in `index.html`.
- [x] 1.2 Verify modal action buttons using `.campaign-btn` (`#btnLaunchTrial` in `src/ui/campaign/CampaignHUD.js` and `#btnDebriefNext` in `src/ui/campaign/TrialDebriefModal.js`) properly inherit the styling without layout distortion.

## 2. Automated Test Verification and Regression Checks

- [x] 2.1 Update `test/campaign/campaign_phase2.test.js` to verify that `index.html` contains the `.campaign-btn` CSS selector with gold glowing border and box-shadow styling, and verify with `node test/runner.js campaign`.
- [x] 2.2 Execute the complete test suite via `node test/runner.js` to ensure zero regressions across all modes, UI modals, and storage systems.
