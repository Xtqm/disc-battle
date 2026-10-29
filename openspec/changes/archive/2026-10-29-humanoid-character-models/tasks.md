# Tasks

## 1. Humanoid Rig Architecture & Geometry

- [x] 1.1 Build hierarchical anatomical joint tree (pelvis, torso cuirass, neck, head/helmet, shoulders, upper arms, forearms, hands, hips, thighs, knees/shins, mag-boots) in `makeProgram()` in `src/graphics/materials.js`, and verify rig hierarchy via unit test.
- [x] 1.2 Implement *Tron: Legacy* segmented composite armor plating, dorsal magnetic C-ring Identity Disc dock, and recessed EL light ribbons preserving all `userData.part` identifiers (`chassis_suit`, `chassis_trim`, `chassis_visor`, `chassis_back_disc`, `chassis_halo`).
- [x] 1.3 Add role-differentiated helmet and chest circuitry options in `makeProgram(color, { isPlayer, helmetType })` supporting Flynn-style curved slit visor for players and Rinzler-style cross T-visor for bots, and verify both variants render with correct materials.

## 2. Procedural Kinematics & Combat Poses

- [x] 2.1 Implement `animateProgramKinematics(rig, dt, params)` in `src/graphics/materials.js` driving synchronized antiphase running strides, knee flex, and arm swings.
- [x] 2.2 Integrate procedural kinematics and two-handed forward defensive shield brace into `updatePlayer()` in `src/entities/Player.js`, and verify player movement and blocking poses in-game.
- [x] 2.3 Integrate procedural kinematics, boss scale/light retention, and high-frequency hurt tremors into `updateFoes()` in `src/entities/Bot.js`, and verify bot movement and hurt behavior.

## 3. System Integration & Quality Assurance

- [x] 3.1 Verify seamless material hydration and wireframe overlay binding in `CosmeticMaterialEngine.js` and check avatar presentation in `src/armory/ArmoryPreviewScene.js`.
- [x] 3.2 Verify multiplayer avatar rendering in `src/network/roomManager.js` and Duel/Arbiter boss scaling in `src/entities/Bot.js`.
- [x] 3.3 Run project test suite (`npm test`) to ensure zero regressions across all core game, physics, and rendering modules.
