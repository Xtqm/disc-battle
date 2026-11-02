# Proposal: Single-Tile Floor Impact Rebound

## Why

When an identity disc is thrown toward the arena floor, flat surface gliding keeps the projectile pinned to floor elevation ($y = 0.55\text{m}$), causing it to collide with and break multiple consecutive tiles in a line. We need the disc to pop upward away from the floor after striking one tile, smoothly restoring combat cruise elevation while leaving subsequent floor tiles intact.

## What Changes

- **Single-Tile Floor Trigger**: Restrict floor impact tile degradation to the initial contact tile, breaking exactly one floor tile per downward strike.
- **Controlled Upward Pop Rebound**: Impart a controlled vertical upward velocity ($v_y \approx +3.5\text{ m/s}$) upon floor collision, immediately clearing the floor plane ($p_y > R_{\text{disc}}$) and preventing consecutive tile strikes.
- **Cruise Altitude Recovery**: Reset cruise stabilization target toward standard chest height ($1.7\text{m}$) so the disc gently levels out into horizontal flight after clearing the floor.
- **Trajectory Simulation Parity**: Mirror the upward floor pop and cruise restoration in `simulatePath()`, ensuring the predicted trajectory arc matches live disc flight.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `disc-combat`: Update `Surface Ricochets and Restitution` so that floor contact breaks a single tile and rebounds the projectile upward into stabilized cruise flight.

## Impact

- `src/entities/Disc.js`: Floor collision handling in `updateDiscs()`.
- `src/physics/trajectory.js`: Floor collision handling in `simulatePath()`.
- `test/gameplay/physics_and_combat.test.js`: Update regression tests to assert single-tile breakage and controlled vertical pop recovery.
