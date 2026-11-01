# Proposal: Disc Flight Math and Floor Ricochet Dynamics

## Why

Regressions in disc launch velocity, floor collision restitution, and Magnus-effect speed normalization cause thrown discs to sharply dive downward, bounce off the floor, and rocket upward into the sky without gravity. We need to restore the fluid, responsive arcade flight from the original game while preserving curved throws and floor tile destructibility.

## What Changes

- **Launch Pitch Decoupling**: Clamp the launch pitch and decouple camera-to-floor raycast parallax from the chest throw vector so aimed forward throws launch horizontally at chest/cruising altitude rather than diving into the floor.
- **Floor Impact Tile De-Rez Preservation**: Retain tile strike detection and destructible tile degradation (`hitTile`) whenever a disc touches an intact floor tile.
- **Floor Restitution & Upward Velocity Damping**: Replace permanent gravity-free upward rebound with surface gliding or rapid vertical velocity damping so floor impacts do not rocket discs into high-altitude climbs.
- **Horizontal 2D Magnus Normalization**: Decouple lateral Magnus acceleration from vertical velocity in speed conservation calculations so curving around obstacles does not artificially damp or distort vertical pitch.
- **Floor Contact Spin Dissipation**: Dissipate lateral curve spin upon contacting floor tiles to prevent awkward 3D corkscrew bounces.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `disc-combat`: Update disc launch vector calculation, floor impact collision and altitude stabilization, destructible tile impact triggering, and Magnus horizontal speed normalization.

## Impact

- `src/entities/Player.js`: `throwDisc()` and `aimTarget()` launch vector calculation.
- `src/entities/Disc.js`: `updateDiscs()` floor collision resolution, tile strike trigger, and Magnus curve update.
- `src/physics/trajectory.js`: `simulatePath()` trajectory preview parity matching live physics integration.
- `test/gameplay/physics_and_combat.test.js`: Update and extend physics regression test suites for horizontal launch, floor tile destruction, and curve speed parity.
